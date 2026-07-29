import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { hashPassword } from "@/lib/auth";
import { signToken } from "@/lib/jwt";
import { CUSTOMER_COOKIE } from "@/lib/customerAuth";

const PHONE_RE = /^[6-9]\d{9}$/;          // Indian mobile
const EMAIL_RE = /^\S+@\S+\.\S+$/;

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const name = (body.name ?? "").trim();
    const phone = (body.phone ?? "").replace(/\s+/g, "");
    const email = (body.email ?? "").trim().toLowerCase() || undefined;
    const password = body.password ?? "";
    const address = (body.address ?? "").trim() || undefined;
    const companyId = process.env.PUBLIC_COMPANY_ID || undefined;

    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    if (!PHONE_RE.test(phone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile" }, { status: 400 });
    }
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Reuse an existing customer row by phone (so staff-created customers can
    // claim their account by registering with the same phone).
    let customer = await Customer.findOne({ phone }).select("+passwordHash");
    if (customer?.passwordHash) {
      return NextResponse.json({ error: "An account with this phone already exists. Please sign in." }, { status: 409 });
    }
    if (!customer && email) {
      const byEmail = await Customer.findOne({ email });
      if (byEmail) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    if (customer) {
      customer.name = customer.name || name;
      customer.email = customer.email || email;
      customer.address = customer.address || address;
      customer.passwordHash = passwordHash;
      if (!customer.companyId && companyId) customer.companyId = companyId as never;
      await customer.save();
    } else {
      customer = await Customer.create({
        name,
        phone,
        email,
        address,
        passwordHash,
        ...(companyId ? { companyId } : {}),
      });
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
    console.error("customer register error", e);
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
