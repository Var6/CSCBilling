import { NextRequest, NextResponse } from 'next/server';
import Driver from '@/models/Driver';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    
    const driver = await Driver.findById(params.id);
    
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }
    
    return NextResponse.json(driver);
  } catch (err) {
    console.error('Error fetching driver:', err);
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
    
    const driver = await Driver.findByIdAndUpdate(
      params.id,
      {
        name: body.name,
        phone: body.phone,
        email: body.email,
        license: body.license,
        vehicle: body.vehicle || null,
        address: body.address || '',
        bloodGroup: body.bloodGroup || '',
        emergencyContact: body.emergencyContact || '',
        status: body.status || 'offline',
        joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
        rating: body.rating !== undefined ? Number(body.rating) : undefined,
        trips: body.trips !== undefined ? Number(body.trips) : undefined,
      },
      { new: true, runValidators: true }
    );
    
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }
    
    return NextResponse.json(driver);
  } catch (err: any) {
    console.error('Error updating driver:', err);
    return NextResponse.json(
      { error: 'Failed to update driver', details: err.message },
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
    
    const driver = await Driver.findByIdAndDelete(params.id);
    
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Driver deleted successfully' });
  } catch (err) {
    console.error('Error deleting driver:', err);
    return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 });
  }
}