import { NextResponse } from 'next/server';

// Reads bookings from the Supabase project shared with the CSC Travel website and mobile apps.
// Env vars (set in .env.local and Vercel):
//   SUPABASE_URL              -> https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY -> service-role key (server-only)

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const onlyScheduled = searchParams.get('scheduled') === '1';
  const status = searchParams.get('status');

  const params = new URLSearchParams({
    select: 'id,customer_name,phone,email,pickup,drop_location,pickup_at,vehicle_type,trip_type,passengers,status,is_scheduled,driver_id,distance_km,final_fare,estimated_fare,created_at',
    order: 'pickup_at.asc',
    limit: '200',
  });
  if (onlyScheduled) params.append('is_scheduled', 'eq.true');
  if (status) params.append('status', `eq.${status}`);

  const res = await fetch(`${url}/rest/v1/bookings?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

export async function PATCH(req: Request) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 500 });
  }
  const body = await req.json();
  const { id, ...patch } = body ?? {};
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const res = await fetch(`${url}/rest/v1/bookings?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
