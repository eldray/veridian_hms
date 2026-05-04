// src/store/medicalServicesStore.ts - FIXED VERSION

import { create } from 'zustand';
import {
  getDiagnoses as apiGetDiagnoses,
  getDiagnosis as apiGetDiagnosis,
  createDiagnosis as apiCreateDiagnosis,
  updateDiagnosis as apiUpdateDiagnosis,
  deleteDiagnosis as apiDeleteDiagnosis,
  searchDiagnoses as apiSearchDiagnoses,
  getDiagnosisStats as apiGetDiagnosisStats,
  bulkUpdateDiagnoses as apiBulkUpdateDiagnoses,

  getLabTestTemplates as apiGetLabTestTemplates,
  getLabTestTemplate as apiGetLabTestTemplate,
  createLabTestTemplate as apiCreateLabTestTemplate,
  updateLabTestTemplate as apiUpdateLabTestTemplate,
  deleteLabTestTemplate as apiDeleteLabTestTemplate,
  getLabTestCategories as apiGetLabTestCategories,
  getLabTestSubCategories as apiGetLabTestSubCategories,
  getSpecimenTypes as apiGetSpecimenTypes,
  bulkUpdateLabTestTemplates as apiBulkUpdateLabTestTemplates,

  getProcedureTemplates as apiGetProcedureTemplates,
  getProcedureTemplate as apiGetProcedureTemplate,
  createProcedureTemplate as apiCreateProcedureTemplate,
  updateProcedureTemplate as apiUpdateProcedureTemplate,
  deleteProcedureTemplate as apiDeleteProcedureTemplate,
  getProcedureCategories as apiGetProcedureCategories,
  getProcedureDepartments as apiGetProcedureDepartments,
  bulkUpdateProcedureTemplates as apiBulkUpdateProcedureTemplates,

  getScanTemplates as apiGetScanTemplates,
  getScanTemplate as apiGetScanTemplate,
  createScanTemplate as apiCreateScanTemplate,
  updateScanTemplate as apiUpdateScanTemplate,
  deleteScanTemplate as apiDeleteScanTemplate,
  getScanCategories as apiGetScanCategories,
  getScanBodyParts as apiGetScanBodyParts,
  getScanTypes as apiGetScanTypes,
  bulkUpdateScanTemplates as apiBulkUpdateScanTemplates,

  getServiceCatalog as apiGetServiceCatalog,
  getServiceCatalogItem as apiGetServiceCatalogItem,
  createServiceCatalogItem as apiCreateServiceCatalogItem,
  updateServiceCatalogItem as apiUpdateServiceCatalogItem,
  deleteServiceCatalogItem as apiDeleteServiceCatalogItem,
  getServiceMetadata as apiGetServiceMetadata,
  getNHISReadinessReport as apiGetNHISReadinessReport,
  getServiceByNHISCode as apiGetServiceByNHISCode,
  getServicesByCategory as apiGetServicesByCategory,
  checkServiceCoverage as apiCheckServiceCoverage,
  calculateServiceCost as apiCalculateServiceCost
} from '../api';
import type { Diagnosis, LabTestTemplate, ProcedureTemplate, ServiceCatalog, ScanTemplate, Pagination } from '../types';
import api from '../api/api';

interface MedicalServicesState {
  // Data collections
  diagnoses: Diagnosis[];
  labTestTemplates: LabTestTemplate[];
  procedureTemplates: ProcedureTemplate[];
  scanTemplates: ScanTemplate[];
  serviceCatalog: ServiceCatalog[];

  // Total counts (from pagination metadata)
  diagnosesTotalCount: number;
  labTestsTotalCount: number;
  proceduresTotalCount: number;
  scansTotalCount: number;

  // Metadata
  scanCategories: string[];
  scanBodyParts: string[];
  scanTypes: string[];
  serviceMetadata: any;
  diagnosisStats: any;

  // Current items
  currentDiagnosis: Diagnosis | null;
  currentLabTestTemplate: LabTestTemplate | null;
  currentProcedureTemplate: ProcedureTemplate | null;
  currentScanTemplate: ScanTemplate | null;
  currentServiceCatalogItem: ServiceCatalog | null;

  // Loading
  isLoading: boolean;
  isLoadingDiagnoses: boolean;
  isLoadingLabTests: boolean;
  isLoadingProcedures: boolean;
  isLoadingScans: boolean;

  // Pagination
  pagination: Pagination | null;

  // Errors
  errors: {
    diagnoses: string | null;
    labTests: string | null;
    procedures: string | null;
    scans: string | null;
    serviceCatalog: string | null;
  };

  // Diagnosis actions
  getDiagnoses: (filters?: any) => Promise<void>;
  getDiagnosis: (id: string) => Promise<void>;
  createDiagnosis: (data: any) => Promise<void>;
  updateDiagnosis: (id: string, data: any) => Promise<void>;
  deleteDiagnosis: (id: string) => Promise<void>;
  searchDiagnoses: (query: string) => Promise<Diagnosis[]>;
  getDiagnosisStats: () => Promise<void>;
  bulkUpdateDiagnoses: (data: any) => Promise<void>;

  // Lab Test Template actions
  getLabTestTemplates: (filters?: any) => Promise<void>;
  getLabTestTemplate: (id: string) => Promise<void>;
  createLabTestTemplate: (data: any) => Promise<void>;
  updateLabTestTemplate: (id: string, data: any) => Promise<void>;
  deleteLabTestTemplate: (id: string) => Promise<void>;
  getLabTestCategories: () => Promise<string[]>;
  getLabTestSubCategories: () => Promise<string[]>;
  getSpecimenTypes: () => Promise<string[]>;
  bulkUpdateLabTestTemplates: (data: any) => Promise<void>;

  // Procedure Template actions
  getProcedureTemplates: (filters?: any) => Promise<void>;
  getProcedureTemplate: (id: string) => Promise<void>;
  createProcedureTemplate: (data: any) => Promise<void>;
  updateProcedureTemplate: (id: string, data: any) => Promise<void>;
  deleteProcedureTemplate: (id: string) => Promise<void>;
  getProcedureCategories: () => Promise<string[]>;
  getProcedureDepartments: () => Promise<string[]>;
  bulkUpdateProcedureTemplates: (data: any) => Promise<void>;

  // Scan Template actions
  getScanTemplates: (filters?: any) => Promise<void>;
  getScanTemplate: (id: string) => Promise<void>;
  createScanTemplate: (data: any) => Promise<void>;
  updateScanTemplate: (id: string, data: any) => Promise<void>;
  deleteScanTemplate: (id: string) => Promise<void>;
  getScanCategories: () => Promise<string[]>;
  getScanBodyParts: () => Promise<string[]>;
  getScanTypes: () => Promise<string[]>;
  bulkUpdateScanTemplates: (data: any) => Promise<void>;

  // Service Catalog actions
  getServiceCatalog: (filters?: any) => Promise<void>;
  getServiceCatalogItem: (id: string) => Promise<void>;
  createServiceCatalogItem: (data: any) => Promise<void>;
  updateServiceCatalogItem: (id: string, data: any) => Promise<void>;
  deleteServiceCatalogItem: (id: string) => Promise<void>;
  getServiceMetadata: () => Promise<void>;
  getNHISReadinessReport: () => Promise<any>;
  getServiceByNHISCode: (nhisCode: string) => Promise<ServiceCatalog | null>;
  getServicesByCategory: (category: string) => Promise<ServiceCatalog[]>;
  checkServiceCoverage: (data: any) => Promise<any>;
  calculateServiceCost: (data: any) => Promise<any>;
  getServiceCatalogByType: (serviceType: string) => Promise<ServiceCatalog[]>;
  getServiceCategories: () => Promise<string[]>;
  getServiceTypes: () => Promise<string[]>;

  // Helper getters
  getDiagnosisById: (id: string) => Diagnosis | undefined;
  getLabTestTemplateById: (id: string) => LabTestTemplate | undefined;
  getProcedureTemplateById: (id: string) => ProcedureTemplate | undefined;
  getScanTemplateById: (id: string) => ScanTemplate | undefined;
  getServiceCatalogItemById: (id: string) => ServiceCatalog | undefined;

  // Utility
  clearCurrentItems: () => void;
  clearErrors: () => void;
}

export const useMedicalServicesStore = create<MedicalServicesState>((set, get) => ({
  // Initial state
  diagnoses: [],
  labTestTemplates: [],
  procedureTemplates: [],
  scanTemplates: [],
  serviceCatalog: [],
  diagnosesTotalCount: 0,
  labTestsTotalCount: 0,
  proceduresTotalCount: 0,
  scansTotalCount: 0,
  scanCategories: [],
  scanBodyParts: [],
  scanTypes: [],
  serviceMetadata: null,
  diagnosisStats: null,
  currentDiagnosis: null,
  currentLabTestTemplate: null,
  currentProcedureTemplate: null,
  currentScanTemplate: null,
  currentServiceCatalogItem: null,
  isLoading: false,
  isLoadingDiagnoses: false,
  isLoadingLabTests: false,
  isLoadingProcedures: false,
  isLoadingScans: false,
  pagination: null,
  errors: {
    diagnoses: null,
    labTests: null,
    procedures: null,
    scans: null,
    serviceCatalog: null,
  },

  // === DIAGNOSIS ACTIONS ===
  getDiagnoses: async (filters = {}) => {
    set({ isLoadingDiagnoses: true, errors: { ...get().errors, diagnoses: null } });
    try {
      // ✅ Use high limit to get all records
      const apiFilters = { ...filters, limit: 10000, page: 1 }; 
      const response = await apiGetDiagnoses(apiFilters);
      
      let diagnosesArray: Diagnosis[] = [];
      let totalCount = 0;
      
      if (response.data && Array.isArray(response.data)) {
        diagnosesArray = response.data;
        totalCount = response.pagination?.total || diagnosesArray.length;
      } else if (Array.isArray(response)) {
        diagnosesArray = response;
        totalCount = diagnosesArray.length;
      } else if (response.success && Array.isArray(response.data)) {
        diagnosesArray = response.data;
        totalCount = response.pagination?.total || diagnosesArray.length;
      }
      
      console.log(`📊 Diagnoses loaded: ${diagnosesArray.length} records (Total in DB: ${totalCount})`);
      
      set({ 
        diagnoses: diagnosesArray,
        diagnosesTotalCount: totalCount,
        isLoadingDiagnoses: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch diagnoses:', error);
      set({
        errors: { ...get().errors, diagnoses: error.message },
        isLoadingDiagnoses: false
      });
      throw error;
    }
  },

  getDiagnosis: async (id: string) => {
    set({ isLoading: true });
    try {
      const diagnosis = await apiGetDiagnosis(id);
      set({ currentDiagnosis: diagnosis, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch diagnosis:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createDiagnosis: async (data: any) => {
    set({ isLoading: true });
    try {
      const newDiagnosis = await apiCreateDiagnosis(data);
      set({
        diagnoses: [newDiagnosis, ...get().diagnoses],
        diagnosesTotalCount: get().diagnosesTotalCount + 1,
        currentDiagnosis: newDiagnosis,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to create diagnosis:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateDiagnosis: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedDiagnosis = await apiUpdateDiagnosis(id, data);
      set({
        diagnoses: get().diagnoses.map(d => d.id === id ? updatedDiagnosis : d),
        currentDiagnosis: updatedDiagnosis,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to update diagnosis:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteDiagnosis: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteDiagnosis(id);
      const diagnoses = get().diagnoses.filter(d => d.id !== id);
      set({
        diagnoses,
        diagnosesTotalCount: Math.max(0, get().diagnosesTotalCount - 1),
        currentDiagnosis: get().currentDiagnosis?.id === id ? null : get().currentDiagnosis,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to delete diagnosis:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  searchDiagnoses: async (query: string) => {
    set({ isLoadingDiagnoses: true });
    try {
      const results = await apiSearchDiagnoses(query);
      set({ isLoadingDiagnoses: false });
      return results;
    } catch (error: any) {
      set({ isLoadingDiagnoses: false });
      throw error;
    }
  },

  getDiagnosisStats: async () => {
    set({ isLoading: true });
    try {
      const stats = await apiGetDiagnosisStats();
      set({ diagnosisStats: stats, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  bulkUpdateDiagnoses: async (data: any) => {
    set({ isLoading: true });
    try {
      await apiBulkUpdateDiagnoses(data);
      await get().getDiagnoses();
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  // === LAB TEST TEMPLATES ===
  getLabTestTemplates: async (filters = {}) => {
    set({ isLoadingLabTests: true, errors: { ...get().errors, labTests: null } });
    try {
      const apiFilters = { ...filters, limit: 10000, page: 1 };
      const response = await apiGetLabTestTemplates(apiFilters);
      
      let labTestsArray: LabTestTemplate[] = [];
      let totalCount = 0;
      
      if (response.data && Array.isArray(response.data)) {
        labTestsArray = response.data;
        totalCount = response.pagination?.total || labTestsArray.length;
      } else if (Array.isArray(response)) {
        labTestsArray = response;
        totalCount = labTestsArray.length;
      }
      
      console.log(`📊 Lab tests loaded: ${labTestsArray.length} records (Total in DB: ${totalCount})`);
      
      set({ 
        labTestTemplates: labTestsArray,
        labTestsTotalCount: totalCount,
        isLoadingLabTests: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch lab test templates:', error);
      set({
        errors: { ...get().errors, labTests: error.message },
        isLoadingLabTests: false
      });
      throw error;
    }
  },

  getLabTestTemplate: async (id: string) => {
    set({ isLoading: true });
    try {
      const template = await apiGetLabTestTemplate(id);
      set({ currentLabTestTemplate: template, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch lab test template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createLabTestTemplate: async (data: any) => {
    set({ isLoading: true });
    try {
      const newTemplate = await apiCreateLabTestTemplate(data);
      set({
        labTestTemplates: [newTemplate, ...get().labTestTemplates],
        labTestsTotalCount: get().labTestsTotalCount + 1,
        currentLabTestTemplate: newTemplate,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to create lab test template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateLabTestTemplate: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedTemplate = await apiUpdateLabTestTemplate(id, data);
      set({
        labTestTemplates: get().labTestTemplates.map(t => t.id === id ? updatedTemplate : t),
        currentLabTestTemplate: updatedTemplate,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to update lab test template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteLabTestTemplate: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteLabTestTemplate(id);
      set({
        labTestTemplates: get().labTestTemplates.filter(t => t.id !== id),
        labTestsTotalCount: Math.max(0, get().labTestsTotalCount - 1),
        currentLabTestTemplate: get().currentLabTestTemplate?.id === id ? null : get().currentLabTestTemplate,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to delete lab test template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getLabTestCategories: async () => {
    try {
      const categories = await apiGetLabTestCategories();
      return categories;
    } catch (error: any) {
      throw error;
    }
  },

  getLabTestSubCategories: async () => {
    try {
      const subCategories = await apiGetLabTestSubCategories();
      return subCategories;
    } catch (error: any) {
      throw error;
    }
  },

  getSpecimenTypes: async () => {
    try {
      const specimenTypes = await apiGetSpecimenTypes();
      return specimenTypes;
    } catch (error: any) {
      throw error;
    }
  },

  bulkUpdateLabTestTemplates: async (data: any) => {
    set({ isLoading: true });
    try {
      await apiBulkUpdateLabTestTemplates(data);
      await get().getLabTestTemplates();
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  // === PROCEDURE TEMPLATES ===
  getProcedureTemplates: async (filters = {}) => {
    set({ isLoadingProcedures: true, errors: { ...get().errors, procedures: null } });
    try {
      const apiFilters = { ...filters, limit: 10000, page: 1 };
      const response = await apiGetProcedureTemplates(apiFilters);
      
      let proceduresArray: ProcedureTemplate[] = [];
      let totalCount = 0;
      
      if (response.data && Array.isArray(response.data)) {
        proceduresArray = response.data;
        totalCount = response.pagination?.total || proceduresArray.length;
      } else if (Array.isArray(response)) {
        proceduresArray = response;
        totalCount = proceduresArray.length;
      }
      
      console.log(`📊 Procedures loaded: ${proceduresArray.length} records (Total in DB: ${totalCount})`);
      
      set({ 
        procedureTemplates: proceduresArray,
        proceduresTotalCount: totalCount,
        isLoadingProcedures: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch procedure templates:', error);
      set({
        errors: { ...get().errors, procedures: error.message },
        isLoadingProcedures: false
      });
      throw error;
    }
  },

  getProcedureTemplate: async (id: string) => {
    set({ isLoading: true });
    try {
      const template = await apiGetProcedureTemplate(id);
      set({ currentProcedureTemplate: template, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch procedure template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createProcedureTemplate: async (data: any) => {
    set({ isLoading: true });
    try {
      const newTemplate = await apiCreateProcedureTemplate(data);
      set({
        procedureTemplates: [newTemplate, ...get().procedureTemplates],
        proceduresTotalCount: get().proceduresTotalCount + 1,
        currentProcedureTemplate: newTemplate,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to create procedure template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateProcedureTemplate: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedTemplate = await apiUpdateProcedureTemplate(id, data);
      set({
        procedureTemplates: get().procedureTemplates.map(t => t.id === id ? updatedTemplate : t),
        currentProcedureTemplate: updatedTemplate,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to update procedure template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteProcedureTemplate: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteProcedureTemplate(id);
      set({
        procedureTemplates: get().procedureTemplates.filter(t => t.id !== id),
        proceduresTotalCount: Math.max(0, get().proceduresTotalCount - 1),
        currentProcedureTemplate: get().currentProcedureTemplate?.id === id ? null : get().currentProcedureTemplate,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to delete procedure template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getProcedureCategories: async () => {
    try {
      const categories = await apiGetProcedureCategories();
      return categories;
    } catch (error: any) {
      throw error;
    }
  },

  getProcedureDepartments: async () => {
    try {
      const departments = await apiGetProcedureDepartments();
      return departments;
    } catch (error: any) {
      throw error;
    }
  },

  bulkUpdateProcedureTemplates: async (data: any) => {
    set({ isLoading: true });
    try {
      await apiBulkUpdateProcedureTemplates(data);
      await get().getProcedureTemplates();
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  // === SCAN TEMPLATES ===
  getScanTemplates: async (filters = {}) => {
    set({ isLoadingScans: true, errors: { ...get().errors, scans: null } });
    try {
      const apiFilters = { ...filters, limit: 10000, page: 1 };
      const response = await apiGetScanTemplates(apiFilters);
      
      let scansArray: ScanTemplate[] = [];
      let totalCount = 0;
      
      if (response.data && Array.isArray(response.data)) {
        scansArray = response.data;
        totalCount = response.pagination?.total || scansArray.length;
      } else if (Array.isArray(response)) {
        scansArray = response;
        totalCount = scansArray.length;
      }
      
      console.log(`📊 Scans loaded: ${scansArray.length} records (Total in DB: ${totalCount})`);
      
      set({ 
        scanTemplates: scansArray,
        scansTotalCount: totalCount,
        isLoadingScans: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch scan templates:', error);
      set({
        errors: { ...get().errors, scans: error.message },
        isLoadingScans: false
      });
      throw error;
    }
  },

  getScanTemplate: async (id: string) => {
    set({ isLoading: true });
    try {
      const template = await apiGetScanTemplate(id);
      set({ currentScanTemplate: template, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  createScanTemplate: async (data: any) => {
    set({ isLoading: true });
    try {
      const newTemplate = await apiCreateScanTemplate(data);
      set({
        scanTemplates: [newTemplate, ...get().scanTemplates],
        scansTotalCount: get().scansTotalCount + 1,
        currentScanTemplate: newTemplate,
        isLoading: false
      });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateScanTemplate: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedTemplate = await apiUpdateScanTemplate(id, data);
      set({
        scanTemplates: get().scanTemplates.map(t => t.id === id ? updatedTemplate : t),
        currentScanTemplate: updatedTemplate,
        isLoading: false
      });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteScanTemplate: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteScanTemplate(id);
      set({
        scanTemplates: get().scanTemplates.filter(t => t.id !== id),
        scansTotalCount: Math.max(0, get().scansTotalCount - 1),
        currentScanTemplate: get().currentScanTemplate?.id === id ? null : get().currentScanTemplate,
        isLoading: false
      });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  getScanCategories: async () => {
    try {
      const categories = await apiGetScanCategories();
      set({ scanCategories: categories });
      return categories;
    } catch (error: any) {
      set({ errors: { ...get().errors, scans: error.message } });
      throw error;
    }
  },

  getScanBodyParts: async () => {
    try {
      const bodyParts = await apiGetScanBodyParts();
      set({ scanBodyParts: bodyParts });
      return bodyParts;
    } catch (error: any) {
      set({ errors: { ...get().errors, scans: error.message } });
      throw error;
    }
  },

  getScanTypes: async () => {
    try {
      const scanTypes = await apiGetScanTypes();
      set({ scanTypes });
      return scanTypes;
    } catch (error: any) {
      throw error;
    }
  },

  bulkUpdateScanTemplates: async (data: any) => {
    set({ isLoading: true });
    try {
      await apiBulkUpdateScanTemplates(data);
      await get().getScanTemplates();
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  // === SERVICE CATALOG ===
  getServiceCatalog: async (filters = {}) => {
    set({ isLoading: true, errors: { ...get().errors, serviceCatalog: null } });
    try {
      const response = await apiGetServiceCatalog({ ...filters, limit: 5000 });
      
      console.log('📦 Service Catalog API Response:', response);
      
      let services: ServiceCatalog[] = [];
      let pagination = null;
      
      if (response?.success && Array.isArray(response.data)) {
        services = response.data;
        pagination = response.pagination;
      } else if (Array.isArray(response)) {
        services = response;
      } else if (response?.data && Array.isArray(response.data)) {
        services = response.data;
        pagination = response.pagination;
      } else if (response?.services && Array.isArray(response.services)) {
        services = response.services;
      } else {
        services = [];
      }
      
      console.log(`✅ Loaded ${services.length} services`);
      
      set({
        serviceCatalog: services,
        pagination: pagination,
        isLoading: false
      });
      
      return { services, pagination };
    } catch (error: any) {
      console.error('❌ Failed to fetch service catalog:', error);
      set({
        errors: { ...get().errors, serviceCatalog: error.message },
        isLoading: false
      });
      throw error;
    }
  },

    getServiceCatalogs: async (filters = {}) => {
      set({ isLoading: true, errors: { ...get().errors, serviceCatalog: null } });
      try {
        // ✅ IMPORTANT: Ensure limit is passed correctly
        const apiFilters = { 
          ...filters, 
          limit: filters.limit || 5000,  // Use provided limit or default to 5000
          page: filters.page || 1
        };
        
        console.log('📡 Fetching service catalog with filters:', apiFilters);
        
    const response = await apiGetServiceCatalog(apiFilters);
    
    console.log('📦 Service Catalog API Response:', response);
    
    let services: ServiceCatalog[] = [];
    let pagination = null;
    
    // Handle different response formats
    if (response?.success && Array.isArray(response.data)) {
      services = response.data;
      pagination = response.pagination;
    } else if (Array.isArray(response)) {
      services = response;
    } else if (response?.data && Array.isArray(response.data)) {
      services = response.data;
      pagination = response.pagination;
    } else if (response?.services && Array.isArray(response.services)) {
      services = response.services;
    } else {
      services = [];
    }
    
    console.log(`✅ Loaded ${services.length} services (Total in DB: ${pagination?.total || services.length})`);
    
    set({
      serviceCatalog: services,
      pagination: pagination,
      isLoading: false
    });
    
    return { services, pagination };
  } catch (error: any) {
    console.error('❌ Failed to fetch service catalog:', error);
    set({
      errors: { ...get().errors, serviceCatalog: error.message },
      isLoading: false
    });
    throw error;
  }
},

  createServiceCatalogItem: async (data: any) => {
    set({ isLoading: true });
    try {
      if (!data.name || !data.code) {
        throw new Error('Service name and code are required');
      }
      
      const newItem = await apiCreateServiceCatalogItem(data);
      
      set({
        serviceCatalog: [newItem, ...get().serviceCatalog],
        currentServiceCatalogItem: newItem,
        isLoading: false
      });
      
      return newItem;
    } catch (error: any) {
      console.error('Failed to create service catalog item:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateServiceCatalogItem: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Valid Service ID is required for update');
      }
      
      const updatedItem = await apiUpdateServiceCatalogItem(id, data);
      
      set({
        serviceCatalog: get().serviceCatalog.map(item => item.id === id ? updatedItem : item),
        currentServiceCatalogItem: updatedItem,
        isLoading: false
      });
      
      return updatedItem;
    } catch (error: any) {
      console.error('Failed to update service catalog item:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteServiceCatalogItem: async (id: string) => {
    set({ isLoading: true });
    try {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Valid Service ID is required for deletion');
      }
      
      await apiDeleteServiceCatalogItem(id);
      
      set({
        serviceCatalog: get().serviceCatalog.filter(item => item.id !== id),
        currentServiceCatalogItem: get().currentServiceCatalogItem?.id === id ? null : get().currentServiceCatalogItem,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to delete service catalog item:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getServiceMetadata: async () => {
    set({ isLoading: true });
    try {
      const metadata = await apiGetServiceMetadata();
      set({ serviceMetadata: metadata, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch service metadata:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getNHISReadinessReport: async () => {
    set({ isLoading: true });
    try {
      const report = await apiGetNHISReadinessReport();
      set({ isLoading: false });
      return report;
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  getServiceByNHISCode: async (nhisCode: string) => {
    try {
      const service = await apiGetServiceByNHISCode(nhisCode);
      return service;
    } catch (error: any) {
      console.error('Failed to fetch service by NHIS code:', error);
      return null;
    }
  },

  getServicesByCategory: async (category: string) => {
    try {
      const services = await apiGetServicesByCategory(category);
      return services;
    } catch (error: any) {
      console.error('Failed to fetch services by category:', error);
      return [];
    }
  },

  checkServiceCoverage: async (data: any) => {
    set({ isLoading: true });
    try {
      const coverage = await apiCheckServiceCoverage(data);
      set({ isLoading: false });
      return coverage;
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  calculateServiceCost: async (data: any) => {
    set({ isLoading: true });
    try {
      const cost = await apiCalculateServiceCost(data);
      set({ isLoading: false });
      return cost;
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },


  // FIXED VERSION:
  getServiceCatalogByType: async (serviceType: string) => {
    set({ isLoading: true });
    try {
      // Use the imported getServiceCatalog function instead
      const response = await getServiceCatalog({ 
        serviceType: serviceType, 
        isActive: true, 
        limit: 10000 
      });
      const services = response.services || response.data || [];
      set({ isLoading: false });
      return services;
    } catch (error) {
      console.error('Error fetching services by type:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getServiceCategories: async () => {
    try {
      // Use the imported getServiceMetadata function
      const metadata = await getServiceMetadata();
      return metadata?.categories || [];
    } catch (error) {
      console.error('Error fetching service categories:', error);
      return [];
    }
  },

  getServiceTypes: async () => {
    try {
      // Use the imported getServiceMetadata function
      const metadata = await getServiceMetadata();
      return metadata?.serviceTypes || [];
    } catch (error) {
      console.error('Error fetching service types:', error);
      return [];
    }
  },

  // === HELPERS ===
  getDiagnosisById: (id: string) => {
    return get().diagnoses.find(d => d.id === id);
  },

  getLabTestTemplateById: (id: string) => {
    return get().labTestTemplates.find(t => t.id === id);
  },

  getProcedureTemplateById: (id: string) => {
    return get().procedureTemplates.find(t => t.id === id);
  },

  getScanTemplateById: (id: string) => {
    return get().scanTemplates.find(t => t.id === id);
  },

  getServiceCatalogItemById: (id: string) => {
    return get().serviceCatalog.find(item => item.id === id);
  },

  // === UTILS ===
  clearCurrentItems: () => {
    set({
      currentDiagnosis: null,
      currentLabTestTemplate: null,
      currentProcedureTemplate: null,
      currentScanTemplate: null,
      currentServiceCatalogItem: null
    });
  },

  clearErrors: () => {
    set({
      errors: {
        diagnoses: null,
        labTests: null,
        procedures: null,
        scans: null,
        serviceCatalog: null,
      }
    });
  },
}));