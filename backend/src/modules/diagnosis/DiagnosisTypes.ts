// modules/diagnosis/DiagnosisTypes.ts

import { MorbidityGroup } from '@prisma/client';

// ============================================
// DTOs - Data Transfer Objects
// ============================================

export interface CreateDiagnosisDTO {
  name: string;
  icdCode: string;
  morbidityGroup: MorbidityGroup;
  description?: string;
  requiresAuthorization?: boolean;
  isChronic?: boolean;
  isNHISCovered?: boolean;
  tariffCode?: string;
}

export interface UpdateDiagnosisDTO {
  name?: string;
  icdCode?: string;
  morbidityGroup?: MorbidityGroup;
  description?: string;
  requiresAuthorization?: boolean;
  isChronic?: boolean;
  isNHISCovered?: boolean;
  tariffCode?: string;
  isActive?: boolean;
}

export interface DiagnosisFilterDTO {
  page?: number;
  limit?: number;
  morbidityGroup?: MorbidityGroup;
  isActive?: boolean;
  search?: string;
  searchField?: 'name' | 'icdCode' | 'morbidityGroup' | 'all';
}

export interface DiagnosisStatsDTO {
  dateFrom?: Date;
  dateTo?: Date;
}

// ============================================
// Response Types
// ============================================

export interface DiagnosisResponse {
  id: string;
  name: string;
  icdCode: string;
  morbidityGroup: MorbidityGroup;
  description?: string;
  requiresAuthorization: boolean;
  isChronic: boolean;
  isNHISCovered: boolean;
  tariffCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiagnosisWithRelations extends DiagnosisResponse {
  gdrgTariffDiagnoses?: Array<{
    id: string;
    gdrgTariff: {
      id: string;
      gdrgCode: string;
      mdc: string;
      description: string;
      nhiaTariff: number;
      ageSplit?: number;
      minAgeYears?: number;
      maxAgeYears?: number;
      applicableLevels?: string[];
      nhisServiceCode?: string;
      isZoomCode: boolean;
      effectiveFrom: Date;
      effectiveTo?: Date;
      isActive: boolean;
    };
  }>;
  ServiceCatalog?: Array<{
    id: string;
    name: string;
    code: string;
    serviceType: string;
    serviceCategory: string;
    pricing: Array<{
      cashPrice: number;
      nhisPrice: number;
      insurancePrice: number;
    }>;
  }>;
}

export interface DiagnosisStatsResponse {
  total: number;
  active: number;
  inactive: number;
  byMorbidityGroup: Array<{
    morbidityGroup: MorbidityGroup;
    _count: number;
  }>;
  recentAdditions: number;
  diagnosesWithGDRG: number;
  gdrgCoverage: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T | T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}