import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireDriver, unauthorized } from '@/lib/driverAuth';
import Trip from '@/models/Trip';
import Driver from '@/models/Driver';
import { findOrCreateCustomer, resolveCompanyId } from '@/lib/tenant';
import { OdometerError } from '@/lib/odometer';
import { NO_VEHICLE_MESSAGE, resolveDriverVehicle } from '@/lib/driverVehicle';

/**
 * POST /api/driver/offline-trip
 *   { customerName, customerPhone, pickup, dropoff, startOdometer,
 *     tripKind?, riderTier?, lat?, lng? }
 *
 * Books a ride that came in off-app — a street hail or a phone call — so it
 * lands in billing instead of staying cash-in-pocket.
 *
 * This creates the trip ALREADY RUNNING, with the opening meter reading taken
 * now. It is deliberately not a single form filled in afterwards: entering both
 * readings at the end would let a driver type any two numbers with no GPS trail
 * to contradict them. By opening the trip at pickup, the phone starts building
 * the same distance trail that /trips/[id]/complete cross-checks against, so an
 * offline ride is held to exactly the same standard as a dispatched one.
 *
 * The driver closes it through the normal complete endpoint.
 */

export const dynamic = 'force-dynamic';

const PHONE_RE = /^[6-9]\d{9}$/;

export async function POST(req: NextRequest) {
  const driver = await requireDriver(req);
  if (!driver) return unauthorized();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 });
  }

  const customerName = String(body?.customerName ?? '').trim();
  const customerPhone = String(body?.customerPhone ?? '').replace(/\s+/g, '');
  const pickup = String(body?.pickup ?? '').trim();
  const dropoff = String(body?.dropoff ?? '').trim();
  const startOdometer = Number(body?.startOdometer);

  if (!customerName) {
    return NextResponse.json({ success: false, error: 'Customer name is required' }, { status: 400 });
  }
  if (!PHONE_RE.test(customerPhone)) {
    return NextResponse.json({ success: false, error: 'Enter a valid 10-digit mobile number' }, { status: 400 });
  }
  if (!pickup || !dropoff) {
    return NextResponse.json({ success: false, error: 'Pickup and drop are required' }, { status: 400 });
  }

  try {
    if (!Number.isFinite(startOdometer) || startOdometer < 0) {
      throw new OdometerError('Enter the current odometer reading.');
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 400 });
  }

  // A driver already on a ride cannot open another — same rule as dispatch.
  const busy = await Trip.findOne({
    'driver.driverId': driver._id,
    status: { $in: ['accepted', 'ongoing'] },
  }).lean();

  if (busy) {
    return NextResponse.json(
      { success: false, error: 'Finish your current trip before starting an offline ride' },
      { status: 409 },
    );
  }

  // The pre-save dispatch guard requires full vehicle details on a running trip.
  const vehicle = await resolveDriverVehicle(driver);
  if (!vehicle) {
    return NextResponse.json({ success: false, error: NO_VEHICLE_MESSAGE }, { status: 400 });
  }

  try {
    await connectDB();
    const companyId = await resolveCompanyId();
    const customer = await findOrCreateCustomer({ name: customerName, phone: customerPhone, companyId });

    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const hasFix = Number.isFinite(lat) && Number.isFinite(lng);
    const now = new Date();

    const trip = await Trip.create({
      companyId,
      source: 'offline',
      status: 'ongoing',
      customer: { id: customer._id, name: customer.name, phone: customer.phone },
      driver: { driverId: driver._id, name: driver.name, phone: driver.phone },
      vehicle: { vehicleId: vehicle.vehicleId, plate: vehicle.plate, model: vehicle.model },
      route: {
        pickup,
        dropoff,
        ...(hasFix ? { pickupPoint: { type: 'Point', coordinates: [lng, lat] } } : {}),
      },
      timing: {
        tripDate: now,
        startTime: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      },
      odometer: {
        start: startOdometer,
        startAt: now,
        ...(hasFix ? { startPoint: { type: 'Point', coordinates: [lng, lat] } } : {}),
      },
      tracking: { gpsKm: 0, pingCount: 0, lastPingAt: null },
      pricing: {
        tripKind: body?.tripKind ?? 'city_one_way',
        riderTier: ['public', 'member', 'official'].includes(body?.riderTier) ? body.riderTier : 'public',
        estimatedFare: 0,
      },
      // Required by the schema; replaced with the real figure at completion.
      charges: { totalFare: 0 },
      payment: { method: 'cash', status: 'pending' },
      notes: 'Offline ride entered by driver',
    });

    await Driver.updateOne({ _id: driver._id }, { $set: { status: 'on-trip' } });

    if (!hasFix) {
      console.warn(`[odometer] offline trip ${trip._id} opened without a GPS fix`);
    }

    return NextResponse.json({
      success: true,
      trip: {
        id: String(trip._id),
        tripNumber: trip.tripNumber,
        status: trip.status,
        startOdometer,
        customerName: customer.name,
        customerPhone: customer.phone,
        pickup,
        dropoff,
      },
    });
  } catch (e: any) {
    console.error('offline trip error', e);
    return NextResponse.json(
      { success: false, error: e?.message ?? 'Could not start the offline ride' },
      { status: 500 },
    );
  }
}
