// src/store/settingsStore.ts - UPDATED & ALIGNED
import { create } from 'zustand';
import {
  // Hospital Management
  getHospitalDetails,
  updateHospitalDetails,
  getHospital,
  getHospitalNHISSettings,
  updateHospitalNHISSettings,

  // User Management
  getAllUsers,
  updateUser,
  deactivateUser,
  getUsers,
  getUserStats,
  getUsersByDepartment,
  updateUserDepartment,

  // Backup & Restore
  createBackup,
  restoreBackup,
  getBackupList,
  downloadBackup,
  deleteBackup,
} from '../api'; // ✅ USING UNIFIED API INDEX
import type { User, Hospital, BackupFile } from '../types';

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
  backups: BackupFile[];
  isLoading: boolean;
  error: string | null;
  pagination: any;
  nhisConfig: NHISConfig;
  userStats: any;

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
  getUsers: (filters?: any) => Promise<void>;
  getUserStats: () => Promise<void>;
  getUsersByDepartment: (departmentId: string) => Promise<User[]>;
  updateUserDepartment: (userId: string, departmentId: string) => Promise<void>;

  // Backup & Restore
  createBackup: () => Promise<any>;
  restoreBackup: (backupFile: File) => Promise<any>;
  getBackupList: () => Promise<BackupFile[]>;
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
  userStats: null,

  // Hospital Management
  getHospitalDetails: async () => {
    set({ isLoading: true, error: null });
    try {
      const hospital = await getHospitalDetails();
      set({ hospital, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch hospital details:', error);
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch hospital details'
      });
      throw error;
    }
  },

  updateHospitalDetails: async (data: Partial<Hospital>) => {
    set({ isLoading: true, error: null });
    try {
      const hospital = await updateHospitalDetails(data);
      set({ hospital, isLoading: false });
      return hospital;
    } catch (error: unknown) {
      console.error('Failed to update hospital details:', error);
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to update hospital details'
      });
      throw error;
    }
  },

  getHospital: async () => {
    set({ isLoading: true, error: null });
    try {
      const hospital = await getHospital();
      set({ hospital, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch hospital:', error);
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch hospital'
      });
      throw error;
    }
  },

  loadHospitalOnStartup: async () => {
    const hospital = get().hospital;
    if (hospital?.nhisFacilityCode) return;

    set({ isLoading: true, error: null });
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
    set({ isLoading: true, error: null });
    try {
      const response = await getAllUsers(filters);
      set({
        users: response.users || response.data || response,
        pagination: response.pagination || null,
        isLoading: false
      });
    } catch (error: unknown) {
      console.error('Failed to fetch users:', error);
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch users'
      });
      throw error;
    }
  },

  updateUser: async (userId: string, data: Partial<User>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await updateUser(userId, data);
      const users = get().users.map(user =>
        user.id === userId ? updatedUser : user
      );
      set({ users, isLoading: false });
      return updatedUser;
    } catch (error: unknown) {
      console.error('Failed to update user:', error);
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to update user'
      });
      throw error;
    }
  },

  deactivateUser: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      await deactivateUser(userId);
      const users = get().users.map(user =>
        user.id === userId ? { ...user, isActive: false } : user
      );
      set({ users, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to deactivate user:', error);
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to deactivate user'
      });
      throw error;
    }
  },

  getUsers: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getUsers(filters);
      set({
        users: response.users || response.data || response,
        pagination: response.pagination || null,
        isLoading: false
      });
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch users'
      });
      throw error;
    }
  },

  getUserStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await getUserStats();
      set({ userStats: stats, isLoading: false });
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch user stats'
      });
      throw error;
    }
  },

  getUsersByDepartment: async (departmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      const users = await getUsersByDepartment(departmentId);
      set({ isLoading: false });
      return users;
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch department users'
      });
      throw error;
    }
  },

  updateUserDepartment: async (userId: string, departmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      await updateUserDepartment(userId, departmentId);

      // Update local state
      const updatedUsers = get().users.map(user =>
        user.id === userId ? { ...user, departmentId } : user
      );

      set({ users: updatedUsers, isLoading: false });
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to update user department'
      });
      throw error;
    }
  },

  // Backup & Restore - FIXED DOWNLOAD FUNCTION
  createBackup: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await createBackup();
      set({ isLoading: false });
      return result;
    } catch (error: unknown) {
      set({
        error: error.response?.data?.message || 'Failed to create backup',
        isLoading: false
      });
      throw error;
    }
  },

  restoreBackup: async (backupFile: File) => {
    set({ isLoading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('backupFile', backupFile);

      const result = await restoreBackup(formData);
      set({ isLoading: false });
      return result;
    } catch (error: unknown) {
      set({
        error: error.response?.data?.message || 'Failed to restore backup',
        isLoading: false
      });
      throw error;
    }
  },

  getBackupList: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getBackupList();
      // Ensure backups is always an array
      const backups = Array.isArray(response) ? response : 
                     (response.data && Array.isArray(response.data)) ? response.data : 
                     (response.backups && Array.isArray(response.backups)) ? response.backups : [];
      
      set({ 
        backups,
        isLoading: false 
      });
    } catch (error: unknown) {
      set({
        error: error.response?.data?.message || 'Failed to fetch backups',
        isLoading: false,
        backups: [] // Ensure empty array on error
      });
    }
  },

  // ✅ FIXED: Proper download implementation
downloadBackup: async (filename: string) => {
  set({ isLoading: true, error: null });
  try {
    console.log('🔄 Store: Starting download for', filename);
    
    // Just call the API function - it handles the download internally
    await downloadBackup(filename);
    
    set({ isLoading: false });
    
  } catch (error: unknown) {
    console.error('❌ Store: Download failed:', error);
    
    const errorMessage = error.response?.data?.message || error.message || 'Failed to download backup';
    set({
      error: errorMessage,
      isLoading: false
    });
    
    throw new Error(errorMessage);
  }
},

  deleteBackup: async (filename: string) => {
    set({ isLoading: true, error: null });
    try {
      await deleteBackup(filename);
      const backups = get().backups.filter(backup => backup.filename !== filename);
      set({ backups, isLoading: false });
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to delete backup'
      });
      throw error;
    }
  },

  // NHIS Configuration
  getNHISConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const nhisConfig = await getHospitalNHISSettings();
      set({ nhisConfig, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch NHIS config:', error);
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to fetch NHIS config'
      });
      throw error;
    }
  },

  updateNHISConfig: async (config: Partial<NHISConfig>) => {
    set({ isLoading: true, error: null });
    try {
      const nhisConfig = await updateHospitalNHISSettings(config);
      set({ nhisConfig, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to update NHIS config:', error);
      set({
        isLoading: false,
        error: error.response?.data?.message || 'Failed to update NHIS config'
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
