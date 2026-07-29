import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import DailySettlement, { EARNING_CHANNELS } from '@/models/DailySettlement';
import Driver from '@/models/Driver';
import Vehicle from '@/models/Vehicle';
import { requireSession } from '@/lib/apiAuth';
import { applyFields, snapshotIfImported, type Amendable } from '@/lib/amend';

export const dynamic = 'force-dynamic';

/**
 * Correcting and removing a duty in the daily book.
 *
 * The model's pre-validate hook owns the arithmetic (takings, cash in hand,
 * net, computed carry-forward), so this route only sets the inputs and lets the
 * document derive the rest. `closingBalance` stays writable because the book's
 * own carry-forward is what a driver was actually held to, and it does not
 * always match the arithmetic.
 */

const EDITABLE = [
  'dutyType', 'dutyNote', 'shift',
  'openingBalance', 'fuelExpense', 'tollExpense',
  'transferToBank', 'cashGiven', 'closingBalance',
  'notes', 'vehicleId',
] as const;

/**
 * Re-points the driver's running float at whatever their latest duty now says.
 * Called after any edit or delete, because either can change which duty is last.
 */
async function syncDriverBalance(companyId: Types.ObjectId, driverId: Types.ObjectId) {
  const latest = await DailySettlement.findOne({ companyId, driverId })
    .sort({ date: -1 })
    .select('date closingBalance')
    .lean<{ date: Date; closingBalance: number }>();

  await Driver.updateOne(
    { _id: driverId },
    latest
      ? { $set: { currentBalance: latest.closingBalance ?? 0, balanceUpdatedAt: latest.date } }
      : { $set: { currentBalance: 0, balanceUpdatedAt: null } },
  );
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  const { id } = await ctx.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  await connectDB();
  const row = await DailySettlement.findOne({ _id: id, companyId: auth.companyId }).lean();
  if (!row) return NextResponse.json({ error: 'Duty not found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await connectDB();
    const row = await DailySettlement.findOne({ _id: id, companyId: auth.companyId });
    if (!row) return NextResponse.json({ error: 'Duty not found' }, { status: 404 });

    const body = await req.json();
    const snapshotted = snapshotIfImported(row as unknown as Amendable, body.amendmentNote);

    applyFields(row, body, EDITABLE);

    // Earnings arrive as a partial map; merge rather than replace, so editing
    // one channel does not zero the others.
    if (body.earnings && typeof body.earnings === 'object') {
      for (const channel of EARNING_CHANNELS) {
        if (body.earnings[channel] === undefined) continue;
        row.set(`earnings.${channel}`, Math.max(Number(body.earnings[channel]) || 0, 0));
      }
    }

    if (body.date !== undefined) {
      const d = new Date(`${String(body.date).slice(0, 10)}T00:00:00.000Z`);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'date is not a valid date' }, { status: 400 });
      }
      row.date = d;
    }

    if (body.driverId !== undefined && Types.ObjectId.isValid(String(body.driverId))) {
      const driver = await Driver.findById(body.driverId).select('name').lean<{ name: string }>();
      if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
      row.driverId = new Types.ObjectId(String(body.driverId));
      row.driverName = driver.name;
    }

    if (body.vehicleId) {
      const v = await Vehicle.findById(body.vehicleId)
        .select('plate shortCode')
        .lean<{ plate: string; shortCode: string }>();
      // Recording the vehicle here is what makes per-vehicle profitability exact
      // rather than the 7% sample the imported books allow.
      if (v) row.vehiclePlate = v.plate?.startsWith('PENDING') ? (v.shortCode ?? '') : (v.plate ?? '');
    } else if (body.vehicleId === null) {
      row.vehicleId = null;
      row.vehiclePlate = '';
    }

    // The hook recomputes totals and computedClosingBalance from these inputs.
    await row.save();

    // Unless staff stated a carry-forward, follow the arithmetic.
    if (body.closingBalance === undefined && !row.amended) {
      row.closingBalance = row.computedClosingBalance;
      await row.save();
    }

    await syncDriverBalance(auth.companyId, row.driverId as Types.ObjectId);

    return NextResponse.json({ ...row.toObject(), originalPreserved: snapshotted });
  } catch (err) {
    // A date/driver/shift clash trips the unique index rather than corrupting
    // the book — report it as a conflict, not a server error.
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: 'That driver already has a duty recorded for this date and shift' },
        { status: 409 },
      );
    }
    console.error('PATCH /api/settlement/[id] failed:', err);
    return NextResponse.json({ error: 'Failed to update the duty' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await connectDB();
    const row = await DailySettlement.findOneAndDelete({ _id: id, companyId: auth.companyId });
    if (!row) return NextResponse.json({ error: 'Duty not found' }, { status: 404 });

    await syncDriverBalance(auth.companyId, row.driverId as Types.ObjectId);

    return NextResponse.json({
      ok: true,
      deleted: id,
      // Worth saying out loud: a re-import would bring an imported row straight
      // back, because the importer keys on the originating sheet cell.
      note: row.origin === 'sheet'
        ? 'This duty came from a spreadsheet. Re-running the importer will restore it.'
        : undefined,
    });
  } catch (err) {
    console.error('DELETE /api/settlement/[id] failed:', err);
    return NextResponse.json({ error: 'Failed to delete the duty' }, { status: 500 });
  }
}
