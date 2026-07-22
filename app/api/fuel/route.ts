import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import FuelLog from '@/models/FuelLog';
import Driver from '@/models/Driver';
import Vehicle from '@/models/Vehicle';
import { requireSession, dateRangeFilter, pagination } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * Fuel / CNG fills.
 *
 * GET  /api/fuel?month=2026-07&vehicleId=&driverId=
 * POST /api/fuel  { date, driverId, vehicleId, amount, quantity, meterReading }
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

    const vehicleId = params.get('vehicleId');
    if (vehicleId && Types.ObjectId.isValid(vehicleId)) filter.vehicleId = new Types.ObjectId(vehicleId);

    const driverId = params.get('driverId');
    if (driverId && Types.ObjectId.isValid(driverId)) filter.driverId = new Types.ObjectId(driverId);

    const [rows, total, agg] = await Promise.all([
      FuelLog.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      FuelLog.countDocuments(filter),
      FuelLog.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            amount: { $sum: '$amount' },
            quantity: { $sum: '$quantity' },
            fills: { $sum: 1 },
            // Averaged over the fills that produced a usable mileage; nulls are
            // skipped by $avg, which is what we want here.
            avgMileage: { $avg: '$mileage' },
          },
        },
      ]),
    ]);

    const s = agg[0] ?? { amount: 0, quantity: 0, fills: 0, avgMileage: null };
    return NextResponse.json({
      rows,
      page,
      limit,
      total,
      summary: {
        amount: Math.round(s.amount),
        quantity: Math.round(s.quantity * 100) / 100,
        fills: s.fills,
        avgMileage: s.avgMileage ? Math.round(s.avgMileage * 100) / 100 : null,
        avgRate: s.quantity > 0 ? Math.round((s.amount / s.quantity) * 100) / 100 : null,
      },
    });
  } catch (err) {
    console.error('GET /api/fuel failed:', err);
    return NextResponse.json({ error: 'Failed to load fuel logs' }, { status: 500 });
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

    const driver = await Driver.findById(body.driverId).select('name').lean<{ name: string }>();
    if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

    const date = new Date(`${String(body.date).slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: 'date is not a valid date' }, { status: 400 });
    }

    let vehicle = null;
    if (body.vehicleId && Types.ObjectId.isValid(body.vehicleId)) {
      vehicle = await Vehicle.findById(body.vehicleId)
        .select('plate shortCode')
        .lean<{ _id: Types.ObjectId; plate: string; shortCode: string }>();
    }

    const amount = Math.max(Number(body.amount) || 0, 0);
    const quantity = Math.max(Number(body.quantity) || 0, 0);
    const meterReading = body.meterReading == null ? null : Number(body.meterReading);

    /*
     * Mileage since the previous fill on this vehicle. Same range checks the
     * importer applies — the readings staff type in are no more reliable than
     * the ones in the paper book, and one bad entry should not skew a car's
     * running average.
     */
    let kmSinceLast: number | null = null;
    let mileage: number | null = null;
    if (vehicle && meterReading != null && Number.isFinite(meterReading)) {
      const previous = await FuelLog.findOne({
        companyId: auth.companyId,
        vehicleId: vehicle._id,
        date: { $lte: date },
        meterReading: { $ne: null },
      }).sort({ date: -1, createdAt: -1 }).select('meterReading').lean<{ meterReading: number }>();

      if (previous?.meterReading != null && meterReading > previous.meterReading) {
        const delta = Math.round((meterReading - previous.meterReading) * 10) / 10;
        if (delta <= 800) {
          kmSinceLast = delta;
          if (quantity > 0) {
            const m = Math.round((delta / quantity) * 100) / 100;
            if (m >= 5 && m <= 35) mileage = m;
          }
        }
      }
    }

    const saved = await FuelLog.create({
      companyId: auth.companyId,
      date,
      driverId: new Types.ObjectId(body.driverId),
      driverName: driver.name,
      vehicleId: vehicle?._id ?? null,
      vehicleCode: vehicle?.shortCode ?? '',
      vehiclePlate: vehicle?.plate ?? '',
      fuelType: body.fuelType ?? 'cng',
      amount,
      quantity,
      meterReading: Number.isFinite(meterReading as number) ? meterReading : null,
      startKm: body.startKm == null ? null : Number(body.startKm),
      endKm: body.endKm == null ? null : Number(body.endKm),
      kmSinceLast,
      mileage,
      notes: body.notes ?? '',
      origin: 'app',
    });

    // Keep the vehicle's headline figures current without an aggregation on read.
    if (vehicle) {
      const update: Record<string, unknown> = { $inc: { totalFuelCost: amount } };
      if (meterReading != null && Number.isFinite(meterReading)) {
        update.$max = { currentOdometer: meterReading };
        update.$set = { odometerUpdatedAt: date };
      }
      await Vehicle.updateOne({ _id: vehicle._id }, update);
    }

    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error('POST /api/fuel failed:', err);
    return NextResponse.json({ error: 'Failed to save fuel log' }, { status: 500 });
  }
}
