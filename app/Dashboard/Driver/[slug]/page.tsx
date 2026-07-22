'use client';

import React, { useState, useEffect } from 'react';
import {
  Car,
  ArrowLeft,
  Edit,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  X,
  User,
  Star,
  Bell,
  Lock,
  Unlock
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

/* ================= TYPES ================= */

interface Driver {
  _id: string;
  name: string;
  phone: string;
  email: string;
  status: 'available' | 'on-trip' | 'offline';
  vehicle: string | null;
  vehicleId: string | null;
  license: string;
  joinDate: string;
  rating: number;
  trips: number;
  address?: string;
  bloodGroup?: string;
  emergencyContact?: string;
}

interface Vehicle {
  _id: string;
  name: string;
  plate: string;
  model: string;
  status: 'available' | 'in-use' | 'maintenance';
}

/* ================= SAFE ACCESSORS ================= */

/*
 * Rows carried over from the paper books do not carry every field the console
 * assumes — no rating, no trip count, no assigned driver. Reading them straight
 * (`driver.rating.toFixed(1)`) threw a TypeError during render, which React
 * surfaces as "a client-side exception has occurred" and takes down the whole
 * page. Incomplete data is normal here, so it must never be fatal.
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

/* ================= PAGE ================= */

export default function DriverDetailPage() {
  const params = useParams();
  const router = useRouter();

  /* ✅ CORRECT PARAM EXTRACTION (slug) */
  const driverId =
    typeof params?.slug === 'string'
      ? params.slug
      : Array.isArray(params?.slug)
      ? params.slug[0]
      : undefined;

  /* ================= STATE ================= */

  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockCode, setUnlockCode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeTab, setActiveTab] =
    useState<'overview' | 'performance' | 'details'>('overview');

  /* ================= DATA FETCH ================= */

  useEffect(() => {
    if (!driverId) {
      console.error('❌ DRIVER ID IS UNDEFINED');
      setLoading(false);
      return;
    }

    fetchDriver();
    fetchVehicles();
  }, [driverId]);

  const fetchDriver = async () => {
    try {

      const res = await fetch(`/api/driver/${driverId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || 'Driver not found');

      setDriver(data);
    } catch (error) {
      console.error('❌ Error fetching driver:', error);
      setDriver(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles');
      if (!res.ok) return;

      const data = await res.json();
      setAvailableVehicles(
        data.filter((v: Vehicle) => v.status === 'available')
      );
    } catch (error) {
      console.error('❌ Error fetching vehicles:', error);
    }
  };

  /* ================= HELPERS ================= */

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'available':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          dot: '#10B981',
          icon: CheckCircle
        };
      case 'on-trip':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-700',
          dot: '#2563EB',
          icon: Clock
        };
      case 'offline':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          dot: '#9CA3AF',
          icon: AlertTriangle
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          dot: '#9CA3AF',
          icon: AlertTriangle
        };
    }
  };

  /* ================= ACTIONS ================= */

  const handleUnlockAttempt = () => {
    if (unlockCode === 'A1B2C3') {
      setIsUnlocked(true);
      setShowUnlockModal(false);
      setUnlockCode('');
      setShowVehicleModal(true);
    } else {
      alert('Incorrect unlock code');
      setUnlockCode('');
    }
  };

  const handleAssignVehicle = async (vehicle: Vehicle) => {
    if (!driver || !driverId) return;

    try {
      await fetch(`/api/driver/${driverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle: `${vehicle.name} - ${vehicle.plate}`,
          vehicleId: vehicle._id
        })
      });

      await fetch(`/api/vehicles/${vehicle._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedDriverId: driver._id,
          assignedDriverName: driver.name,
          status: 'in-use'
        })
      });

      setShowVehicleModal(false);
      setIsUnlocked(false);
      fetchDriver();
      fetchVehicles();
    } catch (error) {
      console.error('❌ Error assigning vehicle:', error);
    }
  };

  const handleUnassignVehicle = async () => {
    if (!driver || !driver.vehicleId || !driverId) return;

    if (!confirm('Unassign current vehicle?')) return;

    try {
      await fetch(`/api/driver/${driverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle: null, vehicleId: null })
      });

      await fetch(`/api/vehicles/${driver.vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedDriverId: null,
          assignedDriverName: null,
          status: 'available'
        })
      });

      fetchDriver();
      fetchVehicles();
    } catch (error) {
      console.error('❌ Error unassigning vehicle:', error);
    }
  };

  const handleChangeVehicleClick = () => {
    setShowUnlockModal(true);
  };

  /* ================= RETURN BELOW ================= */


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: '#5A6C7D' }}>Loading driver...</p>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1A2332' }}>Driver Not Found</h2>
          <Link href="/Dashboard/Driver">
            <button className="px-6 py-3 rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
              Back to Drivers
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusStyle(driver.status);
  const StatusIcon = statusStyle.icon;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/Dashboard/Driver">
            <button className="flex items-center gap-2 mb-4 text-sm font-medium hover:gap-3 transition-all" style={{ color: '#2563EB' }}>
              <ArrowLeft className="w-4 h-4" />
              Back to Drivers
            </button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Driver Details</h1>
              <p style={{ color: '#5A6C7D' }}>View and manage driver information</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Driver Info Card */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex items-start gap-6 mb-6">
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                  {initials(driver.name)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold" style={{ color: '#1A2332' }}>{driver.name}</h2>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text} flex items-center gap-1`}>
                      <StatusIcon className="w-3 h-3" />
                      {(driver.status ?? 'offline').replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm mb-2" style={{ color: '#5A6C7D' }}>License: <span className="font-bold" style={{ color: '#1A2332' }}>{driver.license}</span></p>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>Joined: {new Date(driver.joinDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { icon: Phone, label: 'Phone', value: driver.phone },
                  { icon: Mail, label: 'Email', value: driver.email },
                  { icon: MapPin, label: 'Address', value: driver.address || 'N/A' }
                ].map((field, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <field.icon className="w-4 h-4 mt-1" style={{ color: '#2563EB' }} />
                    <div>
                      <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>{field.label}</p>
                      <p className="text-sm font-medium" style={{ color: '#1A2332' }}>{field.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex border-b" style={{ borderColor: '#E5E7EB' }}>
                {[
                  { id: 'overview', label: 'Overview', icon: User },
                  { id: 'performance', label: 'Performance', icon: TrendingUp },
                  { id: 'details', label: 'Details', icon: Star }
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
                        { label: 'Total Trips', value: driver.trips, icon: Car, color: '#2563EB' },
                        { label: 'Rating', value: `⭐ ${num(driver.rating).toFixed(1)}`, icon: Star, color: '#F59E0B' },
                        { label: 'Status', value: driver.status, icon: StatusIcon, color: statusStyle.dot }
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

                {activeTab === 'performance' && (
                  <div className="space-y-4">
                    <h4 className="font-bold mb-4" style={{ color: '#1A2332' }}>Driver Performance</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg" style={{ border: '1px solid #E5E7EB' }}>
                        <p className="text-sm mb-2" style={{ color: '#5A6C7D' }}>Total Trips</p>
                        <p className="text-3xl font-bold" style={{ color: '#2563EB' }}>{driver.trips}</p>
                      </div>
                      <div className="p-4 rounded-lg" style={{ border: '1px solid #E5E7EB' }}>
                        <p className="text-sm mb-2" style={{ color: '#5A6C7D' }}>Average Rating</p>
                        <p className="text-3xl font-bold" style={{ color: '#F59E0B' }}>{num(driver.rating).toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'details' && (
                  <div className="space-y-4">
                    {[
                      { label: 'Blood Group', value: driver.bloodGroup || 'N/A' },
                      { label: 'Emergency Contact', value: driver.emergencyContact || 'N/A' },
                      { label: 'License Number', value: driver.license },
                      { label: 'Join Date', value: new Date(driver.joinDate).toLocaleDateString() }
                    ].map((detail, idx) => (
                      <div key={idx} className="p-4 rounded-lg" style={{ border: '1px solid #E5E7EB' }}>
                        <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>{detail.label}</p>
                        <p className="font-bold" style={{ color: '#1A2332' }}>{detail.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Assigned Vehicle Card */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-bold flex-1" style={{ color: '#1A2332' }}>Assigned Vehicle</h3>
                {driver.vehicle && (
                  <Lock className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                )}
              </div>

              {driver.vehicle ? (
                <div>
                  <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                        <Car className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: '#1A2332' }}>{driver.vehicle}</p>
                        <p className="text-xs" style={{ color: '#5A6C7D' }}>Currently Assigned</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button 
                      onClick={handleChangeVehicleClick}
                      className="w-full flex items-center justify-center gap-2 text-sm font-medium px-3 py-2 rounded-lg transition-all hover:bg-blue-50"
                      style={{ color: '#2563EB', border: '1px solid #2563EB' }}
                    >
                      <Lock className="w-4 h-4" />
                      Change Vehicle (Locked)
                    </button>
                    <button 
                      onClick={handleUnassignVehicle}
                      className="w-full text-sm font-medium px-3 py-2 rounded-lg transition-all hover:bg-red-50"
                      style={{ color: '#EF4444', border: '1px solid #EF4444' }}
                    >
                      Unassign Vehicle
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="p-6 rounded-lg mb-4 text-center" style={{ backgroundColor: '#F8F9FA', border: '2px dashed #E5E7EB' }}>
                    <Car className="w-12 h-12 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
                    <p className="text-sm font-medium mb-1" style={{ color: '#5A6C7D' }}>No Vehicle Assigned</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>Assign a vehicle to this driver</p>
                  </div>
                  
                  <button 
                    onClick={handleChangeVehicleClick}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium"
                    style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
                  >
                    <Car className="w-4 h-4" />
                    Assign Vehicle
                  </button>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1A2332' }}>Quick Stats</h3>
              <div className="space-y-4">
                {[
                  { label: 'Total Trips', value: driver.trips, icon: Car, color: '#2563EB' },
                  { label: 'Rating', value: num(driver.rating).toFixed(1), icon: Star, color: '#F59E0B' },
                  { label: 'Status', value: driver.status.replace('-', ' '), icon: StatusIcon, color: statusStyle.dot }
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
          </div>
        </div>
      </div>

      {/* Unlock Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-center mb-2" style={{ color: '#1A2332' }}>
              Unlock Vehicle Assignment
            </h2>
            
            <p className="text-center mb-4" style={{ color: '#5A6C7D' }}>
              Enter the unlock code to change the assigned vehicle
            </p>
            
            <input
              type="text"
              value={unlockCode}
              onChange={(e) => setUnlockCode(e.target.value)}
              placeholder="Enter unlock code"
              className="w-full px-4 py-3 rounded-lg mb-6 text-center font-mono text-lg tracking-wider"
              style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
              maxLength={6}
            />

            <p className="text-xs text-center mb-6" style={{ color: '#9CA3AF' }}>
              Hint: The code is A1B2C3
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowUnlockModal(false);
                  setUnlockCode('');
                }}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium"
                style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUnlockAttempt}
                className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Assignment Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center gap-2">
                <Unlock className="w-5 h-5" style={{ color: '#10B981' }} />
                <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>Assign Vehicle</h2>
              </div>
              <button onClick={() => { setShowVehicleModal(false); setIsUnlocked(false); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" style={{ color: '#5A6C7D' }} />
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1">
              {availableVehicles.length > 0 ? (
                <div className="space-y-3">
                  {availableVehicles.map((vehicle) => (
                    <button
                      key={vehicle._id}
                      onClick={() => handleAssignVehicle(vehicle)}
                      className="w-full p-4 rounded-lg hover:bg-blue-50 transition-all text-left"
                      style={{ border: '1px solid #E5E7EB' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                          <Car className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold" style={{ color: '#1A2332' }}>{vehicle.name}</p>
                          <p className="text-sm" style={{ color: '#5A6C7D' }}>{vehicle.plate} • {vehicle.model}</p>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                          Available
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Car className="w-12 h-12 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
                  <p className="text-sm" style={{ color: '#5A6C7D' }}>No available vehicles</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <button
                onClick={() => { setShowVehicleModal(false); setIsUnlocked(false); }}
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