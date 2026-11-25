// src/store/familyPlanningStore.ts

import { create } from 'zustand';
import {
  getFPServices,
  getFPServiceById,
  createFPService,
  updateFPService,
  deleteFPService,
  getCurrentFPMethod,
  getFPHistory,
  getFPClientDetails,
  getFPStatistics,
  getFPMethodMix,
} from '../api';

interface FamilyPlanningState {
  // State
  services: any[];
  currentService: any | null;
  currentMethod: any | null;
  fpHistory: any[];
  clientDetails: any | null;
  statistics: any | null;
  methodMix: any[];
  isLoading: boolean;
  error: string | null;
  pagination: any | null;

  // Actions
  getServices: (filters?: any) => Promise<void>;
  getServiceById: (id: string) => Promise<any>;
  createService: (data: any) => Promise<any>;
  updateService: (id: string, data: any) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  getCurrentMethod: (patientId: string) => Promise<any>;
  getHistory: (patientId: string) => Promise<void>;
  getClientDetails: (patientId: string) => Promise<any>;
  getStatistics: (filters?: any) => Promise<void>;
  getMethodMix: (filters?: any) => Promise<void>;
  clearCurrent: () => void;
  clearError: () => void;
}

export const useFamilyPlanningStore = create<FamilyPlanningState>((set, get) => ({
  services: [],
  currentService: null,
  currentMethod: null,
  fpHistory: [],
  clientDetails: null,
  statistics: null,
  methodMix: [],
  isLoading: false,
  error: null,
  pagination: null,

  getServices: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getFPServices(filters);
      set({
        services: response.data || [],
        pagination: response.pagination,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getServiceById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getFPServiceById(id);
      set({ currentService: response.data, isLoading: false });
      return response.data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  createService: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await createFPService(data);
      set((state) => ({
        services: [response.data, ...state.services],
        isLoading: false,
      }));
      return response.data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateService: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await updateFPService(id, data);
      set((state) => ({
        services: state.services.map(s => s.id === id ? response.data : s),
        currentService: state.currentService?.id === id ? response.data : state.currentService,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteService: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteFPService(id);
      set((state) => ({
        services: state.services.filter(s => s.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getCurrentMethod: async (patientId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getCurrentFPMethod(patientId);
      set({ currentMethod: response.data, isLoading: false });
      return response.data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getHistory: async (patientId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getFPHistory(patientId);
      set({ fpHistory: response.data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getClientDetails: async (patientId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getFPClientDetails(patientId);
      set({ clientDetails: response.data, isLoading: false });
      return response.data;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getStatistics: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getFPStatistics(filters);
      set({ statistics: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getMethodMix: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getFPMethodMix(filters);
      set({ methodMix: response.data || [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearCurrent: () => set({
    currentService: null,
    currentMethod: null,
    fpHistory: [],
    clientDetails: null,
  }),

  clearError: () => set({ error: null }),
}));