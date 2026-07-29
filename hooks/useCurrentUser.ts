// hooks/useCurrentUser.ts
'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * The signed-in console user.
 *
 * Shapes the payload into the snake_case fields the Sidebar and Topbar expect.
 * /api/auth/me returns camelCase, and the mismatch meant the header rendered a
 * blank name for every user.
 *
 * `expired` distinguishes "we know you are signed out" from "we could not tell"
 * — the dashboard uses it to send someone to the login page instead of leaving
 * them on a spinner.
 */

export interface CurrentUser {
  id: string;
  role: string;
  admin_full_name: string;
  admin_email: string;
  company_name: string;
}

/** The session check must not hang the whole console if the network stalls. */
const SESSION_TIMEOUT_MS = 5000;

function normalise(raw: Record<string, unknown>): CurrentUser {
  return {
    id: String(raw.id ?? ''),
    role: String(raw.role ?? ''),
    admin_full_name: String(raw.adminFullName ?? raw.admin_full_name ?? ''),
    admin_email: String(raw.adminEmail ?? raw.admin_email ?? ''),
    company_name: String(raw.companyName ?? raw.company_name ?? ''),
  };
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    try {
      return normalise(JSON.parse(stored));
    } catch {
      // A truncated cached user is one source of "JSON.parse: unexpected end of
      // data" on load. Drop it rather than let it break every render.
      localStorage.removeItem('user');
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  /** Forgets the session on this device. Used on 401 and by "start over". */
  const clearSession = useCallback(async () => {
    localStorage.removeItem('user');
    setUser(null);
    try {
      // Clears the httpOnly cookie, which the client cannot touch itself.
      // Without this the middleware keeps seeing a cookie and bounces the
      // login page back to the dashboard.
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Offline or the route is unreachable — local state is already gone, and
      // the middleware clears the cookie on the next navigation anyway.
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setTimedOut(true);
      controller.abort();
    }, SESSION_TIMEOUT_MS);

    (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (res.status === 401) {
          setExpired(true);
          await clearSession();
          return;
        }

        if (!res.ok) return; // server-side problem; keep any cached user

        // Guard the parse: a proxy or a crashed route can return an empty body,
        // and res.json() on that throws "unexpected end of data".
        const text = await res.text();
        if (!text) return;

        const data = JSON.parse(text) as { user?: Record<string, unknown> };
        if (data?.user) {
          setUser(normalise(data.user));
          localStorage.setItem('user', JSON.stringify(data.user));
        } else {
          setExpired(true);
          await clearSession();
        }
      } catch {
        // Aborted, offline, or unparseable. Leave `user` as-is; the timeout
        // path decides what the UI does about it.
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    })();

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [clearSession]);

  return { user, loading, expired, timedOut, clearSession };
}
