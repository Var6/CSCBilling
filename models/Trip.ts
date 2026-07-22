import mongoose, { Schema, model, models } from "mongoose";
import { geoPoint } from "./geo";

/* ---------- Interface ---------- */

/* ---------- Schema ---------- */
const TripSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },

    tripNumber: { type: String, unique: true },

    customer: {
      id: { type: Schema.Types.ObjectId, required: true, ref: "Customer" },
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },

    // Driver / vehicle / odometer.start are *unset* while the trip is still
    // "pending" (customer booked but staff hasn't dispatched yet). The pre-validate
    // hook below enforces that they become required as soon as the trip moves to
    // ongoing or completed.
    driver: {
      driverId: { type: Schema.Types.ObjectId, ref: "Driver" },
      name: { type: String },
      phone: { type: String },
    },

    vehicle: {
      vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle" },
      plate: { type: String },
      model: { type: String },
      company: { type: String, default: "" },
    },

    route: {
      pickup: { type: String, required: true },
      dropoff: { type: String, required: true },

      // Coordinates for dispatch. GeoJSON order is [longitude, latitude].
      // Absent on staff-entered trips, which simply never enter dispatch.
      pickupPoint: geoPoint(),
      dropPoint: geoPoint(),
      estimatedKm: { type: Number, default: 0 },
    },

    timing: {
      tripDate: { type: Date, required: true },
      startTime: { type: String, required: true },
      endTime: String,
    },

    odometer: {
      start: { type: Number },
      end: Number,
      totalKm: Number,

      // Anti-tamper evidence. Written by the server from the driver app's
      // readings — never accepted from the client, and never rewritten once
      // set, so a driver cannot revise a reading after the fact.
      startAt: { type: Date },
      endAt: { type: Date },
      startPoint: geoPoint(),
      endPoint: geoPoint(),
    },

    // Distance the phone actually travelled, accumulated server-side from GPS
    // pings during the trip. Compared against the odometer delta at close.
    tracking: {
      gpsKm: { type: Number, default: 0 },
      pingCount: { type: Number, default: 0 },
      lastPingAt: { type: Date, default: null },
    },

    // Set at completion. `flagged` is what ops reviews — the point is not to
    // block the driver mid-shift but to make a false reading visible.
    integrity: {
      odometerKm: { type: Number, default: 0 },
      gpsKm: { type: Number, default: 0 },
      /** Signed % the odometer exceeds GPS by. Positive = claimed more than driven. */
      variancePct: { type: Number, default: 0 },
      flagged: { type: Boolean, default: false },
      flagReasons: { type: [String], default: [] },
    },

    charges: {
      costPerKm: { type: Number, default: 20 },
      distanceCost: { type: Number, default: 0 },
      waitingMinutes: { type: Number, default: 0 },
      waitingCost: { type: Number, default: 0 },
      additionalServices: [{ id: String, name: String, price: Number }],
      subtotal: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      totalFare: { type: Number, required: true },
    },

    payment: {
      method: {
        type: String,
        enum: ["cash", "upi", "card", "wallet"],
        default: "cash",
      },
      status: {
        type: String,
        enum: ["pending", "paid"],
        default: "pending",
      },
      referenceId: String,
    },

    status: {
      type: String,
      // "accepted" sits between a customer booking and the driver actually
      // rolling — a driver has claimed it but no odometer is recorded yet.
      enum: ["pending", "accepted", "ongoing", "completed", "cancelled"],
      default: "pending",
    },

    // Where this trip came from. "offline" trips are ones the driver picked up
    // off-app (street hail, phone call) and entered themselves.
    source: {
      type: String,
      enum: ["app", "offline", "staff"],
      default: "staff",
    },

    // Dispatch state — see lib/dispatch.ts for the nearest-first wave logic.
    dispatch: {
      // Drivers the current wave has been offered to. Only these may accept
      // until the offer expires and the radius widens.
      offeredTo: [{ type: Schema.Types.ObjectId, ref: "Driver" }],
      offerWave: { type: Number, default: 0 },
      offerExpiresAt: { type: Date, default: null },
      // Declines are sticky — a driver is never re-offered a trip they passed.
      declinedBy: [{ type: Schema.Types.ObjectId, ref: "Driver" }],
      acceptedAt: { type: Date, default: null },
    },

    // Pricing context captured at booking, so a bill can be traced to the
    // rate card that produced it (see lib/rateCard.ts).
    pricing: {
      tripKind: { type: String },
      riderTier: { type: String, enum: ["public", "member", "official"], default: "public" },
      rateVersion: { type: String },
      estimatedFare: { type: Number, default: 0 },
    },

    // 4-digit handoff code so the driver can confirm the rider at pickup.
    // Generated when a customer books via the public site/mobile app.
    otp: { type: String },

    notes: String,
  },
  { timestamps: true }
);

/* ---------- Indexes ---------- */
// Nearest-pending-trip lookups from the driver app.
TripSchema.index({ "route.pickupPoint": "2dsphere" });
TripSchema.index({ status: 1, "dispatch.offerExpiresAt": 1 });
TripSchema.index({ "driver.driverId": 1, status: 1 });

/* ---------- Pre-save (Mongoose v7): auto trip number + dispatch guard ---------- */
TripSchema.pre("save", async function () {
  if (!this.tripNumber) {
    const count = await mongoose.model("Trip").countDocuments();
    this.tripNumber = `TRIP-${String(count + 1).padStart(6, "0")}`;
  }

  // Enforce dispatch fields once the trip moves out of `pending`.
  const dispatched = this.status === "ongoing" || this.status === "completed";
  if (dispatched) {
    const missing: string[] = [];
    if (!this.driver?.driverId)   missing.push("driver.driverId");
    if (!this.driver?.name)       missing.push("driver.name");
    if (!this.driver?.phone)      missing.push("driver.phone");
    if (!this.vehicle?.vehicleId) missing.push("vehicle.vehicleId");
    if (!this.vehicle?.plate)     missing.push("vehicle.plate");
    if (!this.vehicle?.model)     missing.push("vehicle.model");
    if (this.odometer?.start == null) missing.push("odometer.start");

    if (missing.length) {
      throw new Error(
        `Trip cannot be ${this.status} without dispatch info — missing: ${missing.join(", ")}`
      );
    }
  }
});


/* ---------- Model ---------- */
const Trip = models.Trip || model("Trip", TripSchema);
export default Trip;
