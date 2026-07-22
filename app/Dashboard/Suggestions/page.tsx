'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Trophy, Gauge, Info,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ComposedChart, Line, Cell,
} from 'recharts';

/**
 * Suggestions — who and what makes money, and what drains it.
 *
 * Two honesty rules govern this page, both enforced server-side:
 *
 *  - Drivers are ranked on net per *earning day*, not total net. Total net just
 *    ranks whoever worked the most days.
 *  - Vehicle figures only cover days where the fuel book named a vehicle. The
 *    coverage banner says how much of revenue that actually is, because a
 *    ranking built on a slice of the data should not be read as the whole fleet.
 */

type Finding = {
  kind: 'best' | 'worst' | 'watch';
  subject: 'driver' | 'vehicle' | 'fleet';
  title: string;
  detail: string;
  metric?: string;
};

type DriverStat = {
  driverId: string; name: string; active: boolean;
  takings: number; expense: number; net: number;
  duties: number; worked: number; leave: number;
  netPerWorkedDay: number; expenseRatio: number; floatHeld: number; flagged: number;
};

type VehicleStat = {
  vehicleId: string | null; code: string; plate: string;
  attributedTakings: number; attributedDays: number;
  fuelCost: number; repairCost: number; totalCost: number;
  net: number; netPerDay: number; avgMileage: number | null;
  downtimeDays: number; fills: number;
};

type Payload = {
  findings: Finding[];
  drivers: DriverStat[];
  vehicles: VehicleStat[];
  trend: { month: string; takings: number; expense: number; net: number; duties: number }[];
  benchmarks: { fleetNetPerDay: number; fleetExpenseRatio: number };
  coverage: { attributedTakings: number; totalTakings: number; pct: number };
};

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const compact = (n: number) =>
  Math.abs(n) >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L`
  : Math.abs(n) >= 1e3 ? `₹${Math.round(n / 1e3)}k`
  : `₹${Math.round(n)}`;

const monthLabel = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString('en-IN', {
    month: 'short', year: '2-digit', timeZone: 'UTC',
  });
};

const KIND_STYLE = {
  best: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', icon: Trophy, chip: '#10B981' },
  worst: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', icon: TrendingDown, chip: '#EF4444' },
  watch: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', icon: AlertTriangle, chip: '#F59E0B' },
} as const;

function currentMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export default function SuggestionsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'all' | string>('all');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const qs = period === 'all' ? '' : `?month=${period}`;
      const res = await fetch(`/api/reports/suggestions${qs}`, { cache: 'no-store' });
      const text = await res.text();
      if (!res.ok) {
        let msg = `Could not build suggestions (${res.status})`;
        try { msg = JSON.parse(text)?.error ?? msg; } catch { /* keep default */ }
        throw new Error(msg);
      }
      if (!text) throw new Error('The server returned an empty response');
      setData(JSON.parse(text) as Payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <div className="w-8 h-8 rounded-full animate-spin"
          style={{ border: '3px solid #E5E7EB', borderTopColor: '#2563EB' }} />
        <p className="text-sm text-gray-500">Working through the books…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <button onClick={load} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Try again</button>
      </div>
    );
  }
  if (!data) return null;

  const { findings, drivers, vehicles, trend, benchmarks, coverage } = data;

  // Only rank drivers with enough earning days for an average to mean anything.
  const ranked = [...drivers]
    .filter((d) => d.worked >= 10)
    .sort((a, b) => b.netPerWorkedDay - a.netPerWorkedDay);

  const thin = drivers.filter((d) => d.worked > 0 && d.worked < 10);
  const withRevenue = vehicles.filter((v) => v.attributedDays > 0);

  return (
    <div className="pb-16">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Suggestions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Who earns, what costs, and where the money is leaking.
          </p>
        </div>
        <div className="flex gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="all">All time</option>
            {trend.map((t) => <option key={t.month} value={t.month}>{monthLabel(t.month)}</option>)}
            {!trend.some((t) => t.month === currentMonth()) && (
              <option value={currentMonth()}>{monthLabel(currentMonth())}</option>
            )}
          </select>
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Benchmarks */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Fleet average" value={rupees(benchmarks.fleetNetPerDay)} hint="net per earning day" icon={TrendingUp} />
        <Stat label="Cost ratio" value={`${Math.round(benchmarks.fleetExpenseRatio * 100)}%`} hint="fuel + toll vs takings" icon={Gauge} />
        <Stat label="Drivers ranked" value={String(ranked.length)} hint={`${thin.length} too few days`} icon={Trophy} />
        <Stat label="Vehicle coverage" value={`${Math.round(coverage.pct * 100)}%`} hint="of revenue traceable to a car" icon={Info} />
      </div>

      {/* Findings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {findings.map((f, i) => {
          const s = KIND_STYLE[f.kind];
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-xl p-4"
              style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}>
              <div className="flex items-start gap-3">
                <span className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: s.chip }}>
                  <Icon className="w-4 h-4 text-white" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium" style={{ color: s.text }}>{f.title}</h3>
                    {f.metric && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/70" style={{ color: s.text }}>
                        {f.metric}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1" style={{ color: s.text, opacity: 0.9 }}>{f.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
        {findings.length === 0 && (
          <div className="md:col-span-2 text-center py-12 text-sm text-gray-400">
            Not enough recorded duties yet to draw conclusions.
          </div>
        )}
      </div>

      {/* Driver ranking */}
      <Panel title="Driver productivity" subtitle="net per earning day — the bar, against the fleet average line">
        {ranked.length === 0 ? <Empty>No driver has ten earning days in this period.</Empty> : (
          <ResponsiveContainer width="100%" height={Math.max(260, ranked.length * 42)}>
            <ComposedChart layout="vertical" data={ranked} margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" horizontal={false} />
              <XAxis type="number" tickFormatter={compact} tick={{ fontSize: 12, fill: '#5A6C7D' }} />
              <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 12, fill: '#5A6C7D' }} />
              <Tooltip
                formatter={(v, n) => [rupees(Number(v) || 0), String(n)]}
              />
              <Legend />
              <Bar dataKey="netPerWorkedDay" name="Net per earning day" radius={[0, 4, 4, 0]}>
                {ranked.map((d) => (
                  <Cell key={d.driverId}
                    fill={d.netPerWorkedDay >= benchmarks.fleetNetPerDay ? '#10B981' : '#EF4444'} />
                ))}
              </Bar>
              <Line dataKey={() => benchmarks.fleetNetPerDay} name="Fleet average"
                stroke="#1A2332" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        {thin.length > 0 && (
          <p className="text-xs text-gray-400 mt-3">
            Not ranked — fewer than ten earning days: {thin.map((d) => `${d.name} (${d.worked})`).join(', ')}.
          </p>
        )}
      </Panel>

      {/* Driver detail table */}
      <Panel title="Driver detail" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3 font-medium">Driver</th>
                <th className="py-2 px-3 font-medium text-right">Takings</th>
                <th className="py-2 px-3 font-medium text-right">Costs</th>
                <th className="py-2 px-3 font-medium text-right">Net</th>
                <th className="py-2 px-3 font-medium text-right">Earning days</th>
                <th className="py-2 px-3 font-medium text-right">Net/day</th>
                <th className="py-2 px-3 font-medium text-right">Cost ratio</th>
                <th className="py-2 px-3 font-medium text-right">Float held</th>
                <th className="py-2 pl-3 font-medium text-right">Off duty</th>
              </tr>
            </thead>
            <tbody>
              {[...drivers].sort((a, b) => b.net - a.net).map((d) => {
                const below = d.worked >= 10 && d.netPerWorkedDay < benchmarks.fleetNetPerDay;
                return (
                  <tr key={d.driverId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium text-gray-900">{d.name}</span>
                      {!d.active && <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">former</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{rupees(d.takings)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{rupees(d.expense)}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-gray-900">{rupees(d.net)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{d.worked}</td>
                    <td className="py-2.5 px-3 text-right font-medium"
                      style={{ color: d.worked < 10 ? '#9AA5B1' : below ? '#EF4444' : '#10B981' }}>
                      {d.worked ? rupees(d.netPerWorkedDay) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right"
                      style={{ color: d.expenseRatio > benchmarks.fleetExpenseRatio * 1.25 ? '#EF4444' : '#5A6C7D' }}>
                      {Math.round(d.expenseRatio * 100)}%
                    </td>
                    <td className="py-2.5 px-3 text-right"
                      style={{ color: d.floatHeld > 3000 ? '#F59E0B' : d.floatHeld < 0 ? '#EF4444' : '#5A6C7D' }}>
                      {rupees(d.floatHeld)}
                    </td>
                    <td className="py-2.5 pl-3 text-right text-gray-600">
                      {d.duties ? `${Math.round((d.leave / d.duties) * 100)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Vehicles */}
      <Panel
        title="Vehicle profitability"
        subtitle="revenue attributed only where the fuel book named a vehicle"
        className="mt-6"
      >
        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            Only {rupees(coverage.attributedTakings)} of {rupees(coverage.totalTakings)} takings
            ({Math.round(coverage.pct * 100)}%) can be tied to a specific vehicle — the daily book
            rarely records which car was driven. Costs below are complete; revenue is a sample.
            Record the vehicle on each duty and this becomes exact.
          </p>
        </div>

        {withRevenue.length === 0 ? <Empty>No vehicle has attributable revenue in this period.</Empty> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={withRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
              <XAxis dataKey="code" tick={{ fontSize: 12, fill: '#5A6C7D' }} />
              <YAxis tickFormatter={compact} tick={{ fontSize: 12, fill: '#5A6C7D' }} width={56} />
              <Tooltip formatter={(v) => rupees(Number(v) || 0)} />
              <Legend />
              <Bar dataKey="attributedTakings" name="Takings" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fuelCost" name="Fuel" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="repairCost" name="Repairs" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3 font-medium">Vehicle</th>
                <th className="py-2 px-3 font-medium text-right">Takings*</th>
                <th className="py-2 px-3 font-medium text-right">Fuel</th>
                <th className="py-2 px-3 font-medium text-right">Repairs</th>
                <th className="py-2 px-3 font-medium text-right">Net*</th>
                <th className="py-2 px-3 font-medium text-right">Net/day*</th>
                <th className="py-2 px-3 font-medium text-right">Mileage</th>
                <th className="py-2 pl-3 font-medium text-right">Off road</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.vehicleId ?? v.code} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="py-2.5 pr-3">
                    <span className="font-medium text-gray-900">{v.code}</span>
                    {v.plate && <span className="ml-2 text-xs text-gray-400">{v.plate}</span>}
                    <div className="text-[11px] text-gray-400">{v.attributedDays} attributable days</div>
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{rupees(v.attributedTakings)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{rupees(v.fuelCost)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{rupees(v.repairCost)}</td>
                  <td className="py-2.5 px-3 text-right font-medium"
                    style={{ color: v.net >= 0 ? '#1A2332' : '#EF4444' }}>{rupees(v.net)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">
                    {v.attributedDays ? rupees(v.netPerDay) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-600">
                    {v.avgMileage ? `${v.avgMileage} km/kg` : '—'}
                  </td>
                  <td className="py-2.5 pl-3 text-right text-gray-600">{v.downtimeDays || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-gray-400 mt-2">
            * Revenue-based columns cover only the days a vehicle was named. Fuel and repairs are complete.
          </p>
        </div>
      </Panel>

      {/* Trend */}
      <Panel title="Monthly trend" subtitle="takings, costs and net" className="mt-6">
        {trend.length === 0 ? <Empty>No history yet.</Empty> : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={trend.map((t) => ({ ...t, label: monthLabel(t.month) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5A6C7D' }} />
              <YAxis tickFormatter={compact} tick={{ fontSize: 12, fill: '#5A6C7D' }} width={56} />
              <Tooltip formatter={(v) => rupees(Number(v) || 0)} />
              <Legend />
              <Bar dataKey="takings" name="Takings" fill="#93C5FD" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Fuel + toll" fill="#FCD34D" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="net" name="Net" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Panel>
    </div>
  );
}

function Stat({
  label, value, hint, icon: Icon,
}: { label: string; value: string; hint?: string; icon: React.ElementType }) {
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

function Panel({
  title, subtitle, children, className = '',
}: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="py-12 text-center text-sm text-gray-400">{children}</div>
);
