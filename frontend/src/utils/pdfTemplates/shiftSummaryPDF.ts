// src/utils/pdfTemplates/shiftSummaryPDF.ts

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
  const departments = extras?.departments ?? [];
  const users = extras?.users ?? [];
  const singleDeptName = extras?.departmentName ?? null;

  const escapeHtml = (text: any): string => {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  };

  const hospitalName = hospital?.name || 'Veridian Hospital';
  const hospitalAddress = hospital?.address || '123 Medical Center Drive, Accra, Ghana';
  const hospitalPhone = hospital?.phone || '+233-24-123-4567';
  const hospitalEmail = hospital?.email || 'info@veridianhospital.gov.gh';
  const hospitalCode = hospital?.nhisFacilityCode || 'GHS-ACC-001';

  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1));

  const toKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const today = toKey(new Date());

  const deptById = new Map<string, { name: string; color: string }>();
  for (const d of departments) {
    deptById.set(d.id, { name: d.name, color: d.color || '#0891b2' });
  }
  const userDeptById = new Map<string, string | null>();
  for (const u of users) {
    userDeptById.set(u.id, u.departmentId ?? null);
  }

  type Cell = { letter: string; shiftType: string; start: string; end: string; id: string };
  const grid: Map<string, Map<string, Cell[]>> = new Map();
  const staffMeta: Map<string, { name: string; role: string; departmentId: string | null }> = new Map();

  for (const s of shifts) {
    const userId = s.userId;
    if (!userId) continue;

    if (!staffMeta.has(userId)) {
      staffMeta.set(userId, {
        name: s.user?.fullName || '—',
        role: s.user?.role || '',
        departmentId: userDeptById.get(userId) ?? null,
      });
    }
    if (!grid.has(userId)) grid.set(userId, new Map());

    const dateKey = (s.shiftDate || '').split('T')[0];
    if (!dateKey) continue;

    const cellMap = grid.get(userId)!;
    if (!cellMap.has(dateKey)) cellMap.set(dateKey, []);

    const letter =
      s.shiftType === 'morning' ? 'M' :
      s.shiftType === 'afternoon' ? 'A' :
      s.shiftType === 'night' ? 'N' :
      s.shiftType === 'on_call' ? 'C' : '?';

    const startTime = s.startTime ? new Date(s.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
    const endTime = s.endTime ? new Date(s.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

    cellMap.get(dateKey)!.push({ letter, shiftType: s.shiftType, start: startTime, end: endTime, id: s.id });
  }

  const groups: Map<string, { name: string; color: string; rows: Array<{ id: string; name: string; role: string }> }> = new Map();

  for (const [userId, meta] of staffMeta.entries()) {
    const deptId = meta.departmentId ?? '__unassigned__';
    const deptMeta = deptById.get(deptId);
    const deptName = deptId === '__unassigned__' ? 'Unassigned' : (deptMeta?.name ?? 'Unknown Department');
    const deptColor = deptId === '__unassigned__' ? '#94a3b8' : (deptMeta?.color ?? '#0891b2');

    if (!groups.has(deptId)) {
      groups.set(deptId, { name: deptName, color: deptColor, rows: [] });
    }
    groups.get(deptId)!.rows.push({ id: userId, name: meta.name, role: meta.role });
  }

  const orderedGroups = Array.from(groups.entries()).sort((a, b) => {
    if (a[0] === '__unassigned__') return 1;
    if (b[0] === '__unassigned__') return -1;
    return a[1].name.localeCompare(b[1].name);
  });

  for (const [, g] of orderedGroups) {
    g.rows.sort((a, b) => a.name.localeCompare(b.name));
  }

  const cellColorClass = (letter: string) => {
    switch (letter) {
      case 'M': return 'cell-morning';
      case 'A': return 'cell-afternoon';
      case 'N': return 'cell-night';
      case 'C': return 'cell-oncall';
      default:  return '';
    }
  };

  const renderCell = (cells: Cell[] | undefined) => {
    if (!cells || cells.length === 0) return '';
    const letters = cells.map((c) => c.letter).join('+');
    const primary = cells[0].letter;
    const title = cells.map((c) => `${c.shiftType}: ${c.start}–${c.end}`).join(' | ');
    return `<div class="cell-filled ${cellColorClass(primary)}" title="${escapeHtml(title)}">${escapeHtml(letters)}</div>`;
  };

  const monthLabel = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const showGroupHeaders = !singleDeptName && orderedGroups.length > 1;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Shift Rota — ${monthLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 landscape; margin: 8mm; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f1f5f9;
      padding: 20px;
      color: #1e293b;
    }
    .page-container {
      max-width: 1600px;
      margin: 0 auto;
      background: white;
      border-radius: 14px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.12);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 20px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .logo-placeholder {
      width: 52px; height: 52px;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 700;
      border: 2px solid rgba(255,255,255,0.3);
    }
    .hospital-info h1 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
    .hospital-info p { font-size: 11px; opacity: 0.9; line-height: 1.35; }
    .header-right { text-align: right; }
    .document-badge {
      background: rgba(255,255,255,0.2);
      padding: 4px 14px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .document-range { font-size: 12.5px; font-weight: 600; margin-top: 5px; opacity: 0.95; }
    .content { padding: 20px 28px 24px; }

    .meta-strip {
      display: flex; justify-content: space-between; flex-wrap: wrap;
      gap: 16px; background: #f8fafc; border-radius: 10px;
      padding: 10px 16px; margin-bottom: 16px;
      border-left: 4px solid #3b82f6; font-size: 11.5px;
    }
    .meta-item { display: flex; flex-direction: column; }
    .meta-item .label {
      font-size: 9px; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .meta-item .value { font-size: 12.5px; font-weight: 600; color: #0f172a; margin-top: 1px; }

    .rota-wrap {
      overflow-x: auto;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    table.rota { border-collapse: collapse; font-size: 10px; min-width: 100%; }
    table.rota th {
      background: #f1f5f9; color: #475569; font-weight: 700;
      font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.4px;
      padding: 6px 2px; border-bottom: 2px solid #cbd5e1;
      text-align: center; min-width: 26px;
    }
    table.rota th.staff-col {
      text-align: left; padding-left: 12px; min-width: 160px;
      position: sticky; left: 0; background: #f1f5f9; z-index: 2;
    }
    table.rota th.weekend-col { color: #94a3b8; background: #eef2f7; }
    table.rota th.today-col { background: #cffafe; color: #0e7490; }

    table.rota td {
      padding: 3px 1px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #f8fafc;
      text-align: center;
      height: 30px;
      min-width: 26px;
    }
    table.rota td.staff-cell {
      text-align: left; padding-left: 12px; background: #fafbfc;
      font-weight: 500; font-size: 11px; color: #0f172a;
      position: sticky; left: 0; z-index: 1; min-width: 160px;
    }
    table.rota td.staff-cell .role {
      display: block; font-size: 8.5px; color: #94a3b8;
      text-transform: capitalize; margin-top: 1px;
    }
    table.rota td.weekend-col { background: #fafbfc; }
    table.rota td.today-col { background: #f0fdff; }

    .cell-filled {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 22px; height: 22px; border-radius: 4px;
      font-weight: 700; font-size: 9.5px; padding: 0 3px;
    }
    .cell-morning   { background: #d1fae5; color: #065f46; }
    .cell-afternoon { background: #fed7aa; color: #9a3412; }
    .cell-night     { background: #e9d5ff; color: #6b21a8; }
    .cell-oncall    { background: #bfdbfe; color: #1e40af; }

    tr.dept-header-row td {
      background: #f1f5f9;
      border-top: 2px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
      padding: 5px 12px;
      text-align: left;
      font-weight: 700;
      font-size: 9px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #334155;
    }
    tr.dept-header-row td .dot {
      display: inline-block; width: 7px; height: 7px;
      border-radius: 50%; margin-right: 5px; vertical-align: middle;
    }

    .legend { display: flex; gap: 16px; margin-top: 14px; flex-wrap: wrap; font-size: 10.5px; color: #475569; }
    .legend-item { display: flex; align-items: center; gap: 5px; }
    .legend-swatch {
      display: inline-block; width: 14px; height: 14px; border-radius: 3px;
      font-weight: 700; font-size: 9px; text-align: center; line-height: 14px;
    }

    .footer {
      margin-top: 20px; padding-top: 14px;
      border-top: 2px solid #e2e8f0;
      display: flex; justify-content: space-between; flex-wrap: wrap;
      gap: 12px; font-size: 10.5px; color: #94a3b8;
    }

    .no-print {
      padding: 18px 32px; background: #f8fafc;
      border-top: 1px solid #e2e8f0; text-align: center;
      display: flex; justify-content: center; gap: 12px;
    }
    .print-btn {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white; border: none; padding: 11px 28px; border-radius: 10px;
      font-size: 13.5px; font-weight: 600; cursor: pointer;
    }
    .close-btn {
      background: #e2e8f0; color: #475569; border: none;
      padding: 11px 28px; border-radius: 10px; font-size: 13.5px;
      font-weight: 600; cursor: pointer;
    }

    @media print {
      body { background: white; padding: 0; }
      .page-container { box-shadow: none; border-radius: 0; max-width: 100%; }
      .no-print { display: none !important; }
      .header, .cell-morning, .cell-afternoon, .cell-night, .cell-oncall,
      .document-badge, tr.dept-header-row td {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .rota-wrap { overflow: visible; }
      table.rota { font-size: 8.5px; }
      table.rota td { height: 24px; }
      .cell-filled { min-width: 18px; height: 18px; font-size: 8px; }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="header">
      <div class="header-left">
        <div class="logo-placeholder">🏥</div>
        <div class="hospital-info">
          <h1>${escapeHtml(hospitalName)}</h1>
          <p>${escapeHtml(hospitalAddress)}</p>
          <p>Tel: ${escapeHtml(hospitalPhone)} &nbsp;|&nbsp; ${escapeHtml(hospitalEmail)}</p>
        </div>
      </div>
      <div class="header-right">
        <div class="document-badge">MONTHLY SHIFT ROTA${singleDeptName ? ' — DEPARTMENT' : ''}</div>
        <div class="document-range">${monthLabel}</div>
      </div>
    </div>

    <div class="content">
      <div class="meta-strip">
        <div class="meta-item">
          <span class="label">Month</span>
          <span class="value">${monthLabel}</span>
        </div>
        <div class="meta-item">
          <span class="label">Days</span>
          <span class="value">${daysInMonth}</span>
        </div>
        ${singleDeptName ? `
          <div class="meta-item">
            <span class="label">Department</span>
            <span class="value">${escapeHtml(singleDeptName)}</span>
          </div>
        ` : `
          <div class="meta-item">
            <span class="label">Departments</span>
            <span class="value">${orderedGroups.length}</span>
          </div>
        `}
        <div class="meta-item">
          <span class="label">Total Staff</span>
          <span class="value">${staffMeta.size}</span>
        </div>
        <div class="meta-item">
          <span class="label">Total Shifts</span>
          <span class="value">${shifts.length}</span>
        </div>
        <div class="meta-item">
          <span class="label">Facility Code</span>
          <span class="value" style="font-family:monospace;">${escapeHtml(hospitalCode)}</span>
        </div>
      </div>

      <div class="rota-wrap">
        <table class="rota">
          <thead>
            <tr>
              <th class="staff-col">Staff Member</th>
              ${days.map((d) => {
                const key = toKey(d);
                const cls = key === today
                  ? 'today-col'
                  : (d.getDay() === 0 || d.getDay() === 6) ? 'weekend-col' : '';
                return `<th class="${cls}">${d.getDate()}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${staffMeta.size === 0 ? `
              <tr><td colspan="${daysInMonth + 1}" style="text-align:center;padding:20px;color:#94a3b8;font-style:italic;">No shifts scheduled this month</td></tr>
            ` : orderedGroups.map(([groupKey, group]) => `
              ${showGroupHeaders ? `
                <tr class="dept-header-row">
                  <td colspan="${daysInMonth + 1}">
                    <span class="dot" style="background:${group.color};"></span>
                    ${escapeHtml(group.name)}
                    <span style="margin-left:8px;font-weight:500;color:#94a3b8;text-transform:none;letter-spacing:0;">· ${group.rows.length} staff</span>
                  </td>
                </tr>
              ` : ''}
              ${group.rows.map((row) => {
                const cellMap = grid.get(row.id) || new Map();
                return `
                  <tr>
                    <td class="staff-cell">
                      ${escapeHtml(row.name)}
                      <span class="role">${escapeHtml(row.role.replace(/_/g, ' '))}</span>
                    </td>
                    ${days.map((d) => {
                      const key = toKey(d);
                      const cls = key === today
                        ? 'today-col'
                        : (d.getDay() === 0 || d.getDay() === 6) ? 'weekend-col' : '';
                      const cells = cellMap.get(key);
                      return `<td class="${cls}">${renderCell(cells)}</td>`;
                    }).join('')}
                  </tr>
                `;
              }).join('')}
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="legend">
        <div class="legend-item"><span class="legend-swatch cell-morning">M</span> Morning</div>
        <div class="legend-item"><span class="legend-swatch cell-afternoon">A</span> Afternoon</div>
        <div class="legend-item"><span class="legend-swatch cell-night">N</span> Night</div>
        <div class="legend-item"><span class="legend-swatch cell-oncall">C</span> On Call</div>
      </div>

      <div class="footer">
        <div>Generated by ${escapeHtml(hospitalName)} — Shift Management</div>
        <div>Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Ref: ROTA-${year}-${String(month).padStart(2, '0')}</div>
      </div>
    </div>

    <div class="no-print">
      <button class="print-btn" onclick="window.print()">🖨️ Print Monthly Rota</button>
      <button class="close-btn" onclick="window.close()">✕ Close</button>
    </div>
  </div>
</body>
</html>
  `;
};