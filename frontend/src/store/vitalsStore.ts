// stores/vitalsStore.ts - UPDATED TO HANDLE attendanceId CONSISTENTLY
import { create } from 'zustand';
import {
  addVitalsToAttendance as apiAddVitalsToAttendance,
  getVitalsByAttendance as apiGetVitalsByAttendance
} from '../api';
import type { Vitals } from '../types';

interface VitalsState {
  vitals: Vitals[];
  isLoading: boolean;
  error: string | null;
  // Attendance-based vitals operations (matching your component)
  addVitalsToAttendance: (attendanceId: string, data: Vitals) => Promise<void>;
  getVitalsByAttendance: (attendanceId: string) => Promise<Vitals[]>;
  clearError: () => void;
  clearVitals: () => void;
}

export const useVitalsStore = create<VitalsState>((set, get) => ({
  vitals: [],
  isLoading: false,
  error: null,
  addVitalsToAttendance: async (attendanceId: string, data: Vitals) => {
    set({ isLoading: true, error: null });
    try {
      console.log('📝 Adding vitals to attendance:', { attendanceId, data });
      const updatedAttendance = await apiAddVitalsToAttendance(attendanceId, data);
      // Assuming updatedAttendance includes the full updated vitals array (e.g., updatedAttendance.vitals)
      // Adjust this line if the structure is different based on your API response
      const attendanceVitalsRaw = Array.isArray(updatedAttendance.vitals) ? updatedAttendance.vitals : [];
      const attendanceVitals = attendanceVitalsRaw.map(v => ({ ...v, attendanceId }));
      // Update local state by replacing vitals for this attendance
      const otherVitals = get().vitals.filter(v => v.attendanceId !== attendanceId);
      set({
        vitals: [...attendanceVitals, ...otherVitals],
        isLoading: false
      });
      console.log('✅ Vitals added successfully');
    } catch (error: any) {
      console.error('❌ Failed to add vitals:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to record vitals';
      set({
        error: errorMessage,
        isLoading: false
      });
      throw new Error(errorMessage);
    }
  },
  getVitalsByAttendance: async (attendanceId: string) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🔄 Fetching vitals for attendance:', attendanceId);
      const vitalsDataRaw = await apiGetVitalsByAttendance(attendanceId);
      const attendanceVitalsRaw = Array.isArray(vitalsDataRaw) ? vitalsDataRaw : [];
      const attendanceVitals = attendanceVitalsRaw.map(v => ({ ...v, attendanceId }));
      // Update local state with these vitals
      const otherVitals = get().vitals.filter(v => v.attendanceId !== attendanceId);
      set({
        vitals: [...attendanceVitals, ...otherVitals],
        isLoading: false
      });
      console.log('✅ Vitals fetched:', attendanceVitals.length, 'records');
      return attendanceVitals;
    } catch (error: any) {
      console.error('❌ Failed to fetch vitals:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch vitals';
      set({
        error: errorMessage,
        isLoading: false
      });
      throw new Error(errorMessage);
    }
  },
  clearError: () => set({ error: null }),
  clearVitals: () => set({ vitals: [] }),
}));