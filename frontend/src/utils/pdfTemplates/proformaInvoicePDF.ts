// src/utils/pdfTemplates/proformaInvoicePDF.ts
// Proforma invoice (estimate / quotation). Not a bill and not a receipt: it states what care
// is expected to cost and how long the quote is valid. Built on printKit.
import {
  esc, orDash, multiline, money, amountInWords, fmtDate, patientName,
  resolveHospital, docTitle, patientBanner, section, table, signatures, note, kvGrid, pageShell,
} from './printKit';

const n = (v: unknown): number => Number(v) || 0;
const amt = (v: unknown): string => money(v).replace('GHS ', '');

export const generateProformaInvoiceHTML = (est: any, hospital: any): string => {
  const h = resolveHospital(hospital);
  const e = est || {};
  const patient = e.patient || e.Patient || null;
  const items: any[] = Array.isArray(e.items) ? e.items : [];
  const refNo = e.referenceNumber || '';
  const issued = e.createdAt || new Date().toISOString();

  const subtotal = n(e.subtotal) || items.reduce((s, i) => s + n(i.totalPrice) - n(i.vatAmount), 0);
  const discount = n(e.discount);
  const tax = n(e.taxAmount);
  const total = n(e.totalAmount ?? e.total) || subtotal - discount + tax;

  const expires = e.expiresAt || (e.validityDays ? new Date(new Date(issued).getTime() + n(e.validityDays) * 86_400_000).toISOString() : null);
  const corporate = e.corporateAccount?.companyName || e.CorporateAccount?.companyName || '';
  const preparer = e.createdBy?.fullName || e.User_createdBy?.fullName || '';
  const status = String(e.status || '').replace(/_/g, ' ');

  const rows = items.map((it, i) => [
    String(i + 1),
    orDash(it.serviceCatalog?.code),
    `<b>${esc(it.description || 'Item')}</b>`,
    String(n(it.quantity) || 1),
    esc(amt(it.unitPrice)),
    esc(amt(it.vatAmount)),
    esc(amt(it.totalPrice)),
  ]);

  const foot: string[][] = [['', '', '', '', '', 'Subtotal', esc(amt(subtotal))]];
  if (discount > 0) foot.push(['', '', '', '', '', 'Discount', `− ${esc(amt(discount))}`]);
  if (tax > 0) foot.push(['', '', '', '', '', 'VAT / levies', esc(amt(tax))]);
  foot.push(['', '', '', '', '', 'Total', esc(amt(total))]);

  const client = patient
    ? patientBanner(
        patient,
        [
          ['Quote no.', orDash(refNo)],
          ['Issued', esc(fmtDate(issued))],
          ['Valid until', expires ? `<b>${esc(fmtDate(expires))}</b>` : '<span class="muted">—</span>'],
          ['Corporate account', orDash(corporate)],
        ],
        issued,
      )
    : section('Quote for', kvGrid(
        [
          ['Client', `<b>${esc(corporate || 'Walk-in client')}</b>`],
          ['Quote no.', orDash(refNo)],
          ['Issued', esc(fmtDate(issued))],
          ['Valid until', expires ? `<b>${esc(fmtDate(expires))}</b>` : '<span class="muted">—</span>'],
        ],
        4,
      ), { keepTogether: true });

  const body = `
    ${docTitle('Proforma invoice', { ref: refNo, refLabel: 'Quote no.', date: issued, dateLabel: 'Issued', status: status ? status.toUpperCase() : undefined })}
    ${client}

    ${section('Estimated charges', table({
      head: ['#', 'Code', 'Description', 'Qty', 'Unit price', 'VAT', 'Amount'],
      widths: ['5%', '11%', '37%', '6%', '15%', '12%', '14%'],
      align: ['c', undefined, undefined, 'c', 'r', 'r', 'r'],
      rows,
      foot,
      empty: 'No line items',
    }))}

    <div class="text-block" style="margin:4px 0 8px;text-align:right"><span class="muted">Estimated total in words:</span> <b>${esc(amountInWords(total))}</b></div>

    ${e.notes ? section('Notes', `<div class="text-block">${multiline(e.notes)}</div>`, { keepTogether: true }) : ''}
    ${e.termsAndConditions ? section('Terms and conditions', `<div class="text-block">${multiline(e.termsAndConditions)}</div>`, { keepTogether: true }) : ''}

    ${note(`<b>This is an estimate, not a bill or a receipt, and not a demand for payment.</b> Actual charges depend on the care given and may be higher or lower.${expires ? ` Prices are held until ${esc(fmtDate(expires))}.` : ''} ${e.graDeclarationCode ? `GRA E-VAT declaration: ${esc(e.graDeclarationCode)}.` : ''}`)}

    ${signatures([
      { role: 'Prepared by', name: preparer || h.name, plain: true },
      { role: 'Accepted by (client signature)', plain: true },
    ])}
  `;

  return pageShell({
    title: `Proforma invoice ${refNo}`,
    hospital: h,
    body,
    footerRef: refNo ? `Quote ${refNo}` : undefined,
    printLabel: 'Print proforma invoice',
  });
};
