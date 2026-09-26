// src/utils/pdfTemplates/shiftRotaPDF.ts
// Weekly shift rota — rows = staff, columns = 7 days

export const generateShiftRotaHTML = (
  shifts: any[],
  weekStart: string,
  hospital: any,
): string => {
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

  const start = new Date(weekStart);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  const end = days[6];

  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    d.toLocaleDateString('en-US', opts);

  const toKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const today = toKey(new Date());

  // Group shifts by (userId → dateKey → shifts[])
  type Cell = { letter: string; shiftType: string; start: string; end: string; id: string; notes?: string };
  const grid: Map<string, Map<string, Cell[]>> = new Map();
  const staffMeta: Map<string, { name: string; role: string; username: string }> = new Map();

  for (const s of shifts) {
    const userId = s.userId;
    if (!userId) continue;

    if (!staffMeta.has(userId)) {
      staffMeta.set(userId, {
        name: s.user?.fullName || '—',
        role: s.user?.role || '',
        username: s.user?.username || '',
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

    cellMap.get(dateKey)!.push({
      letter,
      shiftType: s.shiftType,
      start: startTime,
      end: endTime,
      id: s.id,
      notes: s.notes,
    });
  }

  const staffRows = Array.from(staffMeta.entries())
    .map(([id, meta]) => ({ id, ...meta }))
    .sort((a, b) => a.name.localeCompare(b.name));

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
    if (!cells || cells.length === 0) return '<td class="cell-empty"></td>';
    const letters = cells.map((c) => c.letter).join('+');
    const primary = cells[0].letter;
    const title = cells.map((c) => `${c.shiftType}: ${c.start}–${c.end}`).join(' | ');
    return `<td class="cell-filled ${cellColorClass(primary)}" title="${escapeHtml(title)}">${escapeHtml(letters)}</td>`;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Shift Rota — Week of ${fmt(start, { month: 'short', day: 'numeric', year: 'numeric' })}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 landscape; margin: 12mm; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f1f5f9;
      padding: 24px;
      color: #1e293b;
    }
    .page-container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.12);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 24px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left { display: flex; align-items: center; gap: 18px; }
    .logo-placeholder {
      width: 60px; height: 60px;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; font-weight: 700;
      border: 2px solid rgba(255,255,255,0.3);
    }
    .hospital-info h1 { font-size: 20px; font-weight: 700; margin-bottom: 3px; }
    .hospital-info p { font-size: 11.5px; opacity: 0.9; line-height: 1.4; }
    .header-right { text-align: right; }
    .document-badge {
      background: rgba(255,255,255,0.2);
      padding: 5px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 11.5px;
      letter-spacing: 0.5px;
    }
    .document-range {
      font-size: 13px;
      font-weight: 600;
      margin-top: 6px;
      opacity: 0.95;
    }
    .facility-code {
      font-size: 11px;
      opacity: 0.75;
      margin-top: 3px;
      font-family: monospace;
    }
    .content { padding: 24px 32px 32px; }

    .meta-strip {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      background: #f8fafc;
      border-radius: 10px;
      padding: 12px 18px;
      margin-bottom: 20px;
      border-left: 4px solid #3b82f6;
      font-size: 12px;
    }
    .meta-item { display: flex; flex-direction: column; }
    .meta-item .label {
      font-size: 9.5px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-item .value {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 1px;
    }

    table.rota {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      font-size: 12px;
    }
    table.rota th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 8px;
      border-bottom: 2px solid #cbd5e1;
      text-align: center;
    }
    table.rota th.staff-col {
      text-align: left;
      padding-left: 14px;
      width: 22%;
    }
    table.rota th.today-col { background: #cffafe; color: #0e7490; }
    table.rota th.weekend-col { background: #f1f5f9; color: #94a3b8; }

    table.rota td {
      padding: 6px 4px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #f1f5f9;
      text-align: center;
      font-weight: 600;
      font-size: 11px;
      height: 34px;
    }
    table.rota td.staff-cell {
      text-align: left;
      padding-left: 14px;
      background: #fafbfc;
      font-weight: 500;
      font-size: 12px;
      color: #0f172a;
    }
    table.rota td.staff-cell .role {
      display: block;
      font-size: 9.5px;
      color: #94a3b8;
      font-weight: 500;
      text-transform: capitalize;
      margin-top: 1px;
    }
    table.rota td.today-col { background: #f0fdff; }
    table.rota td.weekend-col { background: #fafbfc; }
    table.rota td.cell-empty { color: #cbd5e1; }
    table.rota td.cell-filled { color: #0f172a; border-radius: 4px; }

    td.cell-morning   { background: #d1fae5; color: #065f46; }
    td.cell-afternoon { background: #fed7aa; color: #9a3412; }
    td.cell-night     { background: #e9d5ff; color: #6b21a8; }
    td.cell-oncall    { background: #bfdbfe; color: #1e40af; }

    .legend {
      display: flex;
      gap: 18px;
      margin-top: 18px;
      flex-wrap: wrap;
      font-size: 11px;
      color: #475569;
    }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-swatch {
      display: inline-block;
      width: 16px;
      height: 16px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 10px;
      text-align: center;
      line-height: 16px;
    }

    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 24px;
    }
    .sig-box { min-width: 200px; text-align: center; }
    .sig-line {
      width: 200px;
      height: 1px;
      background: #94a3b8;
      margin: 28px auto 6px;
    }
    .sig-label {
      font-size: 10.5px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .sig-name {
      font-size: 12px;
      font-weight: 600;
      color: #0f172a;
      margin-top: 3px;
    }

    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 11px;
      color: #94a3b8;
    }
    .footer-left { line-height: 1.6; }
    .footer-right { text-align: right; line-height: 1.6; }

    .no-print {
      padding: 20px 40px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    .print-btn {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .print-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(59,130,246,0.4); }
    .close-btn {
      background: #e2e8f0;
      color: #475569;
      border: none;
      padding: 12px 32px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .close-btn:hover { background: #cbd5e1; }

    @media print {
      body { background: white; padding: 0; }
      .page-container { box-shadow: none; border-radius: 0; max-width: 100%; }
      .no-print { display: none !important; }
      .header, .cell-morning, .cell-afternoon, .cell-night, .cell-oncall, .document-badge {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      table.rota { font-size: 10px; }
      table.rota td { height: 28px; padding: 4px 2px; }
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
        <div class="document-badge">SHIFT ROTA</div>
        <div class="document-range">
          ${fmt(start, { month: 'short', day: 'numeric' })} – ${fmt(end, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div class="facility-code">${escapeHtml(hospitalCode)}</div>
      </div>
    </div>

    <div class="content">
      <div class="meta-strip">
        <div class="meta-item">
          <span class="label">Week Beginning</span>
          <span class="value">${fmt(start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div class="meta-item">
          <span class="label">Week Ending</span>
          <span class="value">${fmt(end, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div class="meta-item">
          <span class="label">Total Staff</span>
          <span class="value">${staffRows.length}</span>
        </div>
        <div class="meta-item">
          <span class="label">Total Shifts</span>
          <span class="value">${shifts.length}</span>
        </div>
      </div>

      <table class="rota">
        <thead>
          <tr>
            <th class="staff-col">Staff Member</th>
            ${days.map((d) => {
              const key = toKey(d);
              const cls = key === today ? 'today-col' : (d.getDay() === 0 || d.getDay() === 6) ? 'weekend-col' : '';
              return `<th class="${cls}">
                ${d.toLocaleDateString('en-US', { weekday: 'short' })}<br/>
                <span style="font-size:13px;color:#0f172a;">${d.getDate()}</span>
              </th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody>
          ${staffRows.length === 0 ? `
            <tr><td colspan="8" style="text-align:center;padding:24px;color:#94a3b8;font-style:italic;">No shifts scheduled for this week</td></tr>
          ` : staffRows.map((row) => {
            const cellMap = grid.get(row.id) || new Map();
            return `
              <tr>
                <td class="staff-cell">
                  ${escapeHtml(row.name)}
                  <span class="role">${escapeHtml(row.role.replace(/_/g, ' '))}</span>
                </td>
                ${days.map((d) => {
                  const key = toKey(d);
                  const cls = key === today ? 'today-col' : (d.getDay() === 0 || d.getDay() === 6) ? 'weekend-col' : '';
                  const cells = cellMap.get(key);
                  const inner = renderCell(cells);
                  // splice the day-specific class into the td
                  return inner.replace('<td', `<td class="${cls}"`);
                }).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="legend">
        <div class="legend-item">
          <span class="legend-swatch cell-morning">M</span> Morning
        </div>
        <div class="legend-item">
          <span class="legend-swatch cell-afternoon">A</span> Afternoon
        </div>
        <div class="legend-item">
          <span class="legend-swatch cell-night">N</span> Night
        </div>
        <div class="legend-item">
          <span class="legend-swatch cell-oncall">C</span> On Call
        </div>
      </div>

      <div class="signatures">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Prepared By</div>
          <div class="sig-name">&nbsp;</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Approved By</div>
          <div class="sig-name">&nbsp;</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Date</div>
          <div class="sig-name">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <div class="footer">
        <div class="footer-left">
          <p>Generated by ${escapeHtml(hospitalName)} — Shift Management</p>
          <p style="font-size:10px;color:#cbd5e1;margin-top:2px;">This rota is subject to change. Contact administration for updates.</p>
        </div>
        <div class="footer-right">
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p style="font-size:10px;color:#cbd5e1;margin-top:2px;">Ref: ROTA-${toKey(start)}</p>
        </div>
      </div>
    </div>

    <div class="no-print">
      <button class="print-btn" onclick="window.print()">🖨️ Print Rota</button>
      <button class="close-btn" onclick="window.close()">✕ Close</button>
    </div>
  </div>
</body>
</html>
  `;
};