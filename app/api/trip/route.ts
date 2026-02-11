import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import Trip from "@/models/Trip"
import Driver from "@/models/Driver"
import Vehicle from "@/models/Vehicle"
import { Customer } from "@/models/Customer"
import CompanyAdmin from "@/models/CompanyAdmin"
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

export async function POST(req: any) {
  try {
    await connectDB()

    const body = await req.json()

    // ✅ companyId from logged-in user
    const companyId = req.user.companyId

    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    /* ---------------- CUSTOMER (ON THE GO) ---------------- */
    let customer = await Customer.findOne({
      phone: body.customer.phone,
      companyId,
    })

    if (!customer) {
      customer = await Customer.create({
        companyId,
        name: body.customer.name,
        phone: body.customer.phone,
        address: body.customer.address || "",
      })
    }

    /* ---------------- DRIVER & VEHICLE ---------------- */
    const driver = await Driver.findById(body.driverId)
    const vehicle = await Vehicle.findById(body.vehicleId)

    if (!driver || !vehicle) {
      return NextResponse.json(
        { error: "Invalid driver or vehicle" },
        { status: 400 }
      )
    }

    /* ---------------- CREATE TRIP ---------------- */
    const trip = await Trip.create({
      companyId,
      tripNumber: `TRP-${Date.now()}`,

      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
      },

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
      tripDate: body.tripDate,
      tripTime: body.tripTime,
      fare: body.fare,
      status: "ongoing",
    })

    /* ---------------- LOCK DRIVER & VEHICLE ---------------- */
    await Driver.findByIdAndUpdate(driver._id, {
      status: "on-trip",
    })

    await Vehicle.findByIdAndUpdate(vehicle._id, {
      status: "in-use",
    })

    return NextResponse.json({ trip }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: "Failed to create trip" },
      { status: 500 }
    )
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
