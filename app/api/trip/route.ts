import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import Trip from "@/models/Trip"
import Driver from "@/models/Driver"
import Vehicle from "@/models/Vehicle"
import { Customer } from "@/models/Customer"
import { verifyToken } from "@/lib/jwt"

/* =========================
   Helper — get companyId from JWT cookie
========================= */
async function getCompanyId(req: Request): Promise<string | null> {
  try {
    const cookieHeader = req.headers.get("cookie") || ""
    const tokenMatch = cookieHeader.match(/token=([^;]+)/)
    const token = tokenMatch?.[1]
    if (token) {
      const decoded = verifyToken(token) as any
      return decoded?.userId || null
    }
  } catch {}
  return null
}

/* =========================
   GET — List Trips
========================= */
export async function GET(req: Request) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const page = Number(searchParams.get("page") || 1)
    const limit = Number(searchParams.get("limit") || 50)
    const skip = (page - 1) * limit

    const [trips, total] = await Promise.all([
      Trip.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Trip.countDocuments(),
    ])

    return NextResponse.json({ trips, total, page, limit })
  } catch (error) {
    console.error("GET /api/trip error:", error)
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 })
  }
}

/* =========================
   POST — Create Trip
========================= */
export async function POST(req: Request) {
  try {
    await connectDB()

    const companyId = await getCompanyId(req)
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    /* --- Customer lookup or create --- */
    let customer = await Customer.findOne({ phone: body.customer?.phone })
    if (!customer) {
      customer = await Customer.create({
        name: body.customer?.name || "Guest",
        phone: body.customer?.phone || "",
        address: body.customer?.address || "",
      })
    }

    /* --- Driver & Vehicle --- */
    const driverId = body.driver?.driverId || body.driverId
    const vehicleId = body.vehicle?.vehicleId || body.vehicleId

    const driver = await Driver.findById(driverId)
    const vehicle = await Vehicle.findById(vehicleId)

    if (!driver || !vehicle) {
      return NextResponse.json({ error: "Invalid driver or vehicle" }, { status: 400 })
    }

    /* --- Create Trip --- */
    const trip = await Trip.create({
      companyId,
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
      },
      driver: {
        driverId: driver._id,
        name: driver.name,
        phone: driver.phone || "",
      },
      vehicle: {
        vehicleId: vehicle._id,
        plate: vehicle.plate,
        model: vehicle.model,
        company: vehicle.company || "",
      },
      route: {
        pickup: body.route?.pickup || body.fromLocation || "",
        dropoff: body.route?.dropoff || body.toLocation || "",
      },
      timing: {
        tripDate: body.tripDate || new Date(),
        startTime: body.tripTime || new Date().toLocaleTimeString("en-IN"),
      },
      odometer: {
        start: body.startOdometer || 0,
        end: body.endOdometer || 0,
        totalKm: body.totalKm || 0,
      },
      charges: {
        costPerKm: 20,
        distanceCost: body.distanceCost || 0,
        waitingMinutes: Number(body.waitingTime) || 0,
        waitingCost: body.waitingCost || 0,
        additionalServices: body.additionalServices || [],
        subtotal: body.fare || 0,
        totalFare: body.fare || 0,
      },
      payment: {
        method: body.paymentMethod || "cash",
        status: "pending",
      },
      status: "ongoing",
    })

    /* --- Lock driver & vehicle --- */
    await Driver.findByIdAndUpdate(driver._id, { status: "on-trip" })
    await Vehicle.findByIdAndUpdate(vehicle._id, { status: "in-use" })

    return NextResponse.json({ trip }, { status: 201 })
  } catch (err) {
    console.error("POST /api/trip error:", err)
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 })
  }
}

/* =========================
   PUT — Update Trip
========================= */
export async function PUT(req: Request) {
  try {
    await connectDB()
    const body = await req.json()

    if (!body._id) {
      return NextResponse.json({ error: "Trip ID required" }, { status: 400 })
    }

    const update: any = { status: body.status }

    // When completing, free up driver and vehicle
    if (body.status === "completed") {
      const trip = await Trip.findById(body._id)
      if (trip) {
        await Driver.findByIdAndUpdate(trip.driver.driverId, { status: "available" })
        await Vehicle.findByIdAndUpdate(trip.vehicle.vehicleId, { status: "available" })
      }
    }

    const updatedTrip = await Trip.findByIdAndUpdate(body._id, update, { new: true })
    return NextResponse.json(updatedTrip)
  } catch (error) {
    console.error("PUT /api/trip error:", error)
    return NextResponse.json({ error: "Failed to update trip" }, { status: 500 })
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
      return NextResponse.json({ error: "Trip ID required" }, { status: 400 })
    }

    const trip = await Trip.findById(body.id)
    if (trip && trip.status === "ongoing") {
      await Driver.findByIdAndUpdate(trip.driver.driverId, { status: "available" })
      await Vehicle.findByIdAndUpdate(trip.vehicle.vehicleId, { status: "available" })
    }

    await Trip.findByIdAndDelete(body.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/trip error:", error)
    return NextResponse.json({ error: "Failed to delete trip" }, { status: 500 })
  }
}
