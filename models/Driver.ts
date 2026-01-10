import mongoose, { Schema, model, models } from 'mongoose';

export interface IDriver {
  name: string;
  phone: string;
  email: string;
  status: 'available' | 'on-trip' | 'offline';
  vehicle: string | null;
  vehicleId: mongoose.Types.ObjectId | null;
  license: string;
  joinDate: Date;
  rating: number;
  trips: number;
  address: string;
  bloodGroup: string;
  emergencyContact: string;
}

const driverSchema = new Schema<IDriver>({
  name: { type: String, required: true },
  phone: { type: String, required: true },
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
}, { timestamps: true });

const Driver = models.Driver || model<IDriver>('Driver', driverSchema);
export default Driver;
