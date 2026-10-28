// src/store/insuranceStore.ts - FIXED
import { create } from 'zustand';
import {
  generateNHISClaim as apiGenerateNHISClaim,
  getNHISClaims as apiGetNHISClaims,

  generatePrivateInsuranceClaim as apiGeneratePrivateInsuranceClaim,
  getPrivateInsuranceClaims as apiGetPrivateInsuranceClaims,

  getInsuranceClaims as apiGetInsuranceClaims,
  getInsuranceClaim as apiGetInsuranceClaim,
  getClaimByEncounterId as apiGetClaimByAttendanceId,
  updateClaimDraft as apiUpdateClaimDraft,
  replaceClaimItems as apiReplaceClaimItems,
  finalizeClaim as apiFinalizeClaim,
  getClaimsSummary as apiGetClaimsSummary,
  downloadClaimXml as apiDownloadClaimXml,
  generateClaimPrint as apiGenerateClaimPrint,

  getCorporateClaims as apiGetCorporateClaims,
  generateCorporateClaim as apiGenerateCorporateClaim,

  generateClaimBatch as apiGenerateClaimBatch,
  getClaimBatches as apiGetClaimBatches,
  getClaimBatch as apiGetClaimBatch,
  finalizeClaimBatch as apiFinalizeClaimBatch,
  deleteClaimBatch as apiDeleteClaimBatch,
  downloadBatchXml as apiDownloadBatchXml,
  printClaimBatch as apiPrintClaimBatch,
  getClaimBatchEligibility as apiGetClaimBatchEligibility,
  getClaimPeriodClaims as apiGetClaimPeriodClaims,

  getInsuranceProviders as apiGetInsuranceProviders,
  getInsuranceProvider as apiGetInsuranceProvider,
  createInsuranceProvider as apiCreateInsuranceProvider,
  updateInsuranceProvider as apiUpdateInsuranceProvider,
  toggleInsuranceProviderStatus as apiToggleInsuranceProviderStatus,
  deleteInsuranceProvider as apiDeleteInsuranceProvider,
} from '../api';
import type { InsuranceProvider, InsuranceClaim, ClaimBatch, Pagination } from '../types';
import type { BatchEligibility, PeriodClaimRow } from '../api';

interface ClaimStats {
  total: number;
  draft: number;
  finalized: number;
  totalAmount: number;
  finalizedAmount: number;
}

interface ClaimSummary {
  draft: { count: number; totalAmount: number };
  finalized: { count: number; totalAmount: number };
}

/** Legacy shape exposed for pages that still read `finalizedClaimsTotal`. */
interface FinalizedClaimsTotal {
  total: number;
  totalAmount: number;
}

interface BatchSummary {
  batches: number;
  claims: number;
  amount: number;
}

interface PeriodClaimsState {
  rows: PeriodClaimRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
  totals: {
    claims: number;
    amount: number;
    byStatus: Record<string, { count: number; amount: number }>;
    batchable: { count: number; amount: number };
  };
}

interface InsuranceState {
  nhisClaims: InsuranceClaim[];
  privateClaims: InsuranceClaim[];
  corporateClaims: InsuranceClaim[];
  allClaims: InsuranceClaim[];

  providers: InsuranceProvider[];
  batches: ClaimBatch[];

  currentClaim: InsuranceClaim | null;
  currentDraft: InsuranceClaim | null;
  currentBatch: ClaimBatch | null;
  currentProvider: InsuranceProvider | null;

  isLoading: boolean;
  pagination: Pagination | null;
  error: string | null;

  nhisStats: ClaimStats;
  privateStats: ClaimStats;
  summary: ClaimSummary | null;
  /** Legacy mirror of summary.finalized for old callers. */
  finalizedClaimsTotal: FinalizedClaimsTotal | null;
  /** Totals for the whole batch filter, straight from the server — not just the loaded page. */
  batchSummary: BatchSummary | null;
  /** The claims of the selected month and that month's totals. */
  periodClaims: PeriodClaimsState | null;

  // Claims
  getNHISClaims: (filters?: any) => Promise<void>;
  generateNHISClaim: (attendanceId: string) => Promise<InsuranceClaim>;

  getPrivateInsuranceClaims: (filters?: any) => Promise<void>;
  generatePrivateInsuranceClaim: (attendanceId: string) => Promise<InsuranceClaim>;

  getCorporateClaims: (filters?: any) => Promise<void>;
  generateCorporateClaim: (attendanceId: string) => Promise<InsuranceClaim>;

  getInsuranceClaims: (filters?: any) => Promise<void>;
  getInsuranceClaim: (id: string) => Promise<InsuranceClaim>;
  getClaimByAttendanceId: (attendanceId: string) => Promise<InsuranceClaim | null>;
  updateClaimDraft: (claimId: string, data: any) => Promise<InsuranceClaim>;
  replaceClaimItems: (claimId: string, items: any[]) => Promise<InsuranceClaim>;
  finalizeClaim: (claimId: string) => Promise<InsuranceClaim>;

  downloadClaimXml: (claimId: string) => Promise<void>;
  printClaim: (claimId: string) => Promise<void>;
  /** Backward-compat aliases. */
  generateClaimXML: (claimId: string) => Promise<void>;
  generateClaimPrint: (claimId: string) => Promise<void>;

  getClaimsSummary: (insuranceType?: 'nhis' | 'private' | 'corporate') => Promise<void>;
  /** Legacy alias → getClaimsSummary. Accepts { type } or a bare type string. */
  getFinalizedClaimsTotal: (
    input?: 'nhis' | 'private' | 'corporate' | { type?: 'nhis' | 'private' | 'corporate' }
  ) => Promise<void>;

  // Batches
  generateClaimBatch: (input: {
    insuranceType: 'nhis' | 'private' | 'corporate';
    periodYear: number;
    periodMonth: number;
    insuranceProviderId?: string;
    corporateAccountId?: string;
    description?: string;
  }) => Promise<ClaimBatch>;
  getClaimBatches: (filters?: any) => Promise<void>;
  getClaimBatch: (id: string) => Promise<ClaimBatch | null>;
  finalizeClaimBatch: (batchId: string) => Promise<ClaimBatch>;
  deleteClaimBatch: (batchId: string) => Promise<void>;
  downloadBatchXml: (batchId: string) => Promise<void>;
  printBatch: (batchId: string) => Promise<void>;
  /**
   * What one month holds per insurance type. The server answers it with the same query that
   * fills a batch, so the number shown is the batch that gets built.
   */
  getEligibleClaimsForBatch: (params: {
    periodYear: number;
    periodMonth: number;
    insuranceProviderId?: string;
    corporateAccountId?: string;
  }) => Promise<BatchEligibility>;
  /** The claims of one month — batched or not — with that month's totals. */
  getPeriodClaims: (params: {
    periodYear: number;
    periodMonth: number;
    insuranceType?: string;
    batched?: string;
    page?: number;
    limit?: number;
  }) => Promise<void>;

  // Providers
  getInsuranceProviders: (filters?: any) => Promise<void>;
  getInsuranceProvider: (id: string) => Promise<void>;
  createInsuranceProvider: (data: any) => Promise<void>;
  updateInsuranceProvider: (id: string, data: any) => Promise<void>;
  toggleInsuranceProviderStatus: (id: string) => Promise<void>;
  deleteInsuranceProvider: (id: string) => Promise<void>;

  // Utilities
  clearCurrentClaim: () => void;
  clearCurrentDraft: () => void;
  clearCurrentBatch: () => void;
  clearCurrentProvider: () => void;
  clearError: () => void;
  updateStats: () => void;
}

const normalizeClaim = (claim: any): InsuranceClaim => {
  if (!claim) return claim;
  return {
    ...claim,
    InsuranceProvider: claim.InsuranceProvider ?? claim.insuranceProvider,
    Patient: claim.Patient ?? claim.patient,
    Attendance: claim.Attendance ?? claim.attendance,
    Bill: claim.Bill ?? claim.bill,
    CorporateAccount: claim.CorporateAccount ?? claim.corporateAccount,
    totalClaimAmount: Number(claim.totalClaimAmount) || 0,
    items: (claim.items ?? []).map((i: any) => ({
      ...i,
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unitPrice) || 0,
      lineTotal: Number(i.lineTotal) || 0,
    })),
  };
};

/** Some controllers return `{ claim, ... }`, others return the claim directly. */
const unwrapClaim = (raw: any): any => raw?.claim ?? raw;

const normalizeBatch = (b: any): ClaimBatch => {
  if (!b) return b;
  return {
    ...b,
    totalAmount: Number(b.totalAmount) || 0,
    totalClaims: Number(b.totalClaims) || 0,
    claims: b.claims ? b.claims.map(normalizeClaim) : undefined,
  };
};

/**
 * Claim lifecycle is draft → finalized (the ClaimStatus enum). This file used to say the second
 * state was "submitted", and screens written against that asked the API for status=submitted —
 * which is not an empty result but an invalid enum value the request is rejected over. Both
 * labels are counted so legacy rows that carry it still add up.
 */
const calculateStats = (claims: InsuranceClaim[]): ClaimStats => {
  const draft = claims.filter((c) => c.status === 'draft');
  const finalized = claims.filter((c) => c.status === 'submitted' || c.status === 'finalized');
  return {
    total: claims.length,
    draft: draft.length,
    finalized: finalized.length,
    totalAmount: claims.reduce((s, c) => s + Number(c.totalClaimAmount || 0), 0),
    finalizedAmount: finalized.reduce((s, c) => s + Number(c.totalClaimAmount || 0), 0),
  };
};

const extractClaims = (response: any): InsuranceClaim[] => {
  if (Array.isArray(response)) return response.map(normalizeClaim);
  if (Array.isArray(response?.data)) return response.data.map(normalizeClaim);
  if (Array.isArray(response?.data?.data)) return response.data.data.map(normalizeClaim);
  if (Array.isArray(response?.claims)) return response.claims.map(normalizeClaim);
  return [];
};

const extractBatches = (response: any): ClaimBatch[] => {
  if (Array.isArray(response)) return response.map(normalizeBatch);
  if (Array.isArray(response?.data)) return response.data.map(normalizeBatch);
  if (Array.isArray(response?.data?.data)) return response.data.data.map(normalizeBatch);
  if (Array.isArray(response?.batches)) return response.batches.map(normalizeBatch);
  return [];
};

const extractPagination = (response: any): Pagination | null =>
  response?.pagination ?? response?.meta ?? response?.data?.pagination ?? null;

const EMPTY_STATS: ClaimStats = {
  total: 0,
  draft: 0,
  finalized: 0,
  totalAmount: 0,
  finalizedAmount: 0,
};

const normalizeSummary = (raw: any): ClaimSummary | null => {
  const s = raw?.data ?? raw;
  if (!s) return null;
  // Accept either the store's expected shape or the service's flat shape.
  if (s.draft || s.finalized) {
    return {
      draft: {
        count: Number(s.draft?.count) || 0,
        totalAmount: Number(s.draft?.totalAmount) || 0,
      },
      finalized: {
        count: Number(s.finalized?.count) || 0,
        totalAmount: Number(s.finalized?.totalAmount) || 0,
      },
    };
  }
  // Service's getFinalizedClaimsTotal shape: { total, totalAmount }
  return {
    draft: { count: 0, totalAmount: 0 },
    finalized: {
      count: Number(s.total) || 0,
      totalAmount: Number(s.totalAmount) || 0,
    },
  };
};

const summaryToLegacy = (summary: ClaimSummary | null): FinalizedClaimsTotal | null =>
  summary
    ? { total: summary.finalized.count, totalAmount: summary.finalized.totalAmount }
    : null;

export const useInsuranceStore = create<InsuranceState>((set, get) => ({
  nhisClaims: [],
  privateClaims: [],
  corporateClaims: [],
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
  summary: null,
  finalizedClaimsTotal: null,
  batchSummary: null,
  periodClaims: null,
  nhisStats: { ...EMPTY_STATS },
  privateStats: { ...EMPTY_STATS },

  getNHISClaims: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetNHISClaims(filters);
      const claims = extractClaims(response);
      set({
        nhisClaims: claims,
        nhisStats: calculateStats(claims),
        pagination: extractPagination(response),
        isLoading: false,
      });
    } catch (e: any) {
      set({
        isLoading: false,
        error: e?.response?.data?.message || e?.message || 'Failed to fetch NHIS claims',
      });
      throw e;
    }
  },

  generateNHISClaim: async (attendanceId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiGenerateNHISClaim(attendanceId);
      const claim = normalizeClaim(unwrapClaim(res.data ?? res));
      set((state) => ({
        nhisClaims: [claim, ...state.nhisClaims.filter((c) => c.id !== claim.id)],
        nhisStats: calculateStats([claim, ...state.nhisClaims.filter((c) => c.id !== claim.id)]),
        currentClaim: claim,
        currentDraft: claim,
        isLoading: false,
      }));
      return claim;
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  getPrivateInsuranceClaims: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetPrivateInsuranceClaims(filters);
      const claims = extractClaims(response);
      set({
        privateClaims: claims,
        privateStats: calculateStats(claims),
        pagination: extractPagination(response),
        isLoading: false,
      });
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  generatePrivateInsuranceClaim: async (attendanceId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiGeneratePrivateInsuranceClaim(attendanceId);
      const claim = normalizeClaim(unwrapClaim(res.data ?? res));
      set((state) => ({
        privateClaims: [claim, ...state.privateClaims.filter((c) => c.id !== claim.id)],
        privateStats: calculateStats([
          claim,
          ...state.privateClaims.filter((c) => c.id !== claim.id),
        ]),
        currentClaim: claim,
        currentDraft: claim,
        isLoading: false,
      }));
      return claim;
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  getCorporateClaims: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetCorporateClaims(filters);
      const claims = extractClaims(response);
      set({
        corporateClaims: claims,
        pagination: extractPagination(response),
        isLoading: false,
      });
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  generateCorporateClaim: async (attendanceId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiGenerateCorporateClaim(attendanceId);
      const claim = normalizeClaim(unwrapClaim(res.data ?? res));
      set((state) => ({
        corporateClaims: [claim, ...state.corporateClaims.filter((c) => c.id !== claim.id)],
        currentClaim: claim,
        isLoading: false,
      }));
      return claim;
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  getInsuranceClaims: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetInsuranceClaims(filters);
      set({
        allClaims: extractClaims(response),
        pagination: extractPagination(response),
        isLoading: false,
      });
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  getInsuranceClaim: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiGetInsuranceClaim(id);
      const claim = normalizeClaim(unwrapClaim(res.data ?? res));
      set({ currentClaim: claim, isLoading: false });
      return claim;
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  getClaimByAttendanceId: async (attendanceId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiGetClaimByAttendanceId(attendanceId);
      const claim = unwrapClaim(res?.data ?? res);
      set({ isLoading: false });
      return claim ? normalizeClaim(claim) : null;
    } catch {
      set({ isLoading: false });
      return null;
    }
  },

  updateClaimDraft: async (claimId, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiUpdateClaimDraft(claimId, data);
      const claim = normalizeClaim(unwrapClaim(res.data ?? res));
      set((state) => ({
        allClaims: state.allClaims.map((c) => (c.id === claimId ? claim : c)),
        nhisClaims: state.nhisClaims.map((c) => (c.id === claimId ? claim : c)),
        privateClaims: state.privateClaims.map((c) => (c.id === claimId ? claim : c)),
        corporateClaims: state.corporateClaims.map((c) => (c.id === claimId ? claim : c)),
        currentClaim: claim,
        currentDraft: claim,
        isLoading: false,
      }));
      return claim;
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  replaceClaimItems: async (claimId, items) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiReplaceClaimItems(claimId, items);
      const claim = normalizeClaim(unwrapClaim(res.data ?? res));
      set((state) => ({
        allClaims: state.allClaims.map((c) => (c.id === claimId ? claim : c)),
        nhisClaims: state.nhisClaims.map((c) => (c.id === claimId ? claim : c)),
        privateClaims: state.privateClaims.map((c) => (c.id === claimId ? claim : c)),
        corporateClaims: state.corporateClaims.map((c) => (c.id === claimId ? claim : c)),
        currentClaim: claim,
        currentDraft: claim,
        isLoading: false,
      }));
      return claim;
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  finalizeClaim: async (claimId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFinalizeClaim(claimId);
      const claim = normalizeClaim(unwrapClaim(res.data ?? res));
      set((state) => {
        const mapClaim = (arr: InsuranceClaim[]) =>
          arr.map((c) => (c.id === claimId ? claim : c));
        return {
          allClaims: mapClaim(state.allClaims),
          nhisClaims: mapClaim(state.nhisClaims),
          privateClaims: mapClaim(state.privateClaims),
          corporateClaims: mapClaim(state.corporateClaims),
          nhisStats: calculateStats(mapClaim(state.nhisClaims)),
          privateStats: calculateStats(mapClaim(state.privateClaims)),
          currentDraft: null,
          currentClaim: claim,
          isLoading: false,
        };
      });
      return claim;
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  downloadClaimXml: async (claimId) => {
    try {
      await apiDownloadClaimXml(claimId);
    } catch (e: any) {
      set({ error: e?.response?.data?.message || e?.message || 'Could not download claim XML' });
      throw e;
    }
  },

  printClaim: async (claimId) => {
    try {
      await apiGenerateClaimPrint(claimId);
    } catch (e: any) {
      set({ error: e?.response?.data?.message || e?.message || 'Could not open claim print view' });
      throw e;
    }
  },

  // Backward-compat aliases
  generateClaimXML: async (claimId) => {
    await get().downloadClaimXml(claimId);
  },
  generateClaimPrint: async (claimId) => {
    await get().printClaim(claimId);
  },

  getClaimsSummary: async (insuranceType) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiGetClaimsSummary(insuranceType);
      const summary = normalizeSummary(res);
      set({
        summary,
        finalizedClaimsTotal: summaryToLegacy(summary),
        isLoading: false,
      });
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  // Legacy alias: accepts either a bare type string or `{ type }`.
  getFinalizedClaimsTotal: async (input) => {
    const type =
      typeof input === 'string' ? input : (input as any)?.type ?? undefined;
    return get().getClaimsSummary(type);
  },

  generateClaimBatch: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiGenerateClaimBatch(input);
      const batch = normalizeBatch(res.data ?? res);
      set((state) => ({
        batches: [batch, ...state.batches.filter((b) => b.id !== batch.id)],
        currentBatch: batch,
        isLoading: false,
      }));
      return batch;
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  getClaimBatches: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiGetClaimBatches(filters);
      const payload: any = res?.data ?? res;
      const summary: any = payload?.summary;
      set({
        batches: extractBatches(res),
        pagination: extractPagination(res),
        batchSummary: summary
          ? {
              batches: Number(summary.batches) || 0,
              claims: Number(summary.claims) || 0,
              amount: Number(summary.amount) || 0,
            }
          : null,
        isLoading: false,
      });
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  getClaimBatch: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiGetClaimBatch(id);
      const batch = normalizeBatch(res.data ?? res);
      set({ currentBatch: batch, isLoading: false });
      return batch;
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      return null;
    }
  },

  finalizeClaimBatch: async (batchId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiFinalizeClaimBatch(batchId);
      const batch = normalizeBatch(res.data ?? res);
      set((state) => ({
        batches: state.batches.map((b) => (b.id === batchId ? batch : b)),
        currentBatch: batch,
        isLoading: false,
      }));
      return batch;
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  deleteClaimBatch: async (batchId) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteClaimBatch(batchId);
      set((state) => ({
        batches: state.batches.filter((b) => b.id !== batchId),
        currentBatch: state.currentBatch?.id === batchId ? null : state.currentBatch,
        isLoading: false,
      }));
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  downloadBatchXml: async (batchId) => {
    try {
      await apiDownloadBatchXml(batchId);
    } catch (e: any) {
      set({ error: e?.response?.data?.message || e?.message || 'Could not download claim batch XML' });
      throw e;
    }
  },

  printBatch: async (batchId) => {
    try {
      await apiPrintClaimBatch(batchId);
    } catch (e: any) {
      set({ error: e?.response?.data?.message || e?.message || 'Could not open claim batch print view' });
      throw e;
    }
  },

  getInsuranceProviders: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetInsuranceProviders(filters);
      let providers: InsuranceProvider[] = [];
      if (Array.isArray(response)) providers = response;
      else if (Array.isArray(response?.data)) providers = response.data;
      else if (Array.isArray(response?.providers)) providers = response.providers;
      set({ providers, isLoading: false });
    } catch (e: any) {
      set({ providers: [], isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  getInsuranceProvider: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiGetInsuranceProvider(id);
      set({ currentProvider: res.data ?? res, isLoading: false });
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  createInsuranceProvider: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiCreateInsuranceProvider(data);
      const provider = res.data ?? res;
      set((state) => ({
        providers: [provider, ...state.providers],
        currentProvider: provider,
        isLoading: false,
      }));
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  

  updateInsuranceProvider: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiUpdateInsuranceProvider(id, data);
      const provider = res.data ?? res;
      set((state) => ({
        providers: state.providers.map((p) => (p.id === id ? { ...p, ...provider } : p)),
        currentProvider:
          state.currentProvider?.id === id
            ? { ...state.currentProvider, ...provider }
            : state.currentProvider,
        isLoading: false,
      }));
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  toggleInsuranceProviderStatus: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiToggleInsuranceProviderStatus(id);
      const provider = res?.data ?? res;
      set((state) => ({
        providers: state.providers.map((item) => item.id === id ? { ...item, ...provider } : item),
        currentProvider: state.currentProvider?.id === id
          ? { ...state.currentProvider, ...provider }
          : state.currentProvider,
        isLoading: false,
      }));
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  deleteInsuranceProvider: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteInsuranceProvider(id);
      set((state) => ({
        providers: state.providers.filter((p) => p.id !== id),
        currentProvider: state.currentProvider?.id === id ? null : state.currentProvider,
        isLoading: false,
      }));
    } catch (e: any) {
      set({ isLoading: false, error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },


  // Add to the create(...) body:

  getEligibleClaimsForBatch: async ({ periodYear, periodMonth, insuranceProviderId, corporateAccountId }) => {
    try {
      return await apiGetClaimBatchEligibility({
        periodYear,
        periodMonth,
        insuranceProviderId: insuranceProviderId || undefined,
        corporateAccountId: corporateAccountId || undefined,
      });
    } catch (e: any) {
      set({ error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  getPeriodClaims: async ({ periodYear, periodMonth, insuranceType, batched, page = 1, limit = 50 }) => {
    set({ periodClaims: null });
    try {
      const result = await apiGetClaimPeriodClaims({
        periodYear,
        periodMonth,
        insuranceType: insuranceType && insuranceType !== 'all' ? insuranceType : undefined,
        batched: batched && batched !== 'all' ? batched : undefined,
        page,
        limit,
      });
      set({
        periodClaims: {
          rows: Array.isArray(result?.data) ? result.data : [],
          pagination: result?.pagination ?? { page, limit, total: 0, pages: 0 },
          totals: result?.totals ?? {
            claims: 0,
            amount: 0,
            byStatus: { draft: { count: 0, amount: 0 }, finalized: { count: 0, amount: 0 } },
            batchable: { count: 0, amount: 0 },
          },
        },
      });
    } catch (e: any) {
      set({ error: e?.response?.data?.message || e?.message });
      throw e;
    }
  },

  updateStats: () => {
    set((state) => ({
      nhisStats: calculateStats(state.nhisClaims),
      privateStats: calculateStats(state.privateClaims),
    }));
  },
  clearCurrentClaim: () => set({ currentClaim: null }),
  clearCurrentDraft: () => set({ currentDraft: null }),
  clearCurrentBatch: () => set({ currentBatch: null }),
  clearCurrentProvider: () => set({ currentProvider: null }),
  clearError: () => set({ error: null }),
}));