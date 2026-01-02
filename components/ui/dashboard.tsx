import React from 'react';
import { TrendingUp, Users, Car, DollarSign } from 'lucide-react';

export default function DashboardPreviewSection() {
  return (
    <section className="py-20 px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            See TripEase In Action
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A glimpse into your future dashboard with real-time insights
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <div className="text-white text-sm font-medium">TripEase Dashboard</div>
            <div className="w-20"></div>
          </div>

          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Dashboard Overview</h3>
                <p className="text-gray-600 text-sm">Welcome back, Admin</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  Export Report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-green-600 text-sm font-semibold">+12.5%</span>
                </div>
                <div className="text-gray-600 text-sm mb-1">Total Revenue</div>
                <div className="text-3xl font-bold text-gray-900">$45,231</div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-green-600 text-sm font-semibold">+8.2%</span>
                </div>
                <div className="text-gray-600 text-sm mb-1">Total Trips</div>
                <div className="text-3xl font-bold text-gray-900">1,247</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-green-600 text-sm font-semibold">23 online</span>
                </div>
                <div className="text-gray-600 text-sm mb-1">Active Drivers</div>
                <div className="text-3xl font-bold text-gray-900">127</div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                    <Car className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-green-600 text-sm font-semibold">98% ready</span>
                </div>
                <div className="text-gray-600 text-sm mb-1">Fleet Size</div>
                <div className="text-3xl font-bold text-gray-900">48</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Bookings</h4>
                <div className="space-y-4">
                  {[
                    { name: "John Smith", trip: "#1234", status: "Active", color: "green", time: "2 min ago" },
                    { name: "Emma Wilson", trip: "#1235", status: "Pending", color: "yellow", time: "5 min ago" },
                    { name: "Michael Brown", trip: "#1236", status: "Completed", color: "blue", time: "12 min ago" },
                    { name: "Sarah Davis", trip: "#1237", status: "Active", color: "green", time: "18 min ago" }
                  ].map((booking, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {booking.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{booking.name}</div>
                          <div className="text-xs text-gray-500">{booking.trip} • {booking.time}</div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 bg-${booking.color}-100 text-${booking.color}-700 text-xs font-semibold rounded-full`}>
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Revenue Chart</h4>
                <div className="h-64 flex items-end justify-between gap-2">
                  {[65, 45, 80, 55, 70, 90, 75, 85, 60, 95, 88, 78].map((height, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all hover:from-blue-700 hover:to-blue-500 cursor-pointer"
                        style={{ height: `${height}%` }}
                      ></div>
                      <span className="text-xs text-gray-500">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][idx]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}