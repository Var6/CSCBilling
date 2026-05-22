import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CompanyAdmin from '@/models/CompanyAdmin';
import { hashPassword } from '@/lib/auth';

const ADMIN_EMAIL = 'admin@csctravels.com';
const ADMIN_PASSWORD = 'India@1947';

export async function GET() {
  try {
    await connectDB();

    const existing = await CompanyAdmin.findOne({
      $or: [{ adminEmail: ADMIN_EMAIL }, { officialEmail: ADMIN_EMAIL }],
    });

    if (existing) {
      return NextResponse.json({
        message: 'Admin already exists',
        email: ADMIN_EMAIL,
      });
    }

    const passwordHash = await hashPassword(ADMIN_PASSWORD);

    await CompanyAdmin.create({
      companyName: 'csctravels',
      businessType: 'Travel',
      officialEmail: ADMIN_EMAIL,
      officialPhone: '0000000000',
      adminFullName: 'CSC Admin',
      adminEmail: ADMIN_EMAIL,
      adminPhone: '0000000000',
      passwordHash,
      role: 'ADMIN',
    });

    return NextResponse.json({
      success: true,
      message: 'Admin seeded',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
  } catch (error) {
    console.error('Admin seed error:', error);
    return NextResponse.json({ error: 'Admin seed failed' }, { status: 500 });
  }
}
