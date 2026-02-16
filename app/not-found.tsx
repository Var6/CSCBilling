'use client';
import React, { useEffect, useState } from 'react';
import { Home, ArrowLeft, Search, Map, AlertTriangle, Car, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  // Auto redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/Dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const quickLinks = [
    { name: 'Dashboard', href: '/Dashboard', icon: Home },
    { name: 'Trip Reports', href: '/Dashboard/Trip/Report', icon: Map },
    { name: 'Payments', href: '/Dashboard/Payments', icon: Car },
    { name: 'Vehicles', href: '/Dashboard/Vehicles', icon: Car },
  ];

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/Dashboard/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-4xl w-full">
        {/* Animated 404 Illustration */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            {/* Large 404 Text */}
            <div className="text-9xl font-black mb-4" style={{ 
              background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              404
            </div>
            
            {/* Animated Car Icon */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <Car className="w-16 h-16 animate-bounce" style={{ color: '#2563EB' }} />
            </div>
          </div>
          
          {/* Alert Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full animate-pulse" style={{ backgroundColor: '#FEE2E2' }}>
              <AlertTriangle className="w-12 h-12" style={{ color: '#EF4444' }} />
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4" style={{ color: '#1A2332' }}>
            Oops! Page Not Found
          </h1>
          <p className="text-xl mb-2" style={{ color: '#5A6C7D' }}>
            This route seems to have taken a wrong turn!
          </p>
          <p className="text-lg" style={{ color: '#9CA3AF' }}>
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="Search for trips, payments, or drivers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-12 pr-4 py-4 rounded-lg text-lg"
                style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-8 py-4 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
            >
              Search
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8" style={{ border: '1px solid #E5E7EB' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#1A2332' }}>
            Quick Links
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-center gap-3 p-6 rounded-lg border hover:shadow-md transition-all group"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <div className="p-3 rounded-lg group-hover:scale-110 transition-transform" style={{ backgroundColor: '#EFF6FF' }}>
                    <Icon className="w-6 h-6" style={{ color: '#2563EB' }} />
                  </div>
                  <span className="font-medium text-center" style={{ color: '#1A2332' }}>
                    {link.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-8 py-4 rounded-lg font-medium border hover:bg-gray-50 transition-all"
            style={{ borderColor: '#E5E7EB', color: '#5A6C7D' }}
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
          
          <Link
            href="/Dashboard"
            className="flex items-center gap-2 px-8 py-4 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </Link>
          
          <button
            onClick={() => router.refresh()}
            className="flex items-center gap-2 px-8 py-4 rounded-lg font-medium border hover:bg-blue-50 transition-all"
            style={{ borderColor: '#2563EB', color: '#2563EB' }}
          >
            <RefreshCw className="w-5 h-5" />
            Refresh Page
          </button>
        </div>

        {/* Auto Redirect Notice */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-lg" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <div className="relative">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2563EB' }}>
                <span className="text-2xl font-bold text-white">{countdown}</span>
              </div>
              <svg className="absolute top-0 left-0 w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="#BFDBFE"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${(countdown / 10) * 125.6} 125.6`}
                  className="transition-all duration-1000"
                />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium" style={{ color: '#1E40AF' }}>
                Auto-redirecting to Dashboard. 
              </p>
              <p className="text-sm" style={{ color: '#60A5FA' }}>
                Redirecting in {countdown} seconds...
              </p>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-12 text-center">
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Need help? Contact support at{' '}
            <a href="mailto:support@cscbilling.com" className="font-medium hover:underline" style={{ color: '#2563EB' }}>
              support@cscbilling.com
            </a>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
        
        .animate-bounce {
          animation: bounce 2s infinite;
        }
      `}</style>
    </div>
  );
}