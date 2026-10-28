// modules/document/DocumentService.ts
import { PrismaClient } from '@prisma/client';
import { DocumentRepository } from './DocumentRepository';
import { IDocument, IDocumentTemplate, IDocumentTemplateCreateDTO, IDocumentTemplateUpdateDTO } from './DocumentTypes';
import path from 'path';
import fs from 'fs';
import { jsPDF } from 'jspdf';

import prisma from '../../core/database/prisma.client';

export class DocumentService {
  private documentRepository: DocumentRepository;

  constructor() {
    this.documentRepository = new DocumentRepository();
  }

  private async generatePdf(content: string, fileName: string, template: any): Promise<string> {
    const docsDir = path.join(process.cwd(), 'uploads', 'documents');
    fs.mkdirSync(docsDir, { recursive: true });

    const filePath = path.join(docsDir, fileName);
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 18;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    // Render the generated document as a real PDF. Previously this method wrote only
    // a .txt file while returning a .pdf path, causing receipt downloads to fail.
    const lines = content
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .flatMap((line) => (line ? pdf.splitTextToSize(line, maxWidth) : ['']));

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    for (const line of lines) {
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      if (/^(PAYMENT RECEIPT|REFERRAL LETTER|DISCHARGE SUMMARY|LABORATORY RESULT|PRESCRIPTION|BILL STATEMENT)$/.test(line)) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(15);
      } else if (/^=+$/.test(line)) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
      }
      pdf.text(line, margin, y);
      y += 5;
    }

    fs.writeFileSync(filePath, Buffer.from(pdf.output('arraybuffer')));
    return `/uploads/documents/${fileName}`;
  }

  /**
   * Who the printed paper is addressed to. A counter ticket names a CounterClient and has
   * no patient folder, so the header must not print an empty patient line.
   */
  private party(entity: any): { title: string; name: string; folder: string; folderLabel: string } {
    const patient = entity?.Patient;
    if (patient) {
      return {
        title: 'Patient',
        name: `${patient.surname ?? ''} ${patient.otherNames ?? ''}`.trim() || 'Unknown patient',
        folder: patient.folderNumber || 'N/A',
        folderLabel: 'Patient Folder',
      };
    }
    const client = entity?.CounterClient;
    if (client) {
      return {
        title: 'Customer',
        name: client.name || 'Counter customer',
        folder: `${client.ageYears ? `age ${client.ageYears}` : 'no age given'}${client.phone ? ` · ${client.phone}` : ''}`,
        folderLabel: 'Counter customer',
      };
    }
    return { title: 'Patient', name: 'Unknown patient', folder: 'N/A', folderLabel: 'Patient Folder' };
  }

  /**
   * A lab result is free-form JSON: a bare value, a single { value } object, or a panel of
   * parameters. Print each shape as readable lines instead of "[object Object]".
   */
  private labResultLines(result: any, normalRange?: string | null, units?: string | null): string[] {
    if (result === null || result === undefined) {
      return normalRange ? [`Reference: ${normalRange}`] : [];
    }
    if (typeof result === 'string' || typeof result === 'number') {
      return [`${result}${units ? ` ${units}` : ''}${normalRange ? ` (ref: ${normalRange})` : ''}`];
    }
    if (Array.isArray(result.parameters)) {
      return result.parameters.map((p: any) =>
        `- ${p?.name ?? 'Parameter'}: ${p?.value ?? '—'}${p?.unit ? ` ${p.unit}` : units ? ` ${units}` : ''}${p?.range ? ` (ref: ${p.range})` : ''}`
      );
    }
    if ('value' in result) {
      return this.labResultLines((result as any).value, normalRange, units);
    }
    return Object.entries(result)
      .filter(([, v]) => typeof v === 'string' || typeof v === 'number')
      .map(([k, v]) => `- ${k}: ${v}`);
  }

  private async getEntityData(entityType: string, entityId: string): Promise<any> {
    switch (entityType) {
      case 'bill':
        return prisma.bill.findUnique({
          where: { id: entityId },
          include: {
            Patient: true,
            CounterClient: true,
            Attendance: true,
            BillLineItem: {
              include: { serviceCatalog: true }
            }
          }
        });
      case 'referral':
        return prisma.referralRecord.findUnique({
          where: { id: entityId },
          include: {
            patient: true,
            createdBy: true
          }
        });
      case 'encounter':
        return prisma.attendance.findUnique({
          where: { id: entityId },
          include: {
            Patient: true,
            CounterClient: true,
            AttendanceDiagnosis: {
              include: { Diagnosis: true }
            },
            Vitals: true,
            Medication: true,
            // A lab/scan order carries no name of its own; it lives on the template it was raised from.
            LabTest: { include: { LabTestTemplate: true } },
            Scan: { include: { ScanTemplate: true } }
          }
        });
      case 'admission':
        // Patient, ward and bed belong to the admission's visit; expose them at the top level
        // so document templates can keep reading admission.Patient / .Ward / .Bed.
        return prisma.admission.findUnique({
          where: { id: entityId },
          include: { attendance: { include: { Patient: true, Ward: true, Bed: true } } }
        }).then((a: any) => a && { ...a, Patient: a.attendance?.Patient, Ward: a.attendance?.Ward, Bed: a.attendance?.Bed });
      default:
        return null;
    }
  }

  async generateReceipt(billId: string, userId: string, paymentId?: string) {
    try {
      const bill = await this.getEntityData('bill', billId);
      if (!bill) {
        return { success: false, error: 'Bill not found' };
      }

      // A receipt acknowledges one actual payment, not the lifetime totals on the bill.
      // Keep bill-level statements separate from payment receipts.
      let payment: any = null;
      if (paymentId) {
        payment = await prisma.payment.findFirst({
          where: { id: paymentId, billId, isVoided: false },
          include: { User: { select: { fullName: true, username: true } } }
        });
        if (!payment) return { success: false, error: 'Payment not found for this bill, or payment has been voided.' };
      }

      const template = await this.documentRepository.getDefaultTemplate('receipt');
      if (!template) {
        return { success: false, error: 'Receipt template not found' };
      }

      const paymentAmount = payment ? Number(payment.amount) : null;
      const paymentDate = payment?.transactionDate ? new Date(payment.transactionDate) : new Date();
      const who = this.party(bill);
      const content = `
        PAYMENT RECEIPT
        ===============
        Receipt Reference: ${payment ? payment.id : `BILL-${bill.billNumber}-SUMMARY`}
        Bill Number: ${bill.billNumber}
        Customer: ${who.name}
        ${who.folderLabel}: ${who.folder}
        Visit Number: ${bill.Attendance?.attendanceNumber || 'N/A'}
        ${payment ? `Payment Amount: ${paymentAmount?.toFixed(2)}
        Payment Method: ${String(payment.paymentMethod).replace('_', ' ').toUpperCase()}
        Payment Reference: ${payment.reference || 'N/A'}
        Received By: ${payment.User?.fullName || payment.User?.username || userId}
        Transaction Date: ${paymentDate.toLocaleString()}` : `Receipt Type: Bill payment summary (not proof of a single transaction)`}
        Bill Total: ${Number(bill.totalAmount || 0).toFixed(2)}
        Total Paid: ${Number(bill.paidAmount || 0).toFixed(2)}
        Outstanding Balance: ${Number(bill.balance || 0).toFixed(2)}
        Generated: ${new Date().toLocaleString()}
      `;

      const fileName = payment
        ? `receipt_${billId}_${payment.id}.pdf`
        : `bill_payment_summary_${billId}_${Date.now()}.pdf`;
      const filePath = await this.generatePdf(content, fileName, template);

      const document = await this.documentRepository.createDocument({
        templateId: template.id,
        entityType: 'bill',
        entityId: billId,
        filePath,
        generatedById: userId
      });

      return {
        success: true,
        documentId: document.id,
        filePath
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async generateReferralLetter(referralId: string, userId: string) {
    try {
      const referral = await this.getEntityData('referral', referralId);
      if (!referral) {
        return { success: false, error: 'Referral not found' };
      }

      const template = await this.documentRepository.getDefaultTemplate('referral_letter');
      if (!template) {
        return { success: false, error: 'Referral letter template not found' };
      }

      const content = `
        REFERRAL LETTER
        ===============
        Patient: ${referral.patient?.surname} ${referral.patient?.otherNames}
        Referral Type: ${referral.referralType}
        Referral Reason: ${referral.referralReason}
        Referred To: ${referral.referredToFacility || referral.referredToDepartment}
        Urgency: ${referral.urgency}
        Date: ${new Date().toLocaleDateString()}
      `;

      const fileName = `referral_${referralId}_${Date.now()}.pdf`;
      const filePath = await this.generatePdf(content, fileName, template);

      const document = await this.documentRepository.createDocument({
        templateId: template.id,
        entityType: 'referral',
        entityId: referralId,
        filePath,
        generatedById: userId
      });

      return {
        success: true,
        documentId: document.id,
        filePath
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async generateDischargeSummary(encounterId: string, userId: string) {
    try {
      const encounter = await this.getEntityData('encounter', encounterId);
      if (!encounter) {
        return { success: false, error: 'Encounter not found' };
      }
      // A counter ticket has no admission or ward stay, so there is nothing to summarise on discharge.
      if (encounter.attendanceType === 'walk_in') {
        return { success: false, error: 'A counter ticket cannot have a discharge summary. Print the bill statement or lab result instead.' };
      }

      const template = await this.documentRepository.getDefaultTemplate('discharge_summary');
      if (!template) {
        return { success: false, error: 'Discharge summary template not found' };
      }

      const diagnoses = encounter.AttendanceDiagnosis?.map((d: any) => d.Diagnosis?.name).join(', ') || 'None';
      const who = this.party(encounter);

      const content = `
        DISCHARGE SUMMARY
        =================
        ${who.title}: ${who.name}
        ${who.folderLabel}: ${who.folder}
        Admission Date: ${encounter.dateTime}
        Discharge Date: ${new Date().toLocaleDateString()}
        Diagnoses: ${diagnoses}
        Treatment Summary: ${(encounter.clinicalNotes as any)?.treatmentPlan || encounter.treatmentPlan || 'Not specified'}
        Follow-up Instructions: Please schedule a follow-up appointment in 2 weeks
      `;

      const fileName = `discharge_${encounterId}_${Date.now()}.pdf`;
      const filePath = await this.generatePdf(content, fileName, template);

      const document = await this.documentRepository.createDocument({
        templateId: template.id,
        entityType: 'encounter',
        entityId: encounterId,
        filePath,
        generatedById: userId
      });

      return {
        success: true,
        documentId: document.id,
        filePath
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async generateLabResult(encounterId: string, userId: string) {
    try {
      const encounter = await this.getEntityData('encounter', encounterId);
      if (!encounter) {
        return { success: false, error: 'Encounter not found' };
      }

      const template = await this.documentRepository.getDefaultTemplate('lab_result');
      if (!template) {
        return { success: false, error: 'Lab result template not found' };
      }

      const who = this.party(encounter);
      const labs = (encounter.LabTest || []).flatMap((t: any) => [
        `${t.LabTestTemplate?.name || 'Laboratory test'} [${String(t.status).toUpperCase()}]`,
        ...this.labResultLines(t.result, t.normalRange, t.units),
      ]);
      const scans = (encounter.Scan || []).map((s: any) => {
        const report = [s.result, s.findings, s.impression].filter((v: any) => typeof v === 'string' && v.trim()).join(' — ');
        return `- ${s.ScanTemplate?.name || s.scanType}: ${report || `no report issued (${String(s.status).toLowerCase()})`}`;
      });

      const content = `
        LABORATORY RESULT
        =================
        ${who.title}: ${who.name}
        ${who.folderLabel}: ${who.folder}
        Date: ${new Date().toLocaleDateString()}
        
        LAB TESTS:
        ${labs.length ? labs.join('\n') : 'No lab tests found'}

        SCANS:
        ${scans.length ? scans.join('\n') : 'No scans found'}
      `;

      const fileName = `lab_result_${encounterId}_${Date.now()}.pdf`;
      const filePath = await this.generatePdf(content, fileName, template);

      const document = await this.documentRepository.createDocument({
        templateId: template.id,
        entityType: 'encounter',
        entityId: encounterId,
        filePath,
        generatedById: userId
      });

      return {
        success: true,
        documentId: document.id,
        filePath
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async generatePrescription(encounterId: string, userId: string) {
    try {
      const encounter = await this.getEntityData('encounter', encounterId);
      if (!encounter) {
        return { success: false, error: 'Encounter not found' };
      }

      const template = await this.documentRepository.getDefaultTemplate('prescription');
      if (!template) {
        return { success: false, error: 'Prescription template not found' };
      }

      const who = this.party(encounter);
      const content = `
        PRESCRIPTION
        ============
        ${who.title}: ${who.name}
        ${who.folderLabel}: ${who.folder}
        Date: ${new Date().toLocaleDateString()}
        
        MEDICATIONS:
        ${encounter.Medication?.map((m: any) => {
          // A counter sale is dispensed straight away, so it carries no dosage or course length.
          const directions = [m.dosage, m.frequency, m.duration ? `for ${m.duration}` : '']
            .filter((part) => typeof part === 'string' && part.trim())
            .join(' ');
          return `- ${m.name}${m.quantity ? ` x ${m.quantity}` : ''}: ${directions || m.instructions || 'As dispensed at the counter'}`;
        }).join('\n') || 'No medications prescribed'}
      `;

      const fileName = `prescription_${encounterId}_${Date.now()}.pdf`;
      const filePath = await this.generatePdf(content, fileName, template);

      const document = await this.documentRepository.createDocument({
        templateId: template.id,
        entityType: 'encounter',
        entityId: encounterId,
        filePath,
        generatedById: userId
      });

      return {
        success: true,
        documentId: document.id,
        filePath
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async generateBillStatement(billId: string, userId: string) {
    try {
      const bill = await this.getEntityData('bill', billId);
      if (!bill) {
        return { success: false, error: 'Bill not found' };
      }

      const template = await this.documentRepository.getDefaultTemplate('bill_statement');
      if (!template) {
        return { success: false, error: 'Bill statement template not found' };
      }

      const who = this.party(bill);
      const content = `
        BILL STATEMENT
        ==============
        Bill Number: ${bill.billNumber}
        ${who.title}: ${who.name}
        ${who.folderLabel}: ${who.folder}
        Date: ${new Date().toLocaleDateString()}
        
        ITEMS:
        ${bill.BillLineItem?.map((item: any) => `- ${item.description}: ${item.quantity} x ${item.unitPrice} = ${item.lineTotal}`).join('\n') || 'No items found'}
        
        Subtotal: ${bill.subtotal}
        Discount: ${bill.discount}
        Total: ${bill.totalAmount}
        Paid: ${bill.paidAmount}
        Balance: ${bill.balance}
      `;

      const fileName = `statement_${billId}_${Date.now()}.pdf`;
      const filePath = await this.generatePdf(content, fileName, template);

      const document = await this.documentRepository.createDocument({
        templateId: template.id,
        entityType: 'bill',
        entityId: billId,
        filePath,
        generatedById: userId
      });

      return {
        success: true,
        documentId: document.id,
        filePath
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getDocumentsByEntity(entityType: string, entityId: string) {
    return this.documentRepository.findDocumentsByEntity(entityType, entityId);
  }

  async getAllTemplates() {
    return this.documentRepository.findAllTemplates();
  }

  async createTemplate(data: IDocumentTemplateCreateDTO, createdById: string) {
    // Check if code already exists
    const existing = await this.documentRepository.findTemplateByCode(data.code);
    if (existing) {
      throw new Error(`Template with code ${data.code} already exists`);
    }

    // If this is default, unset other defaults of same type
    if (data.isDefault) {
      const defaultTemplate = await this.documentRepository.getDefaultTemplate(data.templateType);
      if (defaultTemplate && defaultTemplate.id) {
        await this.documentRepository.updateTemplate(defaultTemplate.id, { isDefault: false });
      }
    }

    return this.documentRepository.createTemplate({
      name: data.name,
      code: data.code,
      templateType: data.templateType,
      content: data.content,
      isDefault: data.isDefault || false,
      createdById
    });
  }

  async updateTemplate(id: string, data: IDocumentTemplateUpdateDTO) {
    const template = await this.documentRepository.findTemplateById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    // If setting as default, unset other defaults of same type
    if (data.isDefault) {
      const defaultTemplate = await this.documentRepository.getDefaultTemplate(template.templateType);
      if (defaultTemplate && defaultTemplate.id !== id) {
        await this.documentRepository.updateTemplate(defaultTemplate.id, { isDefault: false });
      }
    }

    return this.documentRepository.updateTemplate(id, data);
  }

  async deleteTemplate(id: string) {
    const template = await this.documentRepository.findTemplateById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    return this.documentRepository.deleteTemplate(id);
  }

  async downloadDocument(id: string) {
    const document = await this.documentRepository.findDocumentById(id);
    if (!document || !document.filePath) {
      return { success: false, error: 'Document not found' };
    }

    return {
      success: true,
      filePath: document.filePath,
      fileName: document.filePath.split('/').pop(),
      entityType: document.entityType,
      generatedById: document.generatedById,
    };
  }
}