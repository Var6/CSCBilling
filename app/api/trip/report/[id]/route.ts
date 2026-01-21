import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import Trip from "@/models/Trip"
import mongoose from "mongoose"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> } // note Promise
) {
  await connectDB()

  // unwrap params
  const { id } = await params

  // validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid trip ID" }, { status: 400 })
  }

  const trip = await Trip.findById(id)
    .populate("driver")
    .populate("vehicle")
    .lean()

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 })
  }

  return NextResponse.json(trip)
}
