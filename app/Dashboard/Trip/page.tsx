'use client';
import React, { useEffect, useState } from 'react';
import { Car, Menu, Bell, Settings, Plus, Edit, Trash2, MapPin, Calendar, X, User, Navigation, Clock, DollarSign, Package, Check, AlertCircle } from 'lucide-react';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Vehicle {
  _id: string;
  number: string;
  model: string;
  type: string;
  status: 'available' | 'on-trip' | 'maintenance';
}

interface Driver {
  _id: string;
  name: string;
  phone: string;
  licenseNumber?: string;
  status: 'available' | 'on-trip' | 'offline';
}

interface AdditionalService {
  id: string;
  name: string;
  price: number;
}

interface Trip {
  _id: string;
  tripNumber: string;
  customer: {
    name: string;
    phone: string;
  };
  driver: {
    name: string;
    driverId?: string;
  };
  vehicle: {
    model: string;
    number: string;
    vehicleId?: string;
  };
  route: {
    pickup: string;
    dropoff: string;
  };
  charges: {
    totalFare: number;
    kmCharge?: number;
    waitingCharge?: number;
    serviceCharges?: number;
  };
  tripDetails?: {
    startOdometer?: number;
    endOdometer?: number;
    totalKm?: number;
    waitingTime?: number;
    additionalServices?: AdditionalService[];
  };
  status: 'ongoing' | 'completed' | 'pending' | 'cancelled';
  tripDate: string;
  tripTime?: string;
  createdAt: string;
}

const COST_PER_KM = 20;
const WAITING_COST_PER_MIN = 2;

const AVAILABLE_SERVICES: AdditionalService[] = [
  { id: 'toll', name: 'Toll Charges', price: 150 },
  { id: 'parking', name: 'Parking Fee', price: 100 },
  { id: 'luggage', name: 'Extra Luggage', price: 200 },
  { id: 'ac', name: 'AC Charges', price: 300 },
  { id: 'night', name: 'Night Charges (10PM-6AM)', price: 500 },
];

export default function DynamicTripsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Dynamic data from DB
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [formData, setFormData] = useState({
    customerId: '',
    vehicleId: '',
    driverId: '',
    fromLocation: '',
    toLocation: '',
    startOdometer: '',
    endOdometer: '',
    waitingTime: '0',
    selectedServices: [] as string[],
    tripDate: new Date().toISOString().split('T')[0],
    tripTime: new Date().toTimeString().slice(0, 5)
  });

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTrips(),
        loadCustomers(),
        loadVehicles(),
        loadDrivers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrips = async () => {
    try {
      const res = await fetch('/api/trip');
      const data = await res.json();
      setTrips(data.trips || []);
    } catch (error) {
      console.error('Error loading trips:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await fetch('/api/user');
      const data = await res.json();
      setCustomers(data.users || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const res = await fetch('/api/car');
      const data = await res.json();
      setVehicles(data.cars || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const loadDrivers = async () => {
    try {
      const res = await fetch('/api/driver');
      const data = await res.json();
      setDrivers(data.drivers || []);
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const calculateTotals = () => {
    const start = parseFloat(formData.startOdometer) || 0;
    const end = parseFloat(formData.endOdometer) || 0;
    const totalKm = end > start ? end - start : 0;
    const kmCost = totalKm * COST_PER_KM;
    
    const waitingMinutes = parseFloat(formData.waitingTime) || 0;
    const waitingCost = waitingMinutes * WAITING_COST_PER_MIN;
    
    const servicesCost = formData.selectedServices.reduce((sum, serviceId) => {
      const service = AVAILABLE_SERVICES.find(s => s.id === serviceId);
      return sum + (service?.price || 0);
    }, 0);
    
    const totalCost = kmCost + waitingCost + servicesCost;
    
    return { totalKm, kmCost, waitingCost, servicesCost, totalCost };
  };

  const handleAddTrip = () => {
    setEditingTrip(null);
    setFormData({
      customerId: '',
      vehicleId: '',
      driverId: '',
      fromLocation: '',
      toLocation: '',
      startOdometer: '',
      endOdometer: '',
      waitingTime: '0',
      selectedServices: [],
      tripDate: new Date().toISOString().split('T')[0],
      tripTime: new Date().toTimeString().slice(0, 5)
    });
    setShowModal(true);
  };

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    
    // Find customer ID
    const customer = customers.find(c => c.name === trip.customer.name);
    const vehicle = vehicles.find(v => v.number === trip.vehicle.number);
    const driver = drivers.find(d => d.name === trip.driver.name);

    setFormData({
      customerId: customer?._id || trip.driver.driverId || '',
      vehicleId: vehicle?._id || trip.vehicle.vehicleId || '',
      driverId: driver?._id || trip.driver.driverId || '',
      fromLocation: trip.route.pickup,
      toLocation: trip.route.dropoff,
      startOdometer: trip.tripDetails?.startOdometer?.toString() || '',
      endOdometer: trip.tripDetails?.endOdometer?.toString() || '',
      waitingTime: trip.tripDetails?.waitingTime?.toString() || '0',
      selectedServices: trip.tripDetails?.additionalServices?.map(s => s.id) || [],
      tripDate: trip.tripDate ? new Date(trip.tripDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      tripTime: trip.tripTime || new Date().toTimeString().slice(0, 5)
    });
    setShowModal(true);
  };

  const toggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.customerId || !formData.vehicleId || !formData.driverId || 
        !formData.fromLocation || !formData.toLocation) {
      alert('Please fill all required fields');
      return;
    }

    const start = Number(formData.startOdometer);
    const end = Number(formData.endOdometer);

    if (end <= start) {
      alert('End odometer must be greater than start odometer');
      return;
    }

    setSubmitLoading(true);

    try {
      const customer = customers.find(c => c._id === formData.customerId);
      const vehicle = vehicles.find(v => v._id === formData.vehicleId);
      const driver = drivers.find(d => d._id === formData.driverId);

      if (!customer || !vehicle || !driver) {
        alert('Invalid customer, vehicle, or driver selected');
        return;
      }

      const { totalKm, kmCost, waitingCost, servicesCost, totalCost } = calculateTotals();
      const selectedServicesList = AVAILABLE_SERVICES.filter(s => 
        formData.selectedServices.includes(s.id)
      );

      const tripData = {
        customer: {
          name: customer.name,
          phone: customer.phone,
        },
        driver: {
          name: driver.name,
          driverId: driver._id,
        },
        vehicle: {
          model: vehicle.model,
          number: vehicle.number,
          vehicleId: vehicle._id,
        },
        route: {
          pickup: formData.fromLocation,
          dropoff: formData.toLocation,
        },
        tripDate: new Date(formData.tripDate),
        tripTime: formData.tripTime,
        charges: {
          totalFare: totalCost,
          kmCharge: kmCost,
          waitingCharge: waitingCost,
          serviceCharges: servicesCost,
        },
        tripDetails: {
          startOdometer: start,
          endOdometer: end,
          totalKm,
          waitingTime: Number(formData.waitingTime),
          additionalServices: selectedServicesList,
        },
        status: 'ongoing',
      };

      if (editingTrip) {
        // Update existing trip
        await fetch('/api/trip', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _id: editingTrip._id,
            ...tripData,
          }),
        });
      } else {
        // Create new trip
        await fetch('/api/trip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tripData),
        });
      }

      await loadTrips();
      setShowModal(false);
    } catch (error) {
      console.error('Error submitting trip:', error);
      alert('Failed to save trip. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCompleteTrip = async (id: string) => {
    try {
      await fetch('/api/trip', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: id,
          status: 'completed',
        }),
      });
      await loadTrips();
    } catch (error) {
      console.error('Error completing trip:', error);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      await fetch('/api/trip', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await loadTrips();
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  const { totalKm, kmCost, waitingCost, servicesCost, totalCost } = calculateTotals();
  
  // Filter available vehicles and drivers
  const availableVehicles = vehicles.filter(v => 
    v.status === 'available' || v._id === formData.vehicleId
  );
  const availableDrivers = drivers.filter(d => 
    d.status === 'available' || d._id === formData.driverId
  );

  const totalRevenue = trips.reduce((sum, t) => sum + (t.charges?.totalFare || 0), 0);
  const activeTrips = trips.filter(t => t.status === 'ongoing').length;
  const completedTrips = trips.filter(t => t.status === 'completed').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-medium" style={{ color: '#1A2332' }}>Loading trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Trip Management</h1>
            <p style={{ color: '#5A6C7D' }}>Create and manage trips dynamically</p>
          </div>
          <button 
            onClick={handleAddTrip}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
          >
            <Plus className="w-5 h-5" />
            Create Trip
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Trips', value: trips.length, icon: Navigation, color: '#2563EB' },
            { label: 'Active Trips', value: activeTrips, icon: Clock, color: '#F59E0B' },
            { label: 'Completed', value: completedTrips, icon: Package, color: '#10B981' },
            { label: 'Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: DollarSign, color: '#8B5CF6' }
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

        {/* Trips List */}
        <div className="grid grid-cols-1 gap-6">
          {trips.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center" style={{ border: '1px solid #E5E7EB' }}>
              <Navigation className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
              <h3 className="text-xl font-bold mb-2" style={{ color: '#1A2332' }}>No trips yet</h3>
              <p style={{ color: '#5A6C7D' }}>Create your first trip to get started</p>
            </div>
          ) : (
            trips.map(trip => (
              <div key={trip._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all" style={{ border: '1px solid #E5E7EB' }}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                        <Navigation className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: '#1A2332' }}>{trip.tripNumber}</h3>
                        <p className="text-sm" style={{ color: '#5A6C7D' }}>
                          {new Date(trip.createdAt).toLocaleDateString('en-IN', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <span className={`inline-block mt-2 text-xs font-medium px-3 py-1 rounded-full ${
                          trip.status === 'ongoing' ? 'bg-yellow-100 text-yellow-700' : 
                          trip.status === 'completed' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {trip.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {trip.status === 'ongoing' && (
                        <>
                          <button 
                            onClick={() => handleEditTrip(trip)}
                            className="p-2 rounded-lg transition-all hover:bg-blue-50" 
                            style={{ border: '1px solid #2563EB', color: '#2563EB' }}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleCompleteTrip(trip._id)}
                            className="px-4 py-2 rounded-lg font-medium text-white transition-all"
                            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                          >
                            <Check className="w-4 h-4 inline mr-1" />
                            Complete
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => handleDeleteTrip(trip._id)}
                        className="p-2 rounded-lg transition-all hover:bg-red-50" 
                        style={{ border: '1px solid #EF4444', color: '#EF4444' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <div>
                      <p className="text-xs mb-2 font-medium" style={{ color: '#9CA3AF' }}>CUSTOMER</p>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" style={{ color: '#5A6C7D' }} />
                        <div>
                          <p className="font-medium" style={{ color: '#1A2332' }}>{trip.customer.name}</p>
                          <p className="text-sm" style={{ color: '#5A6C7D' }}>{trip.customer.phone}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs mb-2 font-medium" style={{ color: '#9CA3AF' }}>VEHICLE</p>
                      <div className="flex items-center gap-2">
                        <Car className="w-4 h-4" style={{ color: '#5A6C7D' }} />
                        <div>
                          <p className="font-medium" style={{ color: '#1A2332' }}>{trip.vehicle.number}</p>
                          <p className="text-sm" style={{ color: '#5A6C7D' }}>{trip.vehicle.model}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs mb-2 font-medium" style={{ color: '#9CA3AF' }}>DRIVER</p>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" style={{ color: '#5A6C7D' }} />
                        <p className="font-medium" style={{ color: '#1A2332' }}>{trip.driver.name}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 mt-0.5" style={{ color: '#10B981' }} />
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>FROM</p>
                        <p className="font-medium" style={{ color: '#1A2332' }}>{trip.route.pickup}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 mt-0.5" style={{ color: '#EF4444' }} />
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>TO</p>
                        <p className="font-medium" style={{ color: '#1A2332' }}>{trip.route.dropoff}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4" style={{ borderTop: '1px solid #E5E7EB' }}>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Start KM</p>
                        <p className="font-bold" style={{ color: '#1A2332' }}>
                          {trip.tripDetails?.startOdometer || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>End KM</p>
                        <p className="font-bold" style={{ color: '#1A2332' }}>
                          {trip.tripDetails?.endOdometer || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Total KM</p>
                        <p className="font-bold text-blue-600">
                          {trip.tripDetails?.totalKm || 0} km
                        </p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Waiting</p>
                        <p className="font-bold" style={{ color: '#1A2332' }}>
                          {trip.tripDetails?.waitingTime || 0} min
                        </p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Total Cost</p>
                        <p className="font-bold text-green-600">
                          ₹{trip.charges?.totalFare?.toLocaleString('en-IN') || 0}
                        </p>
                      </div>
                    </div>
                    
                    {trip.tripDetails?.additionalServices && trip.tripDetails.additionalServices.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs mb-2 font-medium" style={{ color: '#9CA3AF' }}>ADDITIONAL SERVICES</p>
                        <div className="flex flex-wrap gap-2">
                          {trip.tripDetails.additionalServices.map(service => (
                            <span key={service.id} className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium">
                              {service.name} - ₹{service.price}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create/Edit Trip Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
              
              <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: '#E5E7EB' }}>
                <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>
                  {editingTrip ? 'Edit Trip' : 'Create New Trip'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" style={{ color: '#5A6C7D' }} />
                </button>
              </div>

              <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                
                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Trip Date *</label>
                    <input
                      type="date"
                      value={formData.tripDate}
                      onChange={(e) => setFormData({ ...formData, tripDate: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg"
                      style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Trip Time *</label>
                    <input
                      type="time"
                      value={formData.tripTime}
                      onChange={(e) => setFormData({ ...formData, tripTime: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg"
                      style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Customer, Vehicle, Driver */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>
                      Customer *
                      {customers.length === 0 && <span className="text-red-600 text-xs ml-2">(No customers)</span>}
                    </label>
                    <select
                      value={formData.customerId}
                      onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg"
                      style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                    >
                      <option value="">Select Customer</option>
                      {customers.map(c => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>
                      Vehicle *
                      {availableVehicles.length === 0 && <span className="text-red-600 text-xs ml-2">(None available)</span>}
                    </label>
                    <select
                      value={formData.vehicleId}
                      onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg"
                      style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                    >
                      <option value="">Select Vehicle</option>
                      {availableVehicles.map(v => (
                        <option key={v._id} value={v._id}>
                          {v.number} - {v.model}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>
                      Driver *
                      {availableDrivers.length === 0 && <span className="text-red-600 text-xs ml-2">(None available)</span>}
                    </label>
                    <select
                      value={formData.driverId}
                      onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg"
                      style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                    >
                      <option value="">Select Driver</option>
                      {availableDrivers.map(d => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Route Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>From Location *</label>
                    <input
                      type="text"
                      value={formData.fromLocation}
                      onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg"
                      style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                      placeholder="e.g., Connaught Place, Delhi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>To Location *</label>
                    <input
                      type="text"
                      value={formData.toLocation}
                      onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg"
                      style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                      placeholder="e.g., Gurugram Cyber City"
                    />
                  </div>
                </div>

                {/* Odometer Readings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Start Odometer (km) *</label>
                    <input
                      type="number"
                      value={formData.startOdometer}
                      onChange={(e) => setFormData({ ...formData, startOdometer: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg"
                      style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                      placeholder="15000"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>End Odometer (km) *</label>
                    <input
                      type="number"
                      value={formData.endOdometer}
                      onChange={(e) => setFormData({ ...formData, endOdometer: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg"
                      style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                      placeholder="15035"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Waiting Time (minutes)</label>
                    <input
                      type="number"
                      value={formData.waitingTime}
                      onChange={(e) => setFormData({ ...formData, waitingTime: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg"
                      style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                {/* Additional Services */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1A2332' }}>Additional Services (Optional)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {AVAILABLE_SERVICES.map(service => (
                      <label
                        key={service.id}
                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-all"
                        style={{ border: formData.selectedServices.includes(service.id) ? '2px solid #2563EB' : '1px solid #E5E7EB' }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedServices.includes(service.id)}
                          onChange={() => toggleService(service.id)}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm" style={{ color: '#1A2332' }}>{service.name}</p>
                          <p className="text-xs" style={{ color: '#5A6C7D' }}>₹{service.price.toLocaleString('en-IN')}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E5E7EB' }}>
                  <h3 className="font-bold mb-3" style={{ color: '#1A2332' }}>Cost Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#5A6C7D' }}>Distance: {totalKm} km × ₹{COST_PER_KM}/km</span>
                      <span className="font-medium" style={{ color: '#1A2332' }}>₹{kmCost.toLocaleString('en-IN')}</span>
                    </div>
                    {parseFloat(formData.waitingTime) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#5A6C7D' }}>Waiting: {formData.waitingTime} min × ₹{WAITING_COST_PER_MIN}/min</span>
                        <span className="font-medium" style={{ color: '#1A2332' }}>₹{waitingCost.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {servicesCost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span style={{ color: '#5A6C7D' }}>Additional Services</span>
                        <span className="font-medium" style={{ color: '#1A2332' }}>₹{servicesCost.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="pt-2 mt-2 flex justify-between" style={{ borderTop: '1px solid #E5E7EB' }}>
                      <span className="font-bold" style={{ color: '#1A2332' }}>Total Cost</span>
                      <span className="font-bold text-xl text-green-600">₹{totalCost.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 px-6 py-4 border-t shrink-0" style={{ borderColor: '#E5E7EB' }}>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium transition-all"
                  style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: submitLoading ? '#9CA3AF' : 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
                >
                  {submitLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {editingTrip ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : (
                    editingTrip ? 'Update Trip' : 'Create Trip'
                  )}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}