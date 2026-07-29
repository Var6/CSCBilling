import { NextResponse } from 'next/server';
import { requireDriver, unauthorized } from '@/lib/driverAuth';
import { offersForDriver, sweepExpiredOffers } from '@/lib/dispatch';

/**
 * GET /api/driver/offers?lat=&lng=
 *
 * Ride requests this driver may currently accept, nearest first.
 *
 * Sweeping expired offer windows happens here rather than on a schedule: every
 * poll first promotes any trip whose exclusivity has lapsed to the next, wider
 * wave. That is what makes "nearest driver first" work on serverless with no
 * cron or worker — the polling traffic is the clock.
 */

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const driver = await requireDriver(req);
  if (!driver) return unauthorized();

  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));

  // Fall back to the last stored position so a momentary GPS gap does not
  // empty the driver's offer list.
  const stored = driver.location?.coordinates as [number, number] | undefined;
  const at = Number.isFinite(lat) && Number.isFinite(lng)
    ? { lat, lng }
    : stored && stored.length === 2
      ? { lat: stored[1], lng: stored[0] }
      : null;

  if (!at) {
    return NextResponse.json(
      { success: false, error: 'Location required — turn on GPS to receive rides', offers: [] },
      { status: 400 },
    );
  }

  if (!driver.onDuty) {
    return NextResponse.json({ success: true, offers: [], offDuty: true });
  }

  await sweepExpiredOffers();

  const raw = await offersForDriver(String(driver._id), at);

  const offers = raw.map(({ trip, distanceKm }) => ({
    id: String(trip._id),
    tripNumber: trip.tripNumber ?? null,
    // Customer phone is withheld until the driver accepts — no reason to hand
    // a contact list to every driver who happens to be in range.
    customerName: trip.customer?.name ?? 'Customer',
    pickup: trip.route?.pickup ?? '',
    dropoff: trip.route?.dropoff ?? '',
    pickupLat: trip.route?.pickupPoint?.coordinates?.[1] ?? null,
    pickupLng: trip.route?.pickupPoint?.coordinates?.[0] ?? null,
    estimatedKm: trip.route?.estimatedKm ?? 0,
    estimatedFare: trip.pricing?.estimatedFare ?? trip.charges?.totalFare ?? 0,
    tripKind: trip.pricing?.tripKind ?? null,
    scheduledAt: trip.timing?.tripDate ?? null,
    distanceToPickupKm: Number(distanceKm.toFixed(1)),
    expiresAt: trip.dispatch?.offerExpiresAt ?? null,
    /** True while this driver is inside the exclusive wave. */
    exclusive: (trip.dispatch?.offeredTo ?? []).map(String).includes(String(driver._id)),
  }));

  return NextResponse.json({ success: true, offers });
}
