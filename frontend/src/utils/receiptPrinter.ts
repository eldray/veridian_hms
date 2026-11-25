// src/utils/receiptPrinter.ts
// One receipt contract for every page: the 80mm thermal slip the pay flow prints is the
// same slip a reprint must produce, with the real hospital details and the real collector.
import { generatePDF, openPrintWindow } from './pdfGenerator';

/** Newest recorded, non-voided payment on a bill — a receipt documents a payment, not an estimate. */
export const latestRecordedPayment = (bill: any): any =>
  ((bill?.Payment || bill?.payments || []) as any[])
    .filter((payment: any) => !payment.isVoided)
    .slice()
    .sort(
      (a: any, b: any) =>
        new Date(b.transactionDate || 0).getTime() - new Date(a.transactionDate || 0).getTime(),
    )[0] || null;

export interface ThermalReceiptOptions {
  bill: any;
  patient?: any;
  payment: any;
  /** From the hospital settings store; never a hard-coded placeholder. */
  hospital?: any;
  /** Who is credited when the payment row carries no user, e.g. the operator clicking reprint. */
  receivedBy?: string | null;
  /** Line items to itemise when the bill object itself has none loaded. */
  lineItems?: any[];
  /** Open the print dialog as soon as the slip loads, instead of waiting for a click. */
  autoPrint?: boolean;
}

export const printThermalReceipt = ({
  bill,
  patient,
  payment,
  hospital,
  receivedBy,
  lineItems,
  autoPrint = false,
}: ThermalReceiptOptions): void => {
  const receiptPayment = {
    amount: payment?.amount ?? 0,
    paymentMethod: payment?.paymentMethod || payment?.paymentMode || 'cash',
    receiptNumber: payment?.reference || payment?.receiptNumber || payment?.id,
    paymentDate: payment?.transactionDate || payment?.paymentDate || new Date().toISOString(),
    receivedBy: payment?.User?.fullName || payment?.receivedBy || receivedBy || 'System',
  };
  const receiptBill = {
    ...(bill || {}),
    BillLineItem: bill?.BillLineItem || bill?.items || lineItems || [],
  };
  const html = generatePDF('thermalReceipt', { bill: receiptBill, patient, payment: receiptPayment }, hospital);
  openPrintWindow(html, `Receipt-${bill?.billNumber || bill?.id}`, autoPrint);
};
