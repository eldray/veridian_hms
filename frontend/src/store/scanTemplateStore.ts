// store/scanTemplateStore.ts - UPDATED WITH ALL API FUNCTIONS
import { create } from 'zustand';
import { 
  getScanTemplates as apiGetScanTemplates,
  getScanTemplate as apiGetScanTemplate,
  createScanTemplate as apiCreateScanTemplate,
  updateScanTemplate as apiUpdateScanTemplate,
  deleteScanTemplate as apiDeleteScanTemplate,
  getScanCategories as apiGetScanCategories,
  getScanBodyParts as apiGetScanBodyParts,
  // ✅ ADDED MISSING FUNCTIONS
  getScanTypes as apiGetScanTypes,
  bulkUpdateScanTemplates as apiBulkUpdateScanTemplates
} from '../api';

interface ScanTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  bodyPart: string;
  scanType: string; // ✅ ADDED
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  preparationInstructions?: string;
  duration: number;
  contrastRequired: boolean;
  radiationDose?: string;
  reportTemplate: any[];
  createdAt: string;
  updatedAt: string;
}

interface ScanTemplateState {
  scanTemplates: ScanTemplate[];
  currentScanTemplate: ScanTemplate | null;
  categories: string[];
  bodyParts: string[];
  scanTypes: string[]; // ✅ ADDED
  isLoading: boolean;
  error: string | null;

  // Core Actions
  getScanTemplates: (filters?: any) => Promise<void>;
  getScanTemplate: (id: string) => Promise<void>;
  createScanTemplate: (data: any) => Promise<void>;
  updateScanTemplate: (id: string, data: any) => Promise<void>;
  deleteScanTemplate: (id: string) => Promise<void>;
  
  // Metadata Actions
  getScanCategories: () => Promise<void>;
  getScanBodyParts: () => Promise<void>;
  getScanTypes: () => Promise<void>; // ✅ ADDED
  
  // Bulk Operations
  bulkUpdateScanTemplates: (data: any) => Promise<void>; // ✅ ADDED
  
  // Utility Actions
  clearCurrentScanTemplate: () => void;
  clearError: () => void;
}

export const useScanTemplateStore = create<ScanTemplateState>((set, get) => ({
  scanTemplates: [],
  currentScanTemplate: null,
  categories: [],
  bodyParts: [],
  scanTypes: [], // ✅ ADDED
  isLoading: false,
  error: null,

  getScanTemplates: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const templates = await apiGetScanTemplates(filters);
      set({ scanTemplates: templates, isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false, error: error.message || 'Failed to fetch scan templates' });
      throw error;
    }
  },

  getScanTemplate: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const template = await apiGetScanTemplate(id);
      set({ currentScanTemplate: template, isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false, error: error.message || 'Failed to fetch scan template' });
      throw error;
    }
  },

  createScanTemplate: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const newTemplate = await apiCreateScanTemplate(data);
      const templates = get().scanTemplates;
      set({ 
        scanTemplates: [newTemplate, ...templates],
        currentScanTemplate: newTemplate,
        isLoading: false 
      });
    } catch (error: unknown) {
      set({ isLoading: false, error: error.message || 'Failed to create scan template' });
      throw error;
    }
  },

  updateScanTemplate: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTemplate = await apiUpdateScanTemplate(id, data);
      const templates = get().scanTemplates.map(template =>
        template.id === id ? updatedTemplate : template
      );
      set({ 
        scanTemplates: templates,
        currentScanTemplate: updatedTemplate,
        isLoading: false 
      });
    } catch (error: unknown) {
      set({ isLoading: false, error: error.message || 'Failed to update scan template' });
      throw error;
    }
  },

  deleteScanTemplate: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteScanTemplate(id);
      const templates = get().scanTemplates.filter(template => template.id !== id);
      set({ 
        scanTemplates: templates,
        currentScanTemplate: get().currentScanTemplate?.id === id ? null : get().currentScanTemplate,
        isLoading: false 
      });
    } catch (error: unknown) {
      set({ isLoading: false, error: error.message || 'Failed to delete scan template' });
      throw error;
    }
  },

  getScanCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await apiGetScanCategories();
      set({ categories, isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false, error: error.message || 'Failed to fetch scan categories' });
      throw error;
    }
  },

  getScanBodyParts: async () => {
    set({ isLoading: true, error: null });
    try {
      const bodyParts = await apiGetScanBodyParts();
      set({ bodyParts, isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false, error: error.message || 'Failed to fetch scan body parts' });
      throw error;
    }
  },

  // ✅ ADDED MISSING FUNCTIONS
  getScanTypes: async () => {
    set({ isLoading: true, error: null });
    try {
      const scanTypes = await apiGetScanTypes();
      set({ scanTypes, isLoading: false });
    } catch (error: unknown) {
      set({ isLoading: false, error: error.message || 'Failed to fetch scan types' });
      throw error;
    }
  },

  bulkUpdateScanTemplates: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiBulkUpdateScanTemplates(data);
      
      // Refresh scan templates after bulk update
      await get().getScanTemplates();
      set({ isLoading: false });
      return result;
    } catch (error: unknown) {
      set({ isLoading: false, error: error.message || 'Failed to bulk update scan templates' });
      throw error;
    }
  },

  clearCurrentScanTemplate: () => {
    set({ currentScanTemplate: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));