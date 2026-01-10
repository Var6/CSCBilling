'use client';
import React, { useState } from 'react';
import { Car, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

const handleSubmit = async () => {
  setLoading(true);
  setMessage(null);

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json(); // ✅ read ONCE

    if (!response.ok) {
      setMessage({
        type: 'error',
        text: data.error || 'Invalid email or password',
      });
      return;
    }

    // Store user locally; token is set as an HttpOnly cookie by the server
    localStorage.setItem('user', JSON.stringify(data.user));

    setMessage({
      type: 'success',
      text: 'Login successful! Redirecting...',
    });

    // Use router.push so client-side navigation happens smoothly
    setTimeout(() => {
      router.push('/Dashboard');
    }, 400);

  } catch (err) {
    console.error(err);
    setMessage({
      type: 'error',
      text: 'Server error. Try again.',
    });
  } finally {
    setLoading(false);
  }
};

  const handleKeyPress = (e:any) => {
    if (e.key === 'Enter' && email && password) {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex mt-19" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
              <Car className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#1A2332' }}>TripEase</h1>
            <p className="text-lg" style={{ color: '#5A6C7D' }}>Admin Portal</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-8" style={{ border: '1px solid #E5E7EB' }}>
            <h2 className="text-2xl font-semibold mb-6" style={{ color: '#1A2332' }}>Welcome back</h2>

            {message && (
              <div className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${message.type === 'error' ? 'bg-red-50' : 'bg-green-50'}`}>
                {message.type === 'error' ? (
                  <AlertCircle className="w-5 h-5" style={{ color: '#EF4444' }} />
                ) : (
                  <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                )}
                <p className="text-sm font-medium" style={{ color: message.type === 'error' ? '#EF4444' : '#10B981' }}>
                  {message.text}
                </p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1A2332' }}>
                  Email or Username
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="admin@tripease.com"
                  className="w-full px-4 py-3 rounded-lg text-base transition-all"
                  style={{
                    border: '1px solid #E5E7EB',
                    color: '#1A2332',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1A2332' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg text-base transition-all"
                  style={{
                    border: '1px solid #E5E7EB',
                    color: '#1A2332',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !email || !password}
                className="w-full py-3 rounded-lg text-white font-medium text-base transition-all flex items-center justify-center gap-2"
                style={{
                  background: loading || !email || !password ? '#9CA3AF' : 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)',
                  cursor: loading || !email || !password ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>

              <div className="text-center pt-2">
                <a
                  href="#"
                  className="text-sm font-medium hover:underline"
                  style={{ color: '#2563EB' }}
                >
                  Forgot password?
                </a>
              </div>
            </div>
          </div>

          <p className="text-center mt-6 text-sm" style={{ color: '#9CA3AF' }}>
            © 2024 TripEase. All rights reserved.
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center p-8" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
        <div className="text-center text-white max-w-md">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <Car className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-3xl font-bold mb-4">Manage Your Fleet</h3>
          <p className="text-lg text-blue-100">
            Streamline operations, track trips in real-time, and grow your cab business with TripEase.
          </p>
        </div>
      </div>
    </div>
  );
}