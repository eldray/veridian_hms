// src/store/settingsStore.ts
import { create } from 'zustand';
import { 
  getHospitalDetails as apiGetHospitalDetails,
  updateHospitalDetails as apiUpdateHospitalDetails,
  getAllUsers as apiGetAllUsers,
  updateUser as apiUpdateUser,
  deactivateUser as apiDeactivateUser,
  getHospital as apiGetHospital
} from '../api';
import { 
  createBackup as apiCreateBackup,
  restoreBackup as apiRestoreBackup,
  getBackupList as apiGetBackupList,
  downloadBackup as apiDownloadBackup
} from '../api/backupApi';
import type { User, Hospital } from '../types';

interface SettingsState {
  hospital: Hospital | null;
  users: User[];
  backups: any[];
  isLoading: boolean;
  error: string | null;
  pagination: any;
  
  // Hospital Management
  getHospitalDetails: () => Promise<void>;
  updateHospitalDetails: (data: Partial<Hospital>) => Promise<Hospital>;
  getHospital: () => Promise<void>;
  
  // User Management
  getAllUsers: (filters?: any) => Promise<void>;
  updateUser: (userId: string, data: Partial<User>) => Promise<User>;
  deactivateUser: (userId: string) => Promise<void>;
  
  // Backup & Restore
  createBackup: () => Promise<any>;
  restoreBackup: (backupFile: File) => Promise<any>;
  getBackupList: () => Promise<any[]>;
  downloadBackup: (filename: string) => Promise<void>;
  
  clearHospital: () => void;
  clearError: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hospital: null,
  users: [],
  backups: [],
  isLoading: false,
  error: null,
  pagination: null,

  // Hospital Management
  getHospitalDetails: async () => {
    set({ isLoading: true });
    try {
      const hospital = await apiGetHospitalDetails();
      set({ hospital, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch hospital details:', error);
      set({ isLoading: false, error: (error as Error).message });
      throw error;
    }
  },

  updateHospitalDetails: async (data: Partial<Hospital>) => {
    set({ isLoading: true });
    try {
      const hospital = await apiUpdateHospitalDetails(data);
      set({ hospital, isLoading: false });
      return hospital;
    } catch (error) {
      console.error('Failed to update hospital details:', error);
      set({ isLoading: false, error: (error as Error).message });
      throw error;
    }
  },

  getHospital: async () => {
    set({ isLoading: true });
    try {
      const hospital = await apiGetHospital();
      set({ hospital, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch hospital:', error);
      set({ isLoading: false, error: (error as Error).message });
      throw error;
    }
  },

  // Backup & Restore
  createBackup: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiCreateBackup();
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  restoreBackup: async (backupFile: File) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiRestoreBackup(backupFile);
      set({ isLoading: false });
      return result;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  getBackupList: async () => {
    set({ isLoading: true, error: null });
    try {
      const backups = await apiGetBackupList();
      set({ backups, isLoading: false });
      return backups;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  downloadBackup: async (filename: string) => {
    try {
      await apiDownloadBackup(filename);
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  // User Management
  getAllUsers: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetAllUsers(filters);
      set({ 
        users: response.users || response.data || response,
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch users:', error);
      set({ isLoading: false, error: (error as Error).message });
      throw error;
    }
  },

  updateUser: async (userId: string, data: Partial<User>) => {
    set({ isLoading: true });
    try {
      const updatedUser = await apiUpdateUser(userId, data);
      const users = get().users.map(user => 
        user._id === userId ? updatedUser : user
      );
      set({ users, isLoading: false });
      return updatedUser;
    } catch (error) {
      console.error('Failed to update user:', error);
      set({ isLoading: false, error: (error as Error).message });
      throw error;
    }
  },

  deactivateUser: async (userId: string) => {
    set({ isLoading: true });
    try {
      await apiDeactivateUser(userId);
      const users = get().users.map(user => 
        user._id === userId ? { ...user, isActive: false } : user
      );
      set({ users, isLoading: false });
    } catch (error) {
      console.error('Failed to deactivate user:', error);
      set({ isLoading: false, error: (error as Error).message });
      throw error;
    }
  },

  clearHospital: () => {
    set({ hospital: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));
