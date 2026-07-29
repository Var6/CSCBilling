/**
 * Normalises the CSC Travels workbooks into canonical records.
 *
 * The books are hand-maintained and use two different layouts for the same
 * information, plus a fuel book with its own two layouts. Everything here is
 * about collapsing those into one shape:
 *
 *   DAILY INCOME AND EXPENSE
 *     layout A "block"  — one block per date; rows are fields, columns are drivers.
 *                         (fy-26-27 (JULY), fy-26-27 (JUNE)N, Sheet3)
 *     layout B "table"  — one row per driver per date; columns are fields.
 *                         (FEB-26, MARCH-26, APRIL, MAY, JUNE)
 *
 *   FUEL DETAILS
 *     layout "grid"     — repeating 6-column groups, one group per driver.
 *     layout "per-driver" — one sheet per driver, one row per date.
 *
 * Anything unparseable is preserved verbatim on `notes` rather than dropped, so
 * a bad cell never silently becomes a zero in the books.
 */

/* ------------------------------------------------------------------ *
 * Scalars
 * ------------------------------------------------------------------ */

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

/**
 * Parses the several date spellings used across the books.
 * Accepts Excel serials (46204), dd.mm.yyyy, dd.mm.yy, and dd/mm/yyyy.
 * Returns a UTC-midnight Date, or null if the cell isn't a date.
 */
export function toDate(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Excel serial. Bounded to a sane window so stray numbers (amounts, meter
  // readings) can never be mistaken for dates.
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n >= 36_526 && n <= 55_000) { // 2000-01-01 .. 2050-08-08
      return new Date(EXCEL_EPOCH_UTC + Math.floor(n) * DAY_MS);
    }
    return null;
  }

  // 4-digit year must be tried before 2-digit, or "01.02.2026" reads as year 20.
  const m = /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4}|\d{2})(?!\d)/.exec(s);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Parses a money/quantity cell.
 * Handles "470 + 410" (two fuel fills logged in one cell), "₹1,234", "(500)"
 * for negatives, and returns null for free text like "Leave" or "no duty".
 */
export function toNumber(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  s = s.replace(/[₹,\s]/g, '');
  if (!s) return null;

  // Parenthesised negatives.
  const paren = /^\((.+)\)$/.exec(s);
  if (paren) {
    const inner = toNumber(paren[1]);
    return inner == null ? null : -inner;
  }

  // Summed cells: "470+410", "302+5.1".
  if (/^-?\d*\.?\d+(\+-?\d*\.?\d+)+$/.test(s)) {
    return s.split('+').reduce((a, p) => a + Number(p), 0);
  }

  if (!/^-?\d*\.?\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** True when a cell holds free text rather than a number. */
const isText = (raw) => Boolean(String(raw ?? '').trim()) && toNumber(raw) === null;

/**
 * Splits a cell that packs several readings into one, e.g. a day with two fuel
 * stops written "559/627" alongside meter readings "25986/26115".
 * Returns [] when the cell is not a multi-part number.
 */
function splitParts(raw) {
  const s = String(raw ?? '').trim();
  if (!s || !/[+/&,]/.test(s)) return [];
  const parts = s.split(/[+/&,]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return [];
  const nums = parts.map((p) => toNumber(p));
  return nums.every((n) => n != null) ? nums : [];
}

/**
 * Money/quantity for the fuel book: two fills in one cell are added together.
 * A plain cell falls through to toNumber.
 */
export function toFuelAmount(raw) {
  const parts = splitParts(raw);
  if (parts.length) return parts.reduce((a, b) => a + b, 0);
  return toNumber(raw);
}

/**
 * Odometer for the fuel book. Multi-part cells hold successive readings rather
 * than addends — "25986/26115" is where the car was at each stop — so the last
 * one is the reading to carry forward. Adding them would produce a meaningless
 * 52,101 and destroy the next day's mileage calculation.
 */
export function toMeterReading(raw) {
  const parts = splitParts(raw);
  if (parts.length) return parts[parts.length - 1];
  return toNumber(raw);
}

/**
 * A single fill above this is a mis-keyed cell, not a tanker. The books contain
 * at least one date serial (46179) typed into a KG/Litre column; left alone it
 * turned a month's average rate into ₹0.60 per kg.
 */
const MAX_PLAUSIBLE_QUANTITY = 200;

/* ------------------------------------------------------------------ *
 * Drivers & duty
 * ------------------------------------------------------------------ */

/**
 * The books spell the same person several ways across months
 * ("Ashish"/"Aashish", "Ajeet (D)"/"Ajeet (N)"). Canonical name + shift.
 */
export function normaliseDriver(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;

  // Trailing shift marker: "Ajeet (D)" / "Ajeet (N)".
  let shift = null;
  let name = s.replace(/\s*\(\s*([DN])\s*\)\s*$/i, (_, g) => {
    shift = g.toUpperCase() === 'D' ? 'day' : 'night';
    return '';
  }).trim();

  // Strip a parenthesised month tag from the per-driver fuel sheets: "Sunny (July)".
  name = name.replace(/\s*\((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\)\s*$/i, '').trim();

  const key = name.toLowerCase().replace(/[^a-z]/g, '');
  const ALIASES = {
    aashish: 'Ashish',
    aashis:  'Ashish',
    ashish:  'Ashish',
    sunny:   'Sunny',
    munna:   'Munna',
    shashi:  'Shashi',
    rahul:   'Rahul',
    sujit:   'Sujit',
    sujitkumar: 'Sujit',
    sujeet:  'Sujeet',  // a different person from Sujit — confirmed by the office
    ravi:    'Ravi',
    ajeet:   'Ajeet',
    aniket:  'Aniket',
  };
  if (ALIASES[key]) return { name: ALIASES[key], shift, known: true };

  // Not a name we know. Rather than silently drop the row — which would lose a
  // driver hired after this alias table was written — accept anything that
  // *looks* like a name and let the importer report it for review.
  const NON_NAMES = /^(total|date|name|sum|grand|cash|nil|na|leave|rest|day|night|driver|drivername|balance|amount)$/;
  const words = name.split(/\s+/);
  const plausible =
    name.length >= 2 && name.length <= 24 &&
    words.length <= 2 &&
    /^[A-Za-z][A-Za-z.\s]*$/.test(name) &&
    !NON_NAMES.test(key);

  if (!plausible) return null;
  const titled = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  return { name: titled, shift, known: false };
}

/**
 * Classifies the "duty off/on" cell.
 * Returns { dutyType, dutyNote, serviceVehicle }.
 */
export function parseDuty(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { dutyType: 'unknown', dutyNote: '', serviceVehicle: null };

  const l = s.toLowerCase();

  // "Service for 6362" / "service of 6362" — vehicle was in the workshop.
  const svc = /servic\w*\s+(?:for|of)?\s*(\d{3,4})/i.exec(s);
  if (svc) return { dutyType: 'service', dutyNote: s, serviceVehicle: svc[1] };
  if (/servic/i.test(l)) return { dutyType: 'service', dutyNote: s, serviceVehicle: null };

  if (/medical leave/.test(l)) return { dutyType: 'leave', dutyNote: s, serviceVehicle: null };
  if (/\bleave\b|\brest\b/.test(l)) return { dutyType: 'leave', dutyNote: s, serviceVehicle: null };
  if (/no duty|off\b/.test(l)) return { dutyType: 'off', dutyNote: s, serviceVehicle: null };
  if (/night/.test(l)) return { dutyType: 'night', dutyNote: s, serviceVehicle: null };
  if (/\bday\b/.test(l)) return { dutyType: 'day', dutyNote: s, serviceVehicle: null };

  // Anything else is a free-text duty description ("Patna to Jehanabad").
  return { dutyType: 'day', dutyNote: s, serviceVehicle: null };
}

/* ------------------------------------------------------------------ *
 * Daily income & expense — shared field mapping
 * ------------------------------------------------------------------ */

/** Sheet label (lowercased, punctuation-stripped) → canonical field. */
const FIELD_BY_LABEL = new Map(Object.entries({
  'openingbalance':      'openingBalance',
  'uber':                'uber',
  'ubercash':            'uberCash',
  'rapidocash':          'rapidoCash',
  'rapidoac':            'rapidoAccount',
  'upiicici':            'upiBank',
  'upiboi':              'upiBank',
  'personelupi':         'personalUpi',
  'personalupi':         'personalUpi',
  'offline':             'offline',
  'advance':             'advance',
  'total':               'totalEarnings',
  'fuelexpense':         'fuelExpense',
  'tollotherexpense':    'tollExpense',
  'totalexpense':        'totalExpense',
  'nettotal':            'netTotal',
  'transfertoicici':     'transferToBank',
  'givencash':           'cashGiven',
  'restamount':          'closingBalance',
  'dutyoffon':           'dutyRaw',
  'dutytime':            'dutyTimeRaw',
  'drivername':          'driverName',
  'date':                'date',
}));

/** "Toll/other expense (₹)" → "tollotherexpense" */
const labelKey = (s) =>
  String(s ?? '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z]/g, '');

const fieldFor = (label) => FIELD_BY_LABEL.get(labelKey(label)) ?? null;

const EARNING_FIELDS = [
  'uber', 'uberCash', 'rapidoCash', 'rapidoAccount',
  'upiBank', 'personalUpi', 'offline', 'advance',
];

/** Builds an empty settlement, so every record has the same shape. */
function blankSettlement() {
  return {
    date: null,
    driverName: '',
    shift: null,
    dutyType: 'unknown',
    dutyNote: '',
    serviceVehicle: null,
    earnings: Object.fromEntries(EARNING_FIELDS.map((f) => [f, 0])),
    openingBalance: 0,
    totalEarnings: 0,
    fuelExpense: 0,
    tollExpense: 0,
    totalExpense: 0,
    netTotal: 0,
    cashInHand: 0,
    transferToBank: 0,
    cashGiven: 0,
    closingBalance: 0,
    computedClosingBalance: 0,
    notes: [],
    source: {},
    // Which columns the sheet actually supplied. Needed to tell "the book
    // recorded zero" from "the book has no such column", which otherwise
    // makes every row on a shorter sheet look like a discrepancy.
    seen: new Set(),
  };
}

/** Assigns one parsed cell onto a settlement, routing text to notes. */
function assign(rec, field, raw, label) {
  if (field === 'dutyRaw') {
    const d = parseDuty(raw);
    rec.dutyType = d.dutyType;
    if (d.dutyNote) rec.dutyNote = d.dutyNote;
    rec.serviceVehicle = d.serviceVehicle;
    return;
  }
  if (field === 'dutyTimeRaw') {
    const s = String(raw ?? '').trim();
    if (s) rec.dutyNote = rec.dutyNote ? `${rec.dutyNote} — ${s}` : s;
    return;
  }

  const n = toNumber(raw);
  if (n == null) {
    // Free text in a money column, e.g. Uber = "wedding beur end at 12pm".
    if (isText(raw)) rec.notes.push(`${label}: ${String(raw).trim()}`);
    return;
  }

  rec.seen.add(field);
  if (EARNING_FIELDS.includes(field)) rec.earnings[field] = n;
  else rec[field] = n;
}

/**
 * Recomputes the derived figures from their components.
 *
 * The books' "Total (₹)" column is NOT the day's takings — it is the cash the
 * driver is holding, i.e. yesterday's carry-forward plus today's collections:
 *
 *   cashInHand  = openingBalance + Σ earnings          ← the sheet's "Total (₹)"
 *   totalExpense = fuel + toll
 *   netTotal    = cashInHand - totalExpense            ← the sheet's "Net Total"
 *   closing     = netTotal - transferToBank - cashGiven ← the sheet's "Rest Amount"
 *
 * Verified against 590 of 610 rows; the remainder are genuine arithmetic slips
 * in the hand-kept book and are flagged rather than corrected.
 *
 * `totalEarnings` is kept as the day's actual takings, which is the figure any
 * revenue report wants — summing the sheet's own "Total" column would count
 * every driver's float again on every single day.
 */
const round2 = (n) => Math.round(n * 100) / 100;

function reconcile(rec) {
  const sheetTotals = {
    totalEarnings: rec.totalEarnings, // the sheet's "Total (₹)" = cash in hand
    totalExpense: rec.totalExpense,
    netTotal: rec.netTotal,
    closingBalance: rec.closingBalance,
  };

  const earned = EARNING_FIELDS.reduce((a, f) => a + (rec.earnings[f] || 0), 0);
  const spent = (rec.fuelExpense || 0) + (rec.tollExpense || 0);
  const cashInHand = (rec.openingBalance || 0) + earned;

  rec.totalEarnings = round2(earned);
  rec.cashInHand = round2(cashInHand);
  rec.totalExpense = round2(spent);
  rec.netTotal = round2(cashInHand - spent);
  rec.sheetTotals = sheetTotals;

  // Compare like with like: the sheet's Total against our cash-in-hand, and
  // only for columns the sheet actually carried.
  const expectedClosing = rec.netTotal - (rec.transferToBank || 0) - (rec.cashGiven || 0);
  const totalOff =
    rec.seen.has('totalEarnings') &&
    Math.abs(sheetTotals.totalEarnings - cashInHand) > 1;
  const closingOff =
    rec.seen.has('closingBalance') &&
    Math.abs(sheetTotals.closingBalance - expectedClosing) > 1;
  rec.discrepancy = totalOff || closingOff;
  rec.discrepancyKind = [totalOff && 'total', closingOff && 'closing'].filter(Boolean);

  // Trust the book's own carry-forward — it is what the driver was actually
  // held to — but keep the computed figure alongside it for review.
  rec.computedClosingBalance = round2(expectedClosing);
  rec.hasClosingBalance = rec.seen.has('closingBalance');
  delete rec.seen; // a Set does not survive serialisation to Mongo

  return rec;
}

/* ------------------------------------------------------------------ *
 * Layout A — one block per date, columns are drivers
 * ------------------------------------------------------------------ */

function parseBlockSheet(sheetName, rows) {
  const out = [];
  const blockStarts = rows
    .map((r, i) => (labelKey(r?.[0]) === 'date' ? i : -1))
    .filter((i) => i >= 0);

  blockStarts.forEach((start, bi) => {
    const end = bi + 1 < blockStarts.length ? blockStarts[bi + 1] : rows.length;
    const block = rows.slice(start, end);

    const date = toDate(block[0]?.[1]);
    if (!date) return;

    const nameRow = block.find((r) => labelKey(r?.[0]) === 'drivername');
    if (!nameRow) return;

    // Driver columns run left-to-right until the first gap. Past that gap these
    // sheets keep unrelated side-ledgers that must not be read as drivers.
    const drivers = [];
    for (let c = 1; c < nameRow.length; c++) {
      const cell = String(nameRow[c] ?? '').trim();
      if (!cell) break;
      const d = normaliseDriver(cell);
      if (!d) break;
      drivers.push({ col: c, ...d });
    }
    if (!drivers.length) return;

    for (const drv of drivers) {
      const rec = blankSettlement();
      rec.date = date;
      rec.driverName = drv.name;
      rec.shift = drv.shift;
      rec.knownDriver = drv.known;
      rec.source = { workbook: 'income', sheet: sheetName, layout: 'block', row: start };

      for (const row of block) {
        const field = fieldFor(row?.[0]);
        if (!field || field === 'date' || field === 'driverName') continue;
        assign(rec, field, row[drv.col], String(row[0]).trim());
      }

      if (rec.shift && rec.dutyType === 'unknown') rec.dutyType = rec.shift;
      out.push(reconcile(rec));
    }
  });

  return out;
}

/* ------------------------------------------------------------------ *
 * Layout B — one row per driver per date
 * ------------------------------------------------------------------ */

function parseTableSheet(sheetName, rows) {
  const header = rows[0] ?? [];
  const colField = new Map();
  header.forEach((h, i) => {
    const f = fieldFor(h);
    if (f && !colField.has(i)) colField.set(i, f);
  });
  if (!colField.size) return [];

  const out = [];
  let currentDate = null;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row?.length) continue;

    const first = String(row[0] ?? '').trim();
    if (/^total$/i.test(first)) continue; // per-date subtotal row

    // A blank date cell means "same date as the row above" — these sheets merge
    // the date cell across a day's drivers.
    const d = toDate(first);
    if (d) currentDate = d;
    if (!currentDate) continue;

    const drv = normaliseDriver(row[1]);
    if (!drv) continue;

    const rec = blankSettlement();
    rec.date = currentDate;
    rec.driverName = drv.name;
    rec.shift = drv.shift;
    rec.knownDriver = drv.known;
    rec.source = { workbook: 'income', sheet: sheetName, layout: 'table', row: r };

    for (const [col, field] of colField) {
      if (field === 'date' || field === 'driverName') continue;
      assign(rec, field, row[col], String(header[col]).trim());
    }

    // These sheets have no "duty off/on" column; duty shows up as text in the
    // money columns ("leave", "no duty"), which `assign` parked on notes.
    const dutyNote = rec.notes.find((n) => /leave|no duty|rest|servic/i.test(n));
    if (dutyNote) {
      const d2 = parseDuty(dutyNote.split(':').slice(1).join(':'));
      rec.dutyType = d2.dutyType;
      rec.serviceVehicle = d2.serviceVehicle;
    } else if (rec.shift) {
      rec.dutyType = rec.shift;
    }

    out.push(reconcile(rec));
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Public: daily settlements
 * ------------------------------------------------------------------ */

const BLOCK_SHEETS = /^(fy-26-27 \(JULY\)|fy-26-27 \(JUNE\)N|Sheet3)$/i;
const TABLE_SHEETS = /^(FY 25-26 \(FEB-26\)|FY 25-26 \(MARCH-26\)|FY-26-27\(APRIL\)|FY-26-27\(MAY\)|FY-26-27\(JUNE\))$/i;

/**
 * Some periods appear on more than one sheet — "Sheet3" is a working copy of
 * fy-26-27 (JULY), and FY-26-27(JUNE) is an earlier, shorter cut of
 * fy-26-27 (JUNE)N. Importing both would double-count the month's takings.
 *
 * Higher number wins when the same driver/date/shift appears twice.
 */
const SHEET_PRECEDENCE = [
  [/^Sheet3$/i, 1],
  [/^FY-26-27\(JUNE\)$/i, 5],
];
const precedenceOf = (sheet) =>
  SHEET_PRECEDENCE.find(([re]) => re.test(String(sheet).trim()))?.[1] ?? 10;

export const settlementKey = (r) =>
  `${r.date.toISOString().slice(0, 10)}|${r.driverName}|${r.shift ?? ''}`;

/**
 * Collapses duplicates, keeping the record from the canonical sheet.
 *
 * A losing record that disagrees on money is not thrown away — it is attached
 * to the winner as `conflicts` so the discrepancy stays visible in the app
 * instead of being silently resolved at import time.
 */
export function dedupeSettlements(records) {
  const byKey = new Map();

  for (const rec of records) {
    const key = settlementKey(rec);
    const existing = byKey.get(key);
    if (!existing) { byKey.set(key, rec); continue; }

    const [winner, loser] =
      precedenceOf(rec.source.sheet) > precedenceOf(existing.source.sheet)
        ? [rec, existing]
        : [existing, rec];

    if (Math.abs((winner.totalEarnings || 0) - (loser.totalEarnings || 0)) > 1) {
      (winner.conflicts ??= []).push({
        sheet: loser.source.sheet,
        totalEarnings: loser.totalEarnings,
        totalExpense: loser.totalExpense,
        netTotal: loser.netTotal,
      });
    }
    byKey.set(key, winner);
  }

  return [...byKey.values()].sort((a, b) => a.date - b.date || a.driverName.localeCompare(b.driverName));
}

export function parseIncomeWorkbook(wb) {
  const settlements = [];
  for (const [name, rows] of Object.entries(wb)) {
    if (BLOCK_SHEETS.test(name.trim())) settlements.push(...parseBlockSheet(name, rows));
    else if (TABLE_SHEETS.test(name.trim())) settlements.push(...parseTableSheet(name, rows));
  }
  return dedupeSettlements(settlements);
}

/* ------------------------------------------------------------------ *
 * Public: offline invoices
 * ------------------------------------------------------------------ */

export function parseOfflineInvoices(wb) {
  const rows = wb['Offline Feb and march'];
  if (!rows) return [];

  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const [dateRaw, invoiceNo, name, description, amountRaw] = rows[r] ?? [];
    const amount = toNumber(amountRaw);
    if (!invoiceNo || amount == null) continue;

    // Multi-day bookings are written "08.12.2025 to 31.12.2025".
    const [fromRaw, toRaw] = String(dateRaw).split(/\s+to\s+/i);
    out.push({
      invoiceNo: String(invoiceNo).trim(),
      date: toDate(fromRaw),
      endDate: toRaw ? toDate(toRaw) : null,
      customerName: String(name ?? '').trim(),
      description: String(description ?? '').trim(),
      amount,
      source: { workbook: 'income', sheet: 'Offline Feb and march', row: r },
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Public: fuel logs
 * ------------------------------------------------------------------ */

/** Fuel header label → canonical field. */
const FUEL_FIELD = new Map(Object.entries({
  date: 'date',
  name: 'name',
  fuelcng: 'amount',
  kglitre: 'quantity',
  meterreading: 'meter',
  meterreadingvehicle: 'meter',
  vehicle: 'vehicle',
}));

/**
 * Grid layout: repeating column groups across the sheet, one group per driver.
 *
 * Group width is NOT fixed — Feb/March log only Date/Name/Fuel while July adds
 * quantity, meter and vehicle — so each group's columns are resolved from the
 * header labels between one "Date" and the next rather than by a fixed offset.
 */
function parseFuelGrid(sheetName, rows) {
  const headerRow = rows.findIndex((r) => labelKey(r?.[0]) === 'date' || labelKey(r?.[1]) === 'name');
  if (headerRow < 0) return [];
  const header = rows[headerRow];

  const starts = [];
  header.forEach((h, i) => {
    if (labelKey(h) === 'date') starts.push(i);
  });
  if (!starts.length) return [];

  // One {field -> absolute column} map per driver group.
  const groups = starts.map((start, gi) => {
    const end = gi + 1 < starts.length ? starts[gi + 1] : header.length;
    const map = new Map();
    for (let c = start; c < end; c++) {
      const f = FUEL_FIELD.get(labelKey(header[c]));
      if (f && !map.has(f)) map.set(f, c);
    }
    return map;
  });

  const out = [];
  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row?.length) continue;

    for (const group of groups) {
      const cell = (k) => (group.has(k) ? row[group.get(k)] : undefined);
      const date = toDate(cell('date'));
      if (!date) continue;

      const drv = normaliseDriver(cell('name'));
      if (!drv) continue;

      const amount = toFuelAmount(cell('amount'));
      let quantity = toFuelAmount(cell('quantity'));
      const meterRaw = cell('meter');
      const meter = toMeterReading(meterRaw);

      // Guard against a mis-keyed cell (a date serial in the KG/Litre column).
      let quantityNote = '';
      if (quantity != null && quantity > MAX_PLAUSIBLE_QUANTITY) {
        quantityNote = `implausible quantity in the book: ${String(cell('quantity')).trim()}`;
        quantity = null;
      }

      // A row with a name but no fill is just the pre-printed calendar.
      if (amount == null && quantity == null && meter == null) continue;

      out.push({
        date,
        driverName: drv.name,
        amount: amount ?? 0,
        quantity: quantity ?? 0,
        meterReading: meter,
        meterNote: [
          meter == null && isText(meterRaw) ? String(meterRaw).trim() : '',
          quantityNote,
        ].filter(Boolean).join(' · '),
        vehicleCode: String(cell('vehicle') ?? '').trim(),
        dutyType: null,
        startKm: null,
        endKm: null,
        known: drv.known,
        source: {
          workbook: 'fuel', sheet: sheetName, layout: 'grid',
          row: r, col: group.get('date'),
        },
      });
    }
  }
  return out;
}

/**
 * Per-driver layout: one sheet named "<Driver> (Month)", one row per date, with
 * duty-on/duty-off odometer readings alongside the fill.
 */
function parseFuelPerDriver(sheetName, rows) {
  const drv = normaliseDriver(sheetName);
  if (!drv) return [];

  const header = (rows[0] ?? []).map(labelKey);
  const idx = (...keys) => {
    for (const k of keys) {
      const i = header.indexOf(k);
      if (i >= 0) return i;
    }
    return -1;
  };

  const cDate    = idx('date');
  const cDuty    = idx('dutytype');
  const cOnKm    = idx('dutyonkm');
  const cAmount  = idx('fuelcng');
  const cQty     = idx('kglitre');
  const cMeter   = idx('meterreadingvehicle', 'meterreading');
  const cOffKm   = idx('dutyoffkm');
  const cVehicle = idx('vehicle');
  if (cDate < 0) return [];

  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row?.length) continue;

    const date = toDate(row[cDate]);
    if (!date) continue;

    const amount = toFuelAmount(row[cAmount]);
    let quantity = toFuelAmount(row[cQty]);
    const meterRaw = cMeter >= 0 ? row[cMeter] : null;
    const meter = toMeterReading(meterRaw);

    let quantityNote = '';
    if (quantity != null && quantity > MAX_PLAUSIBLE_QUANTITY) {
      quantityNote = `implausible quantity in the book: ${String(row[cQty]).trim()}`;
      quantity = null;
    }
    const duty = cDuty >= 0 ? parseDuty(row[cDuty]) : null;

    const hasAny =
      amount != null || quantity != null || meter != null ||
      (duty && duty.dutyType !== 'unknown');
    if (!hasAny) continue;

    out.push({
      date,
      driverName: drv.name,
      amount: amount ?? 0,
      quantity: quantity ?? 0,
      meterReading: meter,
      meterNote: [
        meter == null && isText(meterRaw) ? String(meterRaw).trim() : '',
        quantityNote,
      ].filter(Boolean).join(' · '),
      vehicleCode: cVehicle >= 0 ? String(row[cVehicle] ?? '').trim() : '',
      dutyType: duty ? duty.dutyType : null,
      startKm: cOnKm >= 0 ? toNumber(row[cOnKm]) : null,
      endKm: cOffKm >= 0 ? toNumber(row[cOffKm]) : null,
      known: drv.known,
      source: { workbook: 'fuel', sheet: sheetName, layout: 'per-driver', row: r },
    });
  }
  return out;
}

export function parseFuelWorkbook(wb) {
  const out = [];
  for (const [name, rows] of Object.entries(wb)) {
    const n = name.trim();
    if (/^FUEL details/i.test(n)) out.push(...parseFuelGrid(name, rows));
    else if (normaliseDriver(n)) out.push(...parseFuelPerDriver(name, rows));
    // "earnings APRIL-26" duplicates the income book and is skipped.
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Public: company cash book ("CSC- Cash Book 2026-27.xlsx")
 * ------------------------------------------------------------------ */

/** Cash-book header label → canonical category. */
const CASHBOOK_FIELD = new Map(Object.entries({
  onlineride:   ['credits', 'onlineRide'],
  offlineride:  ['credits', 'offlineRide'],
  rental:       ['credits', 'rental'],
  school:       ['credits', 'school'],
  bysudhirsir:  ['credits', 'bySudhirSir'],
  byother:      ['credits', 'byOther'],
  pertol:       ['debits', 'petrol'],   // spelled "Pertol" in the book
  petrol:       ['debits', 'petrol'],
  cng:          ['debits', 'cng'],
  toll:         ['debits', 'toll'],
  repair:       ['debits', 'repair'],
  salary:       ['debits', 'salary'],
  schoolsalary: ['debits', 'schoolSalary'],
  challan:      ['debits', 'challan'],
  carrent:      ['debits', 'carRent'],
  insurance:    ['debits', 'insurance'],
  other:        ['debits', 'other'],
}));

const CASHBOOK_BALANCE = new Map(Object.entries({
  opening: 'opening',
  closing: 'closing',
  remarks: 'remarks',
}));

/**
 * Parses one cash-book sheet.
 *
 * The header spans two rows: row 0 names the category, row 1 names the account
 * ("Cash"/"Bank" on the Credit sheet, "ICICI"/"BOI" on the bank sheets). A
 * category that spans two accounts leaves row 0 blank above the second column,
 * so the category name carries forward until the next one appears.
 *
 * Rows without a real date are the sheet's own subtotals ("1st Quarter",
 * "June", "Month Wise") and are skipped — importing them would double-count
 * every figure they summarise.
 */
function parseCashBookSheet(sheetName, rows, defaultAccount) {
  const head0 = rows[0] ?? [];
  const head1 = rows[1] ?? [];
  if (!head0.length) return [];

  // Resolve each column to { account, group, field } or a balance field.
  const columns = [];
  let currentCategory = '';
  for (let c = 2; c < head0.length; c++) {
    if (String(head0[c] ?? '').trim()) currentCategory = String(head0[c]).trim();

    const catKey = labelKey(currentCategory);
    const accountLabel = labelKey(head1[c]) || defaultAccount;
    const account =
      accountLabel === 'cash' ? 'cash'
      : accountLabel === 'bank' ? 'bank'
      : accountLabel === 'icici' ? 'icici'
      : accountLabel === 'boi' ? 'boi'
      : defaultAccount;

    const balance = CASHBOOK_BALANCE.get(catKey);
    if (balance) { columns.push({ col: c, account, balance }); continue; }

    const mapped = CASHBOOK_FIELD.get(catKey);
    // CR/DR are the sheet's own totals of the category columns; recomputed.
    if (mapped) columns.push({ col: c, account, group: mapped[0], field: mapped[1] });
  }
  if (!columns.length) return [];

  const byKey = new Map();

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row?.length) continue;

    const date = toDate(row[1]);
    if (!date) continue; // subtotal / label row

    for (const spec of columns) {
      const raw = row[spec.col];
      const key = `${spec.account}|${date.toISOString().slice(0, 10)}`;

      let rec = byKey.get(key);
      if (!rec) {
        rec = {
          date,
          account: spec.account,
          credits: {},
          debits: {},
          opening: 0,
          closing: 0,
          remarks: '',
          source: { workbook: 'cashbook', sheet: sheetName, row: r },
        };
        byKey.set(key, rec);
      }

      if (spec.balance === 'remarks') {
        const s = String(raw ?? '').trim();
        if (s) rec.remarks = s;
        continue;
      }
      const n = toNumber(raw);
      if (n == null) continue;
      if (spec.balance) rec[spec.balance] = n;
      else rec[spec.group][spec.field] = n;
    }
  }

  /*
   * Keep only days where money actually moved.
   *
   * The workbook is pre-filled with a row for every date of the financial year,
   * and the bank sheets seed a placeholder opening/closing of 1 on all of them.
   * Without this filter a book containing one real day imports as a thousand
   * empty ones, and every report is buried in noise. An opening balance with no
   * credit or debit against it is the template carrying a figure forward, not a
   * transaction — it is re-derivable from the last day that did move.
   */
  return [...byKey.values()].filter((rec) => {
    const anyCredit = Object.values(rec.credits).some((v) => v);
    const anyDebit = Object.values(rec.debits).some((v) => v);
    return anyCredit || anyDebit || Boolean(rec.remarks);
  });
}

export function parseCashBook(wb) {
  const out = [];
  for (const [name, rows] of Object.entries(wb)) {
    const n = name.trim().toLowerCase();
    if (n === 'credit') out.push(...parseCashBookSheet(name, rows, 'cash'));
    else if (n === 'icici') out.push(...parseCashBookSheet(name, rows, 'icici'));
    else if (n === 'boi') out.push(...parseCashBookSheet(name, rows, 'boi'));
    // "Report" is a pivot over the other sheets — nothing of its own to import.
  }
  return out.sort((a, b) => a.date - b.date || a.account.localeCompare(b.account));
}

/* ------------------------------------------------------------------ *
 * Public: the "earnings APRIL-26" sheet
 * ------------------------------------------------------------------ */

/**
 * April's per-driver daily summary, carried in the fuel workbook.
 *
 * Two things to know about this sheet:
 *
 *  1. It is mislabelled. The date serials decode to MAY 2026, not April.
 *  2. Its "Earning" column disagrees with the income book on 47 of 48 days,
 *     so the two are independent records of the same month rather than one
 *     being a copy of the other.
 *
 * Because of (2) these rows are imported as annotations against the existing
 * settlements — never merged into them. Grafting this sheet's carry-forward
 * onto income-book figures would produce rows whose own arithmetic does not
 * add up, which is worse than having no carry-forward at all. Staff can see
 * both readings and settle it against the original book.
 */
export function parseAprilEarnings(wb) {
  const rows = wb['earnings APRIL-26 '] ?? wb['earnings APRIL-26'];
  if (!rows) return [];

  const nameRow = rows[0] ?? [];
  const headerRow = rows[1] ?? [];

  // Driver groups start at each "Date" header, with the name sitting above it.
  const groups = [];
  headerRow.forEach((h, i) => {
    if (labelKey(h) !== 'date') return;
    // The name may sit above the Date column or just before it.
    const drv = normaliseDriver(nameRow[i]) ?? normaliseDriver(nameRow[i - 1]);
    if (!drv) return;

    const map = new Map();
    for (let c = i; c < headerRow.length; c++) {
      const key = labelKey(headerRow[c]);
      if (c > i && key === 'date') break; // next group
      if (key === 'date') map.set('date', c);
      else if (key === 'fuelcng') map.set('fuel', c);
      else if (key === 'toll') map.set('toll', c);
      else if (key === 'earning') map.set('earning', c);
      else if (key === 'restamount') map.set('rest', c);
    }
    if (map.has('date') && map.has('rest')) groups.push({ driver: drv.name, map });
  });

  const out = [];
  for (let r = 2; r < rows.length; r++) {
    const row = rows[r];
    if (!row?.length) continue;

    for (const g of groups) {
      const cell = (k) => (g.map.has(k) ? row[g.map.get(k)] : undefined);
      const date = toDate(cell('date'));
      if (!date) continue;

      const rest = toNumber(cell('rest'));
      const earning = toNumber(cell('earning'));
      const fuel = toNumber(cell('fuel'));
      const toll = toNumber(cell('toll'));
      // A pre-printed calendar row with nothing filled in.
      if (rest == null && earning == null && fuel == null && toll == null) continue;

      out.push({
        date,
        driverName: g.driver,
        fuelExpense: fuel,
        tollExpense: toll,
        earning,
        closingBalance: rest,
        source: { workbook: 'fuel', sheet: 'earnings APRIL-26', row: r },
      });
    }
  }
  return out;
}
