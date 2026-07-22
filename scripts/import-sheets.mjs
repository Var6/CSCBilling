/**
 * Imports the CSC Travels workbooks into MongoDB.
 *
 *   node scripts/import-sheets.mjs [--dry-run] [--data-dir ./data]
 *
 * Safe to run repeatedly: every write is an upsert keyed on something stable
 * (driver+date+shift for settlements, the originating sheet cell for fuel), so
 * a second run corrects the existing rows rather than doubling the books.
 *
 * Nothing here deletes. If a row is removed from a spreadsheet it stays in the
 * database — dropping financial history on a re-import is not a thing a billing
 * system should do quietly.
 */
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';
import path from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import { readWorkbook } from './lib/xlsx.mjs';
import {
  parseIncomeWorkbook,
  parseFuelWorkbook,
  parseOfflineInvoices,
  parseCashBook,
  parseAprilEarnings,
} from './lib/sheetParse.mjs';

loadEnv({ path: '.env.local', override: true });

/* ------------------------------------------------------------------ *
 * Args
 * ------------------------------------------------------------------ */

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const DATA_DIR = (() => {
  const i = argv.indexOf('--data-dir');
  return path.resolve(i >= 0 && argv[i + 1] ? argv[i + 1] : 'data');
})();

const log = (...a) => console.log(...a);
const warn = (...a) => console.warn('  ⚠', ...a);

/* ------------------------------------------------------------------ *
 * Models
 *
 * The models are TypeScript, which a plain `node` run cannot import. Rather
 * than add a build step for a maintenance script, the schemas are declared
 * here in the shapes the app models define. Kept deliberately loose —
 * `strict: false` — so a field added to the app model still round-trips.
 * ------------------------------------------------------------------ */

const { Schema } = mongoose;
const loose = { strict: false, timestamps: true };

const Driver = mongoose.model('Driver', new Schema({}, { ...loose, collection: 'drivers' }));
const Vehicle = mongoose.model('Vehicle', new Schema({}, { ...loose, collection: 'vehicles' }));
const Company = mongoose.model('CompanyAdmin', new Schema({}, { ...loose, collection: 'companyadmins' }));
const Settlement = mongoose.model('DailySettlement', new Schema({}, { ...loose, collection: 'dailysettlements' }));
const FuelLog = mongoose.model('FuelLog', new Schema({}, { ...loose, collection: 'fuellogs' }));
const Repair = mongoose.model('Repair', new Schema({}, { ...loose, collection: 'repairs' }));
const Customer = mongoose.model('Customer', new Schema({}, { ...loose, collection: 'customers' }));
const Trip = mongoose.model('Trip', new Schema({}, { ...loose, collection: 'trips' }));
const CashBook = mongoose.model('CashBookEntry', new Schema({}, { ...loose, collection: 'cashbookentries' }));

/* ------------------------------------------------------------------ *
 * Reference data
 *
 * The books identify a car by the last four digits of its plate and nothing
 * else — no make, no RC, no expiry dates. We create a placeholder row per code
 * so fuel and repairs have something to hang off, and flag it for staff to
 * complete. Real registration details must be filled in from the RC book.
 * ------------------------------------------------------------------ */

const VEHICLE_SEED = {
  6494: { name: 'CSC 6494', model: 'Unknown', fuelType: 'cng' },
  4503: { name: 'CSC 4503', model: 'Unknown', fuelType: 'cng' },
  6362: { name: 'CSC 6362', model: 'Unknown', fuelType: 'cng' },
  2762: { name: 'CSC 2762', model: 'Unknown', fuelType: 'cng' },
};

async function resolveCompanyId() {
  const fromEnv = process.env.PUBLIC_COMPANY_ID;
  if (fromEnv && mongoose.Types.ObjectId.isValid(fromEnv)) {
    return new mongoose.Types.ObjectId(fromEnv);
  }
  const companies = await Company.find().select('_id name').limit(5).lean();
  if (companies.length === 1) return companies[0]._id;
  if (companies.length === 0) {
    throw new Error('No company found. Create one in the console before importing.');
  }
  throw new Error(
    `Multiple companies exist (${companies.map((c) => c.name ?? c._id).join(', ')}). ` +
    'Set PUBLIC_COMPANY_ID in .env.local so the import files against the right one.',
  );
}

/**
 * Ensures a Driver row exists for every name in the books, matching on the
 * canonical name or any recorded alias before creating anything.
 */
async function ensureDrivers(names, companyId, stats) {
  const map = new Map();

  for (const name of names) {
    const existing = await Driver.findOne({
      $or: [
        { name: new RegExp(`^${escapeRe(name)}$`, 'i') },
        { aliases: new RegExp(`^${escapeRe(name)}$`, 'i') },
      ],
    });

    if (existing) {
      // Record the spelling so the next import matches without a regex scan.
      if (!(existing.aliases ?? []).some((a) => a.toLowerCase() === name.toLowerCase())) {
        await Driver.updateOne({ _id: existing._id }, { $addToSet: { aliases: name } });
      }
      map.set(name, existing._id);
      continue;
    }

    if (DRY_RUN) {
      map.set(name, new mongoose.Types.ObjectId());
      stats.driversCreated++;
      continue;
    }

    // Placeholder contact details — the books record no phone, licence or
    // email. These rows are flagged `needsProfile` for staff to complete.
    const doc = await Driver.create({
      name,
      aliases: [name],
      phone: '',
      email: '',
      license: '',
      company: '',
      status: 'offline',
      active: true,
      currentBalance: 0,
      needsProfile: true,
      companyId,
    });
    map.set(name, doc._id);
    stats.driversCreated++;
  }

  return map;
}

async function ensureVehicles(codes, companyId, stats) {
  const map = new Map();

  for (const code of codes) {
    let v = await Vehicle.findOne({
      $or: [{ shortCode: code }, { plate: new RegExp(`${escapeRe(code)}$`) }],
    });

    if (!v) {
      if (DRY_RUN) {
        map.set(code, { _id: new mongoose.Types.ObjectId(), plate: `????${code}` });
        stats.vehiclesCreated++;
        continue;
      }
      const seed = VEHICLE_SEED[code] ?? { name: `CSC ${code}`, model: 'Unknown', fuelType: 'cng' };
      v = await Vehicle.create({
        ...seed,
        shortCode: code,
        // Placeholder plate — unique index safe, obviously incomplete to staff.
        plate: `PENDING-${code}`,
        rcNumber: `PENDING-${code}`,
        year: new Date().getFullYear(),
        status: 'available',
        needsProfile: true,
        companyId,
      });
      stats.vehiclesCreated++;
    } else if (!v.shortCode) {
      await Vehicle.updateOne({ _id: v._id }, { $set: { shortCode: code } });
    }

    map.set(code, { _id: v._id, plate: v.plate ?? '' });
  }

  return map;
}

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Creates the uniqueness constraints the imported collections depend on.
 *
 * The upsert filters alone make a sequential re-run idempotent, but only the
 * index makes that guarantee hold if two imports ever overlap. Mirrors the
 * declarations in models/DailySettlement.ts, models/FuelLog.ts and
 * models/Repair.ts — keep them in step.
 */
async function ensureIndexes() {
  const db = mongoose.connection.db;
  const specs = [
    ['dailysettlements', { companyId: 1, driverId: 1, date: 1, shift: 1 }, { unique: true }],
    ['dailysettlements', { companyId: 1, date: -1 }, {}],
    ['dailysettlements', { companyId: 1, driverId: 1, date: -1 }, {}],
    ['fuellogs', { 'source.sheet': 1, 'source.row': 1, 'source.col': 1 },
      { unique: true, partialFilterExpression: { origin: 'sheet' } }],
    ['fuellogs', { companyId: 1, date: -1 }, {}],
    ['fuellogs', { companyId: 1, vehicleId: 1, date: -1 }, {}],
    ['repairs', { companyId: 1, vehicleId: 1, date: 1 },
      { unique: true, partialFilterExpression: { origin: 'sheet' } }],
    ['repairs', { companyId: 1, date: -1 }, {}],
    ['cashbookentries', { companyId: 1, account: 1, date: 1 }, { unique: true }],
    ['cashbookentries', { companyId: 1, date: -1 }, {}],
    ['drivers', { aliases: 1 }, {}],
    ['vehicles', { shortCode: 1 }, {}],
  ];

  for (const [collection, keys, opts] of specs) {
    try {
      await db.collection(collection).createIndex(keys, opts);
    } catch (err) {
      // An existing index with the same name but different options throws.
      // Worth surfacing, but not worth aborting an import over.
      warn(`index on ${collection} ${JSON.stringify(keys)}: ${err.message}`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Import steps
 * ------------------------------------------------------------------ */

async function importSettlements(records, companyId, driverIds, stats) {
  const ops = [];

  for (const r of records) {
    const driverId = driverIds.get(r.driverName);
    if (!driverId) { warn(`no driver id for ${r.driverName}`); continue; }

    ops.push({
      updateOne: {
        filter: { companyId, driverId, date: r.date, shift: r.shift ?? null },
        update: {
          $set: {
            companyId,
            driverId,
            driverName: r.driverName,
            date: r.date,
            shift: r.shift ?? null,
            dutyType: r.dutyType,
            dutyNote: r.dutyNote,
            openingBalance: r.openingBalance,
            earnings: r.earnings,
            totalEarnings: r.totalEarnings,
            cashInHand: r.cashInHand,
            fuelExpense: r.fuelExpense,
            tollExpense: r.tollExpense,
            totalExpense: r.totalExpense,
            netTotal: r.netTotal,
            transferToBank: r.transferToBank,
            cashGiven: r.cashGiven,
            closingBalance: r.closingBalance,
            computedClosingBalance: r.computedClosingBalance,
            sheetTotals: r.sheetTotals,
            discrepancy: r.discrepancy,
            discrepancyKind: r.discrepancyKind ?? [],
            conflicts: r.conflicts ?? [],
            notes: r.notes,
            origin: 'sheet',
            source: r.source,
          },
        },
        upsert: true,
      },
    });
  }

  if (DRY_RUN) { stats.settlements = ops.length; return; }
  const res = await Settlement.bulkWrite(ops, { ordered: false });
  stats.settlements = ops.length;
  stats.settlementsNew = res.upsertedCount;
  stats.settlementsUpdated = res.modifiedCount;
}

/**
 * Fuel logs, with per-vehicle mileage derived along the way.
 *
 * Mileage needs the previous fill on the same vehicle, so rows are processed in
 * date order per vehicle. A reading that goes backwards (the book has a few,
 * where a driver wrote the trip meter instead of the odometer) yields a null
 * mileage rather than a nonsense negative.
 */
async function importFuel(records, companyId, driverIds, vehicleMap, stats) {
  const sorted = [...records].sort((a, b) => a.date - b.date);
  const lastByVehicle = new Map();
  const ops = [];

  for (const r of sorted) {
    const driverId = driverIds.get(r.driverName);
    if (!driverId) { warn(`no driver id for fuel row ${r.driverName}`); continue; }

    const vehicle = r.vehicleCode ? vehicleMap.get(r.vehicleCode) : null;

    /*
     * Mileage is only trustworthy when two consecutive readings on the same
     * vehicle are both true odometer values. The books are not consistent about
     * this — some cells hold a trip meter ("Trip A-9614", or a bare 800 next to
     * readings in the 30,000s) — so a raw difference produces nonsense like
     * 37 km/kg on a CNG car that really does about 20.
     *
     * Both the distance and the resulting mileage are therefore range-checked,
     * and anything outside stays null rather than polluting the averages.
     */
    const PLAUSIBLE_KM_PER_DAY = 800;   // a long day, but possible
    const MIN_MILEAGE = 5;
    const MAX_MILEAGE = 35;             // CNG hatchbacks top out around 30

    let kmSinceLast = null;
    let mileage = null;
    if (vehicle && r.meterReading != null) {
      const prev = lastByVehicle.get(r.vehicleCode);
      if (prev != null && r.meterReading > prev) {
        const delta = Math.round((r.meterReading - prev) * 10) / 10;
        if (delta <= PLAUSIBLE_KM_PER_DAY) {
          kmSinceLast = delta;
          if (r.quantity > 0) {
            const m = Math.round((delta / r.quantity) * 100) / 100;
            if (m >= MIN_MILEAGE && m <= MAX_MILEAGE) mileage = m;
          }
        }
      }
      // Only carry forward readings that look like a real odometer, so one
      // stray trip-meter entry does not corrupt the next day's calculation.
      if (prev == null || r.meterReading >= prev || r.meterReading > 1000) {
        lastByVehicle.set(r.vehicleCode, r.meterReading);
      }
    }

    ops.push({
      updateOne: {
        filter: {
          'source.sheet': r.source.sheet,
          'source.row': r.source.row,
          'source.col': r.source.col ?? null,
          origin: 'sheet',
        },
        update: {
          $set: {
            companyId,
            date: r.date,
            driverId,
            driverName: r.driverName,
            vehicleId: vehicle?._id ?? null,
            vehicleCode: r.vehicleCode,
            vehiclePlate: vehicle?.plate ?? '',
            fuelType: 'cng',
            amount: r.amount,
            quantity: r.quantity,
            ratePerUnit: r.quantity > 0 ? Math.round((r.amount / r.quantity) * 100) / 100 : 0,
            meterReading: r.meterReading,
            meterNote: r.meterNote,
            dutyType: r.dutyType,
            startKm: r.startKm,
            endKm: r.endKm,
            kmSinceLast,
            mileage,
            origin: 'sheet',
            source: { ...r.source, col: r.source.col ?? null },
          },
        },
        upsert: true,
      },
    });
  }

  if (DRY_RUN) { stats.fuel = ops.length; return; }
  const res = await FuelLog.bulkWrite(ops, { ordered: false });
  stats.fuel = ops.length;
  stats.fuelNew = res.upsertedCount;
  stats.fuelUpdated = res.modifiedCount;
}

/**
 * Seeds workshop visits from the days a driver's duty column read
 * "Service for <vehicle>". Cost is unknown and left at zero for staff to fill.
 */
async function importRepairs(settlements, companyId, driverIds, vehicleMap, stats) {
  const ops = [];
  const seen = new Set();

  for (const r of settlements) {
    if (r.dutyType !== 'service' || !r.serviceVehicle) continue;
    const vehicle = vehicleMap.get(r.serviceVehicle);
    if (!vehicle) continue;

    const key = `${r.serviceVehicle}|${r.date.toISOString().slice(0, 10)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    ops.push({
      updateOne: {
        filter: { companyId, vehicleId: vehicle._id, date: r.date, origin: 'sheet' },
        update: {
          $set: {
            companyId,
            vehicleId: vehicle._id,
            vehiclePlate: vehicle.plate,
            vehicleCode: r.serviceVehicle,
            date: r.date,
            category: 'service',
            description: r.dutyNote || 'Servicing (from duty register)',
            status: 'completed',
            downtimeDays: 1,
            reportedByDriverId: driverIds.get(r.driverName) ?? null,
            notes: 'Imported from the duty register — cost not recorded on paper.',
            origin: 'sheet',
            source: r.source,
          },
        },
        upsert: true,
      },
    });
  }

  if (DRY_RUN || !ops.length) { stats.repairs = ops.length; return; }
  const res = await Repair.bulkWrite(ops, { ordered: false });
  stats.repairs = ops.length;
  stats.repairsNew = res.upsertedCount;
}

/**
 * Attaches the "earnings APRIL-26" sheet (actually May) to the settlements it
 * describes, as an alternate reading. Nothing is overwritten — see the note on
 * parseAprilEarnings for why merging these figures would corrupt the books.
 */
async function annotateAlternateReadings(rows, companyId, driverIds, stats) {
  const ops = [];

  for (const r of rows) {
    const driverId = driverIds.get(r.driverName);
    if (!driverId) continue;

    ops.push({
      updateOne: {
        filter: { companyId, driverId, date: r.date },
        update: {
          $addToSet: {
            conflicts: {
              sheet: 'earnings APRIL-26',
              totalEarnings: r.earning ?? 0,
              totalExpense: (r.fuelExpense ?? 0) + (r.tollExpense ?? 0),
              netTotal: r.closingBalance ?? 0,
            },
          },
        },
      },
    });
  }

  if (DRY_RUN || !ops.length) { stats.annotated = ops.length; return; }
  const res = await Settlement.bulkWrite(ops, { ordered: false });
  stats.annotated = ops.length;
  stats.annotatedApplied = res.modifiedCount;
}

/**
 * The company cash book — salaries, insurance, challans and the rest, which no
 * driver settlement ever sees. Totals are recomputed here so the stored figures
 * cannot drift from the categories they are made of.
 */
async function importCashBook(entries, companyId, stats) {
  const CREDITS = ['onlineRide', 'offlineRide', 'rental', 'school', 'bySudhirSir', 'byOther'];
  const DEBITS = ['petrol', 'cng', 'toll', 'repair', 'salary', 'schoolSalary',
                  'challan', 'carRent', 'insurance', 'other'];
  const zero = (keys, src) => Object.fromEntries(keys.map((k) => [k, Number(src[k]) || 0]));

  const ops = entries.map((e) => {
    const credits = zero(CREDITS, e.credits);
    const debits = zero(DEBITS, e.debits);
    const totalCredit = CREDITS.reduce((a, k) => a + credits[k], 0);
    const totalDebit = DEBITS.reduce((a, k) => a + debits[k], 0);
    const computedClosing = Math.round(((e.opening || 0) + totalCredit - totalDebit) * 100) / 100;

    return {
      updateOne: {
        filter: { companyId, account: e.account, date: e.date },
        update: {
          $set: {
            companyId,
            date: e.date,
            account: e.account,
            credits,
            debits,
            totalCredit,
            totalDebit,
            opening: e.opening || 0,
            closing: e.closing || 0,
            computedClosing,
            discrepancy: Math.abs((e.closing || 0) - computedClosing) > 1,
            remarks: e.remarks || '',
            origin: 'sheet',
            source: e.source,
          },
        },
        upsert: true,
      },
    };
  });

  if (DRY_RUN || !ops.length) { stats.cashBook = ops.length; return; }
  const res = await CashBook.bulkWrite(ops, { ordered: false });
  stats.cashBook = ops.length;
  stats.cashBookNew = res.upsertedCount;
}

/**
 * Offline invoices become completed Trips with `source: 'offline'`, so they
 * show up in the same revenue reporting as app bookings.
 *
 * The register records no driver, vehicle or odometer, so these are written
 * with `status: 'completed'` and left unassigned — the Trip pre-save guard is
 * bypassed by using bulkWrite, which is deliberate: this is historical data
 * that never had dispatch details to begin with.
 */
async function importOfflineInvoices(invoices, companyId, stats) {
  const ops = [];

  // The register reuses at least one invoice number for two different
  // customers (128 → Rishabh Ranjan 10.01.2026 and Preeti Chandra 25.12.2025),
  // so the invoice number alone is not a key — using it as one silently drops
  // the second booking. The date disambiguates and stays stable across re-runs.
  const byNumber = new Map();
  for (const inv of invoices) {
    byNumber.set(inv.invoiceNo, (byNumber.get(inv.invoiceNo) ?? 0) + 1);
  }
  const reused = [...byNumber.entries()].filter(([, n]) => n > 1).map(([no]) => no);
  if (reused.length) {
    warn(`invoice numbers reused in the register: ${reused.join(', ')} — each booking kept separately`);
  }

  for (const inv of invoices) {
    if (!inv.date) { warn(`invoice ${inv.invoiceNo} has no parseable date, skipped`); continue; }

    const customerName = inv.customerName || 'Offline customer';
    let customerId = null;

    if (!DRY_RUN) {
      // Customer.phone carries a non-sparse unique index, and the invoice
      // register records no phone numbers at all. An empty string would collide
      // on the second customer, so each gets a deterministic placeholder keyed
      // on their name: stable across re-runs, unique, and obviously not a real
      // number for whoever fills these in later.
      const placeholderPhone =
        'OFFLINE-' + customerName.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');

      const existing = await Customer.findOne({
        $or: [{ name: customerName }, { phone: placeholderPhone }],
      });
      customerId = existing
        ? existing._id
        : (await Customer.create({
            name: customerName,
            phone: placeholderPhone,
            companyId,
            status: 'active',
            joinDate: inv.date,
            needsProfile: true,
          }))._id;
    }

    const tripNumber =
      `OFFLINE-${inv.invoiceNo}-${inv.date.toISOString().slice(0, 10).replace(/-/g, '')}`;

    ops.push({
      updateOne: {
        filter: { tripNumber },
        update: {
          $set: {
            companyId,
            tripNumber,
            invoiceNo: inv.invoiceNo,
            customer: { id: customerId, name: customerName, phone: '' },
            route: {
              pickup: inv.description || 'Offline booking',
              dropoff: inv.description || 'Offline booking',
            },
            timing: { tripDate: inv.date, startTime: '00:00', endTime: '' },
            charges: { totalFare: inv.amount, subtotal: inv.amount },
            payment: { method: 'cash', status: 'paid' },
            status: 'completed',
            source: 'offline',
            notes: [
              `Imported from the offline invoice register (invoice ${inv.invoiceNo}).`,
              inv.endDate ? `Booking ran to ${inv.endDate.toISOString().slice(0, 10)}.` : '',
            ].filter(Boolean).join(' '),
          },
        },
        upsert: true,
      },
    });
  }

  if (DRY_RUN) { stats.invoices = ops.length; return; }
  const res = await Trip.bulkWrite(ops, { ordered: false });
  stats.invoices = ops.length;
  stats.invoicesNew = res.upsertedCount;
}

/**
 * Rolls the latest settlement's closing balance onto each driver, and the
 * latest odometer / fuel totals onto each vehicle, so the dashboards do not
 * have to aggregate on every page load.
 */
async function rollUp(companyId, stats) {
  if (DRY_RUN) return;

  const latest = await Settlement.aggregate([
    { $match: { companyId } },
    { $sort: { date: 1 } },
    {
      $group: {
        _id: '$driverId',
        closingBalance: { $last: '$closingBalance' },
        lastDate: { $last: '$date' },
        duties: { $sum: 1 },
        earned: { $sum: '$totalEarnings' },
      },
    },
  ]);

  for (const row of latest) {
    await Driver.updateOne(
      { _id: row._id },
      {
        $set: {
          currentBalance: row.closingBalance ?? 0,
          balanceUpdatedAt: row.lastDate,
          totalDuties: row.duties,
          totalEarned: Math.round(row.earned),
        },
      },
    );
  }
  stats.driversRolledUp = latest.length;

  const perVehicle = await FuelLog.aggregate([
    { $match: { companyId, vehicleId: { $ne: null } } },
    { $sort: { date: 1 } },
    {
      $group: {
        _id: '$vehicleId',
        totalFuelCost: { $sum: '$amount' },
        lastMeter: { $last: '$meterReading' },
        lastDate: { $last: '$date' },
        avgMileage: { $avg: '$mileage' },
      },
    },
  ]);

  for (const row of perVehicle) {
    await Vehicle.updateOne(
      { _id: row._id },
      {
        $set: {
          totalFuelCost: Math.round(row.totalFuelCost),
          currentOdometer: row.lastMeter ?? null,
          odometerUpdatedAt: row.lastDate,
          avgMileage: row.avgMileage ? Math.round(row.avgMileage * 100) / 100 : null,
        },
      },
    );
  }
  stats.vehiclesRolledUp = perVehicle.length;

  // The Feb-April fuel sheets have no VEHICLE column at all, so those fills
  // cannot be attributed to a car. Report the gap rather than let the
  // per-vehicle totals quietly understate spend.
  const unattributed = await FuelLog.aggregate([
    { $match: { companyId, vehicleId: null } },
    { $group: { _id: null, amount: { $sum: '$amount' }, n: { $sum: 1 } } },
  ]);
  stats.fuelUnattributed = unattributed[0]?.amount ?? 0;
  stats.fuelUnattributedCount = unattributed[0]?.n ?? 0;
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

function findWorkbooks() {
  if (!existsSync(DATA_DIR)) {
    throw new Error(`Data directory not found: ${DATA_DIR}`);
  }
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.xlsx') && !f.startsWith('~$'));

  const income = files.find((f) => /income|expense/i.test(f));
  const fuel = files.find((f) => /fuel/i.test(f));
  const cashBook = files.find((f) => /cash\s*book/i.test(f));

  if (!income) throw new Error(`No income/expense workbook found in ${DATA_DIR}`);
  if (!fuel) warn(`No fuel workbook found in ${DATA_DIR} — skipping fuel import`);
  if (!cashBook) warn(`No cash book found in ${DATA_DIR} — skipping cash book import`);

  return {
    income: path.join(DATA_DIR, income),
    fuel: fuel ? path.join(DATA_DIR, fuel) : null,
    cashBook: cashBook ? path.join(DATA_DIR, cashBook) : null,
  };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Put it in .env.local.');
  }

  const books = findWorkbooks();
  log(`\n📖 Reading workbooks from ${DATA_DIR}`);
  log(`   income: ${path.basename(books.income)}`);
  if (books.fuel) log(`   fuel:   ${path.basename(books.fuel)}`);
  if (books.cashBook) log(`   cash:   ${path.basename(books.cashBook)}`);

  const incomeWb = readWorkbook(books.income);
  const settlements = parseIncomeWorkbook(incomeWb);
  const invoices = parseOfflineInvoices(incomeWb);
  const fuelRows = books.fuel ? parseFuelWorkbook(readWorkbook(books.fuel)) : [];
  const cashRows = books.cashBook ? parseCashBook(readWorkbook(books.cashBook)) : [];
  const altRows = books.fuel ? parseAprilEarnings(readWorkbook(books.fuel)) : [];

  log(`\n🔍 Parsed`);
  log(`   ${settlements.length} daily settlements`);
  log(`   ${fuelRows.length} fuel fills`);
  log(`   ${invoices.length} offline invoices`);
  log(`   ${cashRows.length} cash book days with movement`);

  const unknown = [
    ...new Set([
      ...settlements.filter((r) => r.knownDriver === false).map((r) => r.driverName),
      ...fuelRows.filter((r) => r.known === false).map((r) => r.driverName),
    ]),
  ];
  if (unknown.length) {
    warn(`names not in the alias table, imported as new drivers: ${unknown.join(', ')}`);
    warn('if any is an alternate spelling of an existing driver, merge them in the console.');
  }

  const discrepancies = settlements.filter((r) => r.discrepancy).length;
  const conflicts = settlements.filter((r) => r.conflicts?.length).length;
  if (discrepancies) warn(`${discrepancies} rows where the sheet total disagrees with the arithmetic`);
  if (conflicts) warn(`${conflicts} rows recorded differently on two sheets — flagged for review`);

  await mongoose.connect(process.env.MONGODB_URI);
  log(`\n🔌 Connected to "${mongoose.connection.name}"`);

  const companyId = await resolveCompanyId();
  log(`   filing against company ${companyId}`);

  const stats = { driversCreated: 0, vehiclesCreated: 0 };

  const driverNames = [...new Set([
    ...settlements.map((r) => r.driverName),
    ...fuelRows.map((r) => r.driverName),
  ])].sort();
  const vehicleCodes = [...new Set([
    ...fuelRows.map((r) => r.vehicleCode).filter(Boolean),
    ...settlements.map((r) => r.serviceVehicle).filter(Boolean),
  ])].sort();

  log(`\n👤 Drivers: ${driverNames.join(', ')}`);
  log(`🚗 Vehicles: ${vehicleCodes.join(', ')}`);

  const driverIds = await ensureDrivers(driverNames, companyId, stats);
  const vehicleMap = await ensureVehicles(vehicleCodes, companyId, stats);

  if (!DRY_RUN) await ensureIndexes();

  log(`\n${DRY_RUN ? '🧪 DRY RUN — nothing written' : '💾 Writing'}`);
  await importSettlements(settlements, companyId, driverIds, stats);
  await importFuel(fuelRows, companyId, driverIds, vehicleMap, stats);
  await importRepairs(settlements, companyId, driverIds, vehicleMap, stats);
  await importOfflineInvoices(invoices, companyId, stats);
  await importCashBook(cashRows, companyId, stats);
  await annotateAlternateReadings(altRows, companyId, driverIds, stats);
  await rollUp(companyId, stats);

  log(`\n✅ Done`);
  log(`   drivers created      ${stats.driversCreated}`);
  log(`   vehicles created     ${stats.vehiclesCreated}`);
  log(`   settlements          ${stats.settlements}  (new ${stats.settlementsNew ?? 0}, updated ${stats.settlementsUpdated ?? 0})`);
  log(`   fuel logs            ${stats.fuel}  (new ${stats.fuelNew ?? 0}, updated ${stats.fuelUpdated ?? 0})`);
  log(`   repairs (service)    ${stats.repairs ?? 0}  (new ${stats.repairsNew ?? 0})`);
  log(`   offline invoices     ${stats.invoices}  (new ${stats.invoicesNew ?? 0})`);
  log(`   cash book entries    ${stats.cashBook ?? 0}  (new ${stats.cashBookNew ?? 0})`);
  log(`   alternate readings   ${stats.annotated ?? 0}  (attached to existing duties, nothing overwritten)`);

  const revenue = settlements.reduce((a, r) => a + r.totalEarnings, 0);
  const fuelSpend = fuelRows.reduce((a, r) => a + r.amount, 0);
  log(`\n   revenue imported     ₹${Math.round(revenue).toLocaleString('en-IN')}`);
  log(`   fuel spend imported  ₹${Math.round(fuelSpend).toLocaleString('en-IN')}`);
  if (stats.fuelUnattributedCount) {
    log(`   ...of which ₹${Math.round(stats.fuelUnattributed).toLocaleString('en-IN')} ` +
        `(${stats.fuelUnattributedCount} fills) name no vehicle in the book`);
  }

  if (stats.driversCreated || stats.vehiclesCreated) {
    log(`\n   ⚠ New driver and vehicle rows are placeholders — the books record no`);
    log(`     phone, licence, plate or RC number. Complete them in the console.`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('\n❌ Import failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
