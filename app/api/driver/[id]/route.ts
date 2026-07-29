import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Driver from '@/models/Driver';
import { connectDB } from '@/lib/mongodb';
import DailySettlement from '@/models/DailySettlement';
import FuelLog from '@/models/FuelLog';
import Trip from '@/models/Trip';
import { applyFields } from '@/lib/amend';

export const dynamic = 'force-dynamic';

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(
  req: NextRequest,
  context: Context
) {
  try {
    await connectDB();

    // ✅ THIS IS THE FIX
    const { id } = await context.params;

    console.log('🔥 API DRIVER ID:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const driver = await Driver.findById(id).lean();

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(driver);
  } catch (error) {
    console.error('API DRIVER ERROR:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const body = await req.json();

    const driver = await Driver.findById(id);
    if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

    /*
     * Only these may be set from a request. Balances, duty counts, app
     * credentials, live location and tenancy are derived or sensitive and are
     * owned by the server.
     */
    const EDITABLE = [
      'name', 'phone', 'email', 'license', 'company', 'vehicle',
      'address', 'bloodGroup', 'emergencyContact', 'status',
      'rating', 'trips', 'baseSalary', 'perKmRate',
      'aliases', 'defaultShift',
      'photoUrl', 'licenseDocUrls', 'idProofUrls', 'policeVerificationUrls',
    ] as const;

    /*
     * Fields absent from the body are left alone. The previous version wrote
     * `body.address ?? ''` for every field, so a partial edit — sending just a
     * status change — silently blanked the driver's address, salary, rating and
     * emergency contact.
     */
    const changed = applyFields(driver, body, EDITABLE);

    if (body.joinDate !== undefined) {
      const d = body.joinDate ? new Date(body.joinDate) : null;
      if (d && Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'joinDate is not a valid date' }, { status: 400 });
      }
      driver.set('joinDate', d);
      changed.push('joinDate');
    }

    // Spellings are matched case-insensitively by the importer; storing
    // duplicates that differ only by case would defeat that.
    if (Array.isArray(body.aliases)) {
      const seen = new Set<string>();
      driver.set('aliases', body.aliases
        .map((a: unknown) => String(a).trim())
        .filter((a: string) => {
          const k = a.toLowerCase();
          if (!a || seen.has(k)) return false;
          seen.add(k);
          return true;
        }));
    }

    await driver.save({ validateModifiedOnly: true });
    return NextResponse.json({ ...driver.toObject(), changed });
  } catch (error) {
    console.error('PATCH /api/driver/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const driver = await Driver.findById(id);
    // findByIdAndDelete reported success even when nothing matched, so a failed
    // delete looked identical to a successful one.
    if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

    /*
     * Refuse to delete a driver who has history.
     *
     * Settlements, fuel logs and trips hold this driver's id. Deleting the row
     * orphans them: the daily book still shows the duties, but the driver they
     * belong to no longer exists, and their earnings vanish from every report
     * with nothing to explain it. Offboarding is the intended route — it keeps
     * the history and revokes access.
     */
    const [settlements, fuelLogs, trips] = await Promise.all([
      DailySettlement.countDocuments({ driverId: driver._id }),
      FuelLog.countDocuments({ driverId: driver._id }),
      Trip.countDocuments({ 'driver.driverId': driver._id }),
    ]);

    const history = settlements + fuelLogs + trips;
    if (history > 0) {
      const parts = [
        settlements && `${settlements} recorded dut${settlements > 1 ? 'ies' : 'y'}`,
        fuelLogs && `${fuelLogs} fuel log${fuelLogs > 1 ? 's' : ''}`,
        trips && `${trips} trip${trips > 1 ? 's' : ''}`,
      ].filter(Boolean);
      return NextResponse.json(
        {
          error: `${driver.name} has ${parts.join(', ')}. Deleting them would remove ` +
            'those earnings from your books. Use Offboard instead — it keeps the ' +
            'history and revokes their access.',
          history: { settlements, fuelLogs, trips },
          suggestOffboard: true,
        },
        { status: 409 },
      );
    }

    await driver.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/driver/[id] error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
