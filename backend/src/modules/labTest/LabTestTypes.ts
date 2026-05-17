// LabTestTypes.ts - TypeScript types and DTOs for Lab Test module

import { ServiceCategory, Priority } from '@prisma/client';

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface LabTestServiceQuery {
  serviceCategory?: ServiceCategory;
  subType?: string;
  isActive?: boolean;
  isNHISCovered?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateLabTestServiceDTO {
  name: string;
  code: string;
  description?: string;
  serviceCategory: ServiceCategory;
  subType: string;
  cashPrice: number;
  nhisPrice?: number;
  insurancePrice: number;
  nhisServiceCode?: string;
  tariffCode?: string;
  isNHISCovered?: boolean;
  nhisCoverageType?: string;
  nhisRequiresAuth?: boolean;
  privateInsRequiresAuth?: boolean;
  isPrivateInsuranceExempted?: boolean;
  metadata?: {
    specimenType?: string;
    preparationInstructions?: string;
    turnaroundTime?: string;
    normalRange?: string;
    containerType?: string;
    resultTemplate?: string;
    storageRequirements?: string;
  };
  requiresClinicalNotes?: boolean;
  isActive?: boolean;
  unit?: string;
  vatRate?: number;
  isTaxable?: boolean;
}

export interface UpdateLabTestServiceDTO extends Partial<CreateLabTestServiceDTO> {
  id: string;
}

export interface BulkUpdateLabTestDTO {
  ids: string[];
  isActive: boolean;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface LabTestServiceResponse {
  id: string;
  name: string;
  code: string;
  description?: string;
  serviceType: 'lab_test';
  serviceCategory: ServiceCategory;
  subType: string;
  nhisServiceCode?: string;
  tariffCode?: string;
  isNHISCovered: boolean;
  nhisCoverageType?: string;
  nhisRequiresAuth: boolean;
  privateInsRequiresAuth: boolean;
  isPrivateInsuranceExempted: boolean;
  metadata?: any;
  requiresClinicalNotes: boolean;
  isActive: boolean;
  unit: string;
  pricing?: {
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    vatRate: number;
    isTaxable: boolean;
    isActive: boolean;
  };
  LabTestTemplate?: Array<{
    id: string;
    name: string;
    investigationCode?: string;
    category?: string;
  }>;
  labTests?: Array<{
    id: string;
    status: string;
    Attendance?: {
      attendanceNumber: string;
    };
  }>;
  User?: {
    id: string;
    fullName: string;
    username: string;
  };
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface LabTestServicesListResponse {
  success: boolean;
  data: LabTestServiceResponse[];
  pagination?: PaginationResponse;
}

export interface LabTestSubCategoryResponse {
  success: boolean;
  data: string[];
}

export interface LabMetadataFieldsResponse {
  success: boolean;
  data: {
    specimenTypes: string[];
    preparationInstructions: string[];
    metadataStructure: Record<string, string>;
  };
}
