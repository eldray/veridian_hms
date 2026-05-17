import { BaseService } from '../base/BaseService';
import { DocumentRepository } from './DocumentRepository';
import { IDocument, IDocumentTemplate, IDocumentGenerateDTO, IDocumentTemplateCreateDTO, IDocumentTemplateUpdateDTO } from './DocumentTypes';

export class DocumentService extends BaseService<IDocument> {
  private documentRepository: DocumentRepository;

  constructor() {
    super();
    this.documentRepository = new DocumentRepository();
  }

  async generateReceipt(billId: string, userId: string): Promise<{ success: boolean; documentId?: string; filePath?: string; error?: string }> {
    try {
      // This would integrate with DocumentGeneratorService
      const document = await this.documentRepository.create({
        billId,
        documentType: 'receipt',
        filePath: `/documents/receipts/${billId}.pdf`,
        fileName: `receipt_${billId}.pdf`,
        generatedAt: new Date(),
        generatedBy: userId,
        status: 'active'
      });
      
      return {
        success: true,
        documentId: document._id,
        filePath: document.filePath
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async generateReferralLetter(referralId: string, userId: string): Promise<{ success: boolean; documentId?: string; filePath?: string; error?: string }> {
    try {
      const document = await this.documentRepository.create({
        referralId,
        documentType: 'referral_letter',
        filePath: `/documents/referrals/${referralId}.pdf`,
        fileName: `referral_${referralId}.pdf`,
        generatedAt: new Date(),
        generatedBy: userId,
        status: 'active'
      });
      
      return {
        success: true,
        documentId: document._id,
        filePath: document.filePath
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async generateDischargeSummary(encounterId: string, userId: string): Promise<{ success: boolean; documentId?: string; filePath?: string; error?: string }> {
    try {
      const document = await this.documentRepository.create({
        encounterId,
        documentType: 'discharge_summary',
        filePath: `/documents/discharge/${encounterId}.pdf`,
        fileName: `discharge_${encounterId}.pdf`,
        generatedAt: new Date(),
        generatedBy: userId,
        status: 'active'
      });
      
      return {
        success: true,
        documentId: document._id,
        filePath: document.filePath
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async generateLabResult(encounterId: string, userId: string): Promise<{ success: boolean; documentId?: string; filePath?: string; error?: string }> {
    try {
      const document = await this.documentRepository.create({
        encounterId,
        documentType: 'lab_result',
        filePath: `/documents/lab/${encounterId}.pdf`,
        fileName: `lab_result_${encounterId}.pdf`,
        generatedAt: new Date(),
        generatedBy: userId,
        status: 'active'
      });
      
      return {
        success: true,
        documentId: document._id,
        filePath: document.filePath
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async generatePrescription(encounterId: string, userId: string): Promise<{ success: boolean; documentId?: string; filePath?: string; error?: string }> {
    try {
      const document = await this.documentRepository.create({
        encounterId,
        documentType: 'prescription',
        filePath: `/documents/prescription/${encounterId}.pdf`,
        fileName: `prescription_${encounterId}.pdf`,
        generatedAt: new Date(),
        generatedBy: userId,
        status: 'active'
      });
      
      return {
        success: true,
        documentId: document._id,
        filePath: document.filePath
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async generateBillStatement(billId: string, userId: string): Promise<{ success: boolean; documentId?: string; filePath?: string; error?: string }> {
    try {
      const document = await this.documentRepository.create({
        billId,
        documentType: 'bill_statement',
        filePath: `/documents/statements/${billId}.pdf`,
        fileName: `statement_${billId}.pdf`,
        generatedAt: new Date(),
        generatedBy: userId,
        status: 'active'
      });
      
      return {
        success: true,
        documentId: document._id,
        filePath: document.filePath
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  async getDocumentsByEntity(entityType: string, entityId: string): Promise<IDocument[]> {
    switch (entityType) {
      case 'bill':
        return this.documentRepository.findByBillId(entityId);
      case 'referral':
        return this.documentRepository.findByReferralId(entityId);
      case 'encounter':
        return this.documentRepository.findByEncounterId(entityId);
      case 'patient':
        return this.documentRepository.findByPatientId(entityId);
      default:
        return [];
    }
  }

  async getAllTemplates(): Promise<IDocumentTemplate[]> {
    return this.documentRepository.findTemplates();
  }

  async createTemplate(data: IDocumentTemplateCreateDTO, createdById: string): Promise<IDocumentTemplate> {
    return this.documentRepository.createTemplate({ ...data, createdById });
  }

  async updateTemplate(id: string, data: IDocumentTemplateUpdateDTO): Promise<IDocumentTemplate> {
    return this.documentRepository.updateTemplate(id, data);
  }

  async deleteTemplate(id: string): Promise<void> {
    return this.documentRepository.deleteTemplate(id);
  }

  async downloadDocument(id: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const document = await this.findById(this.documentRepository, id, 'Document');
      return {
        success: true,
        filePath: document.filePath
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}
