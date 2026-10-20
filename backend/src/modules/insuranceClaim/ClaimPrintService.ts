import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { InsuranceClaimRepository } from './InsuranceClaimRepository';

const formatDate = (v: Date | string | null | undefined): string => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
};

const formatMoney = (v: any): string => {
  if (v == null) return '0.00';
  const n = typeof v === 'number' ? v : parseFloat(v.toString());
  if (isNaN(n)) return '0.00';
  return n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const esc = (s: any): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export class ClaimPrintService {
  private repo: InsuranceClaimRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.repo = new InsuranceClaimRepository(prisma);
  }

  // ==========================================
  // SINGLE CLAIM PRINT
  // ==========================================
  async renderClaimHtml(claimId: string): Promise<string> {
    const claim: any = await this.repo.findClaimById(claimId);
    if (!claim) throw new NotFoundError('Claim', claimId);

    const hospital = await this.prisma.hospital.findFirst();
    if (!hospital) throw new ValidationError('Hospital record not found');

    const providerType: string = claim.InsuranceProvider?.type ?? 'nhis';
    const providerName: string = claim.InsuranceProvider?.name ?? '—';
    const corporateName = claim.CorporateAccount?.companyName ?? null;

    const patient = claim.Patient ?? {};
    const attendance = claim.Attendance ?? {};
    const admission = attendance.Admission ?? null;
    const items: any[] = claim.items ?? [];

    const totalItems = items.reduce(
      (s, i) => s + parseFloat(i.lineTotal?.toString?.() ?? '0'),
      0,
    );

    const itemsTable = items
      .map(
        (i) => `
        <tr>
          <td>${esc(i.itemNumber)}</td>
          <td>${esc(i.description)}</td>
          <td><code>${esc(i.code)}</code></td>
          <td style="text-align:center">${esc(i.quantity)}</td>
          <td style="text-align:right">${formatMoney(i.unitPrice)}</td>
          <td style="text-align:right">${formatMoney(i.lineTotal)}</td>
        </tr>`,
      )
      .join('');

    const statusBadge =
      claim.status === 'finalized'
        ? '<span class="badge badge-finalized">FINALIZED</span>'
        : '<span class="badge badge-draft">DRAFT</span>';

    const claimTypeLabel =
      providerType === 'nhis'
        ? 'NHIS CLAIM'
        : providerType === 'private'
        ? 'PRIVATE INSURANCE CLAIM'
        : 'CORPORATE CLAIM';

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
        <div class="hospital-name">${esc(hospital.name)}</div>
        <div class="hospital-meta">${esc(hospital.address)}<br>Tel: ${esc(hospital.phone)} &nbsp;|&nbsp; ${esc(hospital.email)}</div>
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
      <div class="info-card"><div class="label">Visit Date</div><div class="value">${formatDate(attendance.dateTime)}</div></div>
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
            <div class="info-card"><div class="label">Admission Date</div><div class="value">${formatDate(admission.admissionDate)}</div></div>
            <div class="info-card"><div class="label">Discharge Date</div><div class="value">${formatDate(admission.dischargeDate)}</div></div>
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
        ${itemsTable || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px;">No items on this claim.</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <table class="totals-table">
        <tr><td>Items</td><td>${items.length}</td></tr>
        <tr><td>Grand Total (GHS)</td><td>${formatMoney(totalItems)}</td></tr>
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
      <div>${esc(hospital.name)} · ${esc(hospital.nhisFacilityCode ?? '')}</div>
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
  }

  // ==========================================
  // BATCH SUMMARY PRINT
  // ==========================================
  async renderBatchHtml(batchId: string): Promise<string> {
    const batch: any = await this.repo.findBatchById(batchId);
    if (!batch) throw new NotFoundError('Claim batch', batchId);

    const hospital = await this.prisma.hospital.findFirst();
    if (!hospital) throw new ValidationError('Hospital record not found');

    const insuranceType: string = batch.insuranceType;
    const providerName = batch.insuranceProvider?.name ?? '—';
    const corporateName = batch.corporateAccount?.companyName ?? null;

    const claims: any[] = batch.claims ?? [];
    const totalAmount = claims.reduce(
      (s, c) => s + parseFloat(c.totalClaimAmount?.toString?.() ?? '0'),
      0,
    );

    const rows = claims
      .map(
        (c, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><code>${esc(c.claimNumber)}</code></td>
          <td>${esc(c.Patient?.surname ?? '')} ${esc(c.Patient?.otherNames ?? '')}</td>
          <td>${esc(c.Patient?.folderNumber ?? '')}</td>
          <td>${formatDate(c.Attendance?.dateTime)}</td>
          <td style="text-align:center">${esc(c.serviceOutcome ?? '—')}</td>
          <td style="text-align:right">${formatMoney(c.totalClaimAmount)}</td>
        </tr>`,
      )
      .join('');

    const labelMap: Record<string, string> = {
      nhis: 'NHIS CLAIM BATCH',
      private: 'PRIVATE INSURANCE CLAIM BATCH',
      corporate: 'CORPORATE CLAIM BATCH',
    };
    const docLabel = labelMap[insuranceType] ?? 'CLAIM BATCH';
    const period = `${batch.periodYear}-${String(batch.periodMonth).padStart(2, '0')}`;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${esc(docLabel)} — ${esc(batch.batchNumber)}</title>
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
        <div class="hospital-name">${esc(hospital.name)}</div>
        <div class="hospital-meta">${esc(hospital.address)}<br>Tel: ${esc(hospital.phone)} &nbsp;|&nbsp; ${esc(hospital.email)}</div>
      </div>
    </div>
    <div class="header-right">
      <div class="doc-badge">${esc(docLabel)}</div>
      <div class="doc-number">${esc(batch.batchNumber)}</div>
    </div>
  </div>

  <div class="content">
    <div class="info-grid">
      <div class="info-card"><div class="label">Period</div><div class="value">${esc(period)}</div></div>
      <div class="info-card"><div class="label">Provider</div><div class="value">${esc(providerName)}${corporateName ? ` · ${esc(corporateName)}` : ''}</div></div>
      <div class="info-card"><div class="label">Total Claims</div><div class="value">${claims.length}</div></div>
      <div class="info-card"><div class="label">Status</div><div class="value">${esc(batch.status?.toUpperCase())}</div></div>
      <div class="info-card"><div class="label">Generated</div><div class="value">${formatDate(batch.generatedAt)}</div></div>
      ${batch.finalizedAt ? `<div class="info-card"><div class="label">Finalized</div><div class="value">${formatDate(batch.finalizedAt)}</div></div>` : ''}
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
        <tr><td>Grand Total (GHS)</td><td>${formatMoney(totalAmount)}</td></tr>
      </table>
    </div>

    <div class="footer">
      <div>${esc(hospital.name)} · ${esc(hospital.nhisFacilityCode ?? '')}</div>
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
  }
}