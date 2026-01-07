// src/app/trips/page.tsx
'use client';
import React, { useState } from 'react';
import { Car, Menu, Bell, Settings, Plus, Edit, Trash2, MapPin, Calendar, X, User, Navigation, Clock, DollarSign, Package } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  phone: string;
}

interface Car {
  id: number;
  carNumber: string;
  model: string;
  status: 'available' | 'on-trip';
}

interface Driver {
  id: number;
  name: string;
  status: 'available' | 'on-trip' | 'offline';
}

interface AdditionalService {
  id: string;
  name: string;
  price: number;
}

interface Trip {
  id: number;
  customer: Customer;
  car: Car;
  driver: Driver;
  fromLocation: string;
  toLocation: string;
  startOdometer: number;
  endOdometer: number;
  totalKm: number;
  costPerKm: number;
  waitingTime: number;
  waitingCost: number;
  additionalServices: AdditionalService[];
  totalCost: number;
  status: 'active' | 'completed';
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

export default function TripsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const [customers] = useState<Customer[]>([
    { id: 1, name: 'Rajesh Kumar', phone: '+91 98765 43210' },
    { id: 2, name: 'Priya Sharma', phone: '+91 98765 43211' },
    { id: 3, name: 'Amit Patel', phone: '+91 98765 43212' },
  ]);

  const [cars, setCars] = useState<Car[]>([
    { id: 1, carNumber: 'DL01AB1234', model: 'Toyota Innova', status: 'available' },
    { id: 2, carNumber: 'DL02CD5678', model: 'Honda City', status: 'available' },
    { id: 3, carNumber: 'DL03EF9012', model: 'Maruti Swift', status: 'on-trip' },
  ]);

  const [drivers] = useState<Driver[]>([
    { id: 1, name: 'Mike Johnson', status: 'available' },
    { id: 2, name: 'David Brown', status: 'on-trip' },
    { id: 3, name: 'Chris Wilson', status: 'available' },
  ]);

  const [trips, setTrips] = useState<Trip[]>([
    {
      id: 1,
      customer: customers[0],
      car: cars[2],
      driver: drivers[1],
      fromLocation: 'Connaught Place, Delhi',
      toLocation: 'Gurugram Cyber City',
      startOdometer: 15000,
      endOdometer: 15035,
      totalKm: 35,
      costPerKm: COST_PER_KM,
      waitingTime: 15,
      waitingCost: 30,
      additionalServices: [AVAILABLE_SERVICES[0], AVAILABLE_SERVICES[1]],
      totalCost: 980,
      status: 'active',
      createdAt: '2025-01-04T10:30:00'
    }
  ]);

  const [formData, setFormData] = useState({
    customerId: '',
    carId: '',
    driverId: '',
    fromLocation: '',
    toLocation: '',
    startOdometer: '',
    endOdometer: '',
    waitingTime: '0',
    selectedServices: [] as string[]
  });

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
      carId: '',
      driverId: '',
      fromLocation: '',
      toLocation: '',
      startOdometer: '',
      endOdometer: '',
      waitingTime: '0',
      selectedServices: []
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

  const handleSubmit = () => {
    const start = parseFloat(formData.startOdometer);
    const end = parseFloat(formData.endOdometer);
    
    if (end <= start) {
      alert('End odometer must be greater than start odometer');
      return;
    }

    const selectedCar = cars.find(c => c.id === parseInt(formData.carId));
    if (selectedCar?.status === 'on-trip' && !editingTrip) {
      alert('This car is already assigned to an active trip');
      return;
    }

    const customer = customers.find(c => c.id === parseInt(formData.customerId))!;
    const car = cars.find(c => c.id === parseInt(formData.carId))!;
    const driver = drivers.find(d => d.id === parseInt(formData.driverId))!;
    
    const { totalKm, waitingCost, totalCost } = calculateTotals();
    const selectedServices = AVAILABLE_SERVICES.filter(s => 
      formData.selectedServices.includes(s.id)
    );

    if (editingTrip) {
      setTrips(trips.map(t => t.id === editingTrip.id ? {
        ...t,
        customer,
        car,
        driver,
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        startOdometer: start,
        endOdometer: end,
        totalKm,
        waitingTime: parseFloat(formData.waitingTime),
        waitingCost,
        additionalServices: selectedServices,
        totalCost,
      } : t));
    } else {
      const newTrip: Trip = {
        id: trips.length + 1,
        customer,
        car,
        driver,
        fromLocation: formData.fromLocation,
        toLocation: formData.toLocation,
        startOdometer: start,
        endOdometer: end,
        totalKm,
        costPerKm: COST_PER_KM,
        waitingTime: parseFloat(formData.waitingTime),
        waitingCost,
        additionalServices: selectedServices,
        totalCost,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      setTrips([newTrip, ...trips]);
      
      setCars(cars.map(c => 
        c.id === car.id ? { ...c, status: 'on-trip' as const } : c
      ));
    }
    
    setShowModal(false);
  };

  const handleCompleteTrip = (tripId: number) => {
    if (confirm('Mark this trip as completed?')) {
      setTrips(trips.map(t => 
        t.id === tripId ? { ...t, status: 'completed' as const } : t
      ));
      
      const trip = trips.find(t => t.id === tripId);
      if (trip) {
        setCars(cars.map(c => 
          c.id === trip.car.id ? { ...c, status: 'available' as const } : c
        ));
      }
    }
  };

  const handleDeleteTrip = (tripId: number) => {
    if (confirm('Are you sure you want to delete this trip?')) {
      const trip = trips.find(t => t.id === tripId);
      if (trip && trip.status === 'active') {
        setCars(cars.map(c => 
          c.id === trip.car.id ? { ...c, status: 'available' as const } : c
        ));
      }
      setTrips(trips.filter(t => t.id !== tripId));
    }
  };

  const { totalKm, kmCost, waitingCost, servicesCost, totalCost } = calculateTotals();
  const availableCars = cars.filter(c => c.status === 'available' || c.id === parseInt(formData.carId));
  const availableDrivers = drivers.filter(d => d.status === 'available' || d.id === parseInt(formData.driverId));

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Trip Management</h1>
            <p style={{ color: '#5A6C7D' }}>Create and manage trips</p>
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Trips', value: trips.length, icon: Navigation, color: '#2563EB' },
            { label: 'Active Trips', value: trips.filter(t => t.status === 'active').length, icon: Clock, color: '#F59E0B' },
            { label: 'Completed', value: trips.filter(t => t.status === 'completed').length, icon: Package, color: '#10B981' },
            { label: 'Revenue', value: `₹${trips.reduce((sum, t) => sum + t.totalCost, 0)}`, icon: DollarSign, color: '#8B5CF6' }
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

        <div className="grid grid-cols-1 gap-6">
          {trips.map(trip => (
            <div key={trip.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all" style={{ border: '1px solid #E5E7EB' }}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                      <Navigation className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: '#1A2332' }}>Trip #{trip.id}</h3>
                      <p className="text-sm" style={{ color: '#5A6C7D' }}>{new Date(trip.createdAt).toLocaleString('en-IN')}</p>
                      <span className={`inline-block mt-2 text-xs font-medium px-3 py-1 rounded-full ${trip.status === 'active' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {trip.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {trip.status === 'active' && (
                      <button 
                        onClick={() => handleCompleteTrip(trip.id)}
                        className="px-4 py-2 rounded-lg font-medium text-white transition-all"
                        style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                      >
                        Complete
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteTrip(trip.id)}
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
                        <p className="font-medium" style={{ color: '#1A2332' }}>{trip.car.carNumber}</p>
                        <p className="text-sm" style={{ color: '#5A6C7D' }}>{trip.car.model}</p>
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
                      <p className="font-medium" style={{ color: '#1A2332' }}>{trip.fromLocation}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-5 h-5 mt-0.5" style={{ color: '#EF4444' }} />
                    <div>
                      <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>TO</p>
                      <p className="font-medium" style={{ color: '#1A2332' }}>{trip.toLocation}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4" style={{ borderTop: '1px solid #E5E7EB' }}>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Start KM</p>
                      <p className="font-bold" style={{ color: '#1A2332' }}>{trip.startOdometer}</p>
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>End KM</p>
                      <p className="font-bold" style={{ color: '#1A2332' }}>{trip.endOdometer}</p>
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Total KM</p>
                      <p className="font-bold text-blue-600">{trip.totalKm} km</p>
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Waiting</p>
                      <p className="font-bold" style={{ color: '#1A2332' }}>{trip.waitingTime} min</p>
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Total Cost</p>
                      <p className="font-bold text-green-600">₹{trip.totalCost}</p>
                    </div>
                  </div>
                  
                  {trip.additionalServices.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs mb-2 font-medium" style={{ color: '#9CA3AF' }}>ADDITIONAL SERVICES</p>
                      <div className="flex flex-wrap gap-2">
                        {trip.additionalServices.map(service => (
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
          ))}
        </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>
                {editingTrip ? 'Edit Trip' : 'Create New Trip'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" style={{ color: '#5A6C7D' }} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Customer *</label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  >
                    <option value="">Select Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>
                    Car * {availableCars.length === 0 && <span className="text-red-600 text-xs">(No cars available)</span>}
                  </label>
                  <select
                    value={formData.carId}
                    onChange={(e) => setFormData({ ...formData, carId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  >
                    <option value="">Select Car</option>
                    {availableCars.map(c => (
                      <option key={c.id} value={c.id}>{c.carNumber} - {c.model}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>
                    Driver * {availableDrivers.length === 0 && <span className="text-red-600 text-xs">(No drivers available)</span>}
                  </label>
                  <select
                    value={formData.driverId}
                    onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  >
                    <option value="">Select Driver</option>
                    {availableDrivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Start Odometer (km) *</label>
                  <input
                    type="number"
                    value={formData.startOdometer}
                    onChange={(e) => setFormData({ ...formData, startOdometer: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                    placeholder="15000"
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
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1A2332' }}>Additional Services (Optional)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {AVAILABLE_SERVICES.map(service => (
                    <label
                      key={service.id}
                      className="flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-gray-50"
                      style={{ border: formData.selectedServices.includes(service.id) ? '2px solid #2563EB' : '1px solid #E5E7EB' }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedServices.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                       <p className="font-medium text-sm" style={{ color: '#1A2332' }}>{service.name}</p>
                        <p className="text-xs" style={{ color: '#5A6C7D' }}>₹{service.price}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E5E7EB' }}>
                <h3 className="font-bold mb-3" style={{ color: '#1A2332' }}>Cost Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: '#5A6C7D' }}>Distance: {totalKm} km × ₹{COST_PER_KM}/km</span>
                    <span className="font-medium" style={{ color: '#1A2332' }}>₹{kmCost}</span>
                  </div>
                  {parseFloat(formData.waitingTime) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#5A6C7D' }}>Waiting: {formData.waitingTime} min × ₹{WAITING_COST_PER_MIN}/min</span>
                      <span className="font-medium" style={{ color: '#1A2332' }}>₹{waitingCost}</span>
                    </div>
                  )}
                  {servicesCost > 0 && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: '#5A6C7D' }}>Additional Services</span>
                      <span className="font-medium" style={{ color: '#1A2332' }}>₹{servicesCost}</span>
                    </div>
                  )}
                  <div className="pt-2 mt-2 flex justify-between" style={{ borderTop: '1px solid #E5E7EB' }}>
                    <span className="font-bold" style={{ color: '#1A2332' }}>Total Cost</span>
                    <span className="font-bold text-xl text-green-600">₹{totalCost}</span>
                  </div>
                </div>
              </div>
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
                {editingTrip ? 'Save Changes' : 'Create Trip'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}