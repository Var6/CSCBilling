import { NextResponse } from 'next/server';
import { RATE_CARD } from '@/lib/rateCard';

/**
 * GET /api/rates — the live CSC Travels fare structure.
 *
 * Consumed by the mobile app (CSCAPK) on launch and on foreground. Public and
 * unauthenticated by design: it is a published price list containing no PII,
 * and the app must be able to read it before a rider signs in.
 *
 * Edit prices in lib/rateCard.ts, bump `version`, deploy.
 */

export const dynamic = 'force-dynamic';

const CORS = {
  // The app is native (no CORS) but Expo Web and the marketing site both fetch this.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET() {
  return NextResponse.json(
    { success: true, rates: RATE_CARD },
    {
      headers: {
        ...CORS,
        // Cheap at the edge, still fresh enough that a fare revision lands fast.
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      },
    },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
