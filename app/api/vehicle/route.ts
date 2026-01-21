import { NextRequest, NextResponse } from 'next/server';
import Vehicle from '@/models/Vehicle';
import { connectDB } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    return NextResponse.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const requiredFields = [
      'name',
      'plate',
      'model',
      'year',
      'status',
      'rcNumber',
      'insuranceExpiry',
      'pollutionExpiry',
      'fitnessExpiry',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // 🔒 Prevent duplicate plate or RC
    const existing = await Vehicle.findOne({
      $or: [{ plate: body.plate }, { rcNumber: body.rcNumber }],
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Vehicle with same plate or RC already exists' },
        { status: 409 }
      );
    }

    const vehicle = await Vehicle.create({
      name: body.name,
      plate: body.plate,
      model: body.model,
      year: Number(body.year),
      status: body.status,
      color: body.color || '',
      fuelType: body.fuelType || '',
      mileage: body.mileage || '0 km',

      insurance: body.insurance || '',
      insuranceExpiry: new Date(body.insuranceExpiry),

      pollution: body.pollution || '',
      pollutionExpiry: new Date(body.pollutionExpiry),

      fitness: body.fitness || '',
      fitnessExpiry: new Date(body.fitnessExpiry),

      rcNumber: body.rcNumber,

      assignedDriverId: body.assignedDriverId || null,
      assignedDriverName: body.assignedDriverName || null,

      totalEarnings: Number(body.totalEarnings || 0),
      monthlyEarnings: Number(body.monthlyEarnings || 0),
      totalTrips: Number(body.totalTrips || 0),

      maintenanceRecords: body.maintenanceRecords || [],
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle', details: error.message },
      { status: 500 }
    );
  }
}
