import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import CashBookEntry, { CREDIT_CATEGORIES, DEBIT_CATEGORIES } from '@/models/CashBookEntry';
import { requireSession } from '@/lib/apiAuth';
import { applyFields, snapshotIfImported, type Amendable } from '@/lib/amend';

export const dynamic = 'force-dynamic';

/** Correcting and removing a day of the cash book. */

const EDITABLE = ['opening', 'closing', 'remarks'] as const;

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  const { id } = await ctx.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  await connectDB();
  const row = await CashBookEntry.findOne({ _id: id, companyId: auth.companyId }).lean();
  if (!row) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
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
    const row = await CashBookEntry.findOne({ _id: id, companyId: auth.companyId });
    if (!row) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    const body = await req.json();
    const snapshotted = snapshotIfImported(row as unknown as Amendable, body.amendmentNote);

    applyFields(row, body, EDITABLE);

    // Categories merge rather than replace, so correcting one line does not
    // zero the rest of the day.
    for (const [group, keys] of [
      ['credits', CREDIT_CATEGORIES],
      ['debits', DEBIT_CATEGORIES],
    ] as const) {
      const incoming = body[group];
      if (!incoming || typeof incoming !== 'object') continue;
      for (const key of keys) {
        if (incoming[key] === undefined) continue;
        row.set(`${group}.${key}`, Math.max(Number(incoming[key]) || 0, 0));
      }
    }

    if (body.date !== undefined) {
      const d = new Date(`${String(body.date).slice(0, 10)}T00:00:00.000Z`);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'date is not a valid date' }, { status: 400 });
      }
      row.date = d;
    }

    await row.save(); // hook recomputes totals, computedClosing and discrepancy

    // Follow the arithmetic unless a closing figure was explicitly stated.
    if (body.closing === undefined) {
      row.closing = row.computedClosing;
      await row.save();
    }

    return NextResponse.json({ ...row.toObject(), originalPreserved: snapshotted });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: 'That account already has an entry for this date' },
        { status: 409 },
      );
    }
    console.error('PATCH /api/cashbook/[id] failed:', err);
    return NextResponse.json({ error: 'Failed to update the entry' }, { status: 500 });
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
    const row = await CashBookEntry.findOneAndDelete({ _id: id, companyId: auth.companyId });
    if (!row) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });

    return NextResponse.json({
      ok: true,
      deleted: id,
      note: row.origin === 'sheet'
        ? 'This entry came from the cash book workbook. Re-running the importer will restore it.'
        : undefined,
    });
  } catch (err) {
    console.error('DELETE /api/cashbook/[id] failed:', err);
    return NextResponse.json({ error: 'Failed to delete the entry' }, { status: 500 });
  }
}
