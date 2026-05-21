// modules/document/DocumentService.ts
import { PrismaClient } from '@prisma/client';
import { DocumentRepository } from './DocumentRepository';
import { IDocument, IDocumentTemplate, IDocumentTemplateCreateDTO, IDocumentTemplateUpdateDTO } from './DocumentTypes';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

export class DocumentService {
  private documentRepository: DocumentRepository;

  constructor() {
    this.documentRepository = new DocumentRepository();
  }

  private async generatePdf(content: string, fileName: string, template: any): Promise<string> {
    // Create documents directory if it doesn't exist
    const docsDir = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const filePath = path.join(docsDir, fileName);
    
    // For now, just save the content as a text file
    // In production, use a PDF generation library like puppeteer or pdfkit
    fs.writeFileSync(filePath.replace('.pdf', '.txt'), content);
    
    return `/uploads/documents/${fileName}`;
  }

  private async getEntityData(entityType: string, entityId: string): Promise<any> {
    switch (entityType) {
      case 'bill':
        return prisma.bill.findUnique({
          where: { id: entityId },
          include: {
            Patient: true,
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
            AttendanceDiagnosis: {
              include: { Diagnosis: true }
            },
            Vitals: true,
            Medication: true
          }
        });
      case 'admission':
        return prisma.admission.findUnique({
          where: { id: entityId },
          include: {
            Patient: true,
            Ward: true,
            Bed: true
          }
        });
      default:
        return null;
    }
  }

  async generateReceipt(billId: string, userId: string) {
    try {
      const bill = await this.getEntityData('bill', billId);
      if (!bill) {
        return { success: false, error: 'Bill not found' };
      }

      const template = await this.documentRepository.getDefaultTemplate('receipt');
      if (!template) {
        return { success: false, error: 'Receipt template not found' };
      }

      // Generate receipt content (simplified)
      const content = `
        RECEIPT
        =======
        Bill Number: ${bill.billNumber}
        Patient: ${bill.Patient?.surname} ${bill.Patient?.otherNames}
        Amount: ${bill.totalAmount}
        Paid: ${bill.paidAmount}
        Balance: ${bill.balance}
        Date: ${new Date().toLocaleDateString()}
      `;

      const fileName = `receipt_${billId}_${Date.now()}.pdf`;
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

      const template = await this.documentRepository.getDefaultTemplate('discharge_summary');
      if (!template) {
        return { success: false, error: 'Discharge summary template not found' };
      }

      const diagnoses = encounter.AttendanceDiagnosis?.map((d: any) => d.Diagnosis?.name).join(', ') || 'None';

      const content = `
        DISCHARGE SUMMARY
        =================
        Patient: ${encounter.Patient?.surname} ${encounter.Patient?.otherNames}
        Folder Number: ${encounter.Patient?.folderNumber}
        Admission Date: ${encounter.dateTime}
        Discharge Date: ${new Date().toLocaleDateString()}
        Diagnoses: ${diagnoses}
        Treatment Summary: ${encounter.treatmentPlan || 'Not specified'}
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

      const content = `
        LABORATORY RESULT
        =================
        Patient: ${encounter.Patient?.surname} ${encounter.Patient?.otherNames}
        Folder Number: ${encounter.Patient?.folderNumber}
        Date: ${new Date().toLocaleDateString()}
        
        LAB TESTS:
        ${encounter.LabTest?.map((t: any) => `- ${t.name}: ${t.result || 'Pending'}`).join('\n') || 'No lab tests found'}
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

      const content = `
        PRESCRIPTION
        ============
        Patient: ${encounter.Patient?.surname} ${encounter.Patient?.otherNames}
        Folder Number: ${encounter.Patient?.folderNumber}
        Date: ${new Date().toLocaleDateString()}
        
        MEDICATIONS:
        ${encounter.Medication?.map((m: any) => `- ${m.name}: ${m.dosage} ${m.frequency} for ${m.duration}`).join('\n') || 'No medications prescribed'}
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

      const content = `
        BILL STATEMENT
        ==============
        Bill Number: ${bill.billNumber}
        Patient: ${bill.Patient?.surname} ${bill.Patient?.otherNames}
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
      fileName: document.filePath.split('/').pop()
    };
  }
}