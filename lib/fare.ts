/**
 * Server-side fare calculation.
 *
 * Deliberately the same arithmetic as the mobile app's lib/fare.ts, driven by
 * the same RATE_CARD. The app's number is a quote; this one is the bill. They
 * must agree, so if you change one, change both — the shared input is
 * lib/rateCard.ts, which is what keeps them honest.
 *
 * Billing runs on the ACTUAL metered distance at trip close, which is why a
 * quote and a bill can differ legitimately: the quote used the routed estimate,
 * the bill uses the odometer.
 */

import { RATE_CARD, type RiderTier, type VehicleClass } from '@/lib/rateCard';

export type TripKind =
  | 'city_one_way'
  | 'city_round_trip'
  | 'outstation_one_way'
  | 'outstation_round_trip'
  | 'hourly';

export interface FareLine {
  label: string;
  detail?: string;
  amount: number;
}

export interface FareResult {
  baseLines: FareLine[];
  baseFare: number;
  discountPct: number;
  discountAmount: number;
  extraLines: FareLine[];
  extrasTotal: number;
  total: number;
  notes: string[];
}

export interface FareInput {
  /** Metered km actually driven. For round trips this is the FULL distance. */
  distanceKm: number;
  tripKind: TripKind;
  vehicle: VehicleClass;
  tier?: RiderTier;
  tollAmount?: number;
  parkingAmount?: number;
  nightStays?: number;
  hourlyPackageId?: string;
}

const round = (n: number) => Math.round(n);
const isOutstation = (t: TripKind) => t.startsWith('outstation');

export function computeFare(input: FareInput): FareResult {
  const {
    distanceKm,
    tripKind,
    vehicle,
    tier = 'public',
    tollAmount = 0,
    parkingAmount = 0,
    nightStays = 0,
    hourlyPackageId,
  } = input;

  const rates = RATE_CARD;
  const baseLines: FareLine[] = [];
  const extraLines: FareLine[] = [];
  const notes: string[] = [];

  if (tripKind === 'hourly') {
    const pkg = rates.hourly.find((p) => p.id === hourlyPackageId) ?? rates.hourly[0];
    const price = (pkg?.price as Record<string, number>)[vehicle];
    if (pkg && typeof price === 'number') {
      baseLines.push({ label: pkg.label, detail: `${pkg.hours} hours`, amount: price });
    } else {
      notes.push('No - package price configured for this vehicle class.');
    }
  } else if (isOutstation(tripKind)) {
    const perKm = (rates.outstation.perKm as Record<string, number>)[vehicle];
    if (typeof perKm === 'number') {
      baseLines.push({
        label: 'Outstation travel',
        detail: `${distanceKm.toFixed(1)} km × ₹${perKm}`,
        amount: distanceKm * perKm,
      });
    } else {
      notes.push(`No outstation rate configured for ${vehicle}.`);
    }
    if (nightStays > 0) {
      extraLines.push({
        label: 'Driver night stay',
        detail: `${nightStays} × ₹${rates.outstation.nightStayCharge}`,
        amount: nightStays * rates.outstation.nightStayCharge,
      });
    }
  } else if (tripKind === 'city_round_trip') {
    // Entire journey at the full per-km rate.
    baseLines.push({
      label: 'City round trip',
      detail: `${distanceKm.toFixed(1)} km × ₹${rates.city.perKm}`,
      amount: distanceKm * rates.city.perKm,
    });
  } else {
    // City one-way: metered distance at the full rate, plus the empty return
    // leg. The return leg is the same distance the vehicle just covered.
    baseLines.push({
      label: 'City ride',
      detail: `${distanceKm.toFixed(1)} km × ₹${rates.city.perKm}`,
      amount: distanceKm * rates.city.perKm,
    });
    baseLines.push({
      label: 'Return (empty vehicle)',
      detail: `${distanceKm.toFixed(1)} km × ₹${rates.city.returnEmptyPerKm}`,
      amount: distanceKm * rates.city.returnEmptyPerKm,
    });
  }

  let baseFare = round(baseLines.reduce((s, l) => s + l.amount, 0));

  if (!isOutstation(tripKind) && tripKind !== 'hourly' && baseFare > 0 && baseFare < rates.city.minFare) {
    baseFare = rates.city.minFare;
    notes.push('Minimum fare applied.');
  }

  // Discount applies to the base fare only — never to toll/parking/night stay.
  const tierCfg = (rates.discounts as Record<string, { pct: number }>)[tier] ?? rates.discounts.public;
  const discountPct = tierCfg.pct ?? 0;
  const discountAmount = round((baseFare * discountPct) / 100);

  if (tollAmount > 0) extraLines.push({ label: 'Toll tax', detail: 'on actuals', amount: tollAmount });
  if (parkingAmount > 0) extraLines.push({ label: 'Parking', detail: 'on actuals', amount: parkingAmount });

  const extrasTotal = round(extraLines.reduce((s, l) => s + l.amount, 0));

  return {
    baseLines: baseLines.map((l) => ({ ...l, amount: round(l.amount) })),
    baseFare,
    discountPct,
    discountAmount,
    extraLines,
    extrasTotal,
    total: baseFare - discountAmount + extrasTotal,
    notes,
  };
}
