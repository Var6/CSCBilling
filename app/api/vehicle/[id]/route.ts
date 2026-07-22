import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Vehicle from '@/models/Vehicle';
import { connectDB } from '@/lib/mongodb';
import { applyFields } from '@/lib/amend';

export const dynamic = 'force-dynamic';

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: Context) {
  try {
    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const vehicle = await Vehicle.findById(id).lean();

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

    /*
     * Explicit whitelist. This route previously did `$set: body`, so any signed-in
     * caller could post `companyId` to move a vehicle into another tenant, or
     * overwrite the derived totals (totalFuelCost, totalRepairCost, avgMileage)
     * that the fuel and repair routes maintain.
     */
    const EDITABLE = [
      'name', 'plate', 'model', 'company', 'year', 'status', 'color', 'fuelType',
      'mileage', 'shortCode',
      'insurance', 'pollution', 'fitness', 'rcNumber',
      'currentOdometer',
      'assignedDriverId', 'assignedDriverName',
      'maintenanceRecords',
    ] as const;

    const changed = applyFields(vehicle, body, EDITABLE);

    // Expiries are nullable: clearing one is a legitimate edit, and an invalid
    // string must be rejected rather than stored as an Invalid Date.
    for (const field of ['insuranceExpiry', 'pollutionExpiry', 'fitnessExpiry'] as const) {
      if (body[field] === undefined) continue;
      const d = body[field] ? new Date(body[field]) : null;
      if (d && Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: `${field} is not a valid date` }, { status: 400 });
      }
      vehicle.set(field, d);
      changed.push(field);
    }

    // The books identify a car by the last four of the plate. Keep the two in
    // step so a corrected plate does not orphan the vehicle from its fuel log.
    if (typeof body.plate === 'string' && body.shortCode === undefined) {
      const last4 = body.plate.replace(/[^0-9]/g, '').slice(-4);
      if (last4.length === 4) vehicle.set('shortCode', last4);
    }

    await vehicle.save({ validateModifiedOnly: true });
    return NextResponse.json({ ...vehicle.toObject(), changed });
  } catch (error: any) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  try {
    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // 🔒 Safety: prevent deleting assigned vehicle
    if (vehicle.assignedDriverId) {
      return NextResponse.json(
        { error: 'Unassign driver before deleting vehicle' },
        { status: 400 }
      );
    }

    await vehicle.deleteOne();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 });
  }
}
