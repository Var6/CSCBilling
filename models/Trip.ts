import mongoose, { Schema, model, models } from "mongoose";

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
      enum: ["pending", "ongoing", "completed", "cancelled"],
      default: "pending",
    },

    notes: String,
  },
  { timestamps: true }
);

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
