// src/utils/pdfGenerator.ts
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

// Main PDF generator function
export const generatePDF = (
  type: 'receipt' | 'insuranceClaim' | 'billStatement' | 'visitSummary' | 'labResults' | 'dischargeSummary' | 'prescription',
   any,
  hospital: Hospital
): string => {
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
      return generateLabResultsHTML(data.labTests, data.patient, data.attendance, hospital);
    case 'dischargeSummary':
      return generateDischargeSummaryHTML(data.admission, data.attendance, data.patient, data.clinicalData, hospital);
    case 'prescription':
      return generatePrescriptionHTML(data.medication, data.patient, data.attendance, hospital);
    default:
      throw new Error('Invalid PDF type');
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
