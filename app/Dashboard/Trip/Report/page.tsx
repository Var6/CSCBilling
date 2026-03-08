'use client';
import React, { useEffect, useState } from 'react';
import { Car, Users, Menu, Bell, Search, Settings, Plus, Eye, Edit, Printer, Filter, ChevronLeft, ChevronRight, Calendar, X, Download } from 'lucide-react';
import Link from 'next/link';
import { exportToExcel } from '@/lib/exportToExcel';

export default function BookingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDriver, setFilterDriver] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
const [totalTrips, setTotalTrips] = useState(0);
const [loading, setLoading] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
  const fetchTrips = async () => {
    setLoading(true)

    const params = new URLSearchParams({
      search: searchTerm,
      status: filterStatus,
      driver: filterDriver,
      date: filterDate,
      page: currentPage.toString(),
      limit: itemsPerPage.toString(),
    })

    const res = await fetch(`/api/trip/report?${params.toString()}`)

if (!res.ok) {
  console.error("API error:", await res.text())
  setLoading(false)
  return
}

const data = await res.json()

    

    setTrips(data.trips)
    setTotalTrips(data.total)
    setLoading(false)
  }

  fetchTrips()
}, [searchTerm, filterStatus, filterDriver, filterDate, currentPage])



  
    const totalPages = Math.ceil(totalTrips / itemsPerPage)
const displayedTrips = trips

 

  const drivers = [...new Set(trips.map(t => t.driver?.name).filter(Boolean))]


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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Trip Reports</h1>
            <p style={{ color: '#5A6C7D' }}>Manage all trips and bookings</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => exportToExcel(
                'Trip_Report', 'Trip Report',
                ['Trip ID','Customer','Phone','Driver','Vehicle','Pickup','Dropoff','Date','Time','Status','Fare (₹)'],
                trips.map(t => [
                  t.tripId || t._id, t.customer?.name||'', t.customer?.phone||'',
                  t.driver?.name||'', `${t.vehicle?.model||''} ${t.vehicle?.number||''}`.trim(),
                  t.pickup||'', t.dropoff||'', t.date||'', t.time||'',
                  t.status, t.fare || 0
                ])
              )}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border hover:bg-gray-50 transition-all text-sm"
              style={{ borderColor: '#E5E7EB', color: '#5A6C7D' }}
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
            <button className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
              <Plus className="w-5 h-5" />
              New Trip
            </button>
          </div>
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
                {loading ? (
  <tr>
    <td colSpan={9} className="text-center py-10">
      Loading trips...
    </td>
  </tr>
) : displayedTrips.length === 0 ? (
  <tr>
    <td colSpan={9} className="text-center py-10">
      No trips found
    </td>
  </tr>
) : (
  displayedTrips.map((trip, idx) => {
    const statusStyle = getStatusStyle(trip.status);
    return (
      <tr key={idx} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: '#E5E7EB' }}>
                      <td className="px-6 py-4 font-medium" style={{ color: '#2563EB' }}> {trip.tripId}</td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium" style={{ color: '#1A2332' }}>{trip.customer?.name}</div>
                          <div className="text-sm" style={{ color: '#9CA3AF' }}>{trip.customer?.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4" style={{ color: '#5A6C7D' }}>{trip.driver?.name}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#5A6C7D' }}>{trip.vehicle?.model} - {trip.vehicle?.number}</td>
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
                          <Link href={`/Dashboard/Trip/Report/${trip._id}`} className="p-2 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                            <Eye className="w-4 h-4" style={{ color: '#2563EB' }} />
                          </Link>
                          <button className="p-2 hover:bg-green-50 rounded-lg transition-colors" title="Edit">
                            <Edit className="w-4 h-4" style={{ color: '#10B981' }} />
                          </button>
                         <Link
  href={`/invoice/${trip.tripId}`} target="_blank"
  className="p-2 hover:bg-orange-50 rounded-lg transition-colors"
  title="Print Invoice"
>
  <Printer className="w-4 h-4" style={{ color: '#F59E0B' }} />
</Link>

                        </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
            <div style={{ color: '#5A6C7D' }}>
             Showing {(currentPage - 1) * itemsPerPage + 1}
to {Math.min(currentPage * itemsPerPage, totalTrips)}
of {totalTrips} trips

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
  );
}