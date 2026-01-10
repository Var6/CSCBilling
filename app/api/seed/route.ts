import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import CompanyAdmin from '@/models/CompanyAdmin'
import { hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    await connectDB()

    // 🔒 Check if already seeded
    const existing = await CompanyAdmin.findOne({
      adminEmail: 'admin@test.com',
    })

    if (existing) {
      return NextResponse.json({
        message: 'Seed already exists',
        login: {
          email: 'admin@test.com',
          password: 'Admin@123',
        },
      })
    }

    // 🔐 Hash password
    const passwordHash = await hashPassword('Admin@123')

    // ✅ Create admin
    await CompanyAdmin.create({
      companyName: 'Test Billing Company',
      businessType: 'Finance',
      gstNumber: '10ABCDE1234F1Z5',
      panNumber: 'ABCDE1234F',

      address: 'Patna',
      city: 'Patna',
      state: 'Bihar',
      pincode: '800001',

      officialEmail: 'info@test.com',
      officialPhone: '9999999999',

      adminFullName: 'Test Admin',
      adminEmail: 'admin@test.com',
      adminPhone: '9999999999',

      passwordHash,
      role: 'ADMIN',
    })

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully ✅',
      login: {
        email: 'admin@test.com',
        password: 'Admin@123',
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Seeding failed' },
      { status: 500 }
    )
  }
}
