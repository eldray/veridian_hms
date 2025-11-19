// src/store/settingsStore.ts - UPDATED WITH USER MANAGEMENT
import { create } from 'zustand';
import { 
  getHospitalDetails as apiGetHospitalDetails,
  updateHospitalDetails as apiUpdateHospitalDetails,
  getAllUsers as apiGetAllUsers,
  updateUser as apiUpdateUser,
  deactivateUser as apiDeactivateUser,
  getHospital as apiGetHospital,
  // Backup functions
  createBackup as apiCreateBackup,
  restoreBackup as apiRestoreBackup,
  getBackupList as apiGetBackupList,
  downloadBackup as apiDownloadBackup,
  deleteBackup as apiDeleteBackup,
  // NHIS Settings
  getHospitalNHISSettings as apiGetNHISSettings,
  updateHospitalNHISSettings as apiUpdateNHISSettings,
  // User Management
  getUsers as apiGetUsers,
  getUserStats as apiGetUserStats,
  getUsersByDepartment as apiGetUsersByDepartment,
  updateUserDepartment as apiUpdateUserDepartment
} from '../api';
import type { User, Hospital } from '../types';

interface NHISConfig {
  providerId: string;
  facilityCode: string;
  accreditationNumber: string;
  tariffVersion: string;
  claimEndpoint: string;
  isActive: boolean;
}

interface SettingsState {
  hospital: Hospital | null;
  users: User[];
  backups: any[];
  isLoading: boolean;
  error: string | null;
  pagination: any;
  nhisConfig: NHISConfig;
  userStats: any; // ✅ ADDED
  
  // Hospital Management
  getHospitalDetails: () => Promise<void>;
  updateHospitalDetails: (data: Partial<Hospital>) => Promise<Hospital>;
  getHospital: () => Promise<void>;
  loadHospitalOnStartup: () => Promise<void>;
  clearHospital: () => void;
  
  // User Management
  getAllUsers: (filters?: any) => Promise<void>;
  updateUser: (userId: string, data: Partial<User>) => Promise<User>;
  deactivateUser: (userId: string) => Promise<void>;
  
  // ✅ ADDED USER MANAGEMENT FUNCTIONS
  getUsers: (filters?: any) => Promise<void>;
  getUserStats: () => Promise<void>;
  getUsersByDepartment: (departmentId: string) => Promise<User[]>;
  updateUserDepartment: (userId: string, departmentId: string) => Promise<void>;
  
  // Backup & Restore
  createBackup: () => Promise<any>;
  restoreBackup: (backupFile: File) => Promise<any>;
  getBackupList: () => Promise<any[]>;
  downloadBackup: (filename: string) => Promise<void>;
  deleteBackup: (filename: string) => Promise<void>;
  
  // NHIS Configuration
  getNHISConfig: () => Promise<void>;
  updateNHISConfig: (config: Partial<NHISConfig>) => Promise<void>;
  
  clearError: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hospital: null,
  users: [],
  backups: [],
  isLoading: false,
  error: null,
  pagination: null,
  nhisConfig: {
    providerId: '',
    facilityCode: '',
    accreditationNumber: '',
    tariffVersion: '2024',
    claimEndpoint: '',
    isActive: false
  },
  userStats: null, // ✅ ADDED

  // Hospital Management
  getHospitalDetails: async () => {
    set({ isLoading: true });
    try {
      const hospital = await apiGetHospitalDetails();
      set({ hospital, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch hospital details:', error);
      set({ isLoading: false, error: error.message || 'Failed to fetch hospital details' });
      throw error;
    }
  },

  updateHospitalDetails: async (data: Partial<Hospital>) => {
    set({ isLoading: true });
    try {
      const hospital = await apiUpdateHospitalDetails(data);
      set({ hospital, isLoading: false });
      return hospital;
    } catch (error: any) {
      console.error('Failed to update hospital details:', error);
      set({ isLoading: false, error: error.message || 'Failed to update hospital details' });
      throw error;
    }
  },

  getHospital: async () => {
    set({ isLoading: true });
    try {
      const hospital = await apiGetHospital();
      set({ hospital, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch hospital:', error);
      set({ isLoading: false, error: error.message || 'Failed to fetch hospital' });
      throw error;
    }
  },

  loadHospitalOnStartup: async () => {
    const hospital = get().hospital;
    if (hospital?.nhisFacilityCode) return;

    set({ isLoading: true });
    try {
      await get().getHospital();
    } catch (error) {
      console.error('Failed to load hospital on startup:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  clearHospital: () => {
    set({ hospital: null });
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
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      set({ isLoading: false, error: error.message || 'Failed to fetch users' });
      throw error;
    }
  },

  updateUser: async (userId: string, data: Partial<User>) => {
    set({ isLoading: true });
    try {
      const updatedUser = await apiUpdateUser(userId, data);
      const users = get().users.map(user => 
        user.id === userId ? updatedUser : user
      );
      set({ users, isLoading: false });
      return updatedUser;
    } catch (error: any) {
      console.error('Failed to update user:', error);
      set({ isLoading: false, error: error.message || 'Failed to update user' });
      throw error;
    }
  },

  deactivateUser: async (userId: string) => {
    set({ isLoading: true });
    try {
      await apiDeactivateUser(userId);
      const users = get().users.map(user => 
        user.id === userId ? { ...user, isActive: false } : user
      );
      set({ users, isLoading: false });
    } catch (error: any) {
      console.error('Failed to deactivate user:', error);
      set({ isLoading: false, error: error.message || 'Failed to deactivate user' });
      throw error;
    }
  },

  // ✅ ADDED USER MANAGEMENT FUNCTIONS
  getUsers: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetUsers(filters);
      set({ 
        users: response.users || response.data || response,
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch users' });
      throw error;
    }
  },

  getUserStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await apiGetUserStats();
      set({ userStats: stats, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch user stats' });
      throw error;
    }
  },

  getUsersByDepartment: async (departmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const users = await apiGetUsersByDepartment(departmentId);
      set({ isLoading: false });
      return users;
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch department users' });
      throw error;
    }
  },

  updateUserDepartment: async (userId: string, departmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiUpdateUserDepartment(userId, departmentId);
      
      // Update local state
      const updatedUsers = get().users.map(user => 
        user.id === userId ? { ...user, departmentId } : user
      );
      
      set({ users: updatedUsers, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update user department' });
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
    } catch (error: any) {
      set({ error: error.message || 'Failed to create backup', isLoading: false });
      throw error;
    }
  },

  restoreBackup: async (backupFile: File) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('backupFile', backupFile);
      
      const result = await apiRestoreBackup(formData);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.message || 'Failed to restore backup', isLoading: false });
      throw error;
    }
  },

  getBackupList: async () => {
    set({ isLoading: true, error: null });
    try {
      const backups = await apiGetBackupList();
      set({ backups, isLoading: false });
      return backups;
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch backup list', isLoading: false });
      throw error;
    }
  },

  downloadBackup: async (filename: string) => {
    try {
      await apiDownloadBackup(filename);
    } catch (error: any) {
      set({ error: error.message || 'Failed to download backup' });
      throw error;
    }
  },

  deleteBackup: async (filename: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteBackup(filename);
      const backups = get().backups.filter(backup => backup.filename !== filename);
      set({ backups, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to delete backup' });
      throw error;
    }
  },

  // NHIS Configuration
  getNHISConfig: async () => {
    set({ isLoading: true });
    try {
      const nhisConfig = await apiGetNHISSettings();
      set({ nhisConfig, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch NHIS config:', error);
      set({ isLoading: false, error: error.message || 'Failed to fetch NHIS config' });
      throw error;
    }
  },

  updateNHISConfig: async (config: Partial<NHISConfig>) => {
    set({ isLoading: true });
    try {
      const nhisConfig = await apiUpdateNHISSettings(config);
      set({ nhisConfig, isLoading: false });
    } catch (error: any) {
      console.error('Failed to update NHIS config:', error);
      set({ isLoading: false, error: error.message || 'Failed to update NHIS config' });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));