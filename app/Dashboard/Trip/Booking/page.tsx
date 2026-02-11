'use client';
import React, { useEffect, useState } from 'react';
import { Car, Plus, Trash2, MapPin, X, User, Navigation, Clock, DollarSign, Package } from 'lucide-react';
import { IVehicle, IDriver, ITrip } from '@/types/types';

type Customer = {
  _id: string;
  name: string;
  phone: string;
};


type AdditionalService = {
  id: string;
  name: string;
  price: number;
};

type Trip = {
  id: string;
  customer: { name: string; phone: string };
  car: { carNumber: string; model: string };
  driver: { name: string };
  fromLocation: string;
  toLocation: string;
  startOdometer: number;
  endOdometer: number;
  totalKm: number;
  waitingTime: number;
  additionalServices: AdditionalService[];
  totalCost: number;
  status: "active" | "completed";
  createdAt: string;
};

type DBTrip = {
  _id: string;
  tripNumber: string;
  customer: { name: string; phone: string };
  driver: { name: string };
  vehicle: { model: string; number?: string; plate?: string };
  route: { pickup: string; dropoff: string };
  charges: { totalFare: number };
  status: "completed" | "ongoing" | "pending" | "cancelled";
  createdAt: string;
};

const COST_PER_KM = 20;
const WAITING_COST_PER_MIN = 2;
const AVAILABLE_SERVICES = [
  { id: 'toll', name: 'Toll Charges' },
  { id: 'parking', name: 'Parking Fee' },
  { id: 'luggage', name: 'Extra Luggage' },
  { id: 'ac', name: 'AC Charges' },
  { id: 'night', name: 'Night Charges' },
];


export default function TripsPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [cars, setCars] = useState<IVehicle[]>([]);
  const [drivers, setDrivers] = useState<IDriver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);

 const [formData, setFormData] = useState<{
  customerId: string;
  carId: string;
  driverId: string;
  fromLocation: string;
  toLocation: string;
  startOdometer: string;
  endOdometer: string;
  waitingTime: string;
  selectedServices: AdditionalService[];
}>({
  customerId: '',
  carId: '',
  driverId: '',
  fromLocation: '',
  toLocation: '',
  startOdometer: '',
  endOdometer: '',
  waitingTime: '0',
  selectedServices: [],
});

const [newCustomer, setNewCustomer] = useState({
  name: "",
  phone: "",
  address: "",
});
const mapTrips = (dbTrips: DBTrip[] = []): Trip[] =>
    dbTrips.map((t) => ({
      id: t._id,
      customer: t.customer,
      car: { carNumber: t.vehicle.number || t.vehicle.plate || '', model: t.vehicle.model },
      driver: t.driver,
      fromLocation: t.route.pickup,
      toLocation: t.route.dropoff,
      startOdometer: 0,
      endOdometer: 0,
      totalKm: 0,
      waitingTime: 0,
      additionalServices: [],
      totalCost: t.charges?.totalFare ?? 0,
      status: t.status === "completed" ? "completed" : "active",
      createdAt: t.createdAt,
    }));

  useEffect(() => {
    async function loadData() {
      const [vRes, dRes, cRes] = await Promise.all([
        fetch("/api/vehicle"),
        fetch("/api/driver"),
        fetch("/api/customer")
      ]);

      const vehicles = await vRes.json();
      const driversData = await dRes.json();
      const customersData = await cRes.json();

      setCars(vehicles);
      setDrivers(driversData);
      setCustomers(customersData);
    }
    loadData();
  }, []);

  useEffect(() => {
    async function loadTrips() {
      const res = await fetch("/api/trip");
      const text = await res.text();
if (!text) return;
const data = JSON.parse(text);

      setTrips(mapTrips(data.trips));
      setLoading(false);
    }
    loadTrips();
  }, []);

  const calculateTotals = () => {
    const start = parseFloat(formData.startOdometer) || 0;
    const end = parseFloat(formData.endOdometer) || 0;
    const totalKm = end > start ? end - start : 0;
    const kmCost = totalKm * COST_PER_KM;
    const waitingMinutes = parseFloat(formData.waitingTime) || 0;
    const waitingCost = waitingMinutes * WAITING_COST_PER_MIN;
   const servicesCost = formData.selectedServices.reduce(
  (sum, service) => sum + (service.price || 0),
  0
);

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

const toggleService = (service: { id: string; name: string }) => {
  setFormData(prev => {
    const exists = prev.selectedServices.find(s => s.id === service.id);

    if (exists) {
      return {
        ...prev,
        selectedServices: prev.selectedServices.filter(s => s.id !== service.id),
      };
    }

    return {
      ...prev,
      selectedServices: [
        ...prev.selectedServices,
        { id: service.id, name: service.name, price: 0 },
      ],
    };
  });
};


  const handleSubmit = async () => {
    const start = Number(formData.startOdometer);
    const end = Number(formData.endOdometer);

    if (end <= start) {
      alert("End odometer must be greater");
      return;
    }

   const customer = customers.find(
  c => c._id === formData.customerId
);

    const car = cars.find(c => c._id?.toString() === formData.carId);
    const driver = drivers.find(d => d._id?.toString() === formData.driverId);

    if (!customer) {
  alert("Please select a customer");
  return;
}
if (!car) {
  alert("Please select a car");
  return;
}
if (!driver) {
  alert("Please select a driver");
  return;
}

2025


    const { totalKm, kmCost, waitingCost } = calculateTotals();

    await fetch("/api/trip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: { name: customer.name, phone: customer.phone },
        driver: { name: driver.name, driverId: driver._id },
        vehicle: { model: car.model, number: car.plate, vehicleId: car._id },
        route: { pickup: formData.fromLocation, dropoff: formData.toLocation },
        tripDate: new Date(),
        tripTime: new Date().toLocaleTimeString("en-IN"),
        startOdometer: start,
        endOdometer: end,
        totalKm,
        distanceCost: kmCost,
        waitingTime: formData.waitingTime,
        waitingCost,
       additionalServices: formData.selectedServices,

        fare: calculateTotals().totalCost,
        status: "ongoing",
      }),
    });

    const res = await fetch("/api/trip");
    const data = await res.json();
    setTrips(mapTrips(data.trips));
    setShowModal(false);
  };

 const handleCompleteTrip = async (id: string) => {
  try {
    // 1️⃣ Mark trip as completed
    const updateRes = await fetch("/api/trip", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _id: id,
        status: "completed",
      }),
    });

    if (!updateRes.ok) {
      const err = await updateRes.json();
      alert(err.error || "Failed to complete trip");
      return;
    }

    // 2️⃣ Reload trips
    const res = await fetch("/api/trip");
    const data = await res.json();

    const mappedTrips = mapTrips(data.trips);
    setTrips(mappedTrips);

    // 3️⃣ Count completed rides
    const completedCount = mappedTrips.filter(
      (t) => t.status === "completed"
    ).length;

    // 4️⃣ Notify user
    alert(
      `✅ Trip completed successfully!\n\n🚕 Total completed rides: ${completedCount}`
    );
  } catch (error) {
    console.error("Complete trip error:", error);
    alert("Something went wrong while completing the trip");
  }
};

  const handleDeleteTrip = async (id: string) => {
    if (!confirm("Delete this trip?")) return;
    await fetch("/api/trip", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const res = await fetch("/api/trip");
    const data = await res.json();
    setTrips(mapTrips(data.trips));
  };

  const { totalKm, kmCost, waitingCost, servicesCost, totalCost } = calculateTotals();
  const availableCars = cars.filter(c => c.status === "available");
  const availableDrivers = drivers.filter(d => d.status === "available");

  

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Trip Management</h1>
          <p style={{ color: '#5A6C7D' }}>Create and manage trips</p>
        </div>
        <button onClick={handleAddTrip} className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
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
                    <button onClick={() => handleCompleteTrip(trip.id)} className="px-4 py-2 rounded-lg font-medium text-white transition-all" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                      Complete
                    </button>
                  )}
                  <button onClick={() => handleDeleteTrip(trip.id)} className="p-2 rounded-lg transition-all hover:bg-red-50" style={{ border: '1px solid #EF4444', color: '#EF4444' }}>
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
  <label className="block text-sm font-medium mb-1">Customer *</label>

  <div className="flex gap-2">
    <select
      value={formData.customerId}
      onChange={(e) =>
        setFormData({ ...formData, customerId: e.target.value })
      }
      className="flex-1 px-3 py-2.5 rounded-lg border"
    >
      <option value="">Select Customer</option>
      {customers.map(c => (
        <option key={c._id} value={c._id}>
          {c.name} ({c.phone})
        </option>
      ))}
    </select>

    <button
      type="button"
      onClick={() => setShowCustomerForm(true)}
      className="px-3 py-2 rounded-lg border text-sm font-medium"
    >
      + Add
    </button>
  </div>
  {showCustomerForm && (
  <div className="p-4 rounded-lg border bg-gray-50 space-y-3">
    <h4 className="font-semibold text-sm">Add New Customer</h4>

    <input
      placeholder="Customer Name"
      className="w-full px-3 py-2 border rounded"
      value={newCustomer.name}
      onChange={(e) =>
        setNewCustomer({ ...newCustomer, name: e.target.value })
      }
    />

    <input
      placeholder="Phone Number"
      className="w-full px-3 py-2 border rounded"
      value={newCustomer.phone}
      onChange={(e) =>
        setNewCustomer({ ...newCustomer, phone: e.target.value })
      }
    />

    <input
      placeholder="Address"
      className="w-full px-3 py-2 border rounded"
      value={newCustomer.address}
      onChange={(e) =>
        setNewCustomer({ ...newCustomer, address: e.target.value })
      }
    />

    <div className="flex gap-2">
      <button
        onClick={async () => {
          if (!newCustomer.name || !newCustomer.phone || !newCustomer.address) {
            alert("All fields required");
            return;
          }

          const res = await fetch("/api/customer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newCustomer),
          });

          const created = await res.json();

          setCustomers(prev => [created, ...prev]);
          setFormData(prev => ({
            ...prev,
            customerId: created._id,
          }));

          setNewCustomer({ name: "", phone: "", address: "" });
          setShowCustomerForm(false);
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Save Customer
      </button>

      <button
        onClick={() => setShowCustomerForm(false)}
        className="px-4 py-2 border rounded"
      >
        Cancel
      </button>
    </div>
  </div>
)}

</div>


                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>
                    Car * {availableCars.length === 0 && <span className="text-red-600 text-xs">(No cars available)</span>}
                  </label>
                  <select value={formData.carId} onChange={(e) => {
                    const carId = e.target.value;
                    const vehicle = cars.find(v => v._id?.toString() === carId);
                    setFormData(prev => ({ ...prev, carId, driverId: vehicle?.assignedDriverId?.toString() || "" }));
                  }} className="w-full px-3 py-2.5 rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}>
                    <option value="">Select Car</option>
                    {availableCars.map(c => (
                      <option key={c._id?.toString()} value={c._id?.toString()}>{c.plate} - {c.model}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>
                    Driver * {availableDrivers.length === 0 && <span className="text-red-600 text-xs">(No drivers available)</span>}
                  </label>
                  <select value={formData.driverId} onChange={(e) => {
                    const driverId = e.target.value;
                    const driver = drivers.find(d => d._id?.toString() === driverId);
                    setFormData(prev => ({ ...prev, driverId, carId: driver?.vehicleId?.toString() || "" }));
                  }} className="w-full px-3 py-2.5 rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}>
                    <option value="">Select Driver</option>
                    {availableDrivers.map(d => (
                      <option key={d._id?.toString()} value={d._id?.toString()}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Waiting Time (minutes)</label>
                  <input type="number" value={formData.waitingTime} onChange={(e) => setFormData({ ...formData, waitingTime: e.target.value })} className="w-full px-3 py-2.5 rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }} placeholder="0" min="0" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>From Location *</label>
                <input type="text" value={formData.fromLocation} onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })} className="w-full px-3 py-2.5 rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }} placeholder="e.g., Connaught Place, Delhi" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>To Location *</label>
                <input type="text" value={formData.toLocation} onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })} className="w-full px-3 py-2.5 rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }} placeholder="e.g., Gurugram Cyber City" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Start Odometer (km) *</label>
                  <input type="number" value={formData.startOdometer} onChange={(e) => setFormData({ ...formData, startOdometer: e.target.value })} className="w-full px-3 py-2.5 rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }} placeholder="15000" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>End Odometer (km) *</label>
                  <input type="number" value={formData.endOdometer} onChange={(e) => setFormData({ ...formData, endOdometer: e.target.value })} className="w-full px-3 py-2.5 rounded-lg" style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }} placeholder="15035" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1A2332' }}>Additional Services (Optional)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                   {AVAILABLE_SERVICES.map(service => {
      const selected = formData.selectedServices.find(s => s.id === service.id);

      return (
        <div
          key={service.id}
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{
            border: selected ? '2px solid #2563EB' : '1px solid #E5E7EB',
          }}
        >
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => toggleService(service)}
            className="w-4 h-4"
          />

          <div className="flex-1">
            <p className="font-medium text-sm" style={{ color: '#1A2332' }}>
              {service.name}
            </p>
          </div>

          {selected && (
            <input
              type="number"
              min="0"
              placeholder="₹ Amount"
              value={selected.price}
              onChange={(e) => {
                const price = Number(e.target.value);
                setFormData(prev => ({
                  ...prev,
                  selectedServices: prev.selectedServices.map(s =>
                    s.id === service.id ? { ...s, price } : s
                  ),
                }));
              }}
              className="w-24 px-2 py-1 border rounded-md text-sm"
            />
          )}
        </div>
      );
    })}
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
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-lg font-medium" style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                {editingTrip ? 'Save Changes' : 'Create Trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}