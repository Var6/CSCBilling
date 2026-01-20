// src/app/trips/[id]/page.tsx
'use client';
import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Car, 
  MapPin, 
  Navigation, 
  Clock, 
  DollarSign, 
  Calendar,
  Phone,
  Edit,
  Trash2,
  CheckCircle,
  Package,
  Receipt
} from 'lucide-react';

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

// Mock data - In real app, fetch this based on ID
const MOCK_TRIPS: Trip[] = [
  {
    id: 1,
    customer: { id: 1, name: 'Rajesh Kumar', phone: '+91 98765 43210' },
    car: { id: 3, carNumber: 'DL03EF9012', model: 'Maruti Swift', status: 'on-trip' },
    driver: { id: 2, name: 'David Brown', status: 'on-trip' },
    fromLocation: 'Connaught Place, Delhi',
    toLocation: 'Gurugram Cyber City',
    startOdometer: 15000,
    endOdometer: 15035,
    totalKm: 35,
    costPerKm: 20,
    waitingTime: 15,
    waitingCost: 30,
    additionalServices: [
      { id: 'toll', name: 'Toll Charges', price: 150 },
      { id: 'parking', name: 'Parking Fee', price: 100 }
    ],
    totalCost: 980,
    status: 'active',
    createdAt: '2025-01-04T10:30:00'
  },
  {
    id: 2,
    customer: { id: 2, name: 'Priya Sharma', phone: '+91 98765 43211' },
    car: { id: 1, carNumber: 'DL01AB1234', model: 'Toyota Innova', status: 'available' },
    driver: { id: 1, name: 'Mike Johnson', status: 'available' },
    fromLocation: 'India Gate, Delhi',
    toLocation: 'Noida Sector 18',
    startOdometer: 20000,
    endOdometer: 20028,
    totalKm: 28,
    costPerKm: 20,
    waitingTime: 10,
    waitingCost: 20,
    additionalServices: [
      { id: 'ac', name: 'AC Charges', price: 300 }
    ],
    totalCost: 880,
    status: 'completed',
    createdAt: '2025-01-03T14:20:00'
  }
];

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const tripId = parseInt(resolvedParams.id);
  
  // Find trip by ID
  const trip = MOCK_TRIPS.find(t => t.id === tripId);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4" style={{ color: '#1A2332' }}>Trip Not Found</h1>
          <p className="mb-6" style={{ color: '#5A6C7D' }}>The trip you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/trips')}
            className="px-6 py-3 rounded-lg text-white font-medium"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
          >
            Back to Trips
          </button>
        </div>
      </div>
    );
  }

  const handleCompleteTrip = () => {
    // In real app, update trip status via API
    alert('Trip marked as completed!');
    router.push('/trips');
  };

  const handleDeleteTrip = () => {
    // In real app, delete trip via API
    alert('Trip deleted successfully!');
    router.push('/trips');
  };

  const baseCost = trip.totalKm * trip.costPerKm;
  const servicesCost = trip.additionalServices.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/trips')}
            className="flex items-center gap-2 mb-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Trips
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>
                Trip #{trip.id}
              </h1>
              <p style={{ color: '#5A6C7D' }}>
                {new Date(trip.createdAt).toLocaleString('en-IN', { 
                  dateStyle: 'full', 
                  timeStyle: 'short' 
                })}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-lg font-medium ${
                trip.status === 'active' 
                  ? 'bg-yellow-100 text-yellow-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {trip.status === 'active' ? 'ACTIVE' : 'COMPLETED'}
              </span>
              
              {trip.status === 'active' && (
                <button
                  onClick={handleCompleteTrip}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete Trip
                </button>
              )}
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg hover:bg-red-50 transition-all"
                style={{ border: '1px solid #EF4444', color: '#EF4444' }}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white" 
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                <User className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg" style={{ color: '#1A2332' }}>Customer</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>NAME</p>
                <p className="font-semibold" style={{ color: '#1A2332' }}>{trip.customer.name}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>PHONE</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" style={{ color: '#5A6C7D' }} />
                  <p className="font-medium" style={{ color: '#1A2332' }}>{trip.customer.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white" 
                style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                <Car className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg" style={{ color: '#1A2332' }}>Vehicle</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>CAR NUMBER</p>
                <p className="font-semibold" style={{ color: '#1A2332' }}>{trip.car.carNumber}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>MODEL</p>
                <p className="font-medium" style={{ color: '#1A2332' }}>{trip.car.model}</p>
              </div>
            </div>
          </div>

          {/* Driver Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white" 
                style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
                <User className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg" style={{ color: '#1A2332' }}>Driver</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>NAME</p>
                <p className="font-semibold" style={{ color: '#1A2332' }}>{trip.driver.name}</p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>STATUS</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                  trip.driver.status === 'available' 
                    ? 'bg-green-100 text-green-700'
                    : trip.driver.status === 'on-trip'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {trip.driver.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Route Information */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6" style={{ border: '1px solid #E5E7EB' }}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: '#1A2332' }}>
            <Navigation className="w-5 h-5" />
            Route Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" 
                style={{ backgroundColor: '#DEF7EC' }}>
                <MapPin className="w-5 h-5" style={{ color: '#10B981' }} />
              </div>
              <div className="flex-1">
                <p className="text-xs mb-1 font-medium" style={{ color: '#9CA3AF' }}>FROM</p>
                <p className="font-semibold text-lg" style={{ color: '#1A2332' }}>{trip.fromLocation}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" 
                style={{ backgroundColor: '#FEE2E2' }}>
                <MapPin className="w-5 h-5" style={{ color: '#EF4444' }} />
              </div>
              <div className="flex-1">
                <p className="text-xs mb-1 font-medium" style={{ color: '#9CA3AF' }}>TO</p>
                <p className="font-semibold text-lg" style={{ color: '#1A2332' }}>{trip.toLocation}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trip Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Start Odometer', value: `${trip.startOdometer} km`, icon: Navigation, color: '#2563EB' },
            { label: 'End Odometer', value: `${trip.endOdometer} km`, icon: Navigation, color: '#8B5CF6' },
            { label: 'Total Distance', value: `${trip.totalKm} km`, icon: Package, color: '#10B981' },
            { label: 'Waiting Time', value: `${trip.waitingTime} min`, icon: Clock, color: '#F59E0B' },
          ].map((metric, idx) => (
            <div key={idx} className="bg-white rounded-xl p-5 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
              <metric.icon className="w-8 h-8 mb-3" style={{ color: metric.color }} />
              <p className="text-2xl font-bold mb-1" style={{ color: '#1A2332' }}>{metric.value}</p>
              <p className="text-sm" style={{ color: '#5A6C7D' }}>{metric.label}</p>
            </div>
          ))}
        </div>

        {/* Cost Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2" style={{ color: '#1A2332' }}>
            <Receipt className="w-5 h-5" />
            Cost Breakdown
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div>
                <p className="font-medium" style={{ color: '#1A2332' }}>Base Fare</p>
                <p className="text-sm" style={{ color: '#5A6C7D' }}>
                  {trip.totalKm} km × ₹{trip.costPerKm}/km
                </p>
              </div>
              <p className="font-bold text-lg" style={{ color: '#1A2332' }}>₹{baseCost}</p>
            </div>

            {trip.waitingTime > 0 && (
              <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid #E5E7EB' }}>
                <div>
                  <p className="font-medium" style={{ color: '#1A2332' }}>Waiting Charges</p>
                  <p className="text-sm" style={{ color: '#5A6C7D' }}>
                    {trip.waitingTime} minutes × ₹2/min
                  </p>
                </div>
                <p className="font-bold text-lg" style={{ color: '#1A2332' }}>₹{trip.waitingCost}</p>
              </div>
            )}

            {trip.additionalServices.length > 0 && (
              <div className="pb-3" style={{ borderBottom: '1px solid #E5E7EB' }}>
                <p className="font-medium mb-3" style={{ color: '#1A2332' }}>Additional Services</p>
                <div className="space-y-2">
                  {trip.additionalServices.map(service => (
                    <div key={service.id} className="flex justify-between items-center pl-4">
                      <p className="text-sm" style={{ color: '#5A6C7D' }}>{service.name}</p>
                      <p className="font-medium" style={{ color: '#1A2332' }}>₹{service.price}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: '1px solid #F3F4F6' }}>
                  <p className="font-medium" style={{ color: '#1A2332' }}>Services Total</p>
                  <p className="font-bold" style={{ color: '#1A2332' }}>₹{servicesCost}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <p className="font-bold text-xl" style={{ color: '#1A2332' }}>Total Amount</p>
              <p className="font-bold text-3xl text-green-600">₹{trip.totalCost}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-2" style={{ color: '#1A2332' }}>Delete Trip</h3>
            <p className="mb-6" style={{ color: '#5A6C7D' }}>
              Are you sure you want to delete this trip? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium"
                style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTrip}
                className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium"
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