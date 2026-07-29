import type { Document } from 'mongoose';

/**
 * Editing rows that came out of the spreadsheets.
 *
 * The imported books are a financial record. Once staff correct a row, the
 * figure the paper book claimed is gone unless we keep it — and "what did the
 * original register say" is exactly the question an audit asks. So the first
 * time a sheet-imported row is edited we snapshot it, and every later edit
 * leaves that snapshot alone.
 *
 * Rows entered in the app have no original to preserve and are simply updated.
 */

/** Fields never worth snapshotting — bookkeeping rather than content. */
const IGNORED = new Set([
  '_id', '__v', 'createdAt', 'updatedAt',
  'original', 'amended', 'amendedAt', 'amendmentNote',
]);

export type Amendable = Document & {
  origin?: 'sheet' | 'app';
  amended?: boolean;
  amendedAt?: Date | null;
  amendmentNote?: string;
  original?: Record<string, unknown> | null;
};

/**
 * Call immediately BEFORE applying an edit.
 *
 * Captures the pre-edit state of a sheet-imported row exactly once. Returns
 * true if a snapshot was taken, so callers can report it.
 */
export function snapshotIfImported(doc: Amendable, note?: string): boolean {
  if (doc.origin !== 'sheet') return false;
  if (doc.amended) {
    // Already amended — keep the *original* original, but refresh the trail.
    doc.amendedAt = new Date();
    if (note) doc.amendmentNote = note;
    return false;
  }

  const raw = doc.toObject({ depopulate: true }) as Record<string, unknown>;
  const snapshot: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!IGNORED.has(k)) snapshot[k] = v;
  }

  doc.original = snapshot;
  doc.amended = true;
  doc.amendedAt = new Date();
  if (note) doc.amendmentNote = note;
  return true;
}

/** Schema fragment to mix into any collection that holds imported rows. */
export const amendmentFields = {
  /** True once a sheet-imported row has been corrected in the app. */
  amended: { type: Boolean, default: false, index: true },
  amendedAt: { type: Date, default: null },
  amendmentNote: { type: String, default: '' },
  /**
   * The row exactly as imported, kept so the spreadsheet's own figures survive
   * a correction. Untyped on purpose — it mirrors whatever the parent holds.
   */
  original: { type: Object, default: null },
} as const;

/**
 * Copies whitelisted fields from a request body onto a document.
 *
 * Explicit whitelists rather than `$set: body`. The vehicle route used the
 * latter, which let any signed-in caller overwrite derived totals or move a
 * record to another tenant by posting `companyId`.
 *
 * `undefined` is skipped so a partial edit does not blank untouched fields;
 * `null` is honoured, since clearing a date is a legitimate edit.
 */
export function applyFields<T extends object>(
  doc: T,
  body: Record<string, unknown>,
  allowed: readonly string[],
): string[] {
  const changed: string[] = [];
  for (const field of allowed) {
    if (!(field in body)) continue;
    const value = body[field];
    if (value === undefined) continue;
    (doc as Record<string, unknown>)[field] = value;
    changed.push(field);
  }
  return changed;
}
