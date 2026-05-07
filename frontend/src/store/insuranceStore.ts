// src/store/insuranceStore.ts - COMPLETE WITH SEPARATE NHIS & PRIVATE FUNCTIONS
import { create } from 'zustand';
import {
  // NHIS Claim Functions
  generateNHISClaim as apiGenerateNHISClaim,
  getNHISClaims as apiGetNHISClaims,
  
  // Private Insurance Claim Functions
  generatePrivateInsuranceClaim as apiGeneratePrivateInsuranceClaim,
  getPrivateInsuranceClaims as apiGetPrivateInsuranceClaims,
  
  // Common Claim Functions
  getInsuranceClaim as apiGetInsuranceClaim,
  updateClaimDraft as apiUpdateClaimDraft,
  finalizeClaim as apiFinalizeClaim,
  generateClaimXML as apiGenerateClaimXML,
  generateClaimPrint as apiGenerateClaimPrint,
  getClaimByAttendanceId as apiGetClaimByAttendanceId,
  
  // Provider Functions
  getInsuranceProviders as apiGetInsuranceProviders,
  getInsuranceProvider as apiGetInsuranceProvider,
  createInsuranceProvider as apiCreateInsuranceProvider,
  updateInsuranceProvider as apiUpdateInsuranceProvider,
  deleteInsuranceProvider as apiDeleteInsuranceProvider,
} from '../api';
import type { InsuranceProvider, InsuranceClaim, Pagination } from '../types';

interface InsuranceState {
  // Data
  nhisClaims: InsuranceClaim[];
  privateClaims: InsuranceClaim[];
  providers: InsuranceProvider[];
  currentClaim: InsuranceClaim | null;
  currentDraft: any | null;
  currentProvider: InsuranceProvider | null;
  
  // UI State
  isLoading: boolean;
  pagination: Pagination | null;
  error: string | null;
  
  // Stats
  nhisStats: {
    total: number;
    draft: number;
    submitted: number;
    approved: number;
    paid: number;
    rejected: number;
    totalAmount: number;
    approvedAmount: number;
    paidAmount: number;
  };
  privateStats: {
    total: number;
    draft: number;
    submitted: number;
    approved: number;
    paid: number;
    rejected: number;
    totalAmount: number;
    approvedAmount: number;
    paidAmount: number;
  };

  // ==========================================
  // NHIS CLAIM FUNCTIONS
  // ==========================================
  getNHISClaims: (filters?: any) => Promise<void>;
  generateNHISClaim: (attendanceId: string) => Promise<any>;
  
  // ==========================================
  // PRIVATE INSURANCE CLAIM FUNCTIONS
  // ==========================================
  getPrivateInsuranceClaims: (filters?: any) => Promise<void>;
  generatePrivateInsuranceClaim: (attendanceId: string) => Promise<any>;
  
  // ==========================================
  // COMMON CLAIM FUNCTIONS
  // ==========================================
  getInsuranceClaim: (id: string) => Promise<void>;
  getClaimByAttendanceId: (attendanceId: string) => Promise<InsuranceClaim | null>;
  updateClaimDraft: (claimId: string, data: any) => Promise<InsuranceClaim>;
  finalizeClaim: (claimId: string) => Promise<InsuranceClaim>;
  generateClaimXML: (claimId: string) => Promise<void>;
  generateClaimPrint: (claimId: string) => Promise<any>;
  
  // ==========================================
  // PROVIDER FUNCTIONS
  // ==========================================
  getInsuranceProviders: (filters?: any) => Promise<void>;
  getInsuranceProvider: (id: string) => Promise<void>;
  createInsuranceProvider: (data: any) => Promise<void>;
  updateInsuranceProvider: (id: string, data: any) => Promise<void>;
  deleteInsuranceProvider: (id: string) => Promise<void>;
  
  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  clearCurrentClaim: () => void;
  clearCurrentDraft: () => void;
  clearCurrentProvider: () => void;
  clearError: () => void;
  
  // Helper to update stats
  updateStats: () => void;
}

// Helper to calculate stats from claims
const calculateStats = (claims: InsuranceClaim[]) => {
  return {
    total: claims.length,
    draft: claims.filter(c => c.status === 'draft').length,
    submitted: claims.filter(c => c.status === 'submitted').length,
    approved: claims.filter(c => c.status === 'approved').length,
    paid: claims.filter(c => c.status === 'paid').length,
    rejected: claims.filter(c => c.status === 'rejected').length,
    totalAmount: claims.reduce((sum, c) => sum + (c.totalClaimAmount || 0), 0),
    approvedAmount: claims.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.approvedAmount || 0), 0),
    paidAmount: claims.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.paidAmount || 0), 0),
  };
};

export const useInsuranceStore = create<InsuranceState>((set, get) => ({
  // Initial state
  nhisClaims: [],
  privateClaims: [],
  providers: [],
  currentClaim: null,
  currentDraft: null,
  currentProvider: null,
  isLoading: false,
  pagination: null,
  error: null,
  nhisStats: {
    total: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
    totalAmount: 0,
    approvedAmount: 0,
    paidAmount: 0,
  },
  privateStats: {
    total: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
    totalAmount: 0,
    approvedAmount: 0,
    paidAmount: 0,
  },

  // ==========================================
  // NHIS CLAIM FUNCTIONS
  // ==========================================
  
  getNHISClaims: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetNHISClaims(filters);
      
      let claims: InsuranceClaim[] = [];
      if (response?.data && Array.isArray(response.data)) {
        claims = response.data;
      } else if (Array.isArray(response)) {
        claims = response;
      } else if (response?.claims && Array.isArray(response.claims)) {
        claims = response.claims;
      }
      
      const nhisStats = calculateStats(claims);
      
      set({ 
        nhisClaims: claims,
        nhisStats,
        pagination: response?.pagination || null,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch NHIS claims:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  generateNHISClaim: async (attendanceId: string) => {
    set({ isLoading: true });
    try {
      const result = await apiGenerateNHISClaim(attendanceId);
      // Refresh NHIS claims list after generation
      await get().getNHISClaims();
      set({ 
        currentClaim: result.data || result,
        currentDraft: result.data || result,
        isLoading: false 
      });
      return result;
    } catch (error: any) {
      console.error('Failed to generate NHIS claim:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  // ==========================================
  // PRIVATE INSURANCE CLAIM FUNCTIONS
  // ==========================================
  
  getPrivateInsuranceClaims: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetPrivateInsuranceClaims(filters);
      
      let claims: InsuranceClaim[] = [];
      if (response?.data && Array.isArray(response.data)) {
        claims = response.data;
      } else if (Array.isArray(response)) {
        claims = response;
      } else if (response?.claims && Array.isArray(response.claims)) {
        claims = response.claims;
      }
      
      const privateStats = calculateStats(claims);
      
      set({ 
        privateClaims: claims,
        privateStats,
        pagination: response?.pagination || null,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch private insurance claims:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  generatePrivateInsuranceClaim: async (attendanceId: string) => {
    set({ isLoading: true });
    try {
      const result = await apiGeneratePrivateInsuranceClaim(attendanceId);
      // Refresh private claims list after generation
      await get().getPrivateInsuranceClaims();
      set({ 
        currentClaim: result.data || result,
        currentDraft: result.data || result,
        isLoading: false 
      });
      return result;
    } catch (error: any) {
      console.error('Failed to generate private insurance claim:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  // ==========================================
  // COMMON CLAIM FUNCTIONS
  // ==========================================
  
  getInsuranceClaim: async (id: string) => {
    set({ isLoading: true });
    try {
      const claim = await apiGetInsuranceClaim(id);
      set({ currentClaim: claim.data || claim, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch insurance claim:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  getClaimByAttendanceId: async (attendanceId: string) => {
    set({ isLoading: true });
    try {
      const response = await apiGetClaimByAttendanceId(attendanceId);
      const claim = response.data || response;
      set({ isLoading: false });
      return claim;
    } catch (error: any) {
      console.error('Failed to fetch claim by attendance:', error);
      set({ isLoading: false });
      return null;
    }
  },

  updateClaimDraft: async (claimId: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedClaim = await apiUpdateClaimDraft(claimId, data);
      const claimData = updatedClaim.data || updatedClaim;
      
      // Update in the appropriate claims array based on type
      const isNHIS = claimData.insuranceProvider?.type === 'nhis';
      
      if (isNHIS) {
        set({
          nhisClaims: get().nhisClaims.map(c => c.id === claimId ? claimData : c),
          nhisStats: calculateStats(get().nhisClaims.map(c => c.id === claimId ? claimData : c)),
        });
      } else {
        set({
          privateClaims: get().privateClaims.map(c => c.id === claimId ? claimData : c),
          privateStats: calculateStats(get().privateClaims.map(c => c.id === claimId ? claimData : c)),
        });
      }
      
      set({ 
        currentDraft: claimData,
        currentClaim: claimData,
        isLoading: false 
      });
      return claimData;
    } catch (error: any) {
      console.error('Failed to update claim draft:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  finalizeClaim: async (claimId: string) => {
    set({ isLoading: true });
    try {
      const finalizedClaim = await apiFinalizeClaim(claimId);
      const claimData = finalizedClaim.data || finalizedClaim;
      
      // Update in the appropriate claims array based on type
      const isNHIS = claimData.insuranceProvider?.type === 'nhis';
      
      if (isNHIS) {
        set({
          nhisClaims: get().nhisClaims.map(c => c.id === claimId ? claimData : c),
          nhisStats: calculateStats(get().nhisClaims.map(c => c.id === claimId ? claimData : c)),
        });
      } else {
        set({
          privateClaims: get().privateClaims.map(c => c.id === claimId ? claimData : c),
          privateStats: calculateStats(get().privateClaims.map(c => c.id === claimId ? claimData : c)),
        });
      }
      
      set({ 
        currentDraft: null,
        currentClaim: claimData,
        isLoading: false 
      });
      return claimData;
    } catch (error: any) {
      console.error('Failed to finalize claim:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  generateClaimXML: async (claimId: string) => {
    set({ isLoading: true });
    try {
      const blob = await apiGenerateClaimXML(claimId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claim_${claimId}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      set({ isLoading: false });
    } catch (error: any) {
      console.error('Failed to generate claim XML:', error);
      set({ isLoading: false, error: error.message });
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
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  // ==========================================
  // PROVIDER FUNCTIONS
  // ==========================================
  
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

      set({ providers, isLoading: false });
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
      set({ currentProvider: provider.data || provider, isLoading: false });
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
        providers: [newProvider.data || newProvider, ...get().providers],
        currentProvider: newProvider.data || newProvider,
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
        providers: get().providers.map(p => p.id === id ? (updatedProvider.data || updatedProvider) : p),
        currentProvider: updatedProvider.data || updatedProvider,
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

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  
  updateStats: () => {
    set({
      nhisStats: calculateStats(get().nhisClaims),
      privateStats: calculateStats(get().privateClaims),
    });
  },

  clearCurrentClaim: () => set({ currentClaim: null }),
  clearCurrentDraft: () => set({ currentDraft: null }),
  clearCurrentProvider: () => set({ currentProvider: null }),
  clearError: () => set({ error: null }),
}));