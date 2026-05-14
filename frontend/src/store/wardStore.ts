// stores/wardStore.ts - UPDATED WITH ALL API FUNCTIONS
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
  deleteBed as apiDeleteBed,
  // ✅ ADDED MISSING FUNCTION
  getAvailableBeds as apiGetAvailableBeds
} from '../api';
import type { Ward, Bed, Pagination } from '../types';

interface WardState {
  wards: Ward[];
  beds: Bed[];
  availableBeds: Bed[]; // ✅ ADDED
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
  
  // ✅ ADDED MISSING FUNCTION
  getAvailableBeds: () => Promise<void>;
  
  // Utility functions
  getBedsByWard: (wardId: string) => Bed[];
  getAvailableBedsByWard: (wardId: string) => Bed[];
  
  clearCurrentWard: () => void;
  clearCurrentBed: () => void;
}

// Helper function to transform backend data to frontend format
const transformWard = (ward: any): Ward => ({
  ...ward,
  id: ward.id,
});

const transformBed = (bed: any): Bed => ({
  ...bed,
  id: bed.id,
});

export const useWardStore = create<WardState>((set, get) => ({
  wards: [],
  beds: [],
  availableBeds: [], // ✅ ADDED
  currentWard: null,
  currentBed: null,
  isLoading: false,
  pagination: null,

  getWards: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetWards(filters);
      console.log('🔍 [WardStore] Raw wards response:', response);
      
      let wardsArray: any[] = [];
      
      if (Array.isArray(response)) {
        wardsArray = response;
      } else if (response && Array.isArray(response.wards)) {
        wardsArray = response.wards;
      } else if (response && Array.isArray(response.data)) {
        wardsArray = response.data;
      } else {
        console.warn('Unexpected wards response structure:', response);
        wardsArray = [];
      }

      const transformedWards = wardsArray.map(transformWard);
      console.log('✅ [WardStore] Transformed wards:', transformedWards);
      
      set({ 
        wards: transformedWards,
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('❌ [WardStore] Failed to fetch wards:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getWard: async (id: string) => {
    set({ isLoading: true });
    try {
      const ward = await apiGetWard(id);
      set({ currentWard: transformWard(ward), isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch ward:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createWard: async (data: any) => {
    set({ isLoading: true });
    try {
      console.log('🔍 [WardStore] Creating ward with data:', data);
      const newWard = await apiCreateWard(data);
      console.log('✅ [WardStore] Created ward response:', newWard);
      
      const transformedWard = transformWard(newWard.ward || newWard);
      const wards = get().wards;
      
      set({ 
        wards: [transformedWard, ...wards],
        currentWard: transformedWard,
        isLoading: false 
      });
      
      return transformedWard;
    } catch (error: unknown) {
      console.error('❌ [WardStore] Failed to create ward:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateWard: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedWard = await apiUpdateWard(id, data);
      const transformedWard = transformWard(updatedWard.ward || updatedWard);
      const wards = get().wards.map(ward => 
        (ward.id === id) ? transformedWard : ward
      );
      set({ 
        wards,
        currentWard: transformedWard,
        isLoading: false 
      });
      return transformedWard;
    } catch (error: unknown) {
      console.error('Failed to update ward:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteWard: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteWard(id);
      const wards = get().wards.filter(ward => 
        !(ward.id === id)
      );
      set({ 
        wards,
        currentWard: get().currentWard && 
          (get().currentWard.id === id || get().currentWard.id === id) ? null : get().currentWard,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('Failed to delete ward:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getBeds: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetBeds(filters);
      console.log('🔍 [WardStore] Raw beds response:', response);
      
      let bedsArray: any[] = [];
      
      if (Array.isArray(response)) {
        bedsArray = response;
      } else if (response && Array.isArray(response.beds)) {
        bedsArray = response.beds;
      } else if (response && Array.isArray(response.data)) {
        bedsArray = response.data;
      } else {
        console.warn('Unexpected beds response structure:', response);
        bedsArray = [];
      }

      const transformedBeds = bedsArray.map(transformBed);
      console.log('✅ [WardStore] Transformed beds:', transformedBeds);
      
      set({ 
        beds: transformedBeds,
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('❌ [WardStore] Failed to fetch beds:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getBed: async (id: string) => {
    set({ isLoading: true });
    try {
      const bed = await apiGetBed(id);
      set({ currentBed: transformBed(bed), isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch bed:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createBed: async (data: any) => {
    set({ isLoading: true });
    try {
      console.log('🔍 [WardStore] Creating bed with data:', data);
      const newBed = await apiCreateBed(data);
      console.log('✅ [WardStore] Created bed response:', newBed);
      
      const transformedBed = transformBed(newBed.bed || newBed);
      const beds = get().beds;
      
      set({ 
        beds: [transformedBed, ...beds],
        currentBed: transformedBed,
        isLoading: false 
      });
      
      return transformedBed;
    } catch (error: unknown) {
      console.error('❌ [WardStore] Failed to create bed:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateBed: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedBed = await apiUpdateBed(id, data);
      const transformedBed = transformBed(updatedBed.bed || updatedBed);
      const beds = get().beds.map(bed => 
        (bed.id === id) ? transformedBed : bed
      );
      set({ 
        beds,
        currentBed: transformedBed,
        isLoading: false 
      });
      return transformedBed;
    } catch (error: unknown) {
      console.error('Failed to update bed:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteBed: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteBed(id);
      const beds = get().beds.filter(bed => 
        !(bed.id === id)
      );
      set({ 
        beds,
        currentBed: get().currentBed && 
          (get().currentBed.id === id || get().currentBed.id === id) ? null : get().currentBed,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('Failed to delete bed:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ✅ ADDED MISSING FUNCTION
  getAvailableBeds: async () => {
    set({ isLoading: true });
    try {
      const availableBeds = await apiGetAvailableBeds();
      const transformedBeds = availableBeds.map(transformBed);
      
      set({ 
        availableBeds: transformedBeds,
        isLoading: false 
      });
      
      return transformedBeds;
    } catch (error: unknown) {
      console.error('❌ [WardStore] Failed to fetch available beds:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ✅ ADDED UTILITY FUNCTIONS
  getBedsByWard: (wardId: string) => {
    const { beds } = get();
    return beds.filter(bed => bed.wardId === wardId || bed.ward?.id === wardId);
  },

  getAvailableBedsByWard: (wardId: string) => {
    const { availableBeds } = get();
    return availableBeds.filter(bed => bed.wardId === wardId || bed.ward?.id === wardId);
  },

  clearCurrentWard: () => {
    set({ currentWard: null });
  },

  clearCurrentBed: () => {
    set({ currentBed: null });
  },
}));