import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Repair from '@/models/Repair';
import Vehicle from '@/models/Vehicle';
import { requireSession, dateRangeFilter, pagination } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * Workshop visits — servicing, repairs, parts.
 *
 * GET  /api/repair?vehicleId=&status=&month=&due=true
 * POST /api/repair  { vehicleId, date, category, description, partsCost, labourCost }
 */

const CATEGORIES = [
  'service', 'repair', 'tyre', 'battery', 'bodywork', 'electrical',
  'cng-kit', 'insurance', 'fitness', 'permit', 'pollution', 'other',
];

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

    const vehicleId = params.get('vehicleId');
    if (vehicleId && Types.ObjectId.isValid(vehicleId)) filter.vehicleId = new Types.ObjectId(vehicleId);

    const status = params.get('status');
    if (status) filter.status = status;

    const category = params.get('category');
    if (category) filter.category = category;

    // `due=true` is the one staff actually need daily: what is scheduled or
    // already overdue, soonest first.
    if (params.get('due') === 'true') {
      filter.status = { $in: ['scheduled', 'in-progress'] };
    }

    const sort: Record<string, 1 | -1> =
      params.get('due') === 'true' ? { nextDueDate: 1, date: 1 } : { date: -1 };

    const [rows, total, agg] = await Promise.all([
      Repair.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Repair.countDocuments(filter),
      Repair.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            cost: { $sum: '$cost' },
            downtimeDays: { $sum: '$downtimeDays' },
            jobs: { $sum: 1 },
          },
        },
      ]),
    ]);

    const s = agg[0] ?? { cost: 0, downtimeDays: 0, jobs: 0 };
    return NextResponse.json({
      rows, page, limit, total,
      summary: { cost: Math.round(s.cost), downtimeDays: s.downtimeDays, jobs: s.jobs },
    });
  } catch (err) {
    console.error('GET /api/repair failed:', err);
    return NextResponse.json({ error: 'Failed to load repairs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    await connectDB();
    const body = await req.json();

    if (!body.vehicleId || !Types.ObjectId.isValid(body.vehicleId)) {
      return NextResponse.json({ error: 'A valid vehicleId is required' }, { status: 400 });
    }
    if (!body.date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 });
    }
    if (body.category && !CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `category must be one of: ${CATEGORIES.join(', ')}` },
        { status: 400 },
      );
    }

    const vehicle = await Vehicle.findById(body.vehicleId)
      .select('plate shortCode')
      .lean<{ _id: Types.ObjectId; plate: string; shortCode: string }>();
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

    const date = new Date(`${String(body.date).slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: 'date is not a valid date' }, { status: 400 });
    }

    const partsCost = Math.max(Number(body.partsCost) || 0, 0);
    const labourCost = Math.max(Number(body.labourCost) || 0, 0);
    // A single lump-sum bill is common; fall back to `cost` when the split is
    // not known, rather than forcing staff to invent one.
    const cost = partsCost || labourCost
      ? partsCost + labourCost
      : Math.max(Number(body.cost) || 0, 0);

    const status = body.status ?? 'scheduled';

    const saved = await Repair.create({
      companyId: auth.companyId,
      vehicleId: vehicle._id,
      vehiclePlate: vehicle.plate,
      vehicleCode: vehicle.shortCode ?? '',
      date,
      category: body.category ?? 'service',
      description: body.description ?? '',
      partsCost,
      labourCost,
      cost,
      odometer: body.odometer == null ? null : Number(body.odometer),
      garage: body.garage ?? '',
      invoiceNo: body.invoiceNo ?? '',
      billUrl: body.billUrl ?? '',
      status,
      downtimeDays: Math.max(Number(body.downtimeDays) || 0, 0),
      nextDueDate: body.nextDueDate ? new Date(body.nextDueDate) : null,
      nextDueOdometer: body.nextDueOdometer == null ? null : Number(body.nextDueOdometer),
      notes: body.notes ?? '',
      origin: 'app',
    });

    // Only completed work has actually cost money, and only a car in the
    // workshop should read as `maintenance` on the fleet page.
    const vehicleUpdate: Record<string, unknown> = {};
    if (status === 'completed' && cost > 0) vehicleUpdate.$inc = { totalRepairCost: cost };
    if (status === 'in-progress') vehicleUpdate.$set = { status: 'maintenance' };
    if (Object.keys(vehicleUpdate).length) {
      await Vehicle.updateOne({ _id: vehicle._id }, vehicleUpdate);
    }

    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error('POST /api/repair failed:', err);
    return NextResponse.json({ error: 'Failed to save repair' }, { status: 500 });
  }
}
