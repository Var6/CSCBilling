import { NextResponse } from 'next/server';
import { requireDriver, unauthorized } from '@/lib/driverAuth';
import Trip from '@/models/Trip';

/**
 * GET /api/driver/trips?status=active|history
 *
 * `active` is what the app polls to know whether to show the trip screen —
 * it returns the one accepted-or-ongoing trip, if any.
 * `history` is the completed list behind the earnings tab.
 */

export const dynamic = 'force-dynamic';

function shape(t: any) {
  return {
    id: String(t._id),
    tripNumber: t.tripNumber ?? null,
    status: t.status,
    source: t.source ?? 'staff',
    customerName: t.customer?.name ?? '',
    customerPhone: t.customer?.phone ?? '',
    pickup: t.route?.pickup ?? '',
    dropoff: t.route?.dropoff ?? '',
    pickupLat: t.route?.pickupPoint?.coordinates?.[1] ?? null,
    pickupLng: t.route?.pickupPoint?.coordinates?.[0] ?? null,
    // Drop coordinates so the driver app can navigate to the destination once
    // the ride is ongoing, and decide whether an end-OTP is needed at close.
    dropLat: t.route?.dropPoint?.coordinates?.[1] ?? null,
    dropLng: t.route?.dropPoint?.coordinates?.[0] ?? null,
    estimatedKm: t.route?.estimatedKm ?? 0,
    estimatedFare: t.pricing?.estimatedFare ?? 0,
    tripKind: t.pricing?.tripKind ?? null,
    startOdometer: t.odometer?.start ?? null,
    endOdometer: t.odometer?.end ?? null,
    meteredKm: t.odometer?.totalKm ?? null,
    gpsKm: t.tracking?.gpsKm ?? 0,
    totalFare: t.charges?.totalFare ?? 0,
    paymentMethod: t.payment?.method ?? null,
    paymentStatus: t.payment?.status ?? null,
    // Whether this ride carries handoff codes at all. App/web rides do; offline
    // rides (driver entered the customer) do not. The codes themselves are NEVER
    // sent to the driver — that is what makes them proof the rider is present.
    hasOtp: !!t.otp && (t.source === 'app' || t.source === 'web'),
    flagged: t.integrity?.flagged ?? false,
    createdAt: t.createdAt,
    startedAt: t.odometer?.startAt ?? null,
    endedAt: t.odometer?.endAt ?? null,
  };
}

export async function GET(req: Request) {
  const driver = await requireDriver(req);
  if (!driver) return unauthorized();

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('status') ?? 'active';

  if (scope === 'active') {
    const trip = await Trip.findOne({
      'driver.driverId': driver._id,
      status: { $in: ['accepted', 'ongoing'] },
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, trip: trip ? shape(trip) : null });
  }

  const trips = await Trip.find({
    'driver.driverId': driver._id,
    status: { $in: ['completed', 'cancelled'] },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const completed = trips.filter((t: any) => t.status === 'completed');

  return NextResponse.json({
    success: true,
    trips: trips.map(shape),
    summary: {
      count: completed.length,
      totalFare: completed.reduce((s: number, t: any) => s + (t.charges?.totalFare ?? 0), 0),
      totalKm: Number(completed.reduce((s: number, t: any) => s + (t.odometer?.totalKm ?? 0), 0).toFixed(1)),
      flagged: completed.filter((t: any) => t.integrity?.flagged).length,
    },
  });
}
