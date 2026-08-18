import mongoose, { Schema, model, models } from 'mongoose';
import { amendmentFields } from '@/lib/amend';

/**
 * One driver's takings and expenses for one duty — the row the office has been
 * keeping by hand in "DAILY INCOME AND EXPENSE FROM CSC TRAVELS.xlsx".
 *
 * The money model mirrors how cash actually moves in the business:
 *
 *   openingBalance  what the driver was already holding from yesterday
 * + totalEarnings   collected this duty, split across earnings.* by channel
 * = cashInHand      ← this is the books' "Total (₹)" column
 * - fuelExpense
 * - tollExpense     tolls, parking, and small on-road costs
 * = netTotal
 * - transferToBank  paid into the company ICICI account
 * - cashGiven       handed to the office in cash
 * = closingBalance  carried into the driver's next duty
 *
 * The distinction between `totalEarnings` and `cashInHand` matters: the
 * spreadsheet's "Total" column includes the carried-forward float, so summing
 * it for a revenue report would re-count every driver's float every single day.
 * Revenue reporting must use `totalEarnings`.
 *
 * closingBalance is the driver's running float. It is legitimately negative
 * when a driver has spent more on fuel than they collected.
 */

export const EARNING_CHANNELS = [
  'uber',
  'uberCash',
  'rapidoCash',
  'rapidoAccount',
  'upiBank',
  'personalUpi',
  'offline',
  'advance',
] as const;

export type EarningChannel = (typeof EARNING_CHANNELS)[number];

const money = { type: Number, default: 0 };

const DailySettlementSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'CompanyAdmin', required: true, index: true },

    date: { type: Date, required: true },

    driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
    // Denormalised so the daily book still reads correctly if a driver row is
    // renamed later — the sheet recorded a name, not an id.
    driverName: { type: String, required: true },

    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    vehiclePlate: { type: String, default: '' },

    // 'unknown' is honest: most sheet rows never recorded a shift.
    shift: { type: String, enum: ['day', 'night', null], default: null },
    dutyType: {
      type: String,
      enum: ['day', 'night', 'leave', 'off', 'service', 'unknown'],
      default: 'unknown',
      index: true,
    },
    /** Free text from the "Duty Time" column, e.g. "9.00AM to 10.00 PM". */
    dutyNote: { type: String, default: '' },

    openingBalance: money,

    /*
     * Itemised expenses. A duty routinely has several of each — two or three
     * CNG fills and a toll both ways — and the books used to cram them into
     * one cell ("470 + 410"). Each line keeps its own amount and note; the
     * fuelExpense / tollExpense totals below are derived from these whenever
     * any lines exist, so the itemised and summed views can never disagree.
     */
    fuelEntries: {
      type: [{ _id: false, amount: { type: Number, min: 0 }, note: { type: String, default: '' } }],
      default: [],
    },
    tollEntries: {
      type: [{ _id: false, amount: { type: Number, min: 0 }, note: { type: String, default: '' } }],
      default: [],
    },

    earnings: {
      uber: money,
      uberCash: money,
      rapidoCash: money,
      rapidoAccount: money,
      upiBank: money,
      personalUpi: money,
      offline: money,
      advance: money,
    },

    /** The duty's actual takings. Use this for revenue, never `cashInHand`. */
    totalEarnings: money,
    /** openingBalance + totalEarnings — the books' "Total (₹)". */
    cashInHand: money,

    fuelExpense: money,
    tollExpense: money,
    totalExpense: money,
    netTotal: money,

    transferToBank: money,
    cashGiven: money,
    /** The book's own carry-forward — what the driver was actually held to. */
    closingBalance: money,
    /** What the arithmetic gives. Differs from the above on 11% of imported rows. */
    computedClosingBalance: money,

    /**
     * What the spreadsheet itself claimed, kept for audit. The hand-entered
     * totals drift from the arithmetic in places; `totalEarnings` above is
     * recomputed from the channels and is the figure the app trusts.
     */
    sheetTotals: {
      totalEarnings: { type: Number, default: null },
      totalExpense: { type: Number, default: null },
      netTotal: { type: Number, default: null },
      closingBalance: { type: Number, default: null },
    },
    /** True when the sheet's own figures disagree with the recomputed ones. */
    discrepancy: { type: Boolean, default: false, index: true },
    /** Which figure disagrees: 'total', 'closing', or both. */
    discrepancyKind: { type: [String], default: [] },

    /**
     * The same duty recorded differently on a second sheet. Retained rather
     * than resolved silently, so ops can settle it with the original book.
     */
    conflicts: [
      {
        _id: false,
        sheet: String,
        totalEarnings: Number,
        totalExpense: Number,
        netTotal: Number,
      },
    ],

    /** Text found in a money column, e.g. Uber = "wedding beur end at 12pm". */
    notes: { type: [String], default: [] },

    /** Where this row came from: 'sheet' for imported, 'app' for entered since. */
    origin: { type: String, enum: ['sheet', 'app'], default: 'app', index: true },
    source: {
      workbook: String,
      sheet: String,
      layout: String,
      row: Number,
    },

    ...amendmentFields,
  },
  { timestamps: true, collection: 'dailysettlements' },
);

/**
 * One settlement per driver per date per shift. This is what makes re-running
 * the importer safe — a second run updates these rows instead of doubling the
 * month's takings.
 */
DailySettlementSchema.index(
  { companyId: 1, driverId: 1, date: 1, shift: 1 },
  { unique: true },
);
// Drives the daily book view and the month-to-date dashboards.
DailySettlementSchema.index({ companyId: 1, date: -1 });
DailySettlementSchema.index({ companyId: 1, driverId: 1, date: -1 });

/** Keeps the derived totals consistent no matter who writes the document. */
DailySettlementSchema.pre('validate', function () {
  const e = (this.earnings ?? {}) as Record<string, number>;
  const earned = EARNING_CHANNELS.reduce((sum, k) => sum + (Number(e[k]) || 0), 0);

  // Itemised lines are authoritative when present; a lump sum is still allowed
  // for rows imported from the books, which never itemised.
  const sumOf = (rows?: Array<{ amount?: number }>) =>
    (rows ?? []).reduce((a, r) => a + (Number(r?.amount) || 0), 0);
  if (Array.isArray(this.fuelEntries) && this.fuelEntries.length > 0) {
    this.fuelExpense = round2(sumOf(this.fuelEntries as Array<{ amount?: number }>));
  }
  if (Array.isArray(this.tollEntries) && this.tollEntries.length > 0) {
    this.tollExpense = round2(sumOf(this.tollEntries as Array<{ amount?: number }>));
  }

  const spent = (Number(this.fuelExpense) || 0) + (Number(this.tollExpense) || 0);
  const inHand = (Number(this.openingBalance) || 0) + earned;

  this.totalEarnings = round2(earned);
  this.cashInHand = round2(inHand);
  this.totalExpense = round2(spent);
  this.netTotal = round2(inHand - spent);
  this.computedClosingBalance = round2(
    this.netTotal - (Number(this.transferToBank) || 0) - (Number(this.cashGiven) || 0),
  );
});

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const DailySettlement =
  models.DailySettlement || model('DailySettlement', DailySettlementSchema);
export default DailySettlement;
