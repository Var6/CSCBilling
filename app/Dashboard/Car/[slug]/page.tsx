'use client';
import React, { useState } from 'react';
import { Car, User, ArrowLeft, Edit, Plus, Bell, Wrench, FileText, DollarSign, Calendar, AlertTriangle, CheckCircle, Clock, TrendingUp, MapPin, Star, X } from 'lucide-react';
import Link from 'next/link';

interface Vehicle {
  id: number;
  name: string;
  plate: string;
  model: string;
  year: number;
  status: 'available' | 'in-use' | 'maintenance';
  color: string;
  fuelType: string;
  mileage: string;
  insurance: string;
  insuranceExpiry: string;
  pollution: string;
  pollutionExpiry: string;
  fitness: string;
  fitnessExpiry: string;
  assignedDriver: { id: number; name: string } | null;
  totalEarnings: number;
  monthlyEarnings: number;
  totalTrips: number;
}

interface MaintenanceRecord {
  id: number;
  date: string;
  type: string;
  description: string;
  cost: number;
  status: 'completed' | 'pending' | 'scheduled';
  nextDue?: string;
}

interface Driver {
  id: number;
  name: string;
  phone: string;
  rating: number;
  trips: number;
  status: 'available' | 'on-trip' | 'offline';
}

export default function VehicleSlugPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'documents'>('overview');

  const [vehicle, setVehicle] = useState<Vehicle>({
    id: 1,
    name: 'Toyota Camry',
    plate: 'ABC123',
    model: '2022 Camry Hybrid',
    year: 2022,
    status: 'in-use',
    color: 'Silver',
    fuelType: 'Hybrid',
    mileage: '45,230 km',
    insurance: 'Policy #INS-2024-001',
    insuranceExpiry: '2025-06-15',
    pollution: 'PUC-2024-ABC123',
    pollutionExpiry: '2025-02-10',
    fitness: 'FIT-2024-ABC123',
    fitnessExpiry: '2026-08-20',
    assignedDriver: { id: 1, name: 'Mike Johnson' },
    totalEarnings: 245680,
    monthlyEarnings: 42850,
    totalTrips: 342
  });

  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([
    { id: 1, date: '2025-01-05', type: 'Oil Change', description: 'Regular engine oil change with filter replacement', cost: 3500, status: 'completed' },
    { id: 2, date: '2024-12-20', type: 'Tire Rotation', description: 'All four tires rotated and balanced', cost: 1200, status: 'completed' },
    { id: 3, date: '2025-01-15', type: 'Brake Service', description: 'Brake pads inspection and cleaning', cost: 2800, status: 'scheduled', nextDue: '2025-01-15' }
  ]);

  const [availableDrivers] = useState<Driver[]>([
    { id: 1, name: 'Mike Johnson', phone: '+91 98765 43210', rating: 4.8, trips: 342, status: 'on-trip' },
    { id: 2, name: 'David Brown', phone: '+91 98765 43211', rating: 4.9, trips: 298, status: 'available' },
    { id: 3, name: 'Chris Wilson', phone: '+91 98765 43212', rating: 4.7, trips: 275, status: 'available' },
    { id: 4, name: 'James Taylor', phone: '+91 98765 43213', rating: 4.6, trips: 189, status: 'offline' }
  ]);

  const [maintenanceForm, setMaintenanceForm] = useState({
    type: '',
    description: '',
    cost: '',
    date: '',
    status: 'scheduled' as 'completed' | 'pending' | 'scheduled'
  });

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'available': return { bg: 'bg-green-100', text: 'text-green-700', dot: '#10B981' };
      case 'in-use': return { bg: 'bg-blue-100', text: 'text-blue-700', dot: '#2563EB' };
      case 'maintenance': return { bg: 'bg-orange-100', text: 'text-orange-700', dot: '#F59E0B' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: '#9CA3AF' };
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (days: number) => {
    if (days < 0) return { color: '#EF4444', text: 'Expired', icon: AlertTriangle };
    if (days <= 30) return { color: '#F59E0B', text: `${days} days left`, icon: AlertTriangle };
    return { color: '#10B981', text: 'Valid', icon: CheckCircle };
  };

  const statusStyle = getStatusStyle(vehicle.status);

  const handleAddMaintenance = () => {
    if (maintenanceForm.type && maintenanceForm.description && maintenanceForm.cost && maintenanceForm.date) {
      const newRecord: MaintenanceRecord = {
        id: maintenanceRecords.length + 1,
        date: maintenanceForm.date,
        type: maintenanceForm.type,
        description: maintenanceForm.description,
        cost: parseFloat(maintenanceForm.cost),
        status: maintenanceForm.status
      };
      setMaintenanceRecords([newRecord, ...maintenanceRecords]);
      setMaintenanceForm({ type: '', description: '', cost: '', date: '', status: 'scheduled' });
      setShowMaintenanceModal(false);
    }
  };

  const handleAssignDriver = (driver: Driver) => {
    setVehicle({ ...vehicle, assignedDriver: { id: driver.id, name: driver.name } });
    setShowDriverModal(false);
  };

  const handleUnassignDriver = () => {
    if (window.confirm('Are you sure you want to unassign the current driver?')) {
      setVehicle({ ...vehicle, assignedDriver: null });
    }
  };

  const documents = [
    { name: 'Insurance', number: vehicle.insurance, expiry: vehicle.insuranceExpiry },
    { name: 'Pollution Certificate', number: vehicle.pollution, expiry: vehicle.pollutionExpiry },
    { name: 'Fitness Certificate', number: vehicle.fitness, expiry: vehicle.fitnessExpiry }
  ];

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/Dashboard/Car">
          <button className="flex items-center gap-2 mb-4 text-sm font-medium hover:gap-3 transition-all" style={{ color: '#2563EB' }}>
            <ArrowLeft className="w-4 h-4" />
            Back to Vehicles
          </button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Vehicle Details</h1>
              <p style={{ color: '#5A6C7D' }}>View and manage vehicle information</p>
            </div>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
            >
              <Edit className="w-5 h-5" />
              {isEditing ? 'Cancel Edit' : 'Edit Vehicle'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle Info Card */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex items-start gap-6 mb-6">
                <div className="w-24 h-24 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                  <Car className="w-12 h-12" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold" style={{ color: '#1A2332' }}>{vehicle.name}</h2>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                      {vehicle.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-lg font-medium mb-1" style={{ color: '#5A6C7D' }}>{vehicle.model}</p>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>License Plate: <span className="font-bold" style={{ color: '#1A2332' }}>{vehicle.plate}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Year', value: vehicle.year },
                  { label: 'Color', value: vehicle.color },
                  { label: 'Fuel Type', value: vehicle.fuelType },
                  { label: 'Mileage', value: vehicle.mileage }
                ].map((field, idx) => (
                  <div key={idx}>
                    <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>{field.label}</p>
                    <p className="font-bold" style={{ color: '#1A2332' }}>{field.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex border-b" style={{ borderColor: '#E5E7EB' }}>
                {[
                  { id: 'overview', label: 'Overview', icon: Car },
                  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
                  { id: 'documents', label: 'Documents', icon: FileText }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-all ${
                      activeTab === tab.id ? 'border-b-2' : ''
                    }`}
                    style={{
                      borderColor: activeTab === tab.id ? '#2563EB' : 'transparent',
                      color: activeTab === tab.id ? '#2563EB' : '#5A6C7D'
                    }}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { label: 'Total Trips', value: vehicle.totalTrips, icon: Car, color: '#2563EB' },
                        { label: 'Total Earnings', value: `₹${vehicle.totalEarnings.toLocaleString()}`, icon: DollarSign, color: '#10B981' },
                        { label: 'This Month', value: `₹${vehicle.monthlyEarnings.toLocaleString()}`, icon: TrendingUp, color: '#F59E0B' }
                      ].map((stat, idx) => (
                        <div key={idx} className="p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                            <span className="text-sm" style={{ color: '#5A6C7D' }}>{stat.label}</span>
                          </div>
                          <p className="text-2xl font-bold" style={{ color: '#1A2332' }}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4" style={{ borderTop: '1px solid #E5E7EB' }}>
                      <h4 className="font-bold mb-3" style={{ color: '#1A2332' }}>Recent Activity</h4>
                      <div className="space-y-3">
                        {[
                          { date: '2025-01-08', trip: 'Airport to Downtown', earning: '₹850' },
                          { date: '2025-01-07', trip: 'Mall to Residential', earning: '₹420' },
                          { date: '2025-01-06', trip: 'Station to Business District', earning: '₹650' }
                        ].map((activity, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                            <div className="flex items-center gap-3">
                              <MapPin className="w-4 h-4" style={{ color: '#2563EB' }} />
                              <div>
                                <p className="text-sm font-medium" style={{ color: '#1A2332' }}>{activity.trip}</p>
                                <p className="text-xs" style={{ color: '#9CA3AF' }}>{activity.date}</p>
                              </div>
                            </div>
                            <span className="font-bold" style={{ color: '#10B981' }}>{activity.earning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Maintenance Tab */}
                {activeTab === 'maintenance' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold" style={{ color: '#1A2332' }}>Maintenance Records</h4>
                      <button 
                        onClick={() => setShowMaintenanceModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium text-sm"
                        style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
                      >
                        <Plus className="w-4 h-4" />
                        Add Record
                      </button>
                    </div>

                    <div className="space-y-3">
                      {maintenanceRecords.map((record) => (
                        <div key={record.id} className="p-4 rounded-lg" style={{ border: '1px solid #E5E7EB' }}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F0F9FF' }}>
                                <Wrench className="w-5 h-5" style={{ color: '#2563EB' }} />
                              </div>
                              <div>
                                <p className="font-bold" style={{ color: '#1A2332' }}>{record.type}</p>
                                <p className="text-xs" style={{ color: '#9CA3AF' }}>{record.date}</p>
                              </div>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              record.status === 'completed' ? 'bg-green-100 text-green-700' :
                              record.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {record.status}
                            </span>
                          </div>
                          <p className="text-sm mb-2" style={{ color: '#5A6C7D' }}>{record.description}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold" style={{ color: '#10B981' }}>₹{record.cost.toLocaleString()}</span>
                            {record.nextDue && (
                              <span className="text-xs" style={{ color: '#9CA3AF' }}>Next due: {record.nextDue}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div className="space-y-4">
                    {documents.map((doc, idx) => {
                      const daysLeft = getDaysUntilExpiry(doc.expiry);
                      const status = getExpiryStatus(daysLeft);
                      return (
                        <div key={idx} className="p-4 rounded-lg" style={{ border: '1px solid #E5E7EB' }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <FileText className="w-6 h-6" style={{ color: '#2563EB' }} />
                              <div>
                                <p className="font-bold" style={{ color: '#1A2332' }}>{doc.name}</p>
                                <p className="text-xs" style={{ color: '#9CA3AF' }}>{doc.number}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <status.icon className="w-5 h-5" style={{ color: status.color }} />
                              <span className="text-sm font-medium" style={{ color: status.color }}>{status.text}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: '#5A6C7D' }}>Expiry Date: {doc.expiry}</span>
                            {daysLeft <= 30 && daysLeft > 0 && (
                              <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                                <Bell className="w-3 h-3" />
                                Renewal Required
                              </div>
                            )}
                            {daysLeft < 0 && (
                              <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                                <AlertTriangle className="w-3 h-3" />
                                Expired
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Assigned Driver Card */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1A2332' }}>Assigned Driver</h3>

              {vehicle.assignedDriver ? (
                <div>
                  <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                        {vehicle.assignedDriver.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: '#1A2332' }}>{vehicle.assignedDriver.name}</p>
                        <p className="text-xs" style={{ color: '#5A6C7D' }}>Currently Assigned</p>
                      </div>
                    </div>
                    <button className="w-full text-sm font-medium px-3 py-2 rounded-lg transition-all hover:bg-blue-100"
                      style={{ color: '#2563EB', border: '1px solid #2563EB' }}>
                      View Driver Profile
                    </button>
                  </div>

                  <div className="space-y-2">
                    <button 
                      onClick={() => setShowDriverModal(true)}
                      className="w-full text-sm font-medium px-3 py-2 rounded-lg transition-all hover:bg-green-50"
                      style={{ color: '#10B981', border: '1px solid #10B981' }}
                    >
                      Change Driver
                    </button>
                    <button 
                      onClick={handleUnassignDriver}
                      className="w-full text-sm font-medium px-3 py-2 rounded-lg transition-all hover:bg-red-50"
                      style={{ color: '#EF4444', border: '1px solid #EF4444' }}
                    >
                      Unassign Driver
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="p-6 rounded-lg mb-4 text-center" style={{ backgroundColor: '#F8F9FA', border: '2px dashed #E5E7EB' }}>
                    <User className="w-12 h-12 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
                    <p className="text-sm font-medium mb-1" style={{ color: '#5A6C7D' }}>No Driver Assigned</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>Assign a driver to this vehicle</p>
                  </div>
                  
                  <button 
                    onClick={() => setShowDriverModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium"
                    style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
                  >
                    <User className="w-4 h-4" />
                    Assign Driver
                  </button>
                </div>
              )}
            </div>

            {/* Earnings Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1A2332' }}>Earnings Summary</h3>
              <div className="space-y-4">
                {[
                  { label: 'Total Earnings', value: `₹${vehicle.totalEarnings.toLocaleString()}`, icon: DollarSign, color: '#10B981' },
                  { label: 'This Month', value: `₹${vehicle.monthlyEarnings.toLocaleString()}`, icon: Calendar, color: '#2563EB' },
                  { label: 'Average/Trip', value: `₹${Math.round(vehicle.totalEarnings / vehicle.totalTrips)}`, icon: TrendingUp, color: '#F59E0B' }
                ].map((stat, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                      <span className="text-sm" style={{ color: '#5A6C7D' }}>{stat.label}</span>
                    </div>
                    <span className="text-lg font-bold" style={{ color: '#1A2332' }}>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Alerts */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1A2332' }}>Quick Alerts</h3>
              <div className="space-y-3">
                {documents.filter(doc => getDaysUntilExpiry(doc.expiry) <= 30).map((doc, idx) => {
                  const daysLeft = getDaysUntilExpiry(doc.expiry);
                  return (
                    <div key={idx} className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: daysLeft < 0 ? '#FEE2E2' : '#FEF3C7' }}>
                      <Bell className="w-4 h-4 mt-0.5" style={{ color: daysLeft < 0 ? '#DC2626' : '#D97706' }} />
                      <div>
                        <p className="text-xs font-medium" style={{ color: daysLeft < 0 ? '#DC2626' : '#92400E' }}>
                          {doc.name} {daysLeft < 0 ? 'has expired' : `expiring in ${daysLeft} days`}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {documents.filter(doc => getDaysUntilExpiry(doc.expiry) <= 30).length === 0 && (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#10B981' }} />
                    <p className="text-sm" style={{ color: '#5A6C7D' }}>All documents are valid</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Maintenance Modal */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>Add Maintenance Record</h2>
              <button onClick={() => setShowMaintenanceModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" style={{ color: '#5A6C7D' }} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Maintenance Type</label>
                <select
                  value={maintenanceForm.type}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                >
                  <option value="">Select Type</option>
                  <option value="Oil Change">Oil Change</option>
                  <option value="Tire Service">Tire Service</option>
                  <option value="Brake Service">Brake Service</option>
                  <option value="Engine Repair">Engine Repair</option>
                  <option value="Body Work">Body Work</option>
                  <option value="General Service">General Service</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Description</label>
                <textarea
                  value={maintenanceForm.description}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                  placeholder="Describe the maintenance work..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Date</label>
                  <input
                    type="date"
                    value={maintenanceForm.date}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Cost (₹)</label>
                  <input
                    type="number"
                    value={maintenanceForm.cost}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                    placeholder="5000"
                    className="w-full px-3 py-2 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Status</label>
                <select
                  value={maintenanceForm.status}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium"
                style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMaintenance}
                className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
              >
                Add Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {showDriverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>Assign Driver</h2>
              <button onClick={() => setShowDriverModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" style={{ color: '#5A6C7D' }} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
              {availableDrivers.map(driver => (
                <div 
                  key={driver.id}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    driver.status === 'offline' ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
                  }`}
                  style={{ 
                    border: '1px solid #E5E7EB', 
                    backgroundColor: vehicle.assignedDriver?.id === driver.id ? '#F0F9FF' : 'white' 
                  }}
                  onClick={() => {
                    if (driver.status !== 'offline') {
                      handleAssignDriver(driver);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" 
                        style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                        {driver.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: '#1A2332' }}>{driver.name}</p>
                        <p className="text-xs" style={{ color: '#5A6C7D' }}>{driver.phone}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      driver.status === 'available' ? 'bg-green-100 text-green-700' :
                      driver.status === 'on-trip' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {driver.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: '#5A6C7D' }}>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3" style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                      <span>{driver.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      <span>{driver.trips} trips</span>
                    </div>
                  </div>
                  {vehicle.assignedDriver?.id === driver.id && (
                    <p className="text-xs mt-2" style={{ color: '#2563EB' }}>Currently assigned</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}