// src/utils/pdfTemplates/leaveRegisterPDF.ts
// Yearly leave register: one row per staff member, one column per month, plus days taken.
// A4 landscape. Each entry carries its type as text so it still reads on a black-and-white printer.
import {
  esc, human, fmtDate, resolveHospital, docTitle, section, table, signatures, kvGrid, pageShell,
} from './printKit';

const LEAVE_TYPES: Record<string, { bg: string; fg: string; label: string }> = {
  annual:    { bg: '#dbeafe', fg: '#1e40af', label: 'Annual' },
  sick:      { bg: '#d1fae5', fg: '#065f46', label: 'Sick' },
  maternity: { bg: '#fce7f3', fg: '#9d174d', label: 'Maternity' },
  paternity: { bg: '#e9d5ff', fg: '#6b21a8', label: 'Paternity' },
  emergency: { bg: '#fee2e2', fg: '#991b1b', label: 'Emergency' },
  unpaid:    { bg: '#f1f5f9', fg: '#334155', label: 'Unpaid' },
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const generateLeaveRegisterHTML = (
  leaves: any[],
  year: number,
  staffFilter: string | null,
  hospital: any,
): string => {
  const h = resolveHospital(hospital);
  const yearLeaves = (leaves || []).filter((l) => {
    const s = new Date(l.startDate);
    const e = new Date(l.endDate);
    return s.getFullYear() === year || e.getFullYear() === year;
  });

  const byStaff = new Map<string, { name: string; role: string; leaves: any[] }>();
  for (const l of yearLeaves) {
    if (!l.userId) continue;
    if (staffFilter && l.userId !== staffFilter) continue;
    if (!byStaff.has(l.userId)) byStaff.set(l.userId, { name: l.user?.fullName || '—', role: l.user?.role || '', leaves: [] });
    byStaff.get(l.userId)!.leaves.push(l);
  }
  const staff = [...byStaff.values()].sort((a, b) => a.name.localeCompare(b.name));

  const portion = (leave: any, m: number) => {
    const ms = new Date(year, m, 1);
    const me = new Date(year, m + 1, 0, 23, 59, 59);
    const s = new Date(leave.startDate);
    const e = new Date(leave.endDate);
    if (e < ms || s > me) return null;
    return { from: (s < ms ? ms : s).getDate(), to: (e > me ? me : e).getDate() };
  };

  /** Days of this leave that fall inside the year (calendar days; totalDays is working days). */
  const daysInYear = (leave: any): number => {
    const ys = new Date(year, 0, 1);
    const ye = new Date(year, 11, 31, 23, 59, 59);
    const s = new Date(leave.startDate);
    const e = new Date(leave.endDate);
    const a = s < ys ? ys : s;
    const b = e > ye ? ye : e;
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1);
  };

  const rows = staff.map((r) => {
    const cells = MONTHS.map((_, m) =>
      r.leaves
        .map((l) => {
          const p = portion(l, m);
          if (!p) return '';
          const c = LEAVE_TYPES[l.leaveType] ?? LEAVE_TYPES.unpaid;
          const range = p.from === p.to ? `${p.from}` : `${p.from}–${p.to}`;
          const pending = l.status && l.status !== 'approved' ? ` (${esc(human(l.status))})` : '';
          return `<div style="background:${c.bg};color:${c.fg};border-radius:2px;padding:1px 3px;margin:1px 0;font-size:7pt;line-height:1.25"><b>${range}</b> ${esc(c.label)}${pending}</div>`;
        })
        .join(''),
    );
    const total = r.leaves.filter((l) => l.status === 'approved' || !l.status).reduce((s, l) => s + daysInYear(l), 0);
    return [
      `<b>${esc(r.name)}</b>${r.role ? `<div class="muted" style="font-size:7pt">${esc(human(r.role))}</div>` : ''}`,
      ...cells,
      `<b>${total}</b>`,
    ];
  });

  const legend = Object.values(LEAVE_TYPES)
    .map((c) => `<span style="display:inline-block;margin-right:12px"><span style="display:inline-block;width:10px;height:10px;background:${c.bg};border:1px solid ${c.fg};vertical-align:-1px;margin-right:4px"></span>${esc(c.label)}</span>`)
    .join('');

  const body = `
    ${docTitle('Staff leave register', { ref: String(year), refLabel: 'Year', date: new Date(), dateLabel: 'Printed' })}
    ${section('Summary', kvGrid(
      [
        ['Year', String(year)],
        ['Staff with leave', String(staff.length)],
        ['Leave records', String(yearLeaves.length)],
        ['Covers', staffFilter && staff[0] ? esc(staff[0].name) : 'All staff'],
      ],
      4,
    ), { keepTogether: true })}

    ${section('Register', table({
      head: ['Staff member', ...MONTHS, 'Days'],
      widths: ['16%', ...MONTHS.map(() => '6.5%'), '6%'],
      align: [undefined, ...MONTHS.map(() => undefined), 'c'],
      rows,
      empty: `No leave records found for ${year}`,
    }))}

    <div class="text-block" style="margin:6px 0 8px;font-size:8pt">${legend}<span class="muted">Days = calendar days of approved leave falling in ${year}. Entries still awaiting a decision are marked with their status and not counted.</span></div>

    ${signatures([
      { role: 'Prepared by (Human Resources)', plain: true },
      { role: 'Approved by (Administrator)', plain: true },
    ])}
  `;

  return pageShell({
    title: `Leave register ${year}`,
    hospital: h,
    body,
    footerRef: `Leave register ${year}`,
    footerNote: 'Confidential staff record',
    pageSize: 'A4 landscape',
    printLabel: 'Print register',
  });
};
