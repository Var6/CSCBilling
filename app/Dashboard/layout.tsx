'use client';

import { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import Topbar from '@/components/ui/Topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Top Bar */}
      <Topbar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} />

      {/* Main Content */}
      <main
        className={`pt-20 transition-all duration-300
          ${sidebarOpen ? 'ml-54 px-8' : 'ml-16 px-8'}
        `}
      >
        {children}
      </main>
    </div>
  );
}
