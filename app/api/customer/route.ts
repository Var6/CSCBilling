import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { connectDB } from "@/lib/mongodb"
import { Customer } from "@/models/Customer"

/* =========================
   GET — List Customers
========================= */
export async function GET() {
  try {
    await connectDB()

    const customers = await Customer.find()
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(customers)
  } catch (error) {
    console.error("GET /api/customer error:", error)
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    )
  }
}

/* =========================
   POST — Create Customer
========================= */
export async function POST(req: Request) {
  try {
    await connectDB()
    const body = await req.json()

    const existing = await Customer.findOne({
      phone: body.phone,
    })

    if (existing) {
      return NextResponse.json(
        { error: "Customer with this phone already exists" },
        { status: 400 }
      )
    }

    const customer = await Customer.create({
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      memberId: body.memberId,
      idProof: body.idProof,
      feedback: body.feedback,
      status: body.status || "active",
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error("POST /api/customer error:", error)
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    )
  }
}

/* =========================
   PUT — Update Customer
========================= */
export async function PUT(req: Request) {
  try {
    await connectDB()
    const body = await req.json()

    if (!body._id) {
      return NextResponse.json(
        { error: "Customer ID required" },
        { status: 400 }
      )
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      body._id,
      body,
      { new: true }
    )

    return NextResponse.json(updatedCustomer)
  } catch (error) {
    console.error("PUT /api/customer error:", error)
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    )
  }
}

/* =========================
   DELETE — Delete Customer
========================= */
export async function DELETE(req: Request) {
  try {
    await connectDB()
    const body = await req.json()

    if (!body.id) {
      return NextResponse.json(
        { error: "Customer ID required" },
        { status: 400 }
      )
    }

    await Customer.findByIdAndDelete(body.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/customer error:", error)
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    )
  }
}
