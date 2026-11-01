// src/utils/pdfTemplates/thermalReceiptPDF.ts
// 80mm thermal-paper payment receipt. Narrow, monospace, dashed separators —
// the shape a POS receipt printer actually spits out, not an A4 document.
import { CURRENCY_CODE } from '../../utils/currency';

const escapeHtml = (text: any): string => {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
};

const money = (amount: any): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (!Number.isFinite(num)) return (0).toFixed(2);
  return num.toFixed(2);
};

const getPartyName = (patient: any, bill: any): string => {
  if (patient?.fullName) return patient.fullName;
  if (patient?.surname && patient?.otherNames) return `${patient.surname} ${patient.otherNames}`;
  if (patient?.name) return patient.name;
  const counter = bill?.CounterClient || bill?.counterClient;
  if (counter?.name) return counter.name;
  return 'Counter customer';
};

export const generateThermalReceiptHTML = (
  bill: any,
  patient: any,
  payment: any,
  hospital: any,
): string => {
  const hospitalName = hospital?.name || 'Veridian Hospital';
  const hospitalAddress = hospital?.address || '';
  const hospitalPhone = hospital?.phone || '';
  const hospitalEmail = hospital?.email || '';

  const receiptNumber = payment?.receiptNumber || payment?.reference || payment?.id || `RCP-${Date.now()}`;
  const amount = payment?.amount ?? 0;
  const paymentMethod = String(payment?.paymentMethod || payment?.paymentMode || 'cash').replace('_', ' ');
  const paymentDate = payment?.paymentDate || payment?.transactionDate || new Date().toISOString();
  const receivedBy = payment?.receivedBy || payment?.User?.fullName || 'System';

  const billNumber = bill?.billNumber || 'N/A';
  const billTotal = bill?.totalAmount ?? 0;
  const billPaid = bill?.paidAmount ?? 0;
  const billBalance = Math.max(0, (bill?.balance ?? (billTotal - billPaid)));
  const previousPayments = Math.max(0, billPaid - amount);

  const folder = patient?.folderNumber;

  const dt = new Date(paymentDate);
  const dateStr = Number.isNaN(dt.getTime()) ? new Date().toLocaleString() : dt.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const items: any[] = (bill?.BillLineItem || bill?.items || []).filter((i: any) => !i.isVoided);
  const itemsHtml = items.length === 0
    ? `<div class="muted center">No itemised services</div>`
    : items.map((item: any) => {
        const desc = item.description || item.itemDescription || 'Item';
        const qty = item.quantity || 1;
        const lineTotal = item.lineTotal ?? item.total ?? ((item.unitPrice || item.price || 0) * qty);
        return `
          <div class="item">
            <div class="item-name">${escapeHtml(desc)}</div>
            <div class="item-line">
              <span class="muted">${qty} x ${money((item.unitPrice || item.price || 0))}</span>
              <span>${money(lineTotal)}</span>
            </div>
          </div>`;
      }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt ${escapeHtml(receiptNumber)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #fff; }
    body {
      width: 80mm;
      margin: 0 auto;
      padding: 4mm 3mm 6mm;
      font-family: 'Courier New', 'Consolas', monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #000;
    }
    .center { text-align: center; }
    .muted { color: #444; }
    .hospital { font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .doc-title {
      font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;
      margin: 3mm 0 1mm;
    }
    .sub { font-size: 10px; }
    .dash { border-top: 1px dashed #000; margin: 2.5mm 0; }
    .solid { border-top: 1px solid #000; margin: 2.5mm 0; }
    .row { display: flex; justify-content: space-between; gap: 4px; }
    .row .k { color: #000; }
    .row .v { text-align: right; word-break: break-word; }
    .party { font-size: 12px; font-weight: bold; }
    .item { margin: 1.5mm 0; }
    .item-name { font-weight: bold; }
    .item-line { display: flex; justify-content: space-between; }
    .total { font-size: 13px; font-weight: bold; }
    .paid { font-size: 14px; font-weight: bold; }
    .barcode {
      height: 12mm; margin: 3mm auto 1mm; width: 90%;
      background: repeating-linear-gradient(90deg,
        #000 0 1px, #fff 1px 3px, #000 3px 5px, #fff 5px 6px,
        #000 6px 8px, #fff 8px 11px, #000 11px 12px, #fff 12px 14px);
    }
    .barcode-num { letter-spacing: 3px; font-size: 10px; }
    .thanks { margin-top: 3mm; font-weight: bold; }
    .foot { margin-top: 2mm; font-size: 9px; color: #555; }
    .no-print { text-align: center; margin: 5mm 0 0; }
    .print-btn {
      font-family: inherit; font-size: 12px; font-weight: bold; cursor: pointer;
      background: #000; color: #fff; border: none; padding: 8px 18px; border-radius: 4px;
    }
    @media print { .no-print { display: none !important; } body { width: 80mm; } }
  </style>
</head>
<body>
  <div class="center">
    <div class="hospital">${escapeHtml(hospitalName)}</div>
    ${hospitalAddress ? `<div class="sub">${escapeHtml(hospitalAddress)}</div>` : ''}
    ${hospitalPhone ? `<div class="sub">Tel: ${escapeHtml(hospitalPhone)}</div>` : ''}
    ${hospitalEmail ? `<div class="sub">${escapeHtml(hospitalEmail)}</div>` : ''}
  </div>

  <div class="dash"></div>
  <div class="center doc-title">Payment Receipt</div>
  <div class="row"><span class="k">Receipt No.</span><span class="v">${escapeHtml(receiptNumber)}</span></div>
  <div class="row"><span class="k">Date</span><span class="v">${escapeHtml(dateStr)}</span></div>
  <div class="row"><span class="k">Bill No.</span><span class="v">${escapeHtml(billNumber)}</span></div>
  <div class="row"><span class="k">Cashier</span><span class="v">${escapeHtml(receivedBy)}</span></div>
  <div class="dash"></div>

  <div class="party">${escapeHtml(getPartyName(patient, bill))}</div>
  ${folder ? `<div class="row"><span class="k">Folder</span><span class="v">${escapeHtml(folder)}</span></div>` : `<div class="sub muted">Counter customer (no folder)</div>`}

  <div class="solid"></div>
  <div class="row"><span class="k">DESCRIPTION</span><span class="v">AMT (${escapeHtml(CURRENCY_CODE)})</span></div>
  <div class="dash"></div>
  ${itemsHtml}
  <div class="dash"></div>

  <div class="row"><span class="k">Bill Total</span><span class="v">${money(billTotal)}</span></div>
  ${previousPayments > 0 ? `<div class="row"><span class="k">Previous Paid</span><span class="v">${money(previousPayments)}</span></div>` : ''}
  <div class="row paid"><span class="k">THIS PAYMENT</span><span class="v">${CURRENCY_CODE} ${money(amount)}</span></div>
  <div class="row total"><span class="k">BALANCE DUE</span><span class="v">${money(billBalance)}</span></div>
  <div class="row"><span class="k">Method</span><span class="v">${escapeHtml(paymentMethod.toUpperCase())}</span></div>

  <div class="solid"></div>
  <div class="barcode"></div>
  <div class="center barcode-num">*${escapeHtml(receiptNumber)}*</div>

  <div class="center thanks">Thank you.</div>
  <div class="center foot">Computer-generated receipt.<br>Valid without signature.</div>

  <div class="no-print">
    <button class="print-btn" onclick="window.print()">Print receipt</button>
  </div>
</body>
</html>`;
};
