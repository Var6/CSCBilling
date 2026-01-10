// hooks/useCurrentUser.ts
import { useState, useEffect } from 'react';

export function useCurrentUser() {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    // 1) Try localStorage first for instant UI
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));

    // 2) Also verify server-side cookie session and refresh user info
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  return user;
}
