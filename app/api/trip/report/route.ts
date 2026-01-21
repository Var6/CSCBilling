
// ============================================
// 2. API ROUTE (app/api/invoice/[tripId]/route.ts)
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Trip from '@/models/Trip';

// Database connection utility
async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  return mongoose.connect(process.env.MONGODB_URI!);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    await connectDB();
    
    const { tripId } = await params;
    
    const trip = await Trip.findOne({ tripId })
      .populate('driver.driverId')
      .populate('vehicle.vehicleId');

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Transform trip data to invoice format
    const invoiceData = {
      invoiceNo: trip.tripId,
      date: trip.tripDate,
      customerName: trip.customer.name,
      customerPhone: trip.customer.phone,
      tripType: 'One Way', // You can add this field to your schema
      pickup: trip.route.pickup,
      dropoff: trip.route.dropoff,
      distanceKm: 10, // Calculate from route or add to schema
      ratePerKm: 20, // Get from your pricing logic
      timeMinutes: 0,
      ratePerMinute: 0,
      standbyMinutes: 0,
      discount: 10,
      gstRate: 5,
      upiPaid: trip.fare * 0.75, // 75% of total if partially paid
      vehicle: `${trip.vehicle.model} - ${trip.vehicle.number}`,
      driverName: trip.driver.name,
      notes: [
        'Stand-by charges of Rs. 2 per minute will apply after 15min.',
        'Thank you for choosing CSC Travels Services!'
      ]
    };

    return NextResponse.json(invoiceData);
  } catch (error) {
    console.error('Invoice generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
