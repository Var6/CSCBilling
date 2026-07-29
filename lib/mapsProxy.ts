/**
 * Shared plumbing for /api/maps/*.
 *
 * WHY THIS EXISTS: Google's web-service APIs (Places, Directions, Distance
 * Matrix) cannot be restricted to an app package the way the Maps SDK keys can
 * — Google only supports IP restriction on them. A key shipped inside an APK is
 * trivially extractable and then billable by anyone who finds it. So the mobile
 * app never holds that key; it calls these routes, and the key stays here.
 *
 * That makes these routes the thing worth protecting instead. They are open by
 * necessity (riders aren't signed in while searching for a destination), so the
 * controls are: a narrow allowlist of upstream parameters, India-only results,
 * and the per-IP throttle below. Set a hard daily quota cap in Google Cloud
 * Console as well — that is your real backstop against a surprise bill.
 */

import { NextResponse } from 'next/server';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function serverKey(): string | null {
  return process.env.GOOGLE_MAPS_SERVER_KEY || null;
}

export function missingKey() {
  return NextResponse.json(
    { success: false, error: 'GOOGLE_MAPS_SERVER_KEY is not configured on the server' },
    { status: 503, headers: CORS },
  );
}

export function preflight() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ---------------------------------------------------------------------------
// Throttle
//
// In-memory and therefore per-serverless-instance — this trims casual abuse and
// runaway client loops, not a determined attacker. If these routes ever get
// hammered, move the counter to Redis/Upstash so it is shared across instances.
// ---------------------------------------------------------------------------

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimited(req: Request): boolean {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // Opportunistic cleanup so the map cannot grow without bound.
    if (hits.size > 5_000) {
      for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
    }
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export function tooManyRequests() {
  return NextResponse.json(
    { success: false, error: 'Too many requests' },
    { status: 429, headers: { ...CORS, 'Retry-After': '60' } },
  );
}

// ---------------------------------------------------------------------------
// Google has two generations of these APIs.
//
//   NEW      places.googleapis.com  (Places API New) and
//            routes.googleapis.com  (Routes API)
//            POST + JSON + an explicit X-Goog-FieldMask.
//
//   LEGACY   maps.googleapis.com/maps/api/*
//            GET + query string. Google now refuses these on projects that
//            never had them enabled: "You're calling a legacy API, which is not
//            enabled for your project."
//
// We try NEW first and fall back to LEGACY, so this works whichever generation
// the Cloud project has switched on. Both paths are normalised to the same
// response shape, so the mobile app never knows which one answered.
// ---------------------------------------------------------------------------

export async function callGoogleJson(
  url: string,
  body: unknown,
  fieldMask: string,
): Promise<{ ok: true; data: any } | { ok: false; status: number; error: string }> {
  const key = serverKey();
  if (!key) return { ok: false, status: 503, error: 'Server key not configured' };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 502, error: 'Could not reach Google Maps' };
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Log server-side only — Google's message can name the project or key.
    console.error(`[maps] ${url} -> HTTP ${res.status}: ${data?.error?.message ?? ''}`);
    const clientStatus = res.status === 429 ? 429 : 502;
    return { ok: false, status: clientStatus, error: `Maps lookup failed (${res.status})` };
  }

  return { ok: true, data };
}

/** Routes API returns durations as a string like "1234s". */
export function parseDuration(d: unknown): number {
  if (typeof d === 'number') return d;
  if (typeof d === 'string') return parseInt(d.replace('s', ''), 10) || 0;
  return 0;
}

/** Calls a LEGACY endpoint and normalises its "HTTP 200 with error status" behaviour. */
export async function callGoogle(
  path: string,
  params: Record<string, string>,
): Promise<{ ok: true; data: any } | { ok: false; status: number; error: string }> {
  const key = serverKey();
  if (!key) return { ok: false, status: 503, error: 'Server key not configured' };

  const qs = new URLSearchParams({ ...params, key }).toString();

  let res: Response;
  try {
    res = await fetch(`https://maps.googleapis.com/maps/api/${path}?${qs}`, { cache: 'no-store' });
  } catch {
    return { ok: false, status: 502, error: 'Could not reach Google Maps' };
  }

  if (!res.ok) return { ok: false, status: res.status, error: `Google returned HTTP ${res.status}` };

  const data = await res.json();
  const status = data?.status;

  if (status && status !== 'OK' && status !== 'ZERO_RESULTS') {
    // Never echo Google's error_message to the client — it can name the key.
    console.error(`[maps] ${path} -> ${status}: ${data?.error_message ?? ''}`);
    const clientStatus = status === 'OVER_QUERY_LIMIT' ? 429 : 502;
    return { ok: false, status: clientStatus, error: `Maps lookup failed (${status})` };
  }

  return { ok: true, data };
}
