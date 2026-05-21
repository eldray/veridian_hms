// src/store/corporateStore.ts
import { create } from 'zustand';
import {
  getCorporateAccounts,
  getCorporateAccount,
  createCorporateAccount,
  updateCorporateAccount,
  deactivateCorporateAccount,
  getCorporateEmployees,
  addCorporateEmployee,
  updateCorporateEmployee,
  removeCorporateEmployee,
  getCorporateStatistics,
  generateCorporateMonthlyBill,
  getCorporateMonthlyBills,
} from '../api';


export interface CorporateEmployee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  otherNames: string | null;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  phone: string | null;
  email: string | null;
  department: string | null;
  position: string | null;
  enrollmentDate: string;
  endDate: string | null;
  isActive: boolean;
  accountId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CorporateAccount {
  id: string;
  companyName: string;
  registrationNumber: string | null;
  taxId: string | null;
  contactPerson: string;
  email: string;
  phone: string;
  address: string | null;
  creditLimit: number;
  currentBalance: number;
  paymentTerms: number;
  discountPercentage: number;
  isActive: boolean;
  insuranceProviderId: string | null;
  createdAt: string;
  updatedAt: string;
  employees?: CorporateEmployee[];
  _count?: {
    employees: number;
    invoices: number;
    proformaInvoices: number;
  };
}

export interface CorporateStatistics {
  totalAccounts: number;
  activeAccounts: number;
  inactiveAccounts: number;
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  totalOutstanding: number;
  accountsWithDebt: number;
  averageCreditUtilization: number;
}

interface CorporateState {
  // Data
  corporateAccounts: CorporateAccount[];
  currentAccount: CorporateAccount | null;
  currentEmployees: CorporateEmployee[];
  statistics: CorporateStatistics | null;
  monthlyBills: any[];
  
  // UI State
  isLoading: boolean;
  pagination: any;
  error: string | null;
  
  // Actions
  getCorporateAccounts: (filters?: any) => Promise<void>;
  getCorporateAccount: (id: string) => Promise<CorporateAccount | null>;
  createCorporateAccount: (data: any) => Promise<CorporateAccount>;
  updateCorporateAccount: (id: string, data: any) => Promise<CorporateAccount>;
  deactivateCorporateAccount: (id: string) => Promise<CorporateAccount>;
  
  // Employee Actions
  getCorporateEmployees: (accountId: string) => Promise<CorporateEmployee[]>;
  addCorporateEmployee: (accountId: string, data: any) => Promise<CorporateEmployee>;
  updateCorporateEmployee: (id: string, data: any) => Promise<CorporateEmployee>;
  removeCorporateEmployee: (id: string) => Promise<void>;
  
  // Statistics & Billing
  getCorporateStatistics: () => Promise<CorporateStatistics | null>;
  generateMonthlyBill: (accountId: string, data: { month: number; year: number; discountPercentage?: number }) => Promise<any>;
  getMonthlyBills: (accountId: string, filters?: any) => Promise<void>;
  
  // Utility
  clearCurrentAccount: () => void;
  clearError: () => void;
}

export const useCorporateStore = create<CorporateState>((set, get) => ({
  // Initial state
  corporateAccounts: [],
  currentAccount: null,
  currentEmployees: [],
  statistics: null,
  monthlyBills: [],
  isLoading: false,
  pagination: null,
  error: null,

  // ==========================================
  // CORPORATE ACCOUNT ACTIONS
  // ==========================================

  getCorporateAccounts: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getCorporateAccounts(filters);
      
      let accounts: CorporateAccount[] = [];
      let pagination = null;
      
      if (response?.data && Array.isArray(response.data)) {
        accounts = response.data;
        pagination = response.pagination;
      } else if (Array.isArray(response)) {
        accounts = response;
      } else if (response?.accounts && Array.isArray(response.accounts)) {
        accounts = response.accounts;
        pagination = response.pagination;
      }
      
      console.log('Corporate accounts loaded:', accounts.length);
      
      set({ 
        corporateAccounts: accounts,
        pagination,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch corporate accounts:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch corporate accounts', 
        isLoading: false,
        corporateAccounts: []
      });
    }
  },

  getCorporateAccount: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getCorporateAccount(id);
      const account = response.data || response;
      
      set({ 
        currentAccount: account,
        currentEmployees: account.employees || [],
        isLoading: false 
      });
      return account;
    } catch (error: any) {
      console.error('Failed to fetch corporate account:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch corporate account', 
        isLoading: false 
      });
      return null;
    }
  },

  createCorporateAccount: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await createCorporateAccount(data);
      const newAccount = response.data || response;
      
      set(state => ({ 
        corporateAccounts: [newAccount, ...state.corporateAccounts],
        currentAccount: newAccount,
        isLoading: false 
      }));
      return newAccount;
    } catch (error: any) {
      console.error('Failed to create corporate account:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to create corporate account', 
        isLoading: false 
      });
      throw error;
    }
  },

  updateCorporateAccount: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await updateCorporateAccount(id, data);
      const updatedAccount = response.data || response;
      
      set(state => ({
        corporateAccounts: state.corporateAccounts.map(acc => 
          acc.id === id ? updatedAccount : acc
        ),
        currentAccount: state.currentAccount?.id === id ? updatedAccount : state.currentAccount,
        isLoading: false
      }));
      return updatedAccount;
    } catch (error: any) {
      console.error('Failed to update corporate account:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to update corporate account', 
        isLoading: false 
      });
      throw error;
    }
  },

  deactivateCorporateAccount: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await deactivateCorporateAccount(id);
      const updatedAccount = response.data || response;
      
      set(state => ({
        corporateAccounts: state.corporateAccounts.map(acc => 
          acc.id === id ? updatedAccount : acc
        ),
        currentAccount: state.currentAccount?.id === id ? updatedAccount : state.currentAccount,
        isLoading: false
      }));
      return updatedAccount;
    } catch (error: any) {
      console.error('Failed to deactivate corporate account:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to deactivate corporate account', 
        isLoading: false 
      });
      throw error;
    }
  },

  // ==========================================
  // EMPLOYEE ACTIONS
  // ==========================================

  getCorporateEmployees: async (accountId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getCorporateEmployees(accountId);
      const employees = response.data || response;
      
      set({ 
        currentEmployees: employees,
        isLoading: false 
      });
      return employees;
    } catch (error: any) {
      console.error('Failed to fetch employees:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch employees', 
        isLoading: false 
      });
      return [];
    }
  },

  addCorporateEmployee: async (accountId: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await addCorporateEmployee(accountId, data);
      const newEmployee = response.data || response;
      
      set(state => ({
        currentEmployees: [...state.currentEmployees, newEmployee],
        isLoading: false
      }));
      return newEmployee;
    } catch (error: any) {
      console.error('Failed to add employee:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to add employee', 
        isLoading: false 
      });
      throw error;
    }
  },

  updateCorporateEmployee: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await updateCorporateEmployee(id, data);
      const updatedEmployee = response.data || response;
      
      set(state => ({
        currentEmployees: state.currentEmployees.map(emp => 
          emp.id === id ? updatedEmployee : emp
        ),
        isLoading: false
      }));
      return updatedEmployee;
    } catch (error: any) {
      console.error('Failed to update employee:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to update employee', 
        isLoading: false 
      });
      throw error;
    }
  },

  removeCorporateEmployee: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await removeCorporateEmployee(id);
      
      set(state => ({
        currentEmployees: state.currentEmployees.filter(emp => emp.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Failed to remove employee:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to remove employee', 
        isLoading: false 
      });
      throw error;
    }
  },

  // ==========================================
  // STATISTICS & BILLING
  // ==========================================

  getCorporateStatistics: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getCorporateStatistics();
      const stats = response.data || response;
      
      set({ 
        statistics: stats,
        isLoading: false 
      });
      return stats;
    } catch (error: any) {
      console.error('Failed to fetch corporate statistics:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch statistics', 
        isLoading: false 
      });
      return null;
    }
  },

  generateMonthlyBill: async (accountId: string, data: { month: number; year: number; discountPercentage?: number }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await generateCorporateMonthlyBill(accountId, data);
      const bill = response.data || response;
      
      set({ isLoading: false });
      return bill;
    } catch (error: any) {
      console.error('Failed to generate monthly bill:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to generate bill', 
        isLoading: false 
      });
      throw error;
    }
  },

  getMonthlyBills: async (accountId: string, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getCorporateMonthlyBills(accountId, filters);
      
      let bills: any[] = [];
      let pagination = null;
      
      if (response?.data && Array.isArray(response.data)) {
        bills = response.data;
        pagination = response.pagination;
      } else if (Array.isArray(response)) {
        bills = response;
      } else if (response?.bills && Array.isArray(response.bills)) {
        bills = response.bills;
        pagination = response.pagination;
      }
      
      set({ 
        monthlyBills: bills,
        pagination,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch monthly bills:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch bills', 
        isLoading: false,
        monthlyBills: []
      });
    }
  },

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  clearCurrentAccount: () => set({ currentAccount: null, currentEmployees: [] }),
  clearError: () => set({ error: null }),
}));