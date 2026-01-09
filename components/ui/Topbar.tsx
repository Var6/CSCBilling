'use client';
import { Car, Users, TrendingUp, DollarSign, AlertCircle, Menu, Bell, Search, Settings, LogOut, LayoutDashboard, MapPin, FileText, Calendar } from 'lucide-react';

export default function Topbar({ sidebarOpen, setSidebarOpen, user }: { sidebarOpen: boolean; setSidebarOpen: any; user: any }) {
  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white flex items-center px-6 z-50 border-b">
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
    </div>
  );
}
