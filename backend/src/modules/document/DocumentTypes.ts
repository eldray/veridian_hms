// modules/document/DocumentTypes.ts
import { Request } from 'express';

export interface IDocument {
  id: string;
  templateId: string;
  entityType: string;
  entityId: string;
  filePath: string | null;
  generatedById: string;
  generatedAt: Date;
}

export interface IDocumentTemplate {
  id: string;
  name: string;
  code: string;
  templateType: string;
  content: string;
  isActive: boolean;
  isDefault: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDocumentGenerateDTO {
  billId?: string;
  referralId?: string;
  encounterId?: string;
  admissionId?: string;
  documentType: string;
}

export interface IDocumentTemplateCreateDTO {
  name: string;
  code: string;
  templateType: string;
  content: string;
  isDefault?: boolean;
}

export interface IDocumentTemplateUpdateDTO extends Partial<IDocumentTemplateCreateDTO> {
  isActive?: boolean;
}

export interface IDocumentRequest extends Request {
  params: { id: string; billId?: string; referralId?: string; encounterId?: string };
  body: IDocumentGenerateDTO | IDocumentTemplateCreateDTO;
}