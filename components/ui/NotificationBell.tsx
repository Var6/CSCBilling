'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, AlertCircle, Info, RefreshCw } from 'lucide-react';

/**
 * Alert bell.
 *
 * The bell in the top bar was decorative — an icon with nothing behind it. It
 * now surfaces what actually needs doing, led by document expiries: insurance,
 * pollution and fitness lapse on dates nobody watches, and the first sign is
 * usually a fine at a check post.
 */

type Severity = 'critical' | 'warning' | 'info';

type Notification = {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  detail: string;
  href?: string;
  daysLeft?: number;
};

const STYLE: Record<Severity, { icon: React.ElementType; colour: string; bg: string }> = {
  critical: { icon: AlertCircle, colour: '#DC2626', bg: '#FEE2E2' },
  warning: { icon: AlertTriangle, colour: '#D97706', bg: '#FEF3C7' },
  info: { icon: Info, colour: '#2563EB', bg: '#DBEAFE' },
};

/** Alerts change on the scale of days; polling harder would just burn queries. */
const REFRESH_MS = 5 * 60 * 1000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [counts, setCounts] = useState({ critical: 0, warning: 0, info: 0 });
  const [loading, setLoading] = useState(false);
  const panel = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?days=7', { cache: 'no-store' });
      if (!res.ok) return;
      const text = await res.text();
      if (!text) return;
      const json = JSON.parse(text);
      setItems(json.notifications ?? []);
      setCounts(json.counts ?? { critical: 0, warning: 0, info: 0 });
    } catch {
      /* leave the previous list rather than blanking the bell on a blip */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  // Close when clicking elsewhere.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Only things that need acting on carry a badge; "info" would make it
  // permanently red and train everyone to ignore it.
  const urgent = counts.critical + counts.warning;

  return (
    <div className="relative" ref={panel}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label={urgent ? `${urgent} alerts need attention` : 'Alerts'}
      >
        <Bell className="w-5 h-5" style={{ color: '#5A6C7D' }} />
        {urgent > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{ backgroundColor: counts.critical > 0 ? '#DC2626' : '#D97706' }}
          >
            {urgent > 9 ? '9+' : urgent}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-96 max-h-[28rem] overflow-y-auto rounded-xl bg-white shadow-lg z-50"
          style={{ border: '1px solid #E5E7EB' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white"
            style={{ borderColor: '#E5E7EB' }}>
            <span className="font-semibold text-sm" style={{ color: '#1A2332' }}>
              Needs attention
            </span>
            <button onClick={load} className="p-1 rounded hover:bg-gray-100" aria-label="Refresh">
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">
              {loading ? 'Checking…' : 'Nothing needs attention.'}
            </div>
          ) : (
            <ul>
              {items.map((n) => {
                const s = STYLE[n.severity];
                const Icon = s.icon;
                const row = (
                  <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                    <span className="p-1.5 rounded-lg shrink-0 mt-0.5" style={{ backgroundColor: s.bg }}>
                      <Icon className="w-4 h-4" style={{ color: s.colour }} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: '#1A2332' }}>{n.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#5A6C7D' }}>{n.detail}</p>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} className="border-b last:border-0" style={{ borderColor: '#F1F5F9' }}>
                    {n.href
                      ? <Link href={n.href} onClick={() => setOpen(false)}>{row}</Link>
                      : row}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
