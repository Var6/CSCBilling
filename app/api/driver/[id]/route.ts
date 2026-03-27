import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Driver from '@/models/Driver';
import { connectDB } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  req: NextRequest,
  context: Context
) {
  try {
    await connectDB();

    // ✅ THIS IS THE FIX
    const { id } = await context.params;

    console.log('🔥 API DRIVER ID:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const driver = await Driver.findById(id).lean();

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(driver);
  } catch (error) {
    console.error('API DRIVER ERROR:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const body = await req.json();
    const updated = await Driver.findByIdAndUpdate(
      id,
      {
        $set: {
          name: body.name,
          phone: body.phone,
          email: body.email,
          license: body.license,
          vehicle: body.vehicle ?? null,
          address: body.address ?? '',
          bloodGroup: body.bloodGroup ?? '',
          emergencyContact: body.emergencyContact ?? '',
          status: body.status,
          joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
          rating: body.rating ?? 0,
          trips: body.trips ?? 0,
          baseSalary: body.baseSalary ?? 0,
          perKmRate: body.perKmRate ?? 0,
        },
      },
      { new: true }
    );
    if (!updated) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/driver/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    await Driver.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/driver/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
