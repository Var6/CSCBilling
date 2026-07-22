import { NextResponse } from 'next/server';
import { publicDriver, requireDriver, unauthorized } from '@/lib/driverAuth';

/** GET /api/driver/auth/me — resolves the Bearer token to a driver profile. */

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const driver = await requireDriver(req);
  if (!driver) return unauthorized();

  driver.lastSeenAt = new Date();
  await driver.save();

  return NextResponse.json({ success: true, driver: publicDriver(driver) });
}
