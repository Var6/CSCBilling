import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import DailySettlement, { EARNING_CHANNELS } from '@/models/DailySettlement';
import Vehicle from '@/models/Vehicle';
import { syncCashBookForDates } from '@/lib/cashbookSync';
import Driver from '@/models/Driver';
import { requireSession, dateRangeFilter, pagination } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * The daily book — one row per driver per duty.
 *
 * GET /api/settlement?month=2026-07&driverId=&dutyType=&discrepancy=true
 * POST /api/settlement   { date, driverId, earnings: {...}, fuelExpense, ... }
 */

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

    const driverId = params.get('driverId');
    if (driverId && Types.ObjectId.isValid(driverId)) filter.driverId = new Types.ObjectId(driverId);

    const dutyType = params.get('dutyType');
    if (dutyType) filter.dutyType = dutyType;

    // Lets ops pull just the rows whose arithmetic disagrees with the book.
    if (params.get('discrepancy') === 'true') filter.discrepancy = true;

    const [rows, total, totals] = await Promise.all([
      DailySettlement.find(filter).sort({ date: -1, driverName: 1 }).skip(skip).limit(limit).lean(),
      DailySettlement.countDocuments(filter),
      // Totals cover the whole filter, not just the current page — a page of
      // 100 rows out of a month is not a figure anyone can act on.
      DailySettlement.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$totalEarnings' },
            fuelExpense: { $sum: '$fuelExpense' },
            tollExpense: { $sum: '$tollExpense' },
            totalExpense: { $sum: '$totalExpense' },
            transferToBank: { $sum: '$transferToBank' },
            cashGiven: { $sum: '$cashGiven' },
            duties: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = totals[0] ?? {
      totalEarnings: 0, fuelExpense: 0, tollExpense: 0,
      totalExpense: 0, transferToBank: 0, cashGiven: 0, duties: 0,
    };
    delete (summary as Record<string, unknown>)._id;

    return NextResponse.json({
      rows,
      page,
      limit,
      total,
      summary: { ...summary, netTotal: summary.totalEarnings - summary.totalExpense },
    });
  } catch (err) {
    console.error('GET /api/settlement failed:', err);
    return NextResponse.json({ error: 'Failed to load settlements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    await connectDB();
    const body = await req.json();

    if (!body.date || !body.driverId) {
      return NextResponse.json({ error: 'date and driverId are required' }, { status: 400 });
    }
    if (!Types.ObjectId.isValid(body.driverId)) {
      return NextResponse.json({ error: 'driverId is not a valid id' }, { status: 400 });
    }

    const driver = await Driver.findById(body.driverId)
      .select('name vehicleId vehicle')
      .lean<{ name: string; vehicleId?: Types.ObjectId | null; vehicle?: string | null }>();
    if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

    // Normalise to a UTC day so a settlement written from any timezone lands on
    // the same date the books use, and the unique index actually catches repeats.
    const date = new Date(`${String(body.date).slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: 'date is not a valid date' }, { status: 400 });
    }

    const earnings = Object.fromEntries(
      EARNING_CHANNELS.map((k) => [k, Math.max(Number(body.earnings?.[k]) || 0, 0)]),
    );

    /*
     * Itemised expense lines — several fills and several tolls per duty is the
     * normal case. The totals are summed here and re-derived by the model hook,
     * so a client that sends only lump sums still works.
     */
    const cleanEntries = (rows: unknown) =>
      Array.isArray(rows)
        ? rows
            .map((r) => ({
              amount: Math.max(Number((r as { amount?: unknown })?.amount) || 0, 0),
              note: String((r as { note?: unknown })?.note ?? '').slice(0, 120),
            }))
            .filter((r) => r.amount > 0)
        : [];
    const fuelEntries = cleanEntries(body.fuelEntries);
    const tollEntries = cleanEntries(body.tollEntries);

    const shift = body.shift === 'day' || body.shift === 'night' ? body.shift : null;

    // Carry yesterday's closing float forward unless the caller states one.
    let openingBalance = Number(body.openingBalance);
    if (!Number.isFinite(openingBalance)) {
      const previous = await DailySettlement.findOne({
        companyId: auth.companyId,
        driverId: body.driverId,
        date: { $lt: date },
      }).sort({ date: -1 }).select('closingBalance').lean<{ closingBalance: number }>();
      openingBalance = previous?.closingBalance ?? 0;
    }

    const fuelExpense = fuelEntries.length
      ? fuelEntries.reduce((a, r) => a + r.amount, 0)
      : Math.max(Number(body.fuelExpense) || 0, 0);
    const tollExpense = tollEntries.length
      ? tollEntries.reduce((a, r) => a + r.amount, 0)
      : Math.max(Number(body.tollExpense) || 0, 0);
    const transferToBank = Math.max(Number(body.transferToBank) || 0, 0);
    const cashGiven = Math.max(Number(body.cashGiven) || 0, 0);

    /*
     * The same arithmetic the model's pre-validate hook applies, done here as
     * well because findOneAndUpdate runs query middleware, not document
     * middleware — so the hook has not fired yet at this point and reading
     * `computedClosingBalance` off the returned document would give the
     * previous value (or 0 on insert).
     */
    const totalEarnings = EARNING_CHANNELS.reduce((sum, k) => sum + earnings[k], 0);
    const cashInHand = openingBalance + totalEarnings;
    const netTotal = cashInHand - fuelExpense - tollExpense;
    const computedClosingBalance = Math.round((netTotal - transferToBank - cashGiven) * 100) / 100;

    // Staff may override what the driver is actually held to; otherwise the
    // arithmetic stands.
    const closingBalance = body.closingBalance != null
      ? Number(body.closingBalance) || 0
      : computedClosingBalance;

    /*
     * The vehicle defaults to whatever this driver is assigned — the pairing
     * per-vehicle profitability depends on — but an explicit choice wins, since
     * a driver can take a different car out for a day.
     */
    let vehicleId: Types.ObjectId | null =
      body.vehicleId && Types.ObjectId.isValid(String(body.vehicleId))
        ? new Types.ObjectId(String(body.vehicleId))
        : driver.vehicleId ?? null;
    let vehiclePlate = '';
    if (vehicleId) {
      const v = await Vehicle.findById(vehicleId)
        .select('plate shortCode')
        .lean<{ plate?: string; shortCode?: string }>();
      if (v) vehiclePlate = v.plate?.startsWith('PENDING') ? (v.shortCode ?? '') : (v.plate ?? '');
      else vehicleId = null;
    }

    const doc = {
      companyId: auth.companyId,
      driverId: new Types.ObjectId(body.driverId),
      driverName: driver.name,
      date,
      shift,
      vehicleId,
      vehiclePlate,
      fuelEntries,
      tollEntries,
      dutyType: body.dutyType ?? 'unknown',
      dutyNote: body.dutyNote ?? '',
      openingBalance,
      earnings,
      fuelExpense,
      tollExpense,
      transferToBank,
      cashGiven,
      closingBalance,
      computedClosingBalance,
      notes: Array.isArray(body.notes) ? body.notes : [],
      origin: 'app' as const,
    };

    // Upsert on the same key the unique index uses, so re-submitting a duty
    // corrects it rather than returning a duplicate-key error to the user.
    const saved = await DailySettlement.findOneAndUpdate(
      { companyId: auth.companyId, driverId: doc.driverId, date, shift },
      doc,
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    );

    // Persist the derived totals through the document hook, which is the single
    // definition of that arithmetic.
    await saved.save();

    /*
     * Only move the driver's running balance when this is their most recent
     * duty. Back-filling an older day must not overwrite a float that later
     * duties have already carried forward.
     */
    const latest = await DailySettlement.findOne({
      companyId: auth.companyId,
      driverId: doc.driverId,
    }).sort({ date: -1 }).select('date closingBalance').lean<{ date: Date; closingBalance: number }>();

    if (latest && latest.date.getTime() <= date.getTime()) {
      await Driver.updateOne(
        { _id: doc.driverId },
        { $set: { currentBalance: saved.closingBalance, balanceUpdatedAt: date } },
      );
    }

    // The cash book follows the daily book automatically — see lib/cashbookSync.
    await syncCashBookForDates(auth.companyId, [date]);

    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error('POST /api/settlement failed:', err);
    return NextResponse.json({ error: 'Failed to save settlement' }, { status: 500 });
  }
}
