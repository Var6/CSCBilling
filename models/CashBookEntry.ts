import mongoose, { Schema, model, models } from 'mongoose';
import { amendmentFields } from '@/lib/amend';

/**
 * One day of the company cash book, per account — "CSC- Cash Book 2026-27.xlsx".
 *
 * This is a different ledger from DailySettlement. The settlement book tracks
 * what each *driver* collected and spent on a duty; this tracks what moved
 * through the *company's* cash box and bank accounts, including things no
 * driver ever touches — salaries, insurance, challans, car rent.
 *
 * The two overlap on fuel and toll, so do not add them together to get total
 * expenses. Treat the cash book as the authority for company-level accounts and
 * the settlement book as the authority for driver float.
 */

export const CREDIT_CATEGORIES = [
  'onlineRide',
  'offlineRide',
  'rental',
  'school',
  'bySudhirSir',
  'byOther',
] as const;

export const DEBIT_CATEGORIES = [
  'petrol',
  'cng',
  'toll',
  'repair',
  'salary',
  'schoolSalary',
  'challan',
  'carRent',
  'insurance',
  'other',
] as const;

/** Where the money sits. 'bank' is the generic column on the Credit sheet. */
export const ACCOUNTS = ['cash', 'bank', 'icici', 'boi'] as const;
export type Account = (typeof ACCOUNTS)[number];

const money = { type: Number, default: 0 };

const CashBookEntrySchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'CompanyAdmin', required: true, index: true },

    date: { type: Date, required: true },
    account: { type: String, enum: ACCOUNTS, required: true },

    credits: Object.fromEntries(CREDIT_CATEGORIES.map((k) => [k, money])),
    debits: Object.fromEntries(DEBIT_CATEGORIES.map((k) => [k, money])),

    /** Sums of the above, recomputed on save. */
    totalCredit: money,
    totalDebit: money,

    /**
     * The book's own running balance columns. `closing` is kept as written
     * rather than derived, because the sheet is what the office reconciles
     * against; `computedClosing` exposes the arithmetic for comparison.
     */
    opening: money,
    closing: money,
    computedClosing: money,
    /** True when opening + credits - debits disagrees with the stated closing. */
    discrepancy: { type: Boolean, default: false, index: true },

    remarks: { type: String, default: '' },

    origin: { type: String, enum: ['sheet', 'app'], default: 'app', index: true },
    source: {
      workbook: String,
      sheet: String,
      row: Number,
    },

    ...amendmentFields,
  },
  { timestamps: true, collection: 'cashbookentries' },
);

/** One entry per account per day — what makes a re-import idempotent. */
CashBookEntrySchema.index({ companyId: 1, account: 1, date: 1 }, { unique: true });
CashBookEntrySchema.index({ companyId: 1, date: -1 });

// Synchronous hook — returning is enough in Mongoose 7+, and the `next`
// callback is not usefully typed against a dynamically built schema.
CashBookEntrySchema.pre('validate', function () {
  const c = (this.credits ?? {}) as Record<string, number>;
  const d = (this.debits ?? {}) as Record<string, number>;

  const credit = CREDIT_CATEGORIES.reduce((s, k) => s + (Number(c[k]) || 0), 0);
  const debit = DEBIT_CATEGORIES.reduce((s, k) => s + (Number(d[k]) || 0), 0);

  this.totalCredit = round2(credit);
  this.totalDebit = round2(debit);
  this.computedClosing = round2((Number(this.opening) || 0) + credit - debit);
  this.discrepancy = Math.abs((Number(this.closing) || 0) - this.computedClosing) > 1;
});

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const CashBookEntry =
  models.CashBookEntry || model('CashBookEntry', CashBookEntrySchema);
export default CashBookEntry;
