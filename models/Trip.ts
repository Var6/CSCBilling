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

    driver: {
      driverId: { type: Schema.Types.ObjectId, ref: "Driver", required: true },
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },

    vehicle: {
      vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
      plate: { type: String, required: true },
      model: { type: String, required: true },
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
      start: { type: Number, required: true },
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

/* ---------- Auto Trip Number (TS FIXED) ---------- */
/* ---------- Auto Trip Number (Mongoose v7) ---------- */
TripSchema.pre("save", async function () {
  if (!this.tripNumber) {
    const count = await mongoose.model("Trip").countDocuments();
    this.tripNumber = `TRIP-${String(count + 1).padStart(6, "0")}`;
  }
});


/* ---------- Model ---------- */
const Trip = models.Trip || model("Trip", TripSchema);
export default Trip;
