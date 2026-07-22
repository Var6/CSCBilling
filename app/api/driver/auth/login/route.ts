import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Driver from '@/models/Driver';
import { comparePassword } from '@/lib/auth';
import { signToken } from '@/lib/jwt';
import { publicDriver } from '@/lib/driverAuth';

/**
 * POST /api/driver/auth/login   { identifier, password }
 *
 * `identifier` is the driver's phone or email. Credentials are issued by staff
 * with scripts/setDriverPassword.ts — drivers cannot self-register, because a
 * driver row implies an employment relationship and a verified licence.
 */

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json({ success: false, error: 'Phone and password are required' }, { status: 400 });
    }

    const id = String(identifier).trim();
    const query = /@/.test(id)
      ? { email: id.toLowerCase() }
      : { phone: id.replace(/\s+/g, '') };

    const driver = await Driver.findOne(query).select('+passwordHash');

    // Same message whether the row is missing or the password is wrong — do not
    // let anyone enumerate which phone numbers belong to drivers.
    // A driver who has been offboarded is refused here too: offboarding clears
    // the password hash, but this keeps holding if one is ever reissued without
    // the driver being reinstated.
    if (!driver?.passwordHash || driver.active === false) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = await comparePassword(password, driver.passwordHash);
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({ driverId: String(driver._id), role: 'driver' });

    /*
     * updateOne rather than save(): drivers carried over from the paper books
     * have no phone/email/licence on record and those fields are `required`,
     * so a full-document validation would fail the login of a driver whose
     * profile staff have not finished filling in yet.
     */
    await Driver.updateOne({ _id: driver._id }, { $set: { lastSeenAt: new Date() } });

    return NextResponse.json({ success: true, token, driver: publicDriver(driver) });
  } catch (e) {
    console.error('driver login error', e);
    return NextResponse.json({ success: false, error: 'Could not sign in' }, { status: 500 });
  }
}
