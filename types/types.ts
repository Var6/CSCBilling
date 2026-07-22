import mongoose from "mongoose";

export interface IVehicle {
  _id?: mongoose.Types.ObjectId;
  name: string;
  plate: string;
  model: string;
  year: number;
  status: 'available' | 'in-use' | 'maintenance';
  color: string;
  fuelType: string;
  mileage: string;

  /** Last 4 digits of the plate — how the fuel and duty books identify a car. */
  shortCode?: string;
  currentOdometer?: number | null;
  odometerUpdatedAt?: Date | null;
  avgMileage?: number | null;
  totalFuelCost?: number;
  totalRepairCost?: number;
  
  // Documents
  insurance: string;
  insuranceExpiry: Date | null;
  pollution: string;
  pollutionExpiry: Date | null;
  fitness: string;
  fitnessExpiry: Date | null;
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
export interface IDriver {
  _id?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  company: string;
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
  baseSalary: number;
  perKmRate: number;

  // ---- Daily book ----
  /** Every spelling of this driver's name seen in the paper registers. */
  aliases?: string[];
  /** Cash the driver currently holds for the company (the "Rest Amount"). */
  currentBalance?: number;
  balanceUpdatedAt?: Date | null;
  defaultShift?: 'day' | 'night' | null;
  active?: boolean;
  exitDate?: Date | null;
  exitReason?: string;
  exitNotes?: string;
  balanceAtExit?: number | null;

  // ---- Driver mobile app ----
  passwordHash?: string;
  /** GeoJSON Point. coordinates are [longitude, latitude]. */
  location?: { type: 'Point'; coordinates: [number, number] };
  locationUpdatedAt?: Date | null;
  onDuty?: boolean;
  lastSeenAt?: Date | null;
}
export interface ICustomer {
    id?: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;  // tenant — set for self-signup via public site
  name: string;
  phone: string;
  email?: string;
  passwordHash?: string;                  // present when customer self-registered with a password
  status: 'active' | 'inactive' | 'banned';

  memberId?: string; // optional
  idProof?: string;  // optional (Aadhaar, PAN, Voter ID URL/number)
  feedback?: string; // optional user feedback

  address?: string;
  joinDate: Date;
  trips: mongoose.Types.ObjectId[];
  totalRides: number;
}
export interface ITrip {
  id?: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  tripNumber: string;

  customer: {
    name: string;
    phone: string;
  };

  driver: {
    driverId: mongoose.Types.ObjectId;
    name: string;
    phone: string;
  };

  vehicle: {
    vehicleId: mongoose.Types.ObjectId;
    plate: string;
    model: string;
    company: string;
  };

  route: {
    pickup: string;
    dropoff: string;
  };

  timing: {
    tripDate: Date;
    startTime: string;
    endTime?: string;
  };

  odometer: {
    start: number;
    end?: number;
    totalKm?: number;
  };

  charges: {
    costPerKm: number;
    distanceCost: number;
    waitingMinutes: number;
    waitingCost: number;
    additionalServices: {
      id: string;
      name: string;
      price: number;
    }[];
    subtotal: number;
    tax: number;
    discount: number;
    totalFare: number;
  };

  payment: {
    method: "cash" | "upi" | "card" | "wallet";
    status: "pending" | "paid";
    referenceId?: string;
  };

  status: "pending" | "ongoing" | "completed" | "cancelled";
  notes?: string;
}
