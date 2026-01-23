import { ICustomer } from "@/types/types";
import mongoose, { Schema, Document } from "mongoose";


const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: false, unique: true },

    status: {
      type: String,
      enum: ["active", "inactive", "banned"],
      default: "active",
    },

    memberId: { type: String, required: false },
    idProof: { type: String, required: false },
    feedback: { type: String, required: false },

    address: { type: String, required: true },
    joinDate: { type: Date, default: Date.now },
    totalRides: { type: Number, default: 0 },
    trips: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trip",
         default: [],
      },
    ],
  },
  { timestamps: true }
);

export const Customer = mongoose.model<ICustomer>("Customer", CustomerSchema);
