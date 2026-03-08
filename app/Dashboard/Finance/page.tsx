'use client';
import React, { useEffect, useState, useRef } from 'react';
import {
  Plus, Trash2, X, TrendingUp, TrendingDown, DollarSign,
  Calendar, Filter, Edit2, ChevronDown, ArrowUpRight, ArrowDownRight, Download
} from 'lucide-react';
import { exportToExcel } from '@/lib/exportToExcel';

type FinanceEntry = {
  _id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  referenceId?: string;
  notes?: string;
};

type Summary = { totalIncome: number; totalExpense: number; net: number };

const INCOME_CATEGORIES = ['Trip Revenue', 'Other Income', 'Advance Payment', 'Refund Received'];
const EXPENSE_CATEGORIES = ['Fuel', 'Salary', 'Servicing', 'Maintenance', 'Insurance', 'Toll', 'Parking', 'Office Expense', 'Other'];
const PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank', 'other'];

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function FinancePage() {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalIncome: 0, totalExpense: 0, net: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<FinanceEntry | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    date: todayStr(),
    type: 'income' as 'income' | 'expense',
    category: '',
    description: '',
    amount: '',
    paymentMethod: 'cash',
    referenceId: '',
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    setLoading(true);
    try {
      const param =
        viewMode === 'day'
          ? `date=${selectedDate}`
          : `month=${selectedDate.slice(0, 7)}`;
      const res = await fetch(`/api/finance?${param}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setSummary(data.summary || { totalIncome: 0, totalExpense: 0, net: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedDate, viewMode]);

  const openAdd = () => {
    setEditEntry(null);
    setForm({ ...emptyForm, date: selectedDate });
    setShowModal(true);
  };

  const openEdit = (entry: FinanceEntry) => {
    setEditEntry(entry);
    setForm({
      date: entry.date.slice(0, 10),
      type: entry.type,
      category: entry.category,
      description: entry.description,
      amount: entry.amount.toString(),
      paymentMethod: entry.paymentMethod,
      referenceId: entry.referenceId || '',
      notes: entry.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.category || !form.description || !form.amount) {
      alert('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      if (editEntry) {
        await fetch('/api/finance', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _id: editEntry._id, ...form }),
        });
      } else {
        await fetch('/api/finance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Failed to save entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    await fetch('/api/finance', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  const filtered = entries.filter(e => typeFilter === 'all' || e.type === typeFilter);

  const categoryColors: Record<string, string> = {
    'Trip Revenue': '#10B981',
    'Other Income': '#3B82F6',
    'Advance Payment': '#6366F1',
    'Refund Received': '#14B8A6',
    Fuel: '#F59E0B',
    Salary: '#EF4444',
    Servicing: '#F97316',
    Maintenance: '#EC4899',
    Insurance: '#8B5CF6',
    Toll: '#6B7280',
    Parking: '#9CA3AF',
    'Office Expense': '#94A3B8',
    Other: '#CBD5E1',
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#1A2332' }}>Daily Finance</h1>
          <p className="text-sm mt-1" style={{ color: '#5A6C7D' }}>Track income & expenses day by day</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportToExcel(
              'Finance', 'Finance',
              ['Date','Type','Category','Description','Amount (₹)','Payment Method','Reference','Notes'],
              filtered.map(e => [
                new Date(e.date).toLocaleDateString('en-IN'), e.type, e.category,
                e.description, e.amount, e.paymentMethod, e.referenceId||'', e.notes||''
              ])
            )}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border hover:bg-gray-50 transition-all text-sm"
            style={{ borderColor: '#E5E7EB', color: '#5A6C7D' }}
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
          >
            <Plus className="w-5 h-5" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Date + View Toggle */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#E5E7EB' }}>
          {(['day', 'month'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="px-4 py-2 text-sm font-medium transition-all"
              style={{
                background: viewMode === mode ? 'linear-gradient(135deg, #2563EB, #1E40AF)' : 'white',
                color: viewMode === mode ? '#fff' : '#5A6C7D',
              }}
            >
              {mode === 'day' ? 'Day' : 'Month'}
            </button>
          ))}
        </div>

        <input
          type={viewMode === 'day' ? 'date' : 'month'}
          value={viewMode === 'day' ? selectedDate : selectedDate.slice(0, 7)}
          onChange={e =>
            setSelectedDate(viewMode === 'day' ? e.target.value : e.target.value + '-01')
          }
          className="px-4 py-2 rounded-lg border text-sm"
          style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
        />

        {/* Type filter */}
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#E5E7EB' }}>
          {(['all', 'income', 'expense'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="px-4 py-2 text-sm font-medium transition-all capitalize"
              style={{
                background:
                  typeFilter === t
                    ? t === 'income'
                      ? '#10B981'
                      : t === 'expense'
                      ? '#EF4444'
                      : '#2563EB'
                    : 'white',
                color: typeFilter === t ? '#fff' : '#5A6C7D',
              }}
            >
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} />
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: '#D1FAE5', color: '#065F46' }}>
              Income
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ color: '#1A2332' }}>
            ₹{summary.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs mt-1" style={{ color: '#5A6C7D' }}>Total Income</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
              <TrendingDown className="w-5 h-5" style={{ color: '#EF4444' }} />
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: '#FEE2E2', color: '#991B1B' }}>
              Expense
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ color: '#1A2332' }}>
            ₹{summary.totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs mt-1" style={{ color: '#5A6C7D' }}>Total Expense</p>
        </div>

        <div
          className="rounded-xl p-5 shadow-sm"
          style={{
            border: '1px solid #E5E7EB',
            background: summary.net >= 0
              ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
              : 'linear-gradient(135deg, #fef2f2, #fee2e2)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg bg-white">
              <DollarSign className="w-5 h-5" style={{ color: summary.net >= 0 ? '#10B981' : '#EF4444' }} />
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: summary.net >= 0 ? '#065F46' : '#991B1B' }}
            >
              {summary.net >= 0 ? 'Profit' : 'Loss'}
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ color: summary.net >= 0 ? '#10B981' : '#EF4444' }}>
            {summary.net >= 0 ? '+' : ''}₹{summary.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs mt-1" style={{ color: '#5A6C7D' }}>Net {summary.net >= 0 ? 'Profit' : 'Loss'}</p>
        </div>
      </div>

      {/* Entries Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#E5E7EB' }}>
          <h3 className="font-bold text-lg" style={{ color: '#1A2332' }}>
            Transactions ({filtered.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p style={{ color: '#9CA3AF' }}>No entries for this period.</p>
            <button
              onClick={openAdd}
              className="mt-4 px-5 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}
            >
              Add First Entry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#F8F9FA' }}>
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#5A6C7D' }}>Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#5A6C7D' }}>Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#5A6C7D' }}>Category</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#5A6C7D' }}>Description</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#5A6C7D' }}>Payment</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#5A6C7D' }}>Amount</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: '#5A6C7D' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, idx) => (
                  <tr
                    key={entry._id}
                    className="border-b hover:bg-gray-50 transition-colors"
                    style={{ borderColor: '#F3F4F6' }}
                  >
                    <td className="px-5 py-3 text-sm" style={{ color: '#5A6C7D' }}>
                      {new Date(entry.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: entry.type === 'income' ? '#D1FAE5' : '#FEE2E2',
                          color: entry.type === 'income' ? '#065F46' : '#991B1B',
                        }}
                      >
                        {entry.type === 'income' ? '↑ Income' : '↓ Expense'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          background: (categoryColors[entry.category] || '#6B7280') + '20',
                          color: categoryColors[entry.category] || '#6B7280',
                        }}
                      >
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: '#1A2332' }}>
                      <div>{entry.description}</div>
                      {entry.notes && (
                        <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{entry.notes}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm capitalize" style={{ color: '#5A6C7D' }}>
                      {entry.paymentMethod}
                    </td>
                    <td
                      className="px-5 py-3 text-right font-bold text-sm"
                      style={{ color: entry.type === 'income' ? '#10B981' : '#EF4444' }}
                    >
                      {entry.type === 'income' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(entry)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          style={{ color: '#2563EB' }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry._id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          style={{ color: '#EF4444' }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Footer totals */}
              <tfoot style={{ backgroundColor: '#F8F9FA', borderTop: '2px solid #E5E7EB' }}>
                <tr>
                  <td colSpan={5} className="px-5 py-3 font-semibold text-sm" style={{ color: '#1A2332' }}>
                    Totals
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-sm" style={{ color: '#1A2332' }}>
                    <div style={{ color: '#10B981' }}>+₹{summary.totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div style={{ color: '#EF4444' }}>-₹{summary.totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>
                {editEntry ? 'Edit Entry' : 'Add Finance Entry'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" style={{ color: '#5A6C7D' }} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              {/* Type toggle */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1A2332' }}>Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['income', 'expense'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm({ ...form, type: t, category: '' })}
                      className="py-2.5 rounded-lg font-medium text-sm capitalize transition-all"
                      style={{
                        background:
                          form.type === t
                            ? t === 'income'
                              ? 'linear-gradient(135deg, #10B981, #059669)'
                              : 'linear-gradient(135deg, #EF4444, #DC2626)'
                            : 'white',
                        color: form.type === t ? '#fff' : '#5A6C7D',
                        border: `1px solid ${form.type === t ? 'transparent' : '#E5E7EB'}`,
                      }}
                    >
                      {t === 'income' ? '↑ Income' : '↓ Expense'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm"
                    style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Category *</label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm"
                    style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
                  >
                    <option value="">Select category</option>
                    {(form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Description *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g., Trip payment received, Fuel refill"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm"
                  style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Amount (₹) *</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2.5 rounded-lg border text-sm"
                    style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm capitalize"
                    style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m} className="capitalize">{m.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Reference (optional)</label>
                <input
                  type="text"
                  value={form.referenceId}
                  onChange={e => setForm({ ...form, referenceId: e.target.value })}
                  placeholder="Trip ID, invoice number, etc."
                  className="w-full px-3 py-2.5 rounded-lg border text-sm"
                  style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm resize-none"
                  style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: '#E5E7EB' }}>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm"
                style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}
              >
                {submitting ? 'Saving...' : editEntry ? 'Save Changes' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
