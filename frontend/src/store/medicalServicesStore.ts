// src/store/medicalServicesStore.ts - UPDATED WITH ALL API FUNCTIONS
import { create } from 'zustand';
import {
  getDiagnoses as apiGetDiagnoses,
  getDiagnosis as apiGetDiagnosis,
  createDiagnosis as apiCreateDiagnosis,
  updateDiagnosis as apiUpdateDiagnosis,
  deleteDiagnosis as apiDeleteDiagnosis,
  // ✅ ADDED MISSING DIAGNOSIS FUNCTIONS
  searchDiagnoses as apiSearchDiagnoses,
  getDiagnosisStats as apiGetDiagnosisStats,
  getDiagnosisCategories as apiGetDiagnosisCategories,
  getDiagnosisVariants as apiGetDiagnosisVariants,
  bulkUpdateDiagnoses as apiBulkUpdateDiagnoses,

  getLabTestTemplates as apiGetLabTestTemplates,
  getLabTestTemplate as apiGetLabTestTemplate,
  createLabTestTemplate as apiCreateLabTestTemplate,
  updateLabTestTemplate as apiUpdateLabTestTemplate,
  deleteLabTestTemplate as apiDeleteLabTestTemplate,
  // ✅ ADDED MISSING LAB TEST FUNCTIONS
  getLabTestCategories as apiGetLabTestCategories,
  getLabTestSubCategories as apiGetLabTestSubCategories,
  getSpecimenTypes as apiGetSpecimenTypes,
  bulkUpdateLabTestTemplates as apiBulkUpdateLabTestTemplates,

  getProcedureTemplates as apiGetProcedureTemplates,
  getProcedureTemplate as apiGetProcedureTemplate,
  createProcedureTemplate as apiCreateProcedureTemplate,
  updateProcedureTemplate as apiUpdateProcedureTemplate,
  deleteProcedureTemplate as apiDeleteProcedureTemplate,
  // ✅ ADDED MISSING PROCEDURE FUNCTIONS
  getProcedureCategories as apiGetProcedureCategories,
  getProcedureDepartments as apiGetProcedureDepartments,
  bulkUpdateProcedureTemplates as apiBulkUpdateProcedureTemplates,

  // ✅ FIXED SCAN IMPORTS
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
  // ✅ ADDED MISSING SERVICE CATALOG FUNCTIONS
  getNHISReadinessReport as apiGetNHISReadinessReport,
  getServiceByNHISCode as apiGetServiceByNHISCode,
  getServicesByCategory as apiGetServicesByCategory,
  checkServiceCoverage as apiCheckServiceCoverage,
  calculateServiceCost as apiCalculateServiceCost
} from '../api';
import { useGDRGTariffStore } from './gdrgTariffStore';
import type { Diagnosis, LabTestTemplate, ProcedureTemplate, ServiceCatalog, ScanTemplate, Pagination } from '../types';

interface MedicalServicesState {
  // Data collections
  diagnoses: Diagnosis[];
  labTestTemplates: LabTestTemplate[];
  procedureTemplates: ProcedureTemplate[];
  scanTemplates: ScanTemplate[];
  serviceCatalog: ServiceCatalog[];

  // Metadata
  scanCategories: string[];
  scanBodyParts: string[];
  scanTypes: string[]; // ✅ ADDED
  serviceMetadata: any;
  diagnosisStats: any; // ✅ ADDED
  diagnosisCategories: string[]; // ✅ ADDED

  // Current items
  currentDiagnosis: Diagnosis | null;
  currentLabTestTemplate: LabTestTemplate | null;
  currentProcedureTemplate: ProcedureTemplate | null;
  currentScanTemplate: ScanTemplate | null; // ✅ ADDED
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

  // ✅ ADDED MISSING DIAGNOSIS FUNCTIONS
  searchDiagnoses: (query: string) => Promise<Diagnosis[]>;
  getDiagnosisStats: () => Promise<void>;
  getDiagnosisCategories: () => Promise<void>;
  getDiagnosisVariants: () => Promise<void>;
  bulkUpdateDiagnoses: (data: any) => Promise<void>;

  // GDRG-specific methods
  validateGdrgCode: (gdrgCode: string) => boolean;
  getDiagnosesByGdrgCode: (gdrgCode: string) => Diagnosis[];
  searchDiagnosesByGdrg: (searchTerm: string) => Diagnosis[];
  getDiagnosisWithTariff: (diagnosis: Diagnosis) => any;

  // Lab Test Template actions
  getLabTestTemplates: (filters?: any) => Promise<void>;
  getLabTestTemplate: (id: string) => Promise<void>;
  createLabTestTemplate: (data: any) => Promise<void>;
  updateLabTestTemplate: (id: string, data: any) => Promise<void>;
  deleteLabTestTemplate: (id: string) => Promise<void>;

  // ✅ ADDED MISSING LAB TEST FUNCTIONS
  getLabTestCategories: () => Promise<void>;
  getLabTestSubCategories: () => Promise<void>;
  getSpecimenTypes: () => Promise<void>;
  bulkUpdateLabTestTemplates: (data: any) => Promise<void>;

  // Procedure Template actions
  getProcedureTemplates: (filters?: any) => Promise<void>;
  getProcedureTemplate: (id: string) => Promise<void>;
  createProcedureTemplate: (data: any) => Promise<void>;
  updateProcedureTemplate: (id: string, data: any) => Promise<void>;
  deleteProcedureTemplate: (id: string) => Promise<void>;

  // ✅ ADDED MISSING PROCEDURE FUNCTIONS
  getProcedureCategories: () => Promise<void>;
  getProcedureDepartments: () => Promise<void>;
  bulkUpdateProcedureTemplates: (data: any) => Promise<void>;

  // Scan Template actions
  getScanTemplates: (filters?: any) => Promise<void>;
  getScanTemplate: (id: string) => Promise<void>; // ✅ ADDED
  createScanTemplate: (data: any) => Promise<void>; // ✅ ADDED
  updateScanTemplate: (id: string, data: any) => Promise<void>; // ✅ ADDED
  deleteScanTemplate: (id: string) => Promise<void>; // ✅ ADDED
  getScanCategories: () => Promise<void>;
  getScanBodyParts: () => Promise<void>;
  getScanTypes: () => Promise<void>; // ✅ ADDED
  bulkUpdateScanTemplates: (data: any) => Promise<void>; // ✅ ADDED

  // Service Catalog actions
  getServiceCatalog: (filters?: any) => Promise<void>;
  getServiceCatalogItem: (id: string) => Promise<void>;
  createServiceCatalogItem: (data: any) => Promise<void>;
  updateServiceCatalogItem: (id: string, data: any) => Promise<void>;
  deleteServiceCatalogItem: (id: string) => Promise<void>;
  getServiceMetadata: () => Promise<void>;

  // ✅ ADDED MISSING SERVICE CATALOG FUNCTIONS
  getNHISReadinessReport: () => Promise<any>;
  getServiceByNHISCode: (nhisCode: string) => Promise<ServiceCatalog | null>;
  getServicesByCategory: (category: string) => Promise<ServiceCatalog[]>;
  checkServiceCoverage: (data: any) => Promise<any>;
  calculateServiceCost: (data: any) => Promise<any>;

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
  scanCategories: [],
  scanBodyParts: [],
  scanTypes: [], // ✅ ADDED
  serviceMetadata: null,
  diagnosisStats: null, // ✅ ADDED
  diagnosisCategories: [], // ✅ ADDED
  currentDiagnosis: null,
  currentLabTestTemplate: null,
  currentProcedureTemplate: null,
  currentScanTemplate: null, // ✅ ADDED
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
      console.log('Fetching diagnoses...');
      const diagnoses = await apiGetDiagnoses(filters);
      console.log('Diagnoses count:', diagnoses?.length || 0);
      set({ diagnoses, isLoadingDiagnoses: false });
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

  // UPDATED: Auto-fetch G-DRG tariff
  createDiagnosis: async (data: any) => {
    if (!get().validateGdrgCode(data.gdrgCode)) {
      throw new Error('Invalid GDRG code format');
    }

    const tariff = useGDRGTariffStore.getState().getTariff(data.gdrgCode);
    if (!tariff) {
      console.log(`Fetching G-DRG tariff for ${data.gdrgCode}...`);
      await useGDRGTariffStore.getState().fetchTariffs();
    }

    set({ isLoading: true });
    try {
      const newDiagnosis = await apiCreateDiagnosis(data);
      set({
        diagnoses: [newDiagnosis, ...get().diagnoses],
        currentDiagnosis: newDiagnosis,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to create diagnosis:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // UPDATED: Same logic for update
  updateDiagnosis: async (id: string, data: any) => {
    if (data.gdrgCode && !get().validateGdrgCode(data.gdrgCode)) {
      throw new Error('Invalid GDRG code format');
    }

    if (data.gdrgCode) {
      const tariff = useGDRGTariffStore.getState().getTariff(data.gdrgCode);
      if (!tariff) {
        await useGDRGTariffStore.getState().fetchTariffs();
      }
    }

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
        currentDiagnosis: get().currentDiagnosis?.id === id ? null : get().currentDiagnosis,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to delete diagnosis:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ✅ ADDED MISSING DIAGNOSIS FUNCTIONS
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

  getDiagnosisCategories: async () => {
    try {
      const categories = await apiGetDiagnosisCategories();
      set({ diagnosisCategories: categories });
    } catch (error: any) {
      throw error;
    }
  },

  getDiagnosisVariants: async () => {
    try {
      const variants = await apiGetDiagnosisVariants();
      return variants;
    } catch (error: any) {
      throw error;
    }
  },

  bulkUpdateDiagnoses: async (data: any) => {
    set({ isLoading: true });
    try {
      await apiBulkUpdateDiagnoses(data);
      // Refresh diagnoses after bulk update
      await get().getDiagnoses();
      set({ isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  // GDRG HELPERS
  validateGdrgCode: (gdrgCode: string) => {
    const gdrgRegex = /^[A-Za-z0-9]{3,10}$/;
    return gdrgRegex.test(gdrgCode);
  },

  getDiagnosesByGdrgCode: (gdrgCode: string) => {
    return get().diagnoses.filter(d =>
      d.gdrgCode.toLowerCase() === gdrgCode.toLowerCase()
    );
  },

  searchDiagnosesByGdrg: (searchTerm: string) => {
    const term = searchTerm.toLowerCase();
    return get().diagnoses.filter(d =>
      d.gdrgCode.toLowerCase().includes(term) ||
      d.name.toLowerCase().includes(term) ||
      d.icdCode.toLowerCase().includes(term)
    );
  },

  // NEW: Return diagnosis + NHIA tariff
  getDiagnosisWithTariff: (diagnosis: Diagnosis) => {
    const tariff = useGDRGTariffStore.getState().getTariff(diagnosis.gdrgCode);
    return {
      ...diagnosis,
      nhiaTariff: tariff?.nhiaTariff || 0,
      effectiveFrom: tariff?.effectiveFrom || null
    };
  },

  // === LAB TEST TEMPLATES ===
  getLabTestTemplates: async (filters = {}) => {
    set({ isLoadingLabTests: true, errors: { ...get().errors, labTests: null } });
    try {
      const labTestTemplates = await apiGetLabTestTemplates(filters);
      set({ labTestTemplates, isLoadingLabTests: false });
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
        currentLabTestTemplate: get().currentLabTestTemplate?.id === id ? null : get().currentLabTestTemplate,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to delete lab test template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ✅ ADDED MISSING LAB TEST FUNCTIONS
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
      // Refresh lab test templates after bulk update
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
      const procedureTemplates = await apiGetProcedureTemplates(filters);
      set({ procedureTemplates, isLoadingProcedures: false });
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
        currentProcedureTemplate: get().currentProcedureTemplate?.id === id ? null : get().currentProcedureTemplate,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to delete procedure template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ✅ ADDED MISSING PROCEDURE FUNCTIONS
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
      // Refresh procedure templates after bulk update
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
      const scanTemplates = await apiGetScanTemplates(filters);
      set({ scanTemplates, isLoadingScans: false });
    } catch (error: any) {
      console.error('Failed to fetch scan templates:', error);
      set({
        errors: { ...get().errors, scans: error.message },
        isLoadingScans: false
      });
      throw error;
    }
  },

  getScanCategories: async () => {
    try {
      const categories = await apiGetScanCategories();
      set({ scanCategories: categories });
    } catch (error: any) {
      set({ errors: { ...get().errors, scans: error.message } });
      throw error;
    }
  },

  getScanBodyParts: async () => {
    try {
      const bodyParts = await apiGetScanBodyParts();
      set({ scanBodyParts: bodyParts });
    } catch (error: any) {
      set({ errors: { ...get().errors, scans: error.message } });
      throw error;
    }
  },

  // ✅ ADDED MISSING SCAN FUNCTIONS
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
        currentScanTemplate: get().currentScanTemplate?.id === id ? null : get().currentScanTemplate,
        isLoading: false
      });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  getScanTypes: async () => {
    try {
      const scanTypes = await apiGetScanTypes();
      set({ scanTypes });
    } catch (error: any) {
      throw error;
    }
  },

  bulkUpdateScanTemplates: async (data: any) => {
    set({ isLoading: true });
    try {
      await apiBulkUpdateScanTemplates(data);
      // Refresh scan templates after bulk update
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
      const response = await apiGetServiceCatalog(filters);
      set({
        serviceCatalog: response.services || response.data || response,
        pagination: response.pagination || null,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to fetch service catalog:', error);
      set({
        errors: { ...get().errors, serviceCatalog: error.message },
        isLoading: false
      });
      throw error;
    }
  },

  getServiceCatalogItem: async (id: string) => {
    set({ isLoading: true });
    try {
      // FIX: Validate ID before calling API
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Valid Service ID is required');
      }
      
      const item = await apiGetServiceCatalogItem(id);
      set({ currentServiceCatalogItem: item, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch service catalog item:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createServiceCatalogItem: async (data: any) => {
    set({ isLoading: true });
    try {
      // FIX: Validate data before creating
      if (!data.name || !data.code) {
        throw new Error('Service name and code are required');
      }
      
      const newItem = await apiCreateServiceCatalogItem(data);
      
      // FIX: Ensure the new item has an id
      if (!newItem.id) {
        console.warn('Created service item missing id:', newItem);
      }
      
      set({
        serviceCatalog: [newItem, ...get().serviceCatalog],
        currentServiceCatalogItem: newItem,
        isLoading: false
      });
      
      return newItem; // Return the created item
    } catch (error: any) {
      console.error('Failed to create service catalog item:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateServiceCatalogItem: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      // FIX: Comprehensive validation
      if (!id || id === 'undefined' || id === 'null') {
        console.error('Update attempted with invalid ID:', { id, data });
        throw new Error('Valid Service ID is required for update');
      }
      
      if (!data || Object.keys(data).length === 0) {
        throw new Error('Update data is required');
      }
      
      console.log('Store: Updating service', { id, data }); // Debug log
      const updatedItem = await apiUpdateServiceCatalogItem(id, data);
      
      // FIX: Ensure updated item has id
      if (!updatedItem.id) {
        console.warn('Updated item missing id:', updatedItem);
        updatedItem.id = id; // Use the provided ID
      }
      
      set({
        serviceCatalog: get().serviceCatalog.map(item => 
          item.id === id ? updatedItem : item
        ),
        currentServiceCatalogItem: updatedItem,
        isLoading: false
      });
      
      return updatedItem; // Return the updated item
    } catch (error: any) {
      console.error('Failed to update service catalog item:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteServiceCatalogItem: async (id: string) => {
    set({ isLoading: true });
    try {
      // FIX: Validate ID before deletion
      if (!id || id === 'undefined' || id === 'null') {
        console.error('Delete attempted with invalid ID:', id);
        throw new Error('Valid Service ID is required for deletion');
      }
      
      console.log('Store: Deleting service', id); // Debug log
      await apiDeleteServiceCatalogItem(id);
      
      set({
        serviceCatalog: get().serviceCatalog.filter(item => item.id !== id),
        currentServiceCatalogItem: get().currentServiceCatalogItem?.id === id 
          ? null 
          : get().currentServiceCatalogItem,
        isLoading: false
      });
      
      console.log('Store: Service deleted successfully'); // Debug log
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

  // ✅ ADDED MISSING SERVICE CATALOG FUNCTIONS
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