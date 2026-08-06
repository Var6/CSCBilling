import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { requireDriver, unauthorized } from '@/lib/driverAuth';
import Trip from '@/models/Trip';
import Driver from '@/models/Driver';
import { WAVES } from '@/lib/dispatch';
import { NO_VEHICLE_MESSAGE, resolveDriverVehicle } from '@/lib/driverVehicle';

/**
 * POST /api/driver/offers/[id]/accept
 *
 * Claims a ride. The claim is a single conditional update rather than a
 * read-then-write, so when two drivers tap Accept in the same instant exactly
 * one wins — the loser's update matches zero documents and gets a clean
 * "already taken" instead of silently overwriting the winner.
 */

export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const driver = await requireDriver(req);
  if (!driver) return unauthorized();

  const { id } = await ctx.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid trip id' }, { status: 400 });
  }

  if (!driver.onDuty) {
    return NextResponse.json({ success: false, error: 'Go on duty before accepting rides' }, { status: 400 });
  }

  // One trip at a time. Accepting a second while one is running is how drivers
  // end up with two customers waiting.
  const busy = await Trip.findOne({
    'driver.driverId': driver._id,
    status: { $in: ['accepted', 'ongoing'] },
  }).lean();

  if (busy) {
    return NextResponse.json(
      { success: false, error: 'Finish your current trip before accepting another' },
      { status: 409 },
    );
  }

  // Resolve the vehicle before claiming. Trip's pre-save guard demands
  // vehicleId + plate + model the moment the trip goes ongoing, so a driver
  // without a resolvable vehicle must be stopped now — not after the customer
  // is already in the car.
  const vehicle = await resolveDriverVehicle(driver);
  if (!vehicle) {
    return NextResponse.json({ success: false, error: NO_VEHICLE_MESSAGE }, { status: 400 });
  }

  const claimed = await Trip.findOneAndUpdate(
    {
      _id: id,
      status: 'pending',
      $and: [
        { $or: [{ 'driver.driverId': null }, { 'driver.driverId': { $exists: false } }] },
        { 'dispatch.declinedBy': { $ne: driver._id } },
        // Respect the wave: only the current cohort may claim, unless every
        // wave has been exhausted and the ride is open to all.
        {
          $or: [
            { 'dispatch.offeredTo': driver._id },
            { 'dispatch.offerWave': { $gte: WAVES.length } },
          ],
        },
      ],
    },
    {
      $set: {
        status: 'accepted',
        'driver.driverId': driver._id,
        'driver.name': driver.name,
        'driver.phone': driver.phone,
        'dispatch.acceptedAt': new Date(),
        'dispatch.offerExpiresAt': null,
        'vehicle.vehicleId': vehicle.vehicleId,
        'vehicle.plate': vehicle.plate,
        'vehicle.model': vehicle.model,
      },
    },
    { new: true },
  );

  if (!claimed) {
    return NextResponse.json(
      { success: false, error: 'This ride is no longer available' },
      { status: 409 },
    );
  }

  await Driver.updateOne({ _id: driver._id }, { $set: { status: 'on-trip' } });

  return NextResponse.json({
    success: true,
    trip: {
      id: String(claimed._id),
      tripNumber: claimed.tripNumber,
      status: claimed.status,
      // Contact details are released only now that the ride is theirs. The
      // start OTP is deliberately NOT returned — the driver must ask the rider
      // for it at pickup, which is what proves the right rider is in the car.
      customerName: claimed.customer?.name,
      customerPhone: claimed.customer?.phone,
      pickup: claimed.route?.pickup,
      dropoff: claimed.route?.dropoff,
      hasOtp: !!claimed.otp,
    },
  });
}
