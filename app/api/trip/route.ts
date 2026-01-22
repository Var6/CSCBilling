import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import Trip from "@/models/Trip"

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

/* =========================
   POST — Create Trip
========================= */
export async function POST(req: Request) {
  try {
    await connectDB()
    const body = await req.json()

    const trip = await Trip.create({
      tripNumber: `TRIP-${Date.now()}`,
      customer: body.customer,
      driver: body.driver,
      vehicle: body.vehicle,
      route: body.route,

      charges: {
        totalFare: body.fare,
      },

      status: body.status || "ongoing",
      tripDate: body.tripDate,
      tripTime: body.tripTime,
    })

    return NextResponse.json(trip, { status: 201 })
  } catch (error) {
    console.error("POST /api/trip error:", error)
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
