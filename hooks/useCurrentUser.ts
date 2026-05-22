// hooks/useCurrentUser.ts
import { useState, useEffect } from 'react';

export function useCurrentUser() {
  const [user, setUser] = useState<any | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          } else {
            setUser(null);
            localStorage.removeItem('user');
          }
        } else if (res.status === 401) {
          setUser(null);
          localStorage.removeItem('user');
        }
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { user, loading };
}
