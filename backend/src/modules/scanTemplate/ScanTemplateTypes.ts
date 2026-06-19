// ScanTemplateTypes.ts - TypeScript types and DTOs for scan template module

import { ServiceCategory } from '@prisma/client';

export interface ScanTemplateQueryParams {
  isActive?: boolean;
  category?: string;
  bodyPart?: string;
  scanType?: string;
  page?: number;
  limit?: number;
}

export interface CreateScanTemplateDTO {
  name: string;
  code: string;
  description?: string;
  serviceCategory: ServiceCategory;
  bodyPart?: string;
  nhisServiceCode?: string;
  tariffCode?: string;
  isNHISCovered?: boolean;
  nhisRequiresAuth?: boolean;
  preparationInstructions?: string;
  duration?: number;
  contrastRequired?: boolean;
  scanType?: string;
  isActive?: boolean;
  unit?: string;
  cashPrice: number;
  nhisPrice?: number;
  insurancePrice: number;
  vatRate?: number;
  isTaxable?: boolean;
}

export interface UpdateScanTemplateDTO {
  name?: string;
  code?: string;
  description?: string;
  serviceCategory?: ServiceCategory;
  bodyPart?: string;
  nhisServiceCode?: string;
  tariffCode?: string;
  isNHISCovered?: boolean;
  nhisRequiresAuth?: boolean;
  preparationInstructions?: string;
  duration?: number;
  contrastRequired?: boolean;
  scanType?: string;
  isActive?: boolean;
  unit?: string;
  cashPrice?: number;
  nhisPrice?: number;
  insurancePrice?: number;
  vatRate?: number;
  isTaxable?: boolean;
}

export interface BulkUpdateDTO {
  ids: string[];
  isActive: boolean;
}

export interface ScanTemplateResponse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  serviceType: string;
  serviceCategory: ServiceCategory;
  subType: string | null;
  nhisServiceCode: string | null;
  tariffCode: string | null;
  isNHISCovered: boolean;
  nhisRequiresAuth: boolean;
  metadata: any;
  isActive: boolean;
  unit: string;
  createdById: string | null;
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
  scans?: Array<{
    id: string;
    status: string;
  }>;
}

export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface GetScanTemplatesResponse {
  success: boolean;
  data: ScanTemplateResponse[];
  pagination: PaginationInfo;
}