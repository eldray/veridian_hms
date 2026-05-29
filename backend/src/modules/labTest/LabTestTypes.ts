// modules/labTest/LabTestTypes.ts
import { ServiceCategory } from '@prisma/client';

export interface LabTestQueryParams {
  isActive?: boolean;
  category?: string;
  subType?: string;
  page?: number;
  limit?: number;
}

export interface CreateLabTestDTO {
  name: string;
  code: string;
  description?: string;
  serviceCategory: ServiceCategory;
  subType?: string;
  nhisServiceCode?: string;
  tariffCode?: string;
  isNHISCovered?: boolean;
  nhisRequiresAuth?: boolean;
  privateInsRequiresAuth?: boolean;
  isPrivateInsuranceExempted?: boolean;
  specimenType?: string;
  preparationInstructions?: string;
  turnaroundTime?: string;
  normalRange?: string;
  containerType?: string;
  resultTemplate?: any;
  isActive?: boolean;
  unit?: string;
  cashPrice: number;
  nhisPrice?: number;
  insurancePrice: number;
  vatRate?: number;
  isTaxable?: boolean;
}

export interface UpdateLabTestDTO extends Partial<CreateLabTestDTO> {
  id?: string;
}

export interface BulkUpdateDTO {
  ids: string[];
  isActive: boolean;
}

export interface LabTestResponse {
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
  privateInsRequiresAuth: boolean;
  isPrivateInsuranceExempted: boolean;
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
  labTests?: Array<{
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

export interface GetLabTestsResponse {
  success: boolean;
  data: LabTestResponse[];
  pagination: PaginationInfo;
}