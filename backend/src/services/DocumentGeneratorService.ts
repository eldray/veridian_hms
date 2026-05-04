// services/DocumentGeneratorService.ts - COMPLETE VERSION (ALL ORIGINAL CODE PRESERVED)

import fs from 'fs/promises';
import path from 'path';
import { PrismaClient, DocumentTemplateType } from '@prisma/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import handlebars from 'handlebars';

const prisma = new PrismaClient();

// ==============================================
// TYPES
// ==============================================
export interface DocumentData {
  documentType: DocumentTemplateType;
  entityId: string;
  entityType: string;
  data: Record<string, any>;
  generatedById: string;
}

export interface DocumentGenerationResult {
  success: boolean;
  documentId?: string;
  filePath?: string;
  error?: string;
}

// ==============================================
// HELPER FUNCTIONS
// ==============================================

const calculateAge = (dateOfBirth: Date | string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const formatCurrency = (amount: number): string => {
  return `GHS ${amount.toFixed(2)}`;
};

const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-GH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatDateTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleString('en-GH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getPatientFullName = (patient: any): string => {
  if (!patient) return 'Unknown Patient';
  return `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown Patient';
};

// ==============================================
// RECEIPT DOCUMENT
// ==============================================
async function generateReceipt(data: any): Promise<Buffer> {
  const doc = new jsPDF();
  const hospital = await prisma.hospital.findFirst();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(hospital?.name || 'Hospital Name', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(hospital?.address || 'Hospital Address', 105, 30, { align: 'center' });
  doc.text(`Tel: ${hospital?.phone || 'N/A'} | Email: ${hospital?.email || 'N/A'}`, 105, 38, { align: 'center' });
  
  // Receipt Title
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('PAYMENT RECEIPT', 105, 55, { align: 'center' });
  
  // Receipt Details
  doc.setFontSize(10);
  doc.text(`Receipt No: ${data.receiptNumber || data.billNumber}`, 20, 70);
  doc.text(`Date: ${formatDate(data.paymentDate || new Date())}`, 140, 70);
  
  // Patient Info Box
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, 80, 170, 35);
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('Patient Information', 25, 90);
  doc.setFont(undefined, 'normal');
  doc.text(`Name: ${getPatientFullName(data.patient)}`, 25, 100);
  doc.text(`Folder No: ${data.patient?.folderNumber || 'N/A'}`, 25, 108);
  doc.text(`Contact: ${data.patient?.contact || 'N/A'}`, 120, 100);
  
  // Payment Details Table
  const tableData = [
    ['Description', 'Quantity', 'Unit Price', 'Total'],
    ...(data.items || []).map((item: any) => [
      item.description || item.serviceName || 'Service',
      item.quantity?.toString() || '1',
      formatCurrency(item.unitPrice || 0),
      formatCurrency(item.totalPrice || item.lineTotal || 0)
    ])
  ];
  
  autoTable(doc, {
    startY: 125,
    head: [tableData[0]],
    body: tableData.slice(1),
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' }
    }
  });
  
  let finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Totals
  const subtotal = data.items?.reduce((sum: number, item: any) => sum + (item.totalPrice || item.lineTotal || 0), 0) || data.totalAmount || 0;
  const paidAmount = data.paidAmount || subtotal;
  const balance = data.balance || 0;
  
  doc.setFont(undefined, 'bold');
  doc.text(`Subtotal: ${formatCurrency(subtotal)}`, 140, finalY);
  finalY += 7;
  if (data.discount > 0) {
    doc.text(`Discount: ${formatCurrency(data.discount)}`, 140, finalY);
    finalY += 7;
  }
  doc.text(`Amount Paid: ${formatCurrency(paidAmount)}`, 140, finalY);
  finalY += 7;
  if (balance > 0) {
    doc.setTextColor(220, 53, 69);
    doc.text(`Outstanding Balance: ${formatCurrency(balance)}`, 140, finalY);
    doc.setTextColor(0, 0, 0);
  } else {
    doc.setTextColor(40, 167, 69);
    doc.text('FULLY PAID', 140, finalY);
    doc.setTextColor(0, 0, 0);
  }
  finalY += 15;
  
  // Payment Method
  doc.setFont(undefined, 'bold');
  doc.text(`Payment Method: ${data.paymentMethod || 'Cash'}`, 20, finalY);
  doc.text(`Transaction Ref: ${data.reference || 'N/A'}`, 20, finalY + 7);
  
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('Thank you for choosing our facility', 105, 280, { align: 'center' });
  doc.text('This is a computer-generated receipt. No signature required.', 105, 288, { align: 'center' });
  
  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================
// REFERRAL LETTER
// ==============================================
async function generateReferralLetter(data: any): Promise<Buffer> {
  const doc = new jsPDF();
  const hospital = await prisma.hospital.findFirst();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(hospital?.name || 'Hospital Name', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(hospital?.address || 'Hospital Address', 105, 30, { align: 'center' });
  doc.text(`Tel: ${hospital?.phone || 'N/A'}`, 105, 38, { align: 'center' });
  
  // Title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('REFERRAL LETTER', 105, 55, { align: 'center' });
  
  // Reference
  doc.setFontSize(10);
  doc.text(`Ref: ${data.referralNumber || 'N/A'}`, 20, 70);
  doc.text(`Date: ${formatDate(data.referralDate || new Date())}`, 140, 70);
  
  // To Section
  doc.setFont(undefined, 'bold');
  doc.text('TO:', 20, 85);
  doc.setFont(undefined, 'normal');
  doc.text(data.referredToFacility || '_________________________', 20, 93);
  doc.text(`Attn: ${data.referredToDoctor || 'Medical Officer'} (${data.referredToDepartment || 'General'})`, 20, 101);
  
  // Urgency
  doc.setTextColor(220, 53, 69);
  doc.setFont(undefined, 'bold');
  doc.text(`URGENCY: ${(data.urgency || 'ROUTINE').toUpperCase()}`, 20, 115);
  doc.setTextColor(0, 0, 0);
  
  // Patient Information Box
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, 125, 170, 45);
  doc.setFont(undefined, 'bold');
  doc.text('PATIENT INFORMATION', 25, 135);
  doc.setFont(undefined, 'normal');
  doc.text(`Name: ${getPatientFullName(data.patient)}`, 25, 145);
  doc.text(`Folder No: ${data.patient?.folderNumber || 'N/A'}`, 25, 153);
  doc.text(`Date of Birth: ${formatDate(data.patient?.dateOfBirth)}`, 25, 161);
  doc.text(`Gender: ${data.patient?.gender || 'N/A'}`, 120, 145);
  doc.text(`Contact: ${data.patient?.contact || 'N/A'}`, 120, 153);
  
  // Clinical Information
  let yPos = 180;
  doc.setFont(undefined, 'bold');
  doc.text('REASON FOR REFERRAL:', 20, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  const reasonLines = doc.splitTextToSize(data.referralReason || 'Not specified', 170);
  doc.text(reasonLines, 20, yPos);
  yPos += (reasonLines.length * 7) + 5;
  
  doc.setFont(undefined, 'bold');
  doc.text('PRIMARY DIAGNOSIS:', 20, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  doc.text(`${data.primaryDiagnosis?.name || 'Not specified'} (ICD-10: ${data.primaryDiagnosis?.icdCode || 'N/A'})`, 20, yPos);
  yPos += 15;
  
  doc.setFont(undefined, 'bold');
  doc.text('CLINICAL NOTES:', 20, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  const notesLines = doc.splitTextToSize(data.clinicalNotes || data.referralNotes || 'No additional notes', 170);
  doc.text(notesLines, 20, yPos);
  yPos += (notesLines.length * 7) + 15;
  
  // Referring Doctor
  doc.setFont(undefined, 'bold');
  doc.text('Referring Clinician:', 20, yPos);
  doc.setFont(undefined, 'normal');
  doc.text(data.referringDoctor || 'Unknown', 20, yPos + 8);
  
  // Signature
  yPos += 25;
  doc.setDrawColor(0, 0, 0);
  doc.line(20, yPos, 80, yPos);
  doc.text('Signature & Stamp', 20, yPos + 5);
  
  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================
// DISCHARGE SUMMARY
// ==============================================
async function generateDischargeSummary(data: any): Promise<Buffer> {
  const doc = new jsPDF();
  const hospital = await prisma.hospital.findFirst();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(hospital?.name || 'Hospital Name', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(hospital?.address || 'Hospital Address', 105, 30, { align: 'center' });
  
  // Title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('DISCHARGE SUMMARY', 105, 55, { align: 'center' });
  
  // Reference
  doc.setFontSize(10);
  doc.text(`Admission No: ${data.admissionNumber || 'N/A'}`, 20, 70);
  doc.text(`Discharge Date: ${formatDate(data.dischargeDate || new Date())}`, 140, 70);
  
  // Patient Information
  doc.setFont(undefined, 'bold');
  doc.text('PATIENT INFORMATION', 20, 85);
  doc.setFont(undefined, 'normal');
  doc.text(`Name: ${getPatientFullName(data.patient)}`, 25, 95);
  doc.text(`Folder No: ${data.patient?.folderNumber || 'N/A'}`, 25, 103);
  doc.text(`Date of Birth: ${formatDate(data.patient?.dateOfBirth)}`, 25, 111);
  doc.text(`Gender: ${data.patient?.gender || 'N/A'}`, 120, 95);
  doc.text(`Contact: ${data.patient?.contact || 'N/A'}`, 120, 103);
  
  // Admission Details
  let yPos = 125;
  doc.setFont(undefined, 'bold');
  doc.text('ADMISSION DETAILS', 20, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  doc.text(`Admission Date: ${formatDate(data.admissionDate)}`, 25, yPos);
  doc.text(`Admission Type: ${data.admissionType || 'Emergency'}`, 120, yPos);
  yPos += 7;
  doc.text(`Discharge Status: ${data.dischargeStatus || 'Home'}`, 25, yPos);
  doc.text(`Length of Stay: ${data.lengthOfStay || 0} days`, 120, yPos);
  yPos += 10;
  
  // Diagnoses
  doc.setFont(undefined, 'bold');
  doc.text('DIAGNOSES', 20, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  doc.text(`Principal: ${data.principalDiagnosis?.name || 'Not specified'}`, 25, yPos);
  yPos += 7;
  if (data.secondaryDiagnoses?.length) {
    doc.text('Secondary:', 25, yPos);
    yPos += 5;
    for (const diag of data.secondaryDiagnoses) {
      doc.text(`• ${diag.diagnosis?.name || diag.icdCode}`, 30, yPos);
      yPos += 5;
    }
  }
  yPos += 5;
  
  // Procedures
  if (data.procedures?.length) {
    doc.setFont(undefined, 'bold');
    doc.text('PROCEDURES PERFORMED', 20, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');
    for (const proc of data.procedures) {
      doc.text(`• ${proc.name || proc.serviceName} - ${formatDate(proc.performedAt)}`, 25, yPos);
      yPos += 5;
    }
    yPos += 5;
  }
  
  // Medications
  if (data.medications?.length) {
    doc.setFont(undefined, 'bold');
    doc.text('DISCHARGE MEDICATIONS', 20, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');
    for (const med of data.medications) {
      const doseText = `${med.name} - ${med.dosage || ''} ${med.frequency || ''} for ${med.duration || ''}`.trim();
      doc.text(`• ${doseText}`, 25, yPos);
      yPos += 5;
    }
    yPos += 5;
  }
  
  // Follow-up
  if (data.followUpInstructions) {
    doc.setFont(undefined, 'bold');
    doc.text('FOLLOW-UP INSTRUCTIONS', 20, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');
    const followUpLines = doc.splitTextToSize(data.followUpInstructions, 170);
    doc.text(followUpLines, 25, yPos);
    yPos += (followUpLines.length * 7) + 10;
  }
  
  // Discharge Summary
  if (data.dischargeSummary) {
    doc.setFont(undefined, 'bold');
    doc.text('DISCHARGE SUMMARY', 20, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');
    const summaryLines = doc.splitTextToSize(data.dischargeSummary, 170);
    doc.text(summaryLines, 25, yPos);
    yPos += (summaryLines.length * 7) + 10;
  }
  
  // Doctor Signature
  doc.setFont(undefined, 'bold');
  doc.text(`Attending Physician: ${data.attendingDoctor || 'Unknown'}`, 20, yPos);
  yPos += 8;
  doc.text(`Discharge Clerk: ${data.dischargeClerk || 'Unknown'}`, 20, yPos);
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Please bring this document to your follow-up appointment', 105, 285, { align: 'center' });
  
  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================
// LAB RESULT REPORT
// ==============================================
async function generateLabResult(data: any): Promise<Buffer> {
  const doc = new jsPDF();
  const hospital = await prisma.hospital.findFirst();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(hospital?.name || 'Hospital Name', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(hospital?.address || 'Hospital Address', 105, 30, { align: 'center' });
  
  // Title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('LABORATORY TEST REPORT', 105, 55, { align: 'center' });
  
  // Reference
  doc.setFontSize(10);
  doc.text(`Test ID: ${data.testId || 'N/A'}`, 20, 70);
  doc.text(`Report Date: ${formatDate(data.reportDate || new Date())}`, 140, 70);
  
  // Patient Information
  doc.setFont(undefined, 'bold');
  doc.text('PATIENT INFORMATION', 20, 85);
  doc.setFont(undefined, 'normal');
  doc.text(`Name: ${getPatientFullName(data.patient)}`, 25, 95);
  doc.text(`Folder No: ${data.patient?.folderNumber || 'N/A'}`, 25, 103);
  doc.text(`Date of Birth: ${formatDate(data.patient?.dateOfBirth)}`, 25, 111);
  doc.text(`Gender: ${data.patient?.gender || 'N/A'}`, 120, 95);
  
  // Test Information
  let yPos = 130;
  doc.setFont(undefined, 'bold');
  doc.text('TEST INFORMATION', 20, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  doc.text(`Test Name: ${data.testName || 'N/A'}`, 25, yPos);
  yPos += 7;
  doc.text(`Specimen Type: ${data.specimenType || 'N/A'}`, 25, yPos);
  yPos += 7;
  doc.text(`Requested By: ${data.requestedBy || 'N/A'}`, 25, yPos);
  yPos += 7;
  doc.text(`Requested Date: ${formatDate(data.requestedDate)}`, 25, yPos);
  yPos += 10;
  
  // Result
  doc.setFont(undefined, 'bold');
  doc.text('RESULT', 20, yPos);
  yPos += 8;
  doc.setFont(undefined, 'normal');
  
  if (data.result) {
    if (typeof data.result === 'object') {
      for (const [key, value] of Object.entries(data.result)) {
        doc.text(`${key}: ${value}`, 25, yPos);
        yPos += 5;
      }
    } else {
      const resultText = doc.splitTextToSize(String(data.result), 170);
      doc.text(resultText, 25, yPos);
      yPos += (resultText.length * 7) + 5;
    }
  } else {
    doc.text('Result pending or not available', 25, yPos);
    yPos += 10;
  }
  
  // Reference Range
  if (data.normalRange) {
    doc.setFont(undefined, 'bold');
    doc.text('REFERENCE RANGE', 20, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');
    doc.text(data.normalRange, 25, yPos);
    yPos += 10;
  }
  
  // Interpretation
  if (data.interpretation) {
    doc.setFont(undefined, 'bold');
    doc.text('INTERPRETATION', 20, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');
    const interpretationLines = doc.splitTextToSize(data.interpretation, 170);
    doc.text(interpretationLines, 25, yPos);
    yPos += (interpretationLines.length * 7) + 10;
  }
  
  // Verified By
  doc.setFont(undefined, 'bold');
  doc.text(`Verified By: ${data.verifiedBy || 'Not verified'}`, 20, yPos);
  doc.text(`Date Verified: ${formatDate(data.verifiedAt)}`, 120, yPos);
  
  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================
// PRESCRIPTION
// ==============================================
async function generatePrescription(data: any): Promise<Buffer> {
  const doc = new jsPDF();
  const hospital = await prisma.hospital.findFirst();
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(hospital?.name || 'Hospital Name', 105, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Tel: ${hospital?.phone || 'N/A'}`, 105, 30, { align: 'center' });
  
  // Title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('PRESCRIPTION', 105, 50, { align: 'center' });
  
  // Patient Info
  doc.setFontSize(10);
  doc.text(`Patient: ${getPatientFullName(data.patient)}`, 20, 65);
  doc.text(`Folder No: ${data.patient?.folderNumber || 'N/A'}`, 20, 73);
  doc.text(`Date: ${formatDate(data.prescriptionDate || new Date())}`, 140, 65);
  doc.text(`Age: ${data.patientAge || 'N/A'}`, 140, 73);
  
  // Medications Table
  const tableData = [
    ['Medication', 'Dosage', 'Frequency', 'Duration', 'Quantity'],
    ...(data.medications || []).map((med: any) => [
      med.name || med.medicationName || 'N/A',
      med.dosage || 'As directed',
      med.frequency || 'N/A',
      med.duration || 'N/A',
      med.quantity?.toString() || '1'
    ])
  ];
  
  autoTable(doc, {
    startY: 85,
    head: [tableData[0]],
    body: tableData.slice(1),
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 20, halign: 'center' }
    }
  });
  
  let yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Instructions
  if (data.instructions) {
    doc.setFont(undefined, 'bold');
    doc.text('Instructions:', 20, yPos);
    yPos += 7;
    doc.setFont(undefined, 'normal');
    const instructionsLines = doc.splitTextToSize(data.instructions, 170);
    doc.text(instructionsLines, 25, yPos);
    yPos += (instructionsLines.length * 7) + 10;
  }
  
  // Prescriber
  doc.setFont(undefined, 'bold');
  doc.text(`Prescribed By: ${data.prescribedBy || 'Unknown'}`, 20, yPos);
  if (data.licenseNumber) {
    doc.text(`License No: ${data.licenseNumber}`, 120, yPos);
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Please take medications as prescribed. Complete the full course.', 105, 280, { align: 'center' });
  
  return Buffer.from(doc.output('arraybuffer'));
}

// ==============================================
// MAIN SERVICE CLASS
// ==============================================
export class DocumentGeneratorService {
  
  static async generateDocument(documentData: DocumentData): Promise<DocumentGenerationResult> {
    try {
      const { documentType, entityId, entityType, data, generatedById } = documentData;
      
      let pdfBuffer: Buffer;
      let fileName: string;
      
      switch (documentType) {
        case 'receipt':
          pdfBuffer = await generateReceipt(data);
          fileName = `receipt_${entityId}_${Date.now()}.pdf`;
          break;
        case 'referral_letter':
          pdfBuffer = await generateReferralLetter(data);
          fileName = `referral_${entityId}_${Date.now()}.pdf`;
          break;
        case 'discharge_summary':
          pdfBuffer = await generateDischargeSummary(data);
          fileName = `discharge_${entityId}_${Date.now()}.pdf`;
          break;
        case 'lab_result':
          pdfBuffer = await generateLabResult(data);
          fileName = `labresult_${entityId}_${Date.now()}.pdf`;
          break;
        case 'prescription':
          pdfBuffer = await generatePrescription(data);
          fileName = `prescription_${entityId}_${Date.now()}.pdf`;
          break;
        default:
          throw new Error(`Unsupported document type: ${documentType}`);
      }
      
      // Save file
      const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
      await fs.mkdir(uploadDir, { recursive: true });
      
      // In DocumentGeneratorService.ts, when saving the document
      const filePath = `/uploads/documents/${fileName}`;  // Keep as is
      await fs.writeFile(path.join(process.cwd(), 'uploads', 'documents', fileName), pdfBuffer);
      
      // Get or create template
      let template = await prisma.documentTemplate.findFirst({
        where: { code: documentType, isActive: true }
      });
      
      if (!template) {
        template = await prisma.documentTemplate.create({
          data: {
            name: `${documentType.replace('_', ' ').toUpperCase()} Template`,
            code: documentType,
            templateType: documentType,
            content: 'Default template content',
            isActive: true,
            isDefault: true,
            createdById: generatedById
          }
        });
      }
      
      const document = await prisma.generatedDocument.create({
        data: {
          templateId: template.id,
          entityType,
          entityId,
          filePath: `/uploads/documents/${fileName}`,
          generatedById,
          generatedAt: new Date()
        }
      });
      
      console.log(`✅ Document generated: ${documentType} for ${entityType}/${entityId}`);
      
      return {
        success: true,
        documentId: document.id,
        filePath: `/uploads/documents/${fileName}`
      };
      
    } catch (error) {
      console.error('❌ Document generation failed:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  static async generateBillReceipt(billId: string, paymentId?: string, generatedById?: string): Promise<DocumentGenerationResult> {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        Patient: true,
        Attendance: true,
        BillLineItem: {
          where: { isVoided: false }
        },
        Payment: {
          orderBy: { transactionDate: 'desc' },
          take: 1
        }
      }
    });
    
    if (!bill) {
      return { success: false, error: 'Bill not found' };
    }
    
    const lastPayment = bill.Payment[0];
    
    const receiptData = {
      receiptNumber: `RCP-${Date.now()}`,
      billNumber: bill.billNumber,
      patient: bill.Patient,
      paymentDate: lastPayment?.transactionDate || bill.billDate,
      paymentMethod: lastPayment?.paymentMethod || bill.paymentMode,
      reference: lastPayment?.reference,
      items: bill.BillLineItem.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.lineTotal
      })),
      totalAmount: bill.totalAmount,
      paidAmount: lastPayment?.amount || bill.paidAmount,
      balance: bill.balance,
      discount: bill.discount,
      waiverAmount: bill.waiverAmount
    };
    
    return this.generateDocument({
      documentType: 'receipt',
      entityId: billId,
      entityType: 'Bill',
      data: receiptData,
      generatedById: generatedById || bill.createdById
    });
  }
  
  static async generateReferralLetterDocument(referralId: string, generatedById?: string): Promise<DocumentGenerationResult> {
    try {
      console.log('📝 Generating referral letter for:', referralId);
      
      const referral = await prisma.referralRecord.findUnique({
        where: { id: referralId },
        include: {
          patient: true,
          attendance: {
            include: {
              AttendanceDiagnosis: {
                where: { primary: true },
                include: { Diagnosis: true }
              }
            }
          },
          createdBy: true
        }
      });
      
      if (!referral) {
        console.error('❌ Referral not found:', referralId);
        return { success: false, error: 'Referral not found' };
      }
      
      console.log('✅ Referral found:', referral.referralNumber);
      
      const primaryDiagnosis = referral.attendance?.AttendanceDiagnosis?.[0]?.Diagnosis;
      const hospital = await prisma.hospital.findFirst();
      
      const letterData = {
        referralNumber: referral.referralNumber,
        referralDate: referral.referralDate,
        referredToFacility: referral.referredToFacility,
        referredToDoctor: referral.referredToDoctor,
        referredToDepartment: referral.referredToDepartment,
        urgency: referral.urgency,
        referralReason: referral.referralReason,
        referralNotes: referral.referralNotes,
        patient: referral.patient,
        primaryDiagnosis,
        clinicalNotes: referral.attendance?.medicalNotes || referral.referralNotes,
        referringDoctor: referral.createdBy?.fullName,
        hospitalName: hospital?.name || 'Hospital',
        hospitalAddress: hospital?.address || '',
        hospitalPhone: hospital?.phone || ''
      };
      
      return this.generateDocument({
        documentType: 'referral_letter',
        entityId: referralId,
        entityType: 'ReferralRecord',
        data: letterData,
        generatedById: generatedById || referral.createdById || ''
      });
      
    } catch (error) {
      console.error('❌ Error generating referral letter:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  static async generateDischargeSummaryDocument(admissionId: string, generatedById?: string): Promise<DocumentGenerationResult> {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        Patient: true,
        principalDiagnosis: true,
        AdmissionSecondaryDiagnosis: {
          include: { Diagnosis: true }
        },
        Attendance: {
          include: {
            Procedure: {
              where: { status: 'completed' },
              include: { ServiceCatalog: true }
            },
            Medication: {
              where: { status: { in: ['dispensed', 'administered'] } }
            }
          }
        }
      }
    });
    
    if (!admission) {
      return { success: false, error: 'Admission not found' };
    }
    
    const summaryData = {
      admissionNumber: admission.admissionNumber,
      admissionDate: admission.admissionDate,
      dischargeDate: admission.dischargeDate || new Date(),
      dischargeStatus: admission.dischargeStatus,
      lengthOfStay: admission.lengthOfStay,
      admissionType: admission.admissionType,
      patient: admission.Patient,
      principalDiagnosis: admission.principalDiagnosis,
      secondaryDiagnoses: admission.AdmissionSecondaryDiagnosis,
      procedures: admission.Attendance?.Procedure.map(p => ({
        name: p.ServiceCatalog?.name,
        performedAt: p.performedAt
      })) || [],
      medications: admission.Attendance?.Medication.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration
      })) || [],
      dischargeSummary: admission.dischargeSummary,
      attendingDoctor: admission.admittingDoctor,
      dischargeClerk: generatedById
    };
    
    return this.generateDocument({
      documentType: 'discharge_summary',
      entityId: admissionId,
      entityType: 'Admission',
      data: summaryData,
      generatedById: generatedById || admission.createdBy
    });
  }
  
  static async generateLabResultDocument(labTestId: string, generatedById?: string): Promise<DocumentGenerationResult> {
    const labTest = await prisma.labTest.findUnique({
      where: { id: labTestId },
      include: {
        Attendance: {
          include: {
            Patient: true
          }
        },
        LabTestTemplate: true,
        User_LabTest_performedByIdToUser: true,
        User_LabTest_verifiedByIdToUser: true
      }
    });
    
    if (!labTest) {
      return { success: false, error: 'Lab test not found' };
    }
    
    const resultData = {
      testId: labTest.id,
      testName: labTest.LabTestTemplate?.name || 'Lab Test',
      specimenType: labTest.LabTestTemplate?.specimenType,
      result: labTest.result,
      normalRange: labTest.normalRange,
      interpretation: labTest.notes,
      requestedDate: labTest.requestedAt,
      requestedBy: labTest.createdById,
      reportDate: labTest.completedAt || new Date(),
      patient: labTest.Attendance?.Patient,
      verifiedBy: labTest.User_LabTest_verifiedByIdToUser?.fullName,
      verifiedAt: labTest.completedAt
    };
    
    return this.generateDocument({
      documentType: 'lab_result',
      entityId: labTestId,
      entityType: 'LabTest',
      data: resultData,
      generatedById: generatedById || labTest.createdById
    });
  }
  
  static async generateBillStatement(billId: string, generatedById?: string): Promise<DocumentGenerationResult> {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        Patient: true,
        Attendance: true,
        BillLineItem: {
          where: { isVoided: false },
          include: { serviceCatalog: true }
        },
        Payment: true,
        InsuranceProvider: true
      }
    });
    
    if (!bill) {
      return { success: false, error: 'Bill not found' };
    }
    
    const statementData = {
      billNumber: bill.billNumber,
      billDate: bill.billDate,
      dueDate: bill.dueDate,
      patient: bill.Patient,
      attendance: bill.Attendance,
      items: bill.BillLineItem.map(item => ({
        description: item.description,
        serviceType: item.serviceType,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        insuranceCovered: item.insuranceCoveredAmount,
        patientPayable: item.patientPayableAmount
      })),
      subtotal: bill.subtotal,
      discount: bill.discount,
      taxAmount: bill.taxAmount,
      totalAmount: bill.totalAmount,
      insuranceCovered: bill.insuranceCovered,
      patientPayable: bill.patientPayable,
      paidAmount: bill.paidAmount,
      balance: bill.balance,
      paymentMode: bill.paymentMode,
      status: bill.status,
      payments: bill.Payment,
      insuranceProvider: bill.InsuranceProvider
    };
    
    return this.generateDocument({
      documentType: 'receipt',
      entityId: billId,
      entityType: 'Bill',
      data: statementData,
      generatedById: generatedById || bill.createdById
    });
  }

  static async reprintDocument(documentId: string): Promise<DocumentGenerationResult> {
    const existingDoc = await prisma.generatedDocument.findUnique({
      where: { id: documentId },
      include: { template: true }
    });
    
    if (!existingDoc) {
      return { success: false, error: 'Document not found' };
    }
    
    return {
      success: true,
      documentId: existingDoc.id,
      filePath: existingDoc.filePath || undefined
    };
  }
  
  static async getDocumentByEntity(entityType: string, entityId: string): Promise<any[]> {
    return await prisma.generatedDocument.findMany({
      where: { entityType, entityId },
      include: {
        template: true,
        generatedBy: {
          select: { fullName: true, username: true }
        }
      },
      orderBy: { generatedAt: 'desc' }
    });
  }
}