'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, RefreshCw, TrendingUp, Fuel, Receipt, Wallet, Plus, X, Download, Pencil, Trash2,
} from 'lucide-react';
import { exportSettlements } from '@/lib/bookExports';

/**
 * The daily book — the register the office used to keep in Excel, one row per
 * driver per duty.
 *
 * Note the two different money columns: "Takings" is what the driver collected
 * that day, while "In hand" adds the float they were already carrying. The
 * spreadsheet only ever showed the second one, which is why its "Total" column
 * cannot be summed into a revenue figure.
 */

type Settlement = {
  _id: string;
  date: string;
  driverName: string;
  driverId: string;
  shift: 'day' | 'night' | null;
  dutyType: 'day' | 'night' | 'leave' | 'off' | 'service' | 'unknown';
  dutyNote: string;
  openingBalance: number;
  earnings: Record<string, number>;
  totalEarnings: number;
  cashInHand: number;
  fuelExpense: number;
  tollExpense: number;
  totalExpense: number;
  netTotal: number;
  transferToBank: number;
  cashGiven: number;
  closingBalance: number;
  computedClosingBalance: number;
  discrepancy: boolean;
  discrepancyKind: string[];
  conflicts?: { sheet: string; totalEarnings: number }[];
  notes: string[];
  origin: 'sheet' | 'app';
};

type Summary = {
  totalEarnings: number; fuelExpense: number; tollExpense: number;
  totalExpense: number; transferToBank: number; cashGiven: number;
  duties: number; netTotal: number;
};

type Driver = { _id: string; name: string };

const CHANNELS = [
  ['uber', 'Uber'],
  ['uberCash', 'Uber Cash'],
  ['rapidoCash', 'Rapido Cash'],
  ['rapidoAccount', 'Rapido A/c'],
  ['upiBank', 'UPI (Bank)'],
  ['personalUpi', 'Personal UPI'],
  ['offline', 'Offline'],
  ['advance', 'Advance'],
] as const;

const DUTY_STYLES: Record<Settlement['dutyType'], string> = {
  day: 'bg-blue-100 text-blue-700',
  night: 'bg-indigo-100 text-indigo-700',
  leave: 'bg-amber-100 text-amber-700',
  off: 'bg-gray-200 text-gray-600',
  service: 'bg-purple-100 text-purple-700',
  unknown: 'bg-gray-100 text-gray-500',
};

const rupees = (n: number) =>
  `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Current month as YYYY-MM, which is what the API expects. */
function currentMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function DailyBookPage() {
  const [rows, setRows] = useState<Settlement[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [month, setMonth] = useState(currentMonth());
  const [driverId, setDriverId] = useState('');
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Settlement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ month, limit: '500' });
      if (driverId) params.set('driverId', driverId);
      if (onlyFlagged) params.set('discrepancy', 'true');

      const res = await fetch(`/api/settlement?${params}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load the daily book');

      setRows(json.rows);
      setSummary(json.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [month, driverId, onlyFlagged]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/driver', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setDrivers(Array.isArray(d) ? d : d.rows ?? []))
      .catch(() => setDrivers([]));
  }, []);

  // Group by date so the page reads like the register it replaces.
  const byDate = useMemo(() => {
    const map = new Map<string, Settlement[]>();
    for (const r of rows) {
      const key = r.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  async function remove(row: Settlement) {
    if (!confirm(`Delete ${row.driverName}'s duty on ${row.date.slice(0, 10)}?`)) return;
    const res = await fetch(`/api/settlement/${row._id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setError(j.error ?? 'Could not delete'); return; }
    if (j.note) alert(j.note);
    load();
  }

  const flaggedCount = rows.filter((r) => r.discrepancy).length;

  // Names the file after the filters in force, so two exports never collide.
  const exportLabel = [
    month,
    driverId ? (drivers.find((d) => d._id === driverId)?.name ?? 'driver') : null,
    onlyFlagged ? 'needs-review' : null,
  ].filter(Boolean).join('_');

  return (
    <div className="pb-16">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Daily Book</h1>
          <p className="text-sm text-gray-500 mt-1">
            Driver takings and expenses, one row per duty.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportSettlements(rows, exportLabel)}
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
            <Plus className="w-4 h-4" /> Add duty
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <select
          value={driverId}
          onChange={(e) => setDriverId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-45"
        >
          <option value="">All drivers</option>
          {drivers.map((d) => (
            <option key={d._id} value={d._id}>{d.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={onlyFlagged}
            onChange={(e) => setOnlyFlagged(e.target.checked)}
          />
          Only rows needing review
        </label>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard label="Takings" value={rupees(summary.totalEarnings)} icon={TrendingUp} tone="emerald"
            hint={`${summary.duties} duties`} />
          <StatCard label="Fuel" value={rupees(summary.fuelExpense)} icon={Fuel} tone="orange" />
          <StatCard label="Toll & other" value={rupees(summary.tollExpense)} icon={Receipt} tone="orange" />
          <StatCard label="Net" value={rupees(summary.netTotal)} icon={Wallet} tone="blue"
            hint="takings − expenses" />
          <StatCard
            label="Needs review"
            value={String(flaggedCount)}
            icon={AlertTriangle}
            tone={flaggedCount ? 'amber' : 'gray'}
            hint="book vs arithmetic"
          />
        </div>
      )}

      {loading && rows.length === 0 && (
        <div className="text-center py-16 text-gray-500">Loading the book…</div>
      )}

      {!loading && rows.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          No duties recorded for this month.
        </div>
      )}

      {/* The book */}
      <div className="space-y-6">
        {byDate.map(([date, dayRows]) => {
          const dayTakings = dayRows.reduce((a, r) => a + r.totalEarnings, 0);
          const dayExpense = dayRows.reduce((a, r) => a + r.totalExpense, 0);

          return (
            <div key={date} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                <div className="font-medium text-gray-900">
                  {new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
                    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
                  })}
                </div>
                <div className="text-sm text-gray-600">
                  Takings <strong className="text-gray-900">{rupees(dayTakings)}</strong>
                  <span className="mx-2 text-gray-300">|</span>
                  Expenses <strong className="text-gray-900">{rupees(dayExpense)}</strong>
                  <span className="mx-2 text-gray-300">|</span>
                  Net <strong className="text-gray-900">{rupees(dayTakings - dayExpense)}</strong>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="px-5 py-2 font-medium">Driver</th>
                      <th className="px-3 py-2 font-medium">Duty</th>
                      <th className="px-3 py-2 font-medium text-right">Opening</th>
                      <th className="px-3 py-2 font-medium text-right">Takings</th>
                      <th className="px-3 py-2 font-medium text-right">In hand</th>
                      <th className="px-3 py-2 font-medium text-right">Fuel</th>
                      <th className="px-3 py-2 font-medium text-right">Toll</th>
                      <th className="px-3 py-2 font-medium text-right">Net</th>
                      <th className="px-3 py-2 font-medium text-right">To bank</th>
                      <th className="px-3 py-2 font-medium text-right">Cash in</th>
                      <th className="px-3 py-2 font-medium text-right">Carried</th>
                      <th className="px-5 py-2 font-medium text-right">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayRows.map((r) => (
                      <tr key={r._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{r.driverName}</span>
                            {r.discrepancy && (
                              <span
                                title={`The book and the arithmetic disagree on: ${r.discrepancyKind.join(', ')}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-amber-100 text-amber-700"
                              >
                                <AlertTriangle className="w-3 h-3" /> check
                              </span>
                            )}
                          </div>
                          {r.notes.length > 0 && (
                            <div className="text-[11px] text-gray-400 mt-0.5">{r.notes.join(' · ')}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-xs ${DUTY_STYLES[r.dutyType]}`}>
                            {r.dutyType}
                          </span>
                          {r.dutyNote && (
                            <div className="text-[11px] text-gray-400 mt-0.5 max-w-40 truncate" title={r.dutyNote}>
                              {r.dutyNote}
                            </div>
                          )}
                        </td>
                        <Money v={r.openingBalance} />
                        <Money v={r.totalEarnings} bold />
                        <Money v={r.cashInHand} muted />
                        <Money v={r.fuelExpense} />
                        <Money v={r.tollExpense} />
                        <Money v={r.netTotal} bold />
                        <Money v={r.transferToBank} />
                        <Money v={r.cashGiven} />
                        <td className="px-3 py-2.5 text-right">
                          <span className={r.closingBalance < 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>
                            {rupees(r.closingBalance)}
                          </span>
                          {Math.abs(r.closingBalance - r.computedClosingBalance) > 1 && (
                            <div
                              className="text-[11px] text-amber-600"
                              title="What the book carried forward differs from what the arithmetic gives."
                            >
                              calc {rupees(r.computedClosingBalance)}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right whitespace-nowrap">
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
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <AddDutyForm
          entry={editing}
          drivers={drivers}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Money({ v, bold, muted }: { v: number; bold?: boolean; muted?: boolean }) {
  return (
    <td className={`px-3 py-2.5 text-right ${bold ? 'font-medium text-gray-900' : muted ? 'text-gray-400' : 'text-gray-700'}`}>
      {v ? rupees(v) : <span className="text-gray-300">—</span>}
    </td>
  );
}

function StatCard({
  label, value, icon: Icon, tone, hint,
}: {
  label: string; value: string; icon: React.ElementType;
  tone: 'emerald' | 'orange' | 'blue' | 'amber' | 'gray'; hint?: string;
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    gray: 'bg-gray-100 text-gray-400',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`p-1.5 rounded-lg ${tones[tone]}`}><Icon className="w-4 h-4" /></span>
      </div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="text-[11px] text-gray-400 mt-0.5">{hint}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AddDutyForm({
  entry, drivers, onClose, onSaved,
}: {
  entry: Settlement | null; drivers: Driver[]; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: entry ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    driverId: entry?.driverId ?? '',
    dutyType: (entry?.dutyType ?? 'day') as string,
    dutyNote: entry?.dutyNote ?? '',
    transferToBank: entry?.transferToBank ? String(entry.transferToBank) : '',
    cashGiven: entry?.cashGiven ? String(entry.cashGiven) : '',
  });
  const [earnings, setEarnings] = useState<Record<string, string>>(
    Object.fromEntries(CHANNELS.map(([k]) => [k, entry?.earnings?.[k] ? String(entry.earnings[k]) : ''])),
  );

  /*
   * Itemised expenses. A duty routinely has two or three CNG fills and a toll
   * both ways; one box per category forced staff to add them up on a phone
   * calculator first. Each line is amount + optional note, and the totals sum
   * live.
   */
  type Line = { amount: string; note: string };
  const fromStored = (rows?: { amount: number; note?: string }[], lump?: number): Line[] => {
    if (rows?.length) return rows.map((r) => ({ amount: String(r.amount), note: r.note ?? '' }));
    if (lump) return [{ amount: String(lump), note: '' }];
    return [];
  };
  const [fuelLines, setFuelLines] = useState<Line[]>(
    fromStored((entry as never as { fuelEntries?: { amount: number; note?: string }[] })?.fuelEntries, entry?.fuelExpense),
  );
  const [tollLines, setTollLines] = useState<Line[]>(
    fromStored((entry as never as { tollEntries?: { amount: number; note?: string }[] })?.tollEntries, entry?.tollExpense),
  );

  /*
   * Auto-population. Picking a driver pulls their assigned vehicle, their usual
   * shift, and the float they are currently holding — so the person entering
   * the book types money, not context the system already knows.
   */
  const [prefill, setPrefill] = useState<{
    vehicle: string | null;
    openingBalance: number;
    defaultShift: string | null;
  } | null>(null);

  useEffect(() => {
    if (!form.driverId || entry) { setPrefill(null); return; }
    let cancelled = false;
    fetch(`/api/driver/${form.driverId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setPrefill({
          vehicle: d.vehicle ?? null,
          openingBalance: Number(d.currentBalance) || 0,
          defaultShift: d.defaultShift ?? null,
        });
        if (d.defaultShift) setForm((f) => ({ ...f, dutyType: d.defaultShift }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.driverId]);

  /*
   * A driver on leave earns and spends nothing — asking for eight collection
   * channels and expense lines on their day off was just noise. Off-duty types
   * collapse the form to date, driver and a note, and save zeros.
   */
  const offDuty = form.dutyType === 'leave' || form.dutyType === 'off';

  const sumLines = (rows: Line[]) => rows.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  const takings = offDuty ? 0 : CHANNELS.reduce((a, [k]) => a + (Number(earnings[k]) || 0), 0);
  const expense = offDuty ? 0 : sumLines(fuelLines) + sumLines(tollLines);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.driverId) { setError('Pick a driver'); return; }
    setSaving(true); setError(null);
    try {
      const toEntries = (rows: Line[]) =>
        rows
          .map((r) => ({ amount: Number(r.amount) || 0, note: r.note.trim() }))
          .filter((r) => r.amount > 0);

      const payload = offDuty
        ? {
            ...form,
            earnings: Object.fromEntries(CHANNELS.map(([k]) => [k, 0])),
            fuelEntries: [], tollEntries: [],
            fuelExpense: 0, tollExpense: 0,
            transferToBank: 0, cashGiven: 0,
          }
        : {
            ...form,
            transferToBank: Number(form.transferToBank) || 0,
            cashGiven: Number(form.cashGiven) || 0,
            earnings: Object.fromEntries(CHANNELS.map(([k]) => [k, Number(earnings[k]) || 0])),
            fuelEntries: toEntries(fuelLines),
            tollEntries: toEntries(tollLines),
          };

      const res = await fetch(entry ? `/api/settlement/${entry._id}` : '/api/settlement', {
        method: entry ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Could not save');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const lineEditor = (
    label: string, lines: Line[], setLines: (l: Line[]) => void, notePlaceholder: string,
  ) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">{rupees(sumLines(lines))}</span>
      </div>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-2">
            <input type="number" min="0" step="0.01" placeholder="₹" value={line.amount}
              onChange={(e) => setLines(lines.map((l, j) => (j === i ? { ...l, amount: e.target.value } : l)))}
              className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
            <input placeholder={notePlaceholder} value={line.note}
              onChange={(e) => setLines(lines.map((l, j) => (j === i ? { ...l, note: e.target.value } : l)))}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
            <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))}
              className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Remove line">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setLines([...lines, { amount: '', note: '' }])}
          className="w-full px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs text-gray-600 hover:bg-gray-50">
          + Add {label.toLowerCase()} line
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">{entry ? 'Edit duty' : 'Add a duty'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date">
              <input type="date" required value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </Field>
            <Field label="Driver">
              <select required value={form.driverId} disabled={Boolean(entry)}
                onChange={(e) => setForm({ ...form, driverId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Select…</option>
                {drivers.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Duty type">
              <select value={form.dutyType}
                onChange={(e) => setForm({ ...form, dutyType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {['day', 'night', 'leave', 'off', 'service'].map((t) =>
                  <option key={t} value={t}>{t === 'leave' ? 'leave / absent' : t}</option>)}
              </select>
            </Field>
            <Field label="Note (optional)">
              <input value={form.dutyNote} placeholder={offDuty ? 'e.g. medical leave' : 'e.g. 9AM to 10PM'}
                onChange={(e) => setForm({ ...form, dutyNote: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </Field>
          </div>

          {prefill && !offDuty && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex flex-wrap gap-x-6 gap-y-1">
              <span>Vehicle: <strong>{prefill.vehicle ?? 'none assigned'}</strong></span>
              <span>Carrying forward: <strong>{rupees(prefill.openingBalance)}</strong></span>
              {prefill.defaultShift && <span>Usual shift: <strong>{prefill.defaultShift}</strong></span>}
            </div>
          )}

          {offDuty ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              Marked as {form.dutyType === 'leave' ? 'leave / absent' : 'off duty'} — no
              collections or expenses will be asked for. Their float carries
              forward unchanged.
            </div>
          ) : (
            <>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Collected</div>
                <div className="grid grid-cols-4 gap-3">
                  {CHANNELS.map(([key, label]) => (
                    <Field key={key} label={label} small>
                      <input type="number" min="0" step="0.01" placeholder="0"
                        value={earnings[key] ?? ''}
                        onChange={(e) => setEarnings({ ...earnings, [key]: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                    </Field>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {lineEditor('Fuel / CNG', fuelLines, setFuelLines, 'e.g. morning fill, IOCL pump')}
                {lineEditor('Toll & other', tollLines, setTollLines, 'e.g. Didarganj toll, parking')}
              </div>

              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Handed over</div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="To bank" small>
                    <input type="number" min="0" step="0.01" placeholder="0" value={form.transferToBank}
                      onChange={(e) => setForm({ ...form, transferToBank: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                  </Field>
                  <Field label="Cash to office" small>
                    <input type="number" min="0" step="0.01" placeholder="0" value={form.cashGiven}
                      onChange={(e) => setForm({ ...form, cashGiven: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                  </Field>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Takings</span><strong className="text-gray-900">{rupees(takings)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Expenses</span><strong className="text-gray-900">{rupees(expense)}</strong>
                </div>
                {prefill && (
                  <div className="flex justify-between">
                    <span>Will carry forward</span>
                    <strong className="text-gray-900">
                      {rupees(prefill.openingBalance + takings - expense
                        - (Number(form.transferToBank) || 0) - (Number(form.cashGiven) || 0))}
                    </strong>
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}>
              {saving ? 'Saving…' : entry ? 'Save changes' : offDuty ? 'Mark day' : 'Save duty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, children, small,
}: { label: string; children: React.ReactNode; small?: boolean }) {
  return (
    <label className="block">
      <span className={`block mb-1 text-gray-600 ${small ? 'text-[11px]' : 'text-xs'}`}>{label}</span>
      {children}
    </label>
  );
}
