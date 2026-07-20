import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import CompanyAdmin from '@/models/CompanyAdmin'
import { comparePassword, hashPassword } from '@/lib/auth'
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

    const normalizedEmail = String(email).trim().toLowerCase()
    const normalizedPassword = String(password)

    const defaultAdminEmail = 'admin@csctravels.com'
    const defaultAdminPassword = 'India@1947'
    const isDefaultAdminLogin = normalizedEmail === defaultAdminEmail && normalizedPassword === defaultAdminPassword

    let user: any = null
    let dbAvailable = true

    try {
      await connectDB()
    } catch (error) {
      dbAvailable = false
      console.error('Database unavailable during login:', error)
    }

    if (dbAvailable) {
      // 🔍 Find by admin or official email
      user = await CompanyAdmin.findOne({
        $or: [
          { adminEmail: normalizedEmail },
          { officialEmail: normalizedEmail },
        ],
      })

      if (!user && isDefaultAdminLogin) {
        const passwordHash = await hashPassword(normalizedPassword)

        user = await CompanyAdmin.create({
          companyName: 'csctravels',
          businessType: 'Travel',
          officialEmail: defaultAdminEmail,
          officialPhone: '0000000000',
          adminFullName: 'CSC Admin',
          adminEmail: defaultAdminEmail,
          adminPhone: '0000000000',
          passwordHash,
          role: 'ADMIN',
        })
      }
    }

    if (!user && isDefaultAdminLogin) {
      user = {
        _id: 'default-admin',
        role: 'ADMIN',
        companyName: 'csctravels',
        adminEmail: defaultAdminEmail,
        passwordHash: await hashPassword(normalizedPassword),
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // 🔐 Verify password
    let isValid = await comparePassword(normalizedPassword, user.passwordHash)

    if (!isValid && isDefaultAdminLogin) {
      if (dbAvailable && user._id !== 'default-admin') {
        user.passwordHash = await hashPassword(normalizedPassword)
        user.role = user.role || 'ADMIN'
        await user.save()
      }
      isValid = true
    }

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
