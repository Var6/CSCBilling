import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import Trip from "@/models/Trip"
import Driver from "@/models/Driver"
import Vehicle from "@/models/Vehicle"

export async function GET() {
  try {
    await connectDB()

    /* ===============================
       🔒 PREVENT DUPLICATE SEED
    =============================== */

    const existingTrip = await Trip.findOne({ tripId: "TRP-2401" })
    if (existingTrip) {
      return NextResponse.json({
        message: "Trips already seeded",
      })
    }

    /* ===============================
       📦 FETCH DRIVERS & VEHICLES
    =============================== */

    const drivers = await Driver.find()
    const vehicles = await Vehicle.find()

    if (!drivers.length || !vehicles.length) {
      return NextResponse.json(
        { error: "Seed drivers and vehicles first" },
        { status: 400 }
      )
    }

    /* ===============================
       🚕 TRIPS
    =============================== */

    await Trip.create([
      {
        tripId: "TRP-2401",
        customer: {
          name: "John Smith",
          phone: "+1 234-567-8901",
        },
        driver: {
          name: drivers[0].name,
          driverId: drivers[0]._id,
        },
        vehicle: {
          model: vehicles[0].model,
          number: vehicles[0].plate,
          vehicleId: vehicles[0]._id,
        },
        route: {
          pickup: "Airport Terminal 1",
          dropoff: "Downtown Hotel",
        },
        tripDate: new Date("2024-01-02"),
        tripTime: "09:30 AM",
        status: "completed",
        fare: 45,
      },

      {
        tripId: "TRP-2402",
        customer: {
          name: "Sarah Williams",
          phone: "+1 234-567-8902",
        },
        driver: {
          name: drivers[1].name,
          driverId: drivers[1]._id,
        },
        vehicle: {
          model: vehicles[1].model,
          number: vehicles[1].plate,
          vehicleId: vehicles[1]._id,
        },
        route: {
          pickup: "Hotel Plaza",
          dropoff: "Shopping Mall",
        },
        tripDate: new Date("2024-01-02"),
        tripTime: "10:15 AM",
        status: "ongoing",
        fare: 28.5,
      },

      {
        tripId: "TRP-2403",
        customer: {
          name: "Emily Jones",
          phone: "+1 234-567-8904",
        },
        driver: {
          name: drivers[2].name,
          driverId: drivers[2]._id,
        },
        vehicle: {
          model: vehicles[2].model,
          number: vehicles[2].plate,
          vehicleId: vehicles[2]._id,
        },
        route: {
          pickup: "Residential Area",
          dropoff: "Airport Terminal 2",
        },
        tripDate: new Date("2024-01-03"),
        tripTime: "12:45 PM",
        status: "pending",
        fare: 52,
      },

      {
        tripId: "TRP-2404",
        customer: {
          name: "David Wilson",
          phone: "+1 234-567-8907",
        },
        driver: {
          name: drivers[0].name,
          driverId: drivers[0]._id,
        },
        vehicle: {
          model: vehicles[0].model,
          number: vehicles[0].plate,
          vehicleId: vehicles[0]._id,
        },
        route: {
          pickup: "Hospital",
          dropoff: "Residential Complex",
        },
        tripDate: new Date("2024-01-03"),
        tripTime: "04:00 PM",
        status: "cancelled",
        fare: 0,
      },

      {
        tripId: "TRP-2405",
        customer: {
          name: "Michael Brown",
          phone: "+1 234-567-8910",
        },
        driver: {
          name: drivers[1].name,
          driverId: drivers[1]._id,
        },
        vehicle: {
          model: vehicles[1].model,
          number: vehicles[1].plate,
          vehicleId: vehicles[1]._id,
        },
        route: {
          pickup: "Railway Station",
          dropoff: "Business Park",
        },
        tripDate: new Date("2024-01-04"),
        tripTime: "08:20 AM",
        status: "completed",
        fare: 35,
      },
    ])

    return NextResponse.json({
      success: true,
      message: "Trips seeded successfully ✅",
    })
  } catch (error) {
    console.error("Trip seed error:", error)
    return NextResponse.json(
      { error: "Trip seeding failed" },
      { status: 500 }
    )
  }
}
