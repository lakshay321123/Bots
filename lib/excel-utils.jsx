// Pure, stateless utilities used by every converter flow. Kept here so the
// one-file and two-file paths literally share the same parsing / profiling /
// filtering logic without either flow being able to mutate the other's state.

import React from 'react';
import { Hash, Type, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';

// localStorage-backed shim mirroring the Claude artifact storage API.
// Returns null on the server so the flows degrade gracefully during SSR.
export const storage = {
  async get(key) {
    if (typeof window === 'undefined') return null;
    const value = window.localStorage.getItem(key);
    if (value === null) return null;
    return { key, value };
  },
  async set(key, value) {
    if (typeof window === 'undefined') return null;
    window.localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    if (typeof window === 'undefined') return null;
    window.localStorage.removeItem(key);
    return { key, deleted: true };
  },
};

// Spreadsheet column letters: 0 -> A, 25 -> Z, 26 -> AA, ...
export function getColumnLetter(index) {
  let letter = '';
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

// Stable short hash of a set of column names, used to match a freshly-uploaded
// file against a saved template. Sorted so column order doesn't affect the hash.
export function hashColumnSignature(columnNames) {
  const str = [...columnNames].map(n => String(n || '').trim().toLowerCase()).sort().join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Profile a single column from a set of rows: fill rate, uniqueness, and a
// cheap type guess (number / date / text / empty) used to decorate the UI.
export function profileColumn(rows, colIndex) {
  const values = rows.map(r => r.data[colIndex]);
  const total = values.length;
  const nonEmpty = values.filter(v => v !== '' && v !== null && v !== undefined);
  const emptyPct = total === 0 ? 0 : Math.round(((total - nonEmpty.length) / total) * 100);
  const uniqueCount = new Set(nonEmpty.map(v => String(v))).size;

  let numCount = 0, dateCount = 0;
  const sample = nonEmpty.slice(0, 50);
  for (const v of sample) {
    const s = String(v).trim();
    if (s === '') continue;
    if (!isNaN(Number(s)) && /^-?\d+(\.\d+)?$/.test(s)) numCount++;
    else if (/\d{1,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,4}/.test(s) && !isNaN(Date.parse(s))) dateCount++;
  }

  let type = 'text';
  if (sample.length > 0) {
    if (numCount / sample.length > 0.7) type = 'number';
    else if (dateCount / sample.length > 0.6) type = 'date';
  }
  if (total > 0 && nonEmpty.length === 0) type = 'empty';

  return { emptyPct, uniqueCount, type, total, nonEmpty: nonEmpty.length };
}

// Evaluate a single filter rule against a row's cell values.
// Used by both flows to compute effectivelySelectedRows.
export function evaluateRule(rule, rowData) {
  if (rule.colIdx == null) return true;
  const raw = rowData[rule.colIdx];
  const val = String(raw ?? '').trim().toLowerCase();
  const compareVal = String(rule.value ?? '').trim().toLowerCase();

  switch (rule.operator) {
    case 'equals': return val === compareVal;
    case 'not_equals': return val !== compareVal;
    case 'contains': return compareVal === '' ? true : val.includes(compareVal);
    case 'not_contains': return compareVal === '' ? true : !val.includes(compareVal);
    case 'starts_with': return val.startsWith(compareVal);
    case 'ends_with': return val.endsWith(compareVal);
    case 'is_empty': return val === '';
    case 'is_not_empty': return val !== '';
    case 'greater_than': {
      const a = Number(val), b = Number(compareVal);
      return !isNaN(a) && !isNaN(b) && a > b;
    }
    case 'less_than': {
      const a = Number(val), b = Number(compareVal);
      return !isNaN(a) && !isNaN(b) && a < b;
    }
    default: return true;
  }
}

export const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
];

// Tiny icon that picks the right lucide glyph for a column's profiled type.
export function TypeIcon({ type, size = 10 }) {
  if (type === 'number') return <Hash size={size} />;
  if (type === 'date') return <CalendarIcon size={size} />;
  if (type === 'empty') return <AlertTriangle size={size} />;
  return <Type size={size} />;
}

// Format a JS Date as YYYY-MM-DD (ISO). If the time is non-midnight we
// include HH:MM. Anything non-Date passes through untouched.
export function formatDateValue(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    const hh = v.getHours(), mm = v.getMinutes(), ss = v.getSeconds();
    if (hh === 0 && mm === 0 && ss === 0) return `${y}-${m}-${d}`;
    return `${y}-${m}-${d} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  return v;
}

// Walk the matrix and ISO-format any Date cells, leaving everything else alone.
export function normalizeDates(matrix) {
  return matrix.map(row =>
    Array.isArray(row) ? row.map(cell => (cell instanceof Date ? formatDateValue(cell) : cell)) : row
  );
}

// Score a candidate row's "header-likeness": string-heavy, mostly unique,
// not full of numbers. Used by detectHeaderRow below.
function scoreHeaderRow(row) {
  if (!Array.isArray(row) || row.length === 0) return 0;
  const cells = row.map(c => (c == null ? '' : String(c).trim()));
  const nonEmpty = cells.filter(c => c !== '');
  if (nonEmpty.length === 0) return 0;
  const fillRatio = nonEmpty.length / cells.length;
  const stringy = nonEmpty.filter(c => isNaN(Number(c))).length / nonEmpty.length;
  const unique = new Set(nonEmpty.map(c => c.toLowerCase())).size / nonEmpty.length;
  const widthBonus = Math.min(cells.length / 6, 1);
  return fillRatio * 0.3 + stringy * 0.4 + unique * 0.2 + widthBonus * 0.1;
}

// Auto-detect the most likely header row in the first ~10 rows.
// Used when a file has preamble junk (merged title bars, blank rows) before
// the real headers.
export function detectHeaderRow(matrix) {
  const candidates = matrix.slice(0, 10);
  let bestIdx = 0, bestScore = -1;
  candidates.forEach((row, i) => {
    const s = scoreHeaderRow(row);
    if (s > bestScore) { bestScore = s; bestIdx = i; }
  });
  return bestIdx;
}

// Decode a CSV file as text, auto-detecting UTF-16 BOM variants.
// Defaults to UTF-8 (which also handles BOM-prefixed UTF-8).
export async function readFileAsText(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf, 0, Math.min(4, buf.byteLength));
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(buf);
  }
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(buf);
  }
  return new TextDecoder('utf-8').decode(buf);
}
