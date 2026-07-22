import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import FuelLog from '@/models/FuelLog';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';
import { requireSession } from '@/lib/apiAuth';
import { applyFields, snapshotIfImported, type Amendable } from '@/lib/amend';

export const dynamic = 'force-dynamic';

/**
 * Correcting and removing fuel entries.
 *
 * The paper book contains genuinely wrong cells — a date serial typed into a
 * KG/Litre column, trip meters recorded where the odometer belonged — so being
 * able to fix a fill after the fact is not a nicety.
 *
 * Two things are kept consistent on every write:
 *  - the vehicle's lifetime fuel spend, adjusted by the delta rather than
 *    recomputed, so it cannot drift;
 *  - mileage, which depends on the previous reading for the same vehicle and
 *    so must be derived here rather than trusted from the client.
 */

const EDITABLE = [
  'date', 'driverId', 'vehicleId', 'fuelType',
  'amount', 'quantity', 'meterReading', 'meterNote',
  'startKm', 'endKm', 'notes',
] as const;

/** Same bounds the importer applies — see scripts/import-sheets.mjs. */
const MAX_KM_PER_DAY = 800;
const MIN_MILEAGE = 5;
const MAX_MILEAGE = 35;

async function recomputeMileage(
  companyId: Types.ObjectId,
  vehicleId: Types.ObjectId | null,
  date: Date,
  meterReading: number | null,
  quantity: number,
  excludeId: Types.ObjectId,
) {
  if (!vehicleId || meterReading == null || !Number.isFinite(meterReading)) {
    return { kmSinceLast: null, mileage: null };
  }

  const previous = await FuelLog.findOne({
    companyId,
    vehicleId,
    _id: { $ne: excludeId },
    date: { $lte: date },
    meterReading: { $ne: null },
  }).sort({ date: -1, createdAt: -1 }).select('meterReading').lean<{ meterReading: number }>();

  if (previous?.meterReading == null || meterReading <= previous.meterReading) {
    return { kmSinceLast: null, mileage: null };
  }

  const delta = Math.round((meterReading - previous.meterReading) * 10) / 10;
  if (delta > MAX_KM_PER_DAY) return { kmSinceLast: null, mileage: null };

  let mileage: number | null = null;
  if (quantity > 0) {
    const m = Math.round((delta / quantity) * 100) / 100;
    if (m >= MIN_MILEAGE && m <= MAX_MILEAGE) mileage = m;
  }
  return { kmSinceLast: delta, mileage };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  const { id } = await ctx.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  await connectDB();
  const log = await FuelLog.findOne({ _id: id, companyId: auth.companyId }).lean();
  if (!log) return NextResponse.json({ error: 'Fuel entry not found' }, { status: 404 });
  return NextResponse.json(log);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await connectDB();
    const log = await FuelLog.findOne({ _id: id, companyId: auth.companyId });
    if (!log) return NextResponse.json({ error: 'Fuel entry not found' }, { status: 404 });

    const body = await req.json();
    const previousAmount = Number(log.amount) || 0;
    const previousVehicleId = log.vehicleId ? String(log.vehicleId) : null;

    // Preserve what the spreadsheet said before the first correction.
    const snapshotted = snapshotIfImported(log as unknown as Amendable, body.amendmentNote);

    applyFields(log, body, EDITABLE);

    if (body.date !== undefined) {
      const d = new Date(`${String(body.date).slice(0, 10)}T00:00:00.000Z`);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'date is not a valid date' }, { status: 400 });
      }
      log.date = d;
    }

    // Denormalised names must follow the ids they describe.
    if (body.driverId !== undefined && Types.ObjectId.isValid(String(body.driverId))) {
      const driver = await Driver.findById(body.driverId).select('name').lean<{ name: string }>();
      if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
      log.driverName = driver.name;
    }

    if (body.vehicleId !== undefined) {
      if (body.vehicleId === null || body.vehicleId === '') {
        log.vehicleId = null;
        log.vehicleCode = '';
        log.vehiclePlate = '';
      } else {
        const v = await Vehicle.findById(body.vehicleId)
          .select('plate shortCode')
          .lean<{ _id: Types.ObjectId; plate: string; shortCode: string }>();
        if (!v) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        log.vehicleId = v._id;
        log.vehicleCode = v.shortCode ?? '';
        log.vehiclePlate = v.plate ?? '';
      }
    }

    log.amount = Math.max(Number(log.amount) || 0, 0);
    log.quantity = Math.max(Number(log.quantity) || 0, 0);

    const derived = await recomputeMileage(
      auth.companyId,
      log.vehicleId as Types.ObjectId | null,
      log.date,
      log.meterReading == null ? null : Number(log.meterReading),
      log.quantity,
      log._id as Types.ObjectId,
    );
    log.kmSinceLast = derived.kmSinceLast;
    log.mileage = derived.mileage;

    await log.save();

    /*
     * Move the spend between vehicles rather than recomputing either total.
     * If the fill was reassigned, the old vehicle must give the money back.
     */
    const nowVehicleId = log.vehicleId ? String(log.vehicleId) : null;
    const nowAmount = Number(log.amount) || 0;

    if (previousVehicleId && previousVehicleId !== nowVehicleId) {
      await Vehicle.updateOne({ _id: previousVehicleId }, { $inc: { totalFuelCost: -previousAmount } });
      if (nowVehicleId) {
        await Vehicle.updateOne({ _id: nowVehicleId }, { $inc: { totalFuelCost: nowAmount } });
      }
    } else if (nowVehicleId && nowAmount !== previousAmount) {
      await Vehicle.updateOne(
        { _id: nowVehicleId },
        { $inc: { totalFuelCost: nowAmount - previousAmount } },
      );
    } else if (!previousVehicleId && nowVehicleId) {
      await Vehicle.updateOne({ _id: nowVehicleId }, { $inc: { totalFuelCost: nowAmount } });
    }

    return NextResponse.json({ ...log.toObject(), originalPreserved: snapshotted });
  } catch (err) {
    console.error('PATCH /api/fuel/[id] failed:', err);
    return NextResponse.json({ error: 'Failed to update the fuel entry' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    const { id } = await ctx.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await connectDB();
    const log = await FuelLog.findOneAndDelete({ _id: id, companyId: auth.companyId });
    if (!log) return NextResponse.json({ error: 'Fuel entry not found' }, { status: 404 });

    if (log.vehicleId && log.amount) {
      await Vehicle.updateOne({ _id: log.vehicleId }, { $inc: { totalFuelCost: -log.amount } });
    }

    return NextResponse.json({ ok: true, deleted: id });
  } catch (err) {
    console.error('DELETE /api/fuel/[id] failed:', err);
    return NextResponse.json({ error: 'Failed to delete the fuel entry' }, { status: 500 });
  }
}
