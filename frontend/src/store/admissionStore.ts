// stores/admissionStore.ts - FIXED VERSION
import { create } from 'zustand';
import { 
  getAdmissions as apiGetAdmissions,
  getAdmission as apiGetAdmission,
  createAdmission as apiCreateAdmission,
  updateAdmission as apiUpdateAdmission,
  dischargeAdmission as apiDischargeAdmission
} from '../api';
import type { Admission, Pagination } from '../types';

interface AdmissionState {
  admissions: Admission[];
  currentAdmission: Admission | null;
  isLoading: boolean;
  pagination: Pagination | null;
  
  // Admissions
  getAdmissions: (filters?: any) => Promise<void>;
  getAdmission: (id: string) => Promise<void>;
  createAdmission: (data: any) => Promise<void>;
  updateAdmission: (id: string, data: any) => Promise<void>;
  dischargeAdmission: (id: string, data: any) => Promise<void>;
  clearCurrentAdmission: () => void;
}

export const useAdmissionStore = create<AdmissionState>((set, get) => ({
  admissions: [],
  currentAdmission: null,
  isLoading: false,
  pagination: null,

  getAdmissions: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetAdmissions(filters);
      set({ 
        admissions: response.admissions || response.data || response,
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch admissions:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getAdmission: async (id: string) => {
    set({ isLoading: true });
    try {
      const admission = await apiGetAdmission(id);
      set({ currentAdmission: admission, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch admission:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createAdmission: async (data: any) => {
    set({ isLoading: true });
    try {
      const newAdmission = await apiCreateAdmission(data);
      const admissions = get().admissions;
      set({ 
        admissions: [newAdmission, ...admissions],
        currentAdmission: newAdmission,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to create admission:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateAdmission: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedAdmission = await apiUpdateAdmission(id, data);
      const admissions = get().admissions.map(admission => 
        admission._id === id ? updatedAdmission : admission
      );
      set({ 
        admissions,
        currentAdmission: updatedAdmission,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update admission:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  dischargeAdmission: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const dischargedAdmission = await apiDischargeAdmission(id, data);
      const admissions = get().admissions.map(admission => 
        admission._id === id ? dischargedAdmission : admission
      );
      set({ 
        admissions,
        currentAdmission: dischargedAdmission,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to discharge admission:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  clearCurrentAdmission: () => {
    set({ currentAdmission: null });
  },
}));