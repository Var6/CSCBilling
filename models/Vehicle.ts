import { IVehicle } from '@/types/types';
import mongoose, { Schema, model, models } from 'mongoose';



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

  /**
   * Last 4 digits of the plate. The fuel and duty books identify cars this way
   * ("6494", "2762"), so imports and quick staff lookups both need it.
   */
  shortCode: { type: String, default: '', index: true },

  /** Latest odometer seen from a fuel fill or a completed trip. */
  currentOdometer: { type: Number, default: null },
  odometerUpdatedAt: { type: Date, default: null },

  /** Rolling average km per kg/litre, recomputed from consecutive fuel fills. */
  avgMileage: { type: Number, default: null },

  /** Lifetime fuel spend, so cost-per-km is available without an aggregation. */
  totalFuelCost: { type: Number, default: 0 },
  totalRepairCost: { type: Number, default: 0 },


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