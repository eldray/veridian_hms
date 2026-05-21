// stores/stockStore.ts - COMPLETE FIXED VERSION with PurchaseInvoices
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
  // ✅ RENAMED: Invoices → PurchaseInvoices
  getPurchaseInvoices as apiGetPurchaseInvoices,
  createPurchaseInvoice as apiCreatePurchaseInvoice,
  deletePurchaseInvoice as apiDeletePurchaseInvoice,
  updateRequisitionStatus,
  approveRequisitionItems,
  // Stock Reports
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
  if (response?.purchaseInvoices && Array.isArray(response.purchaseInvoices)) return response.purchaseInvoices;
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

// ✅ RENAMED: Invoice → PurchaseInvoice
interface PurchaseInvoice {
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
  purchaseInvoices: PurchaseInvoice[];  // ✅ RENAMED
  
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
  
  // ==================== PURCHASE INVOICES (Supplier Invoices) ====================
  getPurchaseInvoices: (filters?: { supplierName?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => Promise<void>;
  getPurchaseInvoice: (id: string) => Promise<PurchaseInvoice>;
  createPurchaseInvoice: (data: any) => Promise<PurchaseInvoice>;
  updatePurchaseInvoice: (id: string, data: any) => Promise<PurchaseInvoice>;
  deletePurchaseInvoice: (id: string) => Promise<void>;

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
  purchaseInvoices: [],  // ✅ RENAMED
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
      // Request a large limit to get all items
      const allItems: StockItem[] = [];
      let currentPage = 1;
      const limit = 500; // Get 500 items per request
      let hasMore = true;
      
      while (hasMore) {
        const response = await apiGetStockItems({ 
          ...filters, 
          page: currentPage, 
          limit 
        });
        
        const items = extractItems(response, 'stockItems');
        allItems.push(...(items as StockItem[]));
        
        // Check if we've gotten all items
        const total = response?.pagination?.total || response?.total || items.length;
        hasMore = allItems.length < total && items.length === limit;
        currentPage++;
        
        // Safety: Don't make more than 10 requests
        if (currentPage > 10) break;
      }
      
      set({ 
        stockItems: allItems,
        pagination: {
          page: 1,
          limit: allItems.length,
          total: allItems.length,
          pages: 1
        },
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('Failed to fetch stock items:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to fetch stock items' 
      });
      throw error;
    }
  },

  getStockItem: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const stockItem = await apiGetStockItem(id);
      set({ currentStockItem: stockItem, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch stock item:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to fetch stock item' 
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
    } catch (error: unknown) {
      console.error('Failed to create stock item:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to create stock item' 
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
    } catch (error: unknown) {
      console.error('Failed to update stock item:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to update stock item' 
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
    } catch (error: unknown) {
      console.error('Failed to delete stock item:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to delete stock item' 
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
    } catch (error: unknown) {
      console.error('Failed to fetch low stock items:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to fetch low stock items' 
      });
      throw error;
    }
  },

  getStockCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const categories = await apiGetStockCategories();
      set({ stockCategories: categories || [], isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch stock categories:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to fetch stock categories' 
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
    } catch (error: unknown) {
      console.error('Failed to update stock level:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to update stock level' 
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
    } catch (error: unknown) {
      console.error('Failed to bulk update stock:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to bulk update stock' 
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
    } catch (error: unknown) {
      console.error('Failed to fetch stock transactions:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to fetch stock transactions' 
      });
      throw error;
    }
  },

  getStockTransaction: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const transaction = await apiGetStockTransaction(id);
      set({ currentTransaction: transaction, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch stock transaction:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to fetch stock transaction' 
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
    } catch (error: unknown) {
      console.error('Failed to create stock transaction:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to create stock transaction' 
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
    } catch (error: unknown) {
      console.error('Failed to update stock transaction:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to update stock transaction' 
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
    } catch (error: unknown) {
      console.error('Failed to fetch stock movement report:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to fetch stock movement report' 
      });
      throw error;
    }
  },

  getLowStockAlerts: async () => {
    set({ isLoading: true, error: null });
    try {
      // Use the same endpoint as getLowStockItems
      const response = await api.get('/stock-items/low-stock', {
        params: { limit: 5000 }
      });
      
      const items = extractItems(response, 'lowStockItems');
      set({ lowStockAlerts: items as StockItem[], isLoading: false });
      return items as StockItem[];
    } catch (error: unknown) {
      console.error('Failed to fetch low stock alerts:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to fetch low stock alerts' 
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
    } catch (error: unknown) {
      console.error('Failed to fetch stock item transaction history:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to fetch transaction history' 
      });
      throw error;
    }
  },

  // ==================== REQUISITIONS ====================

  getRequisitions: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const allRequisitions: Requisition[] = [];
      let currentPage = 1;
      const limit = 200;
      let hasMore = true;
      
      while (hasMore) {
        const response = await apiGetRequisitions({ 
          ...filters, 
          page: currentPage, 
          limit 
        });
        
        const requisitions = extractItems(response, 'requisitions');
        allRequisitions.push(...(requisitions as Requisition[]));
        
        const total = response?.pagination?.total || response?.total || requisitions.length;
        hasMore = allRequisitions.length < total && requisitions.length === limit;
        currentPage++;
        
        if (currentPage > 10) break;
      }
      
      set({ 
        requisitions: allRequisitions,
        pagination: {
          page: 1,
          limit: allRequisitions.length,
          total: allRequisitions.length,
          pages: 1
        },
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('Failed to fetch requisitions:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to fetch requisitions' 
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
    } catch (error: unknown) {
      console.error('Failed to fetch requisition:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to fetch requisition' 
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
    } catch (error: unknown) {
      console.error('Failed to create requisition:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to create requisition' 
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
    } catch (error: unknown) {
      console.error('Failed to update requisition:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to update requisition' 
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
    } catch (error: unknown) {
      console.error('Failed to delete requisition:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to delete requisition' 
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
    } catch (error: unknown) {
      set({ isLoading: false, error: (error as any).response?.data?.message || 'Failed to submit requisition' });
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
    } catch (error: unknown) {
      set({ isLoading: false, error: (error as any).response?.data?.message || 'Failed to approve requisition' });
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
    } catch (error: unknown) {
      set({ isLoading: false, error: (error as any).response?.data?.message || 'Failed to approve requisition items' });
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
    } catch (error: unknown) {
      set({ isLoading: false, error: (error as any).response?.data?.message || 'Failed to fulfill requisition' });
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
    } catch (error: unknown) {
      set({ isLoading: false, error: (error as any).response?.data?.message || 'Failed to cancel requisition' });
      throw error;
    }
  },

  // ==================== PURCHASE INVOICES (Supplier Invoices) ====================

  getPurchaseInvoices: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const allInvoices: PurchaseInvoice[] = [];
      let currentPage = 1;
      const limit = 200;
      let hasMore = true;
      
      while (hasMore) {
        const response = await apiGetPurchaseInvoices({ 
          ...filters, 
          page: currentPage, 
          limit 
        });
        
        const invoices = extractItems(response, 'purchaseInvoices');
        allInvoices.push(...(invoices as PurchaseInvoice[]));
        
        const total = response?.pagination?.total || response?.total || invoices.length;
        hasMore = allInvoices.length < total && invoices.length === limit;
        currentPage++;
        
        if (currentPage > 10) break;
      }
      
      set({ 
        purchaseInvoices: allInvoices,
        pagination: {
          page: 1,
          limit: allInvoices.length,
          total: allInvoices.length,
          pages: 1
        },
        isLoading: false 
      });
    } catch (error: unknown) {
      console.error('Failed to fetch purchase invoices:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to fetch purchase invoices' 
      });
      throw error;
    }
  },

  getPurchaseInvoice: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/purchase-invoices/${id}`);
      const purchaseInvoice = response.data || response;
      set({ isLoading: false });
      return purchaseInvoice;
    } catch (error: unknown) {
      console.error('Failed to fetch purchase invoice:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to fetch purchase invoice' 
      });
      throw error;
    }
  },

  createPurchaseInvoice: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiCreatePurchaseInvoice(data);
      const newPurchaseInvoice = result.purchaseInvoice || result;
      const { purchaseInvoices } = get();
      set({ 
        purchaseInvoices: [newPurchaseInvoice, ...purchaseInvoices],
        isLoading: false 
      });
      // Refresh stock items as invoice may have added stock
      await get().getStockItems();
      await get().getLowStockItems();
      return newPurchaseInvoice;
    } catch (error: unknown) {
      console.error('Failed to create purchase invoice:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to create purchase invoice' 
      });
      throw error;
    }
  },

  updatePurchaseInvoice: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/purchase-invoices/${id}`, data);
      const updatedPurchaseInvoice = response.data || response;
      const { purchaseInvoices } = get();
      set({ 
        purchaseInvoices: purchaseInvoices.map(inv => inv.id === id ? updatedPurchaseInvoice : inv),
        isLoading: false 
      });
      return updatedPurchaseInvoice;
    } catch (error: unknown) {
      console.error('Failed to update purchase invoice:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to update purchase invoice' 
      });
      throw error;
    }
  },

  deletePurchaseInvoice: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeletePurchaseInvoice(id);
      const { purchaseInvoices } = get();
      set({ 
        purchaseInvoices: purchaseInvoices.filter(inv => inv.id !== id),
        isLoading: false 
      });
      // Refresh stock items as invoice deletion may reverse stock
      await get().getStockItems();
      await get().getLowStockItems();
    } catch (error: unknown) {
      console.error('Failed to delete purchase invoice:', error);
      set({ 
        isLoading: false, 
        error: (error as any).response?.data?.message || 'Failed to delete purchase invoice' 
      });
      throw error;
    }
  },

  // ==================== STOCK REPORTS ====================
  
  getStockValueSummary: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiGetStockValueSummary();
      set({ isLoading: false });
      return data;
    } catch (error: unknown) {
      set({ isLoading: false, error: (error as any).response?.data?.message || 'Failed to get stock summary' });
      throw error;
    }
  },

  getExpiryReport: async (days = 30) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiGetExpiryReport(days);
      set({ isLoading: false });
      return data;
    } catch (error: unknown) {
      set({ isLoading: false, error: (error as any).response?.data?.message || 'Failed to get expiry report' });
      throw error;
    }
  },

  getMovementSummary: async (startDate?: string, endDate?: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiGetMovementSummary(startDate, endDate);
      set({ isLoading: false });
      return data;
    } catch (error: unknown) {
      set({ isLoading: false, error: (error as any).response?.data?.message || 'Failed to get movement summary' });
      throw error;
    }
  },

  getUsageReport: async (period = 'month', limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiGetUsageReport(period, limit);
      set({ isLoading: false });
      return data;
    } catch (error: unknown) {
      set({ isLoading: false, error: (error as any).response?.data?.message || 'Failed to get usage report' });
      throw error;
    }
  },

  getSupplierReport: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiGetSupplierReport();
      set({ isLoading: false });
      return data;
    } catch (error: unknown) {
      set({ isLoading: false, error: (error as any).response?.data?.message || 'Failed to get supplier report' });
      throw error;
    }
  },

  getRequisitionSummary: async (startDate?: string, endDate?: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiGetRequisitionSummary(startDate, endDate);
      set({ isLoading: false });
      return data;
    } catch (error: unknown) {
      set({ isLoading: false, error: (error as any).response?.data?.message || 'Failed to get requisition summary' });
      throw error;
    }
  },

  // ==================== UTILITIES ====================

  getMedicationStockItems: () => {
    return get().stockItems.filter(item => item.isMedication && item.isActive);
  },

  // ✅ FIXED: Local low stock items now works correctly
  getLocalLowStockItems: () => {
    const { stockItems } = get();
    // Return ALL items that are below reorder level
    return stockItems.filter(item => item.currentStock <= item.reorderLevel);
  },

  // ✅ FIXED: Get expiring items from ALL stock items
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
      get().getPurchaseInvoices()
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