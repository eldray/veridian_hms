// src/utils/pdfTemplates/billStatementPDF.ts
// Itemised statement of a bill: charges, adjustments, payments received, balance due.
import {
  esc, orDash, human, payerText, money, fmtDate, fmtDateTime,
  resolveHospital, docTitle, patientBanner, section, table, signatures, note, kvGrid, pageShell,
} from './printKit';

const n = (v: unknown): number => Number(v) || 0;
const amt = (v: unknown): string => money(v).replace('GHS ', '');

export const generateBillStatementHTML = (bill: any, patient: any, hospital: any): string => {
  const h = resolveHospital(hospital);
  const items: any[] = (bill?.BillLineItem || bill?.items || []).filter((i: any) => !i?.isVoided);
  const payments: any[] = bill?.payments || bill?.Payments || bill?.Payment || bill?.paymentHistory || [];

  const billNo = bill?.billNumber || '';
  const billDate = bill?.billDate || bill?.createdAt || new Date().toISOString();

  const subtotal = n(bill?.subtotal) || items.reduce((s, i) => s + n(i?.lineTotal ?? i?.total), 0);
  const discount = n(bill?.discount);
  const waiver = n(bill?.waiverAmount);
  const tax = n(bill?.taxAmount);
  const total = n(bill?.totalAmount) || subtotal - discount - waiver + tax;
  const insurance = n(bill?.insuranceCovered);
  const patientPayable = bill?.patientPayable != null ? n(bill.patientPayable) : total - insurance;
  const paid = n(bill?.paidAmount) || payments.reduce((s, p) => s + n(p?.amount), 0);
  const balance = Math.max(0, bill?.balance != null ? n(bill.balance) : patientPayable - paid);
  const status = String(bill?.status || '').replace(/_/g, ' ');

  const itemRows = items.map((i, idx) => [
    String(idx + 1),
    orDash(i?.itemCode || i?.code),
    esc(i?.description || i?.itemDescription || 'Item'),
    `<span class="muted">${human(i?.serviceType || i?.category)}</span>`,
    String(n(i?.quantity) || 1),
    esc(amt(i?.unitPrice ?? i?.price ?? 0)),
    esc(amt(i?.lineTotal ?? i?.total ?? 0)),
  ]);

  const foot: string[][] = [['', '', '', '', '', 'Subtotal', esc(amt(subtotal))]];
  if (discount > 0) foot.push(['', '', '', '', '', 'Discount', `− ${esc(amt(discount))}`]);
  if (waiver > 0) foot.push(['', '', '', '', '', 'Waiver', `− ${esc(amt(waiver))}`]);
  if (tax > 0) foot.push(['', '', '', '', '', 'VAT / levies', esc(amt(tax))]);
  foot.push(['', '', '', '', '', 'Bill total', esc(amt(total))]);

  const paymentRows = payments.map((p) => [
    esc(fmtDateTime(p?.paymentDate || p?.transactionDate || p?.createdAt)),
    orDash(p?.receiptNumber || p?.reference || p?.transactionId),
    human(p?.paymentMethod || p?.paymentMode || p?.method),
    orDash(String(p?.receivedBy?.fullName || p?.receivedBy || p?.processedBy?.fullName || p?.processedBy || p?.createdBy?.fullName || p?.createdBy || '')),
    esc(amt(p?.amount)),
  ]);

  const body = `
    ${docTitle('Statement of account', { ref: billNo, refLabel: 'Bill no.', date: billDate, dateLabel: 'Bill date', status: status ? status.toUpperCase() : undefined })}
    ${patientBanner(
      patient,
      [
        ['Bill no.', orDash(billNo)],
        ['Payer', payerText(bill?.paymentMode)],
        ['Pre-authorisation', orDash(bill?.preAuthNumber)],
        ['Claim no.', orDash(bill?.claimNumber)],
      ],
      billDate,
    )}

    ${section(
      'Charges',
      table({
        head: ['#', 'Code', 'Description', 'Type', 'Qty', 'Unit price', 'Amount'],
        widths: ['5%', '10%', '37%', '12%', '6%', '15%', '15%'],
        align: ['c', undefined, undefined, undefined, 'c', 'r', 'r'],
        rows: itemRows,
        foot,
        empty: 'No billable items',
      }),
    )}

    ${section(
      'Payments received',
      table({
        head: ['Date', 'Receipt / ref.', 'Method', 'Received by', 'Amount (GHS)'],
        widths: ['24%', '22%', '16%', '22%', '16%'],
        align: [undefined, undefined, undefined, undefined, 'r'],
        rows: paymentRows,
        empty: 'No payments recorded',
      }),
      { keepTogether: true },
    )}

    ${section(
      'Summary',
      kvGrid(
        [
          ['Bill total', esc(money(total))],
          ['Covered by insurer', esc(money(insurance))],
          ['Patient payable', esc(money(patientPayable))],
          ['Paid to date', esc(money(paid))],
        ],
        4,
      ) +
        `<div style="margin-top:6px;text-align:right;font-size:12pt"><span class="muted" style="font-size:9pt">BALANCE DUE</span> <b class="${balance > 0 ? 'flag-c' : ''}">${esc(money(balance))}</b></div>`,
      { keepTogether: true },
    )}

    ${bill?.graDeclarationCode ? note(`<b>GRA E-VAT declaration:</b> ${esc(bill.graDeclarationCode)}`) : ''}
    ${note(`This statement shows the position on ${esc(fmtDate(new Date()))}. Please settle any balance at the Accounts Office and quote the bill number.`)}

    ${signatures([{ role: 'Accounts officer', plain: true }, { role: 'Patient / guardian', plain: true }])}
  `;

  return pageShell({
    title: `Statement ${billNo}`,
    hospital: h,
    body,
    footerRef: billNo ? `Bill ${billNo}` : undefined,
    printLabel: 'Print statement',
  });
};
