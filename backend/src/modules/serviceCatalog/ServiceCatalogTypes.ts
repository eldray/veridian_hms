/**
 * Service Catalog Types
 * TypeScript types and interfaces for service catalog operations
 */

import { ServiceType, ServiceCategory } from '@prisma/client';

export interface ServiceCatalogFilters {
  serviceType?: ServiceType;
  category?: ServiceCategory;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PricingInfo {
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  corporatePrice: number;  // ✅ ADDED
  vatRate: number;
  isTaxable: boolean;
  isActive: boolean;
  effectiveDate: Date;
  expiryDate?: Date;       // ✅ ADDED
}

export interface ServiceCatalogCreate {
  name: string;
  code: string;
  description?: string;
  serviceType: ServiceType;
  serviceCategory: ServiceCategory;
  subType?: string;
  unit?: string;
  isActive?: boolean;
  isPending?: boolean;
  nhisServiceCode?: string;
  isNHISCovered?: boolean;
  nhisCoverageType?: string;
  nhisRequiresAuth?: boolean;
  privateInsRequiresAuth?: boolean;
  isPrivateInsuranceExempted?: boolean;
  requiresClinicalNotes?: boolean;
  metadata?: any;
  tariffCode?: string;
  pricing?: {
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    corporatePrice: number;  // ✅ ADDED
    vatRate: number;
    isTaxable: boolean;
  };
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
  pricing?: Partial<{
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    corporatePrice: number;  // ✅ ADDED
    vatRate: number;
    isTaxable: boolean;
  }>;
  diagnosisId?: string | null;
  labTestTemplateId?: string | null;
  procedureTemplateId?: string | null;
  stockItemId?: string | null;
  wardId?: string | null;
  scanTemplateId?: string | null;
  consultationTypeId?: string | null;
  gdrgTariffId?: string | null;
}

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
  pricing: PricingInfo | null;
  Diagnosis: any | null;
  LabTestTemplate: any[];
  ProcedureTemplate: any[];
  ScanTemplate: any[];
  StockItem: any[];
  Ward: any[];
  ConsultationType: any[];
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
  service: {
    id: string;
    name: string;
    code: string;
  };
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
    corporatePrice: number;  // ✅ ADDED
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
    corporatePrice: number;  // ✅ ADDED
  };
  requiresAuthorization: boolean;
}