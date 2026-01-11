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
