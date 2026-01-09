'use client';
import React, { useState } from 'react';
import { Car, Phone, Mail, Calendar, MapPin, Edit, ArrowLeft, CheckCircle, XCircle, Clock, Star, TrendingUp, Award, AlertCircle, Lock, Unlock } from 'lucide-react';
import Link from 'next/link';

interface Driver {
  id: number;
  name: string;
  phone: string;
  email: string;
  status: 'available' | 'on-trip' | 'offline';
  vehicle: string | null;
  vehicleId: number | null;
  license: string;
  joinDate: string;
  rating: number;
  trips: number;
  address: string;
  bloodGroup: string;
  emergencyContact: string;
}

interface Vehicle {
  id: number;
  name: string;
  plate: string;
  model: string;
  year: number;
  status: 'available' | 'in-use' | 'maintenance';
}

export default function DriverSlugPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  const [driver, setDriver] = useState<Driver>({
    id: 1,
    name: 'Mike Johnson',
    phone: '+91 98765 43210',
    email: 'mike.j@tripease.com',
    status: 'available',
    vehicle: 'Toyota Camry - ABC123',
    vehicleId: 1,
    license: 'DL-12345678',
    joinDate: '2023-05-15',
    rating: 4.8,
    trips: 342,
    address: '123 Main Street, Mumbai, Maharashtra',
    bloodGroup: 'O+',
    emergencyContact: '+91 98765 00000'
  });

  const [availableVehicles] = useState<Vehicle[]>([
    { id: 1, name: 'Toyota Camry', plate: 'ABC123', model: '2022', year: 2022, status: 'in-use' },
    { id: 2, name: 'Honda Accord', plate: 'XYZ789', model: '2023', year: 2023, status: 'available' },
    { id: 3, name: 'Ford Fusion', plate: 'DEF456', model: '2021', year: 2021, status: 'available' },
    { id: 4, name: 'Hyundai Elantra', plate: 'GHI321', model: '2022', year: 2022, status: 'maintenance' }
  ]);

  const [formData, setFormData] = useState({
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    address: driver.address,
    bloodGroup: driver.bloodGroup,
    emergencyContact: driver.emergencyContact
  });

  const recentTrips = [
    { id: 1, date: '2025-01-08', from: 'Airport', to: 'Downtown Hotel', fare: '₹850', rating: 5 },
    { id: 2, date: '2025-01-07', from: 'Mall', to: 'Residential Area', fare: '₹420', rating: 4 },
    { id: 3, date: '2025-01-06', from: 'Train Station', to: 'Business District', fare: '₹650', rating: 5 }
  ];

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'available': return { bg: 'bg-green-100', text: 'text-green-700', dot: '#10B981' };
      case 'on-trip': return { bg: 'bg-blue-100', text: 'text-blue-700', dot: '#2563EB' };
      case 'offline': return { bg: 'bg-gray-100', text: 'text-gray-700', dot: '#9CA3AF' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: '#9CA3AF' };
    }
  };

  const statusStyle = getStatusStyle(driver.status);

  const handleSave = () => {
    setDriver({ ...driver, ...formData });
    setIsEditing(false);
  };

  const handleAssignVehicle = (vehicleId: number, vehicleName: string, vehiclePlate: string) => {
    setDriver({ 
      ...driver, 
      vehicleId, 
      vehicle: `${vehicleName} - ${vehiclePlate}` 
    });
    setShowAssignModal(false);
  };

  const handleUnassignVehicle = () => {
    if (window.confirm('Are you sure you want to unassign this vehicle from the driver?')) {
      setDriver({ ...driver, vehicleId: null, vehicle: null });
    }
  };

  const isVehicleBound = driver.vehicleId !== null;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
            <Link href="/Dashboard/Driver">
          <button className="flex items-center gap-2 mb-4 text-sm font-medium hover:gap-3 transition-all" style={{ color: '#2563EB' }}>
            <ArrowLeft className="w-4 h-4" />
            Back to Drivers
          </button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Driver Profile</h1>
              <p style={{ color: '#5A6C7D' }}>View and manage driver details</p>
            </div>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
            >
              <Edit className="w-5 h-5" />
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex items-start gap-6 mb-6">
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                  {driver.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="text-2xl font-bold px-3 py-1 rounded-lg"
                        style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                      />
                    ) : (
                      <h2 className="text-2xl font-bold" style={{ color: '#1A2332' }}>{driver.name}</h2>
                    )}
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                      {driver.status.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: '#5A6C7D' }}>Driver ID: #{driver.id.toString().padStart(4, '0')}</p>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5" style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                      <span className="text-lg font-bold" style={{ color: '#1A2332' }}>{driver.rating}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" style={{ color: '#10B981' }} />
                      <span className="text-lg font-bold" style={{ color: '#1A2332' }}>{driver.trips} Trips</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Phone', value: formData.phone, key: 'phone', icon: Phone },
                  { label: 'Email', value: formData.email, key: 'email', icon: Mail },
                  { label: 'License Number', value: driver.license, key: 'license', icon: Award, disabled: true },
                  { label: 'Join Date', value: driver.joinDate, key: 'joinDate', icon: Calendar, disabled: true }
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>
                      <field.icon className="w-4 h-4 inline mr-1" />
                      {field.label}
                    </label>
                    {isEditing && !field.disabled ? (
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                      />
                    ) : (
                      <p className="font-medium" style={{ color: '#1A2332' }}>{field.value}</p>
                    )}
                  </div>
                ))}
              </div>

              {isEditing && (
                <div className="flex gap-3 mt-6 pt-6" style={{ borderTop: '1px solid #E5E7EB' }}>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium"
                    style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium"
                    style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            {/* Additional Details */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1A2332' }}>Additional Details</h3>
              <div className="space-y-4">
                {[
                  { label: 'Address', value: formData.address, key: 'address', icon: MapPin },
                  { label: 'Blood Group', value: formData.bloodGroup, key: 'bloodGroup', icon: AlertCircle },
                  { label: 'Emergency Contact', value: formData.emergencyContact, key: 'emergencyContact', icon: Phone }
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>
                      <field.icon className="w-4 h-4 inline mr-1" />
                      {field.label}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={field.value}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg"
                        style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                      />
                    ) : (
                      <p className="font-medium" style={{ color: '#1A2332' }}>{field.value}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Trips */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1A2332' }}>Recent Trips</h3>
              <div className="space-y-3">
                {recentTrips.map(trip => (
                  <div key={trip.id} className="p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: '#5A6C7D' }}>{trip.date}</span>
                      <span className="text-sm font-bold" style={{ color: '#2563EB' }}>{trip.fare}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4" style={{ color: '#10B981' }} />
                      <span className="text-sm font-medium" style={{ color: '#1A2332' }}>{trip.from}</span>
                      <span style={{ color: '#9CA3AF' }}>→</span>
                      <span className="text-sm font-medium" style={{ color: '#1A2332' }}>{trip.to}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3" style={{ color: i < trip.rating ? '#F59E0B' : '#E5E7EB', fill: i < trip.rating ? '#F59E0B' : '#E5E7EB' }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Vehicle Assignment Card */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: '#1A2332' }}>Assigned Vehicle</h3>
                {isVehicleBound && (
                  <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                    <Lock className="w-3 h-3" />
                    Bound
                  </div>
                )}
              </div>

              {driver.vehicle ? (
                <div>
                  <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <Car className="w-8 h-8" style={{ color: '#2563EB' }} />
                      <div>
                        <p className="font-bold" style={{ color: '#1A2332' }}>{driver.vehicle}</p>
                        <p className="text-xs" style={{ color: '#5A6C7D' }}>Currently Assigned</p>
                      </div>
                    </div>
                    <button 
                      className="w-full text-sm font-medium px-3 py-2 rounded-lg transition-all hover:bg-blue-100"
                      style={{ color: '#2563EB', border: '1px solid #2563EB' }}
                    >
                      View Vehicle Details
                    </button>
                  </div>

                  {isEditing && (
                    <div className="space-y-2">
                      <button 
                        onClick={() => setShowAssignModal(true)}
                        className="w-full text-sm font-medium px-3 py-2 rounded-lg transition-all hover:bg-green-50"
                        style={{ color: '#10B981', border: '1px solid #10B981' }}
                      >
                        Change Vehicle
                      </button>
                      <button 
                        onClick={handleUnassignVehicle}
                        className="w-full text-sm font-medium px-3 py-2 rounded-lg transition-all hover:bg-red-50"
                        style={{ color: '#EF4444', border: '1px solid #EF4444' }}
                      >
                        Unassign Vehicle
                      </button>
                    </div>
                  )}

                  {isVehicleBound && !isEditing && (
                    <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5" style={{ color: '#D97706' }} />
                        <p className="text-xs" style={{ color: '#92400E' }}>
                          This vehicle is bound to this driver. Enable edit mode to change or unassign the vehicle.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="p-6 rounded-lg mb-4 text-center" style={{ backgroundColor: '#F8F9FA', border: '2px dashed #E5E7EB' }}>
                    <Car className="w-12 h-12 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
                    <p className="text-sm font-medium mb-1" style={{ color: '#5A6C7D' }}>No Vehicle Assigned</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>Assign a vehicle to this driver</p>
                  </div>
                  
                  {isEditing && (
                    <button 
                      onClick={() => setShowAssignModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-white font-medium"
                      style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
                    >
                      <Car className="w-4 h-4" />
                      Assign Vehicle
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Stats Card */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1A2332' }}>Performance Stats</h3>
              <div className="space-y-4">
                {[
                  { label: 'Total Earnings', value: '₹2,45,680', icon: TrendingUp, color: '#10B981' },
                  { label: 'Avg Rating', value: driver.rating + '/5', icon: Star, color: '#F59E0B' },
                  { label: 'Completed Trips', value: driver.trips.toString(), icon: CheckCircle, color: '#2563EB' }
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

      {/* Assign Vehicle Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>Assign Vehicle</h2>
              <button onClick={() => setShowAssignModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" style={{ color: '#5A6C7D' }} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
              {availableVehicles.map(vehicle => (
                <div 
                  key={vehicle.id}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${vehicle.status !== 'available' && vehicle.id !== driver.vehicleId ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
                  style={{ border: '1px solid #E5E7EB', backgroundColor: vehicle.id === driver.vehicleId ? '#F0F9FF' : 'white' }}
                  onClick={() => {
                    if (vehicle.status === 'available' || vehicle.id === driver.vehicleId) {
                      handleAssignVehicle(vehicle.id, vehicle.name, vehicle.plate);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Car className="w-6 h-6" style={{ color: '#2563EB' }} />
                      <div>
                        <p className="font-bold" style={{ color: '#1A2332' }}>{vehicle.name}</p>
                        <p className="text-xs" style={{ color: '#5A6C7D' }}>{vehicle.plate} • {vehicle.model}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      vehicle.status === 'available' ? 'bg-green-100 text-green-700' :
                      vehicle.status === 'in-use' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {vehicle.status}
                    </span>
                  </div>
                  {vehicle.id === driver.vehicleId && (
                    <p className="text-xs mt-2" style={{ color: '#2563EB' }}>Currently assigned to this driver</p>
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