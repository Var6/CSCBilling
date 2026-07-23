import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Vehicle from '@/models/Vehicle';
import Driver from '@/models/Driver';
import Repair from '@/models/Repair';
import DailySettlement from '@/models/DailySettlement';
import { requireSession } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

/**
 * What needs attention today.
 *
 * The expiry alerts are the point of this: insurance, pollution and fitness all
 * lapse on a date nobody watches, and a vehicle stopped at a check post with
 * expired papers costs a fine and a day off the road. Warning starts seven days
 * out, which is enough time to actually renew.
 *
 * A document with no recorded date is reported separately from an expired one.
 * They need opposite actions — find the date versus renew the paper — and
 * conflating them was already the cause of the whole fleet reading as expired.
 *
 * GET /api/notifications?days=7
 */

export type Severity = 'critical' | 'warning' | 'info';

type Notification = {
  id: string;
  severity: Severity;
  category: 'document' | 'service' | 'money' | 'data';
  title: string;
  detail: string;
  href?: string;
  /** Negative when already overdue. */
  daysLeft?: number;
};

const DAY = 24 * 60 * 60 * 1000;

const daysUntil = (d?: Date | string | null): number | null => {
  if (!d) return null;
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return null;
  // Compare whole days so a document expiring later today reads as 0, not -1.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(t); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAY);
};

const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export async function GET(req: NextRequest) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    await connectDB();
    const params = new URL(req.url).searchParams;
    const window = Math.min(Math.max(Number(params.get('days')) || 7, 1), 90);

    const [vehicles, drivers, dueRepairs, discrepancies] = await Promise.all([
      Vehicle.find().select(
        'name plate shortCode insuranceExpiry pollutionExpiry fitnessExpiry status',
      ).lean<Array<Record<string, unknown>>>(),
      Driver.find({ active: { $ne: false } }).select('name currentBalance license phone').lean<
        Array<Record<string, unknown>>
      >(),
      Repair.find({
        companyId: auth.companyId,
        status: { $in: ['scheduled', 'in-progress'] },
      }).select('vehicleCode vehiclePlate category nextDueDate description').lean<
        Array<Record<string, unknown>>
      >(),
      DailySettlement.countDocuments({ companyId: auth.companyId, discrepancy: true }),
    ]);

    const out: Notification[] = [];

    /* ---------------- vehicle documents ---------------- */

    const DOCS = [
      ['insuranceExpiry', 'Insurance'],
      ['pollutionExpiry', 'Pollution certificate'],
      ['fitnessExpiry', 'Fitness certificate'],
    ] as const;

    for (const v of vehicles) {
      const label = (v.plate as string)?.startsWith('PENDING')
        ? (v.shortCode as string) || (v.name as string)
        : (v.plate as string);

      for (const [field, docName] of DOCS) {
        const left = daysUntil(v[field] as Date | null);

        if (left === null) {
          out.push({
            id: `${v._id}-${field}-missing`,
            severity: 'info',
            category: 'document',
            title: `${label}: ${docName} date not recorded`,
            detail: 'Add the expiry date so renewals can be tracked.',
            href: `/Dashboard/Car/${v._id}`,
          });
          continue;
        }

        if (left < 0) {
          out.push({
            id: `${v._id}-${field}-expired`,
            severity: 'critical',
            category: 'document',
            title: `${label}: ${docName} expired`,
            detail: `Lapsed ${Math.abs(left)} day${Math.abs(left) === 1 ? '' : 's'} ago. ` +
              'Driving on it risks a fine and the vehicle being held.',
            href: `/Dashboard/Car/${v._id}`,
            daysLeft: left,
          });
        } else if (left <= window) {
          out.push({
            id: `${v._id}-${field}-soon`,
            severity: 'warning',
            category: 'document',
            title: `${label}: ${docName} expires in ${left} day${left === 1 ? '' : 's'}`,
            detail: left === 0 ? 'Expires today — renew before the next duty.' : 'Renew it this week.',
            href: `/Dashboard/Car/${v._id}`,
            daysLeft: left,
          });
        }
      }
    }

    /* ---------------- servicing ---------------- */

    for (const r of dueRepairs) {
      const left = daysUntil(r.nextDueDate as Date | null);
      if (left === null || left > window) continue;
      const label = (r.vehiclePlate as string)?.startsWith('PENDING')
        ? (r.vehicleCode as string)
        : (r.vehiclePlate as string) || (r.vehicleCode as string);
      out.push({
        id: `${r._id}-due`,
        severity: left < 0 ? 'critical' : 'warning',
        category: 'service',
        title: left < 0
          ? `${label}: ${r.category} overdue by ${Math.abs(left)} day${Math.abs(left) === 1 ? '' : 's'}`
          : `${label}: ${r.category} due in ${left} day${left === 1 ? '' : 's'}`,
        detail: (r.description as string) || 'Scheduled workshop visit.',
        href: '/Dashboard/Repairs',
        daysLeft: left,
      });
    }

    /* ---------------- money and data ---------------- */

    for (const d of drivers) {
      const balance = Number(d.currentBalance) || 0;
      // Uncollected float is money out of the business and a loss if they leave.
      if (balance > 5000) {
        out.push({
          id: `${d._id}-float`,
          severity: 'warning',
          category: 'money',
          title: `${d.name} is holding ${rupees(balance)}`,
          detail: 'Collect it or record a settlement.',
          href: '/Dashboard/DailyBook',
        });
      }
      if (!d.license || !d.phone) {
        out.push({
          id: `${d._id}-profile`,
          severity: 'info',
          category: 'data',
          title: `${d.name}: profile incomplete`,
          detail: `Missing ${[!d.phone && 'phone', !d.license && 'licence'].filter(Boolean).join(' and ')}.`,
          href: `/Dashboard/Driver/${d._id}`,
        });
      }
    }

    if (discrepancies > 0) {
      out.push({
        id: 'settlement-discrepancies',
        severity: 'info',
        category: 'data',
        title: `${discrepancies} duties need review`,
        detail: 'The book’s own arithmetic disagrees with the recorded totals.',
        href: '/Dashboard/DailyBook',
      });
    }

    // Most urgent first, then soonest to lapse.
    const rank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
    out.sort((a, b) =>
      rank[a.severity] - rank[b.severity] ||
      (a.daysLeft ?? 999) - (b.daysLeft ?? 999),
    );

    return NextResponse.json({
      windowDays: window,
      total: out.length,
      counts: {
        critical: out.filter((n) => n.severity === 'critical').length,
        warning: out.filter((n) => n.severity === 'warning').length,
        info: out.filter((n) => n.severity === 'info').length,
      },
      notifications: out,
    });
  } catch (err) {
    console.error('GET /api/notifications failed:', err);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}
