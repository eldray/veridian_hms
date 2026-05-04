// stores/stockStore.ts - COMPLETE FIXED VERSION
import { create } from 'zustand';
import { 
  getStockItems as apiGetStockItems,
  getStockItem as apiGetStockItem,
  createStockItem as apiCreateStockItem,
  updateStockItem as apiUpdateStockItem,
  deleteStockItem as apiDeleteStockItem,
  getStockTransactions as apiGetStockTransactions,
  createStockTransaction as apiCreateStockTransaction,
  getLowStockItems as apiGetLowStockItems,
  getStockCategories as apiGetStockCategories,
  bulkUpdateStock as apiBulkUpdateStock,
  getStockTransaction as apiGetStockTransaction,
  updateStockTransaction as apiUpdateStockTransaction,
  getStockMovementReport as apiGetStockMovementReport,
  getLowStockAlerts as apiGetLowStockAlerts,
  getStockItemTransactionHistory as apiGetStockItemTransactionHistory,
  getRequisitions as apiGetRequisitions,
  createRequisition as apiCreateRequisition,
  submitRequisition as apiSubmitRequisition,
  approveRequisition as apiApproveRequisition,
  fulfillRequisition as apiFulfillRequisition,
  deleteRequisition as apiDeleteRequisition,
  getInvoices as apiGetInvoices,
  createInvoice as apiCreateInvoice,
  deleteInvoice as apiDeleteInvoice
} from '../api';
import type { StockItem, StockTransaction, Pagination, Requisition, Invoice } from '../types';

interface StockState {
  stockItems: StockItem[];
  transactions: StockTransaction[];
  currentStockItem: StockItem | null;
  currentTransaction: StockTransaction | null;
  isLoading: boolean;
  pagination: Pagination | null;
  stockCategories: string[];
  lowStockAlerts: StockItem[];
  stockMovementReport: any;
  requisitions: Requisition[];
  invoices: Invoice[];
  error: string | null;
  
  // Stock Items
  getStockItems: (filters?: any) => Promise<void>;
  getStockItem: (id: string) => Promise<void>;
  createStockItem: (data: any) => Promise<void>;
  updateStockItem: (id: string, data: any) => Promise<void>;
  deleteStockItem: (id: string) => Promise<void>;
  
  getLowStockItems: () => Promise<void>;
  getStockCategories: () => Promise<void>;
  bulkUpdateStock: (data: any) => Promise<void>;
  
  // Stock Transactions
  getStockTransactions: (filters?: any) => Promise<void>;
  createStockTransaction: (data: any) => Promise<void>;
  getStockTransaction: (id: string) => Promise<void>;
  updateStockTransaction: (id: string, data: any) => Promise<void>;
  
  // Reports
  getStockMovementReport: (filters?: any) => Promise<void>;
  getLowStockAlerts: () => Promise<void>;
  getStockItemTransactionHistory: (stockItemId: string) => Promise<void>;

  // Requisitions
  getRequisitions: (filters?: any) => Promise<void>;
  createRequisition: (data: any) => Promise<any>;
  submitRequisition: (id: string) => Promise<any>;
  approveRequisition: (id: string) => Promise<any>;
  fulfillRequisition: (id: string, data?: any) => Promise<any>;
  deleteRequisition: (id: string) => Promise<void>;

  // Invoices
  getInvoices: (filters?: any) => Promise<void>;
  createInvoice: (data: any) => Promise<any>;
  deleteInvoice: (id: string) => Promise<void>;
  
  // Utility functions
  getLocalLowStockItems: () => StockItem[];
  getExpiringItems: (days?: number) => StockItem[];
  getMedicationStockItems: () => StockItem[];
  
  clearCurrentStockItem: () => void;
  clearCurrentTransaction: () => void;
  clearError: () => void;
}

export const useStockStore = create<StockState>((set, get) => ({
  stockItems: [],
  transactions: [],
  currentStockItem: null,
  currentTransaction: null,
  isLoading: false,
  pagination: null,
  stockCategories: [],
  lowStockAlerts: [],
  stockMovementReport: null,
  requisitions: [],
  invoices: [],
  error: null,

  getStockItems: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetStockItems(filters);
      const stockItems = response.stockItems || response.data || response;
      set({ 
        stockItems: Array.isArray(stockItems) ? stockItems : [],
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch stock items:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch stock items' 
      });
      throw error;
    }
  },

  getStockItem: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const stockItem = await apiGetStockItem(id);
      set({ currentStockItem: stockItem, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch stock item:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch stock item' 
      });
      throw error;
    }
  },

  createStockItem: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const newStockItem = await apiCreateStockItem(data);
      const { stockItems } = get();
      set({ 
        stockItems: [newStockItem, ...stockItems],
        currentStockItem: newStockItem,
        isLoading: false 
      });
      return newStockItem;
    } catch (error: any) {
      console.error('Failed to create stock item:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to create stock item' 
      });
      throw error;
    }
  },

  updateStockItem: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const updatedStockItem = await apiUpdateStockItem(id, data);
      const { stockItems } = get();
      const updatedItems = stockItems.map(item => 
        item.id === id ? updatedStockItem : item
      );
      set({ 
        stockItems: updatedItems,
        currentStockItem: updatedStockItem,
        isLoading: false 
      });
      return updatedStockItem;
    } catch (error: any) {
      console.error('Failed to update stock item:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to update stock item' 
      });
      throw error;
    }
  },

  deleteStockItem: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteStockItem(id);
      const { stockItems, currentStockItem } = get();
      const updatedItems = stockItems.filter(item => item.id !== id);
      set({ 
        stockItems: updatedItems,
        currentStockItem: currentStockItem?.id === id ? null : currentStockItem,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to delete stock item:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to delete stock item' 
      });
      throw error;
    }
  },

  getLowStockItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const lowStockItems = await apiGetLowStockItems();
      set({ lowStockAlerts: lowStockItems, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch low stock items:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch low stock items' 
      });
      throw error;
    }
  },

  getStockCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await apiGetStockCategories();
      set({ stockCategories: categories, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch stock categories:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch stock categories' 
      });
      throw error;
    }
  },

  getStockTransactions: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetStockTransactions(filters);
      const transactions = response.transactions || response.data || response;
      set({ 
        transactions: Array.isArray(transactions) ? transactions : [],
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch stock transactions:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch stock transactions' 
      });
      throw error;
    }
  },

  createStockTransaction: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const newTransaction = await apiCreateStockTransaction(data);
      const { transactions } = get();
      
      set({ 
        transactions: [newTransaction, ...transactions],
        isLoading: false 
      });
      
      // Update stock items array optimistically
      const { stockItems } = get();
      const updatedStockItems = stockItems.map(item => {
        if (item.id === data.stockItemId) {
          const adjustment = data.transactionType === 'purchase' ? data.quantity : -data.quantity;
          return {
            ...item,
            currentStock: Math.max(0, (item.currentStock || 0) + adjustment)
          };
        }
        return item;
      });
      
      set({ stockItems: updatedStockItems });
      return newTransaction;
    } catch (error: any) {
      console.error('Failed to create stock transaction:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to create stock transaction' 
      });
      throw error;
    }
  },

  bulkUpdateStock: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiBulkUpdateStock(data);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      console.error('Failed to bulk update stock:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to bulk update stock' 
      });
      throw error;
    }
  },

  getStockTransaction: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const transaction = await apiGetStockTransaction(id);
      set({ currentTransaction: transaction, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch stock transaction:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch stock transaction' 
      });
      throw error;
    }
  },

  updateStockTransaction: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const updatedTransaction = await apiUpdateStockTransaction(id, data);
      const { transactions } = get();
      const updatedTransactions = transactions.map(transaction =>
        transaction.id === id ? updatedTransaction : transaction
      );
      set({ 
        transactions: updatedTransactions,
        currentTransaction: updatedTransaction,
        isLoading: false 
      });
      return updatedTransaction;
    } catch (error: any) {
      console.error('Failed to update stock transaction:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to update stock transaction' 
      });
      throw error;
    }
  },

  getStockMovementReport: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetStockMovementReport(filters);
      set({ stockMovementReport: report, isLoading: false });
      return report;
    } catch (error: any) {
      console.error('Failed to fetch stock movement report:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch stock movement report' 
      });
      throw error;
    }
  },

  getLowStockAlerts: async () => {
    set({ isLoading: true, error: null });
    try {
      const alerts = await apiGetLowStockAlerts();
      set({ lowStockAlerts: alerts, isLoading: false });
      return alerts;
    } catch (error: any) {
      console.error('Failed to fetch low stock alerts:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch low stock alerts' 
      });
      throw error;
    }
  },

  getStockItemTransactionHistory: async (stockItemId: string) => {
    set({ isLoading: true, error: null });
    try {
      const history = await apiGetStockItemTransactionHistory(stockItemId);
      set({ transactions: history, isLoading: false });
      return history;
    } catch (error: any) {
      console.error('Failed to fetch stock item transaction history:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch transaction history' 
      });
      throw error;
    }
  },

  // Requisitions
  getRequisitions: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetRequisitions(filters);
      const requisitions = Array.isArray(response) ? response : (response?.requisitions || []);
      set({ requisitions, isLoading: false, pagination: response?.pagination || null });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch requisitions'
      });
      throw error;
    }
  },

  createRequisition: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiCreateRequisition(data);
      const requisition = result?.requisition || result;
      set(state => ({
        requisitions: requisition ? [requisition as Requisition, ...state.requisitions] : state.requisitions,
        isLoading: false
      }));
      return requisition;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to create requisition'
      });
      throw error;
    }
  },

  submitRequisition: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiSubmitRequisition(id);
      await get().getRequisitions();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to submit requisition' });
      throw error;
    }
  },

  approveRequisition: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiApproveRequisition(id);
      await get().getRequisitions();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to approve requisition' });
      throw error;
    }
  },

  fulfillRequisition: async (id: string, data = {}) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiFulfillRequisition(id, data);
      await get().getRequisitions();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fulfill requisition' });
      throw error;
    }
  },

  deleteRequisition: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteRequisition(id);
      set(state => ({
        requisitions: state.requisitions.filter(req => req.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to delete requisition'
      });
      throw error;
    }
  },

  // Invoices
  getInvoices: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetInvoices(filters);
      const invoices = response.invoices || response.data || response;
      set({ 
        invoices: Array.isArray(invoices) ? invoices : [],
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch invoices:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch invoices' 
      });
      throw error;
    }
  },

  createInvoice: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiCreateInvoice(data);
      const newInvoice = result?.invoice || result;
      const { invoices } = get();
      set({ 
        invoices: newInvoice ? [newInvoice, ...invoices] : invoices,
        isLoading: false 
      });
      return newInvoice;
    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to create invoice' 
      });
      throw error;
    }
  },

  deleteInvoice: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteInvoice(id);
      const { invoices } = get();
      set({ 
        invoices: invoices.filter(inv => inv.id !== id),
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to delete invoice:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to delete invoice' 
      });
      throw error;
    }
  },

  getMedicationStockItems: () => {
    return get().stockItems.filter(item => item.isMedication && item.isActive);
  },

  getLocalLowStockItems: () => {
    const { stockItems } = get();
    return stockItems.filter(item => item.currentStock <= item.reorderLevel);
  },

  getExpiringItems: (days = 30) => {
    const { stockItems } = get();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    
    return stockItems.filter(item => {
      if (!item.expiryDate) return false;
      try {
        const expiryDate = new Date(item.expiryDate);
        return expiryDate <= targetDate && expiryDate >= new Date();
      } catch {
        return false;
      }
    });
  },

  clearCurrentStockItem: () => {
    set({ currentStockItem: null });
  },

  clearCurrentTransaction: () => {
    set({ currentTransaction: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));