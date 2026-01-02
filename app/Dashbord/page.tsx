'use client';
import React, { useState } from 'react';
import { Car, Users, TrendingUp, DollarSign, AlertCircle, Menu, Bell, Search, Settings, LogOut, LayoutDashboard, MapPin, FileText, Calendar } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const revenueData = [
    { day: 'Mon', revenue: 4200 },
    { day: 'Tue', revenue: 3800 },
    { day: 'Wed', revenue: 5100 },
    { day: 'Thu', revenue: 4600 },
    { day: 'Fri', revenue: 6200 },
    { day: 'Sat', revenue: 7400 },
    { day: 'Sun', revenue: 6800 }
  ];

  const tripsData = [
    { day: 'Mon', trips: 42 },
    { day: 'Tue', trips: 38 },
    { day: 'Wed', trips: 51 },
    { day: 'Thu', trips: 46 },
    { day: 'Fri', trips: 62 },
    { day: 'Sat', trips: 74 },
    { day: 'Sun', trips: 68 }
  ];

  const recentTrips = [
    { id: 'TRP-2401', customer: 'John Smith', driver: 'Mike Johnson', from: 'Airport', to: 'Downtown', status: 'completed', amount: 45 },
    { id: 'TRP-2402', customer: 'Sarah Williams', driver: 'David Brown', from: 'Hotel Plaza', to: 'Mall', status: 'ongoing', amount: 28 },
    { id: 'TRP-2403', customer: 'Robert Davis', driver: 'Chris Wilson', from: 'Station', to: 'Office Park', status: 'completed', amount: 35 },
    { id: 'TRP-2404', customer: 'Emily Jones', driver: 'James Taylor', from: 'Residence', to: 'Airport', status: 'pending', amount: 52 },
    { id: 'TRP-2405', customer: 'Michael Brown', driver: 'Tom Anderson', from: 'Downtown', to: 'Stadium', status: 'completed', amount: 38 }
  ];

  const kpis = [
    { label: 'Total Trips Today', value: '68', change: '+12%', icon: MapPin, color: '#2563EB', bgColor: '#DBEAFE' },
    { label: 'Active Drivers', value: '42', change: '+5%', icon: Users, color: '#10B981', bgColor: '#D1FAE5' },
    { label: 'Vehicles Available', value: '38', change: '-3%', icon: Car, color: '#F59E0B', bgColor: '#FEF3C7' },
    { label: "Today's Revenue", value: '$6,820', change: '+18%', icon: DollarSign, color: '#8B5CF6', bgColor: '#EDE9FE' }
  ];

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
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Search trips, drivers, customers..."
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
              style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
            />
          </div>
        </div>
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

      <div className={`fixed left-0 top-16 bottom-0 bg-white transition-all shadow-sm ${sidebarOpen ? 'w-64' : 'w-0'}`} style={{ borderRight: '1px solid #E5E7EB' }}>
        <div className="p-4 space-y-1 overflow-hidden">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          <Link href={'/Trip/Booking'}>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors" style={{ color: '#5A6C7D' }}>
            <MapPin className="w-5 h-5" />
            <span className="font-medium">Trips</span>
          </button>
          </Link>
          <Link href={'/Driver'}>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors" style={{ color: '#5A6C7D' }}>
            <Users className="w-5 h-5" />
            <span className="font-medium">Drivers</span>
          </button>
          </Link>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors" style={{ color: '#5A6C7D' }}>
            <Car className="w-5 h-5" />
            <span className="font-medium">Vehicles</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors" style={{ color: '#5A6C7D' }}>
            <FileText className="w-5 h-5" />
            <span className="font-medium">Reports</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors" style={{ color: '#5A6C7D' }}>
            <Calendar className="w-5 h-5" />
            <span className="font-medium">Bookings</span>
          </button>
          <div className="pt-4 mt-4" style={{ borderTop: '1px solid #E5E7EB' }}>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors" style={{ color: '#EF4444' }}>
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`transition-all pt-20 pb-8 ${sidebarOpen ? 'ml-64 pl-8 pr-8' : 'px-8'}`}>
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Dashboard</h1>
          <p style={{ color: '#5A6C7D' }}>Welcome back, Admin. Here's what's happening today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="bg-white rounded-xl p-6 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: kpi.bgColor }}>
                  <kpi.icon className="w-6 h-6" style={{ color: kpi.color }} />
                </div>
                <span className={`text-sm font-medium px-2 py-1 rounded ${kpi.change.startsWith('+') ? 'bg-green-50' : 'bg-red-50'}`} style={{ color: kpi.change.startsWith('+') ? '#10B981' : '#EF4444' }}>
                  {kpi.change}
                </span>
              </div>
              <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>{kpi.label}</p>
              <p className="text-3xl font-bold" style={{ color: '#1A2332' }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-6 bg-white rounded-xl p-6 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5" style={{ color: '#F59E0B' }} />
            <span className="font-semibold" style={{ color: '#1A2332' }}>Pending Payments</span>
          </div>
          <p style={{ color: '#5A6C7D' }}>You have <span className="font-bold" style={{ color: '#F59E0B' }}>12 pending payments</span> totaling <span className="font-bold" style={{ color: '#F59E0B' }}>$1,840</span></p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#1A2332' }}>Daily Revenue</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="day" tick={{ fill: '#5A6C7D', fontSize: 12 }} />
                <YAxis tick={{ fill: '#5A6C7D', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={3} dot={{ fill: '#2563EB', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm" style={{ border: '1px solid #E5E7EB' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#1A2332' }}>Daily Trips</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tripsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="day" tick={{ fill: '#5A6C7D', fontSize: 12 }} />
                <YAxis tick={{ fill: '#5A6C7D', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }} />
                <Bar dataKey="trips" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
          <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
            <h3 className="text-lg font-semibold" style={{ color: '#1A2332' }}>Recent Trips</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#F8F9FA' }}>
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Trip ID</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Customer</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Driver</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Route</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Status</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((trip, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50" style={{ borderColor: '#E5E7EB' }}>
                    <td className="px-6 py-4 font-medium" style={{ color: '#2563EB' }}>{trip.id}</td>
                    <td className="px-6 py-4" style={{ color: '#1A2332' }}>{trip.customer}</td>
                    <td className="px-6 py-4" style={{ color: '#5A6C7D' }}>{trip.driver}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: '#5A6C7D' }}>{trip.from} → {trip.to}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        trip.status === 'completed' ? 'bg-green-50 text-green-700' :
                        trip.status === 'ongoing' ? 'bg-blue-50 text-blue-700' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>
                        {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold" style={{ color: '#1A2332' }}>${trip.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}