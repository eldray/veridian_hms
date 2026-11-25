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

// ✅ UPDATED: Changed 'pages' to 'totalPages' to match BaseController.paginated()
export interface GDRGResponse {
  success: boolean;
  data?: any;
  message?: string;
  count?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number; 
  };
}