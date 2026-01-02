'use client';
import React, { useState } from 'react';
import { 
  Car, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'error' | 'success'

  const handleLogin = (e:any) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('loading');

    // Simulating API Call
    setTimeout(() => {
      // For demonstration: change to 'success' or 'error'
      setStatus('error');
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center py-12 px-6 lg:px-8 font-['Inter'] mt-10">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Branding */}
        <div className="flex justify-center items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#2563EB] to-[#1E40AF] rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Car className="text-white w-7 h-7" />
          </div>
          <span className="text-[28px] font-bold text-[#1A2332] tracking-tight">TripEase</span>
        </div>
        
        <h2 className="text-center text-[32px] font-bold text-[#1A2332] tracking-tight">
          Admin Portal
        </h2>
        <p className="mt-2 text-center text-[#5A6C7D]">
          Enter your credentials to manage your fleet
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[440px]">
        <div className="bg-white py-10 px-10 shadow-xl shadow-blue-900/5 rounded-2xl border border-[#E5E7EB]">
          
          {/* Feedback Messages */}
          {status === 'error' && (
            <div className="mb-6 p-4 bg-[#FEF2F2] border border-[#EF4444]/20 rounded-lg flex items-center gap-3 text-[#EF4444] text-sm animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={18} />
              <span>Invalid email or password. Please try again.</span>
            </div>
          )}

          {status === 'success' && (
            <div className="mb-6 p-4 bg-[#F0FDF4] border border-[#10B981]/20 rounded-lg flex items-center gap-3 text-[#10B981] text-sm animate-in fade-in slide-in-from-top-1">
              <CheckCircle2 size={18} />
              <span>Login successful! Redirecting to dashboard...</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-[#1A2332] mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-[#E5E7EB] rounded-lg bg-[#F8F9FA] text-[#1A2332] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                  placeholder="admin@tripease.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-[#1A2332]">
                  Password
                </label>
                <a href="#" className="text-sm font-medium text-[#2563EB] hover:text-[#1E40AF]">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9CA3AF]">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-10 pr-12 py-3 border border-[#E5E7EB] rounded-lg bg-[#F8F9FA] text-[#1A2332] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9CA3AF] hover:text-[#5A6C7D]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 text-[#2563EB] focus:ring-[#2563EB] border-[#E5E7EB] rounded cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-[#5A6C7D] cursor-pointer">
                Keep me logged in for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-[#2563EB] to-[#1E40AF] hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563EB] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2" size={18} />
                  Verifying...
                </>
              ) : (
                "Sign In to Dashboard"
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="mt-8 text-center text-sm text-[#9CA3AF]">
          Secure encrypted login. Protected by TripEase Guard™.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;