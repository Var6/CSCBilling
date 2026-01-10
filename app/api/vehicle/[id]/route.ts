import { NextRequest, NextResponse } from 'next/server';
import Vehicle from '@/models/Vehicle';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    
    const vehicle = await Vehicle.findById(params.id);
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    
    return NextResponse.json(vehicle);
  } catch (err) {
    console.error('Error fetching vehicle:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    
    const body = await req.json();
    
    const updateData: any = {
      name: body.name,
      plate: body.plate,
      model: body.model,
      year: body.year,
      status: body.status,
      color: body.color || '',
      fuelType: body.fuelType || '',
      mileage: body.mileage || '0 km',
      insurance: body.insurance || '',
      pollution: body.pollution || '',
      fitness: body.fitness || '',
      rcNumber: body.rcNumber,
      assignedDriverId: body.assignedDriverId || null,
      assignedDriverName: body.assignedDriverName || null,
      totalEarnings: body.totalEarnings !== undefined ? Number(body.totalEarnings) : undefined,
      monthlyEarnings: body.monthlyEarnings !== undefined ? Number(body.monthlyEarnings) : undefined,
      totalTrips: body.totalTrips !== undefined ? Number(body.totalTrips) : undefined,
    };

    // Handle date fields
    if (body.insuranceExpiry) updateData.insuranceExpiry = new Date(body.insuranceExpiry);
    if (body.pollutionExpiry) updateData.pollutionExpiry = new Date(body.pollutionExpiry);
    if (body.fitnessExpiry) updateData.fitnessExpiry = new Date(body.fitnessExpiry);
    
    // Handle maintenance records if provided
    if (body.maintenanceRecords) {
      updateData.maintenanceRecords = body.maintenanceRecords;
    }
    
    const vehicle = await Vehicle.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    
    return NextResponse.json(vehicle);
  } catch (err: any) {
    console.error('Error updating vehicle:', err);
    return NextResponse.json(
      { error: 'Failed to update vehicle', details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    
    const vehicle = await Vehicle.findByIdAndDelete(params.id);
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error('Error deleting vehicle:', err);
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 });
  }
}