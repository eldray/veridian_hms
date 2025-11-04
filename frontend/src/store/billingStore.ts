// stores/billingStore.ts
import { create } from 'zustand';
import { 
  getBills as apiGetBills,
  getBill as apiGetBill,
  createBill as apiCreateBill,
  updateBill as apiUpdateBill,
  deleteBill as apiDeleteBill
} from '../api';
import type { Bill, Pagination } from '../types';

interface BillingState {
  bills: Bill[];
  currentBill: Bill | null;
  isLoading: boolean;
  pagination: Pagination | null;
  
  // Bills
  getBills: (filters?: any) => Promise<void>;
  getBill: (id: string) => Promise<void>;
  createBill: (data: any) => Promise<void>;
  updateBill: (id: string, data: any) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  clearCurrentBill: () => void;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  bills: [],
  currentBill: null,
  isLoading: false,
  pagination: null,

  getBills: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetBills(filters);
      set({ 
        bills: response.bills || response.data || response,
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch bills:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getBill: async (id: string) => {
    set({ isLoading: true });
    try {
      const bill = await apiGetBill(id);
      set({ currentBill: bill, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createBill: async (data: any) => {
    set({ isLoading: true });
    try {
      const newBill = await apiCreateBill(data);
      const bills = get().bills;
      set({ 
        bills: [newBill, ...bills],
        currentBill: newBill,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to create bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateBill: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedBill = await apiUpdateBill(id, data);
      const bills = get().bills.map(bill => 
        bill._id === id ? updatedBill : bill
      );
      set({ 
        bills,
        currentBill: updatedBill,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteBill: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteBill(id);
      const bills = get().bills.filter(bill => bill._id !== id);
      set({ 
        bills,
        currentBill: get().currentBill?._id === id ? null : get().currentBill,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to delete bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  clearCurrentBill: () => {
    set({ currentBill: null });
  },
}));
