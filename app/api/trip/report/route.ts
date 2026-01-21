import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import Trip from "@/models/Trip"

export async function GET(req: Request) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)

    const page = Number(searchParams.get("page") || 1)
    const limit = Number(searchParams.get("limit") || 10)

    const total = await Trip.countDocuments()

    const trips = await Trip.find()
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    return NextResponse.json({
      trips,
      total,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to fetch trips" },
      { status: 500 }
    )
  }
}
