// stores/stockStore.ts - UPDATED VERSION
import { create } from 'zustand';
import { 
  getStockItems as apiGetStockItems,
  getStockItem as apiGetStockItem,
  createStockItem as apiCreateStockItem,
  updateStockItem as apiUpdateStockItem,
  deleteStockItem as apiDeleteStockItem,
  getStockTransactions as apiGetStockTransactions,
  createStockTransaction as apiCreateStockTransaction
} from '../api';
import type { StockItem, StockTransaction, Pagination } from '../types';

interface StockState {
  stockItems: StockItem[];
  transactions: StockTransaction[];
  currentStockItem: StockItem | null;
  isLoading: boolean;
  pagination: Pagination | null;
  
  // Stock Items
  getStockItems: (filters?: any) => Promise<void>;
  getStockItem: (id: string) => Promise<void>;
  createStockItem: (data: any) => Promise<void>;
  updateStockItem: (id: string, data: any) => Promise<void>;
  deleteStockItem: (id: string) => Promise<void>;
  
  // Stock Transactions
  getStockTransactions: (filters?: any) => Promise<void>;
  createStockTransaction: (data: any) => Promise<void>;
  
  // NEW METHODS: Utility functions for the Pharmacy component
  getLowStockItems: () => StockItem[];
  getExpiringItems: (days?: number) => StockItem[];
  
  clearCurrentStockItem: () => void;
}

export const useStockStore = create<StockState>((set, get) => ({
  stockItems: [],
  transactions: [],
  currentStockItem: null,
  isLoading: false,
  pagination: null,

  getStockItems: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetStockItems(filters);
      set({ 
        stockItems: response.stockItems || response.data || response,
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch stock items:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getStockItem: async (id: string) => {
    set({ isLoading: true });
    try {
      const stockItem = await apiGetStockItem(id);
      set({ currentStockItem: stockItem, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch stock item:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createStockItem: async (data: any) => {
    set({ isLoading: true });
    try {
      const newStockItem = await apiCreateStockItem(data);
      const stockItems = get().stockItems;
      set({ 
        stockItems: [newStockItem, ...stockItems],
        currentStockItem: newStockItem,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to create stock item:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateStockItem: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedStockItem = await apiUpdateStockItem(id, data);
      const stockItems = get().stockItems.map(item => 
        item._id === id ? updatedStockItem : item
      );
      set({ 
        stockItems,
        currentStockItem: updatedStockItem,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update stock item:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteStockItem: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteStockItem(id);
      const stockItems = get().stockItems.filter(item => item._id !== id);
      set({ 
        stockItems,
        currentStockItem: get().currentStockItem?._id === id ? null : get().currentStockItem,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to delete stock item:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getStockTransactions: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetStockTransactions(filters);
      set({ 
        transactions: response.transactions || response.data || response,
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch stock transactions:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createStockTransaction: async (data: any) => {
    set({ isLoading: true });
    try {
      const newTransaction = await apiCreateStockTransaction(data);
      const transactions = get().transactions;
      set({ 
        transactions: [newTransaction, ...transactions],
        isLoading: false 
      });
      
      // Update the stock item's current stock if needed
      if (get().currentStockItem?._id === data.stockItemId) {
        await get().getStockItem(data.stockItemId);
      }
    } catch (error) {
      console.error('Failed to create stock transaction:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // NEW: Get low stock items (below reorder level)
  getLowStockItems: () => {
    const { stockItems } = get();
    return stockItems.filter(item => 
      item.currentStock <= item.reorderLevel
    );
  },

  // NEW: Get items expiring within specified days (default: 30 days)
  getExpiringItems: (days = 30) => {
    const { stockItems } = get();
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    
    return stockItems.filter(item => {
      if (!item.expiryDate) return false;
      
      const expiryDate = new Date(item.expiryDate);
      return expiryDate <= targetDate && expiryDate >= new Date(); // Only future expiries
    });
  },

  clearCurrentStockItem: () => {
    set({ currentStockItem: null });
  },
}));
