// src/store/waiverStore.ts
import { create } from 'zustand';
import {
  getWaivers as apiGetWaivers,
  getWaiverById as apiGetWaiverById,
  createWaiverRequest as apiCreateWaiverRequest,
  approveWaiver as apiApproveWaiver,
  rejectWaiver as apiRejectWaiver,
  updateWaiverStatus as apiUpdateWaiverStatus,
  getWaiversByBill as apiGetWaiversByBill,
  getWaiversByPatient as apiGetWaiversByPatient,
  getWaiverStatistics as apiGetWaiverStatistics,
  deleteWaiver as apiDeleteWaiver,
  applyWaiverToBill as apiApplyWaiverToBill
} from '../api';

interface Waiver {
  id: string;
  patientId: string;
  billId: string | null;
  waiverType: string;
  reason: string;
  amountRequested: number;
  amountApproved: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  supportingDocs: string[];
  requestedById: string;
  approvedById: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient?: {
    id: string;
    surname: string;
    otherNames: string;
    folderNumber: string;
  };
  bill?: {
    id: string;
    billNumber: string;
    totalAmount: number;
    balance: number;
  };
  requestedBy?: {
    fullName: string;
    username: string;
  };
  approvedBy?: {
    fullName: string;
    username: string;
  };
}

interface WaiverState {
  waivers: Waiver[];
  currentWaiver: Waiver | null;
  statistics: any;
  isLoading: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;

  // Core functions
  getWaivers: (filters?: any) => Promise<void>;
  getWaiver: (id: string) => Promise<void>;
  createWaiver: (data: any) => Promise<Waiver>;
  updateWaiverStatus: (id: string, data: any) => Promise<Waiver>;
  approveWaiver: (id: string, amountApproved?: number) => Promise<Waiver>;
  rejectWaiver: (id: string, rejectionReason?: string) => Promise<Waiver>;
  getWaiversByBill: (billId: string) => Promise<Waiver[]>;
  getWaiversByPatient: (patientId: string, filters?: any) => Promise<void>;
  getStatistics: (filters?: any) => Promise<void>;
  deleteWaiver: (id: string) => Promise<void>;
  applyWaiverToBill: (billId: string, waiverId: string) => Promise<any>;

  // Utility
  clearCurrentWaiver: () => void;
  clearError: () => void;
}

export const useWaiverStore = create<WaiverState>((set, get) => ({
  waivers: [],
  currentWaiver: null,
  statistics: null,
  isLoading: false,
  pagination: null,

  // ==========================================
  // GET ALL WAIVERS
  // ==========================================
  getWaivers: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetWaivers(filters);
      let waiversArray: Waiver[] = [];
      let paginationData = null;

      if (response?.success && Array.isArray(response.data)) {
        waiversArray = response.data;
        paginationData = response.pagination;
      } else if (Array.isArray(response)) {
        waiversArray = response;
      } else if (response?.data && Array.isArray(response.data)) {
        waiversArray = response.data;
      }

      set({ 
        waivers: waiversArray, 
        pagination: paginationData, 
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch waivers:', error);
      set({ waivers: [], isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // GET WAIVER BY ID
  // ==========================================
  getWaiver: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await apiGetWaiverById(id);
      const waiver = response?.data || response;
      set({ currentWaiver: waiver, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch waiver:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // CREATE WAIVER
  // ==========================================
  createWaiver: async (data: any) => {
    set({ isLoading: true });
    try {
      const response = await apiCreateWaiverRequest(data);
      const newWaiver = response?.data || response;
      set({ 
        waivers: [newWaiver, ...get().waivers],
        currentWaiver: newWaiver,
        isLoading: false 
      });
      return newWaiver;
    } catch (error) {
      console.error('Failed to create waiver:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // UPDATE WAIVER STATUS
  // ==========================================
  updateWaiverStatus: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const response = await apiUpdateWaiverStatus(id, data);
      const updatedWaiver = response?.data || response;
      set({
        waivers: get().waivers.map(w => w.id === id ? updatedWaiver : w),
        currentWaiver: updatedWaiver,
        isLoading: false
      });
      return updatedWaiver;
    } catch (error) {
      console.error('Failed to update waiver status:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // APPROVE WAIVER
  // ==========================================
  approveWaiver: async (id: string, amountApproved?: number) => {
    set({ isLoading: true });
    try {
      const response = await apiApproveWaiver(id, amountApproved);
      const updatedWaiver = response?.data || response;
      set({
        waivers: get().waivers.map(w => w.id === id ? updatedWaiver : w),
        currentWaiver: updatedWaiver,
        isLoading: false
      });
      return updatedWaiver;
    } catch (error) {
      console.error('Failed to approve waiver:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // REJECT WAIVER
  // ==========================================
  rejectWaiver: async (id: string, rejectionReason?: string) => {
    set({ isLoading: true });
    try {
      const response = await apiRejectWaiver(id, rejectionReason);
      const updatedWaiver = response?.data || response;
      set({
        waivers: get().waivers.map(w => w.id === id ? updatedWaiver : w),
        currentWaiver: updatedWaiver,
        isLoading: false
      });
      return updatedWaiver;
    } catch (error) {
      console.error('Failed to reject waiver:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // GET WAIVERS BY BILL
  // ==========================================
  getWaiversByBill: async (billId: string) => {
    set({ isLoading: true });
    try {
      const response = await apiGetWaiversByBill(billId);
      const waivers = response?.data || response || [];
      set({ isLoading: false });
      return waivers;
    } catch (error) {
      console.error('Failed to fetch waivers by bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // GET WAIVERS BY PATIENT
  // ==========================================
  getWaiversByPatient: async (patientId: string, filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetWaiversByPatient(patientId, filters);
      let waiversArray: Waiver[] = [];
      let paginationData = null;

      if (response?.success && Array.isArray(response.data)) {
        waiversArray = response.data;
        paginationData = response.pagination;
      } else if (Array.isArray(response)) {
        waiversArray = response;
      }

      set({ 
        waivers: waiversArray, 
        pagination: paginationData, 
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch waivers by patient:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // GET WAIVER STATISTICS
  // ==========================================
  getStatistics: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetWaiverStatistics(filters);
      const stats = response?.data || response;
      set({ statistics: stats, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch waiver statistics:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // DELETE WAIVER
  // ==========================================
  deleteWaiver: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteWaiver(id);
      set({
        waivers: get().waivers.filter(w => w.id !== id),
        currentWaiver: get().currentWaiver?.id === id ? null : get().currentWaiver,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to delete waiver:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // APPLY WAIVER TO BILL
  // ==========================================
  applyWaiverToBill: async (billId: string, waiverId: string) => {
    set({ isLoading: true });
    try {
      const response = await apiApplyWaiverToBill(billId, waiverId);
      const result = response?.data || response;
      set({ isLoading: false });
      return result;
    } catch (error) {
      console.error('Failed to apply waiver to bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================
  clearCurrentWaiver: () => set({ currentWaiver: null }),
  clearError: () => set({ statistics: null }),
}));