import { NextRequest, NextResponse } from 'next/server';
import mongoose, { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Driver from '@/models/Driver';
import Vehicle from '@/models/Vehicle';
import { requireSession } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * Puts a driver in a vehicle, or takes them out of one.
 *
 * The link is stored on both records — `driver.vehicleId` and
 * `vehicle.assignedDriverId` — and previously each was written on its own. A
 * vehicle could name a driver who did not know about it, which quietly breaks
 * everything downstream: the fuel book cannot tell which car a fill belongs to,
 * and per-vehicle profitability attributes a day's takings to the wrong
 * vehicle or to none at all.
 *
 * Both sides are set here, in one place, so they cannot drift.
 *
 * POST   /api/driver/:id/assign-vehicle  { vehicleId }
 * DELETE /api/driver/:id/assign-vehicle
 */

/** Clears whatever link either side currently holds. */
async function detach(driverId: Types.ObjectId, session?: mongoose.ClientSession) {
  const opts = session ? { session } : {};
  const driver = await Driver.findById(driverId).select('vehicleId').lean<{ vehicleId?: Types.ObjectId }>();

  await Promise.all([
    Driver.updateOne({ _id: driverId }, { $set: { vehicle: null, vehicleId: null } }, opts),
    // Both directions: the driver may point at a vehicle that does not point
    // back, which is exactly the inconsistency this route exists to prevent.
    Vehicle.updateMany(
      { $or: [{ assignedDriverId: driverId }, ...(driver?.vehicleId ? [{ _id: driver.vehicleId }] : [])] },
      { $set: { assignedDriverId: null, assignedDriverName: null } },
      opts,
    ),
  ]);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid driver id' }, { status: 400 });
    }

    await connectDB();
    const body = await req.json();
    const { vehicleId } = body ?? {};

    if (!vehicleId || !Types.ObjectId.isValid(String(vehicleId))) {
      return NextResponse.json({ error: 'A valid vehicleId is required' }, { status: 400 });
    }

    const driverId = new Types.ObjectId(id);
    const [driver, vehicle] = await Promise.all([
      Driver.findById(driverId).select('name active'),
      Vehicle.findById(vehicleId).select('name plate shortCode assignedDriverId assignedDriverName status'),
    ]);

    if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

    if (driver.active === false) {
      return NextResponse.json(
        { error: `${driver.name} has been offboarded. Reinstate them before assigning a vehicle.` },
        { status: 409 },
      );
    }

    // A vehicle held by someone else has to be released explicitly — silently
    // moving it would leave the other driver thinking they still have a car.
    if (
      vehicle.assignedDriverId &&
      String(vehicle.assignedDriverId) !== String(driverId)
    ) {
      return NextResponse.json(
        {
          error: `That vehicle is already assigned to ${vehicle.assignedDriverName ?? 'another driver'}. ` +
            'Unassign it from them first.',
        },
        { status: 409 },
      );
    }

    const label = vehicle.plate?.startsWith('PENDING')
      ? (vehicle.shortCode || vehicle.name)
      : vehicle.plate;

    // Release anything this driver already held, then link both sides.
    await detach(driverId);
    await Promise.all([
      Driver.updateOne(
        { _id: driverId },
        { $set: { vehicleId: vehicle._id, vehicle: label } },
      ),
      Vehicle.updateOne(
        { _id: vehicle._id },
        { $set: { assignedDriverId: driverId, assignedDriverName: driver.name } },
      ),
    ]);

    return NextResponse.json({
      ok: true,
      driver: driver.name,
      vehicle: label,
      note: 'Fuel fills and duties recorded for this driver can now be attributed to this vehicle.',
    });
  } catch (err) {
    console.error('POST /api/driver/[id]/assign-vehicle failed:', err);
    return NextResponse.json({ error: 'Could not assign the vehicle' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid driver id' }, { status: 400 });
    }

    await connectDB();
    const driver = await Driver.findById(id).select('name');
    if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

    await detach(new Types.ObjectId(id));
    return NextResponse.json({ ok: true, driver: driver.name });
  } catch (err) {
    console.error('DELETE /api/driver/[id]/assign-vehicle failed:', err);
    return NextResponse.json({ error: 'Could not unassign the vehicle' }, { status: 500 });
  }
}
