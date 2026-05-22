'use client';
import React from 'react';
import { Car, Users, DollarSign, AlertCircle,MapPin} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

export default function Dashboard() {

  const revenueData = [
    { day: 'Mon', revenue: 42000 },
    { day: 'Tue', revenue: 38000 },
    { day: 'Wed', revenue: 51000 },
    { day: 'Thu', revenue: 46000 },
    { day: 'Fri', revenue: 62000 },
    { day: 'Sat', revenue: 74000 },
    { day: 'Sun', revenue: 68000 }
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
    { id: 'TRP-2401', customer: 'Rahul Sharma', driver: 'Mahesh Kumar', from: 'IGI Airport T3', to: 'Connaught Place', status: 'completed', amount: 1450 },
    { id: 'TRP-2402', customer: 'Priya Verma', driver: 'Suresh Singh', from: 'Hotel Taj', to: 'Select Citywalk Mall', status: 'ongoing', amount: 680 },
    { id: 'TRP-2403', customer: 'Amit Patel', driver: 'Ravi Yadav', from: 'New Delhi Station', to: 'Cyber Hub Gurgaon', status: 'completed', amount: 1250 },
    { id: 'TRP-2404', customer: 'Sneha Iyer', driver: 'Vikram Joshi', from: 'Vasant Kunj', to: 'IGI Airport T1', status: 'pending', amount: 1820 },
    { id: 'TRP-2405', customer: 'Karan Mehta', driver: 'Deepak Reddy', from: 'Saket', to: 'Noida Sector 18', status: 'completed', amount: 980 }
  ];

  const kpis = [
    { label: 'Total Trips Today', value: '68', change: '+12%', icon: MapPin, color: '#2563EB', bgColor: '#DBEAFE' },
    { label: 'Active Drivers', value: '42', change: '+5%', icon: Users, color: '#10B981', bgColor: '#D1FAE5' },
    { label: 'Vehicles Available', value: '38', change: '-3%', icon: Car, color: '#F59E0B', bgColor: '#FEF3C7' },
    { label: "Today's Revenue", value: '₹68,200', change: '+18%', icon: DollarSign, color: '#8B5CF6', bgColor: '#EDE9FE' }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
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
          <p style={{ color: '#5A6C7D' }}>You have <span className="font-bold" style={{ color: '#F59E0B' }}>12 pending payments</span> totaling <span className="font-bold" style={{ color: '#F59E0B' }}>₹18,400</span></p>
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
                    <td className="px-6 py-4 font-semibold" style={{ color: '#1A2332' }}>₹{trip.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}