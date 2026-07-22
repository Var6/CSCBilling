import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import DailySettlement from '@/models/DailySettlement';
import FuelLog from '@/models/FuelLog';
import Repair from '@/models/Repair';
import Driver from '@/models/Driver';
import Vehicle from '@/models/Vehicle';
import { requireSession, dateRangeFilter } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * The figures the office actually asks for, in one call.
 *
 * GET /api/reports/summary?month=2026-07   (or ?from=&to=, default: all time)
 *
 * Revenue everywhere here is `totalEarnings` — the duty's real takings. The
 * spreadsheet's own "Total" column includes each driver's carried-forward
 * float, so summing that instead would inflate revenue by roughly the float
 * balance every single day. See models/DailySettlement.ts.
 */
export async function GET(req: NextRequest) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    await connectDB();
    const params = new URL(req.url).searchParams;
    const range = dateRangeFilter(params);

    const match: Record<string, unknown> = { companyId: auth.companyId };
    if (range) match.date = range;

    const [byMonth, byDriver, byChannel, byVehicle, repairAgg, fuelAgg, flags] =
      await Promise.all([
        DailySettlement.aggregate([
          { $match: match },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
              takings: { $sum: '$totalEarnings' },
              fuel: { $sum: '$fuelExpense' },
              toll: { $sum: '$tollExpense' },
              duties: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        DailySettlement.aggregate([
          { $match: match },
          {
            $group: {
              _id: { driverId: '$driverId', name: '$driverName' },
              takings: { $sum: '$totalEarnings' },
              expense: { $sum: '$totalExpense' },
              duties: { $sum: 1 },
              // Days actually driven, as opposed to leave or workshop days.
              worked: {
                $sum: { $cond: [{ $in: ['$dutyType', ['day', 'night']] }, 1, 0] },
              },
            },
          },
          { $sort: { takings: -1 } },
        ]),

        // Which platform the money arrives through — drives the payout mix.
        DailySettlement.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              uber: { $sum: '$earnings.uber' },
              uberCash: { $sum: '$earnings.uberCash' },
              rapidoCash: { $sum: '$earnings.rapidoCash' },
              rapidoAccount: { $sum: '$earnings.rapidoAccount' },
              upiBank: { $sum: '$earnings.upiBank' },
              personalUpi: { $sum: '$earnings.personalUpi' },
              offline: { $sum: '$earnings.offline' },
              advance: { $sum: '$earnings.advance' },
            },
          },
        ]),

        FuelLog.aggregate([
          { $match: match },
          {
            $group: {
              _id: { vehicleId: '$vehicleId', code: '$vehicleCode' },
              fuelCost: { $sum: '$amount' },
              quantity: { $sum: '$quantity' },
              fills: { $sum: 1 },
              avgMileage: { $avg: '$mileage' },
            },
          },
          { $sort: { fuelCost: -1 } },
        ]),

        Repair.aggregate([
          { $match: match },
          {
            $group: {
              _id: '$category',
              cost: { $sum: '$cost' },
              jobs: { $sum: 1 },
              downtimeDays: { $sum: '$downtimeDays' },
            },
          },
          { $sort: { cost: -1 } },
        ]),

        FuelLog.aggregate([
          { $match: match },
          { $group: { _id: null, amount: { $sum: '$amount' }, quantity: { $sum: '$quantity' } } },
        ]),

        // Things needing a human: rows whose arithmetic disagrees with the book,
        // and reference rows the import could not complete.
        Promise.all([
          DailySettlement.countDocuments({ ...match, discrepancy: true }),
          DailySettlement.countDocuments({ ...match, 'conflicts.0': { $exists: true } }),
          Driver.countDocuments({ needsProfile: true }),
          Vehicle.countDocuments({ needsProfile: true }),
          FuelLog.countDocuments({ companyId: auth.companyId, vehicleId: null }),
        ]),
      ]);

    const takings = byMonth.reduce((a, m) => a + m.takings, 0);
    const fuelFromBook = byMonth.reduce((a, m) => a + m.fuel, 0);
    const toll = byMonth.reduce((a, m) => a + m.toll, 0);
    const repairCost = repairAgg.reduce((a, r) => a + r.cost, 0);

    const channels = byChannel[0] ?? {};
    delete channels._id;

    const [discrepancies, conflicts, driversNeedingProfile, vehiclesNeedingProfile, fuelUnattributed] = flags;

    return NextResponse.json({
      range: params.get('month') ?? (params.get('from') ? `${params.get('from')}..${params.get('to') ?? 'now'}` : 'all'),

      totals: {
        takings: Math.round(takings),
        fuel: Math.round(fuelFromBook),
        toll: Math.round(toll),
        repairs: Math.round(repairCost),
        // Repairs sit outside the driver's daily book, so they are subtracted
        // here and nowhere else — the daily net does not know about them.
        net: Math.round(takings - fuelFromBook - toll - repairCost),
        duties: byMonth.reduce((a, m) => a + m.duties, 0),
      },

      byMonth: byMonth.map((m) => ({
        month: m._id,
        takings: Math.round(m.takings),
        fuel: Math.round(m.fuel),
        toll: Math.round(m.toll),
        net: Math.round(m.takings - m.fuel - m.toll),
        duties: m.duties,
      })),

      byDriver: byDriver.map((d) => ({
        driverId: d._id.driverId,
        name: d._id.name,
        takings: Math.round(d.takings),
        expense: Math.round(d.expense),
        net: Math.round(d.takings - d.expense),
        duties: d.duties,
        worked: d.worked,
        perDuty: d.worked ? Math.round(d.takings / d.worked) : 0,
      })),

      byChannel: Object.fromEntries(
        Object.entries(channels).map(([k, v]) => [k, Math.round(Number(v))]),
      ),

      byVehicle: byVehicle.map((v) => ({
        vehicleId: v._id.vehicleId,
        code: v._id.code || '(not recorded)',
        fuelCost: Math.round(v.fuelCost),
        quantity: Math.round(v.quantity * 100) / 100,
        fills: v.fills,
        avgMileage: v.avgMileage ? Math.round(v.avgMileage * 100) / 100 : null,
      })),

      byRepairCategory: repairAgg.map((r) => ({
        category: r._id,
        cost: Math.round(r.cost),
        jobs: r.jobs,
        downtimeDays: r.downtimeDays,
      })),

      fuelBook: {
        amount: Math.round(fuelAgg[0]?.amount ?? 0),
        quantity: Math.round((fuelAgg[0]?.quantity ?? 0) * 100) / 100,
      },

      /**
       * The fuel book and the daily book are kept separately by hand and do not
       * agree — surfacing the gap is more useful than picking one silently.
       */
      needsAttention: {
        discrepancies,
        conflicts,
        driversNeedingProfile,
        vehiclesNeedingProfile,
        fuelLogsWithoutVehicle: fuelUnattributed,
        fuelBookVsDailyBook:
          Math.round((fuelAgg[0]?.amount ?? 0) - fuelFromBook),
      },
    });
  } catch (err) {
    console.error('GET /api/reports/summary failed:', err);
    return NextResponse.json({ error: 'Failed to build summary' }, { status: 500 });
  }
}
