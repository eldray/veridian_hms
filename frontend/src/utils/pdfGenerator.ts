// src/utils/pdfGenerator.ts - FIXED

// Import all PDF templates
import { generateShiftRotaHTML } from './pdfTemplates/shiftRotaPDF';
import { generateShiftSummaryHTML } from './pdfTemplates/shiftSummaryPDF';
import { generateLeaveRegisterHTML } from './pdfTemplates/leaveRegisterPDF';
import { generateLeaveRequestFormHTML } from './pdfTemplates/leaveRequestFormPDF';
import { generateReceiptHTML } from './pdfTemplates/receiptPDF';
import { generateThermalReceiptHTML } from './pdfTemplates/thermalReceiptPDF';
import { generateThermalPrescriptionHTML } from './pdfTemplates/thermalPrescriptionPDF';
import { generateInsuranceClaimHTML } from './pdfTemplates/insuranceClaimPDF';
import { generateClaimBatchHTML } from './pdfTemplates/claimBatchPDF';
import { generateBillStatementHTML } from './pdfTemplates/billStatementPDF';
import { generateVisitSummaryHTML } from './pdfTemplates/visitSummaryPDF';
import { generateLabResultsHTML } from './pdfTemplates/labResultsPDF';
import { generateDischargeSummaryHTML } from './pdfTemplates/dischargeSummaryPDF';
import { generatePrescriptionHTML } from './pdfTemplates/prescriptionPDF';
import { generateCombinedPrescriptionHTML } from './pdfTemplates/combinedPrescriptionPDF'; 
import { generateScanReportHTML } from './pdfTemplates/scanReportPDF';
import { generateReferralLetterHTML } from './pdfTemplates/referralLetterPDF';
import { generateReferralFormHTML } from './pdfTemplates/referralFormPDF';
import { generateHandoverHTML } from './pdfTemplates/handoverPDF';
import { generateProformaInvoiceHTML } from './pdfTemplates/proformaInvoicePDF';
import { generateStockReportHTML } from './pdfTemplates/stockReportPDF';
import { generateMedicalReportHTML } from './pdfTemplates/medicalReportPDF';

export type PDFType =
  | 'receipt'
  | 'thermalReceipt'
  | 'thermalPrescription'
  | 'insuranceClaim'
  | 'billStatement'
  | 'visitSummary'
  | 'labResults'
  | 'lab-results'
  | 'labResult'
  | 'dischargeSummary'
  | 'medicalReport'
  | 'stockReport'
  | 'proformaInvoice'
  | 'prescription'
  | 'referral'
  | 'referralLetter'
  | 'referralForm'
  | 'combinedPrescription'
  | 'scanReport'
  | 'handover'
  | 'shiftRota'
  | 'shiftSummary'
  | 'leaveRegister'
  | 'leaveRequestForm'
  | 'claimBatch';

/** The pages pass the lab technician once for the whole print; the templates read it per test. */
const withPerformer = (tests: any[], name?: string): any[] =>
  (Array.isArray(tests) ? tests : []).map((t) => (name && !t?.performedByName ? { ...t, performedByName: name } : t));

export const generatePDF = (
  type: PDFType,
  data: any,
  hospital: any
): string => {
  // Debug logging
  
  switch (type) {
    case 'receipt':
      return generateReceiptHTML(data.bill, data.patient, data.payment, hospital);
    case 'thermalReceipt':
      return generateThermalReceiptHTML(data.bill, data.patient, data.payment, hospital, data.paperWidth);
    case 'thermalPrescription':
      // Accepts data.medications (list) or data.medication (single).
      return generateThermalPrescriptionHTML(data.medications ?? data.medication, data.patient, data.attendance, hospital, data.prescriberName, data.paperWidth);
    case 'insuranceClaim':
      return generateInsuranceClaimHTML(data.claim, data.patient ?? data.claim?.Patient ?? data.claim?.patient, hospital);
    case 'claimBatch':
      return generateClaimBatchHTML(data.batch, hospital);
    case 'billStatement':
      return generateBillStatementHTML(data.bill, data.patient, hospital);
    case 'visitSummary':
      return generateVisitSummaryHTML(data.attendance, data.patient, hospital);
    case 'labResults':
    case 'lab-results':  // ✅ Handle both
    case 'labResult':    // ✅ Handle labResult too
      return generateLabResultsHTML(withPerformer(data.labTests, data.performedByName), data.patient, data.attendance, hospital);
    case 'proformaInvoice':
      return generateProformaInvoiceHTML(data.estimate, hospital);
    case 'stockReport':
      return generateStockReportHTML(data.report, hospital);
    case 'medicalReport':
      return generateMedicalReportHTML(data.report, data.patient, data.attendance, hospital);
    case 'dischargeSummary':
      return generateDischargeSummaryHTML(data.admission, data.attendance, data.patient, data.clinicalData, hospital);
    case 'prescription':
      return generatePrescriptionHTML(data.medication, data.patient, data.attendance, hospital);
    case 'referral':
    case 'referralLetter':
      return generateReferralLetterHTML(data.referral, data.patient, hospital);
    case 'referralForm':
      return generateReferralFormHTML(data.referral, data.patient, hospital);
    case 'combinedPrescription':
      return generateCombinedPrescriptionHTML(data.medications, data.patient, data.attendance, hospital, data.prescriberName);
    case 'scanReport':
      return generateScanReportHTML(data.scans, data.patient, data.attendance, hospital);
    case 'handover':
      return generateHandoverHTML(data, hospital);
case 'shiftRota':
  return generateShiftRotaHTML(
    data.shifts,
    data.weekStart,
    hospital,
    {
      departments: data.departments,
      users: data.users,
      departmentName: data.departmentName,
    },
  );
case 'shiftSummary':
  return generateShiftSummaryHTML(
    data.shifts,
    data.month,
    data.year,
    hospital,
    {
      departments: data.departments,
      users: data.users,
      departmentName: data.departmentName,
    },
  );
    case 'leaveRegister':
      return generateLeaveRegisterHTML(data.leaves, data.year, data.staffFilter ?? null, hospital);
    case 'leaveRequestForm':
      return generateLeaveRequestFormHTML(data.leave, hospital);
    default:
      console.error('❌ Invalid PDF type:', type);
      throw new Error(`Invalid PDF type: ${type}`);
  }
};

// Open print window function
export const openPrintWindow = (htmlContent: string, title = 'Document', autoPrint = false) => {
  // Receipt slips are narrow; A4 documents need room to be read before printing.
  const isSlip = htmlContent.includes('id="slip"');
  const printWindow = window.open('', '_blank', isSlip ? 'width=420,height=680' : 'width=960,height=900');
  if (!printWindow) {
    alert('Please allow popups to print documents');
    return;
  }
  if (autoPrint) {
    // Registered before close() so the load event that fires on document.close() is caught.
    printWindow.addEventListener('load', () => {
      printWindow.focus();
      // Small delay lets the browser finish laying out the narrow thermal page before the dialog.
      window.setTimeout(() => printWindow.print(), 300);
    }, { once: true });
  }
  printWindow.document.write(htmlContent);
  printWindow.document.title = title;
  printWindow.document.close();
  printWindow.focus();
};