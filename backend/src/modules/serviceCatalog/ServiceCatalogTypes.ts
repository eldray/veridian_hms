/**
 * Service Catalog Types
 * TypeScript types and interfaces for service catalog operations
 * ALIGNED: Matches Prisma schema (1-to-N Historical Pricing) & Refactored Service Layer
 */

import { ServiceType, ServiceCategory } from '@prisma/client';

// ============================================
// FILTERS & QUERY PARAMS
// ============================================

export interface ServiceCatalogFilters {
  serviceType?: ServiceType;
  category?: ServiceCategory;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// ============================================
// PRICING INTERFACE (Used in Responses)
// ============================================

export interface PricingInfo {
  id: string; // ✅ ADDED: Needed for historical tracking
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  corporatePrice: number;
  vatRate: number;
  isTaxable: boolean;
  isActive: boolean;
  effectiveDate: Date;
  expiryDate?: Date;
}

// ============================================
// DTOs (Flattened to match REST API payload)
// ============================================

export interface ServiceCatalogCreate {
  name: string;
  code: string;
  description?: string;
  serviceType: ServiceType;
  serviceCategory?: ServiceCategory;
  subType?: string;
  unit?: string;
  isActive?: boolean;
  isPending?: boolean;
  
  // NHIS & Insurance Config
  nhisServiceCode?: string;
  isNHISCovered?: boolean;
  nhisCoverageType?: string;
  nhisRequiresAuth?: boolean;
  privateInsRequiresAuth?: boolean;
  isPrivateInsuranceExempted?: boolean;
  
  // Clinical Config
  requiresClinicalNotes?: boolean;
  metadata?: any;
  tariffCode?: string;

  // ✅ FLATTENED PRICING (Matches req.body structure in Service)
  cashPrice: number;
  nhisPrice?: number;
  insurancePrice?: number;
  corporatePrice?: number;
  vatRate?: number;
  isTaxable?: boolean;

  // Relation IDs
  diagnosisId?: string;
  labTestTemplateId?: string;
  procedureTemplateId?: string;
  stockItemId?: string;
  wardId?: string;
  scanTemplateId?: string;
  consultationTypeId?: string;
  gdrgTariffId?: string;
}

export interface ServiceCatalogUpdate {
  name?: string;
  code?: string;
  description?: string;
  serviceType?: ServiceType;
  serviceCategory?: ServiceCategory;
  subType?: string;
  unit?: string;
  isActive?: boolean;
  
  nhisServiceCode?: string;
  isNHISCovered?: boolean;
  nhisCoverageType?: string;
  nhisRequiresAuth?: boolean;
  privateInsRequiresAuth?: boolean;
  isPrivateInsuranceExempted?: boolean;
  requiresClinicalNotes?: boolean;
  metadata?: any;
  tariffCode?: string;

  // ✅ FLATTENED PRICING (Partial for updates)
  cashPrice?: number;
  nhisPrice?: number;
  insurancePrice?: number;
  corporatePrice?: number;
  vatRate?: number;
  isTaxable?: boolean;

  // Relation IDs (Nullable to allow unlinking)
  diagnosisId?: string | null;
  labTestTemplateId?: string | null;
  procedureTemplateId?: string | null;
  stockItemId?: string | null;
  wardId?: string | null;
  scanTemplateId?: string | null;
  consultationTypeId?: string | null;
  gdrgTariffId?: string | null;
}

// ============================================
// RESPONSE INTERFACES
// ============================================

export interface ServiceCatalogItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  serviceType: ServiceType;
  serviceCategory: ServiceCategory;
  subType: string | null;
  unit: string | null;
  isActive: boolean;
  isPending: boolean;
  
  nhisServiceCode: string | null;
  isNHISCovered: boolean;
  nhisCoverageType: string;
  nhisRequiresAuth: boolean;
  privateInsRequiresAuth: boolean;
  isPrivateInsuranceExempted: boolean;
  requiresClinicalNotes: boolean;
  metadata: any | null;
  tariffCode: string | null;
  
  createdAt: Date;
  updatedAt: Date;

  // ✅ FIXED: pricing is flattened to a single object by the Service layer
  pricing: PricingInfo | null;

  // ✅ FIXED: These are 1-to-1 relations, NOT arrays
  Diagnosis: any | null;
  LabTestTemplate: any | null;
  ProcedureTemplate: any | null;
  ScanTemplate: any | null;
  StockItem: any | null;
  Ward: any | null;
  ConsultationType: any | null;
  User: any | null;
  
  _count: {
    ServiceRendered: number;
    BillLineItem: number;
    labTests: number;
    scans: number;
    procedures: number;
    medications: number;
  };
}

export interface ServiceCatalogResponse {
  success: boolean;
  data: ServiceCatalogItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message?: string;
}

export interface ServiceCatalogStats {
  totalServices: number;
  activeServices: number;
  inactiveServices: number;
  nhisReady: number;
  withPricing: number;
  missingPricing: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface CostCalculationResponse {
  service: { id: string; name: string; code: string; };
  quantity: number;
  paymentMode: string;
  totalAmount: number;
  coverageAmount: number;
  patientAmount: number;
  vatAmount: number;
  breakdown: {
    unitPrice: number;
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    corporatePrice: number;
    vatRate: number;
    isTaxable: boolean;
  };
}

export interface CoverageCheckResponse {
  serviceId: string;
  serviceName: string;
  paymentMode: string;
  price: number;
  isCovered: boolean;
  coverageAmount: number;
  patientPayable: number;
  allPrices: {
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    corporatePrice: number;
  };
  requiresAuthorization: boolean;
}