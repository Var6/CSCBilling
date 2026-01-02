import React from 'react';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  MapPin, 
  CreditCard, 
  Bell, 
  Search, 
  TrendingUp, 
  Clock, 
  MoreVertical,
  ChevronDown,
  Filter,
  Download
} from 'lucide-react';

const AdminDashboard = () => {
  return (
    <div className="flex min-h-screen bg-[#F8F9FA] font-['Inter']">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#1A2332] text-white flex flex-col fixed h-full">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-[#2563EB] rounded flex items-center justify-center">
            <Car size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">TripEase</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {[
            { icon: <LayoutDashboard size={20} />, label: "Dashboard", active: true },
            { icon: <MapPin size={20} />, label: "Live Tracking", active: false },
            { icon: <Clock size={20} />, label: "Bookings", active: false },
            { icon: <Users size={20} />, label: "Drivers", active: false },
            { icon: <Car size={20} />, label: "Fleet Management", active: false },
            { icon: <CreditCard size={20} />, label: "Accounts & Billing", active: false },
            { icon: <TrendingUp size={20} />, label: "Reports", active: false },
          ].map((item, idx) => (
            <a
              key={idx}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                item.active ? "bg-[#2563EB] text-white" : "text-[#9CA3AF] hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="bg-white/5 p-4 rounded-xl">
            <p className="text-xs text-[#9CA3AF] mb-2">Logged in as</p>
            <p className="text-sm font-semibold">Super Admin</p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ml-64 flex-1">
        
        {/* TOP NAVBAR */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
            <input 
              type="text" 
              placeholder="Search trips, drivers, or invoices..." 
              className="w-full pl-10 pr-4 py-2 bg-[#F8F9FA] border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/10"
            />
          </div>
          <div className="flex items-center gap-6">
            <button className="relative text-[#5A6C7D] hover:text-[#2563EB]">
              <Bell size={22} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">3</span>
            </button>
            <div className="h-8 w-[1px] bg-[#E5E7EB]"></div>
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-9 h-9 bg-[#DBEAFE] rounded-full flex items-center justify-center text-[#2563EB] font-bold">JD</div>
              <ChevronDown size={16} className="text-[#5A6C7D]" />
            </div>
          </div>
        </header>

        {/* DASHBOARD BODY */}
        <div className="p-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[#1A2332]">Operations Overview</h1>
              <p className="text-[#5A6C7D]">Real-time statistics for Friday, Jan 2, 2026</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white text-sm font-medium hover:bg-[#F8F9FA]">
                <Filter size={16} /> Filters
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#1E40AF]">
                <Download size={16} /> Export Report
              </button>
            </div>
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
            {[
              { label: "Total Trips Today", value: "142", trend: "+12%", color: "blue" },
              { label: "Active Drivers", value: "48", trend: "Live", color: "green" },
              { label: "Vehicles Ready", value: "12", trend: "Fleet", color: "blue" },
              { label: "Revenue Today", value: "$4,250", trend: "+8.4%", color: "green" },
              { label: "Pending Payments", value: "09", trend: "High", color: "orange" },
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
                <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">{kpi.label}</p>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-2xl font-bold text-[#1A2332]">{kpi.value}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    kpi.color === 'green' ? 'bg-[#F0FDF4] text-[#10B981]' : 
                    kpi.color === 'orange' ? 'bg-[#FFFBEB] text-[#F59E0B]' : 'bg-[#DBEAFE] text-[#2563EB]'
                  }`}>
                    {kpi.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* TABLE SECTION */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <div className="p-6 border-b border-[#E5E7EB] flex justify-between items-center">
                <h3 className="font-bold text-[#1A2332]">Recent Active Trips</h3>
                <button className="text-[#2563EB] text-sm font-semibold hover:underline">View All</button>
              </div>
              <table className="w-full text-left">
                <thead className="bg-[#F8F9FA] text-[12px] font-bold text-[#5A6C7D] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Trip ID</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Driver</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {[
                    { id: "#TR-9042", user: "John Doe", driver: "Mike Ross", status: "In Progress", statusColor: "blue", amount: "$45.00" },
                    { id: "#TR-9041", user: "Sarah Connor", driver: "Alan Wake", status: "Completed", statusColor: "green", amount: "$120.50" },
                    { id: "#TR-9040", user: "James Bond", driver: "Ethan Hunt", status: "Delayed", statusColor: "orange", amount: "$89.00" },
                    { id: "#TR-9039", user: "Tony Stark", driver: "Steve Rogers", status: "Completed", statusColor: "green", amount: "$210.00" },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F8F9FA] transition-colors group text-sm">
                      <td className="px-6 py-4 font-mono font-medium text-[#2563EB]">{row.id}</td>
                      <td className="px-6 py-4 font-semibold text-[#1A2332]">{row.user}</td>
                      <td className="px-6 py-4 text-[#5A6C7D]">{row.driver}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          row.statusColor === 'blue' ? 'bg-blue-50 text-blue-600' : 
                          row.statusColor === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            row.statusColor === 'blue' ? 'bg-blue-600' : 
                            row.statusColor === 'green' ? 'bg-emerald-600' : 'bg-amber-600'
                          }`} />
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-[#1A2332]">{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CHART PLACEHOLDER CARD */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6">
              <h3 className="font-bold text-[#1A2332] mb-6">Revenue Growth</h3>
              <div className="h-[250px] w-full bg-[#F8F9FA] rounded-lg border border-dashed border-[#E5E7EB] flex flex-col items-center justify-center text-[#9CA3AF]">
                <TrendingUp size={48} className="mb-2 opacity-20" />
                <p className="text-sm font-medium">Chart visualization here</p>
              </div>
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#5A6C7D]">Total Bookings</span>
                  <span className="font-bold">1,240</span>
                </div>
                <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2563EB] h-full w-[70%]" />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#5A6C7D]">Efficiency</span>
                  <span className="font-bold text-[#10B981]">94%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;