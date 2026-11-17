// src/utils/pdfTemplates/receiptPDF.ts
// A4 payment receipt: what was billed, what this payment covers, what is still owed.
import {
  esc, orDash, human, payerText, money, amountInWords, fmtDate, fmtDateTime,
  resolveHospital, docTitle, patientBanner, section, table, signatures, note, kvGrid, pageShell,
} from './printKit';

export const generateReceiptHTML = (bill: any, patient: any, payment: any, hospital: any): string => {
  const h = resolveHospital(hospital);
  const items: any[] = (bill?.BillLineItem || bill?.items || []).filter((i: any) => !i?.isVoided);

  const paid = Number(payment?.amount) || 0;
  const paidAt = payment?.paymentDate || payment?.transactionDate || payment?.createdAt || new Date().toISOString();
  // A receipt number is part of the record, not of the print: never invent a new one per print.
  const receiptNo = payment?.receiptNumber || payment?.receiptId || (payment?.id ? `RCP-${String(payment.id).slice(-8).toUpperCase()}` : bill?.billNumber ? `RCP-${bill.billNumber}` : 'RCP');
  const method = payment?.paymentMethod || payment?.paymentMode || '';
  const reference = payment?.reference || payment?.transactionId || '';
  const receivedBy = String(payment?.receivedBy?.fullName || payment?.receivedBy || payment?.processedBy?.fullName || payment?.processedBy || '').trim();

  const total = Number(bill?.totalAmount) || 0;
  const insurance = Number(bill?.insuranceCovered) || 0;
  const discount = (Number(bill?.discount) || 0) + (Number(bill?.waiverAmount) || 0);
  const tax = Number(bill?.taxAmount) || 0;
  const billPaid = Number(bill?.paidAmount) || 0;
  const balance = Math.max(0, Number(bill?.balance) || 0);
  const previous = Math.max(0, billPaid - paid);

  const rows = items.map((i) => [
    orDash(i?.itemCode || i?.code),
    esc(i?.description || i?.itemDescription || 'Item'),
    `<span class="muted">${human(i?.serviceType || i?.category)}</span>`,
    String(Number(i?.quantity) || 1),
    esc(money(i?.unitPrice ?? i?.price ?? 0).replace('GHS ', '')),
    esc(money(i?.lineTotal ?? i?.total ?? 0).replace('GHS ', '')),
  ]);

  const totals: string[][] = [
    ['', '', '', '', 'Bill total', `<b>${esc(money(total))}</b>`],
  ];
  if (discount > 0) totals.push(['', '', '', '', 'Discount / waiver', `− ${esc(money(discount))}`]);
  if (tax > 0) totals.push(['', '', '', '', 'VAT / levies', esc(money(tax))]);
  if (insurance > 0) totals.push(['', '', '', '', 'Covered by insurer', `− ${esc(money(insurance))}`]);

  const body = `
    ${docTitle('Payment receipt', { ref: receiptNo, refLabel: 'Receipt no.', date: paidAt, dateLabel: 'Date', status: balance <= 0 ? 'PAID IN FULL' : 'PART PAYMENT' })}
    ${patientBanner(
      patient,
      [
        ['Bill no.', orDash(bill?.billNumber)],
        ['Payer', payerText(bill?.paymentMode || payment?.paymentMode)],
        ['Payment method', human(method)],
        ['Reference', orDash(reference)],
      ],
      paidAt,
    )}

    ${section(
      'Charges',
      table({
        head: ['Code', 'Description', 'Type', 'Qty', 'Unit price', 'Amount'],
        widths: ['11%', '37%', '13%', '7%', '16%', '16%'],
        align: [undefined, undefined, undefined, 'c', 'r', 'r'],
        rows,
        foot: totals,
        empty: 'No billable items on this bill',
      }),
    )}

    ${section(
      'This payment',
      kvGrid(
        [
          ['Previous payments', esc(money(previous))],
          ['Amount received now', `<b>${esc(money(paid))}</b>`],
          ['Total paid to date', esc(money(billPaid))],
          ['Outstanding balance', balance > 0 ? `<b class="flag-c">${esc(money(balance))}</b>` : `<b>${esc(money(0))}</b>`],
        ],
        4,
      ) + `<div style="margin-top:5px;font-size:9pt"><span class="muted">Amount received in words:</span> <b>${esc(amountInWords(paid))}</b></div>`,
      { keepTogether: true },
    )}

    ${bill?.graDeclarationCode
      ? note(`<b>GRA E-VAT declaration:</b> ${esc(bill.graDeclarationCode)}${bill?.graValidationStatus ? ` · ${esc(human(bill.graValidationStatus))}` : ''}`)
      : ''}
    ${note('Keep this receipt as proof of payment. Payments are not refundable without the authorisation of the Accounts Office.')}

    ${signatures([
      { role: 'Received by (cashier)', name: receivedBy, date: paidAt, plain: true },
      { role: 'Paid by (patient / guardian)', plain: true },
    ])}
  `;

  return pageShell({
    title: `Receipt ${receiptNo}`,
    hospital: h,
    body,
    footerRef: `Receipt ${receiptNo}`,
    printLabel: 'Print receipt',
  });
};
