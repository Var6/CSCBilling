'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign, TrendingUp, TrendingDown,
  Download, ArrowUpRight, ArrowDownRight, Wallet, RefreshCw,
  Plus, FileText
} from 'lucide-react';

type Trip = {
  _id: string;
  tripNumber: string;
  customer: { name: string; phone: string };
  driver: { name: string };
  vehicle: { model: string; plate: string };
  charges: { totalFare: number };
  payment: { method: string; status: string };
  status: string;
  createdAt: string;
};

type FinanceEntry = {
  _id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
};

export default function PaymentsPage() {
  const [timeFilter, setTimeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [financeEntries, setFinanceEntries] = useState<FinanceEntry[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tripRes, financeRes] = await Promise.all([
        fetch('/api/trip?limit=200'),
        fetch('/api/finance'),
      ]);
      const tripData = await tripRes.json();
      setTrips(tripData.trips || []);
      const finData = await financeRes.json();
      setFinanceEntries(finData.entries || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getCutoff = () => {
    const now = new Date();
    if (timeFilter === '7days') { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    if (timeFilter === '30days') { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
    if (timeFilter === '6months') { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
    if (timeFilter === '1year') { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return d; }
    return null;
  };

  const cutoff = getCutoff();
  const filteredTrips = trips.filter(t => !cutoff || new Date(t.createdAt) >= cutoff);
  const filteredFinance = financeEntries.filter(e => !cutoff || new Date(e.date) >= cutoff);

  const completedTrips = filteredTrips.filter(t => t.status === 'completed');
  const tripRevenue = completedTrips.reduce((s, t) => s + (t.charges?.totalFare || 0), 0);
  const financeIncome = filteredFinance.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const financeExpense = filteredFinance.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const totalIncome = tripRevenue + financeIncome;
  const totalExpense = financeExpense;
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0.0';

  // Driver earnings
  const driverMap: Record<string, { trips: number; revenue: number }> = {};
  completedTrips.forEach(t => {
    const name = t.driver?.name || 'Unknown';
    if (!driverMap[name]) driverMap[name] = { trips: 0, revenue: 0 };
    driverMap[name].trips++;
    driverMap[name].revenue += t.charges?.totalFare || 0;
  });
  const driverEarnings = Object.entries(driverMap)
    .map(([name, d]) => ({ name, trips: d.trips, revenue: d.revenue }))
    .sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Expense breakdown
  const expenseByCategory: Record<string, number> = {};
  filteredFinance.filter(e => e.type === 'expense').forEach(e => {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  });

  // Combined transactions
  const tripTxns = filteredTrips.slice(0, 30).map(t => ({
    id: t.tripNumber || t._id,
    date: t.createdAt,
    type: 'income' as const,
    category: 'Trip Revenue',
    description: `Trip – ${t.customer?.name} | ${t.vehicle?.plate || ''}`,
    driver: t.driver?.name || '-',
    amount: t.charges?.totalFare || 0,
    status: t.payment?.status || 'pending',
  }));
  const finTxns = filteredFinance.slice(0, 30).map(e => ({
    id: e._id,
    date: e.date,
    type: e.type,
    category: e.category,
    description: e.description,
    driver: '-',
    amount: e.amount,
    status: 'completed',
  }));
  const allTxns = [...tripTxns, ...finTxns]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 25);

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  const colors = ['#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280'];

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Payments & Finance</h1>
          <p style={{ color: '#5A6C7D' }}>Track income, expenses, and financial performance</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border hover:bg-gray-50 transition-all text-sm"
            style={{ borderColor: '#E5E7EB', color: '#5A6C7D' }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link href="/Dashboard/Finance">
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium text-sm"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          </Link>
        </div>
      </div>

      {/* Time Filter */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium" style={{ color: '#5A6C7D' }}>Period:</span>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All Time' },
            { key: '7days', label: '7 Days' },
            { key: '30days', label: '30 Days' },
            { key: '6months', label: '6 Months' },
            { key: '1year', label: '1 Year' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setTimeFilter(f.key)}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
              style={{
                background: timeFilter === f.key ? 'linear-gradient(135deg, #2563EB, #1E40AF)' : 'white',
                border: '1px solid #E5E7EB',
                color: timeFilter === f.key ? '#fff' : '#5A6C7D',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading financial data...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: '#DBEAFE' }}>
                  <TrendingUp className="w-5 h-5" style={{ color: '#2563EB' }} />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium" style={{ color: '#10B981' }}>
                  <ArrowUpRight className="w-3.5 h-3.5" /> Income
                </div>
              </div>
              <div className="text-2xl font-bold" style={{ color: '#1A2332' }}>{fmt(totalIncome)}</div>
              <div className="text-xs mt-1" style={{ color: '#5A6C7D' }}>Total Income</div>
              <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                Trips: {fmt(tripRevenue)} + Other: {fmt(financeIncome)}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                  <TrendingDown className="w-5 h-5" style={{ color: '#EF4444' }} />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium" style={{ color: '#EF4444' }}>
                  <ArrowDownRight className="w-3.5 h-3.5" /> Expense
                </div>
              </div>
              <div className="text-2xl font-bold" style={{ color: '#1A2332' }}>{fmt(totalExpense)}</div>
              <div className="text-xs mt-1" style={{ color: '#5A6C7D' }}>Total Expenses</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
                  <DollarSign className="w-5 h-5" style={{ color: '#10B981' }} />
                </div>
                <div
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: netProfit >= 0 ? '#10B981' : '#EF4444' }}
                >
                  {netProfit >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {netProfit >= 0 ? 'Profit' : 'Loss'}
                </div>
              </div>
              <div className="text-2xl font-bold" style={{ color: netProfit >= 0 ? '#10B981' : '#EF4444' }}>
                {fmt(Math.abs(netProfit))}
              </div>
              <div className="text-xs mt-1" style={{ color: '#5A6C7D' }}>Net Profit</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                  <Wallet className="w-5 h-5" style={{ color: '#F59E0B' }} />
                </div>
                <div className="text-xs font-medium" style={{ color: '#5A6C7D' }}>Margin</div>
              </div>
              <div className="text-2xl font-bold" style={{ color: '#1A2332' }}>{profitMargin}%</div>
              <div className="text-xs mt-1" style={{ color: '#5A6C7D' }}>Profit Margin</div>
              <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{completedTrips.length} trips completed</div>
            </div>
          </div>

          {/* Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="font-bold text-base mb-4" style={{ color: '#1A2332' }}>Income Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: `Trip Revenue (${completedTrips.length} trips)`, value: tripRevenue, color: '#2563EB' },
                  { label: 'Other Income', value: financeIncome, color: '#10B981' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#F8F9FA' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span className="text-sm" style={{ color: '#5A6C7D' }}>{item.label}</span>
                    </div>
                    <span className="font-semibold text-sm" style={{ color: '#1A2332' }}>{fmt(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="font-bold text-base mb-4" style={{ color: '#1A2332' }}>Expense Breakdown</h3>
              {Object.keys(expenseByCategory).length === 0 ? (
                <div className="text-center py-6 text-sm" style={{ color: '#9CA3AF' }}>
                  No expense entries.{' '}
                  <Link href="/Dashboard/Finance" className="text-blue-600 hover:underline">Add expenses →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(expenseByCategory).sort(([, a], [, b]) => b - a).map(([cat, amt], i) => (
                    <div key={cat} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#F8F9FA' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: colors[i % colors.length] }} />
                        <span className="text-sm" style={{ color: '#5A6C7D' }}>{cat}</span>
                      </div>
                      <span className="font-semibold text-sm" style={{ color: '#1A2332' }}>{fmt(amt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Driver Earnings */}
          {driverEarnings.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm mb-5 overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
                <h3 className="font-bold text-base" style={{ color: '#1A2332' }}>Driver Earnings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ background: '#F8F9FA' }}>
                    <tr>
                      {['Driver', 'Completed Trips', 'Revenue Generated'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase" style={{ color: '#5A6C7D' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {driverEarnings.map((d, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-5 py-3 font-medium text-sm" style={{ color: '#1A2332' }}>{d.name}</td>
                        <td className="px-5 py-3 text-sm" style={{ color: '#5A6C7D' }}>{d.trips}</td>
                        <td className="px-5 py-3 font-semibold text-sm" style={{ color: '#10B981' }}>{fmt(d.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: '#E5E7EB' }}>
              <h3 className="font-bold text-base" style={{ color: '#1A2332' }}>Recent Transactions</h3>
              <Link href="/Dashboard/Finance" className="flex items-center gap-1 text-sm font-medium" style={{ color: '#2563EB' }}>
                <FileText className="w-4 h-4" /> Manage Finance
              </Link>
            </div>

            {allTxns.length === 0 ? (
              <div className="p-10 text-center text-sm" style={{ color: '#9CA3AF' }}>
                No transactions yet. Complete trips or add finance entries.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ background: '#F8F9FA' }}>
                    <tr>
                      {['Date', 'Type', 'Category', 'Description', 'Driver', 'Amount', 'Status'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase" style={{ color: '#5A6C7D' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allTxns.map((txn, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-5 py-3 text-xs" style={{ color: '#5A6C7D' }}>
                          {new Date(txn.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              background: txn.type === 'income' ? '#D1FAE5' : '#FEE2E2',
                              color: txn.type === 'income' ? '#065F46' : '#991B1B',
                            }}
                          >
                            {txn.type}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs" style={{ color: '#5A6C7D' }}>{txn.category}</td>
                        <td className="px-5 py-3 text-xs max-w-xs truncate" style={{ color: '#1A2332' }}>{txn.description}</td>
                        <td className="px-5 py-3 text-xs" style={{ color: '#5A6C7D' }}>{txn.driver}</td>
                        <td
                          className="px-5 py-3 font-bold text-sm"
                          style={{ color: txn.type === 'income' ? '#10B981' : '#EF4444' }}
                        >
                          {txn.type === 'income' ? '+' : '-'}{fmt(txn.amount)}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              background: ['paid', 'completed'].includes(txn.status) ? '#D1FAE5' : '#FEF3C7',
                              color: ['paid', 'completed'].includes(txn.status) ? '#065F46' : '#92400E',
                            }}
                          >
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
