// stores/billingStore.ts - UPDATED WITH ALL API FUNCTIONS
import { create } from 'zustand';
import { 
  getBills as apiGetBills,
  getBill as apiGetBill,
  createBill as apiCreateBill,
  updateBill as apiUpdateBill,
  deleteBill as apiDeleteBill,
  // ✅ ADDED MISSING FUNCTIONS
  addPaymentToBill as apiAddPaymentToBill,
  generateBillFromAttendance as apiGenerateBillFromAttendance,
  generateBillReport as apiGenerateBillReport,
  getBillingBreakdownForBill as apiGetBillingBreakdown,
  updateBillStatus as apiUpdateBillStatus,
  getBillStatistics as apiGetBillStatistics
} from '../api';
import type { Bill, Pagination, Payment } from '../types';

interface BillingState {
  bills: Bill[];
  currentBill: Bill | null;
  isLoading: boolean;
  pagination: Pagination | null;
  billStatistics: any;
  
  // Core Bills
  getBills: (filters?: any) => Promise<void>;
  getBill: (id: string) => Promise<void>;
  createBill: (data: any) => Promise<void>;
  updateBill: (id: string, data: any) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  
  // ✅ ADDED MISSING FUNCTIONS
  addPaymentToBill: (billId: string, paymentData: Partial<Payment>) => Promise<void>;
  generateBillFromAttendance: (attendanceId: string) => Promise<Bill>;
  generateBillReport: (billId: string) => Promise<any>;
  getBillingBreakdown: (billId: string) => Promise<any>;
  updateBillStatus: (billId: string, status: string, data?: any) => Promise<void>;
  getBillStatistics: (filters?: any) => Promise<void>;
  
  clearCurrentBill: () => void;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  bills: [],
  currentBill: null,
  isLoading: false,
  pagination: null,
  billStatistics: null, // ✅ ADDED

  getBills: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetBills(filters);
      set({ 
        bills: response.bills || response.data || response,
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
        bill.id === id ? updatedBill : bill
      );
      set({ 
        bills,
        currentBill: updatedBill,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to update bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteBill: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteBill(id);
      const bills = get().bills.filter(bill => bill.id !== id);
      set({ 
        bills,
        currentBill: get().currentBill?.id === id ? null : get().currentBill,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to delete bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ✅ ADDED MISSING FUNCTIONS
  addPaymentToBill: async (billId: string, paymentData: Partial<Payment>) => {
    set({ isLoading: true });
    try {
      const updatedBill = await apiAddPaymentToBill(billId, paymentData);
      
      // Update bills list
      const bills = get().bills.map(bill => 
        bill.id === billId ? updatedBill : bill
      );
      
      set({ 
        bills,
        currentBill: get().currentBill?.id === billId ? updatedBill : get().currentBill,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to add payment:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  generateBillFromAttendance: async (attendanceId: string) => {
    set({ isLoading: true });
    try {
      const newBill = await apiGenerateBillFromAttendance(attendanceId);
      const bills = get().bills;
      set({ 
        bills: [newBill, ...bills],
        currentBill: newBill,
        isLoading: false 
      });
      return newBill;
    } catch (error: any) {
      console.error('Failed to generate bill from attendance:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  generateBillReport: async (billId: string) => {
    set({ isLoading: true });
    try {
      const report = await apiGenerateBillReport(billId);
      set({ isLoading: false });
      return report;
    } catch (error: any) {
      console.error('Failed to generate bill report:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getBillingBreakdown: async (billId: string) => {
    set({ isLoading: true });
    try {
      const breakdown = await apiGetBillingBreakdown(billId);
      set({ isLoading: false });
      return breakdown;
    } catch (error: any) {
      console.error('Failed to get billing breakdown:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateBillStatus: async (billId: string, status: string, data: any = {}) => {
    set({ isLoading: true });
    try {
      const updatedBill = await apiUpdateBillStatus(billId, { status, ...data });
      
      // Update bills list
      const bills = get().bills.map(bill => 
        bill.id === billId ? updatedBill : bill
      );
      
      set({ 
        bills,
        currentBill: get().currentBill?.id === billId ? updatedBill : get().currentBill,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to update bill status:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getBillStatistics: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const statistics = await apiGetBillStatistics(filters);
      set({ 
        billStatistics: statistics,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch bill statistics:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  clearCurrentBill: () => {
    set({ currentBill: null });
  },
}));