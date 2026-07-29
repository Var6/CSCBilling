'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import Topbar from '@/components/ui/Topbar';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Dashboard shell.
 *
 * The session check is allowed to fail. Previously this rendered the text
 * "Checking session…" for as long as `loading` was true, which — combined with
 * middleware that waved stale cookies through — left the console frozen on that
 * message with no way out. Now the check has a deadline, and a session that
 * cannot be confirmed offers a way to start a fresh one rather than trapping
 * the user.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, loading, expired, timedOut, clearSession } = useCurrentUser();
  const router = useRouter();

  // A confirmed-signed-out user goes straight to the login page.
  useEffect(() => {
    if (!loading && expired) router.replace('/Auth/login');
  }, [loading, expired, router]);

  async function startOver() {
    await clearSession();
    router.replace('/Auth/login');
  }

  if (loading) return <SessionLoader />;

  if (!user) {
    // Reached when the check timed out or errored without a clear 401. Rather
    // than spin forever, say so and offer a fresh session.
    return (
      <SessionLoader
        stalled
        message={
          timedOut
            ? 'The session check is taking longer than expected.'
            : 'We could not confirm your session.'
        }
        onStartOver={startOver}
      />
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

function SessionLoader({
  stalled, message, onStartOver,
}: {
  stalled?: boolean; message?: string; onStartOver?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#F8F9FA]">
      <div
        className="w-10 h-10 rounded-full animate-spin"
        style={{
          border: '3px solid #E5E7EB',
          borderTopColor: '#2563EB',
        }}
        role="status"
        aria-label="Loading"
      />
      <p className="text-sm text-gray-500">{message ?? 'Signing you in…'}</p>

      {stalled && onStartOver && (
        <button
          onClick={onStartOver}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}
        >
          Start a new session
        </button>
      )}
    </div>
  );
}
