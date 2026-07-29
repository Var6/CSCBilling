import { NextResponse } from 'next/server';
import { CORS, callGoogle, callGoogleJson, missingKey, preflight, rateLimited, serverKey, tooManyRequests } from '@/lib/mapsProxy';

/**
 * GET /api/maps/autocomplete?input=...&sessiontoken=...&location=lat,lng
 *
 * Place-search suggestions for the mobile app's "Where to?" field.
 * Always answers in the legacy `predictions` shape, whichever upstream served it.
 *
 * `sessiontoken` matters for cost: Google bills an autocomplete session as one
 * request rather than per keystroke, provided the same token is passed through
 * to /api/maps/place when the rider picks a result. The app does that.
 */

export const dynamic = 'force-dynamic';

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: { main_text: string; secondary_text: string };
}

export async function GET(req: Request) {
  if (!serverKey()) return missingKey();
  if (rateLimited(req)) return tooManyRequests();

  const { searchParams } = new URL(req.url);
  const input = (searchParams.get('input') ?? '').trim();

  // Short-circuit before spending a billed request.
  if (input.length < 3) {
    return NextResponse.json({ predictions: [] }, { headers: CORS });
  }

  const token = searchParams.get('sessiontoken') ?? undefined;
  const location = searchParams.get('location');
  const near = location && /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(location)
    ? location.split(',').map(Number)
    : null;

  // --- Places API (New) ---
  const body: Record<string, unknown> = {
    input,
    includedRegionCodes: ['in'],
    languageCode: 'en',
    ...(token ? { sessionToken: token } : {}),
  };
  // Bias toward the rider, but never restrict — outstation destinations are
  // hundreds of km away and must stay reachable.
  if (near) {
    body.locationBias = {
      circle: { center: { latitude: near[0], longitude: near[1] }, radius: 50000 },
    };
  }

  const fresh = await callGoogleJson(
    'https://places.googleapis.com/v1/places:autocomplete',
    body,
    'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
  );

  if (fresh.ok) {
    const predictions: Prediction[] = (fresh.data.suggestions ?? [])
      .map((s: any) => s.placePrediction)
      .filter(Boolean)
      .map((p: any) => ({
        place_id: p.placeId,
        description: p.text?.text ?? '',
        structured_formatting: {
          main_text: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
          secondary_text: p.structuredFormat?.secondaryText?.text ?? '',
        },
      }));
    return NextResponse.json({ predictions, source: 'places_new' }, { headers: CORS });
  }

  // --- Legacy Places Autocomplete ---
  const params: Record<string, string> = { input, components: 'country:in', language: 'en' };
  if (token) params.sessiontoken = token;
  if (near) { params.location = `${near[0]},${near[1]}`; params.radius = '50000'; }

  const legacy = await callGoogle('place/autocomplete/json', params);
  if (!legacy.ok) {
    return NextResponse.json(
      { error: legacy.error, predictions: [] },
      { status: legacy.status, headers: CORS },
    );
  }

  return NextResponse.json(
    { predictions: legacy.data.predictions ?? [], source: 'places_legacy' },
    { headers: CORS },
  );
}

export async function OPTIONS() {
  return preflight();
}
