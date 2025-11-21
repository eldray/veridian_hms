// src/store/insuranceStore.ts - CLEAN SIMPLIFIED VERSION
import { create } from 'zustand';
import {
  getInsuranceProviders as apiGetInsuranceProviders,
  getInsuranceProvider as apiGetInsuranceProvider,
  createInsuranceProvider as apiCreateInsuranceProvider,
  updateInsuranceProvider as apiUpdateInsuranceProvider,
  deleteInsuranceProvider as apiDeleteInsuranceProvider,
  getInsuranceClaims as apiGetInsuranceClaims,
  getInsuranceClaim as apiGetInsuranceClaim,
  
  // ONLY THE 7 SIMPLIFIED FUNCTIONS WE NEED
  generateClaimDraft as apiGenerateClaimDraft,
  getClaimDraft as apiGetClaimDraft,
  updateClaimDraft as apiUpdateClaimDraft,
  finalizeClaim as apiFinalizeClaim,
  generateClaimXML as apiGenerateClaimXML,
  generateClaimPrint as apiGenerateClaimPrint,
  getFinalizedClaimsTotal as apiGetFinalizedClaimsTotal,
} from '../api';
import type { InsuranceProvider, InsuranceClaim, Pagination } from '../types';

interface InsuranceState {
  providers: InsuranceProvider[];
  claims: InsuranceClaim[];
  currentProvider: InsuranceProvider | null;
  currentClaim: InsuranceClaim | null;
  currentDraft: any | null;
  isLoading: boolean;
  pagination: Pagination | null;
  finalizedClaimsTotal: any;

  // Provider Management
  getInsuranceProviders: (filters?: any) => Promise<void>;
  getInsuranceProvider: (id: string) => Promise<void>;
  createInsuranceProvider: (data: any) => Promise<void>;
  updateInsuranceProvider: (id: string, data: any) => Promise<void>;
  deleteInsuranceProvider: (id: string) => Promise<void>;

  // Claims Management
  getInsuranceClaims: (filters?: any) => Promise<void>;
  getInsuranceClaim: (id: string) => Promise<void>;

  // SIMPLIFIED WORKFLOW (ONLY THESE 7 FUNCTIONS)
  generateClaimDraft: (attendanceId: string) => Promise<InsuranceClaim>;
  getClaimDraft: (claimId: string) => Promise<any>;
  updateClaimDraft: (claimId: string, data: any) => Promise<InsuranceClaim>;
  finalizeClaim: (claimId: string) => Promise<InsuranceClaim>;
  generateClaimXML: (claimId: string) => Promise<void>;
  generateClaimPrint: (claimId: string) => Promise<any>;
  getFinalizedClaimsTotal: (filters?: any) => Promise<void>;

  clearCurrentProvider: () => void;
  clearCurrentClaim: () => void;
  clearCurrentDraft: () => void;
  clearError: () => void;
}

export const useInsuranceStore = create<InsuranceState>((set, get) => ({
  providers: [],
  claims: [],
  currentProvider: null,
  currentClaim: null,
  currentDraft: null,
  isLoading: false,
  pagination: null,
  finalizedClaimsTotal: null,

  // Provider functions (unchanged)...
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

  // SIMPLIFIED WORKFLOW FUNCTIONS (ONLY THESE 7)
  generateClaimDraft: async (attendanceId: string) => {
    set({ isLoading: true });
    try {
      const draft = await apiGenerateClaimDraft(attendanceId);
      set({ 
        currentDraft: draft,
        isLoading: false 
      });
      return draft;
    } catch (error: any) {
      console.error('Failed to generate claim draft:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getClaimDraft: async (claimId: string) => {
    set({ isLoading: true });
    try {
      const draftData = await apiGetClaimDraft(claimId);
      set({ 
        currentDraft: draftData,
        isLoading: false 
      });
      return draftData;
    } catch (error: any) {
      console.error('Failed to fetch claim draft:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateClaimDraft: async (claimId: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedDraft = await apiUpdateClaimDraft(claimId, data);
      set({ 
        currentDraft: updatedDraft,
        isLoading: false 
      });
      return updatedDraft;
    } catch (error: any) {
      console.error('Failed to update claim draft:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  finalizeClaim: async (claimId: string) => {
    set({ isLoading: true });
    try {
      const finalizedClaim = await apiFinalizeClaim(claimId);
      set({ 
        currentDraft: null, // Clear draft after finalizing
        currentClaim: finalizedClaim,
        isLoading: false 
      });
      return finalizedClaim;
    } catch (error: any) {
      console.error('Failed to finalize claim:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  generateClaimXML: async (claimId: string) => {
    try {
      await apiGenerateClaimXML(claimId);
    } catch (error: any) {
      console.error('Failed to generate claim XML:', error);
      throw error;
    }
  },

  generateClaimPrint: async (claimId: string) => {
    set({ isLoading: true });
    try {
      const printData = await apiGenerateClaimPrint(claimId);
      set({ isLoading: false });
      return printData;
    } catch (error: any) {
      console.error('Failed to generate claim print:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getFinalizedClaimsTotal: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const totalData = await apiGetFinalizedClaimsTotal(filters);
      set({ 
        finalizedClaimsTotal: totalData,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch finalized claims total:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  clearCurrentProvider: () => set({ currentProvider: null }),
  clearCurrentClaim: () => set({ currentClaim: null }),
  clearCurrentDraft: () => set({ currentDraft: null }),
  clearError: () => set({ error: null }),
}));