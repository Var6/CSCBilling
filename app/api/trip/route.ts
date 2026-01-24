import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import Trip from "@/models/Trip"
import Driver from "@/models/Driver"
import Vehicle from "@/models/Vehicle"

/* =========================
   GET — List Trips
========================= */
export async function GET(req: Request) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get("page") || 1)
    const limit = Number(searchParams.get("limit") || 10)

    const skip = (page - 1) * limit

    const [trips, total] = await Promise.all([
      Trip.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Trip.countDocuments(),
    ])

    return NextResponse.json({
      trips,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error("GET /api/trip error:", error)
    return NextResponse.json(
      { error: "Failed to fetch trips" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    await connectDB()
    const body = await req.json()

    const vehicle = await Vehicle.findById(body.vehicle.vehicleId)
    const driver = await Driver.findById(body.driver.driverId)

    if (!vehicle || !driver) {
      return NextResponse.json({ error: "Invalid vehicle or driver" }, { status: 400 })
    }

    if (vehicle.assignedDriverId?.toString() !== driver._id.toString()) {
      return NextResponse.json({ error: "Driver not assigned to vehicle" }, { status: 400 })
    }

    const trip = await Trip.create({
      tripNumber: `TRIP-${Date.now()}`,
      customer: body.customer,
      driver: {
        driverId: driver._id,
        name: driver.name,
        phone: driver.phone,
      },
      vehicle: {
        vehicleId: vehicle._id,
        plate: vehicle.plate,
        model: vehicle.model,
      },
      route: body.route,
      timing: {
        tripDate: body.tripDate,
        startTime: body.tripTime,
      },
      odometer: {
        start: body.startOdometer,
        end: body.endOdometer,
        totalKm: body.totalKm,
      },
      charges: {
        costPerKm: 20,
        distanceCost: body.distanceCost,
        waitingMinutes: body.waitingTime,
        waitingCost: body.waitingCost,
        additionalServices: body.additionalServices || [],
        totalFare: body.fare,
      },
      status: "ongoing",
    })

    // ✅ Correct updates
    await Vehicle.findByIdAndUpdate(vehicle._id, { status: "in-use" })
    await Driver.findByIdAndUpdate(driver._id, { status: "on-trip" })

    return NextResponse.json({ trip }, { status: 201 })
  } catch (err) {
    console.error("POST /api/trip error:", err)
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 })
  }
}


/* =========================
   PUT — Update Trip (Complete)
========================= */
export async function PUT(req: Request) {
  try {
    await connectDB()
    const body = await req.json()

    if (!body._id) {
      return NextResponse.json(
        { error: "Trip ID required" },
        { status: 400 }
      )
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      body._id,
      {
        status: body.status,
      },
      { new: true }
    )

    return NextResponse.json(updatedTrip)
  } catch (error) {
    console.error("PUT /api/trip error:", error)
    return NextResponse.json(
      { error: "Failed to update trip" },
      { status: 500 }
    )
  }
}

/* =========================
   DELETE — Delete Trip
========================= */
export async function DELETE(req: Request) {
  try {
    await connectDB()
    const body = await req.json()

    if (!body.id) {
      return NextResponse.json(
        { error: "Trip ID required" },
        { status: 400 }
      )
    }

    await Trip.findByIdAndDelete(body.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/trip error:", error)
    return NextResponse.json(
      { error: "Failed to delete trip" },
      { status: 500 }
    )
  }
}
