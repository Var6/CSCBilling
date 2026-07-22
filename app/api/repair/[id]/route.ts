import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Repair from '@/models/Repair';
import Vehicle from '@/models/Vehicle';
import { requireSession } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/** PATCH /api/repair/:id — update a job, typically to close it out. */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await connectDB();

    // Scoped by companyId so one tenant cannot touch another's records by id.
    const repair = await Repair.findOne({ _id: id, companyId: auth.companyId });
    if (!repair) return NextResponse.json({ error: 'Repair not found' }, { status: 404 });

    const body = await req.json();
    const wasCompleted = repair.status === 'completed';
    const previousCost = repair.cost ?? 0;

    const EDITABLE = [
      'category', 'description', 'partsCost', 'labourCost', 'cost', 'odometer',
      'garage', 'invoiceNo', 'status', 'downtimeDays', 'nextDueDate',
      'nextDueOdometer', 'notes',
    ];
    for (const field of EDITABLE) {
      if (body[field] !== undefined) (repair as Record<string, unknown>)[field] = body[field];
    }
    if (body.date) repair.date = new Date(`${String(body.date).slice(0, 10)}T00:00:00.000Z`);

    await repair.save(); // pre-validate recomputes cost from parts + labour

    /*
     * Keep the vehicle's lifetime repair cost in step with the status change.
     * Only the transition into or out of `completed` moves money, and an edit
     * to a job that was already completed adjusts by the difference — adding
     * the full cost again would double-count it.
     */
    const nowCompleted = repair.status === 'completed';
    let delta = 0;
    if (!wasCompleted && nowCompleted) delta = repair.cost ?? 0;
    else if (wasCompleted && !nowCompleted) delta = -previousCost;
    else if (wasCompleted && nowCompleted) delta = (repair.cost ?? 0) - previousCost;

    const update: Record<string, unknown> = {};
    if (delta !== 0) update.$inc = { totalRepairCost: delta };
    if (nowCompleted) update.$set = { status: 'available' };
    else if (repair.status === 'in-progress') update.$set = { status: 'maintenance' };
    if (Object.keys(update).length) await Vehicle.updateOne({ _id: repair.vehicleId }, update);

    return NextResponse.json(repair);
  } catch (err) {
    console.error('PATCH /api/repair/[id] failed:', err);
    return NextResponse.json({ error: 'Failed to update repair' }, { status: 500 });
  }
}

/** DELETE /api/repair/:id */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await connectDB();
    const repair = await Repair.findOneAndDelete({ _id: id, companyId: auth.companyId });
    if (!repair) return NextResponse.json({ error: 'Repair not found' }, { status: 404 });

    // Removing a completed job has to give the money back to the vehicle total.
    if (repair.status === 'completed' && repair.cost) {
      await Vehicle.updateOne({ _id: repair.vehicleId }, { $inc: { totalRepairCost: -repair.cost } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/repair/[id] failed:', err);
    return NextResponse.json({ error: 'Failed to delete repair' }, { status: 500 });
  }
}
