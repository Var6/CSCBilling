import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import DailySettlement from '@/models/DailySettlement';
import FuelLog from '@/models/FuelLog';
import Repair from '@/models/Repair';
import Driver from '@/models/Driver';
import Vehicle from '@/models/Vehicle';
import { requireSession, dateRangeFilter } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * Profitability analysis — who and what makes money, and what drains it.
 *
 * GET /api/reports/suggestions?month=2026-07   (or ?from=&to=, default all time)
 *
 * Two honesty constraints shape everything below.
 *
 * 1. Revenue is `totalEarnings`, never `cashInHand`. The books' "Total" column
 *    includes the float a driver carries in, so ranking on it would reward
 *    whoever happens to be holding the most company cash.
 *
 * 2. The daily book almost never records which vehicle a driver used. Revenue
 *    is therefore attributed to a vehicle only for days where the fuel book
 *    names one for that driver on that date. The share of revenue that could
 *    be attributed is returned as `coverage` so nobody reads a vehicle ranking
 *    built on 20% of the data as if it were the whole fleet.
 */

type DriverStat = {
  driverId: string;
  name: string;
  active: boolean;
  takings: number;
  fuel: number;
  toll: number;
  expense: number;
  net: number;
  duties: number;
  worked: number;
  leave: number;
  netPerWorkedDay: number;
  expenseRatio: number;
  floatHeld: number;
  flagged: number;
};

type VehicleStat = {
  vehicleId: string | null;
  code: string;
  plate: string;
  attributedTakings: number;
  attributedDays: number;
  fuelCost: number;
  repairCost: number;
  totalCost: number;
  net: number;
  netPerDay: number;
  avgMileage: number | null;
  downtimeDays: number;
  fills: number;
};

const round = (n: number) => Math.round(n * 100) / 100;
const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

export async function GET(req: NextRequest) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    await connectDB();
    const params = new URL(req.url).searchParams;
    const range = dateRangeFilter(params);

    const match: Record<string, unknown> = { companyId: auth.companyId };
    if (range) match.date = range;

    /* ---------------- drivers ---------------- */

    const [driverAgg, drivers] = await Promise.all([
      DailySettlement.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$driverId',
            name: { $last: '$driverName' },
            takings: { $sum: '$totalEarnings' },
            fuel: { $sum: '$fuelExpense' },
            toll: { $sum: '$tollExpense' },
            duties: { $sum: 1 },
            /*
             * A "working day" is a day the driver actually brought money in.
             *
             * Counting only dutyType day/night is wrong here: the older sheets
             * have no duty column at all, so most imported rows are 'unknown'.
             * Ranking on that divided one driver's whole half-year of takings
             * by six days and reported ₹27,000 a day. Takings recorded is the
             * one signal every layout of the books carries.
             */
            worked: { $sum: { $cond: [{ $gt: ['$totalEarnings', 0] }, 1, 0] } },
            leave: { $sum: { $cond: [{ $in: ['$dutyType', ['leave', 'off']] }, 1, 0] } },
            flagged: { $sum: { $cond: ['$discrepancy', 1, 0] } },
          },
        },
      ]),
      Driver.find().select('name active currentBalance').lean<
        { _id: Types.ObjectId; name: string; active?: boolean; currentBalance?: number }[]
      >(),
    ]);

    const driverMeta = new Map(drivers.map((d) => [String(d._id), d]));

    const driverStats: DriverStat[] = driverAgg.map((d) => {
      const expense = d.fuel + d.toll;
      const net = d.takings - expense;
      const meta = driverMeta.get(String(d._id));
      return {
        driverId: String(d._id),
        name: d.name,
        active: meta?.active !== false,
        takings: Math.round(d.takings),
        fuel: Math.round(d.fuel),
        toll: Math.round(d.toll),
        expense: Math.round(expense),
        net: Math.round(net),
        duties: d.duties,
        worked: d.worked,
        leave: d.leave,
        /** Net divided by days that actually earned. See the aggregation note. */
        netPerWorkedDay: Math.round(safeDiv(net, d.worked)),
        // What share of takings is eaten by running costs. The single most
        // useful number for spotting a driver who bills well but burns fuel.
        expenseRatio: round(safeDiv(expense, d.takings)),
        floatHeld: Math.round(meta?.currentBalance ?? 0),
        flagged: d.flagged,
      };
    }).sort((a, b) => b.net - a.net);

    /* ---------------- vehicles ---------------- */

    // Which vehicle each driver was on, per day, according to the fuel book.
    const dayVehicle = await FuelLog.aggregate([
      { $match: { ...match, vehicleId: { $ne: null } } },
      {
        $group: {
          _id: { driverId: '$driverId', date: '$date' },
          vehicleId: { $last: '$vehicleId' },
          code: { $last: '$vehicleCode' },
        },
      },
    ]);

    const vehicleByDriverDay = new Map(
      dayVehicle.map((d) => [
        `${d._id.driverId}|${new Date(d._id.date).toISOString().slice(0, 10)}`,
        { vehicleId: String(d.vehicleId), code: d.code },
      ]),
    );

    const settlements = await DailySettlement.find(match)
      .select('driverId date totalEarnings fuelExpense tollExpense')
      .lean<{ driverId: Types.ObjectId; date: Date; totalEarnings: number }[]>();

    const perVehicle = new Map<string, { takings: number; days: number; code: string }>();
    let attributed = 0;
    let totalTakings = 0;

    for (const s of settlements) {
      totalTakings += s.totalEarnings;
      const key = `${s.driverId}|${new Date(s.date).toISOString().slice(0, 10)}`;
      const hit = vehicleByDriverDay.get(key);
      if (!hit) continue;
      attributed += s.totalEarnings;
      const cur = perVehicle.get(hit.vehicleId) ?? { takings: 0, days: 0, code: hit.code };
      cur.takings += s.totalEarnings;
      cur.days += 1;
      perVehicle.set(hit.vehicleId, cur);
    }

    const [fuelByVehicle, repairByVehicle, vehicles] = await Promise.all([
      FuelLog.aggregate([
        { $match: { ...match, vehicleId: { $ne: null } } },
        {
          $group: {
            _id: '$vehicleId',
            fuelCost: { $sum: '$amount' },
            fills: { $sum: 1 },
            avgMileage: { $avg: '$mileage' },
          },
        },
      ]),
      Repair.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$vehicleId',
            repairCost: { $sum: '$cost' },
            downtimeDays: { $sum: '$downtimeDays' },
          },
        },
      ]),
      Vehicle.find().select('plate shortCode name').lean<
        { _id: Types.ObjectId; plate: string; shortCode?: string; name?: string }[]
      >(),
    ]);

    const fuelMap = new Map(fuelByVehicle.map((f) => [String(f._id), f]));
    const repairMap = new Map(repairByVehicle.map((r) => [String(r._id), r]));

    const vehicleStats: VehicleStat[] = vehicles.map((v) => {
      const id = String(v._id);
      const rev = perVehicle.get(id);
      const f = fuelMap.get(id);
      const r = repairMap.get(id);

      const fuelCost = Math.round(f?.fuelCost ?? 0);
      const repairCost = Math.round(r?.repairCost ?? 0);
      const takings = Math.round(rev?.takings ?? 0);
      const days = rev?.days ?? 0;
      const net = takings - fuelCost - repairCost;

      return {
        vehicleId: id,
        code: v.shortCode || v.name || '—',
        plate: v.plate?.startsWith('PENDING') ? '' : v.plate ?? '',
        attributedTakings: takings,
        attributedDays: days,
        fuelCost,
        repairCost,
        totalCost: fuelCost + repairCost,
        net,
        netPerDay: Math.round(safeDiv(net, days)),
        avgMileage: f?.avgMileage ? round(f.avgMileage) : null,
        downtimeDays: r?.downtimeDays ?? 0,
        fills: f?.fills ?? 0,
      };
    }).sort((a, b) => b.net - a.net);

    /* ---------------- findings ---------------- */

    // Ten earning days is the floor for a per-day average to mean anything.
    // Without it a driver with three good days outranks one with a steady year.
    const worked = driverStats.filter((d) => d.worked >= 10);
    const fleetNetPerDay = safeDiv(
      worked.reduce((a, d) => a + d.net, 0),
      worked.reduce((a, d) => a + d.worked, 0),
    );
    const fleetExpenseRatio = safeDiv(
      driverStats.reduce((a, d) => a + d.expense, 0),
      driverStats.reduce((a, d) => a + d.takings, 0),
    );

    const findings: {
      kind: 'best' | 'worst' | 'watch';
      subject: 'driver' | 'vehicle' | 'fleet';
      title: string;
      detail: string;
      metric?: string;
    }[] = [];

    // Rank on net per earning day, not total net — otherwise the answer is
    // always just "whoever worked the most days".
    const byRate = [...worked].sort((a, b) => b.netPerWorkedDay - a.netPerWorkedDay);
    const bestDriver = byRate[0];
    if (bestDriver) {
      findings.push({
        kind: 'best',
        subject: 'driver',
        title: `${bestDriver.name} earns the most`,
        detail: `₹${bestDriver.netPerWorkedDay.toLocaleString('en-IN')} a day across ${bestDriver.worked} earning days (₹${bestDriver.net.toLocaleString('en-IN')} net), against a fleet average of ₹${Math.round(fleetNetPerDay).toLocaleString('en-IN')}.`,
        metric: `₹${bestDriver.netPerWorkedDay.toLocaleString('en-IN')}/day`,
      });
    }

    // The "pit hole": genuinely below average per working day, judged only on
    // drivers with enough days for the number to mean anything.
    const worstDriver = byRate[byRate.length - 1];
    if (worstDriver && worstDriver.driverId !== bestDriver?.driverId) {
      const gap = Math.round(fleetNetPerDay - worstDriver.netPerWorkedDay);
      findings.push({
        kind: 'worst',
        subject: 'driver',
        title: `${worstDriver.name} returns the least per day`,
        detail: `₹${worstDriver.netPerWorkedDay.toLocaleString('en-IN')} a day over ${worstDriver.worked} earning days — ₹${gap.toLocaleString('en-IN')} below the fleet average. Costs eat ${Math.round(worstDriver.expenseRatio * 100)}% of what they collect, against ${Math.round(fleetExpenseRatio * 100)}% fleet-wide.`,
        metric: `₹${worstDriver.netPerWorkedDay.toLocaleString('en-IN')}/day`,
      });
    }

    // High fuel burn relative to takings, which a headline net figure hides.
    const burner = [...worked]
      .filter((d) => d.takings > 0 && d.expenseRatio > fleetExpenseRatio * 1.25)
      .sort((a, b) => b.expenseRatio - a.expenseRatio)[0];
    if (burner) {
      findings.push({
        kind: 'watch',
        subject: 'driver',
        title: `${burner.name} spends heavily to earn`,
        detail: `${Math.round(burner.expenseRatio * 100)}% of takings go on fuel and toll, against ${Math.round(fleetExpenseRatio * 100)}% fleet-wide. Worth checking the route mix and the fuel slips.`,
        metric: `${Math.round(burner.expenseRatio * 100)}% costs`,
      });
    }

    const heavyLeave = [...driverStats]
      .filter((d) => d.duties >= 10 && safeDiv(d.leave, d.duties) > 0.3)
      .sort((a, b) => safeDiv(b.leave, b.duties) - safeDiv(a.leave, a.duties))[0];
    if (heavyLeave) {
      findings.push({
        kind: 'watch',
        subject: 'driver',
        title: `${heavyLeave.name} is off duty often`,
        detail: `${heavyLeave.leave} of ${heavyLeave.duties} recorded days were leave or off — a car sitting idle earns nothing.`,
        metric: `${Math.round(safeDiv(heavyLeave.leave, heavyLeave.duties) * 100)}% off`,
      });
    }

    const withRevenue = vehicleStats.filter((v) => v.attributedDays >= 3);
    const bestVehicle = withRevenue[0];
    if (bestVehicle) {
      findings.push({
        kind: 'best',
        subject: 'vehicle',
        title: `${bestVehicle.code} is the most profitable vehicle`,
        detail: `₹${bestVehicle.net.toLocaleString('en-IN')} net over ${bestVehicle.attributedDays} attributable days${bestVehicle.avgMileage ? `, running at ${bestVehicle.avgMileage} km per kg` : ''}.`,
        metric: `₹${bestVehicle.netPerDay.toLocaleString('en-IN')}/day`,
      });
    }
    const worstVehicle = [...withRevenue].sort((a, b) => a.netPerDay - b.netPerDay)[0];
    if (worstVehicle && worstVehicle.vehicleId !== bestVehicle?.vehicleId) {
      findings.push({
        kind: 'worst',
        subject: 'vehicle',
        title: `${worstVehicle.code} is the money pit`,
        detail: `₹${worstVehicle.netPerDay.toLocaleString('en-IN')} a day against ₹${bestVehicle?.netPerDay.toLocaleString('en-IN') ?? '—'} for the best. ₹${worstVehicle.fuelCost.toLocaleString('en-IN')} fuel and ₹${worstVehicle.repairCost.toLocaleString('en-IN')} repairs${worstVehicle.downtimeDays ? `, ${worstVehicle.downtimeDays} days off the road` : ''}.`,
        metric: `₹${worstVehicle.netPerDay.toLocaleString('en-IN')}/day`,
      });
    }

    // Poor mileage is the earliest sign of a failing engine or a leaking kit.
    const mileages = vehicleStats.filter((v) => v.avgMileage != null);
    if (mileages.length >= 2) {
      const avg = mileages.reduce((a, v) => a + (v.avgMileage ?? 0), 0) / mileages.length;
      const thirsty = [...mileages].sort((a, b) => (a.avgMileage ?? 0) - (b.avgMileage ?? 0))[0];
      if ((thirsty.avgMileage ?? 0) < avg * 0.85) {
        findings.push({
          kind: 'watch',
          subject: 'vehicle',
          title: `${thirsty.code} is running thirsty`,
          detail: `${thirsty.avgMileage} km per kg against a fleet average of ${round(avg)}. Falling mileage usually shows up before a breakdown does — worth a service check.`,
          metric: `${thirsty.avgMileage} km/kg`,
        });
      }
    }

    const bigFloat = driverStats.filter((d) => d.floatHeld > 3000)
      .sort((a, b) => b.floatHeld - a.floatHeld)[0];
    if (bigFloat) {
      findings.push({
        kind: 'watch',
        subject: 'fleet',
        title: `${bigFloat.name} is holding ₹${bigFloat.floatHeld.toLocaleString('en-IN')}`,
        detail: 'Uncollected float is money out of the business and a loss if they leave. Collect it or record a settlement.',
        metric: `₹${bigFloat.floatHeld.toLocaleString('en-IN')}`,
      });
    }

    /* ---------------- trend ---------------- */

    const trend = await DailySettlement.aggregate([
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
    ]);

    return NextResponse.json({
      range: params.get('month') ?? 'all',
      findings,
      drivers: driverStats,
      vehicles: vehicleStats,
      trend: trend.map((t) => ({
        month: t._id,
        takings: Math.round(t.takings),
        expense: Math.round(t.fuel + t.toll),
        net: Math.round(t.takings - t.fuel - t.toll),
        duties: t.duties,
      })),
      benchmarks: {
        fleetNetPerDay: Math.round(fleetNetPerDay),
        fleetExpenseRatio: round(fleetExpenseRatio),
      },
      coverage: {
        // How much of revenue could be pinned to a specific vehicle. Vehicle
        // rankings are only as trustworthy as this number.
        attributedTakings: Math.round(attributed),
        totalTakings: Math.round(totalTakings),
        pct: round(safeDiv(attributed, totalTakings)),
      },
    });
  } catch (err) {
    console.error('GET /api/reports/suggestions failed:', err);
    return NextResponse.json({ error: 'Failed to build suggestions' }, { status: 500 });
  }
}
