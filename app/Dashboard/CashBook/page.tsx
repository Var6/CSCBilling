'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus, RefreshCw, X, IndianRupee, Wallet, AlertTriangle, Pencil, Trash2, Download,
} from 'lucide-react';
import { exportToExcel } from '@/lib/exportToExcel';

/**
 * The company cash book.
 *
 * Separate from the daily book on purpose: this tracks what moved through the
 * company's own cash box and bank accounts — salaries, insurance, challans,
 * car rent — including things no driver ever touches. The two overlap on fuel
 * and toll, so their totals must not be added together.
 */

const CREDITS = [
  ['onlineRide', 'Online Ride'], ['offlineRide', 'Offline Ride'], ['rental', 'Rental'],
  ['school', 'School'], ['bySudhirSir', 'By Sudhir Sir'], ['byOther', 'By Other'],
] as const;

const DEBITS = [
  ['petrol', 'Petrol'], ['cng', 'CNG'], ['toll', 'Toll'], ['repair', 'Repair'],
  ['salary', 'Salary'], ['schoolSalary', 'School Salary'], ['challan', 'Challan'],
  ['carRent', 'Car Rent'], ['insurance', 'Insurance'], ['other', 'Other'],
] as const;

const ACCOUNTS = ['cash', 'bank', 'icici', 'boi'] as const;
type Account = (typeof ACCOUNTS)[number];

type Entry = {
  _id: string;
  date: string;
  account: Account;
  credits: Record<string, number>;
  debits: Record<string, number>;
  totalCredit: number;
  totalDebit: number;
  opening: number;
  closing: number;
  computedClosing: number;
  discrepancy: boolean;
  remarks: string;
  origin: 'sheet' | 'app';
  amended?: boolean;
};

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const day = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function CashBookPage() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [summary, setSummary] = useState({ totalCredit: 0, totalDebit: 0, net: 0, days: 0, unbalanced: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [account, setAccount] = useState<'' | Account>('');
  const [editing, setEditing] = useState<Entry | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ limit: '400' });
      if (account) params.set('account', account);
      const res = await fetch(`/api/cashbook?${params}`, { cache: 'no-store' });
      const text = await res.text();
      if (!res.ok) {
        let msg = `Could not load the cash book (${res.status})`;
        try { msg = JSON.parse(text)?.error ?? msg; } catch { /* keep default */ }
        throw new Error(msg);
      }
      const json = JSON.parse(text);
      setRows(json.rows); setSummary(json.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, [account]);

  useEffect(() => { load(); }, [load]);

  async function remove(row: Entry) {
    if (!confirm(`Delete the ${row.account} entry for ${day(row.date)}?`)) return;
    const res = await fetch(`/api/cashbook/${row._id}`, { method: 'DELETE' });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setError(j.error ?? 'Could not delete'); return; }
    if (j.note) alert(j.note);
    load();
  }

  function exportRows() {
    exportToExcel(
      `cash-book_${account || 'all'}`, 'Cash Book',
      ['Date', 'Account', ...CREDITS.map(([, l]) => l), ...DEBITS.map(([, l]) => l),
       'Total in', 'Total out', 'Opening', 'Closing', 'Closing (calculated)', 'Balanced', 'Remarks', 'Source'],
      rows.map((r) => [
        r.date.slice(0, 10), r.account,
        ...CREDITS.map(([k]) => r.credits?.[k] ?? 0),
        ...DEBITS.map(([k]) => r.debits?.[k] ?? 0),
        r.totalCredit, r.totalDebit, r.opening, r.closing, r.computedClosing,
        r.discrepancy ? 'no' : 'yes', r.remarks ?? '',
        r.origin === 'sheet' ? (r.amended ? 'workbook (amended)' : 'workbook') : 'entered in app',
      ]),
    );
  }

  return (
    <div className="pb-16">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cash Book</h1>
          <p className="text-sm text-gray-500 mt-1">
            Company cash and bank movement — salaries, insurance, challans and the rest.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportRows} disabled={!rows.length}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}>
            <Plus className="w-4 h-4" /> Add a day
          </button>
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <select value={account} onChange={(e) => setAccount(e.target.value as '' | Account)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All accounts</option>
          {ACCOUNTS.map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}
        </select>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Money in" value={rupees(summary.totalCredit)} icon={IndianRupee} />
        <Stat label="Money out" value={rupees(summary.totalDebit)} icon={IndianRupee} />
        <Stat label="Net" value={rupees(summary.net)} icon={Wallet} hint={`${summary.days} days recorded`} />
        <Stat label="Unbalanced" value={String(summary.unbalanced)} icon={AlertTriangle}
          hint="closing ≠ opening + in − out" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Account</th>
                <th className="px-3 py-3 font-medium text-right">Opening</th>
                <th className="px-3 py-3 font-medium text-right">In</th>
                <th className="px-3 py-3 font-medium text-right">Out</th>
                <th className="px-3 py-3 font-medium text-right">Closing</th>
                <th className="px-3 py-3 font-medium">Remarks</th>
                <th className="px-5 py-3 font-medium text-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 whitespace-nowrap">{day(r.date)}</td>
                  <td className="px-3 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 uppercase">{r.account}</span>
                    {r.amended && (
                      <span className="ml-2 text-[11px] text-amber-600" title="Corrected since import">amended</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600">{rupees(r.opening)}</td>
                  <td className="px-3 py-3 text-right text-emerald-700">{rupees(r.totalCredit)}</td>
                  <td className="px-3 py-3 text-right text-red-700">{rupees(r.totalDebit)}</td>
                  <td className="px-3 py-3 text-right font-medium text-gray-900">
                    {rupees(r.closing)}
                    {r.discrepancy && (
                      <div className="text-[11px] text-amber-600"
                        title="The stated closing balance does not match opening + in − out">
                        calc {rupees(r.computedClosing)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-500 max-w-48 truncate" title={r.remarks}>{r.remarks || '—'}</td>
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
                <tr><td colSpan={8} className="text-center py-16 text-gray-500">
                  Nothing recorded yet. Use &ldquo;Add a day&rdquo; to start.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <EntryForm entry={editing} onClose={() => setShowForm(false)}
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
        <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><Icon className="w-4 h-4" /></span>
      </div>
      <div className="text-xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="text-[11px] text-gray-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function EntryForm({ entry, onClose, onSaved }: {
  entry: Entry | null; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing values are loaded into the form so an edit starts from what is
  // already recorded rather than a blank sheet.
  const [date, setDate] = useState(entry ? entry.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [account, setAccount] = useState<Account>(entry?.account ?? 'cash');
  const [opening, setOpening] = useState(entry ? String(entry.opening) : '');
  const [remarks, setRemarks] = useState(entry?.remarks ?? '');
  const [credits, setCredits] = useState<Record<string, string>>(
    Object.fromEntries(CREDITS.map(([k]) => [k, entry?.credits?.[k] ? String(entry.credits[k]) : ''])),
  );
  const [debits, setDebits] = useState<Record<string, string>>(
    Object.fromEntries(DEBITS.map(([k]) => [k, entry?.debits?.[k] ? String(entry.debits[k]) : ''])),
  );

  const totalIn = CREDITS.reduce((a, [k]) => a + (Number(credits[k]) || 0), 0);
  const totalOut = DEBITS.reduce((a, [k]) => a + (Number(debits[k]) || 0), 0);
  const closing = (Number(opening) || 0) + totalIn - totalOut;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const payload = {
        date, account,
        opening: Number(opening) || 0,
        remarks,
        credits: Object.fromEntries(CREDITS.map(([k]) => [k, Number(credits[k]) || 0])),
        debits: Object.fromEntries(DEBITS.map(([k]) => [k, Number(debits[k]) || 0])),
      };
      const res = entry
        ? await fetch(`/api/cashbook/${entry._id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/cashbook', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? 'Could not save');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setSaving(false); }
  }

  const input = 'w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">{entry ? 'Edit cash book day' : 'Add a cash book day'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {entry?.origin === 'sheet' && !entry.amended && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
              This day came from the cash book workbook. Saving keeps a copy of the
              original figures so the workbook&apos;s version stays auditable.
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <L label="Date"><input type="date" required value={date} className={input}
              onChange={(e) => setDate(e.target.value)} /></L>
            <L label="Account">
              <select value={account} className={input} disabled={Boolean(entry)}
                onChange={(e) => setAccount(e.target.value as Account)}>
                {ACCOUNTS.map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}
              </select>
            </L>
            <L label="Opening balance"><input type="number" step="0.01" value={opening} className={input}
              placeholder="carried forward" onChange={(e) => setOpening(e.target.value)} /></L>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Money in</div>
            <div className="grid grid-cols-3 gap-3">
              {CREDITS.map(([k, label]) => (
                <L key={k} label={label}>
                  <input type="number" min="0" step="0.01" placeholder="0" value={credits[k]} className={input}
                    onChange={(e) => setCredits({ ...credits, [k]: e.target.value })} />
                </L>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Money out</div>
            <div className="grid grid-cols-5 gap-3">
              {DEBITS.map(([k, label]) => (
                <L key={k} label={label}>
                  <input type="number" min="0" step="0.01" placeholder="0" value={debits[k]} className={input}
                    onChange={(e) => setDebits({ ...debits, [k]: e.target.value })} />
                </L>
              ))}
            </div>
          </div>

          <L label="Remarks"><input value={remarks} className={input}
            onChange={(e) => setRemarks(e.target.value)} /></L>

          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <Row label="Money in" value={rupees(totalIn)} />
            <Row label="Money out" value={rupees(totalOut)} />
            <Row label="Closing balance" value={rupees(closing)} strong />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}>
              {saving ? 'Saving…' : entry ? 'Save changes' : 'Add day'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className="flex justify-between">
    <span className="text-gray-600">{label}</span>
    <strong className={strong ? 'text-gray-900' : 'font-normal text-gray-700'}>{value}</strong>
  </div>
);

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1 text-xs text-gray-600">{label}</span>
      {children}
    </label>
  );
}
