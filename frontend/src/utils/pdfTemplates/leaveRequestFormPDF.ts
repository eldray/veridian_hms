// src/utils/pdfTemplates/leaveRequestFormPDF.ts
// Printable single leave request — matches referral letter style.

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  maternity: 'Maternity Leave',
  paternity: 'Paternity Leave',
  emergency: 'Emergency Leave',
  unpaid: 'Unpaid Leave',
};

export const generateLeaveRequestFormHTML = (
  leave: any,
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

  const fmtLong = (d?: string) => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return 'N/A'; }
  };

  const staffName = leave?.user?.fullName || '—';
  const staffUsername = leave?.user?.username || '';
  const staffRole = leave?.user?.role ? leave.user.role.replace(/_/g, ' ') : '';
  const staffDept = leave?.user?.department?.name || '';
  const leaveType = LEAVE_TYPE_LABELS[leave?.leaveType] || (leave?.leaveType || 'Leave');
  const startDate = leave?.startDate;
  const endDate = leave?.endDate;
  const totalDays = leave?.totalDays ?? 0;
  const status = leave?.status || 'pending';
  const reason = leave?.reason || '';
  const approverName = leave?.approvedBy?.fullName || leave?.approver?.fullName || '';

  const statusColors: Record<string, { bg: string; fg: string; label: string }> = {
    pending:   { bg: '#fef3c7', fg: '#b45309', label: 'PENDING' },
    approved:  { bg: '#d1fae5', fg: '#065f46', label: 'APPROVED' },
    rejected:  { bg: '#fee2e2', fg: '#991b1b', label: 'REJECTED' },
    cancelled: { bg: '#f1f5f9', fg: '#475569', label: 'CANCELLED' },
  };
  const stat = statusColors[status] ?? statusColors.pending;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Leave Request — ${escapeHtml(staffName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 14mm; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f1f5f9;
      padding: 24px;
      color: #1e293b;
    }
    .page-container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 14px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.12);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: white;
      padding: 26px 34px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left { display: flex; align-items: center; gap: 18px; }
    .logo-placeholder {
      width: 62px; height: 62px;
      background: rgba(255,255,255,0.15);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: 700;
      border: 2px solid rgba(255,255,255,0.3);
    }
    .hospital-info h1 { font-size: 21px; font-weight: 700; letter-spacing: -0.3px; margin-bottom: 4px; }
    .hospital-info p { font-size: 12px; opacity: 0.9; line-height: 1.4; }
    .header-right { text-align: right; }
    .document-badge {
      background: rgba(255,255,255,0.2);
      padding: 5px 16px; border-radius: 20px;
      font-weight: 600; font-size: 12px; letter-spacing: 0.5px;
    }
    .status-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 4px 14px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.6px;
      background: ${stat.bg};
      color: ${stat.fg};
    }

    .content { padding: 28px 34px 34px; }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 20px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .section-title:first-child { margin-top: 0; }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 8px;
    }
    .info-card {
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 10px;
      border-left: 3px solid #3b82f6;
    }
    .info-card .label {
      font-size: 10px; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .info-card .value {
      font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 3px;
      text-transform: capitalize;
    }

    .leave-summary {
      background: #eff6ff;
      border-radius: 12px;
      padding: 20px 24px;
      border-left: 4px solid #3b82f6;
      margin: 16px 0;
    }
    .leave-summary .leave-type {
      font-size: 20px; font-weight: 700; color: #1e3a8a; margin-bottom: 6px;
    }
    .leave-summary .leave-range {
      font-size: 15px; font-weight: 600; color: #1e293b;
    }
    .leave-summary .leave-days {
      font-size: 13px; color: #475569; margin-top: 4px;
    }

    .clinical-box {
      background: #f8fafc;
      border-radius: 10px;
      padding: 14px 18px;
      border: 1px solid #e2e8f0;
      line-height: 1.7;
      font-size: 13.5px;
      color: #1e293b;
      white-space: pre-wrap;
      min-height: 60px;
    }

    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 2px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 20px;
    }
    .sig-box { text-align: center; min-width: 200px; }
    .sig-line {
      width: 200px; height: 1px; background: #94a3b8; margin: 30px auto 8px;
    }
    .sig-label {
      font-size: 11px; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.4px;
    }
    .sig-name {
      font-weight: 600; color: #0f172a; font-size: 13px; margin-top: 4px;
    }

    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 11px;
      color: #94a3b8;
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
      .page-container { box-shadow: none; border-radius: 0; }
      .no-print { display: none !important; }
      .header, .status-badge, .leave-summary, .info-card {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
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
        <div class="document-badge">LEAVE REQUEST</div>
        <div class="status-badge">${stat.label}</div>
      </div>
    </div>

    <div class="content">
      <div class="section-title">👤 Staff Information</div>
      <div class="info-grid">
        <div class="info-card">
          <div class="label">Full Name</div>
          <div class="value">${escapeHtml(staffName)}</div>
        </div>
        <div class="info-card">
          <div class="label">Username</div>
          <div class="value" style="font-family:monospace;">@${escapeHtml(staffUsername)}</div>
        </div>
        <div class="info-card">
          <div class="label">Role</div>
          <div class="value">${escapeHtml(staffRole)}</div>
        </div>
        <div class="info-card">
          <div class="label">Department</div>
          <div class="value">${escapeHtml(staffDept || '—')}</div>
        </div>
      </div>

      <div class="section-title">📅 Leave Details</div>
      <div class="leave-summary">
        <div class="leave-type">${escapeHtml(leaveType)}</div>
        <div class="leave-range">${fmtLong(startDate)} &nbsp;→&nbsp; ${fmtLong(endDate)}</div>
        <div class="leave-days">Total: <strong>${totalDays}</strong> day${totalDays !== 1 ? 's' : ''}</div>
      </div>

      ${reason ? `
        <div class="section-title">📝 Reason</div>
        <div class="clinical-box">${escapeHtml(reason)}</div>
      ` : ''}

      <div class="signatures">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Applicant Signature</div>
          <div class="sig-name">${escapeHtml(staffName)}</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Approved By</div>
          <div class="sig-name">${escapeHtml(approverName || '&nbsp;')}</div>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Date</div>
          <div class="sig-name">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <div class="footer">
        <div>
          <p>This is an official leave request document from ${escapeHtml(hospitalName)}.</p>
          <p style="margin-top:4px;font-size:10.5px;color:#cbd5e1;">
            Leave ID: ${escapeHtml(leave?.id || 'N/A')}
          </p>
        </div>
        <div style="text-align:right;">
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>

    <div class="no-print">
      <button class="print-btn" onclick="window.print()">🖨️ Print Leave Request</button>
      <button class="close-btn" onclick="window.close()">✕ Close</button>
    </div>
  </div>
</body>
</html>
  `;
};