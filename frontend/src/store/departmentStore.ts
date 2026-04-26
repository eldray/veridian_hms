import { create } from 'zustand';
import { 
  getDepartments as apiGetDepartments, 
  getDepartment as apiGetDepartment, 
  createDepartment as apiCreateDepartment, 
  updateDepartment as apiUpdateDepartment, 
  deleteDepartment as apiDeleteDepartment,
  assignDepartmentHead as apiAssignDepartmentHead,
  // ✅ ADDED MISSING FUNCTIONS
  getDepartmentStats as apiGetDepartmentStats,
  getDepartmentUsers as apiGetDepartmentUsers,
  assignUserToDepartment as apiAssignUserToDepartment,
  removeUserFromDepartment as apiRemoveUserFromDepartment,
  bulkUpdateDepartments as apiBulkUpdateDepartments
} from '../api';
import type { Department, User } from '../types';

interface DepartmentStore {
  departments: Department[];
  currentDepartment: Department | null;
  departmentUsers: User[]; // ✅ ADDED
  departmentStats: any; // ✅ ADDED
  isLoading: boolean;
  error: string | null;
  
  // Core Actions
  getDepartments: (filters?: any) => Promise<void>;
  getDepartment: (id: string) => Promise<void>;
  createDepartment: (data: any) => Promise<void>;
  updateDepartment: (id: string, data: any) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  assignDepartmentHead: (departmentId: string, userId: string) => Promise<void>;
  
  // ✅ ADDED MISSING FUNCTIONS
  getDepartmentStats: (id: string) => Promise<void>;
  getDepartmentUsers: (departmentId: string) => Promise<void>;
  assignUserToDepartment: (departmentId: string, userData: any) => Promise<void>;
  removeUserFromDepartment: (departmentId: string, userData: any) => Promise<void>;
  bulkUpdateDepartments: (data: any) => Promise<void>;
  
  clearError: () => void;
  clearCurrentDepartment: () => void;
}

export const useDepartmentStore = create<DepartmentStore>((set, get) => ({
  departments: [],
  currentDepartment: null,
  departmentUsers: [], // ✅ ADDED
  departmentStats: null, // ✅ ADDED
  isLoading: false,
  error: null,

  getDepartments: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const departments = await apiGetDepartments(filters);
      set({ departments, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch departments', 
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
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch department', 
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
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to create department', 
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
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to update department', 
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
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to delete department', 
        isLoading: false 
      });
      throw error;
    }
  },

  assignDepartmentHead: async (departmentId: string, userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedDepartment = await apiAssignDepartmentHead(departmentId, userId);
      set(state => ({
        departments: state.departments.map(dept => 
          dept.id === departmentId ? updatedDepartment : dept
        ),
        currentDepartment: state.currentDepartment?.id === departmentId ? updatedDepartment : state.currentDepartment,
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to assign department head', 
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ ADDED MISSING FUNCTIONS
  getDepartmentStats: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const stats = await apiGetDepartmentStats(id);
      set({ departmentStats: stats, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch department stats', 
        isLoading: false 
      });
      throw error;
    }
  },

  getDepartmentUsers: async (departmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const users = await apiGetDepartmentUsers(departmentId);
      set({ departmentUsers: users, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch department users', 
        isLoading: false 
      });
      throw error;
    }
  },

  assignUserToDepartment: async (departmentId: string, userData: any) => {
    set({ isLoading: true, error: null });
    try {
      await apiAssignUserToDepartment(departmentId, userData);
      
      // Refresh department users after assignment
      await get().getDepartmentUsers(departmentId);
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to assign user to department', 
        isLoading: false 
      });
      throw error;
    }
  },

  removeUserFromDepartment: async (departmentId: string, userData: any) => {
    set({ isLoading: true, error: null });
    try {
      await apiRemoveUserFromDepartment(departmentId, userData);
      
      // Refresh department users after removal
      await get().getDepartmentUsers(departmentId);
      set({ isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to remove user from department', 
        isLoading: false 
      });
      throw error;
    }
  },

  bulkUpdateDepartments: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiBulkUpdateDepartments(data);
      
      // Refresh departments list after bulk update
      await get().getDepartments();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to bulk update departments', 
        isLoading: false 
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentDepartment: () => set({ currentDepartment: null }),
}));