import { ICustomer } from "@/types/types";
import mongoose, { Schema } from "mongoose";


const CustomerSchema = new Schema<ICustomer>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "CompanyAdmin", required: false },
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: false, sparse: true, unique: true },

    // Set only when the customer self-registered through the public website / mobile app.
    // Staff-created customer rows leave this empty.
    passwordHash: { type: String, required: false, select: false },

    status: {
      type: String,
      enum: ["active", "inactive", "banned"],
      default: "active",
    },

    memberId: { type: String, required: false },
    idProof: { type: String, required: false },
    feedback: { type: String, required: false },

    address: { type: String, required: false },
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

CustomerSchema.index({ companyId: 1, phone: 1 });

const Customer =
  (mongoose.models.Customer as mongoose.Model<ICustomer>) ||
  mongoose.model<ICustomer>("Customer", CustomerSchema);

export { Customer };
export default Customer;
