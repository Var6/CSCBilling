import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Vehicle from '@/models/Vehicle'
import Driver from '@/models/Driver'

export async function GET() {
  try {
    await connectDB()

    // 🔒 Prevent duplicate seeding
    const existingVehicle = await Vehicle.findOne({ plate: 'BR01AB1234' })
    if (existingVehicle) {
      return NextResponse.json({
        message: 'Vehicles & Drivers already seeded',
      })
    }

    // 🚗 Create Vehicles
    const vehicles = await Vehicle.create([
      {
        name: 'Swift Dzire',
        plate: 'BR01AB1234',
        model: 'Maruti Swift Dzire',
        year: 2021,
        status: 'available',
        color: 'White',
        fuelType: 'Petrol',
        mileage: '18 km/l',
        insurance: 'INS-001',
        insuranceExpiry: new Date('2026-06-30'),
        pollution: 'PUC-001',
        pollutionExpiry: new Date('2026-01-15'),
        fitness: 'FIT-001',
        fitnessExpiry: new Date('2027-01-01'),
        rcNumber: 'RC-BR01-001',
        totalEarnings: 120000,
        monthlyEarnings: 15000,
        totalTrips: 120,
        maintenanceRecords: [],
      },
      {
        name: 'Ertiga',
        plate: 'BR01CD5678',
        model: 'Maruti Ertiga',
        year: 2020,
        status: 'maintenance',
        color: 'Silver',
        fuelType: 'Diesel',
        mileage: '20 km/l',
        insurance: 'INS-002',
        insuranceExpiry: new Date('2026-08-10'),
        pollution: 'PUC-002',
        pollutionExpiry: new Date('2026-03-01'),
        fitness: 'FIT-002',
        fitnessExpiry: new Date('2027-03-01'),
        rcNumber: 'RC-BR01-002',
        totalEarnings: 250000,
        monthlyEarnings: 22000,
        totalTrips: 260,
        maintenanceRecords: [],
      },
      {
        name: 'Innova Crysta',
        plate: 'BR01EF9012',
        model: 'Toyota Innova Crysta',
        year: 2022,
        status: 'in-use',
        color: 'Black',
        fuelType: 'Diesel',
        mileage: '14 km/l',
        insurance: 'INS-003',
        insuranceExpiry: new Date('2026-12-01'),
        pollution: 'PUC-003',
        pollutionExpiry: new Date('2026-05-01'),
        fitness: 'FIT-003',
        fitnessExpiry: new Date('2027-05-01'),
        rcNumber: 'RC-BR01-003',
        totalEarnings: 340000,
        monthlyEarnings: 30000,
        totalTrips: 310,
        maintenanceRecords: [],
      },
    ])

    // 👨‍✈️ Create Drivers
    const drivers = await Driver.create([
      {
        name: 'Ravi Kumar',
        phone: '9000000001',
        email: 'ravi.driver@test.com',
        status: 'available',
        license: 'DL-BR-001',
        rating: 4.5,
        trips: 120,
        address: 'Patna, Bihar',
        bloodGroup: 'O+',
        emergencyContact: '9000000011',
        vehicle: vehicles[0].name,
        vehicleId: vehicles[0]._id,
      },
      {
        name: 'Amit Singh',
        phone: '9000000002',
        email: 'amit.driver@test.com',
        status: 'offline',
        license: 'DL-BR-002',
        rating: 4.2,
        trips: 200,
        address: 'Gaya, Bihar',
        bloodGroup: 'B+',
        emergencyContact: '9000000022',
        vehicle: null,
        vehicleId: null,
      },
      {
        name: 'Suresh Yadav',
        phone: '9000000003',
        email: 'suresh.driver@test.com',
        status: 'on-trip',
        license: 'DL-BR-003',
        rating: 4.8,
        trips: 310,
        address: 'Muzaffarpur, Bihar',
        bloodGroup: 'A+',
        emergencyContact: '9000000033',
        vehicle: vehicles[2].name,
        vehicleId: vehicles[2]._id,
      },
    ])

    // 🔗 Assign drivers back to vehicles
    await Vehicle.findByIdAndUpdate(vehicles[0]._id, {
      assignedDriverId: drivers[0]._id,
      assignedDriverName: drivers[0].name,
    })

    await Vehicle.findByIdAndUpdate(vehicles[2]._id, {
      assignedDriverId: drivers[2]._id,
      assignedDriverName: drivers[2].name,
    })

    return NextResponse.json({
      success: true,
      message: '3 Vehicles & 3 Drivers seeded successfully ✅',
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Vehicle/Driver seeding failed' },
      { status: 500 }
    )
  }
}
