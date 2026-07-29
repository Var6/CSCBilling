import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { verifyToken } from '@/lib/jwt';

/**
 * Console-session auth for API routes.
 *
 * The staff console signs a JWT into a `token` cookie whose `userId` is the
 * CompanyAdmin id — which is also the tenant key every record is filed under.
 * This was previously copy-pasted into each route; keeping it in one place
 * means a change to how sessions are read cannot half-apply across the API.
 */

export type Session = { companyId: Types.ObjectId };

/** Reads the session, or null when the cookie is absent, malformed or expired. */
export function getSession(req: NextRequest): Session | null {
  const cookie = req.headers.get('cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (!match) return null;

  try {
    const payload = verifyToken(decodeURIComponent(match[1])) as { userId?: string };
    if (!payload?.userId || !Types.ObjectId.isValid(payload.userId)) return null;
    return { companyId: new Types.ObjectId(payload.userId) };
  } catch {
    return null;
  }
}

/**
 * Guard for route handlers. Returns either a session or the 401 to return.
 *
 *   const auth = requireSession(req);
 *   if ('response' in auth) return auth.response;
 *   // auth.companyId is now safe to scope queries by
 */
export function requireSession(
  req: NextRequest,
): Session | { response: NextResponse } {
  const session = getSession(req);
  if (!session) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return session;
}

/* ------------------------------------------------------------------ *
 * Query helpers
 * ------------------------------------------------------------------ */

/**
 * Builds a date range filter from `?from=&to=` or `?month=YYYY-MM`.
 *
 * Dates are treated as UTC days to match how the importer stored them — using
 * local time here would shift every row by the server's offset and drop the
 * first or last day of a month depending on where it is deployed.
 */
export function dateRangeFilter(params: URLSearchParams): Record<string, Date> | null {
  const month = params.get('month');
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    return { $gte: new Date(Date.UTC(y, m - 1, 1)), $lt: new Date(Date.UTC(y, m, 1)) };
  }

  const from = params.get('from');
  const to = params.get('to');
  const range: Record<string, Date> = {};
  if (from && !Number.isNaN(Date.parse(from))) range.$gte = new Date(`${from}T00:00:00.000Z`);
  if (to && !Number.isNaN(Date.parse(to))) {
    const end = new Date(`${to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1); // `to` is inclusive
    range.$lt = end;
  }
  return Object.keys(range).length ? range : null;
}

/** Clamped pagination, so a bad or hostile `limit` cannot pull the collection. */
export function pagination(params: URLSearchParams, defaultLimit = 100) {
  const limit = Math.min(Math.max(Number(params.get('limit')) || defaultLimit, 1), 500);
  const page = Math.max(Number(params.get('page')) || 1, 1);
  return { limit, skip: (page - 1) * limit, page };
}
