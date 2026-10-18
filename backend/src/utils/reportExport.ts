// backend/src/utils/reportExport.ts
//
// Turns ANY report (a nested JSON object, as the report screens receive it) into real files:
//   CSV (opens in Excel with the right characters), Excel (.xlsx, one sheet per table) and PDF.
//
// The old export had one hand-written converter per report type, and they read field names the reports
// never return, so the Financial and Revenue exports came out empty and "Excel" / "PDF" were just CSV.
// This works from the report's own shape instead, so every current and future report exports correctly.

import XLSX from 'xlsx';
// @ts-ignore  pdfkit has no type package in this project (@types/pdfkit is not installed)
import PDFDocument from 'pdfkit';

export type Cell = string | number | boolean | null;

export interface ReportTable {
  title: string;
  columns: string[];
  rows: Cell[][];
}

export interface ReportMeta {
  title: string;
  facility: string[];   // lines for the header block (name, district, codes ...)
  period: string;       // "2026-10-01 to 2026-10-15"
  generated: string;
}

export interface ReportDocument {
  meta: ReportMeta;
  tables: ReportTable[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Report JSON -> tables
// ─────────────────────────────────────────────────────────────────────────────

const SKIP_KEYS = new Set([
  'reportType', 'facility', 'period', 'reportPeriod', 'generatedAt', 'reportGenerated',
  'csv', 'submissionId', 'success', 'message',
]);
const MAX_ROWS = 50_000;
const MAX_COLUMNS = 80;
const MAX_DEPTH = 4;
const SEP = ' / ';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date);

const isScalar = (v: unknown): boolean =>
  v === null || v === undefined || ['string', 'number', 'boolean'].includes(typeof v) || v instanceof Date;

/** "totalNewCases" / "total_new_cases" -> "Total New Cases"; labels that already read well are kept. */
export function humanize(key: string): string {
  if (!key) return '';
  if (!/^[A-Za-z0-9_]+$/.test(key)) return key;                       // "<1 year", "20-34" ... keep as written
  const spaced = key.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  return spaced.replace(/\b([a-z])/g, c => c.toUpperCase());
}

function cell(value: unknown): Cell {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().replace('T', ' ').slice(0, 16);
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  const text = String(value);
  // ISO timestamps read better as "2026-10-15 09:30"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return text.replace('T', ' ').slice(0, 16);
  return text;
}

/** One level of an object, flattened to { "A / B / C": scalar } (arrays collapse to text). */
function flatten(obj: Record<string, unknown>, prefix = '', depth = 0, out: Record<string, Cell> = {}): Record<string, Cell> {
  for (const [key, value] of Object.entries(obj)) {
    const label = prefix ? `${prefix}${SEP}${humanize(key)}` : humanize(key);
    if (isScalar(value)) {
      out[label] = cell(value);
    } else if (Array.isArray(value)) {
      out[label] = value.every(isScalar) ? value.map(v => String(cell(v))).join('; ') : `${value.length} items`;
    } else if (isPlainObject(value) && depth < MAX_DEPTH) {
      flatten(value, label, depth + 1, out);
    } else {
      out[label] = '';
    }
  }
  return out;
}

const containsArray = (value: unknown, depth = 0): boolean => {
  if (Array.isArray(value)) return true;
  if (!isPlainObject(value) || depth > MAX_DEPTH) return false;
  return Object.values(value).some(v => containsArray(v, depth + 1));
};

function tableFromRecords(title: string, records: Array<Record<string, Cell>>, firstColumn?: { name: string; values: string[] }): ReportTable | null {
  if (records.length === 0) return null;
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!seen.has(key) && columns.length < MAX_COLUMNS) { seen.add(key); columns.push(key); }
    }
  }
  const rows = records.slice(0, MAX_ROWS).map((record, i) => {
    const row = columns.map(c => (c in record ? record[c] : ''));
    return firstColumn ? [firstColumn.values[i], ...row] : row;
  });
  return { title, columns: firstColumn ? [firstColumn.name, ...columns] : columns, rows };
}

function addArrayTable(tables: ReportTable[], title: string, list: unknown[]) {
  if (list.length === 0) return;
  if (list.every(isScalar)) {
    tables.push({ title, columns: ['Value'], rows: list.slice(0, MAX_ROWS).map(v => [cell(v)]) });
    return;
  }
  const records = list.slice(0, MAX_ROWS).map(item =>
    isPlainObject(item) ? flatten(item) : { Value: cell(item) },
  );
  const table = tableFromRecords(title, records);
  if (table) tables.push(table);
}

function addObject(tables: ReportTable[], summary: Array<[string, Cell]>, title: string, value: Record<string, unknown>, depth = 0) {
  const entries = Object.entries(value);
  if (entries.length === 0) return;

  // A container of lists / sub-reports: one table per part
  if (containsArray(value)) {
    for (const [key, child] of entries) {
      if (SKIP_KEYS.has(key)) continue;
      const childTitle = title ? `${title}${SEP}${humanize(key)}` : humanize(key);
      if (isScalar(child)) summary.push([childTitle, cell(child)]);
      else if (Array.isArray(child)) addArrayTable(tables, childTitle, child);
      else if (isPlainObject(child) && depth < MAX_DEPTH) addObject(tables, summary, childTitle, child, depth + 1);
    }
    return;
  }

  // Every value is itself an object (e.g. disease -> age group -> male/female): one row per key
  if (entries.every(([, v]) => isPlainObject(v))) {
    const records = entries.map(([, v]) => flatten(v as Record<string, unknown>));
    const table = tableFromRecords(title || 'Details', records, {
      name: 'Item',
      values: entries.map(([k]) => humanize(k)),
    });
    if (table) tables.push(table);
    return;
  }

  // Plain figures: a two-column Item / Value list
  const flat = flatten(value);
  const rows = Object.entries(flat).map(([k, v]) => [k, v] as Cell[]);
  if (rows.length) tables.push({ title: title || 'Summary', columns: ['Item', 'Value'], rows });
}

function dateText(value: unknown): string {
  if (!value) return '';
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
}

export function reportToDocument(report: unknown, fallbackTitle: string, generatedAt: Date = new Date()): ReportDocument {
  // The screens may hold the response wrapper ({ success, data }) or the report itself
  let data: any = report;
  while (isPlainObject(data) && 'data' in data && isPlainObject(data.data) && Object.keys(data).every(k => ['success', 'message', 'data', 'csv', 'submissionId'].includes(k))) {
    data = data.data;
  }

  const facility: string[] = [];
  const f: any = isPlainObject(data) ? data.facility : null;
  if (isPlainObject(f)) {
    if (f.name) facility.push(String(f.name));
    const bits = [f.district && `District: ${f.district}`, f.ghfCode && `GHS code: ${f.ghfCode}`, f.nhisFacilityCode && `NHIS code: ${f.nhisFacilityCode}`].filter(Boolean);
    if (bits.length) facility.push(bits.join('   '));
  }

  const p: any = isPlainObject(data) ? (data.period || data.reportPeriod) : null;
  const period = isPlainObject(p) && (p.startDate || p.endDate)
    ? `${dateText(p.startDate) || 'Beginning'} to ${dateText(p.endDate) || 'Now'}`
    : '';

  const title = isPlainObject(data) && typeof data.reportType === 'string'
    ? humanize(data.reportType.toLowerCase().replace(/[^a-z0-9]+/g, '_'))
    : fallbackTitle;

  const tables: ReportTable[] = [];
  if (Array.isArray(data)) {
    addArrayTable(tables, fallbackTitle || 'Report', data);
  } else if (isPlainObject(data)) {
    const summary: Array<[string, Cell]> = [];
    const top = Object.entries(data).filter(([k]) => !SKIP_KEYS.has(k));
    // top-level plain figures first
    const scalars = top.filter(([, v]) => isScalar(v));
    scalars.forEach(([k, v]) => summary.push([humanize(k), cell(v)]));
    const parts = top.filter(([, v]) => !isScalar(v));
    const partTables: ReportTable[] = [];
    for (const [key, value] of parts) {
      if (Array.isArray(value)) addArrayTable(partTables, humanize(key), value);
      else if (isPlainObject(value)) addObject(partTables, summary, humanize(key), value);
    }
    if (summary.length) tables.push({ title: 'Summary', columns: ['Item', 'Value'], rows: summary.map(([k, v]) => [k, v]) });
    tables.push(...partTables);
  }

  return {
    meta: {
      title: title || fallbackTitle,
      facility,
      period,
      generated: generatedAt.toISOString().replace('T', ' ').slice(0, 16),
    },
    tables,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CSV
// ─────────────────────────────────────────────────────────────────────────────

function csvField(value: Cell): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return String(value);
  let text = String(value);
  // A text cell that starts with = + - @ is run as a formula by Excel: neutralise it
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function documentToCsv(doc: ReportDocument): Buffer {
  const lines: string[] = [];
  const line = (cells: Cell[]) => lines.push(cells.map(csvField).join(','));

  line([doc.meta.title]);
  doc.meta.facility.forEach(f => line([f]));
  if (doc.meta.period) line([`Period: ${doc.meta.period}`]);
  line([`Generated: ${doc.meta.generated}`]);

  for (const table of doc.tables) {
    lines.push('');
    line([table.title]);
    line(table.columns);
    table.rows.forEach(row => line(row));
  }
  // BOM so Excel reads UTF-8 (names with accents) correctly; CRLF line ends for Windows tools
  return Buffer.from('﻿' + lines.join('\r\n') + '\r\n', 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Excel (.xlsx)
// ─────────────────────────────────────────────────────────────────────────────

function sheetName(title: string, used: Set<string>): string {
  const base = (title.replace(/[\[\]:*?\/\\]/g, ' ').replace(/\s+/g, ' ').trim() || 'Sheet').slice(0, 28);
  let name = base;
  let n = 2;
  while (used.has(name.toLowerCase())) name = `${base.slice(0, 26)} ${n++}`;
  used.add(name.toLowerCase());
  return name;
}

function widths(aoa: Cell[][]): Array<{ wch: number }> {
  const count = Math.max(0, ...aoa.map(r => r.length));
  const out: Array<{ wch: number }> = [];
  for (let c = 0; c < count; c++) {
    let max = 8;
    for (const row of aoa.slice(0, 500)) max = Math.max(max, String(row[c] ?? '').length);
    out.push({ wch: Math.min(60, max + 2) });
  }
  return out;
}

export function documentToXlsx(doc: ReportDocument): Buffer {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();

  const info: Cell[][] = [[doc.meta.title]];
  doc.meta.facility.forEach(f => info.push([f]));
  if (doc.meta.period) info.push([`Period: ${doc.meta.period}`]);
  info.push([`Generated: ${doc.meta.generated}`]);
  info.push([]);
  info.push(['Sheets in this file']);
  doc.tables.forEach(t => info.push([t.title]));
  const infoSheet = XLSX.utils.aoa_to_sheet(info);
  infoSheet['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, infoSheet, sheetName('Report', used));

  for (const table of doc.tables) {
    const aoa: Cell[][] = [table.columns, ...table.rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = widths(aoa);
    XLSX.utils.book_append_sheet(wb, ws, sheetName(table.title, used));
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PDF
// ─────────────────────────────────────────────────────────────────────────────

const fmtPdf = (v: Cell): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    return Number.isInteger(v)
      ? v.toLocaleString('en-GB')
      : v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(v);
};

export function documentToPdf(doc: ReportDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf: any = new PDFDocument({ size: 'A4', layout: 'landscape', margins: { top: 36, bottom: 44, left: 36, right: 36 }, bufferPages: true, info: { Title: doc.meta.title } });
    const chunks: Buffer[] = [];
    pdf.on('data', (c: Buffer) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);

    const left = pdf.page.margins.left;
    const usable = pdf.page.width - left - pdf.page.margins.right;
    const bottom = () => pdf.page.height - pdf.page.margins.bottom;

    // ── header ──
    pdf.font('Helvetica-Bold').fontSize(15).fillColor('#111').text(doc.meta.title, left, pdf.y, { width: usable });
    pdf.font('Helvetica').fontSize(9).fillColor('#444');
    doc.meta.facility.forEach(f => pdf.text(f, { width: usable }));
    if (doc.meta.period) pdf.text(`Period: ${doc.meta.period}`, { width: usable });
    pdf.text(`Generated: ${doc.meta.generated}`, { width: usable });
    pdf.moveDown(0.8);

    const MAX_COLS_PER_BLOCK = 8;
    const FONT = 8;
    const PAD = 3;

    for (const table of doc.tables) {
      // wide tables are split into column blocks; the first column repeats in each block
      const colCount = table.columns.length;
      const blocks: number[][] = [];
      if (colCount <= MAX_COLS_PER_BLOCK) {
        blocks.push(table.columns.map((_, i) => i));
      } else {
        for (let start = 1; start < colCount; start += MAX_COLS_PER_BLOCK - 1) {
          const idx = [0];
          for (let i = start; i < Math.min(colCount, start + MAX_COLS_PER_BLOCK - 1); i++) idx.push(i);
          blocks.push(idx);
        }
      }

      blocks.forEach((cols, blockNo) => {
        // titles need ~60pt so a heading is never left alone at the foot of a page
        if (pdf.y + 60 > bottom()) pdf.addPage();
        pdf.font('Helvetica-Bold').fontSize(10).fillColor('#111')
          .text(blocks.length > 1 ? `${table.title} (part ${blockNo + 1} of ${blocks.length})` : table.title, left, pdf.y, { width: usable });
        pdf.moveDown(0.3);

        // column widths: first column gets more room when it holds labels
        const first = cols.length > 1 ? Math.min(usable * 0.32, usable / cols.length * 1.8) : usable;
        const other = cols.length > 1 ? (usable - first) / (cols.length - 1) : 0;
        const widthOf = (i: number) => (i === 0 ? first : other);
        const xOf = (i: number) => left + Array.from({ length: i }, (_, k) => widthOf(k)).reduce((a, b) => a + b, 0);

        // columns that hold numbers are right-aligned, headers included
        const numericCols = new Set<number>();
        cols.forEach((c, pos) => {
          if (pos === 0) return;
          const sample = table.rows.slice(0, 50).map(r => r[c]).filter(v => v !== '' && v !== null && v !== undefined);
          if (sample.length > 0 && sample.every(v => typeof v === 'number')) numericCols.add(pos);
        });

        const drawRow = (cells: string[], header: boolean) => {
          pdf.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(FONT);
          const heights = cells.map((t, i) => pdf.heightOfString(t, { width: widthOf(i) - PAD * 2 }));
          const rowH = Math.min(70, Math.max(...heights) + PAD * 2);
          if (pdf.y + rowH > bottom()) { pdf.addPage(); if (!header) drawHeader(); pdf.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(FONT); }
          const y = pdf.y;
          if (header) pdf.rect(left, y, usable, rowH).fill('#E8EEF2');
          cells.forEach((t, i) => {
            const numeric = numericCols.has(i);
            pdf.fillColor('#111').text(t, xOf(i) + PAD, y + PAD, { width: widthOf(i) - PAD * 2, height: rowH - PAD, align: numeric ? 'right' : 'left', ellipsis: true });
          });
          pdf.moveTo(left, y + rowH).lineTo(left + usable, y + rowH).lineWidth(0.3).strokeColor('#C8D0D6').stroke();
          pdf.y = y + rowH;
        };
        const drawHeader = () => drawRow(cols.map(i => table.columns[i]), true);

        drawHeader();
        table.rows.forEach(row => drawRow(cols.map(i => fmtPdf(row[i] as Cell)), false));
        pdf.moveDown(1);
      });
    }

    if (doc.tables.length === 0) {
      pdf.font('Helvetica').fontSize(10).fillColor('#444').text('No data for this report and period.', left, pdf.y, { width: usable });
    }

    // ── page numbers ──
    const range = pdf.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      pdf.switchToPage(i);
      const saved = pdf.page.margins.bottom;
      pdf.page.margins.bottom = 0;                       // otherwise writing in the margin starts a new page
      pdf.font('Helvetica').fontSize(8).fillColor('#777')
        .text(`${doc.meta.title}  -  Page ${i - range.start + 1} of ${range.count}`, left, pdf.page.height - 28, { width: usable, align: 'center', lineBreak: false });
      pdf.page.margins.bottom = saved;
    }
    pdf.end();
  });
}
