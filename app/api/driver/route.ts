import { NextRequest, NextResponse } from 'next/server';
import Driver from '@/models/Driver';
import { connectDB } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/driver?active=true|false|all   (default: true)
 *
 * Defaults to current drivers only. Every driver picker in the console — the
 * daily book, fuel, salary, trip assignment — reads this endpoint, and offering
 * someone who has been offboarded means work can be booked to a person who has
 * left. The drivers page passes `all` because it needs both.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const active = new URL(req.url).searchParams.get('active') ?? 'true';
    const filter =
      active === 'all' ? {}
      : active === 'false' ? { active: false }
      // `$ne: false` rather than `true` — rows created before the flag existed
      // have no `active` field and are still current.
      : { active: { $ne: false } };

    const drivers = await Driver.find(filter).sort({ createdAt: -1 });
    return NextResponse.json(drivers);
  } catch (err) {
    console.error('Error fetching drivers:', err);
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.name || !body.phone || !body.email || !body.license) {
      return NextResponse.json(
        { error: 'Missing required fields: name, phone, email, license' },
        { status: 400 }
      );
    }

    const driver = await Driver.create({
      name: body.name,
      phone: body.phone,
      email: body.email,
      license: body.license,
      vehicle: body.vehicle || null,
      address: body.address || '',
      bloodGroup: body.bloodGroup || '',
      emergencyContact: body.emergencyContact || '',
      status: body.status || 'offline',
      joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
      rating: body.rating || 0,
      trips: body.trips || 0,
      baseSalary: body.baseSalary || 0,
      perKmRate: body.perKmRate || 0,
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (err: any) {
    console.error('Error creating driver:', err);
    return NextResponse.json(
      { error: 'Failed to create driver', details: err.message },
      { status: 500 }
    );
  }
}