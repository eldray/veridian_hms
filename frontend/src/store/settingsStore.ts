// src/store/settingsStore.ts - CORRECTED VERSION
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
  register,

  // Backup & Restore
  createBackup,
  restoreBackup,
  getBackupList,
  downloadBackup,
  deleteBackup,
  getBackupStats,  // ✅ ADD THIS (needs to be added to api/index.ts)
} from '../api';
import type { User, Hospital, BackupFile, Seniority } from '../types';

interface NHISConfig {
  providerId: string;
  facilityCode: string;
  accreditationNumber: string;
  tariffVersion: string;
  claimEndpoint: string;
  isActive: boolean;
}

// Seniority options type
export interface SeniorityOption {
  value: Seniority;
  label: string;
  level: number;
}

// Seniority levels for hierarchy
export const SENIORITY_LEVELS: Record<Seniority, number> = {
  TRAINEE: 0,
  JUNIOR: 1,
  SENIOR: 2,
  PRINCIPAL: 3
};

// Seniority options for dropdowns
export const SENIORITY_OPTIONS: SeniorityOption[] = [
  { value: 'TRAINEE', label: 'Trainee', level: 0 },
  { value: 'JUNIOR', label: 'Junior Staff', level: 1 },
  { value: 'SENIOR', label: 'Senior Staff', level: 2 },
  { value: 'PRINCIPAL', label: 'Principal', level: 3 }
];

interface SettingsState {
  hospital: Hospital | null;
  users: User[];
  backups: BackupFile[];
  backupStats: {
    totalBackups: number;
    totalSize: number;
    totalSizeFormatted: string;
    oldestBackup: Date | null;
    newestBackup: Date | null;
    averageSize: number;
  } | null;
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
  
  // User creation with seniority
  createUser: (userData: {
    username: string;
    password: string;
    fullName: string;
    role: string;
    seniority?: Seniority;
    email?: string;
    phone?: string;
    licenseNumber?: string;
    specialization?: string;
    departmentId?: string;
  }) => Promise<User>;
  
  // Update user seniority
  updateUserSeniority: (userId: string, seniority: Seniority) => Promise<void>;
  
  // Get users by seniority level
  getUsersBySeniority: (minSeniority: Seniority) => User[];

  // Backup & Restore
  createBackup: () => Promise<any>;
  restoreBackup: (backupFile: File) => Promise<any>;
  getBackupList: (page?: number, limit?: number) => Promise<{ backups: BackupFile[]; pagination: any }>;
  getBackupStats: () => Promise<any>;
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
  backupStats: null,
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

  // ==========================================
  // Hospital Management
  // ==========================================

  getHospitalDetails: async () => {
    set({ isLoading: true, error: null });
    try {
      const hospital = await getHospitalDetails();
      set({ hospital, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch hospital details:', error);
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to fetch hospital details'
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
        error: (error as any).response?.data?.message || 'Failed to update hospital details'
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
        error: (error as any).response?.data?.message || 'Failed to fetch hospital'
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

  // ==========================================
  // User Management
  // ==========================================

  getAllUsers: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getAllUsers(filters);
      const users = response.users || response.data || response;
      
      const usersWithSeniority = Array.isArray(users) 
        ? users.map((user: User) => ({
            ...user,
            seniority: user.seniority || 'JUNIOR'
          }))
        : users;
      
      set({
        users: usersWithSeniority,
        pagination: response.pagination || null,
        isLoading: false
      });
    } catch (error: unknown) {
      console.error('Failed to fetch users:', error);
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to fetch users'
      });
      throw error;
    }
  },

  updateUser: async (userId: string, data: Partial<User>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await updateUser(userId, data);
      const users = get().users.map(user =>
        user.id === userId ? { ...updatedUser, seniority: updatedUser.seniority || user.seniority } : user
      );
      set({ users, isLoading: false });
      return updatedUser;
    } catch (error: unknown) {
      console.error('Failed to update user:', error);
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to update user'
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
        error: (error as any).response?.data?.message || 'Failed to deactivate user'
      });
      throw error;
    }
  },

  getUsers: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getUsers(filters);
      const users = response.users || response.data || response;
      
      const usersWithSeniority = Array.isArray(users)
        ? users.map((user: User) => ({
            ...user,
            seniority: user.seniority || 'JUNIOR'
          }))
        : users;
      
      set({
        users: usersWithSeniority,
        pagination: response.pagination || null,
        isLoading: false
      });
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to fetch users'
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
        error: (error as any).response?.data?.message || 'Failed to fetch user stats'
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
        error: (error as any).response?.data?.message || 'Failed to fetch department users'
      });
      throw error;
    }
  },

  updateUserDepartment: async (userId: string, departmentId: string) => {
    set({ isLoading: true, error: null });
    try {
      await updateUserDepartment(userId, departmentId);

      const updatedUsers = get().users.map(user =>
        user.id === userId ? { ...user, departmentId } : user
      );

      set({ users: updatedUsers, isLoading: false });
    } catch (error: unknown) {
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to update user department'
      });
      throw error;
    }
  },

  createUser: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await register({
        ...userData,
        seniority: userData.seniority || 'JUNIOR'
      });
      
      const newUser = response.user || response.data?.user || response;
      
      await get().getAllUsers();
      
      set({ isLoading: false });
      return newUser;
    } catch (error: unknown) {
      console.error('Failed to create user:', error);
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to create user'
      });
      throw error;
    }
  },

  updateUserSeniority: async (userId: string, seniority: Seniority) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await updateUser(userId, { seniority });
      
      const users = get().users.map(user =>
        user.id === userId ? { ...user, seniority: updatedUser.seniority || seniority } : user
      );
      
      set({ users, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to update user seniority:', error);
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to update user seniority'
      });
      throw error;
    }
  },

  getUsersBySeniority: (minSeniority: Seniority) => {
    const users = get().users;
    const minLevel = SENIORITY_LEVELS[minSeniority];
    
    return users.filter(user => {
      const userLevel = SENIORITY_LEVELS[user.seniority as Seniority] || 0;
      return userLevel >= minLevel && user.isActive;
    });
  },

  // ==========================================
  // Backup & Restore - CORRECTED
  // ==========================================

  createBackup: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await createBackup();
      set({ isLoading: false });
      return result;
    } catch (error: unknown) {
      set({
        error: (error as any).response?.data?.message || 'Failed to create backup',
        isLoading: false
      });
      throw error;
    }
  },

  restoreBackup: async (backupFile: File) => {
    set({ isLoading: true, error: null });
    try {
      const result = await restoreBackup(backupFile);
      set({ isLoading: false });
      return result;
    } catch (error: unknown) {
      set({
        error: (error as any).response?.data?.message || 'Failed to restore backup',
        isLoading: false
      });
      throw error;
    }
  },

  getBackupList: async (page: number = 1, limit: number = 50) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getBackupList(page, limit);
      // Backend returns: { success: true, data: backups[], pagination: {...} }
      const backups = response?.data || [];
      const pagination = response?.pagination;
      
      set({ 
        backups,
        pagination,
        isLoading: false 
      });
      
      return { backups, pagination };
    } catch (error: unknown) {
      console.error('Failed to fetch backups:', error);
      set({
        error: (error as any).response?.data?.message || 'Failed to fetch backups',
        isLoading: false,
        backups: []
      });
      throw error;
    }
  },

  getBackupStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getBackupStats();
      const stats = response?.data || response;
      set({ backupStats: stats, isLoading: false });
      return stats;
    } catch (error: unknown) {
      console.error('Failed to fetch backup stats:', error);
      set({
        error: (error as any).response?.data?.message || 'Failed to fetch backup statistics',
        isLoading: false
      });
      throw error;
    }
  },

  downloadBackup: async (filename: string) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🔄 Store: Starting download for', filename);
      await downloadBackup(filename);
      set({ isLoading: false });
    } catch (error: unknown) {
      console.error('❌ Store: Download failed:', error);
      const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'Failed to download backup';
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
        error: (error as any).response?.data?.message || 'Failed to delete backup'
      });
      throw error;
    }
  },

  // ==========================================
  // NHIS Configuration
  // ==========================================

  getNHISConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const nhisConfig = await getHospitalNHISSettings();
      set({ nhisConfig, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch NHIS config:', error);
      set({
        isLoading: false,
        error: (error as any).response?.data?.message || 'Failed to fetch NHIS config'
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
        error: (error as any).response?.data?.message || 'Failed to update NHIS config'
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));