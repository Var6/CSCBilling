import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { hashPassword } from '@/app/lib/auth';

export async function POST(req: Request) {
  try {
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
      password,
      adminPhone
    } = body;

    // 🔐 Hash password
    const passwordHash = await hashPassword(password);

    // ❗ Check duplicate email
    const [existing] = await db.query(
      `SELECT id FROM company_admins WHERE admin_email = ? OR official_email = ?`,
      [adminEmail, officialEmail]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // ✅ Insert
    await db.query(
      `INSERT INTO company_admins (
        company_name,
        business_type,
        gst_number,
        pan_number,
        address,
        city,
        state,
        pincode,
        official_email,
        official_phone,
        admin_full_name,
        admin_email,
        admin_phone,
        password_hash,
        role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
        'ADMIN'
      ]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
