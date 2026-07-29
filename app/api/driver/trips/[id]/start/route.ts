import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { requireDriver, unauthorized } from '@/lib/driverAuth';
import Trip from '@/models/Trip';
import { OdometerError } from '@/lib/odometer';

/**
 * POST /api/driver/trips/[id]/start   { startOdometer, lat?, lng? }
 *
 * Records the opening meter reading and puts the trip on the road.
 *
 * The reading is written exactly once. The guard is in the query, not in an
 * if-statement: the update only matches a trip whose odometer.start is still
 * unset, so a driver cannot start, look at what the fare is going to be, and
 * come back with a more favourable opening number.
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

  const startOdometer = Number(body?.startOdometer);
  try {
    if (!Number.isFinite(startOdometer) || startOdometer < 0) {
      throw new OdometerError('Enter the current odometer reading before starting.');
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }

  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const hasFix = Number.isFinite(lat) && Number.isFinite(lng);

  const started = await Trip.findOneAndUpdate(
    {
      _id: id,
      'driver.driverId': driver._id,
      status: 'accepted',
      // Write-once: no match if a start reading already exists.
      $or: [{ 'odometer.start': null }, { 'odometer.start': { $exists: false } }],
    },
    {
      $set: {
        status: 'ongoing',
        'odometer.start': startOdometer,
        'odometer.startAt': new Date(),
        ...(hasFix ? { 'odometer.startPoint': { type: 'Point', coordinates: [lng, lat] } } : {}),
        'timing.startTime': new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        // Reset the trail so a re-used document cannot inherit stale distance.
        'tracking.gpsKm': 0,
        'tracking.pingCount': 0,
        'tracking.lastPingAt': null,
      },
    },
    { new: true },
  );

  if (!started) {
    const existing = await Trip.findOne({ _id: id, 'driver.driverId': driver._id }).lean();
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Trip not found' }, { status: 404 });
    }
    if ((existing as any).odometer?.start != null) {
      return NextResponse.json(
        { success: false, error: 'This trip has already been started. The opening reading cannot be changed.' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: `Trip cannot be started from status "${(existing as any).status}"` },
      { status: 409 },
    );
  }

  if (!hasFix) {
    console.warn(`[odometer] trip ${id} started without a GPS fix`);
  }

  return NextResponse.json({
    success: true,
    trip: {
      id: String(started._id),
      status: started.status,
      startOdometer: started.odometer?.start,
      startedAt: started.odometer?.startAt,
    },
  });
}
