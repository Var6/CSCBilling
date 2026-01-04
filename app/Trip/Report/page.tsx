'use client';
import React, { useState } from 'react';
import { Car, Users, Menu, Bell, Search, Settings, Plus, Eye, Edit, Printer, Filter, ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

export default function BookingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDriver, setFilterDriver] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const itemsPerPage = 10;

  const allTrips = [
    { id: 'TRP-2401', customer: 'John Smith', phone: '+1 234-567-8901', driver: 'Mike Johnson', vehicle: 'Toyota Camry - ABC123', pickup: 'Airport Terminal 1', dropoff: 'Downtown Hotel', date: '2024-01-02', time: '09:30 AM', status: 'completed', fare: 45.00 },
    { id: 'TRP-2402', customer: 'Sarah Williams', phone: '+1 234-567-8902', driver: 'David Brown', vehicle: 'Honda Accord - XYZ789', pickup: 'Hotel Plaza', dropoff: 'Shopping Mall', date: '2024-01-02', time: '10:15 AM', status: 'ongoing', fare: 28.50 },
    { id: 'TRP-2403', customer: 'Robert Davis', phone: '+1 234-567-8903', driver: 'Chris Wilson', vehicle: 'Ford Fusion - DEF456', pickup: 'Train Station', dropoff: 'Office Park', date: '2024-01-02', time: '11:00 AM', status: 'completed', fare: 35.00 },
    { id: 'TRP-2404', customer: 'Emily Jones', phone: '+1 234-567-8904', driver: 'James Taylor', vehicle: 'Hyundai Elantra - GHI321', pickup: 'Residential Area', dropoff: 'Airport Terminal 2', date: '2024-01-02', time: '12:45 PM', status: 'pending', fare: 52.00 },
    { id: 'TRP-2405', customer: 'Michael Brown', phone: '+1 234-567-8905', driver: 'Tom Anderson', vehicle: 'Nissan Altima - JKL654', pickup: 'Downtown', dropoff: 'Sports Stadium', date: '2024-01-02', time: '02:30 PM', status: 'completed', fare: 38.00 },
    { id: 'TRP-2406', customer: 'Lisa Anderson', phone: '+1 234-567-8906', driver: 'Mike Johnson', vehicle: 'Toyota Camry - ABC123', pickup: 'University Campus', dropoff: 'City Center', date: '2024-01-02', time: '03:15 PM', status: 'ongoing', fare: 22.50 },
    { id: 'TRP-2407', customer: 'David Wilson', phone: '+1 234-567-8907', driver: 'Chris Wilson', vehicle: 'Ford Fusion - DEF456', pickup: 'Hospital', dropoff: 'Residential Complex', date: '2024-01-02', time: '04:00 PM', status: 'cancelled', fare: 0.00 },
    { id: 'TRP-2408', customer: 'Jennifer Taylor', phone: '+1 234-567-8908', driver: 'David Brown', vehicle: 'Honda Accord - XYZ789', pickup: 'Restaurant District', dropoff: 'Concert Hall', date: '2024-01-01', time: '06:30 PM', status: 'completed', fare: 42.00 },
    { id: 'TRP-2409', customer: 'Thomas Martinez', phone: '+1 234-567-8909', driver: 'James Taylor', vehicle: 'Hyundai Elantra - GHI321', pickup: 'Business District', dropoff: 'Airport Terminal 1', date: '2024-01-01', time: '07:15 PM', status: 'completed', fare: 55.00 },
    { id: 'TRP-2410', customer: 'Patricia Garcia', phone: '+1 234-567-8910', driver: 'Tom Anderson', vehicle: 'Nissan Altima - JKL654', pickup: 'Suburban Area', dropoff: 'Convention Center', date: '2024-01-01', time: '08:00 PM', status: 'pending', fare: 48.00 },
    { id: 'TRP-2411', customer: 'Christopher Lee', phone: '+1 234-567-8911', driver: 'Mike Johnson', vehicle: 'Toyota Camry - ABC123', pickup: 'Hotel Grand', dropoff: 'Beach Resort', date: '2024-01-01', time: '09:30 AM', status: 'completed', fare: 68.00 },
    { id: 'TRP-2412', customer: 'Amanda White', phone: '+1 234-567-8912', driver: 'Chris Wilson', vehicle: 'Ford Fusion - DEF456', pickup: 'Shopping Center', dropoff: 'Medical Center', date: '2024-01-01', time: '10:45 AM', status: 'completed', fare: 31.50 }
  ];

  const filteredTrips = allTrips.filter(trip => {
    const matchesSearch = trip.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trip.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trip.driver.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || trip.status === filterStatus;
    const matchesDriver = filterDriver === 'all' || trip.driver === filterDriver;
    const matchesDate = !filterDate || trip.date === filterDate;
    return matchesSearch && matchesStatus && matchesDriver && matchesDate;
  });

  const totalPages = Math.ceil(filteredTrips.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedTrips = filteredTrips.slice(startIndex, startIndex + itemsPerPage);

  const drivers = [...new Set(allTrips.map(t => t.driver))];

  const getStatusStyle = (status:any) => {
    switch(status) {
      case 'completed': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
      case 'ongoing': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
      case 'pending': return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
      case 'cancelled': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
      default: return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    }
  };

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterDriver('all');
    setFilterDate('');
    setSearchTerm('');
  };

  const activeFiltersCount = [filterStatus !== 'all', filterDriver !== 'all', filterDate !== ''].filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="fixed top-0 left-0 right-0 h-16 bg-white flex items-center px-6 shadow-sm z-50" style={{ borderBottom: '1px solid #E5E7EB' }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-4">
          <Menu className="w-6 h-6" style={{ color: '#5A6C7D' }} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
            <Car className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold" style={{ color: '#1A2332' }}>TripEase</span>
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-4">
          <button className="relative p-2 hover:bg-gray-50 rounded-lg">
            <Bell className="w-5 h-5" style={{ color: '#5A6C7D' }} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }}></span>
          </button>
          <button className="p-2 hover:bg-gray-50 rounded-lg">
            <Settings className="w-5 h-5" style={{ color: '#5A6C7D' }} />
          </button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
            AD
          </div>
        </div>
      </div>

      <div className={`transition-all pt-20 pb-8 ${sidebarOpen ? 'ml-64 pl-8 pr-8' : 'px-8'}`}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Trip Reports</h1>
            <p style={{ color: '#5A6C7D' }}>Manage all trips and bookings</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
            <Plus className="w-5 h-5" />
            New Trip
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm mb-6 p-6" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="Search by Trip ID, Customer, or Driver..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg"
                style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all relative"
              style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
            >
              <Filter className="w-5 h-5" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#2563EB' }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#5A6C7D' }}>Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#5A6C7D' }}>Driver</label>
                <select
                  value={filterDriver}
                  onChange={(e) => setFilterDriver(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                >
                  <option value="all">All Drivers</option>
                  {drivers.map(driver => (
                    <option key={driver} value={driver}>{driver}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#5A6C7D' }}>Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full px-4 py-2 rounded-lg font-medium transition-all hover:bg-red-50"
                  style={{ border: '1px solid #EF4444', color: '#EF4444' }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#F8F9FA' }}>
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Trip ID</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Customer</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Driver</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Vehicle</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Route</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Date & Time</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Fare</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedTrips.map((trip, idx) => {
                  const statusStyle = getStatusStyle(trip.status);
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: '#E5E7EB' }}>
                      <td className="px-6 py-4 font-medium" style={{ color: '#2563EB' }}>{trip.id}</td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium" style={{ color: '#1A2332' }}>{trip.customer}</div>
                          <div className="text-sm" style={{ color: '#9CA3AF' }}>{trip.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4" style={{ color: '#5A6C7D' }}>{trip.driver}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#5A6C7D' }}>{trip.vehicle}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#5A6C7D' }}>
                        <div>{trip.pickup}</div>
                        <div className="text-xs" style={{ color: '#9CA3AF' }}>→ {trip.dropoff}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div style={{ color: '#1A2332' }}>{trip.date}</div>
                        <div style={{ color: '#9CA3AF' }}>{trip.time}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold" style={{ color: '#1A2332' }}>
                        ${trip.fare.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                            <Eye className="w-4 h-4" style={{ color: '#2563EB' }} />
                          </button>
                          <button className="p-2 hover:bg-green-50 rounded-lg transition-colors" title="Edit">
                            <Edit className="w-4 h-4" style={{ color: '#10B981' }} />
                          </button>
                          <button className="p-2 hover:bg-orange-50 rounded-lg transition-colors" title="Print">
                            <Printer className="w-4 h-4" style={{ color: '#F59E0B' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
            <div style={{ color: '#5A6C7D' }}>
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredTrips.length)} of {filteredTrips.length} trips
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentPage === i + 1 ? 'text-white' : ''}`}
                  style={{
                    background: currentPage === i + 1 ? 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' : 'transparent',
                    border: '1px solid #E5E7EB',
                    color: currentPage === i + 1 ? '#FFFFFF' : '#5A6C7D'
                  }}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}