// src/store/departmentStore.ts
import { create } from 'zustand';
import { 
  getDepartments as apiGetDepartments, 
  getDepartment as apiGetDepartment, 
  createDepartment as apiCreateDepartment, 
  updateDepartment as apiUpdateDepartment, 
  deleteDepartment as apiDeleteDepartment,
  getDepartmentStats as apiGetDepartmentStats,
  getDepartmentUsers as apiGetDepartmentUsers,
  assignUserToDepartment as apiAssignUserToDepartment,
  assignDepartmentHead as apiAssignDepartmentHead,
  removeUserFromDepartment as apiRemoveUserFromDepartment,
  bulkUpdateDepartments as apiBulkUpdateDepartments,
  getEligibleDepartmentHeads as apiGetEligibleDepartmentHeads  // ✅ ADD THIS
} from '../api';
import type { Department, User } from '../types';

// ✅ ADD EligibleDepartmentHead type
export interface EligibleDepartmentHead {
  id: string;
  fullName: string;
  role: string;
  seniority: 'TRAINEE' | 'JUNIOR' | 'SENIOR' | 'PRINCIPAL';
  specialization: string | null;
  departmentId: string | null;
  department: {
    id: string;
    name: string;
  } | null;
}

interface DepartmentStore {
  departments: Department[];
  currentDepartment: Department | null;
  departmentUsers: User[];
  departmentStats: any;
  eligibleHeads: EligibleDepartmentHead[];  // ✅ ADD THIS
  isLoading: boolean;
  error: string | null;
  
  // Core Actions
  getDepartments: (filters?: any) => Promise<void>;
  getDepartment: (id: string) => Promise<void>;
  createDepartment: (data: any) => Promise<void>;
  updateDepartment: (id: string, data: any) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  assignDepartmentHead: (departmentId: string, userId: string) => Promise<void>;
  
  // Department Management
  getDepartmentStats: (id: string) => Promise<void>;
  getDepartmentUsers: (departmentId: string) => Promise<void>;
  assignUserToDepartment: (departmentId: string, userData: any) => Promise<void>;
  removeUserFromDepartment: (departmentId: string, userData: any) => Promise<void>;
  bulkUpdateDepartments: (data: any) => Promise<any>;
  
  // ✅ ADD: Get eligible department heads (SENIOR/PRINCIPAL only)
  getEligibleHeads: () => Promise<EligibleDepartmentHead[]>;
  
  clearError: () => void;
  clearCurrentDepartment: () => void;
}

export const useDepartmentStore = create<DepartmentStore>((set, get) => ({
  departments: [],
  currentDepartment: null,
  departmentUsers: [],
  departmentStats: null,
  eligibleHeads: [],  // ✅ ADD THIS
  isLoading: false,
  error: null,

  getDepartments: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetDepartments(filters);
      const departments = Array.isArray(response) ? response : response?.data || [];
      set({ departments, isLoading: false });
    } catch (error: unknown) {
      set({ 
        error: (error as any).response?.data?.message || 'Failed to fetch departments', 
        isLoading: false 
      });
      throw error;
    }
  },

  getDepartment: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const department = await apiGetDepartment(id);
      set({ currentDepartment: department, isLoading: false });
    } catch (error: unknown) {
      set({ 
        error: (error as any).response?.data?.message || 'Failed to fetch department', 
        isLoading: false 
      });
      throw error;
    }
  },

  createDepartment: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const newDepartment = await apiCreateDepartment(data);
      set(state => ({ 
        departments: [...state.departments, newDepartment],
        isLoading: false 
      }));
    } catch (error: unknown) {
      set({ 
        error: (error as any).response?.data?.message || 'Failed to create department', 
        isLoading: false 
      });
      throw error;
    }
  },

  updateDepartment: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const updatedDepartment = await apiUpdateDepartment(id, data);
      set(state => ({
        departments: state.departments.map(dept => 
          dept.id === id ? updatedDepartment : dept
        ),
        currentDepartment: state.currentDepartment?.id === id ? updatedDepartment : state.currentDepartment,
        isLoading: false
      }));
    } catch (error: unknown) {
      set({ 
        error: (error as any).response?.data?.message || 'Failed to update department', 
        isLoading: false 
      });
      throw error;
    }
  },

  deleteDepartment: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteDepartment(id);
      set(state => ({
        departments: state.departments.filter(dept => dept.id !== id),
        currentDepartment: state.currentDepartment?.id === id ? null : state.currentDepartment,
        isLoading: false
      }));
    } catch (error: unknown) {
      set({ 
        error: (error as any).response?.data?.message || 'Failed to delete department', 
        isLoading: false 
      });
      throw error;
    }
  },

  assignDepartmentHead: async (departmentId: string, userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedDepartment = await apiUpdateDepartment(departmentId, { headId: userId });
      
      set(state => ({
        departments: state.departments.map(d => 
          d.id === departmentId ? updatedDepartment : d
        ),
        currentDepartment: state.currentDepartment?.id === departmentId ? updatedDepartment : state.currentDepartment,
        isLoading: false
      }));
    } catch (error: unknown) {
      set({ 
        error: (error as any).response?.data?.message || 'Failed to assign department head', 
        isLoading: false 
      });
      throw error;
    }
  },

  getDepartmentStats: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const stats = await apiGetDepartmentStats(id);
      set({ departmentStats: stats, isLoading: false });
    } catch (error: unknown) {
      set({ 
        error: (error as any).response?.data?.message || 'Failed to fetch department stats', 
        isLoading: false 
      });
      throw error;
    }
  },

  getDepartmentUsers: async (departmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetDepartmentUsers(departmentId);
      // Handle different response formats
      const users = Array.isArray(response) ? response : response?.users || response?.data || [];
      set({ departmentUsers: users, isLoading: false });
      return users;
    } catch (error: unknown) {
      set({ 
        error: (error as any).response?.data?.message || 'Failed to fetch department users', 
        isLoading: false,
        departmentUsers: [] 
      });
      throw error;
    }
  },

  assignUserToDepartment: async (departmentId: string, userData: any) => {
    set({ isLoading: true, error: null });
    try {
      // Send as { userId: string } format
      const payload = typeof userData === 'string' ? { userId: userData } : userData;
      await apiAssignUserToDepartment(departmentId, payload);
      
      await get().getDepartmentUsers(departmentId);
      await get().getDepartments();
      set({ isLoading: false });
    } catch (error: unknown) {
      set({ 
        error: (error as any).response?.data?.message || 'Failed to assign user to department', 
        isLoading: false 
      });
      throw error;
    }
  },

  removeUserFromDepartment: async (departmentId: string, userId: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiRemoveUserFromDepartment(departmentId, userId);
      
      await get().getDepartmentUsers(departmentId);
      await get().getDepartments();
      set({ isLoading: false });
    } catch (error: unknown) {
      set({ 
        error: (error as any).response?.data?.message || 'Failed to remove user from department', 
        isLoading: false 
      });
      throw error;
    }
  },

  bulkUpdateDepartments: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiBulkUpdateDepartments(data);
      await get().getDepartments();
      set({ isLoading: false });
      return result;
    } catch (error: unknown) {
      set({ 
        error: (error as any).response?.data?.message || 'Failed to bulk update departments', 
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ ADD: Get eligible department heads (only SENIOR and PRINCIPAL)
  getEligibleHeads: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetEligibleDepartmentHeads();
      const eligibleHeads = response?.data || response || [];
      set({ eligibleHeads, isLoading: false });
      return eligibleHeads;
    } catch (error: unknown) {
      set({ 
        error: (error as any).response?.data?.message || 'Failed to fetch eligible department heads', 
        isLoading: false 
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentDepartment: () => set({ currentDepartment: null }),
}));