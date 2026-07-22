'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Fuel, Gauge, X, IndianRupee, Download, Pencil, Trash2 } from 'lucide-react';
import { exportFuel } from '@/lib/bookExports';

/**
 * The fuel / CNG book.
 *
 * Mileage is only shown where two consecutive odometer readings on the same
 * vehicle produced a believable figure — the paper book mixes odometer and
 * trip-meter values, so a raw difference is often nonsense. Blank means "we
 * cannot tell from what was written down", not "zero".
 */

type FuelLog = {
  _id: string;
  date: string;
  driverName: string;
  vehicleCode: string;
  vehiclePlate: string;
  amount: number;
  quantity: number;
  ratePerUnit: number;
  meterReading: number | null;
  meterNote: string;
  kmSinceLast: number | null;
  mileage: number | null;
  origin: 'sheet' | 'app';
  driverId?: string;
  vehicleId?: string | null;
  fuelType?: string;
  notes?: string;
  amended?: boolean;
};

type Driver = { _id: string; name: string };
type Vehicle = { _id: string; name: string; plate: string; shortCode?: string };

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const vehicleLabel = (v: Vehicle) =>
  v.plate?.startsWith('PENDING') ? `${v.name} (${v.shortCode ?? '—'})` : v.plate;

function currentMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function FuelPage() {
  const [rows, setRows] = useState<FuelLog[]>([]);
  const [summary, setSummary] = useState({
    amount: 0, quantity: 0, fills: 0,
    avgMileage: null as number | null, avgRate: null as number | null,
  });
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [month, setMonth] = useState(currentMonth());
  const [vehicleId, setVehicleId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FuelLog | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ month, limit: '500' });
      if (vehicleId) params.set('vehicleId', vehicleId);
      const res = await fetch(`/api/fuel?${params}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load fuel logs');
      setRows(json.rows);
      setSummary(json.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, [month, vehicleId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/driver', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setDrivers(Array.isArray(d) ? d : d.rows ?? []))
      .catch(() => setDrivers([]));
    fetch('/api/vehicle', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setVehicles(Array.isArray(d) ? d : d.rows ?? []))
      .catch(() => setVehicles([]));
  }, []);

  async function remove(row: FuelLog) {
    if (!confirm(`Delete the ${row.driverName} fill on ${new Date(row.date).toLocaleDateString('en-IN')}?`)) return;
    const res = await fetch(`/api/fuel/${row._id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setError(j.error ?? 'Could not delete'); return; }
    load();
  }

  const exportLabel = [
    month,
    vehicleId ? (vehicles.find((v) => v._id === vehicleId)?.shortCode ?? 'vehicle') : null,
  ].filter(Boolean).join('_');

  return (
    <div className="pb-16">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Fuel & CNG</h1>
          <p className="text-sm text-gray-500 mt-1">
            Every fill, with the odometer reading that makes mileage measurable.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportFuel(rows, exportLabel)}
            disabled={!rows.length}
            title="Exports exactly the rows below, with the filters currently applied"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}>
            <Plus className="w-4 h-4" /> Add fill
          </button>
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-45">
          <option value="">All vehicles</option>
          {vehicles.map((v) => <option key={v._id} value={v._id}>{vehicleLabel(v)}</option>)}
        </select>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Spend" value={rupees(summary.amount)} icon={IndianRupee} hint={`${summary.fills} fills`} />
        <Stat label="Quantity" value={`${summary.quantity} kg/L`} icon={Fuel} />
        <Stat label="Avg rate" value={summary.avgRate ? `₹${summary.avgRate}` : '—'} icon={IndianRupee} hint="per kg/L" />
        <Stat label="Avg mileage" value={summary.avgMileage ? `${summary.avgMileage} km` : '—'}
          icon={Gauge} hint="per kg/L, where measurable" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Driver</th>
                <th className="px-3 py-3 font-medium">Vehicle</th>
                <th className="px-3 py-3 font-medium text-right">Amount</th>
                <th className="px-3 py-3 font-medium text-right">Qty</th>
                <th className="px-3 py-3 font-medium text-right">Rate</th>
                <th className="px-3 py-3 font-medium text-right">Odometer</th>
                <th className="px-3 py-3 font-medium text-right">Km run</th>
                <th className="px-3 py-3 font-medium text-right">Mileage</th>
                <th className="px-5 py-3 font-medium text-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 whitespace-nowrap">
                    {new Date(r.date).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', timeZone: 'UTC',
                    })}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">{r.driverName}</td>
                  <td className="px-3 py-3 text-gray-600">{r.vehicleCode || <span className="text-gray-300">not recorded</span>}</td>
                  <td className="px-3 py-3 text-right font-medium text-gray-900">{rupees(r.amount)}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{r.quantity || '—'}</td>
                  <td className="px-3 py-3 text-right text-gray-600">{r.ratePerUnit ? `₹${r.ratePerUnit}` : '—'}</td>
                  <td className="px-3 py-3 text-right text-gray-600">
                    {r.meterReading != null
                      ? r.meterReading.toLocaleString('en-IN')
                      : r.meterNote
                        ? <span className="text-[11px] text-amber-600" title="Non-numeric reading in the book">{r.meterNote}</span>
                        : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600">{r.kmSinceLast ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-3 text-right">
                    {r.mileage
                      ? <span className="font-medium text-gray-900">{r.mileage} km</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => { setEditing(r); setShowForm(true); }}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(r)}
                      className="p-1.5 rounded hover:bg-red-50 text-red-500 ml-1" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={10} className="text-center py-16 text-gray-500">No fills recorded this month.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <FuelForm entry={editing} drivers={drivers} vehicles={vehicles}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, hint }: {
  label: string; value: string; icon: React.ElementType; hint?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="p-1.5 rounded-lg bg-orange-50 text-orange-600"><Icon className="w-4 h-4" /></span>
      </div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="text-[11px] text-gray-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function FuelForm({
  entry, drivers, vehicles, onClose, onSaved,
}: {
  entry: FuelLog | null; drivers: Driver[]; vehicles: Vehicle[];
  onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // An edit opens with what is already recorded, not a blank form.
  const [form, setForm] = useState({
    date: entry ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    driverId: entry?.driverId ?? '',
    vehicleId: entry?.vehicleId ?? '',
    amount: entry ? String(entry.amount) : '',
    quantity: entry?.quantity ? String(entry.quantity) : '',
    meterReading: entry?.meterReading != null ? String(entry.meterReading) : '',
    fuelType: entry?.fuelType ?? 'cng',
    notes: entry?.notes ?? '',
  });

  const rate = Number(form.quantity) > 0
    ? Math.round((Number(form.amount) / Number(form.quantity)) * 100) / 100
    : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.driverId) { setError('Pick a driver'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(entry ? `/api/fuel/${entry._id}` : '/api/fuel', {
        method: entry ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount) || 0,
          quantity: Number(form.quantity) || 0,
          meterReading: form.meterReading ? Number(form.meterReading) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not save');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setSaving(false); }
  }

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{entry ? 'Edit fill' : 'Add a fill'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <L label="Date">
              <input type="date" required value={form.date} className={input}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </L>
            <L label="Driver">
              <select required value={form.driverId} className={input}
                onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
                <option value="">Select…</option>
                {drivers.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </L>
            <L label="Vehicle">
              <select value={form.vehicleId} className={input}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
                <option value="">Not recorded</option>
                {vehicles.map((v) => <option key={v._id} value={v._id}>{vehicleLabel(v)}</option>)}
              </select>
            </L>
            <L label="Fuel type">
              <select value={form.fuelType} className={input}
                onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
                {['cng', 'petrol', 'diesel', 'other'].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </L>
            <L label="Amount ₹">
              <input type="number" min="0" step="0.01" required value={form.amount} className={input}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </L>
            <L label="Quantity (kg/L)">
              <input type="number" min="0" step="0.001" value={form.quantity} className={input}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </L>
          </div>

          <L label="Odometer reading">
            <input type="number" min="0" step="0.1" value={form.meterReading} className={input}
              placeholder="Total km on the dash — not the trip meter"
              onChange={(e) => setForm({ ...form, meterReading: e.target.value })} />
          </L>

          {rate && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm flex justify-between">
              <span className="text-gray-600">Rate</span>
              <strong className="text-gray-900">₹{rate} per kg/L</strong>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}>
              {saving ? 'Saving…' : entry ? 'Save changes' : 'Save fill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1 text-xs text-gray-600">{label}</span>
      {children}
    </label>
  );
}
