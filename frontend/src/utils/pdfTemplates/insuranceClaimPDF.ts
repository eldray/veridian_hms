// src/utils/pdfTemplates/insuranceClaimPDF.ts

const esc = (v: any): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const fmtDate = (v: any): string => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

const fmtMoney = (v: any): string => {
  if (v == null) return '0.00';
  const n = typeof v === 'number' ? v : parseFloat(v.toString());
  if (isNaN(n)) return '0.00';
  return n.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const generateInsuranceClaimHTML = (
  claim: any,
  hospital: any,
): string => {
  const patient = claim?.Patient ?? claim?.patient ?? {};
  const attendance = claim?.Attendance ?? claim?.attendance ?? {};
  const admission = attendance?.Admission ?? null;
  const items: any[] = claim?.items ?? [];
  const insuranceProvider = claim?.InsuranceProvider ?? claim?.insuranceProvider ?? {};
  const corporateAccount = claim?.CorporateAccount ?? claim?.corporateAccount ?? null;

  const providerType: string = insuranceProvider?.type ?? 'nhis';
  const providerName: string = insuranceProvider?.name ?? '—';
  const corporateName = corporateAccount?.companyName ?? null;

  const claimTypeLabel =
    providerType === 'nhis'
      ? 'NHIS CLAIM'
      : providerType === 'private'
      ? 'PRIVATE INSURANCE CLAIM'
      : 'CORPORATE CLAIM';

  const hospitalName = hospital?.name ?? 'Hospital';
  const hospitalAddress = hospital?.address ?? '';
  const hospitalPhone = hospital?.phone ?? '';
  const hospitalEmail = hospital?.email ?? '';

  const totalItems = items.reduce(
    (s, i) => s + parseFloat(i.lineTotal?.toString?.() ?? '0'),
    0,
  );

  const statusBadge =
    claim.status === 'finalized'
      ? '<span class="badge badge-finalized">FINALIZED</span>'
      : '<span class="badge badge-draft">DRAFT</span>';

  const itemsRows = items
    .map(
      (i) => `
      <tr>
        <td>${esc(i.itemNumber)}</td>
        <td>${esc(i.description)}</td>
        <td><code>${esc(i.code)}</code></td>
        <td style="text-align:center">${esc(i.quantity)}</td>
        <td style="text-align:right">${fmtMoney(i.unitPrice)}</td>
        <td style="text-align:right">${fmtMoney(i.lineTotal)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${esc(claimTypeLabel)} — ${esc(claim.claimNumber)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f1f5f9; padding: 30px; color: #1e293b; }
  .page { max-width: 1000px; margin: 0 auto; background: white; border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden; }
  .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; padding: 26px 36px; display: flex; justify-content: space-between; align-items: center; }
  .header-left { display: flex; align-items: center; gap: 18px; }
  .logo { width: 62px; height: 62px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 28px; border: 2px solid rgba(255,255,255,0.3); }
  .hospital-name { font-size: 20px; font-weight: 700; }
  .hospital-meta { font-size: 12px; opacity: 0.9; line-height: 1.5; }
  .header-right { text-align: right; }
  .doc-badge { background: rgba(255,255,255,0.2); padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; }
  .doc-number { font-size: 14px; font-weight: 700; margin-top: 6px; }
  .patient-bar { background: #f8fafc; padding: 16px 36px; border-bottom: 2px solid #e2e8f0; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
  .field { display: flex; flex-direction: column; }
  .field .label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .field .value { font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px; }
  .content { padding: 24px 36px 32px; }
  .section-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 12px; }
  .info-card { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #2563eb; }
  .info-card .label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-card .value { font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 10px 0; }
  thead th { background: #f1f5f9; padding: 9px 12px; text-align: left; font-weight: 600; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
  tbody td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tbody tr:last-child td { border-bottom: none; }
  code { font-family: 'Courier New', monospace; font-size: 12px; background: #f1f5f9; padding: 1px 6px; border-radius: 3px; }
  .totals { margin-top: 14px; display: flex; justify-content: flex-end; }
  .totals-table { width: 320px; border-collapse: collapse; font-size: 13px; }
  .totals-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
  .totals-table td:first-child { color: #64748b; }
  .totals-table td:last-child { text-align: right; font-weight: 600; }
  .totals-table tr:last-child td { border-top: 2px solid #0f172a; border-bottom: none; padding-top: 10px; font-size: 15px; font-weight: 700; color: #0f172a; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; letter-spacing: 0.5px; }
  .badge-finalized { background: #dcfce7; color: #166534; }
  .badge-draft { background: #fef3c7; color: #92400e; }
  .signature-section { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 20px; }
  .signature-box { min-width: 200px; text-align: center; }
  .signature-line { height: 1px; background: #94a3b8; margin: 38px auto 8px; }
  .signature-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .signature-name { font-weight: 600; font-size: 13px; color: #0f172a; margin-top: 4px; }
  .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
  .no-print { padding: 18px 36px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: center; gap: 12px; }
  .btn { padding: 10px 26px; border-radius: 8px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; }
  .btn-primary { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; }
  .btn-secondary { background: #e2e8f0; color: #475569; }
  @media print {
    body { background: white; padding: 0; }
    .page { box-shadow: none; border-radius: 0; }
    .no-print { display: none !important; }
    .header, .badge { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <div class="logo">🏥</div>
      <div>
        <div class="hospital-name">${esc(hospitalName)}</div>
        <div class="hospital-meta">${esc(hospitalAddress)}<br>Tel: ${esc(hospitalPhone)} &nbsp;|&nbsp; ${esc(hospitalEmail)}</div>
      </div>
    </div>
    <div class="header-right">
      <div class="doc-badge">${esc(claimTypeLabel)}</div>
      <div class="doc-number">${esc(claim.claimNumber)}</div>
    </div>
  </div>

  <div class="patient-bar">
    <div class="field"><span class="label">Patient</span><span class="value">${esc(patient.surname)} ${esc(patient.otherNames)}</span></div>
    <div class="field"><span class="label">Folder No.</span><span class="value">${esc(patient.folderNumber)}</span></div>
    <div class="field"><span class="label">NHIS No.</span><span class="value">${esc(patient.nhisNumber ?? '—')}</span></div>
    <div class="field"><span class="label">Claim Status</span><span class="value">${statusBadge}</span></div>
    <div class="field"><span class="label">Provider</span><span class="value">${esc(providerName)}${corporateName ? ` · ${esc(corporateName)}` : ''}</span></div>
  </div>

  <div class="content">
    <div class="section-title">Claim Information</div>
    <div class="info-grid">
      <div class="info-card"><div class="label">Attendance No.</div><div class="value">${esc(attendance.attendanceNumber ?? '—')}</div></div>
      <div class="info-card"><div class="label">Visit Date</div><div class="value">${fmtDate(attendance.dateTime)}</div></div>
      <div class="info-card"><div class="label">Type of Service</div><div class="value">${esc(claim.typeOfService ?? '—')}</div></div>
      <div class="info-card"><div class="label">Type of Attendance</div><div class="value">${esc(claim.typeOfAttendance ?? '—')}</div></div>
      <div class="info-card"><div class="label">Outcome</div><div class="value">${esc(claim.serviceOutcome ?? '—')}</div></div>
      <div class="info-card"><div class="label">Principal GDRG</div><div class="value">${esc(claim.principalGDRG ?? '—')}</div></div>
      ${claim.claimCheckCode ? `<div class="info-card"><div class="label">Claim Check Code</div><div class="value">${esc(claim.claimCheckCode)}</div></div>` : ''}
      ${claim.preAuthNumber ? `<div class="info-card"><div class="label">Pre-Auth No.</div><div class="value">${esc(claim.preAuthNumber)}</div></div>` : ''}
    </div>

    ${
      admission
        ? `<div class="info-grid">
            <div class="info-card"><div class="label">Admission Date</div><div class="value">${fmtDate(admission.admissionDate)}</div></div>
            <div class="info-card"><div class="label">Discharge Date</div><div class="value">${fmtDate(admission.dischargeDate)}</div></div>
          </div>`
        : ''
    }

    <div class="section-title">Itemized Services</div>
    <table>
      <thead>
        <tr>
          <th style="width:50px">#</th>
          <th>Description</th>
          <th style="width:120px">Code</th>
          <th style="width:60px;text-align:center">Qty</th>
          <th style="width:110px;text-align:right">Unit Price</th>
          <th style="width:120px;text-align:right">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px;">No items on this claim.</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <table class="totals-table">
        <tr><td>Items</td><td>${items.length}</td></tr>
        <tr><td>Grand Total (GHS)</td><td>${fmtMoney(totalItems)}</td></tr>
      </table>
    </div>

    <div class="signature-section">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Prepared By</div>
        <div class="signature-name">________________________</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Approved By</div>
        <div class="signature-name">________________________</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Patient / Guardian</div>
        <div class="signature-name">________________________</div>
      </div>
    </div>

    <div class="footer">
      <div>${esc(hospitalName)} · ${esc(hospital?.nhisFacilityCode ?? '')}</div>
      <div>Generated ${new Date().toLocaleString()}</div>
    </div>
  </div>

  <div class="no-print">
    <button class="btn btn-primary" onclick="window.print()">🖨️ Print Claim</button>
    <button class="btn btn-secondary" onclick="window.close()">✕ Close</button>
  </div>
</div>
</body>
</html>`;
};