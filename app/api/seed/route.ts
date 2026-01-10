import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Vehicle from '@/models/Vehicle'
import Driver from '@/models/Driver'
import CompanyAdmin from '@/models/CompanyAdmin'
import { hashPassword } from '@/lib/auth' // adjust path if needed

export async function GET() {
  try {
    await connectDB()

    /* ===============================
       🔒 PREVENT DUPLICATE SEED
    =============================== */

    const existingVehicle = await Vehicle.findOne({ plate: 'BR01AB1234' })
    const existingAdmin = await CompanyAdmin.findOne({
      adminEmail: 'admin@company.com',
    })

    if (existingVehicle && existingAdmin) {
      return NextResponse.json({
        message: 'Admin, Vehicles & Drivers already seeded',
      })
    }

    /* ===============================
       👤 COMPANY ADMIN (LOGIN USER)
    =============================== */

    if (!existingAdmin) {
      const adminEmail = 'admin@company.com'
      const passwordHash = await hashPassword(adminEmail) // username = password

      await CompanyAdmin.create({
        companyName: 'Demo Company Pvt Ltd',
        businessType: 'Transport',
        gstNumber: '22AAAAA0000A1Z5',
        panNumber: 'AAAAA0000A',

        address: 'Main Road',
        city: 'Patna',
        state: 'Bihar',
        pincode: '800001',

        officialEmail: 'info@company.com',
        officialPhone: '9999999999',

        adminFullName: 'Super Admin',
        adminEmail,
        adminPhone: '8888888888',

        passwordHash,
        role: 'ADMIN',
      })
    }

    /* ===============================
       🚗 VEHICLES
    =============================== */

    const vehicles = existingVehicle
      ? await Vehicle.find()
      : await Vehicle.create([
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

    /* ===============================
       👨‍✈️ DRIVERS
    =============================== */

    if (!(await Driver.countDocuments())) {
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

      await Vehicle.findByIdAndUpdate(vehicles[0]._id, {
        assignedDriverId: drivers[0]._id,
        assignedDriverName: drivers[0].name,
      })

      await Vehicle.findByIdAndUpdate(vehicles[2]._id, {
        assignedDriverId: drivers[2]._id,
        assignedDriverName: drivers[2].name,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Admin + Vehicles + Drivers seeded successfully ✅',
      login: {
        username: 'admin@company.com',
        password: 'admin@company.com',
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Seeding failed' },
      { status: 500 }
    )
  }
}
