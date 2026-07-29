/**
 * Ride dispatch — nearest driver first.
 *
 * A booking is not broadcast to everyone at once. It is offered in expanding
 * waves, so the closest drivers get an exclusive look before anyone further
 * out sees it:
 *
 *   wave 0   nearest 3 drivers within 3 km    exclusive for 20s
 *   wave 1   nearest 5 drivers within 7 km    exclusive for 20s
 *   wave 2   nearest 8 drivers within 15 km   exclusive for 30s
 *   wave 3+  any on-duty driver within 25 km  no exclusivity
 *
 * Waves advance lazily: there is no scheduler. Whenever a driver polls for
 * offers, any trip whose offer window has expired is promoted to the next wave
 * first. That keeps the whole thing running on ordinary request traffic with
 * no cron, queue, or websocket to operate — which matters because this deploys
 * to Vercel serverless where background timers do not survive.
 *
 * Consequence worth knowing: if no driver is polling, waves do not advance. In
 * practice the app polls every few seconds while on duty, so the only case
 * where a trip sits still is when nobody is on duty at all — in which case
 * widening the radius would not have helped either.
 */

import { Types } from 'mongoose';
import Driver from '@/models/Driver';
import Trip from '@/models/Trip';

export interface Wave {
  radiusKm: number;
  maxDrivers: number;
  holdSeconds: number;
}

export const WAVES: Wave[] = [
  { radiusKm: 3, maxDrivers: 3, holdSeconds: 20 },
  { radiusKm: 7, maxDrivers: 5, holdSeconds: 20 },
  { radiusKm: 15, maxDrivers: 8, holdSeconds: 30 },
  { radiusKm: 25, maxDrivers: 25, holdSeconds: 60 },
];

/** Beyond this a "live" position is stale and the driver is not dispatchable. */
export const LOCATION_STALE_MS = 2 * 60 * 1000;

/** Trips older than this stop auto-dispatching — ops takes over. */
export const OFFER_GIVE_UP_MS = 10 * 60 * 1000;

export const EARTH_RADIUS_KM = 6371;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s));
}

/**
 * On-duty drivers near a pickup, nearest first.
 * Excludes anyone already on a trip, anyone stale, and anyone who declined.
 */
export async function nearestDrivers(
  pickup: { lat: number; lng: number },
  radiusKm: number,
  limit: number,
  excludeIds: string[] = [],
) {
  const freshSince = new Date(Date.now() - LOCATION_STALE_MS);

  return Driver.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [pickup.lng, pickup.lat] },
        distanceField: 'distanceMeters',
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: {
          onDuty: true,
          status: { $ne: 'on-trip' },
          // Drivers who have left keep their history but must never be
          // dispatched. Older rows predate the flag, so absent counts as active.
          active: { $ne: false },
          locationUpdatedAt: { $gte: freshSince },
          ...(excludeIds.length
            ? { _id: { $nin: excludeIds.map((id) => new Types.ObjectId(id)) } }
            : {}),
        },
      },
    },
    { $limit: limit },
    { $project: { _id: 1, name: 1, phone: 1, distanceMeters: 1 } },
  ]);
}

/**
 * Advances one trip to its next wave and records who it is offered to.
 * Returns the driver ids in the new wave.
 */
export async function advanceWave(trip: any): Promise<string[]> {
  const coords = trip.route?.pickupPoint?.coordinates;
  if (!coords || coords.length !== 2) return [];

  const pickup = { lng: coords[0], lat: coords[1] };
  const currentWave: number = trip.dispatch?.offerWave ?? 0;
  const wave = WAVES[Math.min(currentWave, WAVES.length - 1)];

  const declined: string[] = (trip.dispatch?.declinedBy ?? []).map(String);
  const drivers = await nearestDrivers(pickup, wave.radiusKm, wave.maxDrivers, declined);

  const ids = drivers.map((d: any) => String(d._id));

  await Trip.updateOne(
    { _id: trip._id },
    {
      $set: {
        'dispatch.offeredTo': ids,
        'dispatch.offerWave': Math.min(currentWave + 1, WAVES.length),
        'dispatch.offerExpiresAt': new Date(Date.now() + wave.holdSeconds * 1000),
      },
    },
  );

  return ids;
}

/**
 * Promotes every pending trip whose offer window has lapsed.
 *
 * Called at the top of the driver offers poll — this is what makes waves
 * advance without a scheduler. Cheap: it only touches trips that are both
 * pending and expired.
 */
export async function sweepExpiredOffers(): Promise<number> {
  const now = new Date();
  const stale = await Trip.find({
    status: 'pending',
    'route.pickupPoint.coordinates': { $exists: true },
    createdAt: { $gte: new Date(Date.now() - OFFER_GIVE_UP_MS) },
    $or: [
      { 'dispatch.offerExpiresAt': null },
      { 'dispatch.offerExpiresAt': { $lte: now } },
    ],
  })
    .limit(25)
    .lean();

  for (const trip of stale) await advanceWave(trip);
  return stale.length;
}

/**
 * Trips this driver may currently see, nearest first.
 *
 * A trip is visible if the driver is in its current offer wave, OR the trip has
 * exhausted every wave (at which point it is open to anyone in range).
 */
export async function offersForDriver(
  driverId: string,
  at: { lat: number; lng: number },
  radiusKm = WAVES[WAVES.length - 1].radiusKm,
) {
  const trips = await Trip.find({
    status: 'pending',
    'driver.driverId': { $exists: false },
    'route.pickupPoint.coordinates': { $exists: true },
    'dispatch.declinedBy': { $ne: driverId },
    $or: [
      { 'dispatch.offeredTo': driverId },
      { 'dispatch.offerWave': { $gte: WAVES.length } },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(20)
    .lean();

  return trips
    .map((t: any) => {
      const c = t.route.pickupPoint.coordinates;
      const distanceKm = haversineKm(at, { lng: c[0], lat: c[1] });
      return { trip: t, distanceKm };
    })
    .filter((o) => o.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
