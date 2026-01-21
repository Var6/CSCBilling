import { NextResponse } from 'next/server';
import {connectDB} from '@/lib/mongodb';
import Trip from '@/models/Trip';
import "@/models/Driver";
import "@/models/Vehicle";


export async function GET(
  req: Request,
  context: { params: Promise<{ tripId: string }> }
) {
  try {
    await connectDB();

    const { tripId } = await context.params; // ✅ unwrap params

    const trip = await Trip.findOne({ tripId })
      .populate('driver.driverId')
      .populate('vehicle.vehicleId');

    if (!trip) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(trip);
  } catch (error) {
    console.error('Invoice generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
