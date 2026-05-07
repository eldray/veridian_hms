// stores/stockStore.ts - COMPLETE FIXED VERSION
import { create } from 'zustand';
import api from '../api';
// stores/stockStore.ts - UPDATED IMPORTS
import { create } from 'zustand';
import api from '../api';
import { 
  getStockItems as apiGetStockItems,
  getStockItem as apiGetStockItem,
  createStockItem as apiCreateStockItem,
  updateStockItem as apiUpdateStockItem,
  deleteStockItem as apiDeleteStockItem,
  getLowStockItems as apiGetLowStockItems,
  getStockCategories as apiGetStockCategories,
  getStockTransactions as apiGetStockTransactions,
  getStockTransaction as apiGetStockTransaction,
  createStockTransaction as apiCreateStockTransaction,
  updateStockTransaction as apiUpdateStockTransaction,
  getStockMovementReport as apiGetStockMovementReport,
  getRequisitions as apiGetRequisitions,
  createRequisition as apiCreateRequisition,
  deleteRequisition as apiDeleteRequisition,
  getInvoices as apiGetInvoices,
  createInvoice as apiCreateInvoice,
  deleteInvoice as apiDeleteInvoice,
  updateRequisitionStatus,
  approveRequisitionItems,
  // ✅ ADD THESE MISSING REPORT API FUNCTIONS
  getStockValueSummary as apiGetStockValueSummary,
  getExpiryReport as apiGetExpiryReport,
  getMovementSummary as apiGetMovementSummary,
  getUsageReport as apiGetUsageReport,
  getSupplierReport as apiGetSupplierReport,
  getRequisitionSummary as apiGetRequisitionSummary,
} from '../api';

// Helper to extract items from response
const extractItems = (response: any, defaultField = 'data'): any[] => {
  if (Array.isArray(response)) return response;
  if (response?.data && Array.isArray(response.data)) return response.data;
  if (response?.items && Array.isArray(response.items)) return response.items;
  if (response?.stockItems && Array.isArray(response.stockItems)) return response.stockItems;
  if (response?.transactions && Array.isArray(response.transactions)) return response.transactions;
  if (response?.requisitions && Array.isArray(response.requisitions)) return response.requisitions;
  if (response?.invoices && Array.isArray(response.invoices)) return response.invoices;
  if (response?.[defaultField] && Array.isArray(response[defaultField])) return response[defaultField];
  return [];
};

interface StockItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  strength?: string;
  unitOfMeasure: string;
  drugCode?: string;
  reorderLevel: number;
  currentStock: number;
  costPrice: number;
  isActive: boolean;
  isMedication: boolean;
  supplier?: string;
  batchNumber?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
  stockBatches?: any[];
}

interface StockTransaction {
  id: string;
  stockItemId: string;
  transactionType: 'purchase' | 'adjustment' | 'requisition' | 'sale';
  quantity: number;
  balanceAfter: number;
  reference?: string;
  notes?: string;
  transactionDate: string;
  performedBy: string;
  requisitionId?: string;
  invoiceId?: string;
  StockItem?: StockItem;
  Requisition?: any;
  Invoice?: any;
}

interface Requisition {
  id: string;
  requisitionNumber: string;
  requestingDepartmentId: string;
  requestedById: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  requiredDate?: string;
  purpose?: string;
  status: 'draft' | 'submitted' | 'approved' | 'fulfilled' | 'cancelled';
  approvedById?: string;
  approvedAt?: string;
  fulfilledById?: string;
  fulfilledAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  departments?: { name: string };
  RequisitionItem?: any[];
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: string;
  totalAmount: number;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  InvoiceItem?: any[];
  StockTransaction?: any[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface StockState {
  // Data
  stockItems: StockItem[];
  transactions: StockTransaction[];
  requisitions: Requisition[];
  invoices: Invoice[];
  
  // Current items
  currentStockItem: StockItem | null;
  currentTransaction: StockTransaction | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  pagination: Pagination | null;
  
  // Derived data
  stockCategories: string[];
  lowStockAlerts: StockItem[];
  stockMovementReport: any;
  
  // ==================== STOCK ITEMS ====================
  getStockItems: (filters?: { category?: string; isActive?: boolean; isMedication?: boolean }) => Promise<void>;
  getStockItem: (id: string) => Promise<void>;
  createStockItem: (data: Partial<StockItem>) => Promise<StockItem>;
  updateStockItem: (id: string, data: Partial<StockItem>) => Promise<StockItem>;
  deleteStockItem: (id: string) => Promise<void>;
  getLowStockItems: () => Promise<void>;
  getStockCategories: () => Promise<void>;
  
  // Stock level management
  updateStockLevel: (id: string, data: { quantity: number; transactionType: string; reference?: string; notes?: string }) => Promise<any>;
  bulkUpdateStock: (updates: Array<{ id: string; quantity: number; transactionType: string; reference?: string; notes?: string }>) => Promise<any[]>;
  
  // ==================== STOCK TRANSACTIONS ====================
  getStockTransactions: (filters?: { stockItemId?: string; transactionType?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => Promise<void>;
  getStockTransaction: (id: string) => Promise<void>;
  createStockTransaction: (data: Partial<StockTransaction>) => Promise<StockTransaction>;
  updateStockTransaction: (id: string, data: { notes?: string; reference?: string }) => Promise<StockTransaction>;
  
  // Reports
  getStockMovementReport: (filters?: { startDate?: string; endDate?: string; stockItemId?: string; category?: string }) => Promise<any>;
  getLowStockAlerts: () => Promise<StockItem[]>;
  getStockItemTransactionHistory: (stockItemId: string, page?: number, limit?: number) => Promise<StockTransaction[]>;
  
  // ==================== REQUISITIONS ====================
  getRequisitions: (filters?: { departmentId?: string; status?: string; urgency?: string; page?: number; limit?: number }) => Promise<void>;
  getRequisition: (id: string) => Promise<Requisition>;
  createRequisition: (data: any) => Promise<Requisition>;
  updateRequisition: (id: string, data: any) => Promise<Requisition>;
  deleteRequisition: (id: string) => Promise<void>;
  submitRequisition: (id: string) => Promise<Requisition>;
  approveRequisition: (id: string) => Promise<Requisition>;
  approveRequisitionItems: (id: string, approvedItems: Array<{ requisitionItemId: string; quantityApproved: number; notes?: string }>) => Promise<Requisition>;
  fulfillRequisition: (id: string, data?: any) => Promise<Requisition>;
  cancelRequisition: (id: string) => Promise<Requisition>;
  
  // ==================== INVOICES ====================
  getInvoices: (filters?: { supplierName?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => Promise<void>;
  getInvoice: (id: string) => Promise<Invoice>;
  createInvoice: (data: any) => Promise<Invoice>;
  updateInvoice: (id: string, data: any) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<void>;


  // ==================== STOCK REPORTS ====================
  getStockValueSummary: () => Promise<any>;
  getExpiryReport: (days?: number) => Promise<any>;
  getMovementSummary: (startDate?: string, endDate?: string) => Promise<any>;
  getUsageReport: (period?: string, limit?: number) => Promise<any>;
  getSupplierReport: () => Promise<any>;
  getRequisitionSummary: (startDate?: string, endDate?: string) => Promise<any>;

  
  // ==================== UTILITIES ====================
  getMedicationStockItems: () => StockItem[];
  getLocalLowStockItems: () => StockItem[];
  getExpiringItems: (days?: number) => StockItem[];
  clearCurrentStockItem: () => void;
  clearCurrentTransaction: () => void;
  clearError: () => void;
  refreshAll: () => Promise<void>;
}

export const useStockStore = create<StockState>((set, get) => ({
  // Initial state
  stockItems: [],
  transactions: [],
  requisitions: [],
  invoices: [],
  currentStockItem: null,
  currentTransaction: null,
  isLoading: false,
  error: null,
  pagination: null,
  stockCategories: [],
  lowStockAlerts: [],
  stockMovementReport: null,

  // ==================== STOCK ITEMS ====================
  
  getStockItems: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetStockItems(filters);
      const stockItems = extractItems(response, 'stockItems');
      set({ 
        stockItems: stockItems as StockItem[],
        pagination: response?.pagination || null,
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

  createStockItem: async (data: Partial<StockItem>) => {
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

  updateStockItem: async (id: string, data: Partial<StockItem>) => {
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
      const items = extractItems(lowStockItems, 'lowStockItems');
      set({ lowStockAlerts: items as StockItem[], isLoading: false });
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
      set({ stockCategories: categories || [], isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch stock categories:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch stock categories' 
      });
      throw error;
    }
  },

  updateStockLevel: async (id: string, data: { quantity: number; transactionType: string; reference?: string; notes?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.patch(`/stock-items/${id}/stock-level`, data);
      // Refresh stock items to get updated data
      await get().getStockItems();
      // Also refresh low stock alerts
      await get().getLowStockItems();
      set({ isLoading: false });
      return result.data;
    } catch (error: any) {
      console.error('Failed to update stock level:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to update stock level' 
      });
      throw error;
    }
  },

  bulkUpdateStock: async (updates: Array<{ id: string; quantity: number; transactionType: string; reference?: string; notes?: string }>) => {
    set({ isLoading: true, error: null });
    try {
      const results = [];
      for (const update of updates) {
        const result = await api.patch(`/stock-items/${update.id}/stock-level`, update);
        results.push(result.data);
      }
      // Refresh stock items
      await get().getStockItems();
      await get().getLowStockItems();
      set({ isLoading: false });
      return results;
    } catch (error: any) {
      console.error('Failed to bulk update stock:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to bulk update stock' 
      });
      throw error;
    }
  },

  // ==================== STOCK TRANSACTIONS ====================

  getStockTransactions: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetStockTransactions(filters);
      const transactions = extractItems(response, 'transactions');
      set({ 
        transactions: transactions as StockTransaction[],
        pagination: response?.pagination || null,
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

  createStockTransaction: async (data: Partial<StockTransaction>) => {
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
          const adjustment = data.transactionType === 'purchase' ? data.quantity : -(data.quantity || 0);
          return {
            ...item,
            currentStock: Math.max(0, (item.currentStock || 0) + (adjustment || 0))
          };
        }
        return item;
      });
      
      set({ stockItems: updatedStockItems as StockItem[] });
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

  updateStockTransaction: async (id: string, data: { notes?: string; reference?: string }) => {
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
      // Use the stock-items endpoint for low stock alerts
      const alerts = await apiGetLowStockItems();
      const items = extractItems(alerts, 'lowStockItems');
      set({ lowStockAlerts: items as StockItem[], isLoading: false });
      return items as StockItem[];
    } catch (error: any) {
      console.error('Failed to fetch low stock alerts:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch low stock alerts' 
      });
      throw error;
    }
  },

  getStockItemTransactionHistory: async (stockItemId: string, page = 1, limit = 50) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/stock-items/${stockItemId}/transactions`, {
        params: { page, limit }
      });
      const transactions = extractItems(response.data || response, 'transactions');
      set({ 
        transactions: transactions as StockTransaction[],
        pagination: response.data?.pagination || response?.pagination || null,
        isLoading: false 
      });
      return transactions as StockTransaction[];
    } catch (error: any) {
      console.error('Failed to fetch stock item transaction history:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch transaction history' 
      });
      throw error;
    }
  },

  // ==================== REQUISITIONS ====================

  getRequisitions: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetRequisitions(filters);
      const requisitions = extractItems(response, 'requisitions');
      set({ 
        requisitions: requisitions as Requisition[],
        pagination: response?.pagination || null,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch requisitions:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch requisitions' 
      });
      throw error;
    }
  },

  getRequisition: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/requisitions/${id}`);
      const requisition = response.data || response;
      set({ isLoading: false });
      return requisition;
    } catch (error: any) {
      console.error('Failed to fetch requisition:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch requisition' 
      });
      throw error;
    }
  },

  createRequisition: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiCreateRequisition(data);
      const newRequisition = result.requisition || result;
      const { requisitions } = get();
      set({ 
        requisitions: [newRequisition, ...requisitions],
        isLoading: false 
      });
      return newRequisition;
    } catch (error: any) {
      console.error('Failed to create requisition:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to create requisition' 
      });
      throw error;
    }
  },

  updateRequisition: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/requisitions/${id}`, data);
      const updatedRequisition = response.data || response;
      const { requisitions } = get();
      set({ 
        requisitions: requisitions.map(req => req.id === id ? updatedRequisition : req),
        isLoading: false 
      });
      return updatedRequisition;
    } catch (error: any) {
      console.error('Failed to update requisition:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to update requisition' 
      });
      throw error;
    }
  },

  deleteRequisition: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteRequisition(id);
      const { requisitions } = get();
      set({ 
        requisitions: requisitions.filter(req => req.id !== id),
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to delete requisition:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to delete requisition' 
      });
      throw error;
    }
  },

  submitRequisition: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await updateRequisitionStatus(id, 'submitted');
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
      const result = await updateRequisitionStatus(id, 'approved');
      await get().getRequisitions();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to approve requisition' });
      throw error;
    }
  },

  approveRequisitionItems: async (id: string, approvedItems: Array<{ requisitionItemId: string; quantityApproved: number; notes?: string }>) => {
    set({ isLoading: true, error: null });
    try {
      const result = await approveRequisitionItems(id, { approvedItems });
      await get().getRequisitions();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to approve requisition items' });
      throw error;
    }
  },

  fulfillRequisition: async (id: string, data = {}) => {
    set({ isLoading: true, error: null });
    try {
      const result = await updateRequisitionStatus(id, 'fulfilled', data);
      await get().getRequisitions();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to fulfill requisition' });
      throw error;
    }
  },

  cancelRequisition: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await updateRequisitionStatus(id, 'cancelled');
      await get().getRequisitions();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ isLoading: false, error: error.response?.data?.message || 'Failed to cancel requisition' });
      throw error;
    }
  },

  // ==================== INVOICES ====================

  getInvoices: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetInvoices(filters);
      const invoices = extractItems(response, 'invoices');
      set({ 
        invoices: invoices as Invoice[],
        pagination: response?.pagination || null,
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

  getInvoice: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/invoices/${id}`);
      const invoice = response.data || response;
      set({ isLoading: false });
      return invoice;
    } catch (error: any) {
      console.error('Failed to fetch invoice:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to fetch invoice' 
      });
      throw error;
    }
  },

  createInvoice: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiCreateInvoice(data);
      const newInvoice = result.invoice || result;
      const { invoices } = get();
      set({ 
        invoices: [newInvoice, ...invoices],
        isLoading: false 
      });
      // Refresh stock items as invoice may have added stock
      await get().getStockItems();
      await get().getLowStockItems();
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

  updateInvoice: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/invoices/${id}`, data);
      const updatedInvoice = response.data || response;
      const { invoices } = get();
      set({ 
        invoices: invoices.map(inv => inv.id === id ? updatedInvoice : inv),
        isLoading: false 
      });
      return updatedInvoice;
    } catch (error: any) {
      console.error('Failed to update invoice:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to update invoice' 
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
      // Refresh stock items as invoice deletion may reverse stock
      await get().getStockItems();
      await get().getLowStockItems();
    } catch (error: any) {
      console.error('Failed to delete invoice:', error);
      set({ 
        isLoading: false, 
        error: error.response?.data?.message || 'Failed to delete invoice' 
      });
      throw error;
    }
  },

  
// STOCK REPORTS
getStockValueSummary: async () => {
  set({ isLoading: true, error: null });
  try {
    const data = await apiGetStockValueSummary();
    set({ isLoading: false });
    return data;
  } catch (error: any) {
    set({ isLoading: false, error: error.response?.data?.message || 'Failed to get stock summary' });
    throw error;
  }
},

getExpiryReport: async (days = 30) => {
  set({ isLoading: true, error: null });
  try {
    const data = await apiGetExpiryReport(days);
    set({ isLoading: false });
    return data;
  } catch (error: any) {
    set({ isLoading: false, error: error.response?.data?.message || 'Failed to get expiry report' });
    throw error;
  }
},

getMovementSummary: async (startDate?: string, endDate?: string) => {
  set({ isLoading: true, error: null });
  try {
    const data = await apiGetMovementSummary(startDate, endDate);
    set({ isLoading: false });
    return data;
  } catch (error: any) {
    set({ isLoading: false, error: error.response?.data?.message || 'Failed to get movement summary' });
    throw error;
  }
},

getUsageReport: async (period = 'month', limit = 20) => {
  set({ isLoading: true, error: null });
  try {
    const data = await apiGetUsageReport(period, limit);
    set({ isLoading: false });
    return data;
  } catch (error: any) {
    set({ isLoading: false, error: error.response?.data?.message || 'Failed to get usage report' });
    throw error;
  }
},

getSupplierReport: async () => {
  set({ isLoading: true, error: null });
  try {
    const data = await apiGetSupplierReport();
    set({ isLoading: false });
    return data;
  } catch (error: any) {
    set({ isLoading: false, error: error.response?.data?.message || 'Failed to get supplier report' });
    throw error;
  }
},

getRequisitionSummary: async (startDate?: string, endDate?: string) => {
  set({ isLoading: true, error: null });
  try {
    const data = await apiGetRequisitionSummary(startDate, endDate);
    set({ isLoading: false });
    return data;
  } catch (error: any) {
    set({ isLoading: false, error: error.response?.data?.message || 'Failed to get requisition summary' });
    throw error;
  }
},

  // ==================== UTILITIES ====================

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

  refreshAll: async () => {
    await Promise.all([
      get().getStockItems(),
      get().getLowStockItems(),
      get().getStockCategories(),
      get().getRequisitions(),
      get().getInvoices()
    ]);
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