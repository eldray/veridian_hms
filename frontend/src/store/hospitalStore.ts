// src/store/hospitalStore.ts
import { create } from 'zustand';
import { getHospital } from '../api';
import type { Hospital } from '../types';

interface HospitalState {
  hospital: Hospital | null;
  isLoading: boolean;
  error: string | null;
  fetchHospital: () => Promise<void>;
}

export const useHospitalStore = create<HospitalState>((set) => ({
  hospital: null,
  isLoading: false,
  error: null,
  
  fetchHospital: async () => {
    set({ isLoading: true, error: null });
    try {
      const hospital = await getHospital();
      set({ hospital, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch hospital:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch hospital',
        isLoading: false 
      });
    }
  }
}));
