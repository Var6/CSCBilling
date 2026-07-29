import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { comparePassword } from "@/lib/auth";
import { signToken } from "@/lib/jwt";
import { CUSTOMER_COOKIE } from "@/lib/customerAuth";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: "Identifier and password required" }, { status: 400 });
    }

    const isEmail = /@/.test(identifier);
    const query = isEmail
      ? { email: identifier.toLowerCase().trim() }
      : { phone: identifier.replace(/\s+/g, "") };

    const customer = await Customer.findOne(query).select("+passwordHash");
    if (!customer || !customer.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await comparePassword(password, customer.passwordHash);
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    if (customer.status !== "active") {
      return NextResponse.json({ error: "Account is not active" }, { status: 403 });
    }

    const token = signToken({
      customerId: customer._id,
      role: "customer",
      ...(customer.companyId ? { companyId: customer.companyId } : {}),
    });

    const res = NextResponse.json({
      success: true,
      // Returned for the mobile app, which sends it back as a Bearer header.
      // The web flow ignores this and uses the httpOnly cookie set below.
      token,
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
      },
    });
    res.cookies.set(CUSTOMER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error("customer login error", e);
    return NextResponse.json({ error: "Could not sign in" }, { status: 500 });
  }
}
