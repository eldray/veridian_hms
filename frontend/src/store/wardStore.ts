// stores/wardStore.ts
import { create } from 'zustand';
import { 
  getWards as apiGetWards,
  getWard as apiGetWard,
  createWard as apiCreateWard,
  updateWard as apiUpdateWard,
  deleteWard as apiDeleteWard,
  getBeds as apiGetBeds,
  getBed as apiGetBed,
  createBed as apiCreateBed,
  updateBed as apiUpdateBed,
  deleteBed as apiDeleteBed
} from '../api';
import type { Ward, Bed, Pagination } from '../types';

interface WardState {
  wards: Ward[];
  beds: Bed[];
  currentWard: Ward | null;
  currentBed: Bed | null;
  isLoading: boolean;
  pagination: Pagination | null;
  
  // Wards
  getWards: (filters?: any) => Promise<void>;
  getWard: (id: string) => Promise<void>;
  createWard: (data: any) => Promise<void>;
  updateWard: (id: string, data: any) => Promise<void>;
  deleteWard: (id: string) => Promise<void>;
  
  // Beds
  getBeds: (filters?: any) => Promise<void>;
  getBed: (id: string) => Promise<void>;
  createBed: (data: any) => Promise<void>;
  updateBed: (id: string, data: any) => Promise<void>;
  deleteBed: (id: string) => Promise<void>;
  
  clearCurrentWard: () => void;
  clearCurrentBed: () => void;
}

export const useWardStore = create<WardState>((set, get) => ({
  wards: [],
  beds: [],
  currentWard: null,
  currentBed: null,
  isLoading: false,
  pagination: null,

  getWards: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetWards(filters);
      set({ 
        wards: response.wards || response.data || response,
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch wards:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getWard: async (id: string) => {
    set({ isLoading: true });
    try {
      const ward = await apiGetWard(id);
      set({ currentWard: ward, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch ward:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createWard: async (data: any) => {
    set({ isLoading: true });
    try {
      const newWard = await apiCreateWard(data);
      const wards = get().wards;
      set({ 
        wards: [newWard, ...wards],
        currentWard: newWard,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to create ward:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateWard: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedWard = await apiUpdateWard(id, data);
      const wards = get().wards.map(ward => 
        ward._id === id ? updatedWard : ward
      );
      set({ 
        wards,
        currentWard: updatedWard,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update ward:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteWard: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteWard(id);
      const wards = get().wards.filter(ward => ward._id !== id);
      set({ 
        wards,
        currentWard: get().currentWard?._id === id ? null : get().currentWard,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to delete ward:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getBeds: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetBeds(filters);
      set({ 
        beds: response.beds || response.data || response,
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch beds:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getBed: async (id: string) => {
    set({ isLoading: true });
    try {
      const bed = await apiGetBed(id);
      set({ currentBed: bed, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch bed:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createBed: async (data: any) => {
    set({ isLoading: true });
    try {
      const newBed = await apiCreateBed(data);
      const beds = get().beds;
      set({ 
        beds: [newBed, ...beds],
        currentBed: newBed,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to create bed:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateBed: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedBed = await apiUpdateBed(id, data);
      const beds = get().beds.map(bed => 
        bed._id === id ? updatedBed : bed
      );
      set({ 
        beds,
        currentBed: updatedBed,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update bed:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteBed: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteBed(id);
      const beds = get().beds.filter(bed => bed._id !== id);
      set({ 
        beds,
        currentBed: get().currentBed?._id === id ? null : get().currentBed,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to delete bed:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  clearCurrentWard: () => {
    set({ currentWard: null });
  },

  clearCurrentBed: () => {
    set({ currentBed: null });
  },
}));
