// stores/vitalsStore.ts - FIXED VERSION
import { create } from 'zustand';
import {
  // API renamed attendance → encounter; alias back to keep this store's method names.
  addVitalsToEncounter as addVitalsToAttendance,
  getVitalsByEncounter as getVitalsByAttendance,
  updateVitals,
} from '../api';

interface VitalsState {
  vitals: any[];
  isLoading: boolean;
  error: string | null;

  addVitalsToAttendance: (attendanceId: string, data: any) => Promise<void>;
  getVitalsByAttendance: (attendanceId: string) => Promise<any[]>;
  updateVitals: (attendanceId: string, vitalsId: string, data: any) => Promise<void>;
}

export const useVitalsStore = create<VitalsState>((set, get) => ({
  vitals: [],
  isLoading: false,
  error: null,

  addVitalsToAttendance: async (attendanceId, data) => {
    set({ isLoading: true, error: null });
    try {
      const newVitals = await addVitalsToAttendance(attendanceId, data);
      set(state => ({
        vitals: [...state.vitals, newVitals],
        isLoading: false
      }));
    } catch (error: unknown) {
      set({
        error: error.message || 'Failed to record vitals',
        isLoading: false
      });
      throw error;
    }
  },

  getVitalsByAttendance: async (attendanceId) => {
    set({ isLoading: true, error: null });
    try {
      const vitals = await getVitalsByAttendance(attendanceId);
      set(state => ({
        vitals: [...state.vitals.filter(v => v.attendanceId !== attendanceId), ...vitals],
        isLoading: false
      }));
      return vitals;
    } catch (error: unknown) {
      set({
        error: error.message || 'Failed to fetch vitals',
        isLoading: false
      });
      throw error;
    }
  },

  updateVitals: async (attendanceId, vitalsId, data) => {
    set({ isLoading: true, error: null });
    try {
      // api.updateVitals signature is (vitalsId, data); attendanceId is unused here.
      const updatedVitals = await updateVitals(vitalsId, data);
      set(state => ({
        vitals: state.vitals.map(v =>
          v.id === vitalsId ? updatedVitals : v
        ),
        isLoading: false
      }));
    } catch (error: unknown) {
      set({
        error: error.message || 'Failed to update vitals',
        isLoading: false
      });
      throw error;
    }
  },
}));
