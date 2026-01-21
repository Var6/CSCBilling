import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITrip extends Document {
  tripId: string;

  customer: {
    name: string;
    phone: string;
  };

  driver: {
    name: string;
    driverId?: mongoose.Types.ObjectId;
  };

  vehicle: {
    model: string;
    number: string;
    vehicleId?: mongoose.Types.ObjectId;
  };

  route: {
    pickup: string;
    dropoff: string;
  };

  tripDate: Date;
  tripTime: string;

  status: "completed" | "ongoing" | "pending" | "cancelled";

  fare: number;
}

const TripSchema: Schema<ITrip> = new Schema(
  {
    tripId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },

    driver: {
      name: { type: String, required: true },
      driverId: {
        type: Schema.Types.ObjectId,
        ref: "Driver",
      },
    },

    vehicle: {
      model: { type: String, required: true },
      number: { type: String, required: true },
      vehicleId: {
        type: Schema.Types.ObjectId,
        ref: "Vehicle",
      },
    },

    route: {
      pickup: { type: String, required: true },
      dropoff: { type: String, required: true },
    },

    tripDate: {
      type: Date,
      required: true,
      index: true,
    },

    tripTime: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["completed", "ongoing", "pending", "cancelled"],
      default: "pending",
      index: true,
    },

    fare: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true, // createdAt & updatedAt
  }
);

// Prevent model overwrite in Next.js hot reload
const Trip: Model<ITrip> =
  mongoose.models.Trip || mongoose.model<ITrip>("Trip", TripSchema);

export default Trip;
