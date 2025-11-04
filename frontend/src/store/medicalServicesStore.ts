// stores/medicalServicesStore.ts
import { create } from 'zustand';
import { 
  getDiagnoses as apiGetDiagnoses,
  getDiagnosis as apiGetDiagnosis,
  createDiagnosis as apiCreateDiagnosis,
  updateDiagnosis as apiUpdateDiagnosis,
  deleteDiagnosis as apiDeleteDiagnosis,
  getLabTestTemplates as apiGetLabTestTemplates,
  getLabTestTemplate as apiGetLabTestTemplate,
  createLabTestTemplate as apiCreateLabTestTemplate,
  updateLabTestTemplate as apiUpdateLabTestTemplate,
  deleteLabTestTemplate as apiDeleteLabTestTemplate,
  getProcedureTemplates as apiGetProcedureTemplates,
  getProcedureTemplate as apiGetProcedureTemplate,
  createProcedureTemplate as apiCreateProcedureTemplate,
  updateProcedureTemplate as apiUpdateProcedureTemplate,
  deleteProcedureTemplate as apiDeleteProcedureTemplate,
  getServiceCatalog as apiGetServiceCatalog,
  getServiceCatalogItem as apiGetServiceCatalogItem,
  createServiceCatalogItem as apiCreateServiceCatalogItem,
  updateServiceCatalogItem as apiUpdateServiceCatalogItem,
  deleteServiceCatalogItem as apiDeleteServiceCatalogItem,
  getServiceMetadata as apiGetServiceMetadata
} from '../api';
import type { Diagnosis, LabTestTemplate, ProcedureTemplate, ServiceCatalog, Pagination } from '../types';

interface MedicalServicesState {
  diagnoses: Diagnosis[];
  labTestTemplates: LabTestTemplate[];
  procedureTemplates: ProcedureTemplate[];
  serviceCatalog: ServiceCatalog[];
  currentDiagnosis: Diagnosis | null;
  currentLabTestTemplate: LabTestTemplate | null;
  currentProcedureTemplate: ProcedureTemplate | null;
  currentServiceCatalogItem: ServiceCatalog | null;
  serviceMetadata: any;
  isLoading: boolean;
  pagination: Pagination | null;
  
  // Diagnoses
  getDiagnoses: (filters?: any) => Promise<void>;
  getDiagnosis: (id: string) => Promise<void>;
  createDiagnosis: (data: any) => Promise<void>;
  updateDiagnosis: (id: string, data: any) => Promise<void>;
  deleteDiagnosis: (id: string) => Promise<void>;
  
  // Lab Test Templates
  getLabTestTemplates: (filters?: any) => Promise<void>;
  getLabTestTemplate: (id: string) => Promise<void>;
  createLabTestTemplate: (data: any) => Promise<void>;
  updateLabTestTemplate: (id: string, data: any) => Promise<void>;
  deleteLabTestTemplate: (id: string) => Promise<void>;
  
  // Procedure Templates
  getProcedureTemplates: (filters?: any) => Promise<void>;
  getProcedureTemplate: (id: string) => Promise<void>;
  createProcedureTemplate: (data: any) => Promise<void>;
  updateProcedureTemplate: (id: string, data: any) => Promise<void>;
  deleteProcedureTemplate: (id: string) => Promise<void>;
  
  // Service Catalog
  getServiceCatalog: (filters?: any) => Promise<void>;
  getServiceCatalogItem: (id: string) => Promise<void>;
  createServiceCatalogItem: (data: any) => Promise<void>;
  updateServiceCatalogItem: (id: string, data: any) => Promise<void>;
  deleteServiceCatalogItem: (id: string) => Promise<void>;
  getServiceMetadata: () => Promise<void>;
  
  clearCurrentItems: () => void;
}

export const useMedicalServicesStore = create<MedicalServicesState>((set, get) => ({
  diagnoses: [],
  labTestTemplates: [],
  procedureTemplates: [],
  serviceCatalog: [],
  currentDiagnosis: null,
  currentLabTestTemplate: null,
  currentProcedureTemplate: null,
  currentServiceCatalogItem: null,
  serviceMetadata: null,
  isLoading: false,
  pagination: null,

  // Diagnoses
  getDiagnoses: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const diagnoses = await apiGetDiagnoses(filters);
      set({ diagnoses, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch diagnoses:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getDiagnosis: async (id: string) => {
    set({ isLoading: true });
    try {
      const diagnosis = await apiGetDiagnosis(id);
      set({ currentDiagnosis: diagnosis, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch diagnosis:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createDiagnosis: async (data: any) => {
    set({ isLoading: true });
    try {
      const newDiagnosis = await apiCreateDiagnosis(data);
      const diagnoses = get().diagnoses;
      set({ 
        diagnoses: [newDiagnosis, ...diagnoses],
        currentDiagnosis: newDiagnosis,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to create diagnosis:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateDiagnosis: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedDiagnosis = await apiUpdateDiagnosis(id, data);
      const diagnoses = get().diagnoses.map(diagnosis => 
        diagnosis._id === id ? updatedDiagnosis : diagnosis
      );
      set({ 
        diagnoses,
        currentDiagnosis: updatedDiagnosis,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update diagnosis:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteDiagnosis: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteDiagnosis(id);
      const diagnoses = get().diagnoses.filter(diagnosis => diagnosis._id !== id);
      set({ 
        diagnoses,
        currentDiagnosis: get().currentDiagnosis?._id === id ? null : get().currentDiagnosis,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to delete diagnosis:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Lab Test Templates
  getLabTestTemplates: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const labTestTemplates = await apiGetLabTestTemplates(filters);
      set({ labTestTemplates, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch lab test templates:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getLabTestTemplate: async (id: string) => {
    set({ isLoading: true });
    try {
      const template = await apiGetLabTestTemplate(id);
      set({ currentLabTestTemplate: template, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch lab test template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createLabTestTemplate: async (data: any) => {
    set({ isLoading: true });
    try {
      const newTemplate = await apiCreateLabTestTemplate(data);
      const templates = get().labTestTemplates;
      set({ 
        labTestTemplates: [newTemplate, ...templates],
        currentLabTestTemplate: newTemplate,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to create lab test template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateLabTestTemplate: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedTemplate = await apiUpdateLabTestTemplate(id, data);
      const templates = get().labTestTemplates.map(template => 
        template._id === id ? updatedTemplate : template
      );
      set({ 
        labTestTemplates: templates,
        currentLabTestTemplate: updatedTemplate,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update lab test template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteLabTestTemplate: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteLabTestTemplate(id);
      const templates = get().labTestTemplates.filter(template => template._id !== id);
      set({ 
        labTestTemplates: templates,
        currentLabTestTemplate: get().currentLabTestTemplate?._id === id ? null : get().currentLabTestTemplate,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to delete lab test template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Procedure Templates
  getProcedureTemplates: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const procedureTemplates = await apiGetProcedureTemplates(filters);
      set({ procedureTemplates, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch procedure templates:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getProcedureTemplate: async (id: string) => {
    set({ isLoading: true });
    try {
      const template = await apiGetProcedureTemplate(id);
      set({ currentProcedureTemplate: template, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch procedure template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createProcedureTemplate: async (data: any) => {
    set({ isLoading: true });
    try {
      const newTemplate = await apiCreateProcedureTemplate(data);
      const templates = get().procedureTemplates;
      set({ 
        procedureTemplates: [newTemplate, ...templates],
        currentProcedureTemplate: newTemplate,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to create procedure template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateProcedureTemplate: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedTemplate = await apiUpdateProcedureTemplate(id, data);
      const templates = get().procedureTemplates.map(template => 
        template._id === id ? updatedTemplate : template
      );
      set({ 
        procedureTemplates: templates,
        currentProcedureTemplate: updatedTemplate,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update procedure template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteProcedureTemplate: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteProcedureTemplate(id);
      const templates = get().procedureTemplates.filter(template => template._id !== id);
      set({ 
        procedureTemplates: templates,
        currentProcedureTemplate: get().currentProcedureTemplate?._id === id ? null : get().currentProcedureTemplate,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to delete procedure template:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Service Catalog
  getServiceCatalog: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetServiceCatalog(filters);
      set({ 
        serviceCatalog: response.services || response.data || response,
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch service catalog:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getServiceCatalogItem: async (id: string) => {
    set({ isLoading: true });
    try {
      const item = await apiGetServiceCatalogItem(id);
      set({ currentServiceCatalogItem: item, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch service catalog item:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createServiceCatalogItem: async (data: any) => {
    set({ isLoading: true });
    try {
      const newItem = await apiCreateServiceCatalogItem(data);
      const catalog = get().serviceCatalog;
      set({ 
        serviceCatalog: [newItem, ...catalog],
        currentServiceCatalogItem: newItem,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to create service catalog item:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateServiceCatalogItem: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedItem = await apiUpdateServiceCatalogItem(id, data);
      const catalog = get().serviceCatalog.map(item => 
        item._id === id ? updatedItem : item
      );
      set({ 
        serviceCatalog: catalog,
        currentServiceCatalogItem: updatedItem,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update service catalog item:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteServiceCatalogItem: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteServiceCatalogItem(id);
      const catalog = get().serviceCatalog.filter(item => item._id !== id);
      set({ 
        serviceCatalog: catalog,
        currentServiceCatalogItem: get().currentServiceCatalogItem?._id === id ? null : get().currentServiceCatalogItem,
        isLoading: false 
      });
    } catch (error) {
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
    } catch (error) {
      console.error('Failed to fetch service metadata:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  clearCurrentItems: () => {
    set({ 
      currentDiagnosis: null,
      currentLabTestTemplate: null,
      currentProcedureTemplate: null,
      currentServiceCatalogItem: null 
    });
  },
}));
