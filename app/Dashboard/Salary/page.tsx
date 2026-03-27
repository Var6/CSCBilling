'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, ChevronLeft, ChevronRight, Calendar, IndianRupee,
  CheckCircle, XCircle, Sun, TrendingUp, Download, Save,
} from 'lucide-react';
import { exportToExcel } from '@/lib/exportToExcel';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Driver {
  _id: string;
  name: string;
  phone: string;
  baseSalary: number;
  perKmRate: number;
  status: string;
}

type AttendanceStatus = 'present' | 'absent' | 'holiday';

interface AttendanceRecord {
  _id?: string;
  driverId: string;
  date: string;       // ISO string
  status: AttendanceStatus;
  kmDriven: number;
  notes: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const WORKING_DAYS = 26; // assumed working days per month

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function toISODate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function calcSalary(driver: Driver, records: AttendanceRecord[]) {
  const dailyBase = (driver.baseSalary || 0) / WORKING_DAYS;
  let presentDays = 0;
  let absentDays = 0;
  let holidayDays = 0;
  let basePay = 0;
  let kmIncentive = 0;
  let holidayBonus = 0;

  for (const r of records) {
    if (r.status === 'present') {
      presentDays++;
      basePay    += dailyBase;
      kmIncentive += (r.kmDriven || 0) * (driver.perKmRate || 0);
    } else if (r.status === 'absent') {
      absentDays++;
      // no pay
    } else if (r.status === 'holiday') {
      holidayDays++;
      // 1.5× daily base + km incentive
      basePay     += dailyBase * 1.5;
      kmIncentive  += (r.kmDriven || 0) * (driver.perKmRate || 0);
      holidayBonus += dailyBase * 0.5; // the extra 0.5× portion
    }
  }

  const totalPay = basePay + kmIncentive;
  return { presentDays, absentDays, holidayDays, basePay, kmIncentive, holidayBonus, totalPay };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SalaryPage() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-based

  const [drivers,     setDrivers]     = useState<Driver[]>([]);
  const [selDriver,   setSelDriver]   = useState<Driver | null>(null);
  const [attendance,  setAttendance]  = useState<Record<string, AttendanceRecord>>({}); // key = "YYYY-MM-DD"
  const [dirty,       setDirty]       = useState<Set<string>>(new Set());
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(false);

  // ── fetch drivers ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/driver')
      .then(r => r.json())
      .then((data: Driver[]) => {
        setDrivers(data);
        if (data.length > 0) setSelDriver(data[0]);
      })
      .catch(console.error);
  }, []);

  // ── fetch attendance when driver or month changes ────────────────────────
  const fetchAttendance = useCallback(async () => {
    if (!selDriver) return;
    setLoading(true);
    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const res = await fetch(`/api/attendance?driverId=${selDriver._id}&month=${monthStr}`);
      const data: AttendanceRecord[] = await res.json();
      const map: Record<string, AttendanceRecord> = {};
      for (const r of data) {
        const d = new Date(r.date);
        const key = toISODate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
        map[key] = r;
      }
      setAttendance(map);
      setDirty(new Set());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selDriver, year, month]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  // ── helpers ──────────────────────────────────────────────────────────────
  const numDays = daysInMonth(year, month);

  const getRecord = (day: number): AttendanceRecord | undefined =>
    attendance[toISODate(year, month, day)];

  const updateDay = (day: number, changes: Partial<AttendanceRecord>) => {
    const key = toISODate(year, month, day);
    const prev = attendance[key] || { driverId: selDriver!._id, date: key, status: 'present', kmDriven: 0, notes: '' };
    setAttendance(a => ({ ...a, [key]: { ...prev, ...changes } }));
    setDirty(d => new Set(d).add(key));
  };

  // ── save changed records ─────────────────────────────────────────────────
  const saveAll = async () => {
    if (!selDriver || dirty.size === 0) return;
    setSaving(true);
    try {
      await Promise.all(
        [...dirty].map(key => {
          const rec = attendance[key];
          if (!rec) return Promise.resolve();
          return fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driverId: selDriver._id, date: key, status: rec.status, kmDriven: rec.kmDriven, notes: rec.notes }),
          });
        })
      );
      setDirty(new Set());
      await fetchAttendance();
    } catch (err) {
      console.error(err);
      alert('Failed to save some records');
    } finally {
      setSaving(false);
    }
  };

  // ── month navigation ─────────────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  // ── salary summary ───────────────────────────────────────────────────────
  const summary = selDriver ? calcSalary(selDriver, Object.values(attendance)) : null;

  // ── status style ─────────────────────────────────────────────────────────
  const statusStyle = {
    present: { bg: '#D1FAE5', text: '#065F46', label: 'Present', icon: CheckCircle },
    absent:  { bg: '#FEE2E2', text: '#991B1B', label: 'Absent',  icon: XCircle   },
    holiday: { bg: '#FEF3C7', text: '#92400E', label: 'Holiday', icon: Sun        },
  } as const;

  // ── export ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!selDriver || !summary) return;
    const rows = Array.from({ length: numDays }, (_, i) => {
      const day = i + 1;
      const r = getRecord(day);
      const dailyBase = selDriver.baseSalary / WORKING_DAYS;
      let pay = 0;
      if (r?.status === 'present')  pay = dailyBase + (r.kmDriven || 0) * selDriver.perKmRate;
      if (r?.status === 'holiday')  pay = dailyBase * 1.5 + (r.kmDriven || 0) * selDriver.perKmRate;
      return [
        day,
        toISODate(year, month, day),
        r?.status ?? '-',
        r?.kmDriven ?? 0,
        Math.round(pay),
        r?.notes ?? '',
      ];
    });
    exportToExcel(
      `${selDriver.name} Salary ${monthName}`,
      'Attendance',
      ['Day', 'Date', 'Status', 'KM Driven', 'Day Pay (₹)', 'Notes'],
      rows
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="p-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Salary & Attendance</h1>
            <p style={{ color: '#5A6C7D' }}>Track attendance, KM incentives and compute monthly salary</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border hover:bg-gray-50 transition-all text-sm"
              style={{ borderColor: '#E5E7EB', color: '#5A6C7D' }}
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
            <button
              onClick={saveAll}
              disabled={saving || dirty.size === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : `Save${dirty.size > 0 ? ` (${dirty.size})` : ''}`}
            </button>
          </div>
        </div>

        {/* ── Driver Selector + Month Nav ─────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm mb-6 p-5 flex flex-wrap gap-4 items-center" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: '#2563EB' }} />
            <select
              value={selDriver?._id || ''}
              onChange={e => {
                const d = drivers.find(x => x._id === e.target.value) || null;
                setSelDriver(d);
              }}
              className="px-3 py-2 rounded-lg text-sm font-medium"
              style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none', minWidth: 180 }}
            >
              {drivers.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-all">
              <ChevronLeft className="w-5 h-5" style={{ color: '#5A6C7D' }} />
            </button>
            <span className="font-semibold text-sm px-2" style={{ color: '#1A2332', minWidth: 140, textAlign: 'center' }}>
              {monthName}
            </span>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-all">
              <ChevronRight className="w-5 h-5" style={{ color: '#5A6C7D' }} />
            </button>
          </div>
        </div>

        {/* ── Salary Summary Cards ────────────────────────────────────────── */}
        {selDriver && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            {[
              { label: 'Base Salary', value: `₹${(selDriver.baseSalary || 0).toLocaleString('en-IN')}`, color: '#2563EB' },
              { label: 'Per KM Rate', value: `₹${selDriver.perKmRate || 0}/km`, color: '#7C3AED' },
              { label: 'Present Days', value: summary.presentDays, color: '#10B981' },
              { label: 'Absent Days',  value: summary.absentDays,  color: '#EF4444' },
              { label: 'Holiday Days', value: summary.holidayDays,  color: '#F59E0B' },
              { label: 'KM Incentive', value: `₹${Math.round(summary.kmIncentive).toLocaleString('en-IN')}`, color: '#0891B2' },
              { label: 'Total Payable', value: `₹${Math.round(summary.totalPay).toLocaleString('en-IN')}`, color: '#059669' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
                <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>{s.label}</p>
                <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Salary Breakdown Note ───────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm" style={{ color: '#1E40AF' }}>
          <strong>Salary formula:</strong> &nbsp;
          Present day = (Base ÷ {WORKING_DAYS}) + (KM × per-km rate) &nbsp;|&nbsp;
          Holiday worked = 1.5 × daily base + KM incentive &nbsp;|&nbsp;
          Absent = ₹0
        </div>

        {/* ── Attendance Calendar / Table ─────────────────────────────────── */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading attendance…</div>
        ) : selDriver ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#F8F9FA', borderBottom: '2px solid #E5E7EB' }}>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: '#1A2332' }}>Day</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: '#1A2332' }}>Date</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: '#1A2332' }}>Status</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: '#1A2332' }}>KM Driven</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: '#1A2332' }}>Day Pay</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: '#1A2332' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: numDays }, (_, i) => {
                    const day = i + 1;
                    const dateStr = toISODate(year, month, day);
                    const rec = getRecord(day);
                    const status: AttendanceStatus = rec?.status ?? 'present';
                    const kmDriven = rec?.kmDriven ?? 0;
                    const notes = rec?.notes ?? '';
                    const isDirty = dirty.has(dateStr);

                    // compute day pay
                    const dailyBase = (selDriver.baseSalary || 0) / WORKING_DAYS;
                    let dayPay = 0;
                    if (status === 'present')  dayPay = dailyBase + kmDriven * (selDriver.perKmRate || 0);
                    if (status === 'holiday')  dayPay = dailyBase * 1.5 + kmDriven * (selDriver.perKmRate || 0);

                    const ss = statusStyle[status];
                    const weekday = new Date(year, month - 1, day).toLocaleString('en-IN', { weekday: 'short' });
                    const isSunday = new Date(year, month - 1, day).getDay() === 0;

                    return (
                      <tr
                        key={day}
                        style={{
                          borderBottom: '1px solid #F3F4F6',
                          backgroundColor: isSunday ? '#FAFAFA' : isDirty ? '#EFF6FF' : 'white',
                        }}
                      >
                        {/* Day # */}
                        <td className="px-4 py-2.5">
                          <span className="font-semibold" style={{ color: isSunday ? '#9CA3AF' : '#1A2332' }}>
                            {day}
                            {isDirty && <span className="ml-1 w-2 h-2 rounded-full bg-blue-500 inline-block align-middle" />}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-2.5 text-xs" style={{ color: '#5A6C7D' }}>
                          {new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          &nbsp;<span style={{ color: '#9CA3AF' }}>({weekday})</span>
                        </td>

                        {/* Status toggle buttons */}
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1.5">
                            {(['present', 'absent', 'holiday'] as AttendanceStatus[]).map(s => {
                              const st = statusStyle[s];
                              const Icon = st.icon;
                              const active = status === s;
                              return (
                                <button
                                  key={s}
                                  onClick={() => updateDay(day, { status: s })}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                                  style={{
                                    backgroundColor: active ? st.bg : '#F3F4F6',
                                    color: active ? st.text : '#9CA3AF',
                                    border: active ? `1.5px solid ${st.text}` : '1.5px solid transparent',
                                  }}
                                >
                                  <Icon className="w-3 h-3" />
                                  {st.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        {/* KM Driven */}
                        <td className="px-4 py-2.5">
                          <input
                            type="number"
                            min={0}
                            value={kmDriven}
                            disabled={status === 'absent'}
                            onChange={e => updateDay(day, { kmDriven: Number(e.target.value) })}
                            className="w-24 px-2 py-1 rounded-lg text-sm text-center disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                          />
                          <span className="ml-1.5 text-xs" style={{ color: '#9CA3AF' }}>km</span>
                        </td>

                        {/* Day Pay */}
                        <td className="px-4 py-2.5">
                          <span
                            className="font-semibold text-sm"
                            style={{ color: status === 'absent' ? '#EF4444' : status === 'holiday' ? '#D97706' : '#059669' }}
                          >
                            {status === 'absent' ? '₹0' : `₹${Math.round(dayPay).toLocaleString('en-IN')}`}
                            {status === 'holiday' && (
                              <span className="ml-1 text-xs font-normal" style={{ color: '#F59E0B' }}>×1.5</span>
                            )}
                          </span>
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={notes}
                            onChange={e => updateDay(day, { notes: e.target.value })}
                            placeholder="optional"
                            className="w-32 px-2 py-1 rounded-lg text-xs"
                            style={{ border: '1px solid #E5E7EB', color: '#5A6C7D', outline: 'none' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer totals row */}
                {summary && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#F0F9FF', borderTop: '2px solid #BFDBFE' }}>
                      <td colSpan={2} className="px-4 py-3 font-bold text-sm" style={{ color: '#1E40AF' }}>
                        Monthly Total
                      </td>
                      <td className="px-4 py-3 text-xs font-medium" style={{ color: '#1A2332' }}>
                        <span className="text-green-700">{summary.presentDays}P</span>
                        {' · '}
                        <span className="text-red-600">{summary.absentDays}A</span>
                        {' · '}
                        <span className="text-yellow-600">{summary.holidayDays}H</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#1A2332' }}>
                        {Object.values(attendance).reduce((s, r) => s + (r.kmDriven || 0), 0)} km
                      </td>
                      <td className="px-4 py-3 font-bold text-base" style={{ color: '#059669' }}>
                        ₹{Math.round(summary.totalPay).toLocaleString('en-IN')}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">No drivers found.</div>
        )}
      </div>
    </div>
  );
}
