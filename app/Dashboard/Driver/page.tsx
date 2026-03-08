'use client';
import React, { useState, useEffect } from 'react';
import { Car, Users, Menu, Bell, Settings, Plus, Edit, Trash2, Phone, Mail, MapPin, Calendar, X, User, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/exportToExcel';
import Link from 'next/link';

interface Driver {
  _id: string;
  name: string;
  phone: string;
  email: string;
  status: 'available' | 'on-trip' | 'offline';
  vehicle: string | null;
  license: string;
  joinDate: string;
  rating: number;
  trips: number;
  address?: string;
  bloodGroup?: string;
  emergencyContact?: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    license: '',
    vehicle: '',
    address: '',
    bloodGroup: '',
    emergencyContact: '',
    status: 'offline' as 'available' | 'on-trip' | 'offline',
    joinDate: new Date().toISOString().split('T')[0],
    rating: 0,
    trips: 0
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const res = await fetch('/api/driver');
      if (!res.ok) throw new Error('Failed to fetch drivers');
      const data = await res.json();
      setDrivers(data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      alert('Failed to load drivers');
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'available': return { bg: 'bg-green-100', text: 'text-green-700', dot: '#10B981' };
      case 'on-trip': return { bg: 'bg-blue-100', text: 'text-blue-700', dot: '#2563EB' };
      case 'offline': return { bg: 'bg-gray-100', text: 'text-gray-700', dot: '#9CA3AF' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: '#9CA3AF' };
    }
  };

  const handleAddDriver = () => {
    setEditingDriver(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      license: '',
      vehicle: '',
      address: '',
      bloodGroup: '',
      emergencyContact: '',
      status: 'offline',
      joinDate: new Date().toISOString().split('T')[0],
      rating: 0,
      trips: 0
    });
    setShowModal(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      license: driver.license,
      vehicle: driver.vehicle || '',
      address: driver.address || '',
      bloodGroup: driver.bloodGroup || '',
      emergencyContact: driver.emergencyContact || '',
      status: driver.status,
      joinDate: driver.joinDate ? new Date(driver.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      rating: driver.rating || 0,
      trips: driver.trips || 0
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim() || !formData.license.trim()) {
        alert('Please fill in all required fields (Name, Phone, Email, License)');
        return;
      }

      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        license: formData.license.trim(),
        vehicle: formData.vehicle.trim() || null,
        address: formData.address.trim(),
        bloodGroup: formData.bloodGroup.trim(),
        emergencyContact: formData.emergencyContact.trim(),
        status: formData.status,
        joinDate: formData.joinDate ? new Date(formData.joinDate) : new Date(),
        rating: Number(formData.rating) || 0,
        trips: Number(formData.trips) || 0,
      };

      const method = editingDriver ? 'PATCH' : 'POST';
      const endpoint = editingDriver ? `/api/driver/${editingDriver._id}` : '/api/driver';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server Error: ${errText}`);
      }

      const data = await res.json();
      console.log('Driver saved successfully:', data);

      setShowModal(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        license: '',
        vehicle: '',
        address: '',
        bloodGroup: '',
        emergencyContact: '',
        status: 'offline',
        joinDate: new Date().toISOString().split('T')[0],
        rating: 0,
        trips: 0,
      });
      
      fetchDrivers();
    } catch (err: any) {
      console.error('Error saving driver:', err.message);
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteClick = (driver: Driver) => {
    setDriverToDelete(driver);
    setDeleteConfirmName('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!driverToDelete) return;

    if (deleteConfirmName !== driverToDelete.name) {
      alert('Name does not match. Please enter the exact driver name to confirm deletion.');
      return;
    }

    try {
      const res = await fetch(`/api/driver/${driverToDelete._id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete driver');

      setShowDeleteModal(false);
      setDriverToDelete(null);
      setDeleteConfirmName('');
      fetchDrivers();
    } catch (error) {
      console.error('Error deleting driver:', error);
      alert('Failed to delete driver');
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.phone.includes(searchTerm) ||
                         (driver.vehicle && driver.vehicle.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || driver.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: drivers.length,
    available: drivers.filter(d => d.status === 'available').length,
    'on-trip': drivers.filter(d => d.status === 'on-trip').length,
    offline: drivers.filter(d => d.status === 'offline').length
  };

  return (
    <div className="min-h-screen mb-9" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="p-6">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Drivers Management</h1>
            <p style={{ color: '#5A6C7D' }}>Manage your driver fleet</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => exportToExcel(
                'Drivers', 'Drivers',
                ['Name','Phone','Email','Status','License No','Join Date','Rating','Total Trips','Blood Group','Emergency Contact','Address'],
                drivers.map(d => [d.name, d.phone, d.email, d.status, d.license,
                  d.joinDate ? new Date(d.joinDate).toLocaleDateString('en-IN') : '',
                  d.rating, d.trips, d.bloodGroup||'', d.emergencyContact||'', d.address||''])
              )}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border hover:bg-gray-50 transition-all text-sm"
              style={{ borderColor: '#E5E7EB', color: '#5A6C7D' }}
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
            <button
              onClick={handleAddDriver}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
            >
              <Plus className="w-5 h-5" />
              Add Driver
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Drivers', value: statusCounts.all, icon: Users, color: '#2563EB' },
            { label: 'Available', value: statusCounts.available, icon: CheckCircle, color: '#10B981' },
            { label: 'On Trip', value: statusCounts['on-trip'], icon: Car, color: '#F59E0B' },
            { label: 'Offline', value: statusCounts.offline, icon: XCircle, color: '#9CA3AF' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-xl p-6 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex items-center justify-between mb-3">
                <stat.icon className="w-8 h-8" style={{ color: stat.color }} />
                <span className="text-3xl font-bold" style={{ color: '#1A2332' }}>{stat.value}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: '#5A6C7D' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm mb-6 p-6" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search drivers by name, phone, or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg"
              style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 rounded-lg"
              style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="on-trip">On Trip</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map(driver => {
            const statusStyle = getStatusStyle(driver.status);
            return (
              <div key={driver._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all" style={{ border: '1px solid #E5E7EB' }}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                        {driver.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: '#1A2332' }}>{driver.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                            {driver.status.replace('-', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusStyle.dot }}></div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#5A6C7D' }}>
                      <Phone className="w-4 h-4" />
                      <span>{driver.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#5A6C7D' }}>
                      <Mail className="w-4 h-4" />
                      <span>{driver.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#5A6C7D' }}>
                      <Car className="w-4 h-4" />
                      <span className="font-medium">{driver.vehicle || 'No vehicle assigned'}</span>
                    </div>
                  </div>

                  <div className="pt-4 mb-4" style={{ borderTop: '1px solid #E5E7EB' }}>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Rating</p>
                        <p className="text-lg font-bold" style={{ color: '#1A2332' }}>⭐ {driver.rating}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Trips</p>
                        <p className="text-lg font-bold" style={{ color: '#1A2332' }}>{driver.trips}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>License</p>
                        <p className="text-xs font-medium" style={{ color: '#1A2332' }}>{driver.license}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/Dashboard/Driver/${driver._id}`} className="flex-1">
                      <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:bg-blue-50" style={{ border: '1px solid #2563EB', color: '#2563EB' }}>
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                    </Link>
                    <button 
                      onClick={() => handleDeleteClick(driver)}
                      className="p-2 rounded-lg transition-all hover:bg-red-50" 
                      style={{ border: '1px solid #EF4444', color: '#EF4444' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add/Edit Driver Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: '#E5E7EB' }}>
                <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>
                  {editingDriver ? 'Edit Driver' : 'Add New Driver'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" style={{ color: '#5A6C7D' }} />
                </button>
              </div>

              <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
                {[
                  { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'John Doe' },
                  { label: 'Phone Number *', key: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
                  { label: 'Email *', key: 'email', type: 'email', placeholder: 'driver@tripease.com' },
                  { label: 'License Number *', key: 'license', type: 'text', placeholder: 'DL-12345678' },
                  { label: 'Assigned Vehicle', key: 'vehicle', type: 'text', placeholder: 'Toyota Camry - ABC123' },
                  { label: 'Address', key: 'address', type: 'text', placeholder: '123 Street, City' },
                  { label: 'Blood Group', key: 'bloodGroup', type: 'text', placeholder: 'A+' },
                  { label: 'Emergency Contact', key: 'emergencyContact', type: 'tel', placeholder: '+91 98765 43211' },
                  { label: 'Status', key: 'status', type: 'select', options: ['available', 'on-trip', 'offline'] },
                  { label: 'Join Date', key: 'joinDate', type: 'date' },
                  { label: 'Rating', key: 'rating', type: 'number', placeholder: '0' },
                  { label: 'Trips', key: 'trips', type: 'number', placeholder: '0' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.key as keyof typeof formData]}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-lg"
                        style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                      >
                        {field.options!.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.key as keyof typeof formData] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                        placeholder={field.placeholder || ''}
                        className="w-full px-3 py-2.5 rounded-lg"
                        style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: '#E5E7EB' }}>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium"
                  style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium"
                  style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
                >
                  {editingDriver ? 'Save Changes' : 'Add Driver'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && driverToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
              </div>
              
              <h2 className="text-xl font-bold text-center mb-2" style={{ color: '#1A2332' }}>
                Delete Driver
              </h2>
              
              <p className="text-center mb-4" style={{ color: '#5A6C7D' }}>
                Are you sure you want to delete <strong>{driverToDelete.name}</strong>?
              </p>
              
              <p className="text-sm text-center mb-4" style={{ color: '#EF4444' }}>
                This action cannot be undone. Please type the driver's name to confirm.
              </p>
              
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={`Type "${driverToDelete.name}" to confirm`}
                className="w-full px-4 py-3 rounded-lg mb-6"
                style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDriverToDelete(null);
                    setDeleteConfirmName('');
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium"
                  style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleteConfirmName !== driverToDelete.name}
                  className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  Delete Driver
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}