'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  Users,
  Car,
  FileText,
  Calendar,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
}

const menuItems = [
  { label: 'Dashboard', href: '/Dashboard', icon: LayoutDashboard },
  { label: 'Trips', href: '/Dashboard/Trip/Booking', icon: MapPin },
  { label: 'Drivers', href: '/Dashboard/Driver', icon: Users },
  { label: 'Vehicles', href: '/Dashboard/Car', icon: Car },
  { label: 'Reports', href: '/Dashboard/Trip/Report', icon: FileText },
  { label: 'Bookings', href: '/Dashboard/Booking', icon: Calendar },
];

export default function Sidebar({ sidebarOpen }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white transition-all duration-300 z-40
        ${sidebarOpen ? 'w-64' : 'w-16'}
      `}
      style={{ borderRight: '1px solid #b1b7bd' }}
    >
      <div className="pt-20 px-2 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center py-3 rounded-lg transition-all duration-300
                  ${sidebarOpen ? 'px-3 gap-3 justify-start' : 'px-2 justify-center'}
                  ${isActive ? 'text-white' : 'hover:bg-gray-50'}
                `}
                style={
                  isActive
                    ? { background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }
                    : { color: '#5A6C7D' }
                }
              >
                <Icon className="w-5 h-5 shrink-0" />

                <span
                  className={`font-medium whitespace-nowrap transition-all duration-300
                    ${sidebarOpen
                      ? 'opacity-100 ml-2'
                      : 'opacity-0 w-0 overflow-hidden'}
                  `}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}

        {/* Logout */}
        <div className="pt-4 mt-4 border-t border-gray-300">
          <button
            className={`w-full flex items-center py-3 rounded-lg transition-all duration-300 text-red-500
              ${sidebarOpen ? 'px-3 gap-3 justify-start' : 'px-2 justify-center'}
              hover:bg-red-50
            `}
          >
            <LogOut className="w-5 h-5 shrink-0" />

            <span
              className={`font-medium whitespace-nowrap transition-all duration-300
                ${sidebarOpen
                  ? 'opacity-100 ml-2'
                  : 'opacity-0 w-0 overflow-hidden'}
              `}
            >
              Logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
