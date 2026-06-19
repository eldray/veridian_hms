import { ServiceCategory, LabCategory, SpecimenType } from '@prisma/client';

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
  
  // ✅ NEW: LabTestTemplate specific fields
  category?: LabCategory; 
  specimenType?: SpecimenType; 
  preparationInstructions?: string;
  turnaroundTime?: string;
  normalRange?: string;
  containerType?: string;
  resultTemplate?: any;
  
  // ServiceCatalog specific fields
  isActive?: boolean;
  unit?: string;
  
  // ✅ UPDATED: ServicePricing fields (Added corporatePrice)
  cashPrice: number;
  nhisPrice?: number;
  insurancePrice: number;
  corporatePrice?: number; 
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
  labTestTemplateId: string | null; // ✅ NEW: Link to template
  createdAt: Date;
  updatedAt: Date;
  
  // ✅ NEW: Included LabTestTemplate data
  labTestTemplate?: {
    id: string;
    name: string;
    investigationCode: string;
    category: string;
    specimenType: string;
  } | null; 

  pricing: {
    id: string;
    serviceCatalogId: string;
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    corporatePrice: number; // ✅ NEW
    vatRate: number;
    isTaxable: boolean;
    effectiveDate: Date;
    expiryDate: Date | null; // ✅ NEW: From schema
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  
  labTests?: Array<{
    id: string;
    status: string;
  }>;
}

// ✅ UPDATED: Keys changed from currentPage/pageSize to page/limit 
// to match BaseController.paginated() expectations
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetLabTestsResponse {
  success: boolean;
  data: LabTestResponse[];
  pagination: PaginationInfo;
}