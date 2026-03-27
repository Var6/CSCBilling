import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import DriverAttendance from '@/models/DriverAttendance';
import Driver from '@/models/Driver';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getCompanyId(req: NextRequest): string | null {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  if (!match) return null;
  try {
    const payload = verifyToken(match[1]) as { userId: string };
    return payload.userId;
  } catch {
    return null;
  }
}

// GET /api/attendance?driverId=xxx&month=2025-03
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const companyId = getCompanyId(req);
    if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get('driverId');
    const month    = searchParams.get('month'); // "YYYY-MM"

    if (!driverId || !month) {
      return NextResponse.json({ error: 'driverId and month required' }, { status: 400 });
    }

    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end   = new Date(year, mon, 1);

    const records = await DriverAttendance.find({
      driverId,
      companyId,
      date: { $gte: start, $lt: end },
    }).sort({ date: 1 });

    return NextResponse.json(records);
  } catch (err) {
    console.error('GET /api/attendance error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/attendance — create or upsert a single day record
// Body: { driverId, date, status, kmDriven, notes }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const companyId = getCompanyId(req);
    if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { driverId, date, status, kmDriven, notes } = body;

    if (!driverId || !date || !status) {
      return NextResponse.json({ error: 'driverId, date and status required' }, { status: 400 });
    }

    const dayDate = new Date(date);
    dayDate.setUTCHours(0, 0, 0, 0);

    const record = await DriverAttendance.findOneAndUpdate(
      { driverId, companyId, date: dayDate },
      { $set: { status, kmDriven: kmDriven ?? 0, notes: notes ?? '' } },
      { upsert: true, new: true }
    );

    return NextResponse.json(record, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/attendance error:', err);
    return NextResponse.json({ error: 'Server error', details: err.message }, { status: 500 });
  }
}

// DELETE /api/attendance?driverId=xxx&date=2025-03-10
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const companyId = getCompanyId(req);
    if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get('driverId');
    const date     = searchParams.get('date');

    if (!driverId || !date) {
      return NextResponse.json({ error: 'driverId and date required' }, { status: 400 });
    }

    const dayDate = new Date(date);
    dayDate.setUTCHours(0, 0, 0, 0);

    await DriverAttendance.findOneAndDelete({ driverId, companyId, date: dayDate });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/attendance error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
