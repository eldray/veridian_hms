// src/utils/pdfGenerator.ts - FIXED
import type { 
  Bill, 
  Patient, 
  InsuranceClaim, 
  Payment, 
  Attendance, 
  LabTest, 
  Medication, 
  Procedure, 
  Diagnosis,
  Admission,
  Hospital
} from '../types';

// Import all PDF templates
import { generateReceiptHTML } from './pdfTemplates/receiptPDF';
import { generateInsuranceClaimHTML } from './pdfTemplates/insuranceClaimPDF';
import { generateBillStatementHTML } from './pdfTemplates/billStatementPDF';
import { generateVisitSummaryHTML } from './pdfTemplates/visitSummaryPDF';
import { generateLabResultsHTML } from './pdfTemplates/labResultsPDF';
import { generateDischargeSummaryHTML } from './pdfTemplates/dischargeSummaryPDF';
import { generatePrescriptionHTML } from './pdfTemplates/prescriptionPDF';
import { generateCombinedPrescriptionHTML } from './pdfTemplates/combinedPrescriptionPDF'; 
import { generateScanReportHTML } from './pdfTemplates/scanReportPDF';
import { generateReferralLetterHTML } from './pdfTemplates/referralLetterPDF';
import { generateHandoverHTML } from './pdfTemplates/handoverPDF';

export type PDFType = 
  | 'receipt' 
  | 'insuranceClaim' 
  | 'billStatement' 
  | 'visitSummary' 
  | 'labResults'      // ✅ camelCase used in LabResultEntry
  | 'lab-results'     // ✅ kebab-case alternative
  | 'labResult'       // ✅ another alternative
  | 'dischargeSummary' 
  | 'prescription' 
  | 'referral' 
  | 'referralLetter'
  | 'combinedPrescription' 
  | 'scanReport' 
  | 'handover';

export const generatePDF = (
  type: PDFType,
  data: any,
  hospital: any
): string => {
  // Debug logging
  console.log('📄 generatePDF called with type:', type);
  console.log('📄 Data keys:', Object.keys(data || {}));
  
  switch (type) {
    case 'receipt':
      return generateReceiptHTML(data.bill, data.patient, data.payment, hospital);
    case 'insuranceClaim':
      return generateInsuranceClaimHTML(data.claim, data.patient, hospital);
    case 'billStatement':
      return generateBillStatementHTML(data.bill, data.patient, hospital);
    case 'visitSummary':
      return generateVisitSummaryHTML(data.attendance, data.patient, hospital);
    case 'labResults':
    case 'lab-results':  // ✅ Handle both
    case 'labResult':    // ✅ Handle labResult too
      return generateLabResultsHTML(data.labTests, data.patient, data.attendance, hospital);
    case 'dischargeSummary':
      return generateDischargeSummaryHTML(data.admission, data.attendance, data.patient, data.clinicalData, hospital);
    case 'prescription':
      return generatePrescriptionHTML(data.medication, data.patient, data.attendance, hospital);
    case 'referral':
    case 'referralLetter':
      return generateReferralLetterHTML(data.referral, data.patient, hospital);
    case 'combinedPrescription':
      return generateCombinedPrescriptionHTML(data.medications, data.patient, data.attendance, hospital, data.prescriberName);
    case 'scanReport':
      return generateScanReportHTML(data.scans, data.patient, data.attendance, hospital);
    case 'handover':
      return generateHandoverHTML(data, hospital);
    default:
      console.error('❌ Invalid PDF type:', type);
      throw new Error(`Invalid PDF type: ${type}`);
  }
};

// Open print window function
export const openPrintWindow = (htmlContent: string, title = 'Document') => {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.title = title;
    printWindow.document.close();
    printWindow.focus();
  } else {
    alert('Please allow popups to print documents');
  }
};