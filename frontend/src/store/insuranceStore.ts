// src/store/insuranceStore.ts - UPDATED WITH ALL API FUNCTIONS
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
  // ✅ ADDED MISSING IMPORTS
  generateNHISClaim as apiGenerateNHISClaim,
  generateNHISClaimForm as apiGenerateNHISClaimForm,
  submitNHISClaim as apiSubmitNHISClaim,
  downloadNHISClaimXML as apiDownloadNHISClaimXML,
  getNHISClaimSummary as apiGetNHISClaimSummary,
  getClaimByAttendanceId as apiGetClaimByAttendanceId,
  createInsuranceClaimForAttendance as apiCreateInsuranceClaimForAttendance,
  generateInsuranceClaimData as apiGenerateInsuranceClaimData,
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
  nhisClaimSummary: any; // ✅ ADDED

  // Provider Management
  getInsuranceProviders: (filters?: any) => Promise<void>;
  getInsuranceProvider: (id: string) => Promise<void>;
  createInsuranceProvider: (data: any) => Promise<void>;
  updateInsuranceProvider: (id: string, data: any) => Promise<void>;
  deleteInsuranceProvider: (id: string) => Promise<void>;

  // Claims Management
  getInsuranceClaims: (filters?: any) => Promise<void>;
  getInsuranceClaim: (id: string) => Promise<void>;
  submitInsuranceClaim: (data: any) => Promise<void>;
  updateClaimStatus: (id: string, data: any) => Promise<void>;

  // ✅ ADDED MISSING FUNCTIONS
  // NHIS Claims
  generateNHISClaimForm: (attendanceId: string) => Promise<any>;
  submitNHISClaim: (attendanceId: string, data: any) => Promise<any>;
  downloadNHISClaimXML: (attendanceId: string) => Promise<void>;
  getNHISClaimSummary: (filters?: any) => Promise<void>;

  // Attendance-based Claims
  getClaimByAttendanceId: (attendanceId: string) => Promise<InsuranceClaim | null>;
  createInsuranceClaimForAttendance: (attendanceId: string, data: any) => Promise<InsuranceClaim>;
  generateInsuranceClaimData: (attendanceId: string) => Promise<any>;

  // Claim Generation
  generateNHISClaim: (attendanceId: string) => Promise<any>;
  generatePrivateInsuranceClaim: (attendanceId: string, insuranceProviderId: string) => Promise<any>;

  clearCurrentProvider: () => void;
  clearCurrentClaim: () => void;
  clearError: () => void; // ✅ ADDED
}

export const useInsuranceStore = create<InsuranceState>((set, get) => ({
  providers: [],
  claims: [],
  currentProvider: null,
  currentClaim: null,
  isLoading: false,
  pagination: null,
  nhisClaimSummary: null, // ✅ ADDED

  getInsuranceProviders: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetInsuranceProviders(filters);
      let providers: InsuranceProvider[] = [];

      if (Array.isArray(response)) {
        providers = response;
      } else if (response?.data && Array.isArray(response.data)) {
        providers = response.data;
      } else if (response?.providers && Array.isArray(response.providers)) {
        providers = response.providers;
      }

      set({
        providers,
        pagination: response?.pagination || null,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to fetch insurance providers:', error);
      set({ providers: [], isLoading: false });
      throw error;
    }
  },

  getInsuranceProvider: async (id: string) => {
    set({ isLoading: true });
    try {
      const provider = await apiGetInsuranceProvider(id);
      set({ currentProvider: provider, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch insurance provider:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createInsuranceProvider: async (data: any) => {
    set({ isLoading: true });
    try {
      const newProvider = await apiCreateInsuranceProvider(data);
      set({
        providers: [newProvider, ...get().providers],
        currentProvider: newProvider,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to create insurance provider:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateInsuranceProvider: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedProvider = await apiUpdateInsuranceProvider(id, data);
      set({
        providers: get().providers.map(p => p.id === id ? updatedProvider : p),
        currentProvider: updatedProvider,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to update insurance provider:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteInsuranceProvider: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteInsuranceProvider(id);
      set({
        providers: get().providers.filter(p => p.id !== id),
        currentProvider: get().currentProvider?.id === id ? null : get().currentProvider,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to delete insurance provider:', error);
      set({ isLoading: false });
      throw error;
    }
  },

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
      }

      set({
        claims,
        pagination: response?.pagination || null,
        isLoading: false
      });
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('Failed to fetch insurance claim:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  submitInsuranceClaim: async (data: any) => {
    set({ isLoading: true });
    try {
      const newClaim = await apiSubmitInsuranceClaim(data);
      set({
        claims: [newClaim, ...get().claims],
        currentClaim: newClaim,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to submit insurance claim:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateClaimStatus: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedClaim = await apiUpdateClaimStatus(id, data);
      set({
        claims: get().claims.map(c => c.id === id ? updatedClaim : c),
        currentClaim: updatedClaim,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to update claim status:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ✅ ADDED MISSING FUNCTIONS
  generateNHISClaimForm: async (attendanceId: string) => {
    set({ isLoading: true });
    try {
      const claimForm = await apiGenerateNHISClaimForm(attendanceId);
      set({ isLoading: false });
      return claimForm;
    } catch (error: any) {
      console.error('Failed to generate NHIS claim form:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  submitNHISClaim: async (attendanceId: string, data: any) => {
    set({ isLoading: true });
    try {
      const result = await apiSubmitNHISClaim(attendanceId, data);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      console.error('Failed to submit NHIS claim:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  downloadNHISClaimXML: async (attendanceId: string) => {
    try {
      await apiDownloadNHISClaimXML(attendanceId);
    } catch (error: any) {
      console.error('Failed to download NHIS claim XML:', error);
      throw error;
    }
  },

  getNHISClaimSummary: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const summary = await apiGetNHISClaimSummary(filters);
      set({ nhisClaimSummary: summary, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch NHIS claim summary:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getClaimByAttendanceId: async (attendanceId: string) => {
    try {
      const claim = await apiGetClaimByAttendanceId(attendanceId);
      return claim;
    } catch (error: any) {
      console.error('Failed to fetch claim by attendance ID:', error);
      return null;
    }
  },

  createInsuranceClaimForAttendance: async (attendanceId: string, data: any) => {
    set({ isLoading: true });
    try {
      const newClaim = await apiCreateInsuranceClaimForAttendance(attendanceId, data);
      set({
        claims: [newClaim, ...get().claims],
        currentClaim: newClaim,
        isLoading: false
      });
      return newClaim;
    } catch (error: any) {
      console.error('Failed to create insurance claim for attendance:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  generateInsuranceClaimData: async (attendanceId: string) => {
    set({ isLoading: true });
    try {
      const claimData = await apiGenerateInsuranceClaimData(attendanceId);
      set({ isLoading: false });
      return claimData;
    } catch (error: any) {
      console.error('Failed to generate insurance claim data:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Claim Generation Methods (FIXED)
  generateNHISClaim: async (attendanceId: string) => {
    set({ isLoading: true });
    try {
      const response = await apiGenerateNHISClaim(attendanceId);
      set({ isLoading: false });
      return response;
    } catch (error: any) {
      console.error('Failed to generate NHIS claim:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  generatePrivateInsuranceClaim: async (attendanceId: string, insuranceProviderId: string) => {
    set({ isLoading: true });
    try {
      const response = await apiGeneratePrivateInsuranceClaim(attendanceId, insuranceProviderId);
      set({ isLoading: false });
      return response;
    } catch (error: any) {
      console.error('Failed to generate private insurance claim:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  clearCurrentProvider: () => set({ currentProvider: null }),
  clearCurrentClaim: () => set({ currentClaim: null }),
  clearError: () => set({ error: null }), // ✅ ADDED
}));