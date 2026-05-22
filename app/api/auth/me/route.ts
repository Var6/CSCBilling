import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import CompanyAdmin from '@/models/CompanyAdmin';
import { verifyToken } from '@/lib/jwt';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload: any = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await CompanyAdmin.findById(payload.userId).select('-passwordHash').lean();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({ user: {
      id: user._id,
      role: user.role,
      companyName: user.companyName,
      adminEmail: user.adminEmail,
      adminFullName: user.adminFullName || ''
    } });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}