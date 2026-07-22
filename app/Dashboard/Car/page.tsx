'use client';
import React, { useState, useEffect } from 'react';
import { Car, Plus, Edit, Trash2, Calendar, X, CheckCircle, XCircle, Clock, AlertCircle, Download } from 'lucide-react';
import { exportToExcel } from '@/lib/exportToExcel';
import Link from 'next/link';

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
  // Nullable: vehicles carried over from the paper books have no recorded dates.
  insuranceExpiry: string | null;
  pollution: string;
  pollutionExpiry: string | null;
  fitness: string;
  fitnessExpiry: string | null;
  rcNumber: string;
  assignedDriverName: string | null;
  totalEarnings: number;
  monthlyEarnings: number;
  totalTrips: number;
  /** Last 4 of the plate — how the books identify this car. */
  shortCode?: string;
  company?: string;
  currentOdometer?: number | null;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    plate: '',
    model: '',
    year: new Date().getFullYear(),
    status: 'available' as 'available' | 'in-use' | 'maintenance',
    color: '',
    fuelType: '',
    mileage: '0 km',
    insurance: '',
    insuranceExpiry: '',
    pollution: '',
    pollutionExpiry: '',
    fitness: '',
    fitnessExpiry: '',
    rcNumber: '',
    totalEarnings: 0,
    monthlyEarnings: 0,
    totalTrips: 0,
    shortCode: '',
    company: '',
    currentOdometer: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicle', {
        cache: 'no-store'
      });
      
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      
      const data = await res.json();
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      alert('Failed to load vehicles');
    }
  };

  /*
   * 'unknown' is not the same as 'expired'. Vehicles carried over from the
   * paper books have no recorded dates, and `new Date(null)` is the epoch — so
   * treating a missing date as a date reported the entire fleet as expired.
   */
  const getInsuranceStatus = (
    expiryDate?: string | null,
  ): 'valid' | 'expiring' | 'expired' | 'unknown' => {
    if (!expiryDate) return 'unknown';
    const expiry = new Date(expiryDate);
    if (Number.isNaN(expiry.getTime())) return 'unknown';

    const daysUntilExpiry = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring';
    return 'valid';
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'available': 
        return { bg: 'bg-green-100', text: 'text-green-700', dot: '#10B981', icon: CheckCircle };
      case 'in-use': 
        return { bg: 'bg-blue-100', text: 'text-blue-700', dot: '#2563EB', icon: Clock };
      case 'maintenance': 
        return { bg: 'bg-orange-100', text: 'text-orange-700', dot: '#F59E0B', icon: AlertCircle };
      case 'valid': 
        return { bg: 'bg-green-100', text: 'text-green-700', dot: '#10B981', icon: CheckCircle };
      case 'expiring': 
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: '#F59E0B', icon: Clock };
      case 'expired': 
        return { bg: 'bg-red-100', text: 'text-red-700', dot: '#EF4444', icon: XCircle };
      default: 
        return { bg: 'bg-gray-100', text: 'text-gray-700', dot: '#9CA3AF', icon: AlertCircle };
    }
  };

  const handleAddVehicle = () => {
    setEditingVehicle(null);
    setFormData({
      name: '',
      plate: '',
      model: '',
      year: new Date().getFullYear(),
      status: 'available',
      color: '',
      fuelType: '',
      mileage: '0 km',
      insurance: '',
      insuranceExpiry: '',
      pollution: '',
      pollutionExpiry: '',
      fitness: '',
      fitnessExpiry: '',
      rcNumber: '',
      totalEarnings: 0,
      monthlyEarnings: 0,
      totalTrips: 0,
      shortCode: '',
      company: '',
      currentOdometer: '',
    });
    setShowModal(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      plate: vehicle.plate,
      model: vehicle.model,
      year: vehicle.year,
      status: vehicle.status,
      color: vehicle.color || '',
      fuelType: vehicle.fuelType || '',
      mileage: vehicle.mileage || '0 km',
      insurance: vehicle.insurance || '',
      insuranceExpiry: vehicle.insuranceExpiry ? new Date(vehicle.insuranceExpiry).toISOString().split('T')[0] : '',
      pollution: vehicle.pollution || '',
      pollutionExpiry: vehicle.pollutionExpiry ? new Date(vehicle.pollutionExpiry).toISOString().split('T')[0] : '',
      fitness: vehicle.fitness || '',
      fitnessExpiry: vehicle.fitnessExpiry ? new Date(vehicle.fitnessExpiry).toISOString().split('T')[0] : '',
      rcNumber: vehicle.rcNumber,
      totalEarnings: vehicle.totalEarnings || 0,
      monthlyEarnings: vehicle.monthlyEarnings || 0,
      totalTrips: vehicle.totalTrips || 0,
      // Last 4 of the plate — how the fuel and duty books identify this car,
      // and what the importer matches on.
      shortCode: vehicle.shortCode || '',
      company: vehicle.company || '',
      currentOdometer: vehicle.currentOdometer != null ? String(vehicle.currentOdometer) : '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      /*
       * Document expiries are deliberately not required. Vehicles carried over
       * from the paper books have none recorded, and demanding them here meant
       * the console could not be used to fill in the very rows that needed it.
       */
      if (!formData.name || !formData.plate || !formData.model || !formData.rcNumber) {
        alert('Name, plate, model and RC number are required');
        return;
      }

      const payload = {
        ...formData,
        year: Number(formData.year),
        // Blank means "not recorded", which the model stores as null rather
        // than an Invalid Date.
        insuranceExpiry: formData.insuranceExpiry || null,
        pollutionExpiry: formData.pollutionExpiry || null,
        fitnessExpiry: formData.fitnessExpiry || null,
        currentOdometer: formData.currentOdometer === '' ? null : Number(formData.currentOdometer),
        totalEarnings: Number(formData.totalEarnings),
        monthlyEarnings: Number(formData.monthlyEarnings),
        totalTrips: Number(formData.totalTrips)
      };

      const method = editingVehicle ? 'PATCH' : 'POST';
      const endpoint = editingVehicle ? `/api/vehicle/${editingVehicle._id}` : '/api/vehicle';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server Error: ${errText}`);
      }

      setShowModal(false);
      setFormData({
        name: '',
        plate: '',
        model: '',
        year: new Date().getFullYear(),
        status: 'available',
        color: '',
        fuelType: '',
        mileage: '0 km',
        insurance: '',
        insuranceExpiry: '',
        pollution: '',
        pollutionExpiry: '',
        fitness: '',
        fitnessExpiry: '',
        rcNumber: '',
        totalEarnings: 0,
        monthlyEarnings: 0,
        totalTrips: 0,
        shortCode: '',
        company: '',
        currentOdometer: '',
      });
      
      fetchVehicles();
      alert('Vehicle saved successfully!');
    } catch (err: any) {
      console.error('Error saving vehicle:', err.message);
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteClick = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteConfirmName('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;

    if (deleteConfirmName !== vehicleToDelete.plate) {
      alert('Plate number does not match. Please enter the exact plate number to confirm deletion.');
      return;
    }

    try {
      const res = await fetch(`/api/vehicle/${vehicleToDelete._id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete vehicle');

      setShowDeleteModal(false);
      setVehicleToDelete(null);
      setDeleteConfirmName('');
      fetchVehicles();
      alert('Vehicle deleted successfully!');
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert('Failed to delete vehicle');
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.rcNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || vehicle.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: vehicles.length,
    available: vehicles.filter(v => v.status === 'available').length,
    'in-use': vehicles.filter(v => v.status === 'in-use').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    expiring: vehicles.filter(v => {
      const insuranceStatus = getInsuranceStatus(v.insuranceExpiry);
      const pollutionStatus = getInsuranceStatus(v.pollutionExpiry);
      const fitnessStatus = getInsuranceStatus(v.fitnessExpiry);
      return insuranceStatus === 'expiring' || pollutionStatus === 'expiring' || fitnessStatus === 'expiring';
    }).length
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Fleet Management</h1>
          <p style={{ color: '#5A6C7D' }}>Manage your vehicle fleet</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportToExcel(
              'Vehicles', 'Fleet',
              ['Name','Plate','Model','Year','Status','Color','Fuel Type','RC Number','Insurance Expiry','Pollution Expiry','Fitness Expiry','Assigned Driver','Total Earnings','Monthly Earnings','Total Trips'],
              vehicles.map(v => [v.name, v.plate, v.model, v.year, v.status, v.color, v.fuelType, v.rcNumber,
                v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString('en-IN') : '',
                v.pollutionExpiry ? new Date(v.pollutionExpiry).toLocaleDateString('en-IN') : '',
                v.fitnessExpiry ? new Date(v.fitnessExpiry).toLocaleDateString('en-IN') : '',
                v.assignedDriverName||'', v.totalEarnings||0, v.monthlyEarnings||0, v.totalTrips||0])
            )}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border hover:bg-gray-50 transition-all text-sm"
            style={{ borderColor: '#E5E7EB', color: '#5A6C7D' }}
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={handleAddVehicle}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
          >
            <Plus className="w-5 h-5" />
            Add Vehicle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Vehicles', value: statusCounts.all, icon: Car, color: '#2563EB' },
          { label: 'Available', value: statusCounts.available, icon: CheckCircle, color: '#10B981' },
          { label: 'In Use', value: statusCounts['in-use'], icon: Clock, color: '#F59E0B' },
          { label: 'Maintenance', value: statusCounts.maintenance, icon: AlertCircle, color: '#EF4444' }
        ].map((stat, idx) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
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
            placeholder="Search vehicles by name, plate, model, or RC..."
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
            <option value="in-use">In Use</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Car className="w-16 h-16 mx-auto mb-4" style={{ color: '#9CA3AF' }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: '#1A2332' }}>No Vehicles Found</h3>
          <p className="mb-6" style={{ color: '#5A6C7D' }}>
            {vehicles.length === 0 ? 'Get started by adding your first vehicle' : 'No vehicles match your search'}
          </p>
          {vehicles.length === 0 && (
            <button
              onClick={handleAddVehicle}
              className="px-6 py-3 rounded-lg text-white font-medium"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
            >
              Add First Vehicle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredVehicles
  .filter(v => v._id && v.plate)
  .map(vehicle => {


            const statusStyle = getStatusStyle(vehicle.status);
            const StatusIcon = statusStyle.icon;
            const insuranceStatus = getInsuranceStatus(vehicle.insuranceExpiry);
            const insuranceStatusStyle = getStatusStyle(insuranceStatus);
            
            return (
              <div key={vehicle._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all" style={{ border: '1px solid #E5E7EB' }}>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
                        <Car className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: '#1A2332' }}>{vehicle.plate}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusStyle.bg} ${statusStyle.text} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                          {(vehicle.status ?? 'unknown').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusStyle.dot }}></div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#5A6C7D' }}>
                      <Car className="w-4 h-4" />
                      <span className="font-medium">{vehicle.name} - {vehicle.model}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm" style={{ color: '#5A6C7D' }}>
                      <span>Insurance</span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${insuranceStatusStyle.bg} ${insuranceStatusStyle.text}`}>
                        {insuranceStatus}
                      </span>
                    </div>
                    {vehicle.assignedDriverName && (
                      <div className="flex items-center gap-2 text-sm" style={{ color: '#5A6C7D' }}>
                        <span>Driver: <strong>{vehicle.assignedDriverName}</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mb-4" style={{ borderTop: '1px solid #E5E7EB' }}>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Trips</p>
                        <p className="text-sm font-bold" style={{ color: '#1A2332' }}>{vehicle.totalTrips}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Year</p>
                        <p className="text-sm font-bold" style={{ color: '#1A2332' }}>{vehicle.year}</p>
                      </div>
                      <div>
                        <p className="text-xs mb-1" style={{ color: '#9CA3AF' }}>Mileage</p>
                        <p className="text-sm font-bold" style={{ color: '#1A2332' }}>{vehicle.mileage}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/Dashboard/Car/${vehicle._id}`} className="flex-1">
                      <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all hover:bg-blue-50"
                        style={{ border: '1px solid #2563EB', color: '#2563EB' }}>
                        <Edit className="w-4 h-4" />
                        View
                      </button>
                    </Link>
                    <button 
                      onClick={() => handleDeleteClick(vehicle)}
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
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>
                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" style={{ color: '#5A6C7D' }} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Vehicle Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Toyota Camry"
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Plate Number *</label>
                  <input
                    type="text"
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
                    placeholder="DL01AB1234"
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Model *</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="2022 Camry Hybrid"
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Year *</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Color</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="Silver"
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Fuel Type</label>
                  <select
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  >
                    <option value="">Select</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="CNG">CNG</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'available' | 'in-use' | 'maintenance' })}
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  >
                    <option value="available">Available</option>
                    <option value="in-use">In Use</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Mileage</label>
                  <input
                    type="text"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                    placeholder="45,230 km"
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>
                    Book code (last 4 of plate)
                  </label>
                  <input
                    type="text"
                    value={formData.shortCode}
                    onChange={(e) => setFormData({ ...formData, shortCode: e.target.value })}
                    placeholder="6494"
                    title="How the fuel and duty books identify this car. The importer matches on it, so keep it accurate."
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Current Odometer</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.currentOdometer}
                    onChange={(e) => setFormData({ ...formData, currentOdometer: e.target.value })}
                    placeholder="31,682"
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="CSC Travels"
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>RC Number *</label>
                  <input
                    type="text"
                    value={formData.rcNumber}
                    onChange={(e) => setFormData({ ...formData, rcNumber: e.target.value })}
                    placeholder="RC123456789"
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Insurance Number</label>
                  <input
                    type="text"
                    value={formData.insurance}
                    onChange={(e) => setFormData({ ...formData, insurance: e.target.value })}
                    placeholder="INS-2024-001"
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Insurance Expiry *</label>
                  <input
                    type="date"
                    value={formData.insuranceExpiry}
                    onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Pollution Certificate</label>
                  <input
                    type="text"
                    value={formData.pollution}
                    onChange={(e) => setFormData({ ...formData, pollution: e.target.value })}
                    placeholder="PUC-2024-ABC123"
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Pollution Expiry *</label>
                  <input
                    type="date"
                    value={formData.pollutionExpiry}
                    onChange={(e) => setFormData({ ...formData, pollutionExpiry: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Fitness Certificate</label>
                  <input
                    type="text"
                    value={formData.fitness}
                    onChange={(e) => setFormData({ ...formData, fitness: e.target.value })}
                    placeholder="FIT-2024-ABC123"
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1A2332' }}>Fitness Expiry *</label>
                  <input
                    type="date"
                    value={formData.fitnessExpiry}
                    onChange={(e) => setFormData({ ...formData, fitnessExpiry: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg"
                    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}/>
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
            {editingVehicle ? 'Save Changes' : 'Add Vehicle'}
          </button>
        </div>
      </div>
    </div>
  )}

  {/* Delete Confirmation Modal */}
  {showDeleteModal && vehicleToDelete && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-center mb-2" style={{ color: '#1A2332' }}>
          Delete Vehicle
        </h2>
        
        <p className="text-center mb-4" style={{ color: '#5A6C7D' }}>
          Are you sure you want to delete <strong>{vehicleToDelete.name}</strong> ({vehicleToDelete.plate})?
        </p>
        
        <p className="text-sm text-center mb-4" style={{ color: '#EF4444' }}>
          This action cannot be undone. Please type the plate number to confirm.
        </p>
        
        <input
          type="text"
          value={deleteConfirmName}
          onChange={(e) => setDeleteConfirmName(e.target.value)}
          placeholder={`Type "${vehicleToDelete.plate}" to confirm`}
          className="w-full px-4 py-3 rounded-lg mb-6"
          style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
        />
        
        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowDeleteModal(false);
              setVehicleToDelete(null);
              setDeleteConfirmName('');
            }}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium"
            style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmDelete}
            disabled={deleteConfirmName !== vehicleToDelete.plate}
            className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#EF4444' }}
          >
            Delete Vehicle
          </button>
        </div>
      </div>
    </div>
  )}
</div>
);
}