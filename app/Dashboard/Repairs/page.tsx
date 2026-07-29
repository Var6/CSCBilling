'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Wrench, X, IndianRupee, CalendarClock, CheckCircle2, Download, Pencil, Trash2 } from 'lucide-react';
import { exportRepairs } from '@/lib/bookExports';
import FileUpload from '@/components/FileUpload';

/**
 * Workshop visits.
 *
 * The paper books never tracked this — the only trace was a driver's duty
 * column occasionally reading "Service for 6362". Those days were imported as
 * zero-cost stubs; everything from here goes in through this page.
 */

type Repair = {
  _id: string;
  date: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleCode: string;
  category: string;
  description: string;
  partsCost: number;
  labourCost: number;
  cost: number;
  odometer: number | null;
  garage: string;
  invoiceNo: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  downtimeDays: number;
  nextDueDate: string | null;
  nextDueOdometer: number | null;
  notes: string;
  billUrl?: string;
  origin: 'sheet' | 'app';
};

type Vehicle = { _id: string; name: string; plate: string; shortCode?: string };

const CATEGORIES = [
  'service', 'repair', 'tyre', 'battery', 'bodywork', 'electrical',
  'cng-kit', 'insurance', 'fitness', 'permit', 'pollution', 'other',
];

const STATUS_STYLES: Record<Repair['status'], string> = {
  scheduled: 'bg-amber-100 text-amber-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-gray-200 text-gray-600',
};

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const vehicleLabel = (v: Vehicle) =>
  // Plates are "PENDING-####" until staff fill in the real registration, so
  // fall back to the short code the books use rather than showing that.
  v.plate?.startsWith('PENDING') ? `${v.name} (${v.shortCode ?? '—'})` : `${v.plate}`;

export default function RepairsPage() {
  const [rows, setRows] = useState<Repair[]>([]);
  const [summary, setSummary] = useState({ cost: 0, downtimeDays: 0, jobs: 0 });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [vehicleId, setVehicleId] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Repair | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (vehicleId) params.set('vehicleId', vehicleId);
      if (status) params.set('status', status);

      const res = await fetch(`/api/repair?${params}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load repairs');
      setRows(json.rows);
      setSummary(json.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, [vehicleId, status]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/vehicle', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setVehicles(Array.isArray(d) ? d : d.rows ?? []))
      .catch(() => setVehicles([]));
  }, []);

  async function complete(id: string) {
    const res = await fetch(`/api/repair/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    if (res.ok) load();
    else setError((await res.json()).error ?? 'Could not update');
  }

  async function remove(row: Repair) {
    if (!confirm(`Delete the ${row.category} job on ${new Date(row.date).toLocaleDateString('en-IN')}?`)) return;
    const res = await fetch(`/api/repair/${row._id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setError(j.error ?? 'Could not delete'); return; }
    load();
  }

  const exportLabel = [
    vehicleId ? (vehicles.find((v) => v._id === vehicleId)?.shortCode ?? 'vehicle') : 'all',
    status || null,
  ].filter(Boolean).join('_');

  return (
    <div className="pb-16">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Repairs & Servicing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Workshop visits, parts, and what is due next.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportRepairs(rows, exportLabel)}
            disabled={!rows.length}
            title="Exports exactly the rows below, with the filters currently applied"
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}
          >
            <Plus className="w-4 h-4" /> Log a job
          </button>
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-45">
          <option value="">All vehicles</option>
          {vehicles.map((v) => <option key={v._id} value={v._id}>{vehicleLabel(v)}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">Any status</option>
          {['scheduled', 'in-progress', 'completed', 'cancelled'].map((s) =>
            <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="Spend" value={rupees(summary.cost)} icon={IndianRupee} />
        <Stat label="Jobs" value={String(summary.jobs)} icon={Wrench} />
        <Stat label="Days off road" value={String(summary.downtimeDays)} icon={CalendarClock} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Vehicle</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 font-medium">Description</th>
                <th className="px-3 py-3 font-medium">Garage</th>
                <th className="px-3 py-3 font-medium text-right">Cost</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Next due</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 whitespace-nowrap">
                    {new Date(r.date).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
                    })}
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">
                    {r.vehiclePlate?.startsWith('PENDING') ? r.vehicleCode : r.vehiclePlate}
                  </td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">{r.category}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-600 max-w-64">
                    <div className="truncate" title={r.description}>{r.description || '—'}</div>
                    {r.origin === 'sheet' && (
                      <div className="text-[11px] text-amber-600">from the duty register — cost not recorded</div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{r.garage || '—'}</td>
                  <td className="px-3 py-3 text-right font-medium text-gray-900">
                    {r.cost ? rupees(r.cost) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                    {r.nextDueDate
                      ? new Date(r.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' })
                      : r.nextDueOdometer ? `${r.nextDueOdometer.toLocaleString('en-IN')} km` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {r.status !== 'completed' && r.status !== 'cancelled' && (
                        <button onClick={() => complete(r._id)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline mr-2">
                          <CheckCircle2 className="w-3.5 h-3.5" /> mark done
                        </button>
                      )}
                      <button onClick={() => { setEditing(r); setShowForm(true); }}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(r)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={9} className="text-center py-16 text-gray-500">
                  No jobs logged yet. Use &ldquo;Log a job&rdquo; to record the first one.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <RepairForm entry={editing} vehicles={vehicles} onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }} />
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><Icon className="w-4 h-4" /></span>
      </div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

function RepairForm({
  entry, vehicles, onClose, onSaved,
}: { entry: Repair | null; vehicles: Vehicle[]; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // An edit opens with the job as recorded, not a blank form.
  const [form, setForm] = useState({
    vehicleId: entry?.vehicleId ?? '',
    date: entry ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    category: entry?.category ?? 'service',
    description: entry?.description ?? '',
    partsCost: entry?.partsCost ? String(entry.partsCost) : '',
    labourCost: entry?.labourCost ? String(entry.labourCost) : '',
    odometer: entry?.odometer != null ? String(entry.odometer) : '',
    garage: entry?.garage ?? '',
    invoiceNo: entry?.invoiceNo ?? '',
    status: (entry?.status ?? 'completed') as string,
    downtimeDays: entry?.downtimeDays ? String(entry.downtimeDays) : '',
    nextDueDate: entry?.nextDueDate ? entry.nextDueDate.slice(0, 10) : '',
    nextDueOdometer: entry?.nextDueOdometer != null ? String(entry.nextDueOdometer) : '',
    notes: entry?.notes ?? '',
  });
  const [billUrl, setBillUrl] = useState(entry?.billUrl ?? '');

  const total = (Number(form.partsCost) || 0) + (Number(form.labourCost) || 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicleId) { setError('Pick a vehicle'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(entry ? `/api/repair/${entry._id}` : '/api/repair', {
        method: entry ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          partsCost: Number(form.partsCost) || 0,
          labourCost: Number(form.labourCost) || 0,
          odometer: form.odometer ? Number(form.odometer) : null,
          downtimeDays: Number(form.downtimeDays) || 0,
          nextDueDate: form.nextDueDate || null,
          nextDueOdometer: form.nextDueOdometer ? Number(form.nextDueOdometer) : null,
          billUrl,
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
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">{entry ? 'Edit workshop job' : 'Log a workshop job'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <L label="Vehicle">
              <select required value={form.vehicleId} className={input}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
                <option value="">Select…</option>
                {vehicles.map((v) => <option key={v._id} value={v._id}>{vehicleLabel(v)}</option>)}
              </select>
            </L>
            <L label="Date">
              <input type="date" required value={form.date} className={input}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </L>
            <L label="Category">
              <select value={form.category} className={input}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </L>
            <L label="Status">
              <select value={form.status} className={input}
                onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {['completed', 'in-progress', 'scheduled', 'cancelled'].map((s) =>
                  <option key={s} value={s}>{s}</option>)}
              </select>
            </L>
          </div>

          <L label="What was done">
            <input value={form.description} className={input}
              placeholder="e.g. engine oil + filter change"
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </L>

          <div className="grid grid-cols-4 gap-3">
            <L label="Parts ₹"><input type="number" min="0" step="0.01" value={form.partsCost} className={input}
              onChange={(e) => setForm({ ...form, partsCost: e.target.value })} /></L>
            <L label="Labour ₹"><input type="number" min="0" step="0.01" value={form.labourCost} className={input}
              onChange={(e) => setForm({ ...form, labourCost: e.target.value })} /></L>
            <L label="Odometer"><input type="number" min="0" value={form.odometer} className={input}
              onChange={(e) => setForm({ ...form, odometer: e.target.value })} /></L>
            <L label="Days off road"><input type="number" min="0" value={form.downtimeDays} className={input}
              onChange={(e) => setForm({ ...form, downtimeDays: e.target.value })} /></L>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <L label="Garage"><input value={form.garage} className={input}
              onChange={(e) => setForm({ ...form, garage: e.target.value })} /></L>
            <L label="Bill / invoice no."><input value={form.invoiceNo} className={input}
              onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })} /></L>
            <L label="Next service due (date)"><input type="date" value={form.nextDueDate} className={input}
              onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} /></L>
            <L label="Next service due (km)"><input type="number" min="0" value={form.nextDueOdometer} className={input}
              onChange={(e) => setForm({ ...form, nextDueOdometer: e.target.value })} /></L>
          </div>

          <FileUpload
            label="Workshop bill (optional)"
            folder="repair-bills"
            value={billUrl}
            onChange={(u) => setBillUrl(u ?? '')}
          />

          <div className="bg-gray-50 rounded-lg p-3 text-sm flex justify-between">
            <span className="text-gray-600">Total bill</span>
            <strong className="text-gray-900">{rupees(total)}</strong>
          </div>

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
              {saving ? 'Saving…' : entry ? 'Save changes' : 'Save job'}
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
