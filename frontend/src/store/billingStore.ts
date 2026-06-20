// src/store/billingStore.ts - FIXED VERSION

import { create } from 'zustand';
import { 
  getBills as apiGetBills,
  getBill as apiGetBill,
  createBill as apiCreateBill,
  updateBill as apiUpdateBill,
  deleteBill as apiDeleteBill,
  addPaymentToBill as apiAddPaymentToBill,
  generateBillFromEncounter as apiGenerateBillFromAttendance,
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

// ==========================================
// ✅ HELPER: Parse numeric fields in bill data
// ==========================================
const parseBillAmounts = (bill: any): Bill => {
  if (!bill) return bill;
  
  return {
    ...bill,
    subtotal: typeof bill.subtotal === 'string' ? parseFloat(bill.subtotal) : bill.subtotal,
    totalAmount: typeof bill.totalAmount === 'string' ? parseFloat(bill.totalAmount) : bill.totalAmount,
    paidAmount: typeof bill.paidAmount === 'string' ? parseFloat(bill.paidAmount) : bill.paidAmount,
    balance: typeof bill.balance === 'string' ? parseFloat(bill.balance) : bill.balance,
    discount: typeof bill.discount === 'string' ? parseFloat(bill.discount) : bill.discount,
    waiverAmount: typeof bill.waiverAmount === 'string' ? parseFloat(bill.waiverAmount) : bill.waiverAmount,
    taxAmount: typeof bill.taxAmount === 'string' ? parseFloat(bill.taxAmount) : bill.taxAmount,
    insuranceCovered: typeof bill.insuranceCovered === 'string' ? parseFloat(bill.insuranceCovered) : bill.insuranceCovered,
    patientPayable: typeof bill.patientPayable === 'string' ? parseFloat(bill.patientPayable) : bill.patientPayable,
    // Parse line items if they exist
    BillLineItem: bill.BillLineItem?.map((item: any) => ({
      ...item,
      unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice,
      lineTotal: typeof item.lineTotal === 'string' ? parseFloat(item.lineTotal) : item.lineTotal,
      vatAmount: typeof item.vatAmount === 'string' ? parseFloat(item.vatAmount) : item.vatAmount,
      insuranceCoveredAmount: typeof item.insuranceCoveredAmount === 'string' ? parseFloat(item.insuranceCoveredAmount) : item.insuranceCoveredAmount,
      patientPayableAmount: typeof item.patientPayableAmount === 'string' ? parseFloat(item.patientPayableAmount) : item.patientPayableAmount,
      discount: typeof item.discount === 'string' ? parseFloat(item.discount) : item.discount,
    })) || bill.BillLineItem
  };
};

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
      const parsedBill = parseBillAmounts(updatedBill);
      const bills = get().bills.map(bill => 
        bill.id === billId ? parsedBill : bill
      );
      set({ 
        bills,
        currentBill: get().currentBill?.id === billId ? parsedBill : get().currentBill,
        isLoading: false 
      });
      return parsedBill;
    } catch (error: unknown) {
      console.error('❌ Failed to apply waiver to bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // BILLING BREAKDOWN
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
      
      // ✅ Parse numeric amounts
      const parsedBill = parseBillAmounts(billData);
      
      console.log('📄 Billing Store - Parsed Bill:', {
        id: parsedBill?.id,
        billNumber: parsedBill?.billNumber,
        totalAmount: parsedBill?.totalAmount,
        status: parsedBill?.status,
        lineItemsCount: parsedBill?.BillLineItem?.length
      });
      
      set({ currentBill: parsedBill, isLoading: false });
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

      // ✅ Parse numeric amounts for all bills
      const parsedBills = billsArray.map(parseBillAmounts);
      
      console.log('✅ Billing Store - Processed Bills:', parsedBills.length);
      
      set({ 
        bills: parsedBills,
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
      const parsedBill = parseBillAmounts(newBill);
      const bills = get().bills;
      set({ 
        bills: [parsedBill, ...bills],
        currentBill: parsedBill,
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
      const parsedBill = parseBillAmounts(updatedBill);
      const bills = get().bills.map(bill => 
        bill.id === id ? parsedBill : bill
      );
      set({ 
        bills,
        currentBill: parsedBill,
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
      const parsedBill = parseBillAmounts(updatedBill);
      
      const bills = get().bills.map(bill => 
        bill.id === billId ? parsedBill : bill
      );
      
      set({ 
        bills,
        currentBill: get().currentBill?.id === billId ? parsedBill : get().currentBill,
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
      const parsedBill = parseBillAmounts(newBill);
      const bills = get().bills;
      set({ 
        bills: [parsedBill, ...bills],
        currentBill: parsedBill,
        isLoading: false 
      });
      return parsedBill;
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
      const parsedBill = parseBillAmounts(updatedBill);
      
      const bills = get().bills.map(bill => 
        bill.id === billId ? parsedBill : bill
      );
      
      set({ 
        bills,
        currentBill: get().currentBill?.id === billId ? parsedBill : get().currentBill,
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