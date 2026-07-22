import { NextResponse } from 'next/server';
import { CORS, callGoogle, missingKey, preflight, rateLimited, serverKey, tooManyRequests } from '@/lib/mapsProxy';

/**
 * GET /api/maps/place?place_id=...&sessiontoken=...
 *
 * Resolves a suggestion the rider tapped into coordinates. Passing back the
 * same sessiontoken used for autocomplete closes the billing session.
 *
 * Always answers in the legacy `{ result: { name, formatted_address, geometry } }`
 * shape, whichever upstream served it.
 *
 * The field mask is fixed here rather than caller-supplied — Places bills by
 * field group, so letting a client ask for everything would be an open cheque.
 */

export const dynamic = 'force-dynamic';

const FIELD_MASK = 'id,displayName,formattedAddress,location';

export async function GET(req: Request) {
  if (!serverKey()) return missingKey();
  if (rateLimited(req)) return tooManyRequests();

  const { searchParams } = new URL(req.url);
  const placeId = (searchParams.get('place_id') ?? '').trim();
  const token = searchParams.get('sessiontoken');

  if (!placeId || !/^[A-Za-z0-9_\-]+$/.test(placeId)) {
    return NextResponse.json({ error: 'valid place_id required' }, { status: 400, headers: CORS });
  }

  // --- Places API (New): GET /v1/places/{id} with a field mask ---
  const key = serverKey()!;
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  url.searchParams.set('languageCode', 'en');
  if (token) url.searchParams.set('sessionToken', token);

  try {
    const res = await fetch(url, {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELD_MASK },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => null);

    if (res.ok && data?.location) {
      return NextResponse.json(
        {
          result: {
            name: data.displayName?.text ?? data.formattedAddress ?? '',
            formatted_address: data.formattedAddress ?? '',
            geometry: { location: { lat: data.location.latitude, lng: data.location.longitude } },
          },
          source: 'places_new',
        },
        { headers: CORS },
      );
    }

    console.error(`[maps] places_new details -> HTTP ${res.status}: ${data?.error?.message ?? ''}`);
  } catch {
    console.error('[maps] places_new details -> network error');
  }

  // --- Legacy Place Details ---
  const params: Record<string, string> = {
    place_id: placeId,
    fields: 'name,formatted_address,geometry',
    language: 'en',
  };
  if (token) params.sessiontoken = token;

  const legacy = await callGoogle('place/details/json', params);
  if (!legacy.ok) {
    return NextResponse.json({ error: legacy.error }, { status: legacy.status, headers: CORS });
  }

  return NextResponse.json(
    { result: legacy.data.result ?? null, source: 'places_legacy' },
    { headers: CORS },
  );
}

export async function OPTIONS() {
  return preflight();
}
