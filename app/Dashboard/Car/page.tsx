// src/app/fleet/page.tsx
'use client';
import React, { useState } from 'react';
import { Car, Menu, Bell, Settings, Plus, Edit, Trash2, Calendar, X, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface Car {
  id: number;
  carNumber: string;
  model: string;
  insuranceExpiry: string;
  rcNumber: string;
  status: 'valid' | 'expiring' | 'expired';
}

export default function FleetPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  //add pollution and chechis number also

  const [cars, setCars] = useState<Car[]>([
    { id: 1, carNumber: 'DL01AB1234', model: 'Toyota Innova', insuranceExpiry: '2025-12-15', rcNumber: 'RC123456789', status: 'valid' },
    { id: 2, carNumber: 'DL02CD5678', model: 'Honda City', insuranceExpiry: '2025-01-25', rcNumber: 'RC234567890', status: 'expiring' },
    { id: 3, carNumber: 'DL03EF9012', model: 'Maruti Swift', insuranceExpiry: '2024-11-10', rcNumber: 'RC345678901', status: 'expired' },
    { id: 4, carNumber: 'DL04GH3456', model: 'Hyundai Creta', insuranceExpiry: '2025-08-20', rcNumber: 'RC456789012', status: 'valid' },
    { id: 5, carNumber: 'DL05IJ7890', model: 'Mahindra XUV500', insuranceExpiry: '2025-02-05', rcNumber: 'RC567890123', status: 'expiring' },
    { id: 6, carNumber: 'DL06KL2345', model: 'Ford EcoSport', insuranceExpiry: '2025-06-30', rcNumber: 'RC678901234', status: 'valid' }
  ]);

  const [formData, setFormData] = useState({
    carNumber: '',
    model: '',
    insuranceExpiry: '',
    rcNumber: ''
  });

  const getInsuranceStatus = (expiryDate: string): 'valid' | 'expiring' | 'expired' => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring';
    return 'valid';
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'valid': return { bg: 'bg-green-100', text: 'text-green-700', dot: '#10B981', icon: CheckCircle };
      case 'expiring': return { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: '#F59E0B', icon: Clock };
      case 'expired': return { bg: 'bg-red-100', text: 'text-red-700', dot: '#EF4444', icon: XCircle };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: '#9CA3AF', icon: AlertCircle };
    }
  };

  const handleAddCar = () => {
    setEditingCar(null);
    setFormData({ carNumber: '', model: '', insuranceExpiry: '', rcNumber: '' });
    setShowModal(true);
  };

  const handleEditCar = (car: Car) => {
    setEditingCar(car);
    setFormData({
      carNumber: car.carNumber,
      model: car.model,
      insuranceExpiry: car.insuranceExpiry,
      rcNumber: car.rcNumber
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    const status = getInsuranceStatus(formData.insuranceExpiry);
    
    if (editingCar) {
      setCars(cars.map(c => c.id === editingCar.id ? { ...c, ...formData, status } : c));
    } else {
      const newCar: Car = {
        id: cars.length + 1,
        ...formData,
        status
      };
      setCars([...cars, newCar]);
    }
    setShowModal(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this car?')) {
      setCars(cars.filter(c => c.id !== id));
    }
  };

  const filteredCars = cars.filter(car => {
    const matchesSearch = car.carNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         car.rcNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || car.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: cars.length,
    valid: cars.filter(c => c.status === 'valid').length,
    expiring: cars.filter(c => c.status === 'expiring').length,
    expired: cars.filter(c => c.status === 'expired').length
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Fleet Management</h1>
            <p style={{ color: '#5A6C7D' }}>Manage your vehicle fleet</p>
          </div>
          <button 
            onClick={handleAddCar}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
          >
            <Plus className="w-5 h-5" />
            Add Car
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Cars', value: statusCounts.all, icon: Car, color: '#2563EB' },
            { label: 'Valid Insurance', value: statusCounts.valid, icon: CheckCircle, color: '#10B981' },
            { label: 'Expiring Soon', value: statusCounts.expiring, icon: Clock, color: '#F59E0B' },
            { label: 'Expired', value: statusCounts.expired, icon: XCircle, color: '#EF4444' }
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
              placeholder="Search cars by number, model, or RC..."
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
              <option value="valid">Valid</option>
              <option value="expiring">Expiring</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCars.map(car => {
            const statusStyle = getStatusStyle(car.status);
            const StatusIcon = statusStyle.icon;
            const expiryDate = new Date(car.insuranceExpiry).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
            
            return (
              <div key={car.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all" style={{ border: '1px solid #E5E7EB' }}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                        <Car className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: '#1A2332' }}>{car.carNumber}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {car.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusStyle.dot }}></div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#5A6C7D' }}>
                      <Car className="w-4 h-4" />
                      <span className="font-medium">{car.model}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#5A6C7D' }}>
                      <Calendar className="w-4 h-4" />
                      <span>Insurance: {expiryDate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#5A6C7D' }}>
                      <CheckCircle className="w-4 h-4" />
                      <span>RC: {car.rcNumber}</span>
                    </div>
                  </div>

                  <div className="pt-4 mb-4" style={{ borderTop: '1px solid #E5E7EB' }}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Car Number</p>
                        <p className="text-sm font-bold" style={{ color: '#1A2332' }}>{car.carNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Model</p>
                        <p className="text-sm font-bold" style={{ color: '#1A2332' }}>{car.model}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditCar(car)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:bg-blue-50"
                      style={{ border: '1px solid #2563EB', color: '#2563EB' }}
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(car.id)}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
            
            <div
              className="flex items-center justify-between px-6 py-4 border-b shrink-0"
              style={{ borderColor: '#E5E7EB' }}
            >
              <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>
                {editingCar ? 'Edit Car' : 'Add New Car'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" style={{ color: '#5A6C7D' }} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
              {[
                { label: 'Car Number', value: formData.carNumber, key: 'carNumber', type: 'text', placeholder: 'e.g., DL01AB1234' },
                { label: 'Model', value: formData.model, key: 'model', type: 'text', placeholder: 'e.g., Toyota Innova' },
                { label: 'Insurance Expiry', value: formData.insuranceExpiry, key: 'insuranceExpiry', type: 'date', placeholder: '' },
                { label: 'RC Number', value: formData.rcNumber, key: 'rcNumber', type: 'text', placeholder: 'e.g., RC123456789' },
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
                {editingCar ? 'Save Changes' : 'Add Car'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}