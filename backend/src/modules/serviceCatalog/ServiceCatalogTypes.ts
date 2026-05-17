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
  vatRate: number;
  isTaxable: boolean;
  isActive: boolean;
  effectiveDate: Date;
}

export interface ServiceCatalogCreate {
  name: string;
  code: string;
  description?: string;
  serviceType: ServiceType;
  serviceCategory: ServiceCategory;
  unit?: string;
  isActive: boolean;
  nhisServiceCode?: string;
  pricing?: PricingInfo;
  diagnosisId?: string;
}

export interface ServiceCatalogUpdate {
  name?: string;
  code?: string;
  description?: string;
  serviceType?: ServiceType;
  serviceCategory?: ServiceCategory;
  unit?: string;
  isActive?: boolean;
  nhisServiceCode?: string;
  pricing?: Partial<PricingInfo>;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  serviceType: ServiceType;
  serviceCategory: ServiceCategory;
  unit: string | null;
  isActive: boolean;
  nhisServiceCode: string | null;
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
}

export interface ServiceCatalogStats {
  totalServices: number;
  activeServices: number;
  inactiveServices: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
}
