import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { requireDriver, unauthorized } from '@/lib/driverAuth';
import Trip from '@/models/Trip';
import { advanceWave } from '@/lib/dispatch';

/**
 * POST /api/driver/offers/[id]/decline
 *
 * Declines are permanent for that driver — they are never re-offered the same
 * ride, including after the radius widens. Without that, a declined trip keeps
 * reappearing in the same driver's list every poll.
 *
 * If declining empties the current wave, the ride is promoted immediately
 * rather than waiting out the rest of its window, so the customer is not left
 * sitting through an exclusivity timer nobody is looking at.
 */

export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const driver = await requireDriver(req);
  if (!driver) return unauthorized();

  const { id } = await ctx.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: 'Invalid trip id' }, { status: 400 });
  }

  const trip = await Trip.findOneAndUpdate(
    { _id: id, status: 'pending' },
    {
      $addToSet: { 'dispatch.declinedBy': driver._id },
      $pull: { 'dispatch.offeredTo': driver._id },
    },
    { new: true },
  );

  if (!trip) {
    return NextResponse.json({ success: true, alreadyGone: true });
  }

  if ((trip.dispatch?.offeredTo ?? []).length === 0) {
    await advanceWave(trip);
  }

  return NextResponse.json({ success: true });
}
