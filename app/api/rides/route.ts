import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import Trip from '@/models/Trip';
import { requireSession } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * Rides booked by customers — through the csctravels.com website or the
 * customer app.
 *
 * This route used to read a Supabase `bookings` table. That was the old
 * system: the env vars for it were never set here, so the page answered 500
 * on every load — and even configured it would have shown nothing, because
 * the website and app write bookings to the shared Mongo database as Trip
 * documents (source 'web' or 'app'), not to Supabase.
 *
 * The response keeps the field names the Rides page already renders, so the
 * fix lives entirely on this side.
 */

/** Trip statuses collapsed to the four the page knows. */
const TO_PAGE_STATUS: Record<string, string> = {
  pending: 'pending',
  accepted: 'confirmed',
  ongoing: 'confirmed',
  completed: 'completed',
  cancelled: 'cancelled',
};

/** And back again for PATCH. */
const FROM_PAGE_STATUS: Record<string, string> = {
  pending: 'pending',
  confirmed: 'accepted',
  completed: 'completed',
  cancelled: 'cancelled',
};

export async function GET(req: NextRequest) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    await connectDB();
    const p = new URL(req.url).searchParams;

    const filter: Record<string, unknown> = {
      companyId: auth.companyId,
      // Customer-originated only. Staff-entered trips and imported offline
      // invoices have their own screens.
      source: { $in: ['web', 'app'] },
    };

    const status = p.get('status');
    if (status && FROM_PAGE_STATUS[status]) {
      filter.status = status === 'confirmed'
        ? { $in: ['accepted', 'ongoing'] }
        : FROM_PAGE_STATUS[status];
    }

    // "Scheduled" on this screen means booked but not yet running.
    if (p.get('scheduled') === '1') {
      filter.status = { $in: ['pending', 'accepted'] };
    }

    const docs = await Trip.find(filter)
      .sort({ 'timing.tripDate': 1, createdAt: 1 })
      .limit(200)
      .lean<Array<Record<string, any>>>();

    const rides = docs.map((t) => ({
      id: String(t._id),
      customer_name: t.customer?.name ?? '—',
      phone: t.customer?.phone ?? '',
      email: null,
      pickup: t.route?.pickup ?? '',
      drop_location: t.route?.dropoff ?? '',
      pickup_at: t.timing?.tripDate ?? t.createdAt,
      vehicle_type: t.pricing?.tripKind ?? 'car',
      trip_type: t.source === 'web' ? 'website' : 'app',
      passengers: 1,
      status: TO_PAGE_STATUS[t.status] ?? 'pending',
      is_scheduled: t.status === 'pending' || t.status === 'accepted',
      driver_id: t.driver?.driverId ? String(t.driver.driverId) : null,
      distance_km: t.distanceKm ?? t.odometer?.totalKm ?? t.route?.estimatedKm ?? null,
      final_fare: t.charges?.totalFare ?? null,
      estimated_fare: t.pricing?.estimatedFare ?? null,
      created_at: t.createdAt,
    }));

    return NextResponse.json(rides);
  } catch (err) {
    console.error('GET /api/rides failed:', err);
    return NextResponse.json({ error: 'Failed to load rides' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    await connectDB();
    const body = await req.json();
    const { id, status } = body ?? {};

    if (!id || !Types.ObjectId.isValid(String(id))) {
      return NextResponse.json({ error: 'A valid ride id is required' }, { status: 400 });
    }
    const mapped = FROM_PAGE_STATUS[String(status)];
    if (!mapped) {
      return NextResponse.json(
        { error: `status must be one of: ${Object.keys(FROM_PAGE_STATUS).join(', ')}` },
        { status: 400 },
      );
    }

    /*
     * updateOne rather than save(): the pre-save guard demands a driver,
     * vehicle and odometer before a trip may be `completed`, which is right
     * for the dispatch flow but wrong here — staff closing out a website
     * booking that was fulfilled off-app have none of those to give.
     */
    const res = await Trip.updateOne(
      { _id: id, companyId: auth.companyId, source: { $in: ['web', 'app'] } },
      { $set: { status: mapped } },
    );
    if (res.matchedCount === 0) {
      return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error('PATCH /api/rides failed:', err);
    return NextResponse.json({ error: 'Failed to update the ride' }, { status: 500 });
  }
}
