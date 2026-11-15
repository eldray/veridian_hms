// src/components/reports/ANCReportView.tsx — GHS Monthly Midwives Returns – FORM A (DHIMS2 layout)
// MATCHES THE PICTURE: this is NOT the stacked label/value layout anymore.
//  - Title: MONTHLY MIDWIVES RETURNS - FORM A, centred, facility / period underneath.
//  - EMONC strip on top: None / Basic / Comprehensive / Blood transfusion / PMTCT / EID /
//    Conduct Delivery / Baby Friendly — each with Yes / No / Clear, defaults as in the picture
//    (None = No, everything else = Yes). Local display state only; it does not rewrite data.
//  - Every section is TRANSPOSED to the DHIMS2 grid: indicator names become the COLUMN
//    headers across the top, the numbers sit in ONE row underneath — exactly like ANTENATAL
//    (# Registrants 9 | # Attendances 47 | Making 4th visit 3 …) and DELIVERIES in the picture.
//    A table that carried >1 value-column becomes one value-row per original column.
//  - AGE TABLES FIX: age tables are wide (many age columns, 1 tally row), NOT tall —
//    they are rendered as-is so the ages stay as column headers. Transposing them
//    was collapsing the ages away and leaving only the tally.
//  - Dense print sizing: 10px headers, tabular numbers, horizontal scroll on screen,
//    landscape print. No hard-coded colours — all var(--*) tokens.
//  - Kept, unchanged: CSV export (same shape as before), Print, Expand/Collapse all,
//    not-captured (n/c) handling, section collapse, data interfaces.
import React, { useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';

interface FormARow { label: string; values: (number | string)[]; captured?: boolean; note?: string }
interface FormATable { title?: string; groups?: { label: string; span: number }[]; columns: string[]; rows: FormARow[] }
interface FormASection { id: string; title: string; tables: FormATable[] }
interface FormAData {
  period: { startDate: string; endDate: string; year: number; month: number; monthName: string };
  facility: { name: string; district: string; region: string; ghfCode: string };
  form?: { sections: FormASection[]; notCaptured: string[] };
  title?: string;
  filePrefix?: string;
  generatedAt: string;
}
const q = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const Cell: React.FC<{ v: number | string; captured?: boolean }> = ({ v, captured }) => {
  if (captured === false) return <span className="text-[var(--text-tertiary)] italic" title="Not captured by the system">n/c</span>;
  return <>{typeof v === 'number' ? v.toLocaleString() : v}</>;
};

// ── One DHIMS2 grid, rendered the right way round ──
// Two orientations come from the backend, and transposing both breaks one of them:
//  A) INDICATOR tables (Antenatal, Deliveries…): 1 value-column, MANY indicator rows.
//     → transpose: indicators become the column headers, numbers in one row underneath.
//  B) AGE tables (Age of mother at registration / at delivery / maternal deaths /
//     age group of referrals / abortions…): 1 indicator row, MANY age columns
//     (10-14 | 15-19 | 20-24 | 25-29 | 30-34 | >= 35 …).
//     → render AS-IS: the age labels ARE the column headers, the tally is the row.
//     Transposing these was the bug: it collapsed the ages into one header and left
//     only the tally, so the ages disappeared.
// Detection: a table is an age table when its columns look like ages, OR when it has
// more value-columns than indicator-rows (wide, not tall).
const AGE_COL = /^(<|≤|≥|>=|<=)?\s*\d+\s*([-–+]|to)?\s*\d*\s*(d|m|y|yrs|years|months|days)?$/i;
const isAgeTable = (t: FormATable) => {
  if (!t.rows.length) return false;
  const valueCols = Math.max(0, ...t.rows.map(r => r.values.length));
  if (t.columns.length > 1 && t.columns.some(c => AGE_COL.test(c.trim()))) return true;
  if (valueCols > 1 && valueCols >= t.rows.length) return true;
  return false;
};
const TableView: React.FC<{ t: FormATable }> = ({ t }) => {
  const rows = t.rows;
  if (!rows.length) return null;
  const header = (label: string) => (
    <h4 className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-primary)] bg-[var(--bg-main)] border border-b-0 border-[var(--border-color)] px-2 py-1.5 text-center">{label}</h4>
  );
  // ── B) Age table: ages across the top, tally row underneath ──
  if (isAgeTable(t)) {
    return (
      <div className="mb-4 break-inside-avoid">
        {t.title && header(t.title)}
        <div className="overflow-x-auto">
          <table className="w-full border border-[var(--border-color)] border-collapse text-[11px]">
            <thead>
              <tr className="bg-[var(--bg-main)]">
                <th className="border border-[var(--border-color)] px-2 py-1.5 text-left font-semibold text-[var(--text-secondary)] min-w-[160px]">Age group</th>
                {t.columns.map((c, i) => (
                  <th key={i} className="border border-[var(--border-color)] px-1.5 py-1.5 text-center font-semibold text-[var(--text-secondary)] min-w-[56px]">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  <td className="border border-[var(--border-color)] px-2 py-1.5 font-medium text-[var(--text-primary)]">{r.label}{r.note && <span className="text-[10px] text-[var(--text-tertiary)]"> ({r.note})</span>}</td>
                  {t.columns.map((_, ci) => (
                    <td key={ci} className="border border-[var(--border-color)] px-1.5 py-1.5 text-center tabular-nums text-[var(--text-primary)]">
                      {r.values[ci] === undefined ? '' : <Cell v={r.values[ci]} captured={r.captured} />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  // ── A) Indicator table: transpose, indicators → columns ──
  const valueColCount = Math.max(1, ...rows.map(r => r.values.length));
  return (
    <div className="mb-4 break-inside-avoid">
      {t.title && header(t.title)}
      <div className="overflow-x-auto">
        <table className="w-full border border-[var(--border-color)] border-collapse text-[11px]">
          <thead>
            <tr className="bg-[var(--bg-main)]">
              {rows.map((r, i) => (
                <th key={i} className="border border-[var(--border-color)] px-1.5 py-1.5 text-center font-semibold text-[var(--text-secondary)] align-bottom min-w-[72px] leading-tight">
                  {r.label}{r.note && <span className="block text-[9px] font-normal text-[var(--text-tertiary)]">({r.note})</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: valueColCount }, (_, ci) => (
              <tr key={ci}>
                {rows.map((r, ri) => (
                  <td key={ri} className="border border-[var(--border-color)] px-1.5 py-1.5 text-center tabular-nums text-[var(--text-primary)]">
                    {r.values[ci] === undefined ? '' : <Cell v={r.values[ci]} captured={r.captured} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── EMONC strip, as in the picture ──
const EMONC_SERVICES = ['None', 'Basic', 'Comprehensive', 'Blood transfusion services', 'PMTCT', 'EID Services', 'Conduct Delivery', 'Baby Friendly Services'];
const EmoncStrip: React.FC = () => {
  const [sel, setSel] = useState<Record<string, 'Yes' | 'No'>>(() => Object.fromEntries(EMONC_SERVICES.map(s => [s, s === 'None' ? 'No' : 'Yes'])));
  return (
    <div className="border border-[var(--border-color)] mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[var(--bg-main)]">
            <th className="border border-[var(--border-color)] px-2 py-1.5 text-left font-bold text-[var(--text-primary)]" colSpan={EMONC_SERVICES.length}>EMONC Service</th>
          </tr>
          <tr>{EMONC_SERVICES.map(s => <th key={s} className="border border-[var(--border-color)] px-2 py-1.5 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">{s}</th>)}</tr>
        </thead>
        <tbody>
          <tr>
            {EMONC_SERVICES.map(s => (
              <td key={s} className="border border-[var(--border-color)] px-2 py-1.5 whitespace-nowrap">
                <label className="inline-flex items-center gap-1 mr-2 cursor-pointer"><input type="radio" name={`emonc-${s}`} checked={sel[s] === 'Yes'} onChange={() => setSel(o => ({ ...o, [s]: 'Yes' }))} className="accent-[var(--icon-green-text)]" />Yes</label>
                <label className="inline-flex items-center gap-1 mr-2 cursor-pointer"><input type="radio" name={`emonc-${s}`} checked={sel[s] === 'No'} onChange={() => setSel(o => ({ ...o, [s]: 'No' }))} className="accent-[var(--icon-green-text)]" />No</label>
                <button type="button" onClick={() => setSel(o => { const n = { ...o }; delete (n as any)[s]; return n; })} className="text-[10px] text-[var(--icon-green-text)] underline underline-offset-2">Clear</button>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const FormAReportView: React.FC<{ data: FormAData | null | undefined }> = ({ data }) => {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const sections = data?.form?.sections ?? [];
  const csv = useMemo(() => {
    if (!data?.form) return '';
    const rows: string[] = [
      q(`GHANA HEALTH SERVICE - ${(data.title ?? 'MONTHLY MIDWIVES RETURNS (FORM A)').toUpperCase()}`),
      [q('Facility'), q(data.facility.name)].join(','),
      [q('Period'), q(`${data.period.monthName} ${data.period.year}`)].join(','),
      '',
    ];
    data.form.sections.forEach(s => {
      rows.push(q(s.title.toUpperCase()));
      s.tables.forEach(t => {
        if (t.title) rows.push(q(t.title));
        if (t.groups) rows.push([q(''), ...t.groups.flatMap(g => [q(g.label), ...Array(g.span - 1).fill(q(''))])].join(','));
        rows.push([q(''), ...t.columns.map(q)].join(','));
        t.rows.forEach(r => rows.push([q(r.label.trim()), ...r.values.map(v => q(r.captured === false ? 'n/c' : v))].join(',')));
        rows.push('');
      });
    });
    return rows.join('\n');
  }, [data]);
  if (!data || !data.form) return <div className="p-6 text-sm text-[var(--text-secondary)]">No Form A data for this period.</div>;
  const download = () => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.filePrefix ?? 'GHS_Form_A'}_${data.period.year}_${String(data.period.month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-4">
      <style>{`@media print { @page { size: landscape; margin: 8mm; } #form-a-report-content { font-size: 9px; } }`}</style>
      <div className="flex flex-wrap gap-2 print:hidden">
        <button onClick={() => window.print()} className="px-3 py-2 text-sm bg-[var(--icon-cyan-text)] text-white rounded-lg flex items-center gap-2"><Printer className="w-4 h-4" /> Print</button>
        <button onClick={download} className="px-3 py-2 text-sm bg-[var(--icon-green-text)] text-white rounded-lg flex items-center gap-2"><Download className="w-4 h-4" /> Export CSV</button>
        <button onClick={() => setOpen(Object.fromEntries(sections.map(s => [s.id, true])))} className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-lg">Expand all</button>
        <button onClick={() => setOpen(Object.fromEntries(sections.map(s => [s.id, false])))} className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-lg">Collapse all</button>
      </div>
      <div id="form-a-report-content" className="printable-report bg-[var(--bg-card)] text-[var(--text-primary)] rounded-xl shadow print:shadow-none print:rounded-none overflow-hidden">
        <div className="text-center py-4 px-4">
          <h1 className="text-base font-bold uppercase tracking-wide">Monthly Midwives Returns - Form A</h1>
          <p className="mt-1 font-bold text-sm">{data.facility.name}</p>
          <p className="text-xs text-[var(--text-secondary)]">District: {data.facility.district} | Region: {data.facility.region} | GHF Code: {data.facility.ghfCode}</p>
          <p className="text-xs font-medium mt-1">Reporting period: {data.period.monthName} {data.period.year}</p>
        </div>
        <div className="px-3 pb-2"><EmoncStrip /></div>
        {sections.map(s => {
          const isOpen = open[s.id] !== false;
          return (
            <div key={s.id} className="border-t border-[var(--border-color)]">
              <button onClick={() => setOpen(o => ({ ...o, [s.id]: !isOpen }))} className="w-full text-left px-3 py-2 font-bold text-xs uppercase tracking-wide bg-[var(--bg-main)] text-[var(--text-primary)] flex justify-between print:cursor-default">
                <span>{s.title}</span><span className="print:hidden">{isOpen ? '−' : '+'}</span>
              </button>
              <div className={`px-3 pt-3 ${isOpen ? '' : 'hidden print:block'}`}>{s.tables.map((t, i) => <TableView key={i} t={t} />)}</div>
            </div>
          );
        })}
        {data.form.notCaptured.length > 0 && (
          <div className="p-5 text-sm bg-[var(--icon-orange-bg)] border-t border-[var(--border-color)]">
            <p className="font-bold text-[var(--icon-orange-text)] mb-1">Not captured by the system (shown as n/c)</p>
            <p className="text-[var(--icon-orange-text)] text-xs mb-2">These DHIMS2 fields have no data source yet and must be entered manually.</p>
            <ul className="list-disc pl-5 text-[var(--icon-orange-text)]">{data.form.notCaptured.map(n => <li key={n}>{n}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  );
};
export default FormAReportView;
