/**
 * Minimal .xlsx reader — zero dependencies.
 *
 * An .xlsx file is a ZIP containing XML. We only need cell text out of it, so
 * rather than pull in a parser dependency (and its supply-chain surface) we
 * inflate the archive with node:zlib and pull values with regex over the XML.
 *
 * Supported: shared strings, inline strings, numbers, and multi-sheet workbooks.
 * Not supported: formulas (the cached value is read instead), styles, dates as
 * anything other than the raw Excel serial — see toDate() in ./sheetParse.mjs.
 */
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

/* ------------------------------------------------------------------ *
 * ZIP
 * ------------------------------------------------------------------ */

/** Reads the ZIP central directory and inflates every entry into a Map. */
function unzip(buf) {
  // Locate End Of Central Directory record by scanning backwards for its magic.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a zip file (no EOCD record)');

  const entryCount = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);

  const files = new Map();
  for (let i = 0; i < entryCount; i++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break; // central file header magic
    const method     = buf.readUInt16LE(ptr + 10);
    const compSize   = buf.readUInt32LE(ptr + 20);
    const nameLen    = buf.readUInt16LE(ptr + 28);
    const extraLen   = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOff   = buf.readUInt32LE(ptr + 42);
    const name       = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);

    // The local header repeats name/extra with its own lengths — the central
    // directory's extra length is not reliable for finding the data start.
    const lNameLen  = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);

    files.set(name, method === 0 ? raw : inflateRawSync(raw));
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

/* ------------------------------------------------------------------ *
 * XML
 * ------------------------------------------------------------------ */

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
};

function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => ENTITIES[m]);
}

/** Concatenates every <t> run inside a fragment — how Excel stores rich text. */
function textRuns(xml) {
  let out = '';
  const re = /<t[^>]*>([\s\S]*?)<\/t>/g;
  let m;
  while ((m = re.exec(xml))) out += decode(m[1]);
  return out;
}

/** Converts a cell ref like "AB12" to a zero-based column index. */
function colIndex(ref) {
  const letters = /^([A-Z]+)/.exec(ref)?.[1] ?? 'A';
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/* ------------------------------------------------------------------ *
 * Workbook
 * ------------------------------------------------------------------ */

function parseSharedStrings(xml) {
  if (!xml) return [];
  const out = [];
  const re = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(xml))) out.push(textRuns(m[1]));
  return out;
}

function parseSheet(xml, shared) {
  const rows = [];
  // Empty rows are written self-closing (<row r="7"/>). Matching only the
  // paired form would drop them and shift every subsequent row index.
  const rowRe = /<row\s([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
  let rowMatch;

  while ((rowMatch = rowRe.exec(xml))) {
    rowMatch[1] = rowMatch[2] ?? '';
    const cells = new Map();
    // Cells may be self-closing (<c r="A1"/>) when they carry only styling.
    const cellRe = /<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch;

    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      const attrs = cellMatch[1];
      const body  = cellMatch[2] ?? '';
      const ref   = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
      if (!ref) continue;
      const type = /t="([^"]+)"/.exec(attrs)?.[1];

      let value;
      if (type === 'inlineStr') {
        value = textRuns(body);
      } else if (type === 's') {
        const idx = Number(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1]);
        value = shared[idx] ?? '';
      } else {
        // Numbers, booleans, and formula results all live in <v>.
        value = decode(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? '');
      }

      value = String(value).trim();
      if (value) cells.set(colIndex(ref), value);
    }

    if (cells.size === 0) { rows.push([]); continue; }
    const width = Math.max(...cells.keys()) + 1;
    rows.push(Array.from({ length: width }, (_, i) => cells.get(i) ?? ''));
  }
  return rows;
}

/**
 * Reads a workbook into `{ [sheetName]: string[][] }`.
 * Every cell is a trimmed string; empty cells are ''.
 */
export function readWorkbook(filePath) {
  const files = unzip(readFileSync(filePath));
  const text = (name) => (files.has(name) ? files.get(name).toString('utf8') : null);

  const shared = parseSharedStrings(text('xl/sharedStrings.xml'));

  // Sheet name → part path, resolved through the workbook relationships.
  const relsXml = text('xl/_rels/workbook.xml.rels') ?? '';
  const rels = new Map();
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1];
    const target = /Target="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) rels.set(id, target.startsWith('/') ? target.slice(1) : target);
  }

  const wbXml = text('xl/workbook.xml') ?? '';
  const out = {};
  for (const m of wbXml.matchAll(/<sheet\b[^>]*>/g)) {
    const name = decode(/name="([^"]*)"/.exec(m[0])?.[1] ?? '');
    const rid  = /r:id="([^"]+)"/.exec(m[0])?.[1];
    let target = rels.get(rid);
    if (!target) continue;
    if (!target.startsWith('xl/')) target = 'xl/' + target;
    const sheetXml = text(target);
    if (sheetXml) out[name] = parseSheet(sheetXml, shared);
  }
  return out;
}
