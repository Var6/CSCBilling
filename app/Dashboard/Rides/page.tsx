'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar, Phone, MapPin, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Ride {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  pickup: string;
  drop_location: string;
  pickup_at: string;
  vehicle_type: 'car' | 'bus' | 'traveler';
  trip_type: string;
  passengers: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  is_scheduled: boolean | null;
  driver_id: string | null;
  distance_km: number | null;
  final_fare: number | null;
  estimated_fare: number | null;
  created_at: string;
}

const STATUS_STYLES: Record<Ride['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-200 text-gray-600',
};

export default function RidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'pending' | 'today'>('scheduled');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (filter === 'scheduled') params.set('scheduled', '1');
      if (filter === 'pending') params.set('status', 'pending');
      const res = await fetch(`/api/rides?${params}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      let data = json as Ride[];
      if (filter === 'today') {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setHours(23, 59, 59, 999);
        data = data.filter((r) => {
          const t = new Date(r.pickup_at).getTime();
          return t >= start.getTime() && t <= end.getTime();
        });
      }
      setRides(data);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: Ride['status']) {
    const prev = rides;
    setRides((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const res = await fetch('/api/rides', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      setRides(prev);
      const j = await res.json().catch(() => ({}));
      alert(`Update failed: ${j.error ?? res.statusText}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rides</h1>
          <p className="text-sm text-gray-500">Scheduled and live bookings from the CSC Travel mobile app & website.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['scheduled', 'pending', 'today', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${filter === f ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-lg border bg-white p-10 text-center text-gray-500">Loading rides…</div>
      ) : rides.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center text-gray-500">No rides match this filter.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Pickup → Drop</th>
                <th className="px-4 py-3">Scheduled for</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Fare</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rides.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{r.customer_name}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-500"><Phone className="h-3 w-3" />{r.phone}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[280px]">
                    <div className="flex items-start gap-1 text-gray-700"><MapPin className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" /><span className="line-clamp-1">{r.pickup}</span></div>
                    <div className="flex items-start gap-1 text-gray-700"><MapPin className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" /><span className="line-clamp-1">{r.drop_location}</span></div>
                    {r.distance_km && <div className="mt-0.5 text-xs text-gray-400">{r.distance_km} km · {r.trip_type}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-gray-900">
                      {r.is_scheduled ? <Calendar className="h-3.5 w-3.5 text-orange-500" /> : <Clock className="h-3.5 w-3.5 text-gray-400" />}
                      <span className="font-medium">{new Date(r.pickup_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                    <div className="text-xs text-gray-400">{r.passengers} pax</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{r.vehicle_type}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    ₹{(r.final_fare ?? r.estimated_fare ?? 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.driver_id ? <span className="font-mono text-gray-600">{r.driver_id.slice(0, 8)}…</span> : <span className="text-gray-400">unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {r.status === 'pending' && (
                        <button onClick={() => updateStatus(r.id, 'confirmed')} className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">Confirm</button>
                      )}
                      {r.status !== 'completed' && r.status !== 'cancelled' && (
                        <button onClick={() => updateStatus(r.id, 'cancelled')} className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50" title="Cancel">
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {r.status === 'confirmed' && (
                        <button onClick={() => updateStatus(r.id, 'completed')} className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100" title="Complete">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
