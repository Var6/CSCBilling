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
  DollarSign,
  UserCheck,
  BarChart2,
} from 'lucide-react';

interface SidebarProps {
  sidebarOpen: boolean;
  user?: { admin_full_name: string; role: string; admin_email: string };
}

const menuItems = [
  { label: 'Dashboard', href: '/Dashboard', icon: LayoutDashboard },
  { label: 'Trips', href: '/Dashboard/Trip/Booking', icon: Calendar },
  { label: 'Drivers', href: '/Dashboard/Driver', icon: Users },
  { label: 'Vehicles', href: '/Dashboard/Car', icon: Car },
  { label: 'Customers', href: '/Dashboard/Customers', icon: UserCheck },
  { label: 'Finance', href: '/Dashboard/Finance', icon: DollarSign },
  { label: 'Payments', href: '/Dashboard/Payments', icon: MapPin },
  { label: 'Reports', href: '/Dashboard/Trip/Report', icon: BarChart2 },
];

export default function Sidebar({ sidebarOpen }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/Dashboard') return pathname === '/Dashboard';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white transition-all duration-300 z-40
        ${sidebarOpen ? 'w-52' : 'w-16'}
      `}
      style={{ borderRight: '1px solid #b1b7bd' }}
    >
      <div className="pt-20 px-2 space-y-0.5">
        {menuItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center py-2.5 rounded-lg transition-all duration-200
                  ${sidebarOpen ? 'px-3 gap-3 justify-start' : 'px-2 justify-center'}
                  ${active ? 'text-white' : 'hover:bg-gray-50'}
                `}
                style={
                  active
                    ? { background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }
                    : { color: '#5A6C7D' }
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span
                  className={`font-medium text-sm whitespace-nowrap transition-all duration-300
                    ${sidebarOpen ? 'opacity-100 ml-1' : 'opacity-0 w-0 overflow-hidden'}
                  `}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}

        {/* Logout */}
        <div className="pt-4 mt-4 border-t border-gray-200">
          <button
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
              } catch (e) {
                console.error('Logout failed', e);
              }
              localStorage.removeItem('user');
              window.location.href = '/Auth/login';
            }}
            className={`w-full flex items-center py-2.5 rounded-lg transition-all duration-200 text-red-500
              ${sidebarOpen ? 'px-3 gap-3 justify-start' : 'px-2 justify-center'}
              hover:bg-red-50
            `}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span
              className={`font-medium text-sm whitespace-nowrap transition-all duration-300
                ${sidebarOpen ? 'opacity-100 ml-1' : 'opacity-0 w-0 overflow-hidden'}
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
