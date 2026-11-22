import { PrismaClient } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { InsuranceClaimRepository } from './InsuranceClaimRepository';
import { renderBatchSummaryHtml, renderMonthlySummaryHtml } from './ClaimSummaryPrint';

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
    const claimCategories = [
      { key: 'diagnosis', label: 'Diagnoses', payable: false },
      { key: 'service', label: 'Consultation / Services', payable: true },
      { key: 'procedure', label: 'Procedures', payable: true },
      { key: 'investigation', label: 'Laboratory & Imaging', payable: true },
      { key: 'medicine', label: 'Medicines', payable: true },
      { key: 'gdrg', label: 'G-DRG package', payable: true },
    ];
    const categoryTotals = claimCategories.map((category) => {
      const rows = items.filter((item) => String(item.itemCategory || '').toLowerCase() === category.key);
      return { ...category, rows, total: rows.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0) };
    }).filter((category) => category.rows.length > 0);
    const itemsTable = categoryTotals.map((category) => `
      <tr class="group-row"><td colspan="6">${esc(category.label)} <span class="muted">· ${category.rows.length} item(s)</span></td></tr>
      ${category.rows.map((i) => `
        <tr>
          <td class="center">${esc(i.itemNumber)}</td>
          <td>${esc(i.description)}</td>
          <td class="code">${esc(i.code)}</td>
          <td class="center">${esc(i.quantity)}</td>
          <td class="num">${formatMoney(i.unitPrice)}</td>
          <td class="num">${formatMoney(i.lineTotal)}</td>
        </tr>`).join('')}
      <tr class="subtotal"><td colspan="5" class="num">${esc(category.label)} subtotal</td><td class="num">${formatMoney(category.total)}</td></tr>
    `).join('');
    const payableTotal = categoryTotals.filter((category) => category.payable).reduce((sum, category) => sum + category.total, 0);
    const status = claim.status === 'finalized' ? 'FINALIZED' : 'DRAFT';
    const typeLabel = providerType === 'nhis' ? 'NHIS CLAIM' : providerType === 'private' ? 'PRIVATE INSURANCE CLAIM' : 'CORPORATE CLAIM';
    const claimRef = String(claim.claimNumber || '');
    const printDate = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const hospitalContact = [hospital.phone && `Tel: ${esc(hospital.phone)}`, hospital.email && esc(hospital.email)].filter(Boolean).join(' · ');
    const hospitalMeta = [hospital.address, hospitalContact, hospital.nhisFacilityCode && `NHIA facility code: ${esc(hospital.nhisFacilityCode)}`].filter(Boolean).map(esc).join(' · ');
    const patientName = [patient.surname, patient.otherNames].filter(Boolean).join(' ').trim() || '—';
    const totalItems = categoryTotals.filter((category) => category.payable).reduce((sum, category) => sum + category.rows.length, 0);
    return `<!DOCTYPE html>
<html lang="en-GH"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(typeLabel)} — ${esc(claimRef)}</title>
<style>
  @page { size: A4; margin: 14mm 14mm 17mm; @bottom-left { content: "${esc(hospital.name)} · ${esc(claimRef)} · Confidential · Printed ${printDate}"; font: 8pt Arial; color: #555; } @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt Arial; color:#555; } }
  * { box-sizing:border-box; margin:0; padding:0; }
  :root { --ink:#111827; --muted:#6b7280; --rule:#c9ced6; --soft:#f3f4f6; --accent:#14532d; }
  html { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
  body { font:10pt/1.45 "Segoe UI",Arial,Helvetica,sans-serif; color:var(--ink); background:#e5e7eb; }
  .page { width:210mm; margin:12px auto; background:#fff; padding:14mm; box-shadow:0 1px 6px rgba(0,0,0,.18); }
  .letterhead { display:flex; align-items:center; gap:12px; padding-bottom:8px; border-bottom:2px solid var(--accent); }
  .lh-main { flex:1; min-width:0; } .lh-name { font-size:15pt; font-weight:700; color:var(--accent); line-height:1.2; }
  .lh-meta { font-size:8.5pt; color:#374151; }
  .lh-code { text-align:right; font-size:8pt; color:#374151; }
  .doc-title { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; margin:10px 0 8px; }
  .doc-title h1 { font-size:15pt; font-weight:700; text-transform:uppercase; letter-spacing:.6px; }
  .doc-meta { text-align:right; font-size:9pt; line-height:1.5; }
  .k { color:var(--muted); margin-right:4px; } .status { display:inline-block; border:1px solid var(--ink); padding:1px 8px; border-radius:3px; font-size:8pt; font-weight:700; letter-spacing:.5px; }
  .grid { display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid var(--rule); border-left:1px solid var(--rule); }
  .cell { padding:4px 7px; border-right:1px solid var(--rule); border-bottom:1px solid var(--rule); min-width:0; }
  .label { font-size:7.5pt; text-transform:uppercase; letter-spacing:.4px; color:var(--muted); }
  .value { font-size:9.5pt; font-weight:500; word-break:break-word; }
  .patient { margin-bottom:10px; background:var(--soft); }
  .section { margin-top:11px; } .section h2 { font-size:9pt; font-weight:700; text-transform:uppercase; letter-spacing:.7px; color:var(--accent); border-bottom:1px solid var(--accent); padding-bottom:2px; margin-bottom:5px; }
  table { width:100%; border-collapse:collapse; font-size:9pt; }
  th { background:var(--soft); text-align:left; font-size:8pt; text-transform:uppercase; letter-spacing:.3px; padding:4px 6px; border:1px solid var(--rule); }
  td { padding:4px 6px; border:1px solid var(--rule); vertical-align:top; }
  .num { text-align:right; font-variant-numeric:tabular-nums; } .center { text-align:center; }
  .group-row td { background:#e9eef4; color:#23415e; font-weight:700; border-top:1px solid #b8c6d6; }
  .subtotal td { background:var(--soft); font-weight:600; color:#4b5563; }
  .code { font-family:Consolas,monospace; font-size:8.5pt; }
  .muted { color:var(--muted); font-weight:400; }
  .total-box { margin:12px 0 0 auto; width:300px; border:1px solid var(--rule); }
  .total-box div { display:flex; justify-content:space-between; padding:7px 10px; }
  .total-box .grand { background:var(--soft); border-top:2px solid var(--ink); font-size:11pt; font-weight:700; }
  .signatures { display:flex; gap:18px; margin-top:26px; }
  .signature { flex:1; font-size:8.5pt; } .line { border-bottom:1px solid var(--ink); height:28px; }
  .signature .role { font-weight:700; margin-top:4px; } .signature .meta { color:var(--muted); margin-top:2px; }
  .foot { margin-top:16px; padding-top:6px; border-top:1px solid var(--rule); font-size:8pt; color:var(--muted); display:flex; justify-content:space-between; gap:12px; }
  .toolbar { position:fixed; top:12px; right:16px; display:flex; gap:8px; }
  .toolbar button { font:600 10pt "Segoe UI",Arial,sans-serif; padding:7px 14px; border-radius:6px; border:1px solid var(--accent); cursor:pointer; background:var(--accent); color:#fff; }
  .toolbar button.alt { background:#fff; color:var(--accent); }
  @media print { body { background:#fff; } .page { width:auto; margin:0; padding:0; box-shadow:none; } .toolbar { display:none !important; } * { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Print claim</button><button class="alt" onclick="window.close()">Close</button></div>
<main class="page">
  <header class="letterhead"><div class="lh-main"><div class="lh-name">${esc(hospital.name)}</div><div class="lh-meta">${hospitalMeta}</div></div><div class="lh-code">${hospital.nhisFacilityCode ? `NHIA facility code: <b>${esc(hospital.nhisFacilityCode)}</b>` : ''}</div></header>
  <div class="doc-title"><h1>${esc(typeLabel)}</h1><div class="doc-meta"><div><span class="k">Claim no.</span><b>${esc(claimRef)}</b></div><div><span class="k">Attendance date</span><b>${formatDate(attendance.dateTime)}</b></div><div class="status">${esc(status)}</div></div></div>
  <section class="patient grid">
    ${[['Patient',patientName],['Folder no.',patient.folderNumber || '—'],['NHIS no.',patient.nhisNumber || '—'],['Status',status],['Payer / provider',providerName],['Corporate account',corporateName || '—'],['Attendance no.',attendance.attendanceNumber || '—'],['Attendance type',claim.typeOfAttendance || '—']].map(([label,value])=>`<div class="cell"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div></div>`).join('')}
  </section>
  <section class="section"><h2>Claim and service details</h2><div class="grid">
    ${[['Type of service',claim.typeOfService || '—'],['Outcome',claim.serviceOutcome || '—'],['Principal G-DRG',claim.principalGDRG || '—'],['Claim check code',claim.claimCheckCode || '—'],['Pre-authorisation',claim.preAuthNumber || '—'],['Admission date',formatDate(admission?.admissionDate)],['Discharge date',formatDate(admission?.dischargeDate)],['Payer',corporateName || providerName]].map(([label,value])=>`<div class="cell"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div></div>`).join('')}
  </div></section>
  <section class="section"><h2>Itemised claim services</h2><table><thead><tr><th style="width:7%">#</th><th>Description</th><th style="width:14%">Code</th><th class="center" style="width:8%">Qty</th><th class="num" style="width:16%">Unit price</th><th class="num" style="width:16%">Line total</th></tr></thead><tbody>${itemsTable || '<tr><td colspan="6" class="center muted">No items recorded on this claim.</td></tr>'}</tbody></table></section>
  <div class="total-box"><div><span>Payable item count</span><b>${totalItems}</b></div><div class="grand"><span>Claim total (GHS)</span><b>${formatMoney(payableTotal)}</b></div></div>
  <section class="signatures"><div class="signature"><div class="line"></div><div class="role">Prepared by</div><div class="meta">Name / signature / date</div></div><div class="signature"><div class="line"></div><div class="role">Verified / approved by</div><div class="meta">Name / signature / date</div></div><div class="signature"><div class="line"></div><div class="role">Facility stamp</div><div class="meta">Official stamp</div></div></section>
  <div class="foot"><span>${esc(hospital.name)} · ${esc(claimRef)} · Confidential</span><span>Printed ${esc(printDate)}</span></div>
</main></body></html>`;
  }

  // ==========================================
  // BATCH SUMMARY PRINT (figures, not individual claims; ?detail=1 adds the claim list)
  // ==========================================
  async renderBatchHtml(batchId: string, opts: { detail?: boolean } = {}): Promise<string> {
    const batch: any = await this.prisma.claimBatch.findUnique({
      where: { id: batchId },
      include: {
        insuranceProvider: { select: { name: true, type: true } },
        corporateAccount: { select: { companyName: true } },
        claims: {
          select: {
            claimNumber: true, patientId: true, totalClaimAmount: true, typeOfService: true, mdcCode: true,
            Attendance: { select: { dateTime: true } },
            Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
            items: { select: { itemCategory: true, lineTotal: true } },
          },
          orderBy: { claimNumber: 'asc' },
        },
      },
    });
    if (!batch) throw new NotFoundError('Claim batch', batchId);
    const hospital = await this.prisma.hospital.findFirst();
    if (!hospital) throw new ValidationError('Hospital record not found');
    return renderBatchSummaryHtml(batch, hospital, opts);
  }

  // ==========================================
  // MONTHLY SUMMARY PRINT (every payer for one month)
  // ==========================================
  async renderMonthlyHtml(year: number, month: number, insuranceType?: string): Promise<string> {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new ValidationError('A valid year and month are required');
    }
    const hospital = await this.prisma.hospital.findFirst();
    if (!hospital) throw new ValidationError('Hospital record not found');
    const batches: any[] = await this.prisma.claimBatch.findMany({
      where: { periodYear: year, periodMonth: month, ...(insuranceType ? { insuranceType: insuranceType as any } : {}) },
      include: {
        insuranceProvider: { select: { name: true } },
        corporateAccount: { select: { companyName: true } },
        claims: { select: { patientId: true, totalClaimAmount: true, typeOfService: true, items: { select: { itemCategory: true, lineTotal: true } } } },
      },
    });
    return renderMonthlySummaryHtml(batches, year, month, hospital, insuranceType);
  }
}
