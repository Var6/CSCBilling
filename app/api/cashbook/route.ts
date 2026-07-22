import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CashBookEntry, {
  CREDIT_CATEGORIES, DEBIT_CATEGORIES, ACCOUNTS,
} from '@/models/CashBookEntry';
import { requireSession, dateRangeFilter, pagination } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * The company cash book — salaries, insurance, challans, car rent and the rest,
 * which no driver settlement ever sees.
 *
 * GET  /api/cashbook?month=2026-06&account=cash
 * POST /api/cashbook  { date, account, credits: {...}, debits: {...}, opening }
 *
 * Do not add these figures to the daily book's totals to get company expenses:
 * the two overlap on fuel and toll. The cash book is the authority for
 * company-level accounts, the daily book for driver float.
 */

/** Coerces a partial category map to a complete one of non-negative numbers. */
const normaliseCategories = (
  keys: readonly string[],
  input: unknown,
): Record<string, number> => {
  const src = (input ?? {}) as Record<string, unknown>;
  return Object.fromEntries(keys.map((k) => [k, Math.max(Number(src[k]) || 0, 0)]));
};

export async function GET(req: NextRequest) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    await connectDB();
    const params = new URL(req.url).searchParams;
    const { limit, skip, page } = pagination(params);

    const filter: Record<string, unknown> = { companyId: auth.companyId };
    const range = dateRangeFilter(params);
    if (range) filter.date = range;

    const account = params.get('account');
    if (account && (ACCOUNTS as readonly string[]).includes(account)) filter.account = account;

    const [rows, total, agg] = await Promise.all([
      CashBookEntry.find(filter).sort({ date: -1, account: 1 }).skip(skip).limit(limit).lean(),
      CashBookEntry.countDocuments(filter),
      CashBookEntry.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalCredit: { $sum: '$totalCredit' },
            totalDebit: { $sum: '$totalDebit' },
            days: { $sum: 1 },
            unbalanced: { $sum: { $cond: ['$discrepancy', 1, 0] } },
          },
        },
      ]),
    ]);

    const s = agg[0] ?? { totalCredit: 0, totalDebit: 0, days: 0, unbalanced: 0 };
    return NextResponse.json({
      rows, page, limit, total,
      summary: {
        totalCredit: Math.round(s.totalCredit),
        totalDebit: Math.round(s.totalDebit),
        net: Math.round(s.totalCredit - s.totalDebit),
        days: s.days,
        unbalanced: s.unbalanced,
      },
      categories: { credits: CREDIT_CATEGORIES, debits: DEBIT_CATEGORIES, accounts: ACCOUNTS },
    });
  } catch (err) {
    console.error('GET /api/cashbook failed:', err);
    return NextResponse.json({ error: 'Failed to load the cash book' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    await connectDB();
    const body = await req.json();

    if (!body.date) return NextResponse.json({ error: 'date is required' }, { status: 400 });
    if (!(ACCOUNTS as readonly string[]).includes(body.account)) {
      return NextResponse.json(
        { error: `account must be one of: ${ACCOUNTS.join(', ')}` },
        { status: 400 },
      );
    }

    const date = new Date(`${String(body.date).slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: 'date is not a valid date' }, { status: 400 });
    }

    const credits = normaliseCategories(CREDIT_CATEGORIES, body.credits);
    const debits = normaliseCategories(DEBIT_CATEGORIES, body.debits);

    /*
     * Carry the opening balance from the previous entry on this account unless
     * one is given, so a day added mid-month lines up with the day before it.
     */
    let opening = Number(body.opening);
    if (!Number.isFinite(opening)) {
      const previous = await CashBookEntry.findOne({
        companyId: auth.companyId,
        account: body.account,
        date: { $lt: date },
      }).sort({ date: -1 }).select('closing').lean<{ closing: number }>();
      opening = previous?.closing ?? 0;
    }

    const totalCredit = Object.values(credits).reduce((a, b) => a + b, 0);
    const totalDebit = Object.values(debits).reduce((a, b) => a + b, 0);
    const computedClosing = Math.round((opening + totalCredit - totalDebit) * 100) / 100;
    const closing = Number.isFinite(Number(body.closing)) ? Number(body.closing) : computedClosing;

    // Upsert on the same key as the unique index, so re-submitting a day
    // corrects it rather than returning a duplicate-key error.
    const saved = await CashBookEntry.findOneAndUpdate(
      { companyId: auth.companyId, account: body.account, date },
      {
        companyId: auth.companyId,
        account: body.account,
        date,
        credits,
        debits,
        opening,
        closing,
        remarks: body.remarks ?? '',
        origin: 'app',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    await saved.save(); // hook derives totals, computedClosing and discrepancy
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error('POST /api/cashbook failed:', err);
    return NextResponse.json({ error: 'Failed to save the cash book entry' }, { status: 500 });
  }
}
