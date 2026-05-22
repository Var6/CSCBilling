import mongoose from 'mongoose';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

await mongoose.connect(process.env.MONGODB_URI);

const adminColl = mongoose.connection.collection('companyadmins');
const admin = await adminColl.findOne({ adminEmail: 'admin@csctravels.com' });
if (!admin) {
  console.error('Admin not found — run scripts/seed-admin.mjs first');
  process.exit(1);
}
const companyId = admin._id;
console.log('Seeding for companyId:', companyId.toString());

const vehicleColl = mongoose.connection.collection('vehicles');
const driverColl = mongoose.connection.collection('drivers');
const customerColl = mongoose.connection.collection('customers');
const tripColl = mongoose.connection.collection('trips');
const financeColl = mongoose.connection.collection('finances');

await vehicleColl.deleteMany({});
await driverColl.deleteMany({});
await customerColl.deleteMany({ companyId });
await tripColl.deleteMany({ companyId });
await financeColl.deleteMany({ companyId });

const oneYear = (m) => new Date(Date.now() + m * 30 * 86400000);

const vehicles = [
  { name: 'Innova Crysta - DL01AB1234', plate: 'DL01AB1234', model: 'Innova Crysta', company: 'Toyota', year: 2022, color: 'White', fuelType: 'Diesel', mileage: '12 km/l', status: 'in-use', rcNumber: 'RC-DL01AB1234', insurance: 'ICICI Lombard', insuranceExpiry: oneYear(8), pollution: 'Valid', pollutionExpiry: oneYear(4), fitness: 'Valid', fitnessExpiry: oneYear(20), totalEarnings: 285000, monthlyEarnings: 42000, totalTrips: 156 },
  { name: 'Swift Dzire - DL02CD5678', plate: 'DL02CD5678', model: 'Swift Dzire', company: 'Maruti Suzuki', year: 2021, color: 'Silver', fuelType: 'Petrol', mileage: '18 km/l', status: 'available', rcNumber: 'RC-DL02CD5678', insurance: 'Bajaj Allianz', insuranceExpiry: oneYear(6), pollution: 'Valid', pollutionExpiry: oneYear(2), fitness: 'Valid', fitnessExpiry: oneYear(14), totalEarnings: 198000, monthlyEarnings: 28000, totalTrips: 124 },
  { name: 'Ertiga - DL03EF9012', plate: 'DL03EF9012', model: 'Ertiga', company: 'Maruti Suzuki', year: 2023, color: 'Grey', fuelType: 'CNG', mileage: '22 km/kg', status: 'in-use', rcNumber: 'RC-DL03EF9012', insurance: 'HDFC Ergo', insuranceExpiry: oneYear(10), pollution: 'Valid', pollutionExpiry: oneYear(5), fitness: 'Valid', fitnessExpiry: oneYear(28), totalEarnings: 324000, monthlyEarnings: 48000, totalTrips: 187 },
  { name: 'Etios - DL04GH3456', plate: 'DL04GH3456', model: 'Etios', company: 'Toyota', year: 2020, color: 'White', fuelType: 'Diesel', mileage: '14 km/l', status: 'maintenance', rcNumber: 'RC-DL04GH3456', insurance: 'New India', insuranceExpiry: oneYear(3), pollution: 'Valid', pollutionExpiry: oneYear(1), fitness: 'Valid', fitnessExpiry: oneYear(9), totalEarnings: 156000, monthlyEarnings: 0, totalTrips: 98 },
  { name: 'Innova - DL05IJ7890', plate: 'DL05IJ7890', model: 'Innova', company: 'Toyota', year: 2019, color: 'Silver', fuelType: 'Diesel', mileage: '11 km/l', status: 'available', rcNumber: 'RC-DL05IJ7890', insurance: 'ICICI Lombard', insuranceExpiry: oneYear(5), pollution: 'Valid', pollutionExpiry: oneYear(3), fitness: 'Valid', fitnessExpiry: oneYear(16), totalEarnings: 412000, monthlyEarnings: 38000, totalTrips: 234 },
  { name: 'Tigor EV - DL06KL2468', plate: 'DL06KL2468', model: 'Tigor EV', company: 'Tata', year: 2024, color: 'Blue', fuelType: 'Electric', mileage: '306 km/charge', status: 'in-use', rcNumber: 'RC-DL06KL2468', insurance: 'HDFC Ergo', insuranceExpiry: oneYear(11), pollution: 'NA', pollutionExpiry: oneYear(60), fitness: 'Valid', fitnessExpiry: oneYear(36), totalEarnings: 89000, monthlyEarnings: 31000, totalTrips: 67 },
];
const vehicleDocs = await vehicleColl.insertMany(vehicles.map(v => ({ ...v, createdAt: new Date(), updatedAt: new Date(), maintenanceRecords: [] })));
const vIds = Object.values(vehicleDocs.insertedIds);
console.log('Vehicles:', vIds.length);

const drivers = [
  { name: 'Mahesh Kumar', phone: '+91 98100 23456', email: 'mahesh@csctravels.com', license: 'DL-1420110012345', status: 'on-trip', rating: 4.8, trips: 156, address: 'Sector 12, Dwarka, New Delhi', bloodGroup: 'B+', emergencyContact: '+91 98100 88888', baseSalary: 22000, perKmRate: 3, vehicleId: vIds[0], vehicle: 'DL01AB1234', joinDate: new Date('2022-03-15') },
  { name: 'Suresh Singh', phone: '+91 98201 34567', email: 'suresh@csctravels.com', license: 'DL-1420120023456', status: 'available', rating: 4.6, trips: 124, address: 'Rohini Sector 7, Delhi', bloodGroup: 'O+', emergencyContact: '+91 98201 99999', baseSalary: 20000, perKmRate: 2.5, vehicleId: vIds[1], vehicle: 'DL02CD5678', joinDate: new Date('2021-07-22') },
  { name: 'Ravi Yadav', phone: '+91 98302 45678', email: 'ravi@csctravels.com', license: 'DL-1420130034567', status: 'on-trip', rating: 4.9, trips: 187, address: 'Saket, New Delhi', bloodGroup: 'A+', emergencyContact: '+91 98302 77777', baseSalary: 24000, perKmRate: 3.5, vehicleId: vIds[2], vehicle: 'DL03EF9012', joinDate: new Date('2023-01-10') },
  { name: 'Vikram Joshi', phone: '+91 98403 56789', email: 'vikram@csctravels.com', license: 'DL-1420140045678', status: 'offline', rating: 4.4, trips: 98, address: 'Lajpat Nagar, Delhi', bloodGroup: 'AB+', emergencyContact: '+91 98403 66666', baseSalary: 19000, perKmRate: 2.5, vehicleId: vIds[3], vehicle: 'DL04GH3456', joinDate: new Date('2020-11-05') },
  { name: 'Deepak Reddy', phone: '+91 98504 67890', email: 'deepak@csctravels.com', license: 'DL-1420150056789', status: 'available', rating: 4.7, trips: 234, address: 'Vasant Vihar, Delhi', bloodGroup: 'B-', emergencyContact: '+91 98504 55555', baseSalary: 23000, perKmRate: 3, vehicleId: vIds[4], vehicle: 'DL05IJ7890', joinDate: new Date('2019-05-18') },
  { name: 'Anil Sharma', phone: '+91 98605 78901', email: 'anil@csctravels.com', license: 'DL-1420160067890', status: 'on-trip', rating: 4.5, trips: 67, address: 'Karol Bagh, Delhi', bloodGroup: 'O-', emergencyContact: '+91 98605 44444', baseSalary: 21000, perKmRate: 2.8, vehicleId: vIds[5], vehicle: 'DL06KL2468', joinDate: new Date('2024-02-01') },
];
const driverDocs = await driverColl.insertMany(drivers.map(d => ({ ...d, company: 'csctravels', createdAt: new Date(), updatedAt: new Date() })));
const dIds = Object.values(driverDocs.insertedIds);
console.log('Drivers:', dIds.length);

await vehicleColl.updateOne({ _id: vIds[0] }, { $set: { assignedDriverId: dIds[0], assignedDriverName: 'Mahesh Kumar' } });
await vehicleColl.updateOne({ _id: vIds[1] }, { $set: { assignedDriverId: dIds[1], assignedDriverName: 'Suresh Singh' } });
await vehicleColl.updateOne({ _id: vIds[2] }, { $set: { assignedDriverId: dIds[2], assignedDriverName: 'Ravi Yadav' } });
await vehicleColl.updateOne({ _id: vIds[3] }, { $set: { assignedDriverId: dIds[3], assignedDriverName: 'Vikram Joshi' } });
await vehicleColl.updateOne({ _id: vIds[4] }, { $set: { assignedDriverId: dIds[4], assignedDriverName: 'Deepak Reddy' } });
await vehicleColl.updateOne({ _id: vIds[5] }, { $set: { assignedDriverId: dIds[5], assignedDriverName: 'Anil Sharma' } });

const customers = [
  { companyId, name: 'Rahul Sharma', phone: '+91 99100 11111', email: 'rahul.sharma@gmail.com', address: 'A-12, Greater Kailash, New Delhi', status: 'active', totalRides: 24, memberId: 'CSC-C-1001', joinDate: new Date('2024-01-15') },
  { companyId, name: 'Priya Verma', phone: '+91 99100 22222', email: 'priya.verma@gmail.com', address: 'Sector 50, Noida', status: 'active', totalRides: 18, memberId: 'CSC-C-1002', joinDate: new Date('2024-03-08') },
  { companyId, name: 'Amit Patel', phone: '+91 99100 33333', email: 'amit.patel@gmail.com', address: 'DLF Phase 3, Gurgaon', status: 'active', totalRides: 31, memberId: 'CSC-C-1003', joinDate: new Date('2023-11-22') },
  { companyId, name: 'Sneha Iyer', phone: '+91 99100 44444', email: 'sneha.iyer@gmail.com', address: 'Vasant Kunj, Delhi', status: 'active', totalRides: 12, memberId: 'CSC-C-1004', joinDate: new Date('2024-06-04') },
  { companyId, name: 'Karan Mehta', phone: '+91 99100 55555', email: 'karan.mehta@gmail.com', address: 'Saket, New Delhi', status: 'active', totalRides: 8, memberId: 'CSC-C-1005', joinDate: new Date('2024-09-12') },
  { companyId, name: 'Anjali Gupta', phone: '+91 99100 66666', email: 'anjali.gupta@gmail.com', address: 'Janakpuri, Delhi', status: 'active', totalRides: 15, memberId: 'CSC-C-1006', joinDate: new Date('2024-04-18') },
  { companyId, name: 'Rohan Khanna', phone: '+91 99100 77777', email: 'rohan.khanna@gmail.com', address: 'Connaught Place, Delhi', status: 'active', totalRides: 22, memberId: 'CSC-C-1007', joinDate: new Date('2023-12-30') },
  { companyId, name: 'Neha Kapoor', phone: '+91 99100 88888', email: 'neha.kapoor@gmail.com', address: 'Hauz Khas, Delhi', status: 'active', totalRides: 9, memberId: 'CSC-C-1008', joinDate: new Date('2024-08-25') },
];
const customerDocs = await customerColl.insertMany(customers.map(c => ({ ...c, trips: [], createdAt: new Date(), updatedAt: new Date() })));
const cIds = Object.values(customerDocs.insertedIds);
console.log('Customers:', cIds.length);

const routes = [
  { pickup: 'IGI Airport T3', dropoff: 'Connaught Place', km: 22 },
  { pickup: 'New Delhi Railway Station', dropoff: 'Cyber Hub Gurgaon', km: 32 },
  { pickup: 'Hotel Taj Mahal', dropoff: 'Select Citywalk Mall', km: 14 },
  { pickup: 'Vasant Kunj', dropoff: 'IGI Airport T1', km: 12 },
  { pickup: 'Saket', dropoff: 'Noida Sector 18', km: 28 },
  { pickup: 'Greater Kailash', dropoff: 'Aerocity', km: 18 },
  { pickup: 'DLF Cyber City', dropoff: 'Indira Gandhi Airport', km: 25 },
  { pickup: 'Karol Bagh', dropoff: 'Mahipalpur', km: 16 },
];
const statuses = ['completed', 'completed', 'completed', 'completed', 'ongoing', 'pending', 'cancelled'];
const methods = ['cash', 'upi', 'card', 'upi', 'cash'];

const trips = [];
let tripCounter = 1;
for (let i = 0; i < 35; i++) {
  const route = routes[i % routes.length];
  const driverIdx = i % dIds.length;
  const vehicleIdx = i % vIds.length;
  const customerIdx = i % cIds.length;
  const status = statuses[i % statuses.length];
  const tripDate = new Date(Date.now() - i * 86400000 * 0.6);
  const baseFare = route.km * 20;
  const tax = Math.round(baseFare * 0.05);
  const totalFare = baseFare + tax;

  const trip = {
    companyId,
    tripNumber: `TRIP-${String(tripCounter++).padStart(6, '0')}`,
    customer: { id: cIds[customerIdx], name: customers[customerIdx].name, phone: customers[customerIdx].phone },
    route: { pickup: route.pickup, dropoff: route.dropoff },
    timing: { tripDate, startTime: `${8 + (i % 12)}:${(i * 7) % 60}0`.slice(0, 5).padStart(5, '0') },
    charges: { costPerKm: 20, distanceCost: baseFare, waitingMinutes: 0, waitingCost: 0, additionalServices: [], subtotal: baseFare, tax, discount: 0, totalFare },
    payment: { method: methods[i % methods.length], status: status === 'completed' ? 'paid' : 'pending' },
    status,
    notes: '',
    createdAt: tripDate,
    updatedAt: tripDate,
  };

  if (status !== 'pending') {
    trip.driver = { driverId: dIds[driverIdx], name: drivers[driverIdx].name, phone: drivers[driverIdx].phone };
    trip.vehicle = { vehicleId: vIds[vehicleIdx], plate: vehicles[vehicleIdx].plate, model: vehicles[vehicleIdx].model, company: vehicles[vehicleIdx].company };
    trip.odometer = { start: 12000 + i * 50 };
    if (status === 'completed') {
      trip.odometer.end = trip.odometer.start + route.km;
      trip.odometer.totalKm = route.km;
      trip.timing.endTime = `${10 + (i % 12)}:${(i * 11) % 60}0`.slice(0, 5).padStart(5, '0');
    }
  }
  trips.push(trip);
}
await tripColl.insertMany(trips);
console.log('Trips:', trips.length);

const finance = [];
const categories = {
  income: ['Trip Revenue', 'Other Income'],
  expense: ['Fuel', 'Salary', 'Servicing', 'Maintenance', 'Insurance', 'Toll'],
};
for (let i = 0; i < 40; i++) {
  const isIncome = i % 3 !== 0;
  const type = isIncome ? 'income' : 'expense';
  const cat = categories[type][i % categories[type].length];
  const amounts = { 'Trip Revenue': 1200 + (i * 137) % 3000, 'Other Income': 5000 + (i * 200) % 8000, Fuel: 2500 + (i * 89) % 1500, Salary: 22000, Servicing: 4500 + (i * 50) % 2000, Maintenance: 1800 + (i * 60) % 1200, Insurance: 12000, Toll: 280 + (i * 17) % 200 };
  finance.push({
    companyId,
    date: new Date(Date.now() - i * 86400000 * 0.8),
    type,
    category: cat,
    description: type === 'income' ? `Receipt from ${customers[i % cIds.length].name}` : `${cat} - ${vehicles[i % vIds.length].plate}`,
    amount: amounts[cat],
    paymentMethod: methods[i % methods.length] === 'card' ? 'card' : (methods[i % methods.length] === 'upi' ? 'upi' : 'cash'),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
await financeColl.insertMany(finance);
console.log('Finance entries:', finance.length);

console.log('\n✅ Demo data seeded successfully');
await mongoose.disconnect();
