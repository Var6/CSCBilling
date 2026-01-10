import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import CompanyAdmin from '@/models/CompanyAdmin'
import { comparePassword } from '@/lib/auth'
import { signToken } from '@/lib/jwt'

export async function POST(req: Request) {
  try {
    await connectDB()
    const body = await req.json()

    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      )
    }

    // 🔍 Find by admin or official email
    const user = await CompanyAdmin.findOne({
      $or: [
        { adminEmail: email },
        { officialEmail: email },
      ],
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // 🔐 Verify password
    const isValid = await comparePassword(password, user.passwordHash)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // 🎟️ Create JWT
    const token = signToken({
      userId: user._id,
      role: user.role,
      companyName: user.companyName,
    })

    // 🍪 Set token cookie (same as signup)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        role: user.role,
        companyName: user.companyName,
        adminEmail: user.adminEmail,
      },
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
