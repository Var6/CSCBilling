'use client';
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  MoreVertical, 
  Eye, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowUpDown
} from 'lucide-react';

const BookingManagement = () => {
  const [activeTab, setActiveTab] = useState('All Bookings');

  const bookings = [
    { id: "TX-4492", date: "02 Jan 2026", customer: "Arjun Mehta", driver: "Suresh Pal", vehicle: "Toyota Innova (MH-01-AX-1234)", status: "Completed", fare: "$85.00", type: "Airport Drop" },
    { id: "TX-4491", date: "02 Jan 2026", customer: "Priya Sharma", driver: "Rajesh Kumar", vehicle: "Maruti Swift (MH-01-CV-5678)", status: "Active", fare: "$42.50", type: "Local" },
    { id: "TX-4490", date: "01 Jan 2026", customer: "Kevin V.", driver: "Unassigned", vehicle: "Pending", status: "Pending", fare: "$120.00", type: "Outstation" },
    { id: "TX-4489", date: "01 Jan 2026", customer: "Anita Desai", driver: "Vikram Singh", vehicle: "Honda City (MH-02-BZ-9012)", status: "Cancelled", fare: "$0.00", type: "Local" },
    { id: "TX-4488", date: "01 Jan 2026", customer: "Rohan J.", driver: "Suresh Pal", vehicle: "Toyota Innova (MH-01-AX-1234)", status: "Completed", fare: "$95.00", type: "Corporate" },
  ];

  const getStatusStyle = (status:any) => {
    switch (status) {
      case 'Completed': return 'bg-[#F0FDF4] text-[#10B981] border-[#10B981]/20';
      case 'Active': return 'bg-[#DBEAFE] text-[#2563EB] border-[#2563EB]/20';
      case 'Pending': return 'bg-[#FFFBEB] text-[#F59E0B] border-[#F59E0B]/20';
      case 'Cancelled': return 'bg-[#FEF2F2] text-[#EF4444] border-[#EF4444]/20';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="p-8 font-['Inter'] bg-[#F8F9FA] min-h-screen mt-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1A2332]">Trip Management</h1>
          <p className="text-[#5A6C7D] text-sm mt-1">Manage, track, and dispatch all vehicle bookings.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm font-semibold text-[#1A2332] hover:bg-gray-50 transition-colors">
            <Download size={18} /> Export CSV
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-200 hover:bg-[#1E40AF] transition-all">
            <Plus size={18} /> New Booking
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
            <input 
              type="text" 
              placeholder="Search by Trip ID, Customer or Driver..." 
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg text-sm focus:ring-2 focus:ring-[#2563EB]/10 focus:border-[#2563EB] outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
              <select className="pl-9 pr-8 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm appearance-none outline-none focus:border-[#2563EB]">
                <option>All Dates</option>
                <option>Today</option>
                <option>Yesterday</option>
              </select>
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={16} />
              <select className="pl-9 pr-8 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm appearance-none outline-none focus:border-[#2563EB]">
                <option>All Drivers</option>
                <option>Suresh Pal</option>
                <option>Rajesh Kumar</option>
              </select>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-[#E5E7EB] rounded-lg text-sm text-[#5A6C7D] hover:bg-gray-50">
              <Filter size={16} /> More Filters
            </button>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-8 border-b border-[#E5E7EB] mb-6">
        {['All Bookings', 'Live', 'Upcoming', 'Completed', 'Cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-semibold transition-all relative ${
              activeTab === tab ? "text-[#2563EB]" : "text-[#9CA3AF] hover:text-[#5A6C7D]"
            }`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#2563EB]" />}
          </button>
        ))}
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F8F9FA] border-b border-[#E5E7EB]">
              <th className="px-6 py-4 text-[12px] font-bold text-[#5A6C7D] uppercase tracking-wider">
                <div className="flex items-center gap-2 cursor-pointer">Trip Details <ArrowUpDown size={12}/></div>
              </th>
              <th className="px-6 py-4 text-[12px] font-bold text-[#5A6C7D] uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-[12px] font-bold text-[#5A6C7D] uppercase tracking-wider">Driver / Vehicle</th>
              <th className="px-6 py-4 text-[12px] font-bold text-[#5A6C7D] uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-[12px] font-bold text-[#5A6C7D] uppercase tracking-wider">Fare</th>
              <th className="px-6 py-4 text-[12px] font-bold text-[#5A6C7D] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {bookings.map((trip) => (
              <tr key={trip.id} className="hover:bg-[#F8F9FA] transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-bold text-[#2563EB] mb-0.5">{trip.id}</div>
                  <div className="text-xs text-[#9CA3AF] flex items-center gap-1">
                    <Clock size={12} /> {trip.date} • {trip.type}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-[#1A2332]">{trip.customer}</div>
                  <div className="text-xs text-[#5A6C7D]">+91 98765 43210</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-[#1A2332]">{trip.driver}</div>
                  <div className="text-xs text-[#9CA3AF]">{trip.vehicle}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${getStatusStyle(trip.status)}`}>
                    {trip.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-[#1A2332]">{trip.fare}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button className="p-2 hover:bg-[#DBEAFE] hover:text-[#2563EB] rounded-lg transition-colors text-[#9CA3AF]" title="View Details">
                      <Eye size={18} />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#9CA3AF]" title="Print Invoice">
                      <Printer size={18} />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#9CA3AF]">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div className="px-6 py-4 bg-white border-t border-[#E5E7EB] flex items-center justify-between">
          <p className="text-sm text-[#5A6C7D]">
            Showing <span className="font-semibold text-[#1A2332]">1 to 5</span> of <span className="font-semibold text-[#1A2332]">42</span> trips
          </p>
          <div className="flex items-center gap-2">
            <button className="p-2 border border-[#E5E7EB] rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled>
              <ChevronLeft size={18} />
            </button>
            {[1, 2, 3, '...', 8].map((page, i) => (
              <button 
                key={i} 
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                  page === 1 ? "bg-[#2563EB] text-white" : "hover:bg-gray-100 text-[#5A6C7D]"
                }`}
              >
                {page}
              </button>
            ))}
            <button className="p-2 border border-[#E5E7EB] rounded-lg hover:bg-gray-50">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingManagement;