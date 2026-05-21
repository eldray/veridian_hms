// modules/procedure/ProcedureTypes.ts
import { ServiceType, ServiceCategory, ProcedureCategory } from '@prisma/client';

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

export interface CreateProcedureTemplateRequest {
  name: string;
  code: string;
  procedureCode?: string;  // ✅ ADDED - schema field
  description?: string;
  serviceCategory?: ServiceCategory;
  category?: ProcedureCategory;  // ✅ FIXED - use schema enum
  department?: string;  // ✅ ADDED - schema field
  nhisServiceCode?: string;
  tariffCode?: string;
  isNHISCovered?: boolean;
  nhisRequiresAuth?: boolean;  // ✅ ADDED - schema field
  isPrivateInsuranceExempted?: boolean;  // ✅ ADDED - schema field
  privateInsRequiresAuth?: boolean;  // ✅ ADDED - schema field
  requiresClinicalNotes?: boolean;  // ✅ ADDED - schema field
  duration?: number;
  requiresAssistant?: boolean;
  anesthesiaType?: string;
  anesthesiaNotes?: string;
  intraOperativeNotes?: string;
  postOperativeNotes?: string;
  bloodLoss?: number;
  complications?: string;
  outcome?: string;
  cost?: number;
  // Pricing fields
  cashPrice: number;
  nhisPrice?: number;
  insurancePrice: number;
  vatRate?: number;
  isTaxable?: boolean;
  isActive?: boolean;
  unit?: string;
  // GDRG Linking - ✅ ADDED
  gdrgTariffId?: string;
  // Ward linking - ✅ ADDED
  wardId?: string;
}

export interface UpdateProcedureTemplateRequest {
  id?: string;
  name?: string;
  code?: string;
  procedureCode?: string;
  description?: string;
  serviceCategory?: ServiceCategory;
  category?: ProcedureCategory;
  department?: string;
  nhisServiceCode?: string;
  tariffCode?: string;
  isNHISCovered?: boolean;
  nhisRequiresAuth?: boolean;
  isPrivateInsuranceExempted?: boolean;
  privateInsRequiresAuth?: boolean;
  requiresClinicalNotes?: boolean;
  duration?: number;
  requiresAssistant?: boolean;
  anesthesiaType?: string;
  anesthesiaNotes?: string;
  intraOperativeNotes?: string;
  postOperativeNotes?: string;
  bloodLoss?: number;
  complications?: string;
  outcome?: string;
  cost?: number;
  cashPrice?: number;
  nhisPrice?: number;
  insurancePrice?: number;
  vatRate?: number;
  isTaxable?: boolean;
  isActive?: boolean;
  unit?: string;
  gdrgTariffId?: string;
  wardId?: string;
}

export interface ProcedureFilters {
  category?: ProcedureCategory;
  department?: string;
  isActive?: boolean;
  isNHISCovered?: boolean;
  hasGDRG?: boolean;  // ✅ ADDED - filter by GDRG linked
  page?: number;
  limit?: number;
}

// ============================================
// RESPONSE DTOs
// ============================================

export interface ProcedureTemplateResponse {
  id: string;
  name: string;
  code: string;
  procedureCode: string | null;
  description: string | null;
  serviceCategory: ServiceCategory;
  category: ProcedureCategory | null;
  department: string | null;
  nhisServiceCode: string | null;
  tariffCode: string | null;
  isNHISCovered: boolean;
  nhisRequiresAuth: boolean;
  isPrivateInsuranceExempted: boolean;
  privateInsRequiresAuth: boolean;
  requiresClinicalNotes: boolean;
  duration: number | null;
  isActive: boolean;
  unit: string;
  // Relations
  pricing?: {
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    vatRate: number;
    isTaxable: boolean;
  };
  gdrgTariff?: {
    id: string;
    gdrgCode: string;
    description: string;
    nhiaTariff: number;
  } | null;
  ward?: {
    id: string;
    wardName: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}