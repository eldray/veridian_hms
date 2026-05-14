// stores/billingStore.ts - CORRECTED (No Duplicate)
import { create } from 'zustand';
import { 
  getBills as apiGetBills,
  getBill as apiGetBill,
  createBill as apiCreateBill,
  updateBill as apiUpdateBill,
  deleteBill as apiDeleteBill,
  addPaymentToBill as apiAddPaymentToBill,
  generateBillFromAttendance as apiGenerateBillFromAttendance,
  generateBillReport as apiGenerateBillReport,
  getBillingBreakdownForBill as apiGetBillingBreakdown,
  updateBillStatus as apiUpdateBillStatus,
  getBillStatistics as apiGetBillStatistics,
  getBillLineItems as apiGetBillLineItems,
  voidBillLineItem as apiVoidBillLineItem,
  applyWaiverToBill as apiApplyWaiverToBill
} from '../api';

import type { Bill, Pagination, Payment } from '../types';
import type { BillFilters, BillStatistics, BillingBreakdown, BillLineItem } from '../types/billing';

interface BillingState {
  bills: Bill[];
  currentBill: Bill | null;
  isLoading: boolean;
  pagination: Pagination | null;
  billStatistics: BillStatistics | null;
  
  // Core Bills
  getBills: (filters?: BillFilters) => Promise<void>;
  getBill: (id: string) => Promise<void>;
  createBill: (data: Partial<Bill>) => Promise<void>;
  updateBill: (id: string, data: Partial<Bill>) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  
  // Payment functions
  addPaymentToBill: (billId: string, paymentData: Partial<Payment>) => Promise<void>;
  generateBillFromAttendance: (attendanceId: string) => Promise<Bill>;
  generateBillReport: (billId: string) => Promise<BillingBreakdown>;
  getBillingBreakdown: (billId: string) => Promise<BillingBreakdown>;
  updateBillStatus: (billId: string, status: string, data?: Partial<Payment>) => Promise<void>;
  getBillStatistics: (filters?: BillFilters) => Promise<void>;
  getBillLineItems: (billId: string) => Promise<BillLineItem[]>;
  voidBillLineItem: (lineItemId: string, reason: string) => Promise<void>;
  applyWaiverToBill: (billId: string, waiverId: string) => Promise<Bill>;

  clearCurrentBill: () => void;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  bills: [],
  currentBill: null,
  isLoading: false,
  pagination: null,
  billStatistics: null,

  // ==========================================
  // BILL LINE ITEMS
  // ==========================================
  getBillLineItems: async (billId: string) => {
    set({ isLoading: true });
    try {
      const response = await apiGetBillLineItems(billId);
      set({ isLoading: false });
      return response.data || response;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  voidBillLineItem: async (lineItemId: string, reason: string) => {
    set({ isLoading: true });
    try {
      await apiVoidBillLineItem(lineItemId, { reason });
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // WAIVER FUNCTIONS
  // ==========================================
  applyWaiverToBill: async (billId: string, waiverId: string) => {
    set({ isLoading: true });
    try {
      const updatedBill = await apiApplyWaiverToBill(billId, waiverId);
      const bills = get().bills.map(bill => 
        bill.id === billId ? updatedBill : bill
      );
      set({ 
        bills,
        currentBill: get().currentBill?.id === billId ? updatedBill : get().currentBill,
        isLoading: false 
      });
      return updatedBill;
    } catch (error: unknown) {
      console.error('❌ Failed to apply waiver to bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // BILLING BREAKDOWN - ONLY ONE VERSION
  // ==========================================
  getBillingBreakdown: async (billId: string) => {
    set({ isLoading: true });
    try {
      const breakdown = await apiGetBillingBreakdown(billId);
      set({ isLoading: false });
      return breakdown;
    } catch (error: unknown) {
      console.error('❌ Failed to get billing breakdown:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // GET BILL BY ID
  // ==========================================
  getBill: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await apiGetBill(id);
      console.log('📄 Billing Store - Raw Response:', response);
      
      let billData = null;
      if (response && response.success === true && response.data) {
        billData = response.data;
      } else if (response && response.id) {
        billData = response;
      } else {
        billData = response;
      }
      
      console.log('📄 Billing Store - Extracted Bill:', {
        id: billData?.id,
        billNumber: billData?.billNumber,
        totalAmount: billData?.totalAmount,
        status: billData?.status,
        lineItemsCount: billData?.BillLineItem?.length
      });
      
      set({ currentBill: billData, isLoading: false });
    } catch (error: unknown) {
      console.error('❌ Failed to fetch bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // GET ALL BILLS
  // ==========================================
  getBills: async (filters = {}) => {
    if (get().isLoading) return;
    
    set({ isLoading: true });
    try {
      const response = await apiGetBills(filters);
      console.log('📊 Billing Store - API Response:', response);
      
      let billsArray: Bill[] = [];
      let paginationData = null;

      if (response && response.success === true) {
        billsArray = response.data || [];
        paginationData = response.pagination || null;
      } 
      else if (Array.isArray(response)) {
        billsArray = response;
      }
      else if (response && Array.isArray(response.data)) {
        billsArray = response.data;
      }
      else if (response && response.bills) {
        billsArray = response.bills;
      }
      else {
        console.warn('Unexpected bills API response structure:', response);
        billsArray = [];
      }

      console.log('✅ Billing Store - Processed Bills:', billsArray.length);
      
      set({ 
        bills: billsArray,
        pagination: paginationData,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('❌ Failed to fetch bills:', error);
      set({ 
        bills: [],
        isLoading: false 
      });
      throw error;
    }
  },

  // ==========================================
  // CREATE BILL
  // ==========================================
  createBill: async (data: Partial<Bill>) => {
    set({ isLoading: true });
    try {
      const newBill = await apiCreateBill(data);
      const bills = get().bills;
      set({ 
        bills: [newBill, ...bills],
        currentBill: newBill,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('❌ Failed to create bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // UPDATE BILL
  // ==========================================
  updateBill: async (id: string, data: Partial<Bill>) => {
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
    } catch (error: unknown) {
      console.error('❌ Failed to update bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // DELETE BILL
  // ==========================================
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
    } catch (error: unknown) {
      console.error('❌ Failed to delete bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // ADD PAYMENT TO BILL
  // ==========================================
  addPaymentToBill: async (billId: string, paymentData: Partial<Payment>) => {
    set({ isLoading: true });
    try {
      const updatedBill = await apiAddPaymentToBill(billId, paymentData);
      
      const bills = get().bills.map(bill => 
        bill.id === billId ? updatedBill : bill
      );
      
      set({ 
        bills,
        currentBill: get().currentBill?.id === billId ? updatedBill : get().currentBill,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('❌ Failed to add payment:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // GENERATE BILL FROM ATTENDANCE
  // ==========================================
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
    } catch (error: unknown) {
      console.error('❌ Failed to generate bill from attendance:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // GENERATE BILL REPORT
  // ==========================================
  generateBillReport: async (billId: string) => {
    set({ isLoading: true });
    try {
      const report = await apiGenerateBillReport(billId);
      set({ isLoading: false });
      return report;
    } catch (error: unknown) {
      console.error('❌ Failed to generate bill report:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // UPDATE BILL STATUS
  // ==========================================
  updateBillStatus: async (billId: string, status: string, data: Partial<Payment> = {}) => {
    set({ isLoading: true });
    try {
      const updatedBill = await apiUpdateBillStatus(billId, { status, ...data });
      
      const bills = get().bills.map(bill => 
        bill.id === billId ? updatedBill : bill
      );
      
      set({ 
        bills,
        currentBill: get().currentBill?.id === billId ? updatedBill : get().currentBill,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('❌ Failed to update bill status:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // GET BILL STATISTICS
  // ==========================================
  getBillStatistics: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const statistics = await apiGetBillStatistics(filters);
      set({ 
        billStatistics: statistics,
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('❌ Failed to fetch bill statistics:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // CLEAR CURRENT BILL
  // ==========================================
  clearCurrentBill: () => {
    set({ currentBill: null });
  },
}));