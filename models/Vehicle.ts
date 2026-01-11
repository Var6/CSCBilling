import mongoose, { Schema, model, models } from 'mongoose';

export interface IVehicle {
  name: string;
  plate: string;
  model: string;
  year: number;
  status: 'available' | 'in-use' | 'maintenance';
  color: string;
  fuelType: string;
  mileage: string;
  
  // Documents
  insurance: string;
  insuranceExpiry: Date;
  pollution: string;
  pollutionExpiry: Date;
  fitness: string;
  fitnessExpiry: Date;
  rcNumber: string;
  company:string;
  
  // Driver Assignment
  assignedDriverId: mongoose.Types.ObjectId | null;
  assignedDriverName: string | null;
  
  // Earnings & Trips
  totalEarnings: number;
  monthlyEarnings: number;
  totalTrips: number;
  
  // Maintenance Records (embedded)
  maintenanceRecords: {
    date: Date;
    type: string;
    description: string;
    cost: number;
    status: 'completed' | 'pending' | 'scheduled';
    nextDue?: Date;
  }[];
}

const vehicleSchema = new Schema<IVehicle>({
  name: { type: String, required: true },
  plate: { type: String, required: true, unique: true },
  model: { type: String, required: true },
  company: { type: String, default: '' },
  year: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['available', 'in-use', 'maintenance'], 
    default: 'available' 
  },
  color: { type: String, default: '' },
  fuelType: { type: String, default: '' },
  mileage: { type: String, default: '0 km' },
  
  // Documents
  insurance: { type: String, default: '' },
  insuranceExpiry: { type: Date, required: true },
  pollution: { type: String, default: '' },
  pollutionExpiry: { type: Date, required: true },
  fitness: { type: String, default: '' },
  fitnessExpiry: { type: Date, required: true },
  rcNumber: { type: String, required: true },
  
  // Driver Assignment
  assignedDriverId: { type: Schema.Types.ObjectId, ref: 'Driver', default: null },
  assignedDriverName: { type: String, default: null },
  
  // Earnings & Trips
  totalEarnings: { type: Number, default: 0 },
  monthlyEarnings: { type: Number, default: 0 },
  totalTrips: { type: Number, default: 0 },
  
  // Maintenance Records
  maintenanceRecords: [{
    date: { type: Date, required: true },
    type: { type: String, required: true },
    description: { type: String, required: true },
    cost: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['completed', 'pending', 'scheduled'], 
      default: 'scheduled' 
    },
    nextDue: { type: Date }
  }]
}, { timestamps: true });

const Vehicle = models.Vehicle || model<IVehicle>('Vehicle', vehicleSchema);
export default Vehicle;