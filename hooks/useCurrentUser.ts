// hooks/useCurrentUser.ts
import { useState, useEffect } from 'react';

export function useCurrentUser() {
  const [user, setUser] = useState<{ admin_full_name: string; role: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  return user;
}
