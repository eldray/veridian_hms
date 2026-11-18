// src/utils/pdfTemplates/shiftSummaryPDF.ts
// Monthly duty roster: staff x days of the month, grouped by department, with shift totals per
// person (M/A/N/C/total) and a daily headcount. A4 landscape, letters only so it prints in black and white.
import { esc, human, resolveHospital, docTitle, section, signatures, note, pageShell } from './printKit';

const LETTER: Record<string, string> = { morning: 'M', afternoon: 'A', night: 'N', on_call: 'C' };
const COLOR: Record<string, string> = { M: '#fef3c7', A: '#dbeafe', N: '#e0e7ff', C: '#fce7f3' };
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const generateShiftSummaryHTML = (
  shifts: any[],
  month: number,
  year: number,
  hospital: any,
  extras?: {
    departments?: Array<{ id: string; name: string; color?: string | null }>;
    users?: Array<{ id: string; departmentId?: string | null }>;
    departmentName?: string | null;
  },
): string => {
  const h = resolveHospital(hospital);
  const single = extras?.departmentName ?? null;
  const deptName = new Map((extras?.departments ?? []).map((d) => [d.id, d.name]));
  const userDept = new Map((extras?.users ?? []).map((u) => [u.id, u.departmentId ?? null]));

  const dim = new Date(year, month, 0).getDate();
  const days = Array.from({ length: dim }, (_, i) => new Date(year, month - 1, i + 1));
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  type Row = { name: string; role: string; dept: string; cells: Map<string, string[]> };
  const staff = new Map<string, Row>();
  for (const s of shifts || []) {
    if (!s.userId) continue;
    const dk = String(s.shiftDate || '').split('T')[0];
    if (!dk) continue;
    if (!staff.has(s.userId)) {
      const did = userDept.get(s.userId) ?? null;
      staff.set(s.userId, { name: s.user?.fullName || '—', role: s.user?.role || '', dept: did ? deptName.get(did) || 'Other' : 'Unassigned', cells: new Map() });
    }
    const m = staff.get(s.userId)!.cells;
    if (!m.has(dk)) m.set(dk, []);
    m.get(dk)!.push(LETTER[s.shiftType] || '?');
  }

  const groups = new Map<string, Array<[string, Row]>>();
  for (const e of staff) {
    if (!groups.has(e[1].dept)) groups.set(e[1].dept, []);
    groups.get(e[1].dept)!.push(e);
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => (a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : a.localeCompare(b)));
  const showGroups = !single && ordered.length > 1;
  const cols = dim + 6;

  const th = (d: Date) => {
    const we = d.getDay() === 0 || d.getDay() === 6;
    return `<th style="text-align:center;padding:2px 0;${we ? 'background:#e5e7eb' : ''}">${d.getDate()}<div style="font-weight:400;font-size:6pt">${d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</div></th>`;
  };

  const totals = (r: Row) => {
    const t = { M: 0, A: 0, N: 0, C: 0 } as Record<string, number>;
    for (const v of r.cells.values()) for (const l of v) if (t[l] !== undefined) t[l]++;
    return t;
  };

  const rowHtml = ([, r]: [string, Row]) => {
    const t = totals(r);
    const cells = days
      .map((d) => {
        const v = r.cells.get(keyOf(d));
        const we = d.getDay() === 0 || d.getDay() === 6;
        if (!v?.length) return `<td style="padding:0;${we ? 'background:#f3f4f6' : ''}"></td>`;
        return `<td style="text-align:center;padding:2px 0;font-weight:700;background:${COLOR[v[0]] || '#f3f4f6'}">${esc(v.join('+'))}</td>`;
      })
      .join('');
    const all = t.M + t.A + t.N + t.C;
    return `<tr><td><b>${esc(r.name)}</b>${r.role ? `<div class="muted" style="font-size:6.5pt">${esc(human(r.role))}</div>` : ''}</td>${cells}
      <td class="ctr">${t.M || ''}</td><td class="ctr">${t.A || ''}</td><td class="ctr">${t.N || ''}</td><td class="ctr">${t.C || ''}</td><td class="ctr"><b>${all}</b></td></tr>`;
  };

  const rowsHtml = ordered
    .map(([name, rows]) => (showGroups ? `<tr><td colspan="${cols}" style="background:#f3f4f6;font-weight:700;font-size:7.5pt;letter-spacing:.05em;text-transform:uppercase">${esc(name)}</td></tr>` : '') +
      rows.sort((a, b) => a[1].name.localeCompare(b[1].name)).map(rowHtml).join(''))
    .join('');

  const headcount = days
    .map((d) => {
      const k = keyOf(d);
      let n = 0;
      for (const r of staff.values()) if (r.cells.get(k)?.length) n++;
      return `<td class="ctr" style="padding:2px 0">${n || ''}</td>`;
    })
    .join('');

  const totalShifts = (shifts || []).filter((s) => s.userId).length;

  const body = `
    ${docTitle(single ? `Monthly duty roster — ${single}` : 'Monthly duty roster', { ref: monthLabel, refLabel: 'Month', date: new Date(), dateLabel: 'Printed' })}
    ${section('Roster', `
      <table class="data" style="font-size:7pt">
        <thead><tr>
          <th style="width:15%;text-align:left">Staff member</th>
          ${days.map(th).join('')}
          <th class="ctr" style="width:3%">M</th><th class="ctr" style="width:3%">A</th><th class="ctr" style="width:3%">N</th><th class="ctr" style="width:3%">C</th><th class="ctr" style="width:4%">Tot</th>
        </tr></thead>
        <tbody>${staff.size ? rowsHtml : `<tr><td colspan="${cols}" class="empty">No shifts scheduled for ${esc(monthLabel)}</td></tr>`}</tbody>
        ${staff.size ? `<tfoot><tr><td>On duty (staff)</td>${headcount}<td colspan="5" class="ctr">${totalShifts} shifts</td></tr></tfoot>` : ''}
      </table>`)}
    <div class="text-block" style="margin:6px 0 8px;font-size:8pt">
      <b>M</b> Morning · <b>A</b> Afternoon · <b>N</b> Night · <b>C</b> On call · Shaded columns are weekends. Right-hand columns count each person's shifts for the month.
    </div>
    ${note('Hours worked and any overtime must be confirmed against the signed attendance record before payroll is processed.')}
    ${signatures([
      { role: 'Prepared by (unit head)', plain: true },
      { role: 'Approved by (Matron / Administrator)', plain: true },
    ])}
  `;

  return pageShell({
    title: `Duty roster ${monthLabel}`,
    hospital: h,
    body,
    footerRef: `Roster ${monthLabel}`,
    footerNote: 'Staff record',
    pageSize: 'A4 landscape',
    printLabel: 'Print roster',
  });
};
