'use client';
import React, { useEffect, useState } from 'react';
import { Plus, Search, X, Edit2, Trash2, Users, Phone, Mail, MapPin, UserCheck, UserX, Ban } from 'lucide-react';

type Customer = {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  memberId?: string;
  status: 'active' | 'inactive' | 'banned';
  joinDate?: string;
  totalRides?: number;
  createdAt: string;
};

const STATUS_COLORS = {
  active: { bg: '#D1FAE5', text: '#065F46' },
  inactive: { bg: '#FEF3C7', text: '#92400E' },
  banned: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Customer['status']>('all');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    name: '',
    phone: '',
    email: '',
    address: '',
    memberId: '',
    status: 'active' as Customer['status'],
  };
  const [form, setForm] = useState(emptyForm);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customer');
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const openAdd = () => {
    setEditCustomer(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      memberId: c.memberId || '',
      status: c.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.phone) {
      alert('Name and phone are required');
      return;
    }
    setSubmitting(true);
    try {
      if (editCustomer) {
        await fetch('/api/customer', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _id: editCustomer._id, ...form }),
        });
      } else {
        const res = await fetch('/api/customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Failed to add customer');
          return;
        }
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      alert('Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    try {
      await fetch('/api/customer', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: customerToDelete._id }),
      });
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (err) {
      alert('Failed to delete customer');
    }
  };

  const filtered = customers.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = customers.filter(c => c.status === 'active').length;
  const inactiveCount = customers.filter(c => c.status === 'inactive').length;
  const bannedCount = customers.filter(c => c.status === 'banned').length;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#1A2332' }}>Customers</h1>
          <p className="text-sm mt-1" style={{ color: '#5A6C7D' }}>Manage your customer base</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: customers.length, color: '#2563EB', bg: '#DBEAFE' },
          { label: 'Active', value: activeCount, color: '#10B981', bg: '#D1FAE5' },
          { label: 'Inactive', value: inactiveCount, color: '#F59E0B', bg: '#FEF3C7' },
          { label: 'Banned', value: bannedCount, color: '#EF4444', bg: '#FEE2E2' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: stat.bg }}>
                <Users className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: '#1A2332' }}>{stat.value}</div>
                <div className="text-xs" style={{ color: '#5A6C7D' }}>{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-48 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm"
            style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
          />
        </div>
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#E5E7EB' }}>
          {(['all', 'active', 'inactive', 'banned'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-4 py-2 text-sm font-medium capitalize transition-all"
              style={{
                background: statusFilter === s ? 'linear-gradient(135deg, #2563EB, #1E40AF)' : 'white',
                color: statusFilter === s ? '#fff' : '#5A6C7D',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading customers...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-14 h-14 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 mb-4">{search ? 'No customers match your search.' : 'No customers yet.'}</p>
          {!search && (
            <button
              onClick={openAdd}
              className="px-5 py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}
            >
              Add First Customer
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(customer => (
            <div
              key={customer._id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
              style={{ border: '1px solid #E5E7EB' }}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
                      style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}
                    >
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold" style={{ color: '#1A2332' }}>{customer.name}</h3>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: STATUS_COLORS[customer.status].bg,
                          color: STATUS_COLORS[customer.status].text,
                        }}
                      >
                        {customer.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(customer)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      style={{ color: '#2563EB' }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setCustomerToDelete(customer); setShowDeleteModal(true); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      style={{ color: '#EF4444' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2" style={{ color: '#5A6C7D' }}>
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2" style={{ color: '#5A6C7D' }}>
                      <Mail className="w-4 h-4 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-start gap-2" style={{ color: '#5A6C7D' }}>
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{customer.address}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between border-t" style={{ borderColor: '#F3F4F6' }}>
                  <div className="text-xs" style={{ color: '#9CA3AF' }}>
                    Joined {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-IN') : 'N/A'}
                  </div>
                  {customer.memberId && (
                    <div className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                      #{customer.memberId}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>
                {editCustomer ? 'Edit Customer' : 'Add Customer'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" style={{ color: '#5A6C7D' }} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-3 py-2.5 rounded-lg border text-sm"
                    style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Phone *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2.5 rounded-lg border text-sm"
                    style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm"
                  style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Address</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Full address..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm resize-none"
                  style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Member ID</label>
                  <input
                    type="text"
                    value={form.memberId}
                    onChange={e => setForm({ ...form, memberId: e.target.value })}
                    placeholder="MEM001"
                    className="w-full px-3 py-2.5 rounded-lg border text-sm"
                    style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value as Customer['status'] })}
                    className="w-full px-3 py-2.5 rounded-lg border text-sm capitalize"
                    style={{ borderColor: '#E5E7EB', color: '#1A2332' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
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
                className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}
              >
                {submitting ? 'Saving...' : editCustomer ? 'Save Changes' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && customerToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-center mb-2" style={{ color: '#1A2332' }}>Delete Customer</h2>
            <p className="text-center text-sm mb-6" style={{ color: '#5A6C7D' }}>
              Are you sure you want to delete <strong>{customerToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setCustomerToDelete(null); }}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm"
                style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium text-sm"
                style={{ backgroundColor: '#EF4444' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
