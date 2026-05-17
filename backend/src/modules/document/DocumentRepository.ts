import { BaseRepository } from '../base/BaseRepository';
import { IDocument, IDocumentTemplate, IDocumentTemplateCreateDTO, IDocumentTemplateUpdateDTO } from './DocumentTypes';

export class DocumentRepository extends BaseRepository<IDocument> {
  constructor() {
    super('Document');
  }

  async findByBillId(billId: string): Promise<IDocument[]> {
    return this.find({ billId });
  }

  async findByReferralId(referralId: string): Promise<IDocument[]> {
    return this.find({ referralId });
  }

  async findByEncounterId(encounterId: string): Promise<IDocument[]> {
    return this.find({ encounterId });
  }

  async findByPatientId(patientId: string): Promise<IDocument[]> {
    return this.find({ patientId });
  }

  async findByDocumentType(documentType: string): Promise<IDocument[]> {
    return this.find({ documentType });
  }

  async findTemplates(): Promise<IDocumentTemplate[]> {
    const result = await this.model?.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    return result || [];
  }

  async createTemplate(data: IDocumentTemplateCreateDTO & { createdById: string }): Promise<IDocumentTemplate> {
    const templateData = {
      ...data,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (this.model) {
      const result = await this.model.create({ data: templateData as any });
      return result;
    }
    throw new Error('Model not found');
  }

  async updateTemplate(id: string, data: IDocumentTemplateUpdateDTO): Promise<IDocumentTemplate> {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };
    
    if (this.model) {
      const result = await this.model.update({
        where: { id },
        data: updateData as any
      });
      return result;
    }
    throw new Error('Model not found');
  }

  async deleteTemplate(id: string): Promise<void> {
    if (this.model) {
      await this.model.delete({ where: { id } });
    } else {
      throw new Error('Model not found');
    }
  }

  async findByIdAndDelete(id: string): Promise<boolean> {
    return this.delete(id);
  }
}
