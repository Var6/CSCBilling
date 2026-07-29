/**
 * Odometer integrity.
 *
 * The billable distance is the vehicle meter reading, per the fare circular.
 * That reading is typed in by the driver, so on its own it is an honour system.
 * This module makes a false reading *visible* rather than trying to prevent it.
 *
 * Three independent controls:
 *
 *  1. IMMUTABILITY — the server writes odometer.start once and refuses to
 *     overwrite it. Same for the end reading. A driver cannot start a trip,
 *     see the fare, and go back to adjust the opening number.
 *
 *  2. GPS CROSS-CHECK — while a trip is running the app posts its position and
 *     the server accumulates real travelled distance. At close we compare that
 *     against the odometer delta. Padding the meter by 30 km shows up as a
 *     +30 km variance against a GPS trail that never went there.
 *
 *  3. TRAIL QUALITY — the obvious counter-move is to kill the app so there is
 *     no GPS to contradict you. So a trip that closes with too few pings for
 *     its duration is flagged too. Silence is treated as evidence, not as an
 *     absence of it.
 *
 * Nothing here blocks the driver mid-shift except physically impossible input
 * (end <= start, absurd jumps). Everything else raises a flag for ops review,
 * because a wrongly-blocked completion strands a paying customer.
 */

export interface IntegrityInput {
  startOdometer: number;
  endOdometer: number;
  /** Server-accumulated GPS distance for this trip, km. */
  gpsKm: number;
  /** How many position pings the app delivered. */
  pingCount: number;
  /** Trip duration in minutes, from odometer start to end. */
  durationMin: number;
}

export interface IntegrityResult {
  odometerKm: number;
  gpsKm: number;
  /** Signed %. Positive means the meter claims more than the phone travelled. */
  variancePct: number;
  flagged: boolean;
  flagReasons: string[];
}

/** Meter may read this much over GPS before we care (tunnels, urban canyons). */
export const VARIANCE_TOLERANCE_PCT = 20;
/** Small absolute gaps are noise, not fraud — ignore below this. */
export const VARIANCE_TOLERANCE_KM = 5;
/** A single trip longer than this is a typo until proven otherwise. */
export const MAX_PLAUSIBLE_TRIP_KM = 1500;
/** Expect roughly one ping a minute; below this share the trail is too thin. */
export const MIN_PING_RATIO = 0.3;

export class OdometerError extends Error {}

/** Physically impossible readings. Throwing here rejects the request outright. */
export function assertReadable(startOdometer: number, endOdometer: number) {
  if (!Number.isFinite(startOdometer) || startOdometer < 0) {
    throw new OdometerError('Start odometer reading is not valid.');
  }
  if (!Number.isFinite(endOdometer) || endOdometer < 0) {
    throw new OdometerError('End odometer reading is not valid.');
  }
  if (endOdometer < startOdometer) {
    throw new OdometerError('End odometer cannot be less than the start reading.');
  }
  if (endOdometer === startOdometer) {
    throw new OdometerError('End odometer is the same as the start — the vehicle did not move.');
  }
  if (endOdometer - startOdometer > MAX_PLAUSIBLE_TRIP_KM) {
    throw new OdometerError(
      `That is ${Math.round(endOdometer - startOdometer)} km in one trip. Please re-check the reading.`,
    );
  }
}

export function assessIntegrity(input: IntegrityInput): IntegrityResult {
  const { startOdometer, endOdometer, gpsKm, pingCount, durationMin } = input;

  const odometerKm = Math.max(0, endOdometer - startOdometer);
  const reasons: string[] = [];

  // Compare against the larger of GPS or 1 km so short trips don't divide by ~0.
  const basis = Math.max(gpsKm, 1);
  const variancePct = ((odometerKm - gpsKm) / basis) * 100;
  const absDiffKm = Math.abs(odometerKm - gpsKm);

  if (absDiffKm > VARIANCE_TOLERANCE_KM && Math.abs(variancePct) > VARIANCE_TOLERANCE_PCT) {
    reasons.push(
      variancePct > 0
        ? `Meter reads ${odometerKm.toFixed(1)} km but GPS tracked ${gpsKm.toFixed(1)} km (+${variancePct.toFixed(0)}%).`
        : `Meter reads ${odometerKm.toFixed(1)} km but GPS tracked ${gpsKm.toFixed(1)} km (${variancePct.toFixed(0)}%).`,
    );
  }

  // Thin or absent trail — the app was closed, or location was denied.
  const expectedPings = Math.max(1, durationMin);
  if (pingCount === 0) {
    reasons.push('No GPS trail was recorded for this trip.');
  } else if (pingCount / expectedPings < MIN_PING_RATIO) {
    reasons.push(
      `Sparse GPS trail — ${pingCount} pings over ${Math.round(durationMin)} min.`,
    );
  }

  // Meter moved a long way in impossibly little time.
  if (durationMin > 0) {
    const kmh = odometerKm / (durationMin / 60);
    if (kmh > 120) {
      reasons.push(`Implied average speed ${Math.round(kmh)} km/h over the whole trip.`);
    }
  }

  return {
    odometerKm: Number(odometerKm.toFixed(1)),
    gpsKm: Number(gpsKm.toFixed(1)),
    variancePct: Number(variancePct.toFixed(1)),
    flagged: reasons.length > 0,
    flagReasons: reasons,
  };
}

/**
 * Distance between two consecutive GPS pings, with a jitter floor.
 *
 * A phone sitting still still reports positions that wander by a few metres.
 * Accumulated over a long trip that phantom movement would inflate gpsKm and
 * make honest drivers look like they under-reported, so anything under 15 m is
 * discarded. Jumps over 5 km between pings are dropped too — that is a tower
 * relocation or a resumed-from-background fix, not driving.
 */
export function pingDeltaKm(
  prev: { lat: number; lng: number },
  next: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((next.lat - prev.lat) * Math.PI) / 180;
  const dLng = ((next.lng - prev.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((prev.lat * Math.PI) / 180) * Math.cos((next.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(s));

  if (km < 0.015) return 0;
  if (km > 5) return 0;
  return km;
}
