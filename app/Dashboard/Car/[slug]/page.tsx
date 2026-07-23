'use client';
import React, { useState, useEffect } from 'react';
import { Car, ArrowLeft, Edit, Plus, Wrench, FileText, DollarSign, Calendar, AlertTriangle, CheckCircle, Clock, TrendingUp, MapPin, X, User, Star, Bell } from 'lucide-react';
import Link from 'next/link';
import VehicleEditor from '@/components/VehicleEditor';
import { useParams, useRouter } from 'next/navigation';

interface Vehicle {
  _id: string;
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
  rcNumber: string;
  assignedDriverId: string | null;
  assignedDriverName: string | null;
  totalEarnings: number;
  monthlyEarnings: number;
  totalTrips: number;
  maintenanceRecords: MaintenanceRecord[];
  photoUrl?: string;
  rcDocUrl?: string;
  insuranceDocUrl?: string;
  pollutionDocUrl?: string;
  fitnessDocUrl?: string;
  permitDocUrl?: string;
  shortCode?: string;
  company?: string;
  currentOdometer?: number | null;
}

interface MaintenanceRecord {
  _id?: string;
  date: string;
  type: string;
  description: string;
  cost: number;
  status: 'completed' | 'pending' | 'scheduled';
  nextDue?: string;
}

interface Driver {
  _id: string;
  name: string;
  phone: string;
  rating: number;
  trips: number;
  status: 'available' | 'on-trip' | 'offline';
}

/*
 * Vehicles carried over from the paper books have no assigned driver, no
 * document expiries and no maintenance history. Reading those straight threw
 * during render and took the page down with a client-side exception, so every
 * access below tolerates a missing value.
 */
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

const initials = (name?: string | null) =>
  (name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.slug as string;


  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'maintenance' | 'documents'>('overview');
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);

  const [maintenanceForm, setMaintenanceForm] = useState({
    type: '',
    description: '',
    cost: '',
    date: '',
    status: 'scheduled' as 'completed' | 'pending' | 'scheduled'
  });

  useEffect(() => {
    fetchVehicle();
    fetchDrivers();
  }, [vehicleId]);

  const fetchVehicle = async () => {
  if (!vehicleId) return;

  try {
    const res = await fetch(`/api/vehicle/${vehicleId}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch vehicle: ${res.status}`);
    }

    const data = await res.json();
    setVehicle(data);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    alert('Failed to load vehicle');
    router.push('/Dashboard/Car');
  } finally {
    setLoading(false);
  }
};


  const fetchDrivers = async () => {
    try {
      const res = await fetch('/api/drivers');
      if (res.ok) {
        const data = await res.json();
        setAvailableDrivers(data);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'available': return { bg: 'bg-green-100', text: 'text-green-700', dot: '#10B981' };
      case 'in-use': return { bg: 'bg-blue-100', text: 'text-blue-700', dot: '#2563EB' };
      case 'maintenance': return { bg: 'bg-orange-100', text: 'text-orange-700', dot: '#F59E0B' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: '#9CA3AF' };
    }
  };

  /*
   * Null means the date was never recorded, which is different from expired.
   * `new Date(null)` is the epoch, so the previous version reported every
   * vehicle carried over from the paper books as having expired insurance.
   */
  const getDaysUntilExpiry = (expiryDate?: string | Date | null): number | null => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    if (Number.isNaN(expiry.getTime())) return null;
    return Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (days: number | null) => {
    if (days === null) return { color: '#9CA3AF', text: 'Not recorded', icon: AlertTriangle };
    if (days < 0) return { color: '#EF4444', text: 'Expired', icon: AlertTriangle };
    if (days <= 30) return { color: '#F59E0B', text: `${days} days left`, icon: AlertTriangle };
    return { color: '#10B981', text: 'Valid', icon: CheckCircle };
  };

  const handleAddMaintenance = async () => {
    if (!vehicle || !maintenanceForm.type || !maintenanceForm.description || !maintenanceForm.cost || !maintenanceForm.date) {
      alert('Please fill all fields');
      return;
    }

    try {
      const newRecord = {
        date: maintenanceForm.date,
        type: maintenanceForm.type,
        description: maintenanceForm.description,
        cost: parseFloat(maintenanceForm.cost),
        status: maintenanceForm.status
      };

      const updatedRecords = [newRecord, ...(vehicle.maintenanceRecords || [])];

      const res = await fetch(`/api/vehicle/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceRecords: updatedRecords })
      });

      if (!res.ok) throw new Error('Failed to add maintenance record');

      setMaintenanceForm({ type: '', description: '', cost: '', date: '', status: 'scheduled' });
      setShowMaintenanceModal(false);
      fetchVehicle();
      alert('Maintenance record added successfully!');
    } catch (error) {
      console.error('Error adding maintenance:', error);
      alert('Failed to add maintenance record');
    }
  };

  const handleAssignDriver = async (driver: Driver) => {
    if (!vehicle) return;

    try {
      const res = await fetch(`/api/vehicle/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedDriverId: driver._id,
          assignedDriverName: driver.name
        })
      });

      if (!res.ok) throw new Error('Failed to assign driver');

      setShowDriverModal(false);
      fetchVehicle();
      alert('Driver assigned successfully!');
    } catch (error) {
      console.error('Error assigning driver:', error);
      alert('Failed to assign driver');
    }
  };

  const handleUnassignDriver = async () => {
    if (!vehicle || !confirm('Are you sure you want to unassign the current driver?')) return;

    try {
      const res = await fetch(`/api/vehicle/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedDriverId: null,
          assignedDriverName: null
        })
      });

      if (!res.ok) throw new Error('Failed to unassign driver');

      fetchVehicle();
      alert('Driver unassigned successfully!');
    } catch (error) {
      console.error('Error unassigning driver:', error);
      alert('Failed to unassign driver');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: '#5A6C7D' }}>Loading vehicle...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1A2332' }}>Vehicle Not Found</h2>
          <Link href="/Dashboard/Car">
            <button className="px-6 py-3 rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
              Back to Fleet
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusStyle(vehicle.status);
  const documents = [
    { name: 'Insurance', number: vehicle.insurance, expiry: vehicle.insuranceExpiry },
    { name: 'Pollution Certificate', number: vehicle.pollution, expiry: vehicle.pollutionExpiry },
    { name: 'Fitness Certificate', number: vehicle.fitness, expiry: vehicle.fitnessExpiry }
  ];

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto">
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

        {isEditing && (
          <div className="mb-6">
            <VehicleEditor
              vehicle={vehicle as never}
              onCancel={() => setIsEditing(false)}
              onSaved={() => { setIsEditing(false); fetchVehicle(); }}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Vehicle Info Card */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex items-start gap-6 mb-6">
                {vehicle.photoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={vehicle.photoUrl} alt={vehicle.name}
                    className="w-24 h-24 rounded-xl object-cover shrink-0"
                    style={{ border: '1px solid #E5E7EB' }} />
                ) : (
                  <div className="w-24 h-24 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                    <Car className="w-12 h-12" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold" style={{ color: '#1A2332' }}>{vehicle.name}</h2>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                        {(vehicle.status ?? 'unknown').replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-lg font-medium mb-1" style={{ color: '#5A6C7D' }}>{vehicle.model}</p>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>License Plate: <span className="font-bold" style={{ color: '#1A2332' }}>{vehicle.plate}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Year', value: vehicle.year },
                  { label: 'Color', value: vehicle.color || 'N/A' },
                  { label: 'Fuel Type', value: vehicle.fuelType || 'N/A' },
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
                  </div>
                )}

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

                    {(vehicle.maintenanceRecords?.length ?? 0) > 0 ? (
                      <div className="space-y-3">
                        {(vehicle.maintenanceRecords ?? []).map((record, idx) => (
                          <div key={idx} className="p-4 rounded-lg" style={{ border: '1px solid #E5E7EB' }}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F0F9FF' }}>
                                  <Wrench className="w-5 h-5" style={{ color: '#2563EB' }} />
                                </div>
                                <div>
                                  <p className="font-bold" style={{ color: '#1A2332' }}>{record.type}</p>
                                  <p className="text-xs" style={{ color: '#9CA3AF' }}>
                                    {new Date(record.date).toLocaleDateString()}
                                  </p>
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
                            <span className="text-sm font-bold" style={{ color: '#10B981' }}>₹{record.cost.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
                        <Wrench className="w-12 h-12 mx-auto mb-2" />
                        <p>No maintenance records yet</p>
                      </div>
                    )}
                  </div>
                )}

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
                                <p className="text-xs" style={{ color: '#9CA3AF' }}>{doc.number || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <status.icon className="w-5 h-5" style={{ color: status.color }} />
                              <span className="text-sm font-medium" style={{ color: status.color }}>{status.text}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span style={{ color: '#5A6C7D' }}>
                              Expiry: {doc.expiry ? new Date(doc.expiry).toLocaleDateString('en-IN') : 'not recorded'}
                            </span>
                            {daysLeft !== null && daysLeft <= 30 && daysLeft > 0 && (
                              <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                                <Bell className="w-3 h-3" />
                                Renewal Required
                              </div>
                            )}
                            {daysLeft !== null && daysLeft < 0 && (
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

              {vehicle.assignedDriverName ? (
                <div>
                  <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                        {initials(vehicle.assignedDriverName)}
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: '#1A2332' }}>{vehicle.assignedDriverName}</p>
                        <p className="text-xs" style={{ color: '#5A6C7D' }}>Currently Assigned</p>
                      </div>
                    </div>
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
                  { label: 'Average/Trip', value: vehicle.totalTrips > 0 ? `₹${Math.round(vehicle.totalEarnings / vehicle.totalTrips)}` : '₹0', icon: TrendingUp, color: '#F59E0B' }
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
                {documents.filter(doc => {
                  const d = getDaysUntilExpiry(doc.expiry);
                  return d !== null && d <= 30;
                }).map((doc, idx) => {
                  // Non-null here: the filter above already dropped undated docs.
                  const daysLeft = getDaysUntilExpiry(doc.expiry) ?? 0;
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
                {documents.filter(doc => {
                  const d = getDaysUntilExpiry(doc.expiry);
                  return d !== null && d <= 30;
                }).length === 0 && (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#10B981' }} />
                    <p className="text-sm" style={{ color: '#5A6C7D' }}>
                      {documents.every(d => !d.expiry)
                        ? 'No document dates recorded yet'
                        : 'All documents are valid'}
                    </p>
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
                  className="w-full px-3 py-2 rounded-lg resize-none"
                  style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  rows={3}
                  placeholder="Enter maintenance details..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Cost (₹)</label>
                <input
                  type="number"
                  value={maintenanceForm.cost}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  placeholder="0"
                />
              </div>

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
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Status</label>
                <select
                  value={maintenanceForm.status}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, status: e.target.value as 'completed' | 'pending' | 'scheduled' })}
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
                className="flex-1 px-4 py-2 rounded-lg font-medium"
                style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMaintenance}
                className="flex-1 px-4 py-2 rounded-lg font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
              >
                Add Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Assignment Modal */}
      {showDriverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>Assign Driver</h2>
              <button onClick={() => setShowDriverModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" style={{ color: '#5A6C7D' }} />
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1">
              {availableDrivers.length > 0 ? (
                <div className="space-y-3">
                  {availableDrivers.map((driver) => (
                    <button
                      key={driver._id}
                      onClick={() => handleAssignDriver(driver)}
                      className="w-full p-4 rounded-lg hover:bg-blue-50 transition-all text-left"
                      style={{ border: '1px solid #E5E7EB' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                          {initials(driver.name)}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold" style={{ color: '#1A2332' }}>{driver.name}</p>
                          <p className="text-xs" style={{ color: '#5A6C7D' }}>{driver.phone}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-1">
                            <Star className="w-4 h-4 fill-yellow-400" style={{ color: '#FBBF24' }} />
                            <span className="text-sm font-medium" style={{ color: '#1A2332' }}>{num(driver.rating).toFixed(1)}</span>
                          </div>
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>{driver.trips} trips</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="w-12 h-12 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
                  <p className="text-sm" style={{ color: '#5A6C7D' }}>No drivers available</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <button
                onClick={() => setShowDriverModal(false)}
                className="w-full px-4 py-2 rounded-lg font-medium"
                style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}