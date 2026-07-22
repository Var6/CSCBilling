import { verifyToken } from '@/lib/jwt';
import { connectDB } from '@/lib/mongodb';
import Driver from '@/models/Driver';
import { NextResponse } from 'next/server';

/**
 * Driver app authentication.
 *
 * Bearer tokens rather than the httpOnly cookie the customer web flow uses:
 * a React Native app has no cookie jar it can rely on across restarts, and
 * there is no browser to protect against XSS here. The token is held in the
 * device keystore by the app.
 */

export interface DriverJwt {
  driverId: string;
  role: 'driver';
  iat?: number;
  exp?: number;
}

export function driverTokenFrom(req: Request): string | null {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export function verifyDriverToken(req: Request): DriverJwt | null {
  const token = driverTokenFrom(req);
  if (!token) return null;
  const payload = verifyToken(token) as DriverJwt | null;
  if (!payload || payload.role !== 'driver' || !payload.driverId) return null;
  return payload;
}

export const unauthorized = () =>
  NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

/**
 * Resolves the signed-in driver and stamps lastSeenAt.
 *
 * Returns the Mongoose document (not lean) so callers can mutate and save.
 * A driver row that has been deactivated is treated as signed out.
 */
export async function requireDriver(req: Request) {
  const payload = verifyDriverToken(req);
  if (!payload) return null;

  await connectDB();
  const driver = await Driver.findById(payload.driverId);
  if (!driver) return null;

  /*
   * Offboarding revokes the password, but tokens already issued stay valid for
   * their full seven days. Without this check a driver who left on Monday could
   * still go on duty and accept trips until the following Monday. Checked on
   * every request rather than at sign-in, because that is the only place that
   * sees a token minted before the driver left.
   */
  if (driver.active === false) return null;

  return driver;
}

/** Shape sent to the app. Never includes passwordHash. */
export function publicDriver(d: any) {
  return {
    id: String(d._id),
    name: d.name,
    phone: d.phone,
    email: d.email,
    license: d.license,
    status: d.status,
    onDuty: !!d.onDuty,
    vehicle: d.vehicle ?? null,
    vehicleId: d.vehicleId ? String(d.vehicleId) : null,
    rating: d.rating ?? 0,
    trips: d.trips ?? 0,
    baseSalary: d.baseSalary ?? 0,
    perKmRate: d.perKmRate ?? 0,
  };
}
