import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Vehicle from '@/models/Vehicle';
import { connectDB } from '@/lib/mongodb';

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
    const body = await req.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    );

    if (!updatedVehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json(updatedVehicle);
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
