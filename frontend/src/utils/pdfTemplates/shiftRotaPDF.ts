// src/utils/pdfTemplates/shiftRotaPDF.ts
// Duty rota prints.
// WEEK  — staff x 7 days, grouped by department, shift chips WITH times,
//         daily headcount by shift type. A4 landscape (unchanged).
// MONTH — staff x 28–31 days, A4 landscape, fixed-layout grid so every day
//         column shares the page width evenly. Letters only (times don't fit
//         a ~7mm column), weekend columns shaded, daily TOTAL headcount footer.
// Both read on a black-and-white printer: shifts are letters (M/A/N/C), not colour.
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

type Entry = { type: string; start: string; end: string };
type StaffRow = { id: string; name: string; role: string; cells: Map<string, Entry[]> };

// Shared: fold raw shifts into staff rows grouped by department.
const buildStaff = (
  shifts: any[],
  departments: Array<{ id: string; name: string }>,
  users: Array<{ id: string; departmentId?: string | null }>,
) => {
  const deptName = new Map(departments.map((d) => [d.id, d.name]));
  const userDept = new Map(users.map((u) => [u.id, u.departmentId ?? null]));

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

  const groups = new Map<string, StaffRow[]>();
  for (const [id, v] of staff) {
    if (!groups.has(v.dept)) groups.set(v.dept, []);
    groups.get(v.dept)!.push({ id, name: v.name, role: v.role, cells: v.cells });
  }
  const ordered = [...groups.entries()].sort(([a], [b]) => (a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : a.localeCompare(b)));
  return { staff, ordered };
};

const legendHtml = () =>
  Object.values(SHIFT)
    .map((s) => `<span style="display:inline-block;margin-right:14px"><span style="display:inline-block;min-width:14px;text-align:center;background:${s.bg};color:${s.fg};font-weight:700;border-radius:2px;margin-right:4px">${s.letter}</span>${s.label}</span>`)
    .join('');

// ─────────────────────────────────────────────────────────────
// WEEK (unchanged output)
// ─────────────────────────────────────────────────────────────
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

  const { staff, ordered } = buildStaff(shifts, departments, users);
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
    <div class="text-block" style="margin:6px 0 8px;font-size:8pt">${legendHtml()}</div>
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

// ─────────────────────────────────────────────────────────────
// MONTH — A4 landscape, fixed-layout grid, letters only
// ─────────────────────────────────────────────────────────────
export const generateShiftRotaMonthHTML = (
  shifts: any[],
  monthStart: string, // any date inside the target month
  hospital: any,
  extras?: Partial<RotaData>,
): string => {
  const h = resolveHospital(hospital);
  const departments = extras?.departments ?? [];
  const users = extras?.users ?? [];
  const single = extras?.departmentName ?? null;

  const anchor = new Date(monthStart);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1));
  const firstKey = keyOf(first);
  const lastKey = keyOf(days[days.length - 1]);
  const cols = days.length + 1;

  // Only shifts inside this month — nobody gets an all-blank row because their
  // shifts live in a different month.
  const monthShifts = (shifts || []).filter((s) => {
    const dk = String(s.shiftDate || '').split('T')[0];
    return dk && dk >= firstKey && dk <= lastKey;
  });

  const { staff, ordered } = buildStaff(monthShifts, departments, users);
  const showGroups = !single && ordered.length > 1;
  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  // Letters only — a ~7mm day column can't hold times. Multiple shifts stack as M/N.
  const cell = (entries: Entry[] | undefined, weekend: boolean) => {
    const bg = weekend ? 'background:#f3f4f6;' : '';
    if (!entries?.length) return `<td style="${bg}"></td>`;
    const chips = entries
      .map((e) => {
        const c = SHIFT[e.type] || { letter: '?', bg: '#e5e7eb', fg: '#374151' };
        return `<span style="display:inline-block;background:${c.bg};color:${c.fg};border-radius:2px;padding:0 1px;margin:0 .5px;font-weight:700">${c.letter}</span>`;
      })
      .join('');
    return `<td style="${bg}text-align:center">${chips}</td>`;
  };

  // Daily TOTAL headcount (M3 A2 N1 breakdown can't fit a month column).
  const countRow = days.map((d) => {
    const k = keyOf(d);
    let n = 0;
    for (const v of staff.values()) n += (v.cells.get(k) || []).length;
    const bg = isWeekend(d) ? 'background:#f3f4f6;' : '';
    return `<td style="${bg}text-align:center;font-weight:700">${n || '—'}</td>`;
  });

  const head = `<tr>
    <th class="rm-staff">Staff member</th>
    ${days.map((d) => `<th style="text-align:center;${isWeekend(d) ? 'background:#e5e7eb;' : ''}">${d.getDate()}<div style="font-weight:400;font-size:5.5pt">${d.toLocaleDateString('en-GB', { weekday: 'narrow' })}</div></th>`).join('')}
  </tr>`;

  const rowsHtml = ordered
    .map(([name, rows]) => {
      const bar = showGroups ? `<tr><td colspan="${cols}" style="background:#f3f4f6;font-weight:700;font-size:7pt;letter-spacing:.05em;text-transform:uppercase;padding:1px 3px">${esc(name)}</td></tr>` : '';
      const body = rows
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((r) => `<tr><td class="rm-staff"><b>${esc(r.name)}</b>${r.role ? `<div class="muted" style="font-size:5.5pt">${esc(human(r.role))}</div>` : ''}</td>${days.map((d) => cell(r.cells.get(keyOf(d)), isWeekend(d))).join('')}</tr>`)
        .join('');
      return bar + body;
    })
    .join('');

  const title = single ? `Duty rota — ${single}` : 'Duty rota';
  const monthLabel = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const range = `${fmtDate(days[0])} – ${fmtDate(days[days.length - 1])}`;

  // Fixed layout = every day column gets an EQUAL share of the remaining width.
  // This is what makes the month "spread out" instead of bunching left.
  const monthCss = `
    <style>
      table.rota-month { table-layout: fixed; width: 100%; font-size: 6.5pt; }
      table.rota-month th, table.rota-month td { padding: 1px 0; overflow: hidden; word-break: break-word; }
      table.rota-month .rm-staff { width: 44mm; text-align: left; padding: 1px 3px; }
      table.rota-month thead { display: table-header-group; }
      table.rota-month tr { page-break-inside: avoid; }
    </style>`;

  const body = `
    ${monthCss}
    ${docTitle(title, { ref: monthLabel, refLabel: 'Month', date: new Date(), dateLabel: 'Printed' })}
    ${section('Month rota', `
      <table class="data rota-month">
        <thead>${head}</thead>
        <tbody>${staff.size ? rowsHtml : `<tr><td colspan="${cols}" class="muted" style="text-align:center;padding:16px">No shifts scheduled for this month</td></tr>`}</tbody>
        ${staff.size ? `<tfoot><tr><td class="rm-staff" style="font-weight:700">On duty (total)</td>${countRow.join('')}</tr></tfoot>` : ''}
      </table>`)}
    <div class="text-block" style="margin:6px 0 8px;font-size:8pt">${legendHtml()}<span class="muted" style="margin-left:8px">Weekend columns shaded · footer = total staff on duty per day</span></div>
    ${note('Shift changes must be agreed with the unit head and recorded before the shift. Staff on call must be reachable and able to report within the agreed time.')}
    ${signatures([
      { role: 'Prepared by (unit head)', plain: true },
      { role: 'Approved by (Matron / Administrator)', plain: true },
    ])}
  `;

  return pageShell({
    title: `${title} ${monthLabel}`,
    hospital: h,
    body,
    footerRef: `Rota ${range}`,
    footerNote: 'Staff record',
    pageSize: 'A4 landscape', // switch to 'A3 landscape' here if your printer supports it — roomier cells
    printLabel: 'Print month rota',
  });
};