'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import Topbar from '@/components/ui/Topbar';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Ensure this matches what Sidebar expects
interface User {
  admin_full_name: string;
  role: string;
  admin_email: string; // mandatory
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, loading } = useCurrentUser() as { user: User | null; loading: boolean };
  const router = useRouter();

  // Redirect to login only after the session check completes
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/Auth/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen text-lg text-gray-500">
        Checking session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} user={user} />
      <Sidebar sidebarOpen={sidebarOpen} user={user} />

      <main
        className={`pt-20 transition-all duration-300 ${
          sidebarOpen ? 'ml-54 px-8' : 'ml-16 px-8'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
