// src/store/estimatesStore.ts - Proforma invoices ("estimates")
import { create } from 'zustand';
import {
  getEstimates as apiGetEstimates,
  getEstimate as apiGetEstimate,
  createEstimate as apiCreateEstimate,
  updateEstimate as apiUpdateEstimate,
  deleteEstimate as apiDeleteEstimate,
  sendEstimate as apiSendEstimate,
  acceptEstimate as apiAcceptEstimate,
  rejectEstimate as apiRejectEstimate,
  convertEstimateToBill as apiConvertEstimateToBill,
  getEstimateStatistics as apiGetEstimateStatistics,
} from '../api';

export type EstimateStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'EXPIRED';

export interface EstimateItem {
  id: string;
  description: string;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  totalPrice: number;
  isInsuranceCovered: boolean;
  insuranceCoverage: number;
  patientResponsibility: number;
  serviceCatalog?: { id: string; name: string; code: string };
}

export interface Estimate {
  id: string;
  referenceNumber: string;
  status: EstimateStatus;
  patientId: string;
  corporateAccountId?: string | null;
  subtotal: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  validityDays: number;
  expiresAt?: string | null;
  notes?: string | null;
  termsAndConditions?: string | null;
  convertedToBillId?: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: { id: string; folderNumber: string; surname: string; otherNames: string; contact?: string };
  corporateAccount?: { id: string; companyName: string; companyCode: string };
  attendance?: { id: string; attendanceNumber: string; dateTime: string };
  items?: EstimateItem[];
  createdBy?: { id: string; fullName: string; username: string };
  approvedBy?: { id: string; fullName: string; username: string };
  bill?: { id: string; billNumber: string } | null;
}

interface EstimatesState {
  estimates: Estimate[];
  currentEstimate: Estimate | null;
  statistics: any;
  isLoading: boolean;
  pagination: { page: number; limit: number; total: number; totalPages: number };

  loadEstimates: (filters?: any) => Promise<void>;
  loadEstimate: (id: string) => Promise<Estimate | null>;
  createEstimate: (data: any) => Promise<Estimate>;
  updateEstimate: (id: string, data: any) => Promise<Estimate>;
  removeEstimate: (id: string) => Promise<void>;
  sendEstimate: (id: string) => Promise<void>;
  acceptEstimate: (id: string) => Promise<void>;
  rejectEstimate: (id: string, reason?: string) => Promise<void>;
  convertToBill: (id: string, data: { paymentMode: string; notes?: string }) => Promise<any>;
  loadStatistics: (filters?: any) => Promise<void>;
}

export const useEstimatesStore = create<EstimatesState>((set, get) => ({
  estimates: [],
  currentEstimate: null,
  statistics: null,
  isLoading: false,
  pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },

  loadEstimates: async (filters) => {
    set({ isLoading: true });
    try {
      const res = await apiGetEstimates(filters);
      set({
        estimates: res?.data || [],
        pagination: res?.pagination || get().pagination,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  loadEstimate: async (id) => {
    set({ isLoading: true });
    try {
      const res = await apiGetEstimate(id);
      const estimate = res?.data || null;
      set({ currentEstimate: estimate });
      return estimate;
    } finally {
      set({ isLoading: false });
    }
  },

  createEstimate: async (data) => {
    const res = await apiCreateEstimate(data);
    return res?.data;
  },

  updateEstimate: async (id, data) => {
    const res = await apiUpdateEstimate(id, data);
    if (get().currentEstimate?.id === id) set({ currentEstimate: res?.data });
    return res?.data;
  },

  removeEstimate: async (id) => {
    await apiDeleteEstimate(id);
    set({ estimates: get().estimates.filter((e) => e.id !== id) });
  },

  sendEstimate: async (id) => {
    const res = await apiSendEstimate(id);
    if (get().currentEstimate?.id === id) set({ currentEstimate: res?.data });
  },

  acceptEstimate: async (id) => {
    const res = await apiAcceptEstimate(id);
    if (get().currentEstimate?.id === id) set({ currentEstimate: res?.data });
  },

  rejectEstimate: async (id, reason) => {
    const res = await apiRejectEstimate(id, reason);
    if (get().currentEstimate?.id === id) set({ currentEstimate: res?.data });
  },

  convertToBill: async (id, data) => {
    const res = await apiConvertEstimateToBill(id, data);
    if (get().currentEstimate?.id === id) await get().loadEstimate(id);
    return res?.data;
  },

  loadStatistics: async (filters) => {
    const res = await apiGetEstimateStatistics(filters);
    set({ statistics: res?.data || null });
  },
}));
