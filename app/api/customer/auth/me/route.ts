import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { getCustomerFromCookie } from "@/lib/customerAuth";

export async function GET() {
  const payload = await getCustomerFromCookie();
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const customer = await Customer.findById(payload.customerId).lean();
  if (!customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    customer: {
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      totalRides: customer.totalRides,
      companyId: customer.companyId,
    },
  });
}
