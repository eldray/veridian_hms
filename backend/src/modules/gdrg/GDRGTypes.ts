// GDRGTypes.ts - TypeScript types and DTOs for GDRG module

import { GDRGMDC } from '@prisma/client';

export interface GDRGTariff {
  id: string;
  gdrgCode: string;
  mdc: GDRGMDC;
  description: string;
  nhiaTariff: number;
  ageSplit?: string;
  minAgeYears?: number | null;
  maxAgeYears?: number | null;
  applicableLevels?: number[];
  nhisServiceCode?: string | null;
  isZoomCode: boolean;
  allowsAddOn: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  notes?: string | null;
  isActive: boolean;
  encounterCategory?: string | null;
  attendanceTypes?: string[];
  isAntenatal: boolean;
  isDelivery: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GDRGDiagnosisLink {
  id: string;
  gdrgTariffId: string;
  diagnosisId: string;
  isPrimary: boolean;
  mappedIcdCode: string;
}

export interface GDRGProcedureLink {
  id: string;
  gdrgTariffId: string;
  procedureId: string;
  isPrimary: boolean;
  mappedCode: string;
}

export interface GetGDRGTariffsQuery {
  mdc?: GDRGMDC;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GetGDRGByCodeParams {
  code: string;
}

export interface LookupGDRGByAgeQuery {
  gdrgCode: string;
  patientId?: string;
  attendanceDate?: string;
  ageInYears?: string;
}

export interface CreateGDRGTariffRequest {
  gdrgCode: string;
  mdc: GDRGMDC;
  description: string;
  nhiaTariff: number;
  ageSplit?: string;
  minAgeYears?: number | null;
  maxAgeYears?: number | null;
  applicableLevels?: number[];
  nhisServiceCode?: string | null;
  isZoomCode?: boolean;
  allowsAddOn?: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date | null;
  notes?: string | null;
  encounterCategory?: string | null;
  attendanceTypes?: string[];
  isAntenatal?: boolean;
  isDelivery?: boolean;
}

export interface UpdateGDRGTariffRequest {
  gdrgCode?: string;
  mdc?: GDRGMDC;
  description?: string;
  nhiaTariff?: number;
  ageSplit?: string;
  minAgeYears?: number | null;
  maxAgeYears?: number | null;
  applicableLevels?: number[];
  nhisServiceCode?: string | null;
  isZoomCode?: boolean;
  allowsAddOn?: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date | null;
  notes?: string | null;
  isActive?: boolean;
  encounterCategory?: string | null;
  attendanceTypes?: string[];
  isAntenatal?: boolean;
  isDelivery?: boolean;
}

export interface DeleteGDRGTariffParams {
  code: string;
}

export interface LinkDiagnosisToGDRGParams {
  gdrgCode: string;
}

export interface LinkDiagnosisToGDRGRequest {
  diagnosisId: string;
  isPrimary?: boolean;
  mappedIcdCode?: string;
}

export interface UnlinkDiagnosisFromGDRGParams {
  gdrgCode: string;
  diagnosisId: string;
}

export interface LinkProcedureToGDRGParams {
  gdrgCode: string;
}

export interface LinkProcedureToGDRGRequest {
  procedureId: string;
  isPrimary?: boolean;
  mappedCode?: string;
}

export interface UnlinkProcedureFromGDRGParams {
  gdrgCode: string;
  procedureId: string;
}

export interface GDRGResponse {
  success: boolean;
  data?: any;
  message?: string;
  count?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}