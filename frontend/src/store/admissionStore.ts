// stores/admissionStore.ts
import { create } from 'zustand';
import { 
  getAdmissions as apiGetAdmissions,
  getAdmission as apiGetAdmission,
  createAdmission as apiCreateAdmission,
  updateAdmission as apiUpdateAdmission,
  deleteAdmission as apiDeleteAdmission,
  dischargePatient as apiDischargePatient,
  updateAdmissionWithNHISData as apiUpdateAdmissionWithNHISData,
  addDailyNoteToAdmission as apiAddDailyNoteToAdmission,
  updateDailyNote as apiUpdateDailyNote,
  deleteDailyNote as apiDeleteDailyNote,
  addSecondaryDiagnosisToAdmission as apiAddSecondaryDiagnosisToAdmission,
  removeSecondaryDiagnosisFromAdmission as apiRemoveSecondaryDiagnosisFromAdmission,
  getAdmissionStats as apiGetAdmissionStats
} from '../api';
import type { Admission, AdmissionSecondaryDiagnosis } from '../types';
import type { AdmissionFilters, AdmissionStats, DailyNote, DischargeData, SecondaryDiagnosisData } from '../types/admission';

// ✅ Helper for consistent ID access
const getEntityId = (entity: { id?: string; _id?: string } | null): string | undefined => {
  return entity?._id || entity?.id;
};

interface AdmissionState {
  admissions: Admission[];
  currentAdmission: Admission | null;
  admissionStats: AdmissionStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Core CRUD operations
  getAdmissions: (filters?: AdmissionFilters) => Promise<void>;
  getAdmission: (id: string) => Promise<void>;
  createAdmission: (data: Partial<Admission>) => Promise<void>;
  updateAdmission: (id: string, data: Partial<Admission>) => Promise<void>;
  deleteAdmission: (id: string) => Promise<void>;
  dischargePatient: (id: string, data: DischargeData) => Promise<void>;
  
  // NHIS operations
  updateAdmissionWithNHISData: (id: string, data: Partial<Admission>) => Promise<void>;
  
  // Daily notes operations
  addDailyNote: (admissionId: string, data: { note: string }) => Promise<void>;
  updateDailyNote: (admissionId: string, noteId: string, data: { note: string }) => Promise<void>;
  deleteDailyNote: (admissionId: string, noteId: string) => Promise<void>;
  
  // Secondary diagnoses operations
  addSecondaryDiagnosis: (admissionId: string, data: SecondaryDiagnosisData) => Promise<void>;
  removeSecondaryDiagnosis: (admissionId: string, diagnosisId: string) => Promise<void>;
  
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
    // Ensure dailyNotes is always an array
    dailyNotes: admission.dailyNotes || [],
    // Ensure secondaryDiagnoses is always an array
    secondaryDiagnoses: admission.secondaryDiagnoses || [],
  };
};

export const useAdmissionStore = create<AdmissionState>((set, get) => ({
  admissions: [],
  currentAdmission: null,
  admissionStats: null,
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
      } else if (response && Array.isArray(response.admissions)) {
        admissionsArray = response.admissions;
      } else if (response && Array.isArray(response.data)) {
        admissionsArray = response.data;
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch admission',
        isLoading: false 
      });
      throw error;
    }
  },

  createAdmission: async (data: Partial<Admission>) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🔍 [AdmissionStore] Creating admission with data:', data);
      const newAdmission = await apiCreateAdmission(data);
      console.log('✅ [AdmissionStore] Created admission response:', newAdmission);
      
      const transformedAdmission = transformAdmission(newAdmission.admission || newAdmission);
      const admissions = get().admissions;
      
      set({ 
        admissions: [transformedAdmission, ...admissions],
        currentAdmission: transformedAdmission,
        isLoading: false 
      });
      
      return transformedAdmission;
    } catch (error: unknown) {
      console.error('❌ [AdmissionStore] Failed to create admission:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to create admission',
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ FIXED: Proper ID comparison
  updateAdmission: async (id: string, data: Partial<Admission>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAdmission = await apiUpdateAdmission(id, data);
      const transformedAdmission = transformAdmission(updatedAdmission.admission || updatedAdmission);
      const admissions = get().admissions.map(admission => 
        (getEntityId(admission) === id || admission.id === id) ? transformedAdmission : admission
      );
      set({ 
        admissions,
        currentAdmission: transformedAdmission,
        isLoading: false 
      });
      return transformedAdmission;
    } catch (error: unknown) {
      set({ 
        error: error.response?.data?.message || 'Failed to update admission',
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ FIXED: Proper ID comparison
  deleteAdmission: async (id: string) => {
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
    } catch (error: unknown) {
      set({ 
        error: error.response?.data?.message || 'Failed to delete admission',
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ FIXED: Proper ID comparison
  dischargePatient: async (id: string, data: DischargeData) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiDischargePatient(id, data);
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
    } catch (error: unknown) {
      set({ 
        error: error.response?.data?.message || 'Failed to discharge patient',
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ FIXED: Proper ID comparison
  updateAdmissionWithNHISData: async (id: string, data: Partial<Admission>) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiUpdateAdmissionWithNHISData(id, data);
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
    } catch (error: unknown) {
      set({ 
        error: error.response?.data?.message || 'Failed to update NHIS data',
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ FIXED: Proper ID comparison
  addDailyNote: async (admissionId: string, data: { note: string }) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiAddDailyNoteToAdmission(admissionId, data);
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
    } catch (error: unknown) {
      set({ 
        error: error.response?.data?.message || 'Failed to add daily note',
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ FIXED: Proper ID comparison
  updateDailyNote: async (admissionId: string, noteId: string, data: { note: string }) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiUpdateDailyNote(admissionId, noteId, data);
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
    } catch (error: unknown) {
      set({ 
        error: error.response?.data?.message || 'Failed to update daily note',
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ FIXED: Proper ID comparison
  deleteDailyNote: async (admissionId: string, noteId: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiDeleteDailyNote(admissionId, noteId);
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
    } catch (error: unknown) {
      set({ 
        error: error.response?.data?.message || 'Failed to delete daily note',
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ FIXED: Proper ID comparison
  addSecondaryDiagnosis: async (admissionId: string, data: SecondaryDiagnosisData) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiAddSecondaryDiagnosisToAdmission(admissionId, data);
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
    } catch (error: unknown) {
      set({ 
        error: error.response?.data?.message || 'Failed to add secondary diagnosis',
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ FIXED: Proper ID comparison
  removeSecondaryDiagnosis: async (admissionId: string, diagnosisId: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiRemoveSecondaryDiagnosisFromAdmission(admissionId, diagnosisId);
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
    } catch (error: unknown) {
      set({ 
        error: error.response?.data?.message || 'Failed to remove secondary diagnosis',
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
    } catch (error: unknown) {
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