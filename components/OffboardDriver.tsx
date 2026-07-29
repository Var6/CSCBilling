'use client';

import { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle2, Wallet, Car, KeyRound } from 'lucide-react';

/**
 * Driver exit dialog.
 *
 * Loads the exit checklist from the server first and shows what is still
 * outstanding — cash the driver holds, vehicles assigned to them, open trips —
 * before anything is committed. Blockers can be overridden, but only with a
 * written reason, because a driver leaving with unrecovered company cash is a
 * decision the business should have to record, not a click it can make by
 * accident.
 */

type Blocker = { code: string; message: string; amount?: number; count?: number };

type Checklist = {
  driver: { id: string; name: string; active: boolean };
  balance: number;
  openTrips: number;
  assignedVehicles: { plate: string; shortCode?: string; name?: string }[];
  hasAppAccess: boolean;
  lastDutyOn: string | null;
  blockers: Blocker[];
  canOffboard: boolean;
};

const rupees = (n: number) => `₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;

export default function OffboardDriver({
  driverId, driverName, onClose, onDone,
}: {
  driverId: string;
  driverName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [exitDate, setExitDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [override, setOverride] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/driver/${driverId}/offboard`, { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? 'Could not load the exit checklist');
        return j as Checklist;
      })
      .then((c) => { if (!cancelled) setChecklist(c); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [driverId]);

  async function submit() {
    if (!reason.trim()) { setError('Please record why they are leaving'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/driver/${driverId}/offboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exitDate, reason: reason.trim(), force: override }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Could not offboard this driver');
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const blocked = checklist ? !checklist.canOffboard : false;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Offboard {driverName}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading && <div className="text-sm text-gray-500 py-6 text-center">Checking their record…</div>}

          {checklist && (
            <>
              <div className="space-y-2">
                <Item
                  icon={Wallet}
                  ok={Math.abs(checklist.balance) <= 1}
                  label="Cash float"
                  detail={
                    Math.abs(checklist.balance) <= 1
                      ? 'Nothing outstanding'
                      : checklist.balance > 0
                        ? `Holding ${rupees(checklist.balance)} of company cash`
                        : `Company owes them ${rupees(checklist.balance)}`
                  }
                />
                <Item
                  icon={Car}
                  ok={checklist.assignedVehicles.length === 0}
                  label="Vehicle"
                  detail={
                    checklist.assignedVehicles.length === 0
                      ? 'No vehicle assigned'
                      : `${checklist.assignedVehicles.map((v) => (v.plate?.startsWith('PENDING') ? v.shortCode : v.plate)).join(', ')} — will be released`
                  }
                  warnOnly
                />
                <Item
                  icon={AlertTriangle}
                  ok={checklist.openTrips === 0}
                  label="Open trips"
                  detail={checklist.openTrips === 0 ? 'None' : `${checklist.openTrips} still open in their name`}
                />
                <Item
                  icon={KeyRound}
                  ok
                  label="App access"
                  detail={checklist.hasAppAccess ? 'Will be revoked' : 'No app login issued'}
                  warnOnly
                />
              </div>

              {checklist.lastDutyOn && (
                <p className="text-xs text-gray-400">
                  Last duty recorded on{' '}
                  {new Date(checklist.lastDutyOn).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
                  })}.
                </p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="block mb-1 text-xs text-gray-600">Last working day</span>
                  <input type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </label>
                <label className="block">
                  <span className="block mb-1 text-xs text-gray-600">Reason</span>
                  <input value={reason} onChange={(e) => setReason(e.target.value)}
                    placeholder="resigned, terminated, …"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </label>
              </div>

              {blocked && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
                  <div className="text-sm font-medium text-amber-800">Settle these first</div>
                  <ul className="text-sm text-amber-700 list-disc pl-5 space-y-1">
                    {checklist.blockers.map((b) => <li key={b.code}>{b.message}</li>)}
                  </ul>
                  <label className="flex items-start gap-2 text-sm text-amber-800 pt-1 cursor-pointer">
                    <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)}
                      className="mt-0.5" />
                    <span>
                      Offboard anyway and write this off. The reason above is recorded
                      against their file.
                    </span>
                  </label>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Their duties, fuel logs and trips are kept — only their access and
                assignments are removed. They can be reinstated later.
              </p>
            </>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving || loading || (blocked && !override)}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-red-600 hover:bg-red-700 disabled:opacity-40"
            >
              {saving ? 'Offboarding…' : 'Offboard driver'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Item({
  icon: Icon, ok, label, detail, warnOnly,
}: {
  icon: React.ElementType; ok: boolean; label: string; detail: string; warnOnly?: boolean;
}) {
  const tone = ok ? 'text-emerald-600' : warnOnly ? 'text-blue-600' : 'text-amber-600';
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className={`mt-0.5 ${tone}`}>
        {ok ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
      </span>
      <div>
        <span className="text-gray-900">{label}</span>
        <span className="text-gray-500"> — {detail}</span>
      </div>
    </div>
  );
}
