import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Trip from '@/models/Trip';

export const dynamic = 'force-dynamic';

function mapTripToRide(trip: any) {
  const status = trip.status === 'ongoing' ? 'confirmed' : trip.status;

  return {
    id: trip._id?.toString() || trip.id?.toString(),
    customer_name: trip.customer?.name || 'Unknown',
    phone: trip.customer?.phone || '',
    email: null,
    pickup: trip.route?.pickup || '',
    drop_location: trip.route?.dropoff || '',
    pickup_at: trip.timing?.tripDate ? new Date(trip.timing.tripDate).toISOString() : new Date().toISOString(),
    vehicle_type: (trip.vehicle?.model || '').toLowerCase().includes('bus')
      ? 'bus'
      : (trip.vehicle?.model || '').toLowerCase().includes('traveler')
        ? 'traveler'
        : 'car',
    trip_type: trip.payment?.method || 'trip',
    passengers: 1,
    status,
    is_scheduled: Boolean(trip.timing?.tripDate),
    driver_id: trip.driver?.driverId?.toString() || null,
    distance_km: trip.odometer?.totalKm ?? null,
    final_fare: trip.charges?.totalFare ?? null,
    estimated_fare: trip.charges?.totalFare ?? null,
    created_at: trip.createdAt,
  };
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const onlyScheduled = searchParams.get('scheduled') === '1';
    const status = searchParams.get('status');

    const query: Record<string, any> = {};
    if (onlyScheduled) {
      query.status = { $in: ['pending', 'ongoing'] };
    }
    if (status) {
      query.status = status === 'pending' ? 'pending' : status === 'confirmed' ? 'ongoing' : status;
    }

    const trips = await Trip.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json(trips.map(mapTripToRide));
  } catch (error) {
    console.error('GET /api/rides error:', error);
    return NextResponse.json({ error: 'Failed to load rides' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, status } = body ?? {};

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const normalizedStatus = status === 'confirmed'
      ? 'ongoing'
      : status === 'completed'
        ? 'completed'
        : status === 'cancelled'
          ? 'cancelled'
          : 'pending';

    const trip = await Trip.findByIdAndUpdate(id, { status: normalizedStatus }, { new: true }).lean();

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json(mapTripToRide(trip));
  } catch (error) {
    console.error('PATCH /api/rides error:', error);
    return NextResponse.json({ error: 'Failed to update ride' }, { status: 500 });
  }
}
