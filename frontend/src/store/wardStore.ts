// stores/wardStore.ts - FIXED to match backend response structure
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
  getAvailableBeds as apiGetAvailableBeds
} from '../api';
import type { Ward, Bed, Pagination } from '../types';

interface WardState {
  wards: Ward[];
  beds: Bed[];
  availableBeds: Bed[];
  currentWard: Ward | null;
  currentBed: Bed | null;
  isLoading: boolean;
  pagination: Pagination | null;
  
  // Wards
  getWards: (filters?: any) => Promise<void>;
  getWard: (id: string) => Promise<void>;
  createWard: (data: any) => Promise<any>;
  updateWard: (id: string, data: any) => Promise<any>;
  deleteWard: (id: string) => Promise<void>;
  
  // Beds
  getBeds: (filters?: any) => Promise<void>;
  getBed: (id: string) => Promise<void>;
  createBed: (data: any) => Promise<any>;
  updateBed: (id: string, data: any) => Promise<any>;
  deleteBed: (id: string) => Promise<void>;
  
  // Available beds
  getAvailableBeds: () => Promise<Bed[]>;
  
  // Utility
  getBedsByWard: (wardId: string) => Bed[];
  getAvailableBedsByWard: (wardId: string) => Bed[];
  
  clearCurrentWard: () => void;
  clearCurrentBed: () => void;
}

// Transform functions matching your backend response structure
const transformWard = (ward: any): Ward => {
  // Your backend returns data directly, not wrapped in extra layers
  return {
    id: ward.id,
    wardName: ward.wardName,
    wardType: ward.wardType,
    totalBeds: ward.totalBeds,
    occupiedBeds: ward.occupiedBeds,
    isActive: ward.isActive,
    dailyCashRate: ward.dailyCashRate,
    dailyNHISRate: ward.dailyNHISRate,
    dailyInsuranceRate: ward.dailyInsuranceRate,
    vatRate: ward.vatRate,
    isTaxable: ward.isTaxable,
    isNHISCovered: ward.isNHISCovered,
    nhisRequiresAuth: ward.nhisRequiresAuth,
    isPrivateInsExempted: ward.isPrivateInsExempted,
    requiresAuthorization: ward.requiresAuthorization,
    description: ward.description,
    location: ward.location,
    floor: ward.floor,
    createdAt: ward.createdAt,
    updatedAt: ward.updatedAt,
    beds: ward.Bed || ward.beds,
    availableBeds: ward.availableBeds ?? (ward.totalBeds - ward.occupiedBeds),
    occupancyRate: ward.occupancyRate ?? (ward.totalBeds > 0 ? (ward.occupiedBeds / ward.totalBeds) * 100 : 0)
  };
};

const transformBed = (bed: any): Bed => {
  return {
    id: bed.id,
    bedNumber: bed.bedNumber,
    wardId: bed.wardId,
    isOccupied: bed.isOccupied,
    currentPatientId: bed.currentPatientId,
    createdAt: bed.createdAt,
    updatedAt: bed.updatedAt,
    ward: bed.Ward || bed.ward,
    currentPatient: bed.Patient || bed.currentPatient
  };
};

export const useWardStore = create<WardState>((set, get) => ({
  wards: [],
  beds: [],
  availableBeds: [],
  currentWard: null,
  currentBed: null,
  isLoading: false,
  pagination: null,

  // ✅ FIXED: Get wards - handles your backend response format
  getWards: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetWards(filters);
      console.log('🔍 [WardStore] Raw wards response:', response);
      
      // Your backend returns { success, data, message }
      let wardsArray: any[] = [];
      
      if (response?.data && Array.isArray(response.data)) {
        wardsArray = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        wardsArray = response.data.data;
      } else if (Array.isArray(response)) {
        wardsArray = response;
      } else if (response?.wards && Array.isArray(response.wards)) {
        wardsArray = response.wards;
      } else {
        console.warn('Unexpected wards response structure:', response);
        wardsArray = [];
      }

      const transformedWards = wardsArray.map(transformWard);
      console.log('✅ [WardStore] Transformed wards:', transformedWards.length);
      
      set({ 
        wards: transformedWards,
        pagination: response?.pagination || null,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('❌ [WardStore] Failed to fetch wards:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ✅ FIXED: Get available beds - handles your backend response format
  getAvailableBeds: async () => {
    set({ isLoading: true });
    try {
      const response = await apiGetAvailableBeds();
      console.log('🔍 [WardStore] Raw available beds response:', response);
      
      // Your backend returns { success, data: { totalAvailableBeds, availableBeds, byWard } }
      let bedsArray: any[] = [];
      
      if (response?.data?.availableBeds && Array.isArray(response.data.availableBeds)) {
        bedsArray = response.data.availableBeds;
      } else if (response?.data && Array.isArray(response.data)) {
        bedsArray = response.data;
      } else if (response?.availableBeds && Array.isArray(response.availableBeds)) {
        bedsArray = response.availableBeds;
      } else if (Array.isArray(response)) {
        bedsArray = response;
      } else {
        console.warn('Unexpected available beds response structure:', response);
        bedsArray = [];
      }

      const transformedBeds = bedsArray.map(transformBed);
      console.log('✅ [WardStore] Transformed available beds:', transformedBeds.length);
      
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

  // Get single ward
  getWard: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await apiGetWard(id);
      let wardData = response;
      
      if (response?.data) {
        wardData = response.data;
      }
      
      set({ currentWard: transformWard(wardData), isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch ward:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ✅ FIXED: Create ward - handles backend response
  createWard: async (data: any) => {
    set({ isLoading: true });
    try {
      console.log('🔍 [WardStore] Creating ward with data:', data);
      const response = await apiCreateWard(data);
      console.log('✅ [WardStore] Created ward response:', response);
      
      // Your backend returns { success, data, message }
      let wardData = response;
      if (response?.data) {
        wardData = response.data;
      }
      
      const transformedWard = transformWard(wardData);
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

  // Update ward
  updateWard: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const response = await apiUpdateWard(id, data);
      let wardData = response;
      if (response?.data) {
        wardData = response.data;
      }
      
      const transformedWard = transformWard(wardData);
      const wards = get().wards.map(ward => 
        ward.id === id ? transformedWard : ward
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

  // Delete ward
  deleteWard: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteWard(id);
      const wards = get().wards.filter(ward => ward.id !== id);
      set({ 
        wards,
        currentWard: get().currentWard?.id === id ? null : get().currentWard,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('Failed to delete ward:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Get all beds
  getBeds: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetBeds(filters);
      console.log('🔍 [WardStore] Raw beds response:', response);
      
      let bedsArray: any[] = [];
      
      if (response?.data && Array.isArray(response.data)) {
        bedsArray = response.data;
      } else if (response?.data?.beds && Array.isArray(response.data.beds)) {
        bedsArray = response.data.beds;
      } else if (Array.isArray(response)) {
        bedsArray = response;
      } else {
        console.warn('Unexpected beds response structure:', response);
        bedsArray = [];
      }

      const transformedBeds = bedsArray.map(transformBed);
      console.log('✅ [WardStore] Transformed beds:', transformedBeds.length);
      
      set({ 
        beds: transformedBeds,
        pagination: response?.pagination || null,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('❌ [WardStore] Failed to fetch beds:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Get single bed
  getBed: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await apiGetBed(id);
      let bedData = response;
      if (response?.data) {
        bedData = response.data;
      }
      set({ currentBed: transformBed(bedData), isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch bed:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Create bed
  createBed: async (data: any) => {
    set({ isLoading: true });
    try {
      console.log('🔍 [WardStore] Creating bed with data:', data);
      const response = await apiCreateBed(data);
      console.log('✅ [WardStore] Created bed response:', response);
      
      let bedData = response;
      if (response?.data) {
        bedData = response.data;
      }
      
      const transformedBed = transformBed(bedData);
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

  // Update bed
  updateBed: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const response = await apiUpdateBed(id, data);
      let bedData = response;
      if (response?.data) {
        bedData = response.data;
      }
      
      const transformedBed = transformBed(bedData);
      const beds = get().beds.map(bed => 
        bed.id === id ? transformedBed : bed
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

  // Delete bed
  deleteBed: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteBed(id);
      const beds = get().beds.filter(bed => bed.id !== id);
      set({ 
        beds,
        currentBed: get().currentBed?.id === id ? null : get().currentBed,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('Failed to delete bed:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Utility functions
  getBedsByWard: (wardId: string) => {
    const { beds } = get();
    return beds.filter(bed => bed.wardId === wardId);
  },

  getAvailableBedsByWard: (wardId: string) => {
    const { availableBeds } = get();
    return availableBeds.filter(bed => bed.wardId === wardId);
  },

  clearCurrentWard: () => {
    set({ currentWard: null });
  },

  clearCurrentBed: () => {
    set({ currentBed: null });
  },
}));