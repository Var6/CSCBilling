import { NextResponse } from 'next/server';
import {
  CORS, callGoogle, callGoogleJson, missingKey, parseDuration, preflight,
  rateLimited, serverKey, tooManyRequests,
} from '@/lib/mapsProxy';

/**
 * GET /api/maps/directions?origin=lat,lng&destination=lat,lng
 *
 * Road distance + duration for fare calculation, plus an encoded polyline so
 * the app can draw the route.
 *
 * Three tiers, best first:
 *   1. Routes API              — current generation; distance, traffic ETA, polyline.
 *   2. Legacy Directions API   — same data, only on projects that still have it.
 *   3. Legacy Distance Matrix  — distance + duration but NO polyline.
 *
 * On tier 3 the app keeps Google's road distance (the fare depends on it) and
 * draws the line from OSRM instead, so an empty polyline is not an error.
 *
 * Response is identical whichever tier answered:
 *   { source, distanceMeters, durationSeconds, polyline }
 */

export const dynamic = 'force-dynamic';

const LATLNG = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;

export async function GET(req: Request) {
  if (!serverKey()) return missingKey();
  if (rateLimited(req)) return tooManyRequests();

  const { searchParams } = new URL(req.url);
  const origin = (searchParams.get('origin') ?? '').trim();
  const destination = (searchParams.get('destination') ?? '').trim();

  // Coordinates only — free text would let a caller run billed geocoding here.
  if (!LATLNG.test(origin) || !LATLNG.test(destination)) {
    return NextResponse.json(
      { error: 'origin and destination must be "lat,lng"' },
      { status: 400, headers: CORS },
    );
  }

  const [oLat, oLng] = origin.split(',').map(Number);
  const [dLat, dLng] = destination.split(',').map(Number);

  // --- Tier 1: Routes API ---
  const routes = await callGoogleJson(
    'https://routes.googleapis.com/directions/v2:computeRoutes',
    {
      origin: { location: { latLng: { latitude: oLat, longitude: oLng } } },
      destination: { location: { latLng: { latitude: dLat, longitude: dLng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      polylineEncoding: 'ENCODED_POLYLINE',
      regionCode: 'IN',
      languageCode: 'en',
    },
    'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
  );

  if (routes.ok && routes.data.routes?.length) {
    const r = routes.data.routes[0];
    return NextResponse.json(
      {
        source: 'routes_api',
        distanceMeters: r.distanceMeters ?? 0,
        durationSeconds: parseDuration(r.duration),
        polyline: r.polyline?.encodedPolyline ?? '',
      },
      { headers: CORS },
    );
  }

  // --- Tier 2: Legacy Directions ---
  const directions = await callGoogle('directions/json', {
    origin, destination, mode: 'driving', departure_time: 'now', region: 'in',
  });

  if (directions.ok && directions.data.routes?.length) {
    const route = directions.data.routes[0];
    const legs = route.legs ?? [];
    return NextResponse.json(
      {
        source: 'directions_legacy',
        distanceMeters: legs.reduce((s: number, l: any) => s + (l.distance?.value ?? 0), 0),
        durationSeconds: legs.reduce(
          (s: number, l: any) => s + (l.duration_in_traffic?.value ?? l.duration?.value ?? 0), 0),
        polyline: route.overview_polyline?.points ?? '',
      },
      { headers: CORS },
    );
  }

  // --- Tier 3: Legacy Distance Matrix (no geometry) ---
  const matrix = await callGoogle('distancematrix/json', {
    origins: origin, destinations: destination, mode: 'driving', departure_time: 'now', region: 'in',
  });

  if (!matrix.ok) {
    return NextResponse.json({ error: matrix.error }, { status: matrix.status, headers: CORS });
  }

  const element = matrix.data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') {
    return NextResponse.json({ error: 'No route found between those points' }, { status: 404, headers: CORS });
  }

  return NextResponse.json(
    {
      source: 'distance_matrix_legacy',
      distanceMeters: element.distance?.value ?? 0,
      durationSeconds: element.duration_in_traffic?.value ?? element.duration?.value ?? 0,
      polyline: '',
    },
    { headers: CORS },
  );
}

export async function OPTIONS() {
  return preflight();
}
