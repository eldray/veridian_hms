// src/utils/pdfTemplates/thermalReceiptPDF.ts
// Payment receipt for a POS receipt printer (80 mm or 58 mm roll).
import { esc, orDash, human, payerText, money, amountInWords, fmtDateTime, patientName } from './printKit';
import {
  resolveHospital, slipHeader, slipTitle, rule, gap, centre, row, field, signLine, slipFooter, slipShell,
  getThermalWidth,
} from './thermalKit';

const num = (v: unknown): string => money(v).replace('GHS ', '');

export const generateThermalReceiptHTML = (bill: any, patient: any, payment: any, hospital: any, paperWidth?: number): string => {
  const h = resolveHospital(hospital);
  const width = getThermalWidth(paperWidth);
  const items: any[] = (bill?.BillLineItem || bill?.items || []).filter((i: any) => !i?.isVoided);

  const paid = Number(payment?.amount) || 0;
  const paidAt = payment?.paymentDate || payment?.transactionDate || payment?.createdAt || new Date().toISOString();
  const receiptNo = payment?.receiptNumber || payment?.reference || (payment?.id ? `RCP-${String(payment.id).slice(-8).toUpperCase()}` : bill?.billNumber ? `RCP-${bill.billNumber}` : 'RCP');
  const method = payment?.paymentMethod || payment?.paymentMode || 'cash';
  const receivedBy = String(payment?.receivedBy?.fullName || payment?.receivedBy || payment?.User?.fullName || '').trim();

  const counter = bill?.CounterClient || bill?.counterClient;
  const who = patient ? patientName(patient) : counter?.name || 'Counter customer';

  const total = Number(bill?.totalAmount) || 0;
  const discount = (Number(bill?.discount) || 0) + (Number(bill?.waiverAmount) || 0);
  const tax = Number(bill?.taxAmount) || 0;
  const insurance = Number(bill?.insuranceCovered) || 0;
  const billPaid = Number(bill?.paidAmount) || 0;
  const balance = Math.max(0, bill?.balance ?? total - billPaid);
  const previous = Math.max(0, billPaid - paid);

  const itemsHtml = items.length
    ? items
        .map((i) => {
          const q = Number(i?.quantity) || 1;
          const unit = i?.unitPrice ?? i?.price ?? 0;
          const line = i?.lineTotal ?? i?.total ?? Number(unit) * q;
          return `<div class="item"><div class="name">${esc(i?.description || i?.itemDescription || 'Item')}</div>
            <div class="row detail"><span>${q} x ${esc(num(unit))}</span><span class="r">${esc(num(line))}</span></div></div>`;
        })
        .join('')
    : centre('No itemised services', 'sm');

  const body = `
    ${slipHeader(h)}
    ${slipTitle('Payment receipt')}
    ${row('Receipt no.', esc(receiptNo))}
    ${row('Date', esc(fmtDateTime(paidAt)))}
    ${row('Bill no.', orDash(bill?.billNumber))}
    ${rule()}
    ${field('Received from', esc(who))}
    ${patient?.folderNumber ? row('Folder no.', esc(patient.folderNumber)) : ''}
    ${patient?.nhisNumber ? row('NHIS no.', esc(patient.nhisNumber)) : ''}
    ${row('Payer', payerText(bill?.paymentMode))}
    ${rule()}
    ${itemsHtml}
    ${rule()}
    ${row('Bill total', esc(num(total)), { bold: true })}
    ${discount > 0 ? row('Discount / waiver', `-${esc(num(discount))}`) : ''}
    ${tax > 0 ? row('VAT / levies', esc(num(tax))) : ''}
    ${insurance > 0 ? row('Insurer covers', `-${esc(num(insurance))}`) : ''}
    ${previous > 0 ? row('Paid earlier', esc(num(previous))) : ''}
    ${rule()}
    ${row(`PAID (${String(method).replace(/_/g, ' ')})`, `GHS ${esc(num(paid))}`, { bold: true })}
    ${payment?.reference && payment.reference !== receiptNo ? row('Ref', esc(payment.reference)) : ''}
    ${row('Balance due', `GHS ${esc(num(balance))}`, { bold: true })}
    ${gap()}
    ${centre(esc(amountInWords(paid)), 'sm')}
    ${bill?.graDeclarationCode ? `${gap()}${centre(`GRA E-VAT: ${esc(bill.graDeclarationCode)}`, 'sm')}` : ''}
    ${receivedBy ? `${gap()}${row('Cashier', esc(receivedBy))}` : ''}
    ${slipFooter(['Thank you. Keep this receipt as', 'proof of payment.'])}
  `;
  return slipShell({ title: `Receipt ${receiptNo}`, body, width, printLabel: 'Print receipt' });
};
