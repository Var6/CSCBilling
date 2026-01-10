export type Vehicle = {
  id: string;

  name: string;
  plate: string;
  model: string;
  year: number;
  status: 'available' | 'in-use' | 'maintenance';

  color: string;
  fuelType: string;
  mileage: string;

  insurance: string;
  insuranceExpiry: string;
  pollution: string;
  pollutionExpiry: string;
  fitness: string;
  fitnessExpiry: string;
  rcNumber: string;

  assignedDriverName: string;

  totalEarnings: number;
  monthlyEarnings: number;
  totalTrips: number;

  maintenanceRecords: {
    date: string;
    type: string;
    description: string;
    cost: number;
    status: 'completed' | 'pending' | 'scheduled';
    nextDue?: string;
  }[];
};
