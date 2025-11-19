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

interface AdmissionState {
  admissions: any[];
  currentAdmission: any | null;
  admissionStats: any | null;
  isLoading: boolean;
  error: string | null;
  
  // Core CRUD operations
  getAdmissions: (filters?: any) => Promise<void>;
  getAdmission: (id: string) => Promise<void>;
  createAdmission: (data: any) => Promise<void>;
  updateAdmission: (id: string, data: any) => Promise<void>;
  deleteAdmission: (id: string) => Promise<void>;
  dischargePatient: (id: string, data: any) => Promise<void>;
  
  // NHIS operations
  updateAdmissionWithNHISData: (id: string, data: any) => Promise<void>;
  
  // Daily notes operations
  addDailyNote: (admissionId: string, data: any) => Promise<void>;
  updateDailyNote: (admissionId: string, noteId: string, data: any) => Promise<void>;
  deleteDailyNote: (admissionId: string, noteId: string) => Promise<void>;
  
  // Secondary diagnoses operations
  addSecondaryDiagnosis: (admissionId: string, data: any) => Promise<void>;
  removeSecondaryDiagnosis: (admissionId: string, diagnosisId: string) => Promise<void>;
  
  // Stats
  getAdmissionStats: () => Promise<void>;
  
  clearError: () => void;
  clearCurrentAdmission: () => void;
}

const transformAdmission = (admission: any) => ({
  ...admission,
  id: admission.id || admission.id,
  id: admission.id || admission.id,
  // Ensure dailyNotes is always an array
  dailyNotes: admission.dailyNotes || [],
  // Ensure secondaryDiagnoses is always an array
  secondaryDiagnoses: admission.secondaryDiagnoses || [],
});

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

  createAdmission: async (data: any) => {
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
    } catch (error: any) {
      console.error('❌ [AdmissionStore] Failed to create admission:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to create admission',
        isLoading: false 
      });
      throw error;
    }
  },

  updateAdmission: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAdmission = await apiUpdateAdmission(id, data);
      const transformedAdmission = transformAdmission(updatedAdmission.admission || updatedAdmission);
      const admissions = get().admissions.map(admission => 
        (admission.id === id || admission.id === id) ? transformedAdmission : admission
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

  deleteAdmission: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteAdmission(id);
      const admissions = get().admissions.filter(admission => 
        !(admission.id === id || admission.id === id)
      );
      set({ 
        admissions,
        currentAdmission: get().currentAdmission && 
          (get().currentAdmission.id === id || get().currentAdmission.id === id) ? null : get().currentAdmission,
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

  dischargePatient: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiDischargePatient(id, data);
      const transformedAdmission = transformAdmission(result.admission || result);
      const admissions = get().admissions.map(admission => 
        (admission.id === id || admission.id === id) ? transformedAdmission : admission
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

  updateAdmissionWithNHISData: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiUpdateAdmissionWithNHISData(id, data);
      const transformedAdmission = transformAdmission(result.admission || result);
      const admissions = get().admissions.map(admission => 
        (admission.id === id || admission.id === id) ? transformedAdmission : admission
      );
      set({ 
        admissions,
        currentAdmission: transformedAdmission,
        isLoading: false 
      });
      return transformedAdmission;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to update NHIS data',
        isLoading: false 
      });
      throw error;
    }
  },

  addDailyNote: async (admissionId: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiAddDailyNoteToAdmission(admissionId, data);
      const transformedAdmission = transformAdmission(result.admission || result);
      
      // Update current admission if it's the one being modified
      if (get().currentAdmission && (get().currentAdmission.id === admissionId || get().currentAdmission.id === admissionId)) {
        set({ currentAdmission: transformedAdmission });
      }
      
      // Update admissions list
      const admissions = get().admissions.map(admission => 
        (admission.id === admissionId || admission.id === admissionId) ? transformedAdmission : admission
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

  updateDailyNote: async (admissionId: string, noteId: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiUpdateDailyNote(admissionId, noteId, data);
      const transformedAdmission = transformAdmission(result.admission || result);
      
      // Update current admission if it's the one being modified
      if (get().currentAdmission && (get().currentAdmission.id === admissionId || get().currentAdmission.id === admissionId)) {
        set({ currentAdmission: transformedAdmission });
      }
      
      // Update admissions list
      const admissions = get().admissions.map(admission => 
        (admission.id === admissionId || admission.id === admissionId) ? transformedAdmission : admission
      );
      
      set({ 
        admissions,
        isLoading: false 
      });
      
      return transformedAdmission;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to update daily note',
        isLoading: false 
      });
      throw error;
    }
  },

  deleteDailyNote: async (admissionId: string, noteId: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiDeleteDailyNote(admissionId, noteId);
      const transformedAdmission = transformAdmission(result.admission || result);
      
      // Update current admission if it's the one being modified
      if (get().currentAdmission && (get().currentAdmission.id === admissionId || get().currentAdmission.id === admissionId)) {
        set({ currentAdmission: transformedAdmission });
      }
      
      // Update admissions list
      const admissions = get().admissions.map(admission => 
        (admission.id === admissionId || admission.id === admissionId) ? transformedAdmission : admission
      );
      
      set({ 
        admissions,
        isLoading: false 
      });
      
      return transformedAdmission;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to delete daily note',
        isLoading: false 
      });
      throw error;
    }
  },

  addSecondaryDiagnosis: async (admissionId: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiAddSecondaryDiagnosisToAdmission(admissionId, data);
      const transformedAdmission = transformAdmission(result.admission || result);
      
      // Update current admission if it's the one being modified
      if (get().currentAdmission && (get().currentAdmission.id === admissionId || get().currentAdmission.id === admissionId)) {
        set({ currentAdmission: transformedAdmission });
      }
      
      // Update admissions list
      const admissions = get().admissions.map(admission => 
        (admission.id === admissionId || admission.id === admissionId) ? transformedAdmission : admission
      );
      
      set({ 
        admissions,
        isLoading: false 
      });
      
      return transformedAdmission;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to add secondary diagnosis',
        isLoading: false 
      });
      throw error;
    }
  },

  removeSecondaryDiagnosis: async (admissionId: string, diagnosisId: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiRemoveSecondaryDiagnosisFromAdmission(admissionId, diagnosisId);
      const transformedAdmission = transformAdmission(result.admission || result);
      
      // Update current admission if it's the one being modified
      if (get().currentAdmission && (get().currentAdmission.id === admissionId || get().currentAdmission.id === admissionId)) {
        set({ currentAdmission: transformedAdmission });
      }
      
      // Update admissions list
      const admissions = get().admissions.map(admission => 
        (admission.id === admissionId || admission.id === admissionId) ? transformedAdmission : admission
      );
      
      set({ 
        admissions,
        isLoading: false 
      });
      
      return transformedAdmission;
    } catch (error: any) {
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