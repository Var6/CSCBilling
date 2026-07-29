import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CashBookEntry from '@/models/CashBookEntry';
import DailySettlement from '@/models/DailySettlement';
import { requireSession, dateRangeFilter } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * Builds cash book days from the daily book.
 *
 * The two ledgers record overlapping things: a driver's duty produces cash the
 * company receives, and fuel and toll the company pays for. Re-typing those
 * into the cash book by hand is both wasted effort and a place for the two to
 * drift apart.
 *
 * What is derived, and what is not:
 *
 *   derived  — ride income by channel, and fuel/toll spend, from settlements
 *   manual   — salaries, insurance, challans, car rent, rental and school income
 *
 * Nothing manual is ever overwritten. A derived entry is marked
 * `origin: 'derived'` and only its derived categories are rewritten on each
 * sync, so a salary typed against the same day survives untouched.
 *
 * GET  /api/cashbook/sync?month=YYYY-MM   preview: what would change
 * POST /api/cashbook/sync?month=YYYY-MM   apply it
 */

/**
 * Cash reaches the company two ways, and they land in different accounts.
 *
 * Cash channels are physically handed over; the UPI/account channels arrive in
 * the bank. Putting them in one bucket would make the cash box and the bank
 * balance both wrong.
 */
const CASH_CHANNELS = ['uberCash', 'rapidoCash', 'offline'] as const;
const BANK_CHANNELS = ['uber', 'rapidoAccount', 'upiBank', 'personalUpi'] as const;

type Derived = {
  date: Date;
  account: 'cash' | 'bank';
  onlineRide: number;
  offlineRide: number;
  fuel: number;
  toll: number;
  duties: number;
};

async function derive(companyId: unknown, range: Record<string, Date> | null) {
  const match: Record<string, unknown> = { companyId };
  if (range) match.date = range;

  const rows = await DailySettlement.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$date',
        // Platform rides versus rides the office booked directly.
        cashOnline: { $sum: { $add: ['$earnings.uberCash', '$earnings.rapidoCash'] } },
        cashOffline: { $sum: '$earnings.offline' },
        bankOnline: {
          $sum: {
            $add: ['$earnings.uber', '$earnings.rapidoAccount',
                   '$earnings.upiBank', '$earnings.personalUpi'],
          },
        },
        // Drivers pay for fuel and toll out of the cash they are holding, so
        // these are cash-account outgoings.
        fuel: { $sum: '$fuelExpense' },
        toll: { $sum: '$tollExpense' },
        duties: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const out: Derived[] = [];
  for (const r of rows) {
    if (r.cashOnline || r.cashOffline || r.fuel || r.toll) {
      out.push({
        date: r._id, account: 'cash',
        onlineRide: Math.round(r.cashOnline), offlineRide: Math.round(r.cashOffline),
        fuel: Math.round(r.fuel), toll: Math.round(r.toll), duties: r.duties,
      });
    }
    if (r.bankOnline) {
      out.push({
        date: r._id, account: 'bank',
        onlineRide: Math.round(r.bankOnline), offlineRide: 0,
        fuel: 0, toll: 0, duties: r.duties,
      });
    }
  }
  return out;
}

export async function GET(req: NextRequest) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    await connectDB();
    const range = dateRangeFilter(new URL(req.url).searchParams);
    const derived = await derive(auth.companyId, range);

    const existing = await CashBookEntry.countDocuments({
      companyId: auth.companyId,
      ...(range ? { date: range } : {}),
    });

    return NextResponse.json({
      wouldWrite: derived.length,
      existingEntries: existing,
      totals: {
        rideIncome: derived.reduce((a, d) => a + d.onlineRide + d.offlineRide, 0),
        fuel: derived.reduce((a, d) => a + d.fuel, 0),
        toll: derived.reduce((a, d) => a + d.toll, 0),
      },
      sample: derived.slice(0, 5),
    });
  } catch (err) {
    console.error('GET /api/cashbook/sync failed:', err);
    return NextResponse.json({ error: 'Could not preview the sync' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    await connectDB();
    const range = dateRangeFilter(new URL(req.url).searchParams);
    const derived = await derive(auth.companyId, range);

    if (!derived.length) {
      return NextResponse.json({ ok: true, written: 0, note: 'No duties in that period.' });
    }

    /*
     * Only the derived fields are set. A day where staff also recorded a salary
     * keeps it — $set on individual paths rather than replacing the documents.
     */
    const ops = derived.map((d) => ({
      updateOne: {
        filter: { companyId: auth.companyId, account: d.account, date: d.date },
        update: {
          $set: {
            companyId: auth.companyId,
            account: d.account,
            date: d.date,
            'credits.onlineRide': d.onlineRide,
            'credits.offlineRide': d.offlineRide,
            'debits.cng': d.fuel,
            'debits.toll': d.toll,
            derivedFromDailyBook: true,
            derivedAt: new Date(),
          },
          $setOnInsert: { origin: 'derived', opening: 0, closing: 0 },
        },
        upsert: true,
      },
    }));

    const res = await CashBookEntry.bulkWrite(ops, { ordered: false });

    /*
     * Totals and the running balance are recomputed by the model hook, which
     * only fires on a document save — so each touched day is re-saved in date
     * order, carrying each closing balance into the next day's opening.
     */
    const touched = await CashBookEntry.find({
      companyId: auth.companyId,
      ...(range ? { date: range } : {}),
    }).sort({ account: 1, date: 1 });

    const lastClosing = new Map<string, number>();
    for (const entry of touched) {
      const account = entry.account as string;
      if (lastClosing.has(account)) entry.opening = lastClosing.get(account)!;
      await entry.save();
      entry.closing = entry.computedClosing;
      await entry.save();
      lastClosing.set(account, entry.closing as number);
    }

    return NextResponse.json({
      ok: true,
      written: derived.length,
      created: res.upsertedCount,
      updated: res.modifiedCount,
      rebalanced: touched.length,
    });
  } catch (err) {
    console.error('POST /api/cashbook/sync failed:', err);
    return NextResponse.json({ error: 'Could not build the cash book' }, { status: 500 });
  }
}
