// src/store/insuranceStore.ts - COMPLETE UPDATED VERSION
import { create } from 'zustand';
import {
  // NHIS Claim Functions
  generateNHISClaim as apiGenerateNHISClaim,
  getNHISClaims as apiGetNHISClaims,
  
  // Private Insurance Claim Functions
  generatePrivateInsuranceClaim as apiGeneratePrivateInsuranceClaim,
  getPrivateInsuranceClaims as apiGetPrivateInsuranceClaims,
  
  // Common Claim Functions
  getInsuranceClaims as apiGetInsuranceClaims,
  getInsuranceClaim as apiGetInsuranceClaim,
  getClaimByEncounterId as apiGetClaimByAttendanceId,
 // updateClaimDraft as apiUpdateClaimDraft,
  updateInsuranceClaim as apiUpdateInsuranceClaim, 
  finalizeClaim as apiFinalizeClaim,
  updateClaimStatus as apiUpdateClaimStatus,
  generateClaimXML as apiGenerateClaimXML,
  generateClaimPrint as apiGenerateClaimPrint,
  getFinalizedClaimsTotal as apiGetFinalizedClaimsTotal,
  
  // Batch Claim Functions
  createClaimBatch as apiCreateClaimBatch,
  getClaimBatches as apiGetClaimBatches,
  getClaimBatch as apiGetClaimBatch,
  addClaimsToBatch as apiAddClaimsToBatch,
  removeClaimsFromBatch as apiRemoveClaimsFromBatch,
  generateBatchXML as apiGenerateBatchXML,
  updateBatchStatus as apiUpdateBatchStatus,
  deleteClaimBatch as apiDeleteClaimBatch,
  
  // Provider Functions
  getInsuranceProviders as apiGetInsuranceProviders,
  getInsuranceProvider as apiGetInsuranceProvider,
  createInsuranceProvider as apiCreateInsuranceProvider,
  updateInsuranceProvider as apiUpdateInsuranceProvider,
  deleteInsuranceProvider as apiDeleteInsuranceProvider,
} from '../api';
import type { InsuranceProvider, InsuranceClaim, Pagination } from '../types';

interface Batch {
  id: string;
  batchNumber: string;
  batchDate: string;
  description: string | null;
  totalAmount: number;
  status: string;
  claims: InsuranceClaim[];
  createdBy: { fullName: string; username: string };
  createdAt: string;
}

interface InsuranceState {
  // Data
  nhisClaims: InsuranceClaim[];
  privateClaims: InsuranceClaim[];
  allClaims: InsuranceClaim[];
  providers: InsuranceProvider[];
  batches: Batch[];
  currentClaim: InsuranceClaim | null;
  currentDraft: any | null;
  currentBatch: Batch | null;
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
  finalizedClaimsTotal: {
    total: number;
    totalAmount: number;
    claims: any[];
  } | null;

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
  getInsuranceClaims: (filters?: any) => Promise<void>;
  getInsuranceClaim: (id: string) => Promise<void>;
  getClaimByAttendanceId: (attendanceId: string) => Promise<InsuranceClaim | null>;
  updateClaimDraft: (claimId: string, data: any) => Promise<InsuranceClaim>;
  finalizeClaim: (claimId: string) => Promise<InsuranceClaim>;
  updateClaimStatus: (claimId: string, status: string, notes?: string) => Promise<InsuranceClaim>;
  generateClaimXML: (claimId: string) => Promise<void>;
  generateClaimPrint: (claimId: string) => Promise<any>;
  getFinalizedClaimsTotal: (filters?: any) => Promise<void>;
  
  // ==========================================
  // BATCH CLAIM FUNCTIONS
  // ==========================================
  createClaimBatch: (claimIds: string[], description?: string, insuranceType?: string) => Promise<Batch>;
  getClaimBatches: (filters?: any) => Promise<void>;
  getClaimBatch: (id: string) => Promise<Batch | null>;
  addClaimsToBatch: (batchId: string, claimIds: string[]) => Promise<Batch>;
  removeClaimsFromBatch: (batchId: string, claimIds: string[]) => Promise<Batch>;
  generateBatchXML: (batchId: string) => Promise<void>;
  updateBatchStatus: (batchId: string, status: string) => Promise<Batch>;
  deleteClaimBatch: (batchId: string) => Promise<void>;
  
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
  clearCurrentBatch: () => void;
  clearCurrentProvider: () => void;
  clearError: () => void;
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
  allClaims: [],
  providers: [],
  batches: [],
  currentClaim: null,
  currentDraft: null,
  currentBatch: null,
  currentProvider: null,
  isLoading: false,
  pagination: null,
  error: null,
  finalizedClaimsTotal: null,
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
    } catch (error: unknown) {
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
      await get().getInsuranceClaims();
      set({ 
        currentClaim: result.data || result,
        currentDraft: result.data || result,
        isLoading: false 
      });
      return result;
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
      await get().getInsuranceClaims();
      set({ 
        currentClaim: result.data || result,
        currentDraft: result.data || result,
        isLoading: false 
      });
      return result;
    } catch (error: unknown) {
      console.error('Failed to generate private insurance claim:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  // ==========================================
  // COMMON CLAIM FUNCTIONS
  // ==========================================
  
  getInsuranceClaims: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetInsuranceClaims(filters);
      
      let claims: InsuranceClaim[] = [];
      if (response?.data && Array.isArray(response.data)) {
        claims = response.data;
      } else if (Array.isArray(response)) {
        claims = response;
      } else if (response?.claims && Array.isArray(response.claims)) {
        claims = response.claims;
      }
      
      set({ 
        allClaims: claims,
        pagination: response?.pagination || null,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('Failed to fetch insurance claims:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  getInsuranceClaim: async (id: string) => {
    set({ isLoading: true });
    try {
      const claim = await apiGetInsuranceClaim(id);
      set({ currentClaim: claim.data || claim, isLoading: false });
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
      
      // Also update allClaims
      set({
        allClaims: get().allClaims.map(c => c.id === claimId ? claimData : c),
        currentDraft: claimData,
        currentClaim: claimData,
        isLoading: false 
      });
      return claimData;
    } catch (error: unknown) {
      console.error('Failed to update claim draft:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

// In insuranceStore.ts - replace the updateInsuranceClaim function

updateInsuranceClaim: async (claimId: string, data: any) => {
  set({ isLoading: true });
  try {
    // Call the API function that uses PATCH to /draft endpoint
    const response = await apiUpdateInsuranceClaim(claimId, data);
    const claimData = response.data || response;
    
    // Update the claim in the store
    set(state => ({
      currentClaim: claimData,
      allClaims: state.allClaims.map(c => c.id === claimId ? claimData : c),
      nhisClaims: state.nhisClaims.map(c => c.id === claimId ? claimData : c),
      privateClaims: state.privateClaims.map(c => c.id === claimId ? claimData : c),
      isLoading: false
    }));
    
    return claimData;
  } catch (error: unknown) {
    console.error('Failed to update claim:', error);
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
      
      // Also update allClaims
      set({
        allClaims: get().allClaims.map(c => c.id === claimId ? claimData : c),
        currentDraft: null,
        currentClaim: claimData,
        isLoading: false 
      });
      return claimData;
    } catch (error: unknown) {
      console.error('Failed to finalize claim:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  updateClaimStatus: async (claimId: string, status: string, notes?: string) => {
    set({ isLoading: true });
    try {
      const updatedClaim = await apiUpdateClaimStatus(claimId, { status, notes });
      const claimData = updatedClaim.data || updatedClaim;
      
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
        allClaims: get().allClaims.map(c => c.id === claimId ? claimData : c),
        currentClaim: claimData,
        isLoading: false 
      });
      return claimData;
    } catch (error: unknown) {
      console.error('Failed to update claim status:', error);
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error('Failed to generate claim print:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  getFinalizedClaimsTotal: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetFinalizedClaimsTotal(filters);
      set({ 
        finalizedClaimsTotal: response.data || response,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('Failed to fetch finalized claims total:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  // ==========================================
  // BATCH CLAIM FUNCTIONS
  // ==========================================
  
  createClaimBatch: async (claimIds: string[], description?: string, insuranceType?: string) => {
    set({ isLoading: true });
    try {
      const batch = await apiCreateClaimBatch({ claimIds, description, insuranceType });
      const batchData = batch.data || batch;
      set({ 
        batches: [batchData, ...get().batches],
        currentBatch: batchData,
        isLoading: false 
      });
      // Refresh claims list to update batchId
      await get().getInsuranceClaims();
      return batchData;
    } catch (error: unknown) {
      console.error('Failed to create claim batch:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  getClaimBatches: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetClaimBatches(filters);
      let batches: Batch[] = [];
      if (response?.data && Array.isArray(response.data)) {
        batches = response.data;
      } else if (Array.isArray(response)) {
        batches = response;
      } else if (response?.batches && Array.isArray(response.batches)) {
        batches = response.batches;
      }
      set({ 
        batches,
        pagination: response?.pagination || null,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('Failed to fetch claim batches:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  getClaimBatch: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await apiGetClaimBatch(id);
      const batch = response.data || response;
      set({ 
        currentBatch: batch,
        isLoading: false 
      });
      return batch;
    } catch (error: unknown) {
      console.error('Failed to fetch claim batch:', error);
      set({ isLoading: false, error: error.message });
      return null;
    }
  },

  addClaimsToBatch: async (batchId: string, claimIds: string[]) => {
    set({ isLoading: true });
    try {
      const batch = await apiAddClaimsToBatch(batchId, claimIds);
      const batchData = batch.data || batch;
      set({ 
        batches: get().batches.map(b => b.id === batchId ? batchData : b),
        currentBatch: batchData,
        isLoading: false 
      });
      await get().getInsuranceClaims();
      return batchData;
    } catch (error: unknown) {
      console.error('Failed to add claims to batch:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  removeClaimsFromBatch: async (batchId: string, claimIds: string[]) => {
    set({ isLoading: true });
    try {
      const batch = await apiRemoveClaimsFromBatch(batchId, claimIds);
      const batchData = batch.data || batch;
      set({ 
        batches: get().batches.map(b => b.id === batchId ? batchData : b),
        currentBatch: batchData,
        isLoading: false 
      });
      await get().getInsuranceClaims();
      return batchData;
    } catch (error: unknown) {
      console.error('Failed to remove claims from batch:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  generateBatchXML: async (batchId: string) => {
    set({ isLoading: true });
    try {
      const blob = await apiGenerateBatchXML(batchId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_${batchId}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      set({ isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to generate batch XML:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  updateBatchStatus: async (batchId: string, status: string) => {
    set({ isLoading: true });
    try {
      const batch = await apiUpdateBatchStatus(batchId, status);
      const batchData = batch.data || batch;
      set({ 
        batches: get().batches.map(b => b.id === batchId ? batchData : b),
        currentBatch: batchData,
        isLoading: false 
      });
      return batchData;
    } catch (error: unknown) {
      console.error('Failed to update batch status:', error);
      set({ isLoading: false, error: error.message });
      throw error;
    }
  },

  deleteClaimBatch: async (batchId: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteClaimBatch(batchId);
      set({ 
        batches: get().batches.filter(b => b.id !== batchId),
        currentBatch: get().currentBatch?.id === batchId ? null : get().currentBatch,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('Failed to delete claim batch:', error);
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
      
      // ✅ Handle different response structures
      let providers: InsuranceProvider[] = [];
  
      if (Array.isArray(response)) {
        providers = response;
      } else if (response?.data && Array.isArray(response.data)) {
        providers = response.data;  // ← Extract from response.data
      } else if (response?.providers && Array.isArray(response.providers)) {
        providers = response.providers;
      }
  
      console.log('Providers loaded:', providers.length);
      set({ providers, isLoading: false });
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error('Failed to create insurance provider:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateInsuranceProvider: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const response = await apiUpdateInsuranceProvider(id, data);
      
      // ✅ Extract the provider from the nested response
      const providerData = response.data || response;
      
      // ✅ Ensure we have the updated isActive value
      console.log(`Provider ${providerData.name} isActive:`, providerData.isActive);
      
      set(state => ({
        providers: state.providers.map(p => p.id === id ? { ...p, ...providerData } : p),
        currentProvider: { ...state.currentProvider, ...providerData },
        isLoading: false
      }));
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
  clearCurrentBatch: () => set({ currentBatch: null }),
  clearCurrentProvider: () => set({ currentProvider: null }),
  clearError: () => set({ error: null }),
}));