// stores/admissionStore.ts
import { create } from 'zustand';
import { 
  getAdmissions as apiGetAdmissions,
  getAdmission as apiGetAdmission,
  createAdmission as apiCreateAdmission,
  updateAdmission as apiUpdateAdmission,
  deleteAdmission as apiDeleteAdmission,
  dischargeAdmission as apiDischargeAdmission,  // ✅ Changed from dischargePatient
  addDailyNotesToAdmission as apiAddDailyNotesToAdmission,
  getAdmissionStats as apiGetAdmissionStats,
  getDaycasePatients as apiGetDaycasePatients,
  convertDaycaseToIPD as apiConvertDaycaseToIPD,
  dischargeFromEncounter as apiDischargeFromEncounter
} from '../api';
import type { Admission } from '../types';
import type { AdmissionFilters, AdmissionStats, DailyNote, DischargeData } from '../types/admission';

// Helper for consistent ID access
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

interface AdmissionState {
  admissions: Admission[];
  currentAdmission: Admission | null;
  admissionStats: AdmissionStats | null;
  daycasePatients: any[];  // ✅ NEW: For observation patients
  isLoading: boolean;
  error: string | null;
  
  // Core CRUD operations
  getAdmissions: (filters?: AdmissionFilters) => Promise<void>;
  getAdmission: (id: string) => Promise<void>;
  createAdmission: (data: { attendanceId: string; admissionType?: string; admissionSource?: string; admissionDate?: string }) => Promise<void>;
  updateAdmission: (id: string, data: Partial<Admission>) => Promise<void>;
  deleteAdmission: (id: string) => Promise<void>;
  dischargeAdmission: (id: string, data?: DischargeData) => Promise<void>;  // ✅ Renamed
  
  // Daycase/Observation operations (NEW)
  getDaycasePatients: (filters?: { status?: string; wardId?: string; page?: number; limit?: number }) => Promise<void>;
  convertDaycaseToIPD: (encounterId: string, data?: { admissionType?: string }) => Promise<any>;
  dischargeFromEncounter: (encounterId: string, data?: { dischargeStatus?: string; dischargeDate?: string }) => Promise<any>;
  
  // Daily notes operations
  addDailyNote: (admissionId: string, data: { notes: string; noteType?: string }) => Promise<void>;
  
  // Stats
  getAdmissionStats: () => Promise<void>;
  
  clearError: () => void;
  clearCurrentAdmission: () => void;
}

const transformAdmission = (admission: unknown): Admission => {
  const adm = admission as any;
  return {
    ...adm,
    id: getEntityId(adm) || adm.id,
    dailyNotes: adm.dailyNotes || [],
    // Admission now has attendance with clinical data
    clinicalData: adm.attendance || null
  };
};

export const useAdmissionStore = create<AdmissionState>((set, get) => ({
  admissions: [],
  currentAdmission: null,
  admissionStats: null,
  daycasePatients: [],
  isLoading: false,
  error: null,

  getAdmissions: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetAdmissions(filters);
      console.log('🔍 [AdmissionStore] Raw admissions response:', response);
      
      let admissionsArray: any[] = [];
      
      if (Array.isArray(response)) {
        admissionsArray = response;
      } else if (response && Array.isArray(response.data)) {
        admissionsArray = response.data;
      } else if (response && Array.isArray(response.admissions)) {
        admissionsArray = response.admissions;
      } else {
        console.warn('Unexpected admissions response structure:', response);
        admissionsArray = [];
      }

      const transformedAdmissions = admissionsArray.map(transformAdmission);
      console.log('✅ [AdmissionStore] Transformed admissions:', transformedAdmissions);
      
      set({ 
        admissions: transformedAdmissions,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('❌ [AdmissionStore] Failed to fetch admissions:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch admissions',
        isLoading: false 
      });
      throw error;
    }
  },

  getAdmission: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const admission = await apiGetAdmission(id);
      set({ 
        currentAdmission: transformAdmission(admission),
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch admission',
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ UPDATED: Create admission requires attendanceId
  createAdmission: async (data) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🔍 [AdmissionStore] Creating admission with data:', data);
      const newAdmission = await apiCreateAdmission(data);
      console.log('✅ [AdmissionStore] Created admission response:', newAdmission);
      
      const transformedAdmission = transformAdmission(newAdmission);
      const admissions = get().admissions;
      
      set({ 
        admissions: [transformedAdmission, ...admissions],
        currentAdmission: transformedAdmission,
        isLoading: false 
      });
      
      return transformedAdmission;
    } catch (error: any) {
      console.error('❌ [AdmissionStore] Failed to create admission:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to create admission',
        isLoading: false 
      });
      throw error;
    }
  },

  updateAdmission: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAdmission = await apiUpdateAdmission(id, data);
      const transformedAdmission = transformAdmission(updatedAdmission);
      const admissions = get().admissions.map(admission => 
        (getEntityId(admission) === id || admission.id === id) ? transformedAdmission : admission
      );
      set({ 
        admissions,
        currentAdmission: transformedAdmission,
        isLoading: false 
      });
      return transformedAdmission;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to update admission',
        isLoading: false 
      });
      throw error;
    }
  },

  deleteAdmission: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteAdmission(id);
      const admissions = get().admissions.filter(admission => 
        !(getEntityId(admission) === id || admission.id === id)
      );
      set({ 
        admissions,
        currentAdmission: get().currentAdmission && 
          (getEntityId(get().currentAdmission) === id || get().currentAdmission.id === id) ? null : get().currentAdmission,
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to delete admission',
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ UPDATED: Renamed from dischargePatient to dischargeAdmission
  dischargeAdmission: async (id, data = {}) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiDischargeAdmission(id, data);
      const transformedAdmission = transformAdmission(result.admission || result);
      const admissions = get().admissions.map(admission => 
        (getEntityId(admission) === id || admission.id === id) ? transformedAdmission : admission
      );
      set({ 
        admissions,
        currentAdmission: transformedAdmission,
        isLoading: false 
      });
      return transformedAdmission;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to discharge patient',
        isLoading: false 
      });
      throw error;
    }
  },

  // ==========================================
  // DAYCASE/OBSERVATION OPERATIONS (NEW)
  // ==========================================

  getDaycasePatients: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetDaycasePatients(filters);
      const daycasePatients = response.data || response;
      set({ daycasePatients: Array.isArray(daycasePatients) ? daycasePatients : [], isLoading: false });
    } catch (error: any) {
      console.error('Error fetching daycase patients:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch daycase patients', isLoading: false });
      throw error;
    }
  },

  convertDaycaseToIPD: async (encounterId, data = {}) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiConvertDaycaseToIPD(encounterId, data);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      console.error('Error converting daycase to IPD:', error);
      set({ error: error.response?.data?.message || 'Failed to convert daycase to IPD', isLoading: false });
      throw error;
    }
  },

  dischargeFromEncounter: async (encounterId, data = {}) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiDischargeFromEncounter(encounterId, data);
      set({ isLoading: false });
      
      // Also refresh admissions list if this was an IPD encounter
      await get().getAdmissions();
      
      return result;
    } catch (error: any) {
      console.error('Error discharging from encounter:', error);
      set({ error: error.response?.data?.message || 'Failed to discharge patient', isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // DAILY NOTES (For formal admissions only)
  // ==========================================

  addDailyNote: async (admissionId, data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiAddDailyNotesToAdmission(admissionId, data);
      const transformedAdmission = transformAdmission(result.admission || result);
      
      if (get().currentAdmission && (getEntityId(get().currentAdmission) === admissionId || get().currentAdmission.id === admissionId)) {
        set({ currentAdmission: transformedAdmission });
      }
      
      const admissions = get().admissions.map(admission => 
        (getEntityId(admission) === admissionId || admission.id === admissionId) ? transformedAdmission : admission
      );
      
      set({ 
        admissions,
        isLoading: false 
      });
      
      return transformedAdmission;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to add daily note',
        isLoading: false 
      });
      throw error;
    }
  },

  getAdmissionStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await apiGetAdmissionStats();
      set({ 
        admissionStats: stats,
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch admission statistics',
        isLoading: false 
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentAdmission: () => set({ currentAdmission: null }),
}));