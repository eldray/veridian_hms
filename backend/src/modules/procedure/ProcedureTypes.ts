// modules/procedure/ProcedureTypes.ts

import { ServiceType, ServiceCategory } from '@prisma/client';

// ============================================
// REQUEST DTOs
// ============================================

export interface GetProcedureTemplatesRequest {
  category?: string;
  department?: string;
  isActive?: string;
  page?: string;
  limit?: string;
}

export interface GetProcedureTemplateByIdRequest {
  id: string;
}

export interface CreateProcedureTemplateRequest {
  name: string;
  code: string;
  description?: string;
  serviceCategory: ServiceCategory;
  category?: string;
  nhisServiceCode?: string;
  tariffCode?: string;
  isNHISCovered?: boolean;
  department?: string;
  duration?: number;
  requiresAssistant?: boolean;
  anesthesiaType?: string;
  anesthesiaNotes?: string;
  intraOperativeNotes?: string;
  postOperativeNotes?: string;
  bloodLoss?: string;
  complications?: string;
  outcome?: string;
  cost?: number;
  procedureCategory?: string;
  cashPrice: number;
  nhisPrice?: number;
  insurancePrice: number;
  vatRate?: number;
  isTaxable?: boolean;
  isActive?: boolean;
  unit?: string;
}

export interface UpdateProcedureTemplateRequest {
  id: string;
  name?: string;
  code?: string;
  serviceCategory?: ServiceCategory;
  category?: string;
  department?: string;
  duration?: number;
  requiresAssistant?: boolean;
  anesthesiaType?: string;
  anesthesiaNotes?: string;
  intraOperativeNotes?: string;
  postOperativeNotes?: string;
  bloodLoss?: string;
  complications?: string;
  outcome?: string;
  cost?: number;
  cashPrice?: number;
  nhisPrice?: number;
  insurancePrice?: number;
  vatRate?: number;
  isTaxable?: boolean;
  isActive?: boolean;
}

export interface DeleteProcedureTemplateRequest {
  id: string;
}

export interface BulkUpdateProcedureTemplatesRequest {
  ids: string[];
  isActive?: boolean;
}

// ============================================
// RESPONSE DTOs
// ============================================

export interface ProcedureTemplateResponse {
  success: boolean;
  data?: any;
  pagination?: {
    currentPage: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ProcedureCategoriesResponse {
  success: boolean;
  data: string[];
}

export interface ProcedureDepartmentsResponse {
  success: boolean;
  data: string[];
}

export interface BulkUpdateResponse {
  success: boolean;
  message: string;
  count: number;
}

// ============================================
// SERVICE INTERFACES
// ============================================

export interface IProcedureService {
  getTemplates(filters: GetProcedureTemplatesRequest): Promise<any>;
  getTemplateById(id: string): Promise<any>;
  createTemplate(data: CreateProcedureTemplateRequest, userId: string): Promise<any>;
  updateTemplate(id: string, data: UpdateProcedureTemplateRequest, userId: string): Promise<any>;
  deleteTemplate(id: string): Promise<void>;
  getCategories(): Promise<string[]>;
  getDepartments(): Promise<string[]>;
  bulkUpdate(ids: string[], isActive: boolean): Promise<number>;
}

// ============================================
// PROCEDURE MODEL TYPE
// ============================================

export interface ProcedureDTO {
  id: string;
  name: string;
  code: string;
  description: string | null;
  serviceType: ServiceType;
  serviceCategory: ServiceCategory;
  subType: string | null;
  nhisServiceCode: string | null;
  tariffCode: string | null;
  isNHISCovered: boolean;
  metadata: any;
  isActive: boolean;
  unit: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  pricing: {
    id: string;
    serviceCatalogId: string;
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    vatRate: number;
    isTaxable: boolean;
    effectiveDate: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}
