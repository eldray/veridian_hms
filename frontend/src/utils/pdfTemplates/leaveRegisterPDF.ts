// src/utils/pdfTemplates/leaveRegisterPDF.ts
// Yearly leave register — rows = staff, columns = 12 months.
// Each bar inside a month cell shows date-range and leave type.

const LEAVE_TYPE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  annual:    { bg: '#dbeafe', fg: '#1e40af', label: 'Annual' },
  sick:      { bg: '#d1fae5', fg: '#065f46', label: 'Sick' },
  maternity: { bg: '#fce7f3', fg: '#9d174d', label: 'Maternity' },
  paternity: { bg: '#e9d5ff', fg: '#6b21a8', label: 'Paternity' },
  emergency: { bg: '#fee2e2', fg: '#991b1b', label: 'Emergency' },
  unpaid:    { bg: '#f1f5f9', fg: '#334155', label: 'Unpaid' },
};

export const generateLeaveRegisterHTML = (
  leaves: any[],
  year: number,
  staffFilter: string | null,
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

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Filter to the year
  const yearLeaves = leaves.filter((l) => {
    const start = new Date(l.startDate);
    const end = new Date(l.endDate);
    return start.getFullYear() === year || end.getFullYear() === year;
  });

  // Group by staff
  const byStaff: Map<string, { name: string; role: string; leaves: any[] }> = new Map();

  for (const l of yearLeaves) {
    const userId = l.userId;
    if (!userId) continue;
    if (staffFilter && userId !== staffFilter) continue;

    if (!byStaff.has(userId)) {
      byStaff.set(userId, {
        name: l.user?.fullName || '—',
        role: l.user?.role || '',
        leaves: [],
      });
    }
    byStaff.get(userId)!.leaves.push(l);
  }

  const staffRows = Array.from(byStaff.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => a.name.localeCompare(b.name));

  /**
   * Given a leave, a month index (0-11) and the year, return the portion
   * of the leave that falls within that month, or null if none.
   */
  const portionInMonth = (leave: any, month: number) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);
    const leaveStart = new Date(leave.startDate);
    const leaveEnd = new Date(leave.endDate);

    if (leaveEnd < monthStart || leaveStart > monthEnd) return null;

    const overlapStart = leaveStart < monthStart ? monthStart : leaveStart;
    const overlapEnd = leaveEnd > monthEnd ? monthEnd : leaveEnd;

    return { from: overlapStart.getDate(), to: overlapEnd.getDate() };
  };

  const renderBar = (leave: any, month: number) => {
    const portion = portionInMonth(leave, month);
    if (!portion) return null;

    const colors = LEAVE_TYPE_COLORS[leave.leaveType] ?? LEAVE_TYPE_COLORS.unpaid;
    const rangeText =
      portion.from === portion.to
        ? `${portion.from}`
        : `${portion.from}–${portion.to}`;

    return `
      <div class="leave-bar" style="background:${colors.bg};color:${colors.fg};" title="${escapeHtml(leave.leaveType)} ${rangeText}">
        <span class="bar-range">${rangeText}</span>
        <span class="bar-type">${escapeHtml(colors.label)}</span>
      </div>
    `;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Leave Register — ${year}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 landscape; margin: 10mm; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f1f5f9;
      padding: 22px;
      color: #1e293b;
    }
    .page-container {
      max-width: 1500px;
      margin: 0 auto;
      background: white;
      border-radius: 14px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.12);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 22px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .logo-placeholder {
      width: 56px; height: 56px;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 700;
      border: 2px solid rgba(255,255,255,0.3);
    }
    .hospital-info h1 { font-size: 19px; font-weight: 700; margin-bottom: 3px; }
    .hospital-info p { font-size: 11.5px; opacity: 0.9; line-height: 1.4; }
    .header-right { text-align: right; }
    .document-badge {
      background: rgba(255,255,255,0.2);
      padding: 5px 16px; border-radius: 20px;
      font-weight: 600; font-size: 11.5px; letter-spacing: 0.5px;
    }
    .document-range {
      font-size: 13.5px; font-weight: 600; margin-top: 6px; opacity: 0.95;
    }
    .content { padding: 22px 32px 28px; }

    .meta-strip {
      display: flex; justify-content: space-between; flex-wrap: wrap;
      gap: 18px; background: #f8fafc; border-radius: 10px;
      padding: 12px 18px; margin-bottom: 18px;
      border-left: 4px solid #3b82f6; font-size: 12px;
    }
    .meta-item { display: flex; flex-direction: column; }
    .meta-item .label {
      font-size: 9.5px; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .meta-item .value {
      font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 1px;
    }

    .rota-wrap {
      overflow-x: auto;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }

    table.register {
      border-collapse: collapse;
      width: 100%;
      min-width: 1200px;
      font-size: 11px;
    }
    table.register th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 9px 4px;
      border-bottom: 2px solid #cbd5e1;
      text-align: center;
    }
    table.register th.staff-col {
      text-align: left;
      padding-left: 14px;
      width: 180px;
      min-width: 180px;
    }
    table.register td {
      padding: 4px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #f1f5f9;
      vertical-align: top;
      height: 56px;
      width: 8.5%;
    }
    table.register td.staff-cell {
      text-align: left;
      padding: 8px 14px;
      background: #fafbfc;
      font-weight: 600;
      font-size: 12px;
      color: #0f172a;
      vertical-align: middle;
    }
    table.register td.staff-cell .role {
      display: block;
      font-size: 9.5px;
      color: #94a3b8;
      text-transform: capitalize;
      font-weight: 500;
      margin-top: 2px;
    }

    .leave-bar {
      display: flex;
      flex-direction: column;
      align-items: center;
      border-radius: 5px;
      padding: 3px 2px;
      font-weight: 700;
      font-size: 10px;
      margin-bottom: 3px;
      text-align: center;
      line-height: 1.15;
    }
    .leave-bar .bar-range { font-size: 11px; }
    .leave-bar .bar-type {
      font-size: 8.5px;
      font-weight: 600;
      opacity: 0.85;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      margin-top: 1px;
    }

    .legend {
      display: flex; gap: 18px; margin-top: 16px; flex-wrap: wrap;
      font-size: 11px; color: #475569;
    }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-swatch {
      display: inline-block;
      width: 16px; height: 16px; border-radius: 4px;
    }

    .signatures {
      display: flex; justify-content: space-between; margin-top: 36px;
      padding-top: 20px; border-top: 2px solid #e2e8f0;
      flex-wrap: wrap; gap: 24px;
    }
    .sig-box { min-width: 220px; text-align: center; }
    .sig-line {
      width: 220px; height: 1px; background: #94a3b8; margin: 28px auto 6px;
    }
    .sig-label {
      font-size: 10.5px; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.4px;
    }
    .sig-name {
      font-size: 12px; font-weight: 600; color: #0f172a; margin-top: 3px;
    }

    .footer {
      margin-top: 24px; padding-top: 16px;
      border-top: 2px solid #e2e8f0;
      display: flex; justify-content: space-between; flex-wrap: wrap;
      gap: 12px; font-size: 11px; color: #94a3b8;
    }

    .no-print {
      padding: 20px 40px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      display: flex; justify-content: center; gap: 12px;
    }
    .print-btn {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white; border: none; padding: 12px 32px; border-radius: 10px;
      font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .close-btn {
      background: #e2e8f0; color: #475569; border: none;
      padding: 12px 32px; border-radius: 10px; font-size: 14px;
      font-weight: 600; cursor: pointer;
    }

    @media print {
      body { background: white; padding: 0; }
      .page-container { box-shadow: none; border-radius: 0; max-width: 100%; }
      .no-print { display: none !important; }
      .header, .leave-bar, .legend-swatch, .document-badge {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .rota-wrap { overflow: visible; }
      table.register { font-size: 10px; }
      table.register td { height: 48px; }
      .leave-bar { font-size: 9px; padding: 2px 1px; }
      .leave-bar .bar-range { font-size: 10px; }
      .leave-bar .bar-type { font-size: 7.5px; }
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
        <div class="document-badge">LEAVE REGISTER</div>
        <div class="document-range">${year}</div>
        <div style="font-size:10.5px;opacity:0.75;margin-top:4px;font-family:monospace;">${escapeHtml(hospitalCode)}</div>
      </div>
    </div>

    <div class="content">
      <div class="meta-strip">
        <div class="meta-item">
          <span class="label">Reporting Year</span>
          <span class="value">${year}</span>
        </div>
        <div class="meta-item">
          <span class="label">Total Staff</span>
          <span class="value">${staffRows.length}</span>
        </div>
        <div class="meta-item">
          <span class="label">Total Leave Records</span>
          <span class="value">${yearLeaves.length}</span>
        </div>
        <div class="meta-item">
          <span class="label">Generated</span>
          <span class="value">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      <div class="rota-wrap">
        <table class="register">
          <thead>
            <tr>
              <th class="staff-col">Staff Member</th>
              ${MONTHS.map((m) => `<th>${m.slice(0, 3)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${staffRows.length === 0 ? `
              <tr>
                <td colspan="13" style="text-align:center;padding:26px;color:#94a3b8;font-style:italic;">
                  No leave records found for ${year}
                </td>
              </tr>
            ` : staffRows.map((row) => `
              <tr>
                <td class="staff-cell">
                  ${escapeHtml(row.name)}
                  <span class="role">${escapeHtml(row.role.replace(/_/g, ' '))}</span>
                </td>
                ${MONTHS.map((_, idx) => {
                  const bars = row.leaves
                    .map((l) => renderBar(l, idx))
                    .filter(Boolean)
                    .join('');
                  return `<td>${bars}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="legend">
        ${Object.entries(LEAVE_TYPE_COLORS).map(([key, cfg]) => `
          <div class="legend-item">
            <span class="legend-swatch" style="background:${cfg.bg};border:1px solid ${cfg.fg}33;"></span>
            ${cfg.label}
          </div>
        `).join('')}
      </div>

      <div class="signatures">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Prepared By (HR)</div>
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
        <div>Generated by ${escapeHtml(hospitalName)} — Leave Management</div>
        <div>Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Ref: LEAVE-REG-${year}</div>
      </div>
    </div>

    <div class="no-print">
      <button class="print-btn" onclick="window.print()">🖨️ Print Leave Register</button>
      <button class="close-btn" onclick="window.close()">✕ Close</button>
    </div>
  </div>
</body>
</html>
  `;
};