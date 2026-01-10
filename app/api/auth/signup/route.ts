import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CompanyAdmin from '@/models/CompanyAdmin';
import { hashPassword } from '@/lib/auth';
import { signToken } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      companyName,
      businessType,
      gstNumber,
      panNumber,
      address,
      city,
      state,
      pincode,
      officialEmail,
      officialPhone,
      adminFullName,
      adminEmail,
      adminPhone,
      password,
    } = body;

    if (!adminEmail || !password || !companyName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ❌ Check duplicate email
    const existing = await CompanyAdmin.findOne({
      $or: [{ adminEmail }, { officialEmail }],
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // 🔐 Hash password
    const passwordHash = await hashPassword(password);

    // ✅ Create user
    const user = await CompanyAdmin.create({
      companyName,
      businessType,
      gstNumber,
      panNumber,
      address,
      city,
      state,
      pincode,
      officialEmail,
      officialPhone,
      adminFullName,
      adminEmail,
      adminPhone,
      passwordHash,
      role: 'ADMIN',
    });

    // 🎟️ Create JWT (AUTO LOGIN)
    const token = signToken({
      userId: user._id,
      role: user.role,
      companyName: user.companyName,
    });

    // 🍪 Set cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        role: user.role,
        companyName: user.companyName,
        adminEmail: user.adminEmail,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
