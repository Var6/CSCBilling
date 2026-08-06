import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { requireDriver, unauthorized } from '@/lib/driverAuth';
import Trip from '@/models/Trip';
import Driver from '@/models/Driver';
import { assertReadable, assessIntegrity, OdometerError } from '@/lib/odometer';
import { computeFare, type TripKind } from '@/lib/fare';
import type { RiderTier, VehicleClass } from '@/lib/rateCard';
import { haversineKm } from '@/lib/dispatch';
import { otpMatches } from '@/lib/otp';

/** Within this many km of the booked drop, the ride counts as "at destination". */
const AT_DESTINATION_KM = 1.2;

/**
 * POST /api/driver/trips/[id]/complete
 *   { endOdometer, endOtp?, lat?, lng?, paymentMethod?, tollAmount?, parkingAmount?, nightStays? }
 *
 * Closes the trip. Four things happen here that the driver does not control:
 *
 *  1. The billable distance is the odometer delta — server-computed from the
 *     stored opening reading, not sent by the client.
 *  2. The fare is recomputed here from the rate card. Whatever the app showed
 *     is a quote; this is the bill.
 *  3. The reading is cross-checked against the GPS trail accumulated during the
 *     trip, and the trip is flagged if they disagree. See lib/odometer.ts.
 *  4. Ending BEFORE the destination requires the rider's end OTP, so a driver
 *     cannot close and bill a ride early without the rider's say-so. Ending at
 *     the destination needs no code. Ending far from it is flagged either way.
 */

export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const driver = await requireDriver(req);
  if (!driver) return unauthorized();

  const { id } = await ctx.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid trip id' }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }

  const trip = await Trip.findOne({ _id: id, 'driver.driverId': driver._id, status: 'ongoing' });
  if (!trip) {
    return NextResponse.json(
      { success: false, error: 'No ongoing trip found for you with that id' },
      { status: 404 },
    );
  }

  const startOdometer = Number(trip.odometer?.start);
  const endOdometer = Number(body?.endOdometer);

  try {
    assertReadable(startOdometer, endOdometer);
  } catch (e) {
    if (e instanceof OdometerError) {
      return NextResponse.json({ success: false, error: e.message }, { status: 400 });
    }
    throw e;
  }

  const startedAt = trip.odometer?.startAt ? new Date(trip.odometer.startAt) : new Date();
  const durationMin = Math.max(0, (Date.now() - startedAt.getTime()) / 60000);

  const integrity = assessIntegrity({
    startOdometer,
    endOdometer,
    gpsKm: trip.tracking?.gpsKm ?? 0,
    pingCount: trip.tracking?.pingCount ?? 0,
    durationMin,
  });

  // Bill on the metered distance, per the fare circular.
  const meteredKm = integrity.odometerKm;

  const fare = computeFare({
    distanceKm: meteredKm,
    tripKind: (trip.pricing?.tripKind as TripKind) ?? 'city_one_way',
    vehicle: (body?.vehicleClass as VehicleClass) ?? 'hatchback',
    tier: (trip.pricing?.riderTier as RiderTier) ?? 'public',
    tollAmount: Math.max(0, Number(body?.tollAmount) || 0),
    parkingAmount: Math.max(0, Number(body?.parkingAmount) || 0),
    nightStays: Math.max(0, Number(body?.nightStays) || 0),
  });

  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const hasFix = Number.isFinite(lat) && Number.isFinite(lng);

  // How far the driver is from the booked drop, if both points are known.
  const dropCoords = trip.route?.dropPoint?.coordinates as [number, number] | undefined;
  const distanceToDropKm =
    hasFix && dropCoords?.length === 2
      ? haversineKm({ lat, lng }, { lat: dropCoords[1], lng: dropCoords[0] })
      : null;
  const atDestination = distanceToDropKm != null && distanceToDropKm <= AT_DESTINATION_KM;
  const isAppRide = trip.source === 'app' || trip.source === 'web';

  // Ending before the destination needs the rider's end OTP. Ending AT the
  // destination does not (arriving there is itself proof the ride completed).
  if (isAppRide && trip.endOtp && !atDestination) {
    if (!otpMatches(body?.endOtp, trip.endOtp)) {
      return NextResponse.json(
        {
          success: false,
          endOtpRequired: true,
          error:
            distanceToDropKm == null
              ? 'To end the ride, ask the rider for their end OTP.'
              : `You are ${distanceToDropKm.toFixed(1)} km from the destination. Ending early needs the rider's end OTP.`,
        },
        { status: 403 },
      );
    }
  }

  // Record the geofence gap for ops even when an OTP cleared the early end.
  if (distanceToDropKm != null && distanceToDropKm > AT_DESTINATION_KM) {
    integrity.flagged = true;
    integrity.flagReasons.push(`Trip ended ${distanceToDropKm.toFixed(1)} km from the booked destination.`);
  }

  const paymentMethod = ['cash', 'upi', 'card', 'wallet'].includes(body?.paymentMethod)
    ? body.paymentMethod
    : 'cash';

  trip.status = 'completed';
  trip.odometer.end = endOdometer;
  trip.odometer.endAt = new Date();
  trip.odometer.totalKm = meteredKm;
  if (hasFix) trip.odometer.endPoint = { type: 'Point', coordinates: [lng, lat] } as never;

  trip.integrity = {
    odometerKm: integrity.odometerKm,
    gpsKm: integrity.gpsKm,
    variancePct: integrity.variancePct,
    flagged: integrity.flagged,
    flagReasons: integrity.flagReasons,
  } as never;

  trip.charges.distanceCost = fare.baseFare;
  trip.charges.discount = fare.discountAmount;
  trip.charges.subtotal = fare.baseFare - fare.discountAmount;
  trip.charges.totalFare = fare.total;

  trip.payment.method = paymentMethod;
  trip.payment.status = 'paid';
  trip.timing.endTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  await trip.save();

  await Driver.updateOne(
    { _id: driver._id },
    { $set: { status: 'available' }, $inc: { trips: 1 } },
  );

  return NextResponse.json({
    success: true,
    trip: {
      id: String(trip._id),
      tripNumber: trip.tripNumber,
      meteredKm,
      totalFare: fare.total,
      breakdown: fare,
      // Surfaced to the driver deliberately — knowing the cross-check exists
      // and is visible is most of the deterrent.
      integrity,
    },
  });
}
