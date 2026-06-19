// src/store/settingsStore.ts - CORRECTED VERSION (Settings only, no User management)
import { create } from 'zustand';
import {
  // Hospital Management
  getHospitalDetails,
  updateHospitalDetails,
  getHospital,
  getHospitalNHISSettings,
  updateHospitalNHISSettings,

  // Backup & Restore
  createBackup,
  restoreBackup,
  getBackupList,
  downloadBackup,
  deleteBackup,
  getBackupStats,
} from '../api';
import type { Hospital, BackupFile } from '../types';

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

  // Hospital Management
  getHospitalDetails: () => Promise<void>;
  updateHospitalDetails: (data: Partial<Hospital>) => Promise<Hospital>;
  getHospital: () => Promise<void>;
  loadHospitalOnStartup: () => Promise<void>;
  clearHospital: () => void;

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
  // Backup & Restore
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