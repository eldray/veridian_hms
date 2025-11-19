// stores/vitalsStore.ts - FIXED VERSION
export const useVitalsStore = create<VitalsState>((set, get) => ({
  vitals: [],
  isLoading: false,
  error: null,
  
  addVitalsToAttendance: async (attendanceId: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const newVitals = await apiAddVitalsToAttendance(attendanceId, data);
      set(state => ({
        vitals: [...state.vitals, newVitals],
        isLoading: false
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Failed to record vitals',
        isLoading: false
      });
      throw error;
    }
  },

  getVitalsByAttendance: async (attendanceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const vitals = await apiGetVitalsByAttendance(attendanceId);
      set(state => ({
        vitals: [...state.vitals.filter(v => v.attendanceId !== attendanceId), ...vitals],
        isLoading: false
      }));
      return vitals;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Failed to fetch vitals',
        isLoading: false
      });
      throw error;
    }
  },

  updateVitals: async (attendanceId: string, vitalsId: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const updatedVitals = await apiUpdateVitals(attendanceId, vitalsId, data);
      set(state => ({
        vitals: state.vitals.map(v => 
          v.id === vitalsId ? updatedVitals : v  // ✅ FIXED: Use id consistently
        ),
        isLoading: false
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Failed to update vitals',
        isLoading: false
      });
      throw error;
    }
  },

  deleteVitals: async (attendanceId: string, vitalsId: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteVitals(attendanceId, vitalsId);
      set(state => ({
        vitals: state.vitals.filter(v => v.id !== vitalsId), // ✅ FIXED: Use id consistently
        isLoading: false
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Failed to delete vitals',
        isLoading: false
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));