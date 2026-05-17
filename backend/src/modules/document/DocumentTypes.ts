import { Request } from 'express';

export interface IDocument {
  _id?: string;
  billId?: string;
  referralId?: string;
  encounterId?: string;
  patientId?: string;
  documentType: 'receipt' | 'referral_letter' | 'discharge_summary' | 'lab_result' | 'prescription' | 'bill_statement';
  filePath: string;
  fileName: string;
  generatedAt?: Date;
  generatedBy?: string;
  status?: 'active' | 'archived';
}

export interface IDocumentTemplate {
  _id?: string;
  name: string;
  code: string;
  templateType: string;
  content: string;
  isDefault: boolean;
  isActive: boolean;
  createdById?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDocumentGenerateDTO {
  billId?: string;
  referralId?: string;
  encounterId?: string;
  patientId?: string;
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
  params: { id: string; billId?: string; referralId?: string };
  body: IDocumentGenerateDTO | IDocumentTemplateCreateDTO;
}
