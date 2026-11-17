// src/utils/pdfTemplates/claimBatchPDF.ts
// Cover sheet and schedule for a monthly claim batch (what is sent to NHIA / the insurer / the employer).
import {
  esc, orDash, human, money, fmtDate, patientName,
  resolveHospital, docTitle, section, table, signatures, note, kvGrid, pageShell,
} from './printKit';

const n = (v: unknown): number => Number(v) || 0;
const amt = (v: unknown): string => money(v).replace('GHS ', '');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const generateClaimBatchHTML = (batch: any, hospital: any): string => {
  const h = resolveHospital(hospital);
  const claims: any[] = batch?.claims ?? [];
  const type = String(batch?.insuranceType ?? 'nhis');
  const label = type === 'nhis' ? 'NHIS claim batch' : type === 'corporate' ? 'Corporate claim batch' : type === 'private' ? 'Private insurance claim batch' : 'Claim batch';
  const month = Number(batch?.periodMonth);
  const period = month >= 1 && month <= 12 ? `${MONTHS[month - 1]} ${batch?.periodYear ?? ''}` : String(batch?.periodYear ?? '');
  const provider = batch?.insuranceProvider?.name || '';
  const corporate = batch?.corporateAccount?.companyName || '';
  const batchNo = batch?.batchNumber || '';

  const total = claims.reduce((s, c) => s + n(c?.totalClaimAmount), 0);
  const ipd = claims.filter((c) => c?.typeOfService === 'IPD' || c?.Attendance?.Admission).length;
  const opd = claims.length - ipd;

  const rows = claims.map((c, i) => [
    String(i + 1),
    `<code>${esc(c?.claimNumber)}</code>`,
    esc(patientName(c?.Patient)),
    orDash(c?.Patient?.nhisNumber || c?.Patient?.insurancePolicyNumber),
    orDash(c?.Attendance?.nhisCCC),
    esc(fmtDate(c?.Attendance?.dateTime)),
    c?.typeOfService === 'IPD' || c?.Attendance?.Admission ? 'IPD' : 'OPD',
    orDash(c?.principalGDRG || c?.gdrgCodes?.[0]),
    human(c?.serviceOutcome),
    esc(amt(c?.totalClaimAmount)),
  ]);

  const missingMember = claims.filter((c) => !(c?.Patient?.nhisNumber || c?.Patient?.insurancePolicyNumber)).length;
  const missingGdrg = claims.filter((c) => !(c?.principalGDRG || c?.gdrgCodes?.[0])).length;

  const body = `
    ${docTitle(label, { ref: batchNo, refLabel: 'Batch no.', date: batch?.createdAt || new Date(), dateLabel: 'Prepared', status: batch?.status ? String(batch.status).toUpperCase() : undefined })}
    ${kvGrid(
      [
        ['Claim period', `<b>${esc(period)}</b>`],
        ['Insurer / scheme', orDash(provider)],
        ['Employer (corporate)', orDash(corporate)],
        ['NHIA facility code', orDash(h.nhisFacilityCode)],
        ['Number of claims', `<b>${claims.length}</b>`],
        ['Out-patient / In-patient', `${opd} / ${ipd}`],
        ['Total claimed', `<b>${esc(money(total))}</b>`],
        ['Facility', esc(h.name)],
      ],
      4,
    )}

    ${type === 'nhis' && (missingMember || missingGdrg)
      ? note(`<b>Check before submitting:</b> ${missingMember ? `${missingMember} claim(s) without an NHIS member number. ` : ''}${missingGdrg ? `${missingGdrg} claim(s) without a G-DRG code.` : ''}`, 'warn')
      : ''}

    ${section('Schedule of claims', table({
      head: ['#', 'Claim no.', 'Member name', 'NHIS no.', 'CCC', 'Attended', 'Type', 'G-DRG', 'Outcome', 'Amount (GHS)'],
      widths: ['4%', '13%', '20%', '11%', '9%', '9%', '5%', '8%', '9%', '12%'],
      align: ['c', undefined, undefined, undefined, undefined, undefined, 'c', undefined, undefined, 'r'],
      rows,
      foot: [['', '', '', '', '', '', '', '', 'Total', esc(amt(total))]],
      empty: 'No claims in this batch',
    }))}

    ${note('I certify that the claims listed are for services rendered to members by this facility in the period stated and that they are correct to the best of my knowledge.')}

    ${signatures([
      { role: 'Prepared by (claims officer)', plain: true },
      { role: 'Verified by (head of accounts / medical records)', plain: true },
      { role: 'Approved by (medical director / administrator)', plain: true },
    ])}
  `;

  return pageShell({
    title: `${label} ${batchNo}`,
    hospital: h,
    body,
    footerRef: batchNo ? `Batch ${batchNo}` : undefined,
    pageSize: 'A4 landscape',
    printLabel: 'Print batch',
  });
};
