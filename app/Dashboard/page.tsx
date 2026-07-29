'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Car, IndianRupee, Fuel, TrendingUp, AlertTriangle, RefreshCw, ArrowRight,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

/**
 * Dashboard.
 *
 * Every figure comes from /api/reports/summary. This page previously rendered
 * invented data — a hardcoded week of revenue and five trips for customers who
 * do not exist in the database — which is worse than an empty dashboard,
 * because it looks authoritative.
 *
 * Revenue is `takings` throughout: what was actually collected, not the books'
 * "Total" column, which folds in the float each driver carries.
 */

type Summary = {
  totals: { takings: number; fuel: number; toll: number; repairs: number; net: number; duties: number };
  byMonth: { month: string; takings: number; fuel: number; toll: number; net: number; duties: number }[];
  byDriver: { driverId: string; name: string; takings: number; net: number; duties: number; worked: number; perDuty: number }[];
  byChannel: Record<string, number>;
  byVehicle: { code: string; fuelCost: number; avgMileage: number | null; fills: number }[];
  needsAttention: {
    discrepancies: number; conflicts: number;
    driversNeedingProfile: number; vehiclesNeedingProfile: number;
    fuelLogsWithoutVehicle: number; fuelBookVsDailyBook: number;
  };
};

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const compact = (n: number) =>
  Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L`
  : Math.abs(n) >= 1e3 ? `₹${Math.round(n / 1e3)}k`
  : `₹${Math.round(n)}`;

const CHANNEL_LABELS: Record<string, string> = {
  uber: 'Uber', uberCash: 'Uber Cash', rapidoCash: 'Rapido Cash',
  rapidoAccount: 'Rapido A/c', upiBank: 'UPI (Bank)', personalUpi: 'Personal UPI',
  offline: 'Offline', advance: 'Advance',
};

const PIE_COLOURS = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#64748B'];

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-IN', {
    month: 'short', year: '2-digit', timeZone: 'UTC',
  });
};

export default function Dashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/reports/summary', { cache: 'no-store' });
      // Read as text first: a crashed route or a proxy can return an empty
      // body, and res.json() on that throws "unexpected end of data".
      const text = await res.text();
      if (!res.ok) {
        let msg = `Could not load the dashboard (${res.status})`;
        try { msg = JSON.parse(text)?.error ?? msg; } catch { /* keep the default */ }
        throw new Error(msg);
      }
      if (!text) throw new Error('The server returned an empty response');
      setData(JSON.parse(text) as Summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="w-8 h-8 rounded-full animate-spin"
          style={{ border: '3px solid #E5E7EB', borderTopColor: '#2563EB' }} />
        <p className="text-sm text-gray-500">Loading your figures…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <button onClick={load} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">
          Try again
        </button>
      </div>
    );
  }
  if (!data) return null;

  const { totals, byMonth, byDriver, byChannel, byVehicle, needsAttention } = data;

  const channelData = Object.entries(byChannel ?? {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: CHANNEL_LABELS[k] ?? k, value: v }))
    .sort((a, b) => b.value - a.value);

  const latest = byMonth[byMonth.length - 1];
  const previous = byMonth[byMonth.length - 2];
  const changePct = previous && previous.takings > 0
    ? Math.round(((latest.takings - previous.takings) / previous.takings) * 100)
    : null;

  const attention =
    needsAttention.discrepancies + needsAttention.driversNeedingProfile +
    needsAttention.vehiclesNeedingProfile;

  const kpis = [
    { label: 'Takings', value: rupees(totals.takings), icon: IndianRupee, colour: '#2563EB', bg: '#DBEAFE',
      hint: `${totals.duties} duties recorded`, showChange: true },
    { label: 'Fuel & toll', value: rupees(totals.fuel + totals.toll), icon: Fuel, colour: '#F59E0B', bg: '#FEF3C7',
      hint: totals.takings ? `${Math.round(((totals.fuel + totals.toll) / totals.takings) * 100)}% of takings` : '' },
    { label: 'Net', value: rupees(totals.net), icon: TrendingUp, colour: '#10B981', bg: '#D1FAE5',
      hint: 'after fuel, toll and repairs' },
    { label: 'Needs review', value: String(attention), icon: AlertTriangle,
      colour: attention ? '#EF4444' : '#64748B', bg: attention ? '#FEE2E2' : '#F1F5F9',
      hint: 'rows and profiles to check' },
  ];

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Dashboard</h1>
          <p style={{ color: '#5A6C7D' }}>
            {byMonth.length
              ? `${monthLabel(byMonth[0].month)} – ${monthLabel(latest.month)}, from the daily book.`
              : 'No duties recorded yet.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/Dashboard/Suggestions"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}>
            What should I fix? <ArrowRight className="w-4 h-4" />
          </Link>
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl p-6 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: k.bg }}>
                <k.icon className="w-6 h-6" style={{ color: k.colour }} />
              </div>
              {k.showChange && changePct !== null && (
                <span className="text-sm font-medium px-2 py-1 rounded"
                  style={{
                    color: changePct >= 0 ? '#10B981' : '#EF4444',
                    backgroundColor: changePct >= 0 ? '#ECFDF5' : '#FEF2F2',
                  }}
                  title={`vs ${monthLabel(previous!.month)}`}>
                  {changePct >= 0 ? '+' : ''}{changePct}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold mb-1" style={{ color: '#1A2332' }}>{k.value}</p>
            <p className="text-sm" style={{ color: '#5A6C7D' }}>{k.label}</p>
            {k.hint && <p className="text-xs mt-1" style={{ color: '#9AA5B1' }}>{k.hint}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Panel title="Takings vs net" subtitle="by month" className="lg:col-span-2">
          {byMonth.length === 0 ? <Empty>No duties recorded yet.</Empty> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={byMonth.map((m) => ({ ...m, label: monthLabel(m.month) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5A6C7D' }} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 12, fill: '#5A6C7D' }} width={56} />
                <Tooltip formatter={(v) => rupees(Number(v) || 0)} />
                <Legend />
                <Line type="monotone" dataKey="takings" name="Takings" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="net" name="Net" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Where the money comes from" subtitle="by channel">
          {channelData.length === 0 ? <Empty>No earnings recorded yet.</Empty> : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={channelData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {channelData.map((_, i) => <Cell key={i} fill={PIE_COLOURS[i % PIE_COLOURS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => rupees(Number(v) || 0)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Net by driver" subtitle="takings less fuel and toll">
          {byDriver.length === 0 ? <Empty>No drivers yet.</Empty> : (
            <ResponsiveContainer width="100%" height={Math.max(240, byDriver.length * 34)}>
              <BarChart layout="vertical" data={[...byDriver].sort((a, b) => a.net - b.net)}
                margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" horizontal={false} />
                <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 12, fill: '#5A6C7D' }} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12, fill: '#5A6C7D' }} />
                <Tooltip formatter={(v) => rupees(Number(v) || 0)} />
                <Bar dataKey="net" name="Net" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Fuel by vehicle" subtitle="spend and measured mileage">
          {byVehicle.length === 0 ? <Empty>No fuel logged yet.</Empty> : (
            <div className="space-y-3">
              {byVehicle.map((v) => (
                <div key={v.code} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{v.code}</span>
                    <span className="text-xs text-gray-400">{v.fills} fills</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">{rupees(v.fuelCost)}</span>
                    <span className="text-xs text-gray-400 w-20 text-right">
                      {v.avgMileage ? `${v.avgMileage} km/kg` : 'no mileage'}
                    </span>
                  </div>
                </div>
              ))}
              {needsAttention.fuelLogsWithoutVehicle > 0 && (
                <p className="text-xs text-amber-600 pt-2 border-t border-gray-100">
                  {needsAttention.fuelLogsWithoutVehicle} fills name no vehicle in the book, so these
                  totals understate actual spend.
                </p>
              )}
            </div>
          )}
        </Panel>
      </div>

      {attention > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Worth a look</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {needsAttention.discrepancies > 0 && (
                  <li>
                    {needsAttention.discrepancies} duties where the book&apos;s own arithmetic
                    disagrees — <Link href="/Dashboard/DailyBook" className="underline">review them</Link>.
                  </li>
                )}
                {needsAttention.driversNeedingProfile > 0 && (
                  <li>
                    {needsAttention.driversNeedingProfile} drivers still have no phone, licence
                    or email — <Link href="/Dashboard/Driver" className="underline">complete them</Link>.
                  </li>
                )}
                {needsAttention.vehiclesNeedingProfile > 0 && (
                  <li>
                    {needsAttention.vehiclesNeedingProfile} vehicles have a placeholder plate and
                    RC — <Link href="/Dashboard/Car" className="underline">fill them in</Link>.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({
  title, subtitle, children, className = '',
}: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm ${className}`} style={{ border: '1px solid #E5E7EB' }}>
      <div className="mb-4">
        <h3 className="font-semibold" style={{ color: '#1A2332' }}>{title}</h3>
        {subtitle && <p className="text-xs" style={{ color: '#9AA5B1' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="py-16 text-center text-sm text-gray-400">{children}</div>
);
