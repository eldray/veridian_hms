// src/utils/pdfTemplates/stockReportPDF.ts
// Printout of a stock report exactly as shown and exported on the Stock Reports page:
// summary figures on top, then the table. Built on printKit; wide reports go landscape.
import {
  esc, resolveHospital, docTitle, section, table, signatures, kvGrid, note, pageShell,
} from './printKit';

export interface StockReportPrint {
  name: string;                 // e.g. "Stock Valuation"
  filters?: string[];           // applied filter chips, e.g. "Last 30 days"
  tiles?: Array<{ label: string; value: string }>;
  headers: string[];
  rows: Array<Array<string | number>>;
  generatedAt?: string | Date;
  preparedBy?: string;
}

const NUMERIC = /^[\s₵GHS]*-?[\d,]+(\.\d+)?%?$/;
const cleanMoney = (v: string) => v.replace(/₵\s?/g, 'GHS ');

export const generateStockReportHTML = (r: StockReportPrint, hospital: any): string => {
  const h = resolveHospital(hospital);
  const generated = r.generatedAt ? new Date(r.generatedAt) : new Date();
  const headers = r.headers || [];
  const rows = r.rows || [];
  const wide = headers.length > 6;

  const tiles = (r.tiles || []).filter((t) => t.value !== '' && t.value != null);
  const align = headers.map((_, c) => {
    const col = rows.slice(0, 25).map((row) => String(row[c] ?? '')).filter(Boolean);
    return col.length && col.every((v) => NUMERIC.test(v)) ? ('r' as const) : undefined;
  });

  const body = `
    ${docTitle(`${r.name} report`, { ref: generated.toISOString().slice(0, 10), refLabel: 'Report date', date: generated, dateLabel: 'Generated' })}
    ${r.filters?.length ? `<div class="text-block" style="margin:2px 0 8px"><span class="muted">Filters:</span> ${r.filters.map(esc).join(' · ')}</div>` : ''}
    ${tiles.length
      ? section('Summary', kvGrid(tiles.map((t) => [esc(t.label), `<b>${esc(cleanMoney(t.value))}</b>`] as [string, string]), wide ? 4 : 3), { keepTogether: true })
      : ''}
    ${section(
      `Details (${rows.length} ${rows.length === 1 ? 'row' : 'rows'})`,
      table({
        head: headers.map(esc),
        rows: rows.map((row) => row.map((c) => esc(cleanMoney(String(c ?? ''))))),
        align,
        empty: 'No rows for this report',
      }),
    )}
    ${note('Stock figures are taken from the hospital stock records at the time shown. Quantities and values change as stock is received, issued or adjusted.')}
    ${signatures([
      { role: 'Prepared by', name: r.preparedBy, plain: true },
      { role: 'Verified by (Pharmacist / Stores)', plain: true },
    ])}
  `;

  return pageShell({
    title: `${r.name} report`,
    hospital: h,
    body,
    footerRef: `${r.name} ${generated.toISOString().slice(0, 10)}`,
    footerNote: 'Confidential — internal use',
    pageSize: wide ? 'A4 landscape' : undefined,
    printLabel: 'Print report',
  });
};
