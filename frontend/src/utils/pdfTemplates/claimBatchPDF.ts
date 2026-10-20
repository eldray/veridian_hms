// src/utils/pdfTemplates/claimBatchPDF.ts

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

export const generateClaimBatchHTML = (
  batch: any,
  hospital: any,
): string => {
  const insuranceType: string = batch?.insuranceType ?? 'nhis';
  const providerName = batch?.insuranceProvider?.name ?? '—';
  const corporateName = batch?.corporateAccount?.companyName ?? null;
  const claims: any[] = batch?.claims ?? [];

  const labelMap: Record<string, string> = {
    nhis: 'NHIS CLAIM BATCH',
    private: 'PRIVATE INSURANCE CLAIM BATCH',
    corporate: 'CORPORATE CLAIM BATCH',
  };
  const docLabel = labelMap[insuranceType] ?? 'CLAIM BATCH';

  const period = `${batch?.periodYear ?? ''}-${String(batch?.periodMonth ?? '').padStart(2, '0')}`;
  const totalAmount = claims.reduce(
    (s, c) => s + parseFloat(c?.totalClaimAmount?.toString?.() ?? '0'),
    0,
  );

  const hospitalName = hospital?.name ?? 'Hospital';
  const hospitalAddress = hospital?.address ?? '';
  const hospitalPhone = hospital?.phone ?? '';
  const hospitalEmail = hospital?.email ?? '';

  const rows = claims
    .map(
      (c, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><code>${esc(c.claimNumber)}</code></td>
        <td>${esc(c.Patient?.surname ?? '')} ${esc(c.Patient?.otherNames ?? '')}</td>
        <td>${esc(c.Patient?.folderNumber ?? '')}</td>
        <td>${fmtDate(c.Attendance?.dateTime)}</td>
        <td style="text-align:center">${esc(c.serviceOutcome ?? '—')}</td>
        <td style="text-align:right">${fmtMoney(c.totalClaimAmount)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${esc(docLabel)} — ${esc(batch?.batchNumber ?? '')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f1f5f9; padding: 30px; color: #1e293b; }
  .page { max-width: 1100px; margin: 0 auto; background: white; border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,0.12); overflow: hidden; }
  .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; padding: 26px 36px; display: flex; justify-content: space-between; align-items: center; }
  .header-left { display: flex; align-items: center; gap: 18px; }
  .logo { width: 62px; height: 62px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 28px; border: 2px solid rgba(255,255,255,0.3); }
  .hospital-name { font-size: 20px; font-weight: 700; }
  .hospital-meta { font-size: 12px; opacity: 0.9; line-height: 1.5; }
  .header-right { text-align: right; }
  .doc-badge { background: rgba(255,255,255,0.2); padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; }
  .doc-number { font-size: 14px; font-weight: 700; margin-top: 6px; }
  .content { padding: 26px 36px 32px; }
  .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .info-card { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #2563eb; }
  .info-card .label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-card .value { font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px; }
  .section-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 10px 0; }
  thead th { background: #f1f5f9; padding: 9px 12px; text-align: left; font-weight: 600; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
  tbody td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
  tbody tr:last-child td { border-bottom: none; }
  code { font-family: 'Courier New', monospace; font-size: 12px; background: #f1f5f9; padding: 1px 6px; border-radius: 3px; }
  .totals { margin-top: 14px; display: flex; justify-content: flex-end; }
  .totals-table { width: 300px; border-collapse: collapse; font-size: 13px; }
  .totals-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
  .totals-table td:first-child { color: #64748b; }
  .totals-table td:last-child { text-align: right; font-weight: 600; }
  .totals-table tr:last-child td { border-top: 2px solid #0f172a; border-bottom: none; padding-top: 10px; font-size: 15px; font-weight: 700; color: #0f172a; }
  .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
  .no-print { padding: 18px 36px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: center; gap: 12px; }
  .btn { padding: 10px 26px; border-radius: 8px; border: none; font-size: 14px; font-weight: 600; cursor: pointer; }
  .btn-primary { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; }
  .btn-secondary { background: #e2e8f0; color: #475569; }
  @media print {
    body { background: white; padding: 0; }
    .page { box-shadow: none; border-radius: 0; }
    .no-print { display: none !important; }
    .header { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
      <div class="doc-badge">${esc(docLabel)}</div>
      <div class="doc-number">${esc(batch?.batchNumber ?? '')}</div>
    </div>
  </div>

  <div class="content">
    <div class="info-grid">
      <div class="info-card"><div class="label">Period</div><div class="value">${esc(period)}</div></div>
      <div class="info-card"><div class="label">Provider</div><div class="value">${esc(providerName)}${corporateName ? ` · ${esc(corporateName)}` : ''}</div></div>
      <div class="info-card"><div class="label">Total Claims</div><div class="value">${claims.length}</div></div>
      <div class="info-card"><div class="label">Status</div><div class="value">${esc(batch?.status?.toUpperCase() ?? '')}</div></div>
      <div class="info-card"><div class="label">Generated</div><div class="value">${fmtDate(batch?.generatedAt)}</div></div>
      ${batch?.finalizedAt ? `<div class="info-card"><div class="label">Finalized</div><div class="value">${fmtDate(batch.finalizedAt)}</div></div>` : ''}
    </div>

    <div class="section-title">Claims in Batch</div>
    <table>
      <thead>
        <tr>
          <th style="width:50px">#</th>
          <th>Claim No.</th>
          <th>Patient</th>
          <th>Folder No.</th>
          <th>Visit Date</th>
          <th style="text-align:center">Outcome</th>
          <th style="text-align:right">Amount (GHS)</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:20px;">No claims in this batch.</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <table class="totals-table">
        <tr><td>Total Claims</td><td>${claims.length}</td></tr>
        <tr><td>Grand Total (GHS)</td><td>${fmtMoney(totalAmount)}</td></tr>
      </table>
    </div>

    <div class="footer">
      <div>${esc(hospitalName)} · ${esc(hospital?.nhisFacilityCode ?? '')}</div>
      <div>Generated ${new Date().toLocaleString()}</div>
    </div>
  </div>

  <div class="no-print">
    <button class="btn btn-primary" onclick="window.print()">🖨️ Print Summary</button>
    <button class="btn btn-secondary" onclick="window.close()">✕ Close</button>
  </div>
</div>
</body>
</html>`;
};