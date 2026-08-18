import { Types } from 'mongoose';
import CashBookEntry from '@/models/CashBookEntry';
import DailySettlement from '@/models/DailySettlement';

/**
 * Keeps the cash book in step with the daily book, automatically.
 *
 * Ride income and fuel/toll originate in driver settlements; re-typing them
 * into the cash book was double work and a place for the two ledgers to drift.
 * The sync used to be a button — this is the same derivation, run after every
 * settlement write, so the cash book simply follows the daily book.
 *
 * What is derived, and what is never touched:
 *
 *   derived — credits.onlineRide / credits.offlineRide, debits.cng / debits.toll
 *   manual  — salaries, insurance, challans, car rent, rental and school income
 *
 * A day where staff also typed a salary keeps it: only the derived paths are
 * $set, never the whole document.
 */

/** Cash channels are physically handed over; the rest arrive in the bank. */
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Re-derives the cash book for the given dates, then rewinds each affected
 * account's running balance forward from the earliest touched day.
 */
export async function syncCashBookForDates(
  companyId: Types.ObjectId,
  dates: Date[],
): Promise<void> {
  if (!dates.length) return;

  const uniqueDays = [...new Map(dates.map((d) => {
    const day = new Date(`${dayKey(d)}T00:00:00.000Z`);
    return [dayKey(day), day];
  })).values()];

  const rows = await DailySettlement.aggregate([
    { $match: { companyId, date: { $in: uniqueDays } } },
    {
      $group: {
        _id: '$date',
        cashOnline: { $sum: { $add: ['$earnings.uberCash', '$earnings.rapidoCash'] } },
        cashOffline: { $sum: '$earnings.offline' },
        bankOnline: {
          $sum: {
            $add: ['$earnings.uber', '$earnings.rapidoAccount',
                   '$earnings.upiBank', '$earnings.personalUpi'],
          },
        },
        fuel: { $sum: '$fuelExpense' },
        toll: { $sum: '$tollExpense' },
      },
    },
  ]);

  const byDay = new Map(rows.map((r) => [dayKey(r._id), r]));
  const ops: Parameters<typeof CashBookEntry.bulkWrite>[0] = [];

  for (const day of uniqueDays) {
    const r = byDay.get(dayKey(day));

    // Cash account: what drivers physically collected and spent.
    ops.push({
      updateOne: {
        filter: { companyId, account: 'cash', date: day },
        update: {
          $set: {
            companyId, account: 'cash', date: day,
            'credits.onlineRide': Math.round(r?.cashOnline ?? 0),
            'credits.offlineRide': Math.round(r?.cashOffline ?? 0),
            'debits.cng': Math.round(r?.fuel ?? 0),
            'debits.toll': Math.round(r?.toll ?? 0),
            derivedFromDailyBook: true,
            derivedAt: new Date(),
          },
          $setOnInsert: { origin: 'derived', opening: 0, closing: 0 },
        },
        upsert: true,
      },
    });

    // Bank account: platform payouts and UPI, which never pass through hands.
    // Only written when there is something to say — an empty bank day is noise.
    if ((r?.bankOnline ?? 0) > 0) {
      ops.push({
        updateOne: {
          filter: { companyId, account: 'bank', date: day },
          update: {
            $set: {
              companyId, account: 'bank', date: day,
              'credits.onlineRide': Math.round(r?.bankOnline ?? 0),
              derivedFromDailyBook: true,
              derivedAt: new Date(),
            },
            $setOnInsert: { origin: 'derived', opening: 0, closing: 0 },
          },
          upsert: true,
        },
      });
    }
  }

  await CashBookEntry.bulkWrite(ops, { ordered: false });

  /*
   * Rebalance forward. Editing a past day changes every closing balance after
   * it, so each affected account is re-chained from the earliest touched day.
   * Documents are saved individually because the totals live in a save hook.
   */
  const earliest = new Date(Math.min(...uniqueDays.map((d) => d.getTime())));

  for (const account of ['cash', 'bank'] as const) {
    const before = await CashBookEntry.findOne({
      companyId, account, date: { $lt: earliest },
    }).sort({ date: -1 }).select('closing').lean<{ closing: number }>();

    let carry = before?.closing ?? 0;
    const chain = await CashBookEntry.find({
      companyId, account, date: { $gte: earliest },
    }).sort({ date: 1 });

    for (const entry of chain) {
      entry.opening = carry;
      await entry.save();               // hook recomputes totals + computedClosing
      entry.closing = entry.computedClosing;
      await entry.save();
      carry = entry.closing as number;
    }
  }
}
