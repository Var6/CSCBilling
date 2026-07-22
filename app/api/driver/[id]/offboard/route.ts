import { NextRequest, NextResponse } from 'next/server';
import mongoose, { Types } from 'mongoose';
import Driver from '@/models/Driver';
import Vehicle from '@/models/Vehicle';
import Trip from '@/models/Trip';
import DailySettlement from '@/models/DailySettlement';
import { requireSession } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * Driver offboarding — taking someone off the fleet for good.
 *
 * This is deliberately more than flipping a flag. A driver leaving carries
 * loose ends that cost real money if they are missed:
 *
 *   - cash float they are still holding (the "Rest Amount" carried each day)
 *   - a vehicle assigned to them that nobody else can be given
 *   - trips still open in their name
 *   - working app credentials
 *
 * GET  /api/driver/:id/offboard  → the exit checklist, so staff see the
 *                                  outstanding items before committing
 * POST /api/driver/:id/offboard  → performs it
 *
 * History is never deleted. Settlements, fuel logs and trips stay exactly as
 * they were — a former driver's books must remain auditable for years.
 */

type Blocker = { code: string; message: string; amount?: number; count?: number };

/** Everything that should be settled before someone walks. */
async function buildChecklist(driverId: Types.ObjectId, companyId: Types.ObjectId) {
  const driver = await Driver.findOne({ _id: driverId }).lean<{
    _id: Types.ObjectId;
    name: string;
    active?: boolean;
    currentBalance?: number;
    vehicleId?: Types.ObjectId | null;
    vehicle?: string | null;
    passwordHash?: string;
  }>();

  if (!driver) return null;

  const [openTrips, assignedVehicles, lastDuty] = await Promise.all([
    Trip.countDocuments({
      'driver.driverId': driverId,
      status: { $in: ['accepted', 'ongoing'] },
    }),
    Vehicle.find({ assignedDriverId: driverId }).select('plate shortCode name').lean(),
    DailySettlement.findOne({ companyId, driverId })
      .sort({ date: -1 })
      .select('date closingBalance')
      .lean<{ date: Date; closingBalance: number }>(),
  ]);

  const balance = Number(driver.currentBalance) || 0;

  const blockers: Blocker[] = [];
  if (Math.abs(balance) > 1) {
    blockers.push({
      code: 'outstanding_balance',
      amount: balance,
      message: balance > 0
        ? `${driver.name} is still holding ₹${Math.round(balance).toLocaleString('en-IN')} in company cash. Collect it, or record a final settlement, before offboarding.`
        : `The company owes ${driver.name} ₹${Math.round(-balance).toLocaleString('en-IN')}. Pay it, or record a final settlement, before offboarding.`,
    });
  }
  if (openTrips > 0) {
    blockers.push({
      code: 'open_trips',
      count: openTrips,
      message: `${openTrips} trip(s) are still open in their name. Close or reassign them first.`,
    });
  }

  return {
    driver: { id: driver._id, name: driver.name, active: driver.active !== false },
    balance,
    openTrips,
    assignedVehicles,
    hasAppAccess: Boolean(driver.passwordHash),
    lastDutyOn: lastDuty?.date ?? null,
    blockers,
    canOffboard: blockers.length === 0,
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid driver id' }, { status: 400 });
    }

    const checklist = await buildChecklist(new Types.ObjectId(id), auth.companyId);
    if (!checklist) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

    return NextResponse.json(checklist);
  } catch (err) {
    console.error('GET /api/driver/[id]/offboard failed:', err);
    return NextResponse.json({ error: 'Failed to build the exit checklist' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid driver id' }, { status: 400 });
    }
    const driverId = new Types.ObjectId(id);

    const body = await req.json().catch(() => ({}));
    const checklist = await buildChecklist(driverId, auth.companyId);
    if (!checklist) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

    if (!checklist.driver.active) {
      return NextResponse.json({ error: 'This driver has already been offboarded' }, { status: 409 });
    }

    /*
     * Blockers can be overridden, but only deliberately and with a reason on
     * record — sometimes a driver simply leaves owing money and the business
     * writes it off. Silently allowing it would let unrecovered cash disappear
     * from the books without anyone noticing.
     */
    const force = body.force === true;
    if (!checklist.canOffboard && !force) {
      return NextResponse.json(
        {
          error: 'Outstanding items must be settled first',
          blockers: checklist.blockers,
          hint: 'Resolve them, or resend with { force: true, reason: "..." } to override.',
        },
        { status: 409 },
      );
    }
    if (force && !String(body.reason ?? '').trim()) {
      return NextResponse.json(
        { error: 'A reason is required when overriding the exit checks' },
        { status: 400 },
      );
    }

    const exitDate = body.exitDate
      ? new Date(`${String(body.exitDate).slice(0, 10)}T00:00:00.000Z`)
      : new Date();
    if (Number.isNaN(exitDate.getTime())) {
      return NextResponse.json({ error: 'exitDate is not a valid date' }, { status: 400 });
    }

    // Free the vehicles first. Doing this before the driver row means a failure
    // halfway leaves a car unassigned rather than locked to a departed driver.
    const releasedVehicles = checklist.assignedVehicles.map((v) => v.plate);
    if (releasedVehicles.length) {
      await Vehicle.updateMany(
        { assignedDriverId: driverId },
        { $set: { assignedDriverId: null, assignedDriverName: null, status: 'available' } },
      );
    }

    const notes = [
      `Offboarded on ${exitDate.toISOString().slice(0, 10)}.`,
      body.reason ? `Reason: ${String(body.reason).trim()}` : '',
      checklist.balance ? `Balance at exit: ₹${Math.round(checklist.balance)}.` : '',
      force && checklist.blockers.length
        ? `Exit checks overridden: ${checklist.blockers.map((b) => b.code).join(', ')}.`
        : '',
    ].filter(Boolean).join(' ');

    await Driver.updateOne(
      { _id: driverId },
      {
        $set: {
          active: false,
          exitDate,
          status: 'offline',
          onDuty: false,
          vehicleId: null,
          vehicle: null,
          // Revoking app credentials is the point of offboarding — a former
          // driver must not be able to sign in and accept a trip.
          passwordHash: null,
          exitReason: String(body.reason ?? '').trim(),
          exitNotes: notes,
          balanceAtExit: checklist.balance,
        },
        // Clear the live position so a departed driver cannot linger on the map.
        $unset: { location: '', locationUpdatedAt: '' },
      },
    );

    return NextResponse.json({
      ok: true,
      driver: checklist.driver.name,
      exitDate,
      releasedVehicles,
      appAccessRevoked: checklist.hasAppAccess,
      balanceAtExit: checklist.balance,
      overrode: force ? checklist.blockers.map((b) => b.code) : [],
    });
  } catch (err) {
    console.error('POST /api/driver/[id]/offboard failed:', err);
    return NextResponse.json({ error: 'Failed to offboard the driver' }, { status: 500 });
  }
}

/** DELETE — reinstate a driver who was offboarded by mistake or has rejoined. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid driver id' }, { status: 400 });
    }

    /*
     * updateOne rather than save(): drivers imported from the paper books have
     * no phone, email or licence on record, and those fields are `required`, so
     * a full-document validation would reject the reinstatement of exactly the
     * drivers most likely to need it. Nothing here touches a validated field.
     *
     * App access is deliberately not restored — staff must reissue a password,
     * so rejoining is an explicit act rather than a side effect of a click.
     */
    const res = await Driver.updateOne(
      { _id: id },
      { $set: { active: true, exitDate: null, status: 'offline' } },
    );
    if (res.matchedCount === 0) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const driver = await Driver.findById(id).select('name').lean<{ name: string }>();
    return NextResponse.json({ ok: true, reinstated: driver?.name ?? '' });
  } catch (err) {
    console.error('DELETE /api/driver/[id]/offboard failed:', err);
    return NextResponse.json({ error: 'Failed to reinstate the driver' }, { status: 500 });
  }
}
