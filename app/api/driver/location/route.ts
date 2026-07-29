import { NextResponse } from 'next/server';
import { requireDriver, unauthorized } from '@/lib/driverAuth';
import Trip from '@/models/Trip';
import { pingDeltaKm } from '@/lib/odometer';

/**
 * POST /api/driver/location   { lat, lng, onDuty? }
 *
 * The driver app's heartbeat. Two jobs:
 *
 *  1. Keeps the driver's live position fresh so dispatch can find them. A
 *     position older than LOCATION_STALE_MS is ignored by dispatch, so a
 *     driver who force-quits the app stops receiving offers instead of
 *     silently black-holing them.
 *
 *  2. While a trip is ongoing, accumulates the real travelled distance used to
 *     cross-check the odometer at close (see lib/odometer.ts). The increment is
 *     computed server-side from the previous stored position — the client never
 *     gets to state how far it went.
 */

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const driver = await requireDriver(req);
  if (!driver) return unauthorized();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }

  const lat = Number(body?.lat);
  const lng = Number(body?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ success: false, error: 'Valid lat and lng required' }, { status: 400 });
  }

  const previous = driver.location?.coordinates as [number, number] | undefined;

  driver.location = { type: 'Point', coordinates: [lng, lat] };
  driver.locationUpdatedAt = new Date();
  driver.lastSeenAt = new Date();
  if (typeof body.onDuty === 'boolean') driver.onDuty = body.onDuty;
  await driver.save();

  // Accumulate the GPS trail for whichever trip is actually running.
  const active = await Trip.findOne({ 'driver.driverId': driver._id, status: 'ongoing' });

  let gpsKm: number | null = null;
  if (active) {
    if (previous && previous.length === 2) {
      const delta = pingDeltaKm(
        { lat: previous[1], lng: previous[0] },
        { lat, lng },
      );
      active.tracking.gpsKm = Number(((active.tracking.gpsKm ?? 0) + delta).toFixed(3));
    }
    active.tracking.pingCount = (active.tracking.pingCount ?? 0) + 1;
    active.tracking.lastPingAt = new Date();
    await active.save();
    gpsKm = active.tracking.gpsKm;
  }

  return NextResponse.json({
    success: true,
    onDuty: driver.onDuty,
    activeTripId: active ? String(active._id) : null,
    gpsKm,
  });
}
