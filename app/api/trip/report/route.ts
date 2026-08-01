import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Trip from '@/models/Trip';
import { requireSession } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * Trip report — the flattened rows the report table renders.
 *
 * This used to return raw Trip documents while the page rendered `trip.fare`,
 * `trip.pickup` and `trip.date` — fields that only exist nested under
 * `charges`, `route` and `timing`. Every cell was undefined, and
 * `trip.fare.toLocaleString()` threw, taking the whole report down with a
 * client-side exception. It also ignored every filter the page sent.
 *
 * The flattening now happens here, server-side, in one place — and the
 * search/status/driver/date filters actually filter.
 */

type Flat = {
  _id: string;
  tripId: string;
  customer: { name: string; phone: string };
  driver: { name: string } | null;
  vehicle: { model: string; number: string } | null;
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  status: string;
  fare: number;
  source: string;
};

export async function GET(req: NextRequest) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    await connectDB();
    const p = new URL(req.url).searchParams;

    const page = Math.max(Number(p.get('page')) || 1, 1);
    const limit = Math.min(Math.max(Number(p.get('limit')) || 10, 1), 100);

    const filter: Record<string, unknown> = { companyId: auth.companyId };

    const status = p.get('status');
    if (status && status !== 'all') filter.status = status;

    const driver = p.get('driver');
    if (driver && driver !== 'all') filter['driver.name'] = driver;

    const date = p.get('date');
    if (date && !Number.isNaN(Date.parse(date))) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      filter['timing.tripDate'] = { $gte: start, $lt: end };
    }

    const search = p.get('search')?.trim();
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { tripNumber: re },
        { 'customer.name': re },
        { 'customer.phone': re },
        { 'driver.name': re },
        { 'route.pickup': re },
        { 'route.dropoff': re },
      ];
    }

    const [total, docs] = await Promise.all([
      Trip.countDocuments(filter),
      Trip.find(filter)
        .sort({ 'timing.tripDate': -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<Array<Record<string, any>>>(),
    ]);

    /*
     * Tolerate incomplete documents: offline invoices imported from the paper
     * register carry no driver, vehicle or odometer at all, and a missing
     * sub-object must render as a blank cell, not crash the table.
     */
    const trips: Flat[] = docs.map((t) => ({
      _id: String(t._id),
      tripId: t.tripNumber ?? String(t._id).slice(-6),
      customer: {
        name: t.customer?.name ?? '—',
        phone: t.customer?.phone ?? '',
      },
      driver: t.driver?.name ? { name: t.driver.name } : null,
      vehicle: t.vehicle?.plate || t.vehicle?.model
        ? { model: t.vehicle?.model ?? '', number: t.vehicle?.plate ?? '' }
        : null,
      pickup: t.route?.pickup ?? '',
      dropoff: t.route?.dropoff ?? '',
      date: t.timing?.tripDate
        ? new Date(t.timing.tripDate).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
          })
        : '',
      time: t.timing?.startTime && t.timing.startTime !== '00:00' ? t.timing.startTime : '',
      status: t.status ?? 'pending',
      fare: Number(t.charges?.totalFare) || 0,
      source: t.source ?? 'staff',
    }));

    // Distinct driver names across the whole collection, so the filter
    // dropdown is not limited to whoever appears on the current page.
    const driverNames = await Trip.distinct('driver.name', {
      companyId: auth.companyId,
      'driver.name': { $nin: [null, ''] },
    });

    return NextResponse.json({ trips, total, drivers: driverNames.sort() });
  } catch (error) {
    console.error('GET /api/trip/report failed:', error);
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
  }
}
