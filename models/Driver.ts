import { IDriver } from '@/types/types';
import mongoose, { Schema, model, models } from 'mongoose';


const driverSchema = new Schema<IDriver>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    company: { type: String, default: '' },
    email: { type: String, required: true },
    status: { type: String, enum: ['available','on-trip','offline'], default: 'offline' },
    vehicle: { type: String, default: null },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    license: { type: String, required: true },
    joinDate: { type: Date, default: Date.now },
    rating: { type: Number, default: 0 },
    trips: { type: Number, default: 0 },
    address: { type: String, default: '' },
    bloodGroup: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    baseSalary: { type: Number, default: 0 },       // monthly base salary (₹)
    perKmRate: { type: Number, default: 0 },         // incentive per km driven (₹)
  },
  {
    timestamps: true,
    collection: 'drivers' // 🔥 CHANGE THIS to EXACT collection name
  }
);

const Driver = models.Driver || model<IDriver>('Driver', driverSchema);
export default Driver;
