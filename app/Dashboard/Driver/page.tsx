'use client';
import React, { useState } from 'react';
import { Car, Users, Menu, Bell, Settings, Plus, Edit, Trash2, Phone, Mail, MapPin, Calendar, X, User, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Driver {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: 'available' | 'on-trip' | 'offline';
  vehicle: string;
  license: string;
  joinDate: string;
  rating: number;
  trips: number;
}

export default function DriversPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [drivers, setDrivers] = useState<Driver[]>([
    { id: 1, name: 'Mike Johnson', phone: '+1 234-567-8901', email: 'mike.j@tripease.com', status: 'available', vehicle: 'Toyota Camry - ABC123', license: 'DL-12345678', joinDate: '2023-05-15', rating: 4.8, trips: 342 },
    { id: 2, name: 'David Brown', phone: '+1 234-567-8902', email: 'david.b@tripease.com', status: 'on-trip', vehicle: 'Honda Accord - XYZ789', license: 'DL-23456789', joinDate: '2023-06-20', rating: 4.9, trips: 298 },
    { id: 3, name: 'Chris Wilson', phone: '+1 234-567-8903', email: 'chris.w@tripease.com', status: 'available', vehicle: 'Ford Fusion - DEF456', license: 'DL-34567890', joinDate: '2023-07-10', rating: 4.7, trips: 275 },
    { id: 4, name: 'James Taylor', phone: '+1 234-567-8904', email: 'james.t@tripease.com', status: 'offline', vehicle: 'Hyundai Elantra - GHI321', license: 'DL-45678901', joinDate: '2023-08-05', rating: 4.6, trips: 189 },
    { id: 5, name: 'Tom Anderson', phone: '+1 234-567-8905', email: 'tom.a@tripease.com', status: 'on-trip', vehicle: 'Nissan Altima - JKL654', license: 'DL-56789012', joinDate: '2023-09-12', rating: 4.8, trips: 156 },
    { id: 6, name: 'Robert Martinez', phone: '+1 234-567-8906', email: 'robert.m@tripease.com', status: 'available', vehicle: 'Chevrolet Malibu - MNO987', license: 'DL-67890123', joinDate: '2023-10-18', rating: 4.5, trips: 124 }
  ]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    license: '',
    vehicle: ''
  });

  const getStatusStyle = (status:any) => {
    switch(status) {
      case 'available': return { bg: 'bg-green-100', text: 'text-green-700', dot: '#10B981' };
      case 'on-trip': return { bg: 'bg-blue-100', text: 'text-blue-700', dot: '#2563EB' };
      case 'offline': return { bg: 'bg-gray-100', text: 'text-gray-700', dot: '#9CA3AF' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: '#9CA3AF' };
    }
  };

  const handleAddDriver = () => {
    setEditingDriver(null);
    setFormData({ name: '', phone: '', email: '', license: '', vehicle: '' });
    setShowModal(true);
  };

  const handleEditDriver = (driver:any) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      email: driver.email,
      license: driver.license,
      vehicle: driver.vehicle
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingDriver) {
      setDrivers(drivers.map(d => d.id === editingDriver.id ? { ...d, ...formData } : d));
    } else {
      const newDriver: Driver = {
        id: drivers.length + 1,
        ...formData,
        status: 'offline',
        joinDate: new Date().toISOString().split('T')[0],
        rating: 0,
        trips: 0
      };
      setDrivers([...drivers, newDriver]);
    }
    setShowModal(false);
  };

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.phone.includes(searchTerm) ||
                         driver.vehicle.toLowerCase().includes(searchTerm.toLowerCase());
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
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Drivers Management</h1>
            <p style={{ color: '#5A6C7D' }}>Manage your driver fleet</p>
          </div>
          <button 
            onClick={handleAddDriver}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
          >
            <Plus className="w-5 h-5" />
            Add Driver
          </button>
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
              <div key={driver.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all" style={{ border: '1px solid #E5E7EB' }}>
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
                      <span className="font-medium">{driver.vehicle}</span>
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
                    <button 
                      onClick={() => handleEditDriver(driver)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:bg-blue-50"
                      style={{ border: '1px solid #2563EB', color: '#2563EB' }}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button className="p-2 rounded-lg transition-all hover:bg-red-50" style={{ border: '1px solid #EF4444', color: '#EF4444' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      {showModal && (
       <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
    
    {/* Header */}
    <div
      className="flex items-center justify-between px-6 py-4 border-b shrink-0"
      style={{ borderColor: '#E5E7EB' }}
    >
      <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>
        {editingDriver ? 'Edit Driver' : 'Add New Driver'}
      </h2>
      <button
        onClick={() => setShowModal(false)}
        className="p-1 hover:bg-gray-100 rounded-lg"
      >
        <X className="w-5 h-5" style={{ color: '#5A6C7D' }} />
      </button>
    </div>

    {/* Scrollable Content */}
    <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
      {[
        { label: 'Full Name', value: formData.name, key: 'name', type: 'text', placeholder: 'John Doe' },
        { label: 'Phone Number', value: formData.phone, key: 'phone', type: 'tel', placeholder: '+91 98765 43210' },
        { label: 'Email', value: formData.email, key: 'email', type: 'email', placeholder: 'driver@tripease.com' },
        { label: 'License Number', value: formData.license, key: 'license', type: 'text', placeholder: 'DL-12345678' },
        { label: 'Assigned Vehicle', value: formData.vehicle, key: 'vehicle', type: 'text', placeholder: 'Toyota Camry - ABC123' },
      ].map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>
            {field.label}
          </label>
          <input
            type={field.type}
            value={field.value}
            onChange={(e) =>
              setFormData({ ...formData, [field.key]: e.target.value })
            }
            placeholder={field.placeholder}
            className="w-full px-3 py-2.5 rounded-lg"
            style={{
              border: '1px solid #E5E7EB',
              color: '#1A2332',
              outline: 'none',
            }}
          />
        </div>
      ))}
    </div>

    {/* Footer */}
    <div
      className="flex gap-3 px-6 py-4 border-t shrink-0"
      style={{ borderColor: '#E5E7EB' }}
    >
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
        style={{
          background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
        }}
      >
        {editingDriver ? 'Save Changes' : 'Add Driver'}
      </button>
    </div>

  </div>
</div>

      )}
    </div>
  );
}