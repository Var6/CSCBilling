import { NextRequest, NextResponse } from 'next/server';
import Driver from '@/models/Driver';
import { connectDB } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const drivers = await Driver.find().sort({ createdAt: -1 });
    return NextResponse.json(drivers);
  } catch (err) {
    console.error('Error fetching drivers:', err);
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.name || !body.phone || !body.email || !body.license) {
      return NextResponse.json(
        { error: 'Missing required fields: name, phone, email, license' },
        { status: 400 }
      );
    }

    const driver = await Driver.create({
      name: body.name,
      phone: body.phone,
      email: body.email,
      license: body.license,
      vehicle: body.vehicle || null,
      address: body.address || '',
      bloodGroup: body.bloodGroup || '',
      emergencyContact: body.emergencyContact || '',
      status: body.status || 'offline',
      joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
      rating: body.rating || 0,
      trips: body.trips || 0,
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (err: any) {
    console.error('Error creating driver:', err);
    return NextResponse.json(
      { error: 'Failed to create driver', details: err.message },
      { status: 500 }
    );
  }
}