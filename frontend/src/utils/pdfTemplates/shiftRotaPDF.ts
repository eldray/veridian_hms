// src/utils/pdfTemplates/shiftRotaPDF.ts
// Weekly duty rota: staff x 7 days, grouped by department, with a daily headcount row.
// A4 landscape. Shifts are shown as letters (M/A/N/C) so they read on a black-and-white printer.
import {
  esc, human, fmtDate, fmtTime, resolveHospital, docTitle, section, signatures, note, pageShell,
} from './printKit';

interface RotaData {
  shifts: any[];
  weekStart: string;
  departments?: Array<{ id: string; name: string; color?: string | null }>;
  users?: Array<{ id: string; departmentId?: string | null }>;
  departmentName?: string | null;
}

const SHIFT: Record<string, { letter: string; label: string; bg: string; fg: string }> = {
  morning:   { letter: 'M', label: 'Morning',   bg: '#fef3c7', fg: '#92400e' },
  afternoon: { letter: 'A', label: 'Afternoon', bg: '#dbeafe', fg: '#1e40af' },
  night:     { letter: 'N', label: 'Night',     bg: '#e0e7ff', fg: '#3730a3' },
  on_call:   { letter: 'C', label: 'On call',   bg: '#fce7f3', fg: '#9d174d' },
};
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const generateShiftRotaHTML = (
  shifts: any[],
  weekStart: string,
  hospital: any,
  extras?: Partial<RotaData>,
): string => {
  const h = resolveHospital(hospital);
  const departments = extras?.departments ?? [];
  const users = extras?.users ?? [];
  const single = extras?.departmentName ?? null;

  const start = new Date(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const deptName = new Map(departments.map((d) => [d.id, d.name]));
  const userDept = new Map(users.map((u) => [u.id, u.departmentId ?? null]));

  type Entry = { type: string; start: string; end: string };
  const staff = new Map<string, { name: string; role: string; dept: string; cells: Map<string, Entry[]> }>();
  for (const s of shifts || []) {
    if (!s.userId) continue;
    const dk = String(s.shiftDate || '').split('T')[0];
    if (!dk) continue;
    if (!staff.has(s.userId)) {
      const did = userDept.get(s.userId) ?? null;
      staff.set(s.userId, {
        name: s.user?.fullName || '—',
        role: s.user?.role || '',
        dept: did ? deptName.get(did) || 'Other' : 'Unassigned',
        cells: new Map(),
      });
    }
    const m = staff.get(s.userId)!.cells;
    if (!m.has(dk)) m.set(dk, []);
    m.get(dk)!.push({
      type: s.shiftType,
      start: s.startTime ? fmtTime(s.startTime) : '',
      end: s.endTime ? fmtTime(s.endTime) : '',
    });
  }

  const groups = new Map<string, Array<{ id: string; name: string; role: string; cells: Map<string, Entry[]> }>>();
  for (const [id, v] of staff) {
    if (!groups.has(v.dept)) groups.set(v.dept, []);
    groups.get(v.dept)!.push({ id, name: v.name, role: v.role, cells: v.cells });
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => (a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : a.localeCompare(b)));
  const showGroups = !single && ordered.length > 1;

  const cell = (entries?: Entry[]) => {
    if (!entries?.length) return '<td class="r-off"></td>';
    const chips = entries
      .map((e) => {
        const c = SHIFT[e.type] || { letter: '?', label: human(e.type), bg: '#f3f4f6', fg: '#374151' };
        const t = e.start && e.end ? `<div style="font-size:6.5pt;font-weight:400">${esc(e.start)}–${esc(e.end)}</div>` : '';
        return `<div style="background:${c.bg};color:${c.fg};border-radius:2px;margin:1px 0;padding:1px 0"><b>${c.letter}</b>${t}</div>`;
      })
      .join('');
    return `<td style="text-align:center;padding:1px 2px">${chips}</td>`;
  };

  // Daily headcount by shift type
  const countRow = days.map((d) => {
    const k = keyOf(d);
    const c: Record<string, number> = {};
    for (const v of staff.values()) for (const e of v.cells.get(k) || []) c[e.type] = (c[e.type] || 0) + 1;
    const parts = Object.entries(SHIFT).filter(([t]) => c[t]).map(([t, s]) => `${s.letter}${c[t]}`);
    return `<td style="text-align:center;font-weight:600">${parts.join(' ') || '—'}</td>`;
  });

  const head = `<tr>
    <th style="width:22%;text-align:left">Staff member</th>
    ${days.map((d) => `<th style="text-align:center">${d.toLocaleDateString('en-GB', { weekday: 'short' })}<div style="font-weight:400">${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div></th>`).join('')}
  </tr>`;

  const rowsHtml = ordered
    .map(([name, rows]) => {
      const bar = showGroups ? `<tr><td colspan="8" style="background:#f3f4f6;font-weight:700;font-size:8pt;letter-spacing:.05em;text-transform:uppercase">${esc(name)}</td></tr>` : '';
      const body = rows
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((r) => `<tr><td><b>${esc(r.name)}</b>${r.role ? `<div class="muted" style="font-size:7pt">${esc(human(r.role))}</div>` : ''}</td>${days.map((d) => cell(r.cells.get(keyOf(d)))).join('')}</tr>`)
        .join('');
      return bar + body;
    })
    .join('');

  const legend = Object.values(SHIFT)
    .map((s) => `<span style="display:inline-block;margin-right:14px"><span style="display:inline-block;min-width:14px;text-align:center;background:${s.bg};color:${s.fg};font-weight:700;border-radius:2px;margin-right:4px">${s.letter}</span>${s.label}</span>`)
    .join('');

  const title = single ? `Duty rota — ${single}` : 'Duty rota';
  const range = `${fmtDate(days[0])} – ${fmtDate(days[6])}`;

  const body = `
    ${docTitle(title, { ref: range, refLabel: 'Week', date: new Date(), dateLabel: 'Printed' })}
    ${section('Week rota', `
      <table class="data">
        <thead>${head}</thead>
        <tbody>${staff.size ? rowsHtml : `<tr><td colspan="8" class="muted" style="text-align:center;padding:16px">No shifts scheduled for this week</td></tr>`}</tbody>
        ${staff.size ? `<tfoot><tr><td style="font-weight:700">On duty (headcount)</td>${countRow.join('')}</tr></tfoot>` : ''}
      </table>`)}
    <div class="text-block" style="margin:6px 0 8px;font-size:8pt">${legend}</div>
    ${note('Shift changes must be agreed with the unit head and recorded before the shift. Staff on call must be reachable and able to report within the agreed time.')}
    ${signatures([
      { role: 'Prepared by (unit head)', plain: true },
      { role: 'Approved by (Matron / Administrator)', plain: true },
    ])}
  `;

  return pageShell({
    title: `${title} ${range}`,
    hospital: h,
    body,
    footerRef: `Rota ${range}`,
    footerNote: 'Staff record',
    pageSize: 'A4 landscape',
    printLabel: 'Print rota',
  });
};
