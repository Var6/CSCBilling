/**
 * The live CSC Travels rate card.
 *
 * This is the single source of truth for every price the mobile app shows.
 * The app fetches it from GET /api/rates on launch and on foreground, caches
 * it, and falls back to a bundled copy when offline.
 *
 * TO REVISE A FARE: edit the numbers below, bump `version`, deploy. Phones pick
 * the change up within 6 hours, or immediately if the rider taps the rate-card
 * line under the Book button.
 *
 * `version` is stored against every booking as `rateVersion`, so a bill can
 * always be traced back to the card that produced it. Always bump it.
 *
 * Omitting a vehicle class from a price map takes that class OFF SALE for that
 * product — it disappears from the app's picker rather than quoting a wrong
 * number. e.g. `outstation.perKm` has no `suv` key, so SUV is not offered for
 * outstation travel.
 */

export const RATE_CARD = {
  version: '2026-07-01',
  effectiveFrom: '2026-07-01',
  currency: 'INR' as const,

  // ---- 1. Intracity rides (within city limits) ----
  city: {
    // Normal ride, charged on total running km per the vehicle meter.
    perKm: 20,
    // One-way rides also bill the empty return leg.
    returnEmptyPerKm: 8.5,
    minKm: 3,
    minFare: 100,
  },

  // ---- 2. Outstation rides (outside Patna city) ----
  outstation: {
    perKm: { hatchback: 12, sedan: 14 },
    // ---- 3. Night stay ----
    // "As per management approval" — set the standard figure here.
    nightStayCharge: 500,
  },

  // ---- 4. Vehicle booking for 8 hours (only vehicle) ----
  // Circular quotes ₹1400–₹1800 "depends on vehicle type". CONFIRM this split.
  hourly: [
    {
      id: 'pkg-8h',
      label: '8 Hours — Vehicle Only',
      hours: 8,
      price: { hatchback: 1400, sedan: 1600, suv: 1800 },
      includes: ['Vehicle'],
      excludes: ['Driver', 'Fuel', 'Toll', 'Parking'],
    },
  ],

  // ---- Self-drive rental ladder ----
  // Built on the same "vehicle only" principle as the 8-hour package.
  // PLACEHOLDER PRICING beyond the 8h tier — confirm before going live.
  rental: {
    packages: [
      { id: 'sd-8h', label: '8 Hours', hours: 8, includedKm: 80, price: { hatchback: 1400, sedan: 1600, suv: 1800 } },
      { id: 'sd-12h', label: '12 Hours', hours: 12, includedKm: 120, price: { hatchback: 1900, sedan: 2200, suv: 2500 } },
      { id: 'sd-24h', label: '24 Hours', hours: 24, includedKm: 200, price: { hatchback: 2800, sedan: 3200, suv: 3700 } },
      { id: 'sd-weekly', label: '7 Days', hours: 168, includedKm: 1200, price: { hatchback: 16000, sedan: 19000, suv: 22000 } },
    ],
    securityDeposit: { hatchback: 2000, sedan: 3000, suv: 4000 },
    extraKm: { hatchback: 9, sedan: 11, suv: 13 },
    extraHour: { hatchback: 180, sedan: 220, suv: 260 },
    fuelPolicy: 'Fuel is not included. Return the vehicle at the same fuel level as pickup.',
    // PLACEHOLDER hub locations — replace with real pickup points.
    hubs: [
      { id: 'hub-patna-jn', name: 'Patna Junction Hub', address: 'Near Patna Junction, Patna 800001', lat: 25.6017, lng: 85.1370, opensAt: '06:00', closesAt: '22:00' },
      { id: 'hub-boring', name: 'Boring Road Hub', address: 'Boring Road, Patna 800001', lat: 25.6122, lng: 85.1189, opensAt: '07:00', closesAt: '21:00' },
      { id: 'hub-airport', name: 'Jay Prakash Narayan Airport', address: 'Airport Road, Patna 800014', lat: 25.5913, lng: 85.0880, opensAt: '05:00', closesAt: '23:00' },
    ],
    requirements: [
      'Valid driving licence held for at least 1 year',
      'Original ID proof at the time of pickup',
      'Refundable security deposit blocked at pickup',
    ],
  },

  // ---- Member & employee benefit discount policy ----
  // Applied to the BASE FARE only. Toll, parking and night stay stay outside it.
  discounts: {
    public: { pct: 0, label: 'Regular', proof: '' },
    member: { pct: 10, label: 'Cooperative Member', proof: 'Membership ID required at pickup' },
    official: { pct: 25, label: 'Official / Employee', proof: 'Official authorisation required; subject to management approval' },
  },

  vehicles: [
    { id: 'hatchback', label: 'Hatchback', examples: 'Swift, WagonR, i10', seats: 4, icon: 'car-outline' },
    { id: 'sedan', label: 'Sedan', examples: 'Dzire, Aura, Amaze', seats: 4, icon: 'car-sport-outline' },
    { id: 'suv', label: 'SUV', examples: 'Ertiga, Innova', seats: 6, icon: 'car' },
    { id: 'traveller', label: 'Traveller', examples: 'Force Traveller', seats: 12, icon: 'bus-outline' },
    { id: 'bus', label: 'Bus', examples: '30+ seater', seats: 32, icon: 'bus' },
  ],

  notes: [
    'Fuel and vehicle maintenance are included in the applicable fare calculation.',
    'Toll tax, parking fees and night stay charges are billed separately on actuals.',
    'Fixed rate — no surge pricing. Final bill follows the vehicle meter reading.',
  ],
};

export type RateCard = typeof RATE_CARD;
export type VehicleClass = 'hatchback' | 'sedan' | 'suv' | 'traveller' | 'bus';
export type RiderTier = 'public' | 'member' | 'official';
