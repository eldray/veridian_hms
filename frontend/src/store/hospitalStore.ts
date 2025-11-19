// src/store/hospitalStore.ts - UPDATED WITH ALL API FUNCTIONS
import { create } from 'zustand';
import { 
  getHospital as apiGetHospital,
  getHospitals as apiGetHospitals,
  createHospital as apiCreateHospital,
  updateHospital as apiUpdateHospital,
  deleteHospital as apiDeleteHospital,
  getHospitalNHISSettings as apiGetHospitalNHISSettings,
  updateHospitalNHISSettings as apiUpdateHospitalNHISSettings
} from '../api';
import type { HospitalInfo } from '../types';

interface HospitalState {
  hospital: HospitalInfo | null;
  hospitals: HospitalInfo[]; // ✅ ADDED - for multi-hospital support
  isLoading: boolean;
  error: string | null;
  
  // Single Hospital (Current)
  fetchHospital: () => Promise<void>;
  
  // ✅ ADDED MISSING FUNCTIONS
  // Multi-Hospital Management
  getHospitals: (filters?: any) => Promise<void>;
  createHospital: (data: Partial<HospitalInfo>) => Promise<HospitalInfo>;
  updateHospital: (id: string, data: Partial<HospitalInfo>) => Promise<HospitalInfo>;
  deleteHospital: (id: string) => Promise<void>;
  
  // NHIS Settings
  getHospitalNHISSettings: () => Promise<any>;
  updateHospitalNHISSettings: (data: any) => Promise<any>;
  
  clearError: () => void;
}

export const useHospitalStore = create<HospitalState>((set, get) => ({
  hospital: null,
  hospitals: [], // ✅ ADDED
  isLoading: false,
  error: null,

  fetchHospital: async () => {
    set({ isLoading: true, error: null });
    try {
      const hospital = await apiGetHospital();
      console.log('Hospital loaded:', {
        name: hospital.name,
        nhisFacilityCode: hospital.nhisFacilityCode,
        type: hospital.nhisFacilityType
      });
      set({ hospital, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch hospital:', error);
      set({
        error: error.message || 'Failed to fetch hospital',
        isLoading: false
      });
      throw error;
    }
  },

  // ✅ ADDED MISSING FUNCTIONS
  getHospitals: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const hospitals = await apiGetHospitals(filters);
      set({ hospitals, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch hospitals:', error);
      set({
        error: error.message || 'Failed to fetch hospitals',
        isLoading: false
      });
      throw error;
    }
  },

  createHospital: async (data: Partial<HospitalInfo>) => {
    set({ isLoading: true, error: null });
    try {
      const newHospital = await apiCreateHospital(data);
      set(state => ({
        hospitals: [...state.hospitals, newHospital],
        isLoading: false
      }));
      return newHospital;
    } catch (error: any) {
      console.error('Failed to create hospital:', error);
      set({
        error: error.message || 'Failed to create hospital',
        isLoading: false
      });
      throw error;
    }
  },

  updateHospital: async (id: string, data: Partial<HospitalInfo>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedHospital = await apiUpdateHospital(id, data);
      
      // Update both hospitals list and current hospital if it matches
      set(state => ({
        hospitals: state.hospitals.map(h => 
          h.id === id ? updatedHospital : h
        ),
        hospital: state.hospital?.id === id ? updatedHospital : state.hospital,
        isLoading: false
      }));
      
      return updatedHospital;
    } catch (error: any) {
      console.error('Failed to update hospital:', error);
      set({
        error: error.message || 'Failed to update hospital',
        isLoading: false
      });
      throw error;
    }
  },

  deleteHospital: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteHospital(id);
      
      // Remove from hospitals list and clear current if it matches
      set(state => ({
        hospitals: state.hospitals.filter(h => h.id !== id),
        hospital: state.hospital?.id === id ? null : state.hospital,
        isLoading: false
      }));
    } catch (error: any) {
      console.error('Failed to delete hospital:', error);
      set({
        error: error.message || 'Failed to delete hospital',
        isLoading: false
      });
      throw error;
    }
  },

  getHospitalNHISSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const nhisSettings = await apiGetHospitalNHISSettings();
      set({ isLoading: false });
      return nhisSettings;
    } catch (error: any) {
      console.error('Failed to fetch NHIS settings:', error);
      set({
        error: error.message || 'Failed to fetch NHIS settings',
        isLoading: false
      });
      throw error;
    }
  },

  updateHospitalNHISSettings: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const nhisSettings = await apiUpdateHospitalNHISSettings(data);
      set({ isLoading: false });
      return nhisSettings;
    } catch (error: any) {
      console.error('Failed to update NHIS settings:', error);
      set({
        error: error.message || 'Failed to update NHIS settings',
        isLoading: false
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));