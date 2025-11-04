// stores/insuranceStore.ts - UPDATED VERSION
import { create } from 'zustand';
import { 
  getInsuranceProviders as apiGetInsuranceProviders,
  getInsuranceProvider as apiGetInsuranceProvider,
  createInsuranceProvider as apiCreateInsuranceProvider,
  updateInsuranceProvider as apiUpdateInsuranceProvider,
  deleteInsuranceProvider as apiDeleteInsuranceProvider,
  getInsuranceClaims as apiGetInsuranceClaims,
  getInsuranceClaim as apiGetInsuranceClaim,
  submitInsuranceClaim as apiSubmitInsuranceClaim,
  updateClaimStatus as apiUpdateClaimStatus,
  generateNHISClaimForm as apiGenerateNHISClaimForm,
  generatePrivateInsuranceClaim as apiGeneratePrivateInsuranceClaim
} from '../api';
import type { InsuranceProvider, InsuranceClaim, Pagination } from '../types';

interface InsuranceState {
  providers: InsuranceProvider[];
  claims: InsuranceClaim[];
  currentProvider: InsuranceProvider | null;
  currentClaim: InsuranceClaim | null;
  isLoading: boolean;
  pagination: Pagination | null;
  
  // Insurance Providers
  getInsuranceProviders: (filters?: any) => Promise<void>;
  getInsuranceProvider: (id: string) => Promise<void>;
  createInsuranceProvider: (data: any) => Promise<void>;
  updateInsuranceProvider: (id: string, data: any) => Promise<void>;
  deleteInsuranceProvider: (id: string) => Promise<void>;
  
  // Insurance Claims
  getInsuranceClaims: (filters?: any) => Promise<void>;
  getInsuranceClaim: (id: string) => Promise<void>;
  submitInsuranceClaim: (data: any) => Promise<void>;
  updateClaimStatus: (id: string, data: any) => Promise<void>;
  generateNHISClaimForm: (attendanceId: string) => Promise<any>;
  generatePrivateInsuranceClaim: (attendanceId: string, insuranceProviderId: string) => Promise<any>;
  
  clearCurrentProvider: () => void;
  clearCurrentClaim: () => void;
}

export const useInsuranceStore = create<InsuranceState>((set, get) => ({
  providers: [],
  claims: [],
  currentProvider: null,
  currentClaim: null,
  isLoading: false,
  pagination: null,

  // Insurance Providers - SIMPLIFIED VERSION
  getInsuranceProviders: async (filters = {}) => {
    set({ isLoading: true });
    try {
      console.log('🔄 Fetching insurance providers...');
      const response = await apiGetInsuranceProviders(filters);
      console.log('📦 Raw API response:', response);
      
      // SIMPLIFIED: Just use whatever comes back from the API
      let providers: InsuranceProvider[] = [];
      
      if (Array.isArray(response)) {
        providers = response;
      } else if (response && typeof response === 'object') {
        // Try different possible property names
        if (Array.isArray(response.data)) {
          providers = response.data;
        } else if (Array.isArray(response.providers)) {
          providers = response.providers;
        } else if (Array.isArray(response.insuranceProviders)) {
          providers = response.insuranceProviders;
        } else if (response.success && Array.isArray(response.data)) {
          providers = response.data;
        } else {
          // If it's an object but we can't find an array, log it and try to use the object itself as a single provider
          console.warn('Unexpected insurance providers response format:', response);
          // Check if it might be a single provider object
          if (response._id || response.id) {
            providers = [response];
          }
        }
      }
      
      console.log('✅ Processed providers:', providers);
      
      set({ 
        providers,
        pagination: response?.pagination || null,
        isLoading: false 
      });
    } catch (error) {
      console.error('❌ Failed to fetch insurance providers:', error);
      set({ 
        providers: [],
        isLoading: false 
      });
      throw error;
    }
  },

  getInsuranceProvider: async (id: string) => {
    set({ isLoading: true });
    try {
      const provider = await apiGetInsuranceProvider(id);
      set({ currentProvider: provider, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch insurance provider:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createInsuranceProvider: async (data: any) => {
    set({ isLoading: true });
    try {
      const newProvider = await apiCreateInsuranceProvider(data);
      const providers = get().providers;
      set({ 
        providers: [newProvider, ...providers],
        currentProvider: newProvider,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to create insurance provider:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateInsuranceProvider: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedProvider = await apiUpdateInsuranceProvider(id, data);
      const providers = get().providers.map(provider => 
        provider._id === id ? updatedProvider : provider
      );
      set({ 
        providers,
        currentProvider: updatedProvider,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update insurance provider:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteInsuranceProvider: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteInsuranceProvider(id);
      const providers = get().providers.filter(provider => provider._id !== id);
      set({ 
        providers,
        currentProvider: get().currentProvider?._id === id ? null : get().currentProvider,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to delete insurance provider:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ... rest of the methods remain the same
  getInsuranceClaims: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetInsuranceClaims(filters);
      
      let claims: InsuranceClaim[] = [];
      
      if (Array.isArray(response)) {
        claims = response;
      } else if (response?.data && Array.isArray(response.data)) {
        claims = response.data;
      } else if (response?.claims && Array.isArray(response.claims)) {
        claims = response.claims;
      } else if (response?.insuranceClaims && Array.isArray(response.insuranceClaims)) {
        claims = response.insuranceClaims;
      } else {
        console.warn('Unexpected insurance claims response format:', response);
        claims = [];
      }
      
      set({ 
        claims,
        pagination: response?.pagination || null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch insurance claims:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getInsuranceClaim: async (id: string) => {
    set({ isLoading: true });
    try {
      const claim = await apiGetInsuranceClaim(id);
      set({ currentClaim: claim, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch insurance claim:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  submitInsuranceClaim: async (data: any) => {
    set({ isLoading: true });
    try {
      const newClaim = await apiSubmitInsuranceClaim(data);
      const claims = get().claims;
      set({ 
        claims: [newClaim, ...claims],
        currentClaim: newClaim,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to submit insurance claim:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateClaimStatus: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedClaim = await apiUpdateClaimStatus(id, data);
      const claims = get().claims.map(claim => 
        claim._id === id ? updatedClaim : claim
      );
      set({ 
        claims,
        currentClaim: updatedClaim,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update claim status:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  generateNHISClaimForm: async (attendanceId: string) => {
    set({ isLoading: true });
    try {
      const claimForm = await apiGenerateNHISClaimForm(attendanceId);
      set({ isLoading: false });
      return claimForm;
    } catch (error) {
      console.error('Failed to generate NHIS claim form:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  generatePrivateInsuranceClaim: async (attendanceId: string, insuranceProviderId: string) => {
    set({ isLoading: true });
    try {
      const claimForm = await apiGeneratePrivateInsuranceClaim(attendanceId, insuranceProviderId);
      set({ isLoading: false });
      return claimForm;
    } catch (error) {
      console.error('Failed to generate private insurance claim form:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  clearCurrentProvider: () => {
    set({ currentProvider: null });
  },

  clearCurrentClaim: () => {
    set({ currentClaim: null });
  },
}));
