import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getCustomer } from '@/lib/customerAuth';
import Customer from '@/models/Customer';
import Trip from '@/models/Trip';
import { resolveCompanyId } from '@/lib/tenant';
import { advanceWave } from '@/lib/dispatch';

/**
 * Customer ride bookings — the entry point into driver dispatch.
 *
 * POST creates a pending Trip carrying pickup coordinates, then immediately
 * runs the first dispatch wave so the nearest drivers see it without waiting
 * for a poll cycle. Everything after that is lib/dispatch.ts.
 *
 * A booking without pickup coordinates is still accepted — it just never
 * enters dispatch and has to be assigned by staff from the console. That is
 * the right failure mode: losing the ride would be worse than handling it
 * manually.
 */

export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  const auth = await getCustomer(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: CORS });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400, headers: CORS });
  }

  const pickup = body?.pickup ?? {};
  const dropoff = body?.dropoff ?? {};

  if (!pickup.address || !dropoff.address) {
    return NextResponse.json(
      { success: false, error: 'Pickup and drop are required' },
      { status: 400, headers: CORS },
    );
  }

  try {
    await connectDB();

    const customer = await Customer.findById(auth.customerId);
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: CORS });
    }

    const companyId = customer.companyId ?? (await resolveCompanyId());
    const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt) : new Date();

    const hasPickupFix = Number.isFinite(Number(pickup.lat)) && Number.isFinite(Number(pickup.lng));
    const hasDropFix = Number.isFinite(Number(dropoff.lat)) && Number.isFinite(Number(dropoff.lng));

    const trip = await Trip.create({
      companyId,
      source: 'app',
      status: 'pending',
      customer: { id: customer._id, name: customer.name, phone: customer.phone },
      route: {
        pickup: pickup.address,
        dropoff: dropoff.address,
        ...(hasPickupFix
          ? { pickupPoint: { type: 'Point', coordinates: [Number(pickup.lng), Number(pickup.lat)] } }
          : {}),
        ...(hasDropFix
          ? { dropPoint: { type: 'Point', coordinates: [Number(dropoff.lng), Number(dropoff.lat)] } }
          : {}),
        estimatedKm: Math.max(0, Number(body?.distanceKm) || 0),
      },
      timing: {
        tripDate: scheduledAt,
        startTime: scheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      },
      pricing: {
        tripKind: body?.tripKind ?? 'city_one_way',
        riderTier: ['public', 'member', 'official'].includes(body?.riderTier) ? body.riderTier : 'public',
        rateVersion: body?.rateVersion ?? null,
        estimatedFare: Math.max(0, Number(body?.fareEstimate) || 0),
      },
      // Placeholder until the driver closes the trip on the meter reading.
      charges: { totalFare: Math.max(0, Number(body?.fareEstimate) || 0) },
      payment: { method: body?.paymentMode === 'upi' ? 'upi' : 'cash', status: 'pending' },
      // 4-digit handoff code so the driver can confirm the right rider.
      otp: String(Math.floor(1000 + Math.random() * 9000)),
      notes: body?.notes ?? '',
    });

    // Offer to the nearest drivers straight away rather than waiting for the
    // next poll to sweep it up.
    let offeredTo: string[] = [];
    if (hasPickupFix) {
      try {
        offeredTo = await advanceWave(trip);
      } catch (e) {
        // Dispatch failing must not lose the booking — staff can still assign.
        console.error('initial dispatch failed', e);
      }
    }

    await Customer.updateOne({ _id: customer._id }, { $inc: { totalRides: 1 }, $push: { trips: trip._id } });

    return NextResponse.json(
      {
        success: true,
        ride: {
          id: String(trip._id),
          tripNumber: trip.tripNumber,
          status: trip.status,
          otp: trip.otp,
          dispatchedTo: offeredTo.length,
        },
      },
      { headers: CORS },
    );
  } catch (e: any) {
    console.error('customer ride booking error', e);
    return NextResponse.json(
      { success: false, error: e?.message ?? 'Could not create the booking' },
      { status: 500, headers: CORS },
    );
  }
}

export async function GET(req: Request) {
  const auth = await getCustomer(req);
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: CORS });
  }

  await connectDB();

  const trips = await Trip.find({ 'customer.id': auth.customerId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json(
    {
      success: true,
      rides: trips.map((t: any) => ({
        _id: String(t._id),
        tripNumber: t.tripNumber ?? null,
        pickup: { address: t.route?.pickup ?? '' },
        dropoff: { address: t.route?.dropoff ?? '' },
        vehicleType: t.vehicle?.model ?? '',
        status: t.status,
        fare: t.charges?.totalFare ?? 0,
        distance: t.odometer?.totalKm ?? t.route?.estimatedKm ?? 0,
        otp: t.otp ?? null,
        paymentMode: t.payment?.method ?? null,
        paymentStatus: t.payment?.status ?? null,
        scheduledAt: t.timing?.tripDate ?? null,
        createdAt: t.createdAt,
        driver: t.driver?.name
          ? { name: t.driver.name, phone: t.driver.phone, vehicleNumber: t.vehicle?.plate ?? null }
          : null,
      })),
    },
    { headers: CORS },
  );
}
