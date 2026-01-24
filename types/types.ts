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
}
export interface ICustomer {
    id?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'banned';
  
  memberId?: string; // optional
  idProof?: string;  // optional (Aadhaar, PAN, Voter ID URL/number)
  feedback?: string; // optional user feedback

  address: string;
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
