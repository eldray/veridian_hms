// GHS Monthly Midwives Returns – FORM A (DHIMS2 layout)
// Renders every section the backend builds (backend/src/modules/ghsReport/formA.ts).
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
  if (captured === false) return <span className="text-gray-400 italic" title="Not captured by the system">n/c</span>;
  return <>{typeof v === 'number' ? v.toLocaleString() : v}</>;
};

const TableView: React.FC<{ t: FormATable }> = ({ t }) => (
  <div className="mb-5 break-inside-avoid">
    {t.title && <h4 className="text-sm font-bold text-gray-700 mb-1">{t.title}</h4>}
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-gray-300 border-collapse">
        <thead>
          {t.groups && (
            <tr className="bg-gray-200">
              <th className="border border-gray-300"></th>
              {t.groups.map((g, i) => (
                <th key={i} colSpan={g.span} className="border border-gray-300 px-2 py-1 text-center font-bold">{g.label}</th>
              ))}
            </tr>
          )}
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-1 text-left w-[45%]"></th>
            {t.columns.map(c => (
              <th key={c} className="border border-gray-300 px-2 py-1 text-center font-semibold whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, i) => (
            <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
              <td className="border border-gray-300 px-2 py-1 whitespace-pre">{r.label}{r.note && <span className="text-xs text-gray-400"> ({r.note})</span>}</td>
              {t.columns.map((_, ci) => (
                <td key={ci} className="border border-gray-300 px-2 py-1 text-center tabular-nums">
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

  if (!data || !data.form) {
    return <div className="p-6 text-sm text-[var(--text-secondary)]">No Form A data for this period.</div>;
  }

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
      <div className="flex flex-wrap gap-2 print:hidden">
        <button onClick={() => window.print()} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg flex items-center gap-2"><Printer className="w-4 h-4" /> Print</button>
        <button onClick={download} className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg flex items-center gap-2"><Download className="w-4 h-4" /> Export CSV</button>
        <button onClick={() => setOpen(Object.fromEntries(sections.map(s => [s.id, true])))} className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-lg">Expand all</button>
        <button onClick={() => setOpen(Object.fromEntries(sections.map(s => [s.id, false])))} className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-lg">Collapse all</button>
      </div>

      <div id="form-a-report-content" className="bg-white text-gray-900 rounded-xl shadow print:shadow-none">
        <div className="text-center py-5 px-4 border-b-2 border-gray-300">
          <h1 className="text-xl font-bold uppercase tracking-wide">Ghana Health Service</h1>
          <h2 className="text-lg font-semibold text-gray-700">{data.title ?? 'Monthly Midwives Returns – Form A'}</h2>
          <p className="mt-2 font-bold">{data.facility.name}</p>
          <p className="text-sm text-gray-500">District: {data.facility.district} | Region: {data.facility.region} | GHF Code: {data.facility.ghfCode}</p>
          <p className="text-sm font-medium text-gray-700 mt-1">Reporting period: {data.period.monthName} {data.period.year}</p>
        </div>

        {sections.map(s => {
          const isOpen = open[s.id] !== false; // open by default; always open when printing
          return (
            <div key={s.id} className="border-b border-gray-200">
              <button
                onClick={() => setOpen(o => ({ ...o, [s.id]: !isOpen }))}
                className="w-full text-left px-5 py-3 font-bold text-pink-700 bg-pink-50 flex justify-between print:cursor-default"
              >
                <span>{s.title}</span>
                <span className="print:hidden">{isOpen ? '−' : '+'}</span>
              </button>
              <div className={`px-5 pt-4 ${isOpen ? '' : 'hidden print:block'}`}>
                {s.tables.map((t, i) => <TableView key={i} t={t} />)}
              </div>
            </div>
          );
        })}

        {data.form.notCaptured.length > 0 && (
          <div className="p-5 text-sm bg-amber-50 border-t border-amber-200">
            <p className="font-bold text-amber-800 mb-1">Not captured by the system (shown as n/c)</p>
            <p className="text-amber-700 text-xs mb-2">These DHIMS2 fields have no data source yet and must be entered manually.</p>
            <ul className="list-disc pl-5 text-amber-800">
              {data.form.notCaptured.map(n => <li key={n}>{n}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormAReportView;
