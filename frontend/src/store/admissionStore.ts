// stores/admissionStore.ts - COMPLETE UPDATED VERSION

import { create } from 'zustand';
import { 
  getAdmissions as apiGetAdmissions,
  getAdmission as apiGetAdmission,
  createAdmission as apiCreateAdmission,
  updateAdmission as apiUpdateAdmission,
  deleteAdmission as apiDeleteAdmission,
  dischargeFromEncounter as apiDischargeFromEncounter,
  getDaycasePatients as apiGetDaycasePatients,
  convertDaycaseToIPD as apiConvertDaycaseToIPD,
  addDailyNotesToAdmission as apiAddDailyNotesToAdmission,
  getAdmissionStats as apiGetAdmissionStats,
  getAdmissionsByPatientId as apiGetAdmissionsByPatientId,
  getBedOccupancy as apiGetBedOccupancy,
  // ✅ ADD THESE MISSING IMPORTS
  getDetentionPatients as apiGetDetentionPatients,
  getFormalIPDPatients as apiGetFormalIPDPatients,
  convertDetentionToIPD as apiConvertDetentionToIPD
} from '../api';

// Types
export interface Admission {
  id: string;
  admissionNumber: string;
  attendanceId: string;
  admissionType: 'emergency' | 'elective' | 'transfer' | 'detention_observation' | 'antenatal_observation' | 'delivery' | 'postpartum_observation';
  admissionSource: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency' | 'antenatal' | 'delivery';
  admissionDate: string;
  dischargeDate: string | null;
  dischargeStatus: 'home' | 'transfer' | 'expired' | 'against_medical_advice' | null;
  dailyNotes: Array<{
    id: string;
    notes: string;
    noteType: string;
    createdBy: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  dischargeSummary?: string;
  status?: string;
  
  // Relations
  attendance?: {
    id: string;
    attendanceNumber: string;
    patientId: string;
    status: string;
    encounterCategory: string;
    admissionType?: string;
    complaints?: string;
    medicalNotes?: string;
    Patient?: {
      id: string;
      surname: string;
      otherNames: string;
      folderNumber: string;
      gender: string;
      dateOfBirth: string;
      contact: string;
    };
    Ward?: {
      id: string;
      wardName: string;
      wardType: string;
    };
    Bed?: {
      id: string;
      bedNumber: string;
    };
    AttendanceDiagnosis?: Array<{
      id: string;
      diagnosisType: string;
      Diagnosis?: {
        id: string;
        name: string;
        icdCode: string;
      };
    }>;
  };
  patient?: any;
  ward?: any;
  bed?: any;
}

export interface DaycasePatient {
  id: string;
  attendanceNumber: string;
  patientId: string;
  patientName: string;
  folderNumber: string;
  age: number;
  gender: string;
  wardName: string;
  bedNumber: string;
  admissionDate: string;
  complaints: string;
  status: string;
}

export interface AdmissionStats {
  total: number;
  active: number;
  discharged: number;
  byWard?: Record<string, number>;
  byType?: Record<string, number>;
}

export interface BedOccupancy {
  total: number;
  occupied: number;
  available: number;
  byWard: Array<{
    wardId: string;
    wardName: string;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    patients: Array<{
      patientId: string;
      patientName: string;
      bedNumber: string;
      admissionNumber: string;
      admissionDate: string;
    }>;
  }>;
}

// New types for detention
export interface DetentionPatientWithDetails {
  id: string;
  attendanceNumber: string;
  patientId: string;
  patientName: string;
  folderNumber: string;
  age: number;
  gender: string;
  wardName: string;
  bedNumber: string;
  admissionDate: string;
  observationHours: number;
  vitalsCount: number;
  diagnosisCount: number;
  lastVitalsAt?: string;
  readyForDecision: boolean;
  status: string;
}

export interface DetentionFilters {
  status?: 'active' | 'discharged';
  wardId?: string;
  observationHours?: number;
  readyForDecision?: boolean;
  page?: number;
  limit?: number;
}

export interface ConvertDetentionData {
  admissionType: 'elective' | 'emergency' | 'transfer';
  clinicalNotes?: string;
  decisionReason?: string;
}

interface AdmissionStore {
  // State
  admissions: Admission[];
  currentAdmission: Admission | null;
  daycasePatients: DaycasePatient[];
  admissionStats: AdmissionStats | null;
  bedOccupancy: BedOccupancy | null;
  isLoading: boolean;
  error: string | null;
  
  // New state for detention
  detentionPatients: DetentionPatientWithDetails[];
  formalIPDPatients: Admission[];
  detentionSummary: { totalDetention: number; readyForDecision: number; avgObservationHours: number } | null;
  
  // Core Admission Operations
  getAdmissions: (filters?: { status?: 'active' | 'discharged'; wardId?: string; page?: number; limit?: number; admissionType?: string; excludeDetention?: boolean }) => Promise<void>;
  getAdmission: (id: string) => Promise<Admission | null>;
  createAdmission: (data: { 
    attendanceId: string; 
    admissionType?: 'emergency' | 'elective' | 'transfer' | 'detention_observation' | 'antenatal_observation' | 'delivery' | 'postpartum_observation';
    admissionSource?: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency' | 'antenatal' | 'delivery';
    admissionDate?: string;
  }) => Promise<Admission | null>;
  updateAdmission: (id: string, data: { 
    dischargeDate?: string;
    dischargeStatus?: 'home' | 'transfer' | 'expired' | 'against_medical_advice';
    dailyNotes?: any;
    dischargeSummary?: string;
  }) => Promise<Admission | null>;
  deleteAdmission: (id: string) => Promise<void>;
  
  // Daycase/Observation Operations
  getDaycasePatients: (filters?: { status?: 'active' | 'discharged'; wardId?: string; page?: number; limit?: number }) => Promise<void>;
  convertDaycaseToIPD: (encounterId: string, data?: { admissionType?: 'emergency' | 'elective' | 'transfer' }) => Promise<any>;
  
  // Detention Operations (NEW)
  getDetentionPatients: (filters?: DetentionFilters) => Promise<void>;
  getFormalIPDPatients: (filters?: { status?: 'active' | 'discharged'; wardId?: string; page?: number; limit?: number }) => Promise<void>;
  convertDetentionToIPD: (encounterId: string, data: ConvertDetentionData) => Promise<any>;
  
  // Discharge Operations
  dischargePatient: (encounterId: string, data?: { 
    dischargeDate?: string;
    dischargeStatus?: 'home' | 'transfer' | 'expired' | 'against_medical_advice';
    dischargeSummary?: string;
  }) => Promise<void>;
  
  // Daily Notes Operations
  addDailyNote: (admissionId: string, data: { notes: string; noteType?: string }) => Promise<void>;
  
  // Stats & Reports
  getAdmissionStats: () => Promise<void>;
  getAdmissionsByPatientId: (patientId: string, filters?: { page?: number; limit?: number }) => Promise<Admission[]>;
  getBedOccupancy: () => Promise<void>;
  
  // Utility
  clearError: () => void;
  clearCurrentAdmission: () => void;
  reset: () => void;
}

// Helper to transform API response to consistent format
const transformAdmission = (data: any): Admission => ({
  id: data.id,
  admissionNumber: data.admissionNumber,
  attendanceId: data.attendanceId,
  admissionType: data.admissionType || 'emergency',
  admissionSource: data.admissionSource || 'opd',
  admissionDate: data.admissionDate,
  dischargeDate: data.dischargeDate || null,
  dischargeStatus: data.dischargeStatus || null,
  dailyNotes: data.dailyNotes || [],
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
  dischargeSummary: data.dischargeSummary,
  status: data.status,
  attendance: data.attendance,
  patient: data.patient,
  ward: data.ward,
  bed: data.bed
});

const transformDaycasePatient = (data: any): DaycasePatient => ({
  id: data.id,
  attendanceNumber: data.attendanceNumber,
  patientId: data.patientId,
  patientName: data.Patient ? `${data.Patient.surname} ${data.Patient.otherNames}`.trim() : 'Unknown',
  folderNumber: data.Patient?.folderNumber || 'N/A',
  age: data.Patient ? calculateAge(data.Patient.dateOfBirth) : 0,
  gender: data.Patient?.gender || 'Unknown',
  wardName: data.Ward?.wardName || data.Bed?.Ward?.wardName || '—',
  bedNumber: data.Bed?.bedNumber || '—',
  admissionDate: data.dateTime || data.createdAt,
  complaints: data.complaints || '',
  status: data.status
});

const transformDetentionPatient = (data: any): DetentionPatientWithDetails => ({
  id: data.id,
  attendanceNumber: data.attendanceNumber,
  patientId: data.patientId,
  patientName: data.patientName || (data.Patient ? `${data.Patient.surname} ${data.Patient.otherNames}`.trim() : 'Unknown'),
  folderNumber: data.folderNumber || data.Patient?.folderNumber || 'N/A',
  age: data.age || (data.Patient ? calculateAge(data.Patient.dateOfBirth) : 0),
  gender: data.gender || data.Patient?.gender || 'Unknown',
  wardName: data.wardName || data.Ward?.wardName || data.Bed?.Ward?.wardName || '—',
  bedNumber: data.bedNumber || data.Bed?.bedNumber || '—',
  admissionDate: data.admissionDate || data.dateTime || data.createdAt,
  observationHours: data.observationHours || 0,
  vitalsCount: data.vitalsCount || 0,
  diagnosisCount: data.diagnosisCount || 0,
  lastVitalsAt: data.lastVitalsAt,
  readyForDecision: data.readyForDecision || false,
  status: data.status || 'admitted'
});

const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const useAdmissionStore = create<AdmissionStore>((set, get) => ({
  // Initial State
  admissions: [],
  currentAdmission: null,
  daycasePatients: [],
  detentionPatients: [],
  formalIPDPatients: [],
  detentionSummary: null,
  admissionStats: null,
  bedOccupancy: null,
  isLoading: false,
  error: null,

  // ============================================
  // CORE ADMISSION OPERATIONS
  // ============================================

  /**
   * Get all formal admissions (IPD only)
   * Filters: status ('active' or 'discharged'), wardId, page, limit
   */
// stores/admissionStore.ts - Update the getAdmissions method

getAdmissions: async (filters = {}) => {
  set({ isLoading: true, error: null });
  try {
    const data = await apiGetAdmissions(filters);
    console.log('📊 getAdmissions raw data:', data);
    
    // Ensure data is an array
    let admissionsArray = Array.isArray(data) ? data : [];
    
    const transformedAdmissions = admissionsArray.map((item: any) => {
      // Handle both nested and flat structures
      const admissionData = item.admission || item;
      return {
        id: admissionData.id,
        admissionNumber: admissionData.admissionNumber,
        attendanceId: admissionData.attendanceId,
        admissionType: admissionData.admissionType || 'emergency',
        admissionSource: admissionData.admissionSource || 'opd',
        admissionDate: admissionData.admissionDate,
        dischargeDate: admissionData.dischargeDate || null,
        dischargeStatus: admissionData.dischargeStatus || null,
        dischargeSummary: admissionData.dischargeSummary,
        dailyNotes: admissionData.dailyNotes || [],
        createdAt: admissionData.createdAt,
        updatedAt: admissionData.updatedAt,
        status: admissionData.status,
        attendance: admissionData.attendance || item.attendance,
        patient: admissionData.patient || item.patient,
        ward: admissionData.ward || item.ward,
        bed: admissionData.bed || item.bed
      };
    });
    
    console.log(`✅ Loaded ${transformedAdmissions.length} formal admissions`);
    set({ admissions: transformedAdmissions, isLoading: false });
  } catch (error: any) {
    console.error('❌ Failed to fetch admissions:', error);
    set({ error: error.message || 'Failed to fetch admissions', admissions: [], isLoading: false });
  }
},

  /**
   * Get single admission by ID with full details
   */
  getAdmission: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiGetAdmission(id);
      const transformed = transformAdmission(data);
      set({ currentAdmission: transformed, isLoading: false });
      return transformed;
    } catch (error: any) {
      console.error('❌ Failed to fetch admission:', error);
      set({ error: error.message || 'Failed to fetch admission', isLoading: false });
      return null;
    }
  },

  /**
   * Create formal admission from an IPD encounter
   * Called when doctor clicks "Admit" button
   */
  createAdmission: async (data) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🔍 Creating admission for attendance:', data.attendanceId);
      
      const newAdmission = await apiCreateAdmission(data);
      const transformed = transformAdmission(newAdmission);
      
      // Update local state
      set(state => ({ 
        admissions: [transformed, ...state.admissions],
        currentAdmission: transformed,
        isLoading: false 
      }));
      
      console.log('✅ Admission created:', transformed.admissionNumber);
      return transformed;
    } catch (error: any) {
      console.error('❌ Failed to create admission:', error);
      set({ error: error.message || 'Failed to create admission', isLoading: false });
      throw error;
    }
  },

  /**
   * Update admission (used for discharge)
   */
  updateAdmission: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiUpdateAdmission(id, data);
      const transformed = transformAdmission(updated);
      
      set(state => ({
        admissions: state.admissions.map(a => a.id === id ? transformed : a),
        currentAdmission: state.currentAdmission?.id === id ? transformed : state.currentAdmission,
        isLoading: false
      }));
      
      return transformed;
    } catch (error: any) {
      console.error('❌ Failed to update admission:', error);
      set({ error: error.message || 'Failed to update admission', isLoading: false });
      throw error;
    }
  },

  /**
   * Delete admission (admin only, only if not discharged)
   */
  deleteAdmission: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteAdmission(id);
      
      set(state => ({
        admissions: state.admissions.filter(a => a.id !== id),
        currentAdmission: state.currentAdmission?.id === id ? null : state.currentAdmission,
        isLoading: false
      }));
    } catch (error: any) {
      console.error('❌ Failed to delete admission:', error);
      set({ error: error.message || 'Failed to delete admission', isLoading: false });
      throw error;
    }
  },

  // ============================================
  // DAYCASE / OBSERVATION OPERATIONS
  // ============================================

  /**
   * Get daycase/observation patients
   * Called to show patients under observation
   */
  getDaycasePatients: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiGetDaycasePatients(filters);
      const transformed = Array.isArray(data) 
        ? data.map(transformDaycasePatient) 
        : [];
      
      console.log(`📊 Loaded ${transformed.length} daycase patients`);
      set({ daycasePatients: transformed, isLoading: false });
    } catch (error: any) {
      console.error('❌ Failed to fetch daycase patients:', error);
      set({ error: error.message || 'Failed to fetch daycase patients', daycasePatients: [], isLoading: false });
    }
  },

  /**
   * Convert daycase/observation to formal IPD admission
   * Called when observation patient needs to be formally admitted
   */
  convertDaycaseToIPD: async (encounterId, data = {}) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiConvertDaycaseToIPD(encounterId, data);
      
      // Refresh both lists
      await get().getAdmissions();
      await get().getDaycasePatients();
      
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      console.error('❌ Failed to convert daycase to IPD:', error);
      set({ error: error.message || 'Failed to convert daycase to IPD', isLoading: false });
      throw error;
    }
  },

  // ============================================
  // DETENTION OPERATIONS (NEW)
  // ============================================

  /**
   * Get detention/observation patients (admissionType = 'detention_observation')
   * Shows patients under observation for 12-72 hours
   */
  getDetentionPatients: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetDetentionPatients(filters);
      const transformed = Array.isArray(response.data) 
        ? response.data.map(transformDetentionPatient) 
        : [];
      
      set({ 
        detentionPatients: transformed, 
        detentionSummary: response.summary || null,
        isLoading: false 
      });
      
      console.log(`📊 Loaded ${transformed.length} detention patients`);
    } catch (error: any) {
      console.error('❌ Failed to fetch detention patients:', error);
      set({ error: error.message || 'Failed to fetch detention patients', detentionPatients: [], isLoading: false });
    }
  },

  /**
   * Get formal IPD patients (excluding detention)
   * Shows patients with full admission
   */
  getFormalIPDPatients: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetFormalIPDPatients(filters);
      const transformed = Array.isArray(response.data) 
        ? response.data.map(transformAdmission) 
        : [];
      
      set({ formalIPDPatients: transformed, isLoading: false });
      console.log(`📊 Loaded ${transformed.length} formal IPD patients`);
    } catch (error: any) {
      console.error('❌ Failed to fetch formal IPD patients:', error);
      set({ error: error.message || 'Failed to fetch formal IPD patients', formalIPDPatients: [], isLoading: false });
    }
  },

  /**
   * Convert detention/observation to formal IPD admission
   * Called when observation patient needs to be formally admitted
   */
  convertDetentionToIPD: async (encounterId, data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiConvertDetentionToIPD(encounterId, data);
      
      // Refresh all relevant lists
      await get().getDetentionPatients();
      await get().getFormalIPDPatients();
      await get().getAdmissions();
      
      set({ isLoading: false });
      console.log('✅ Detention patient converted to formal IPD');
      return result;
    } catch (error: any) {
      console.error('❌ Failed to convert detention to IPD:', error);
      set({ error: error.message || 'Failed to convert detention to IPD', isLoading: false });
      throw error;
    }
  },

  // ============================================
  // DISCHARGE OPERATIONS
  // ============================================

  /**
   * Discharge patient from encounter (works for IPD, Daycase, and Detention)
   */
  dischargePatient: async (encounterId, data = {}) => {
    set({ isLoading: true, error: null });
    try {
      await apiDischargeFromEncounter(encounterId, data);
      
      // Refresh all admission lists
      await get().getAdmissions();
      await get().getDaycasePatients();
      await get().getDetentionPatients();
      await get().getFormalIPDPatients();
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Failed to discharge patient:', error);
      set({ error: error.message || 'Failed to discharge patient', isLoading: false });
      throw error;
    }
  },

  // ============================================
  // DAILY NOTES OPERATIONS
  // ============================================

  /**
   * Add daily nursing notes to admission
   */
  addDailyNote: async (admissionId, data) => {
    set({ isLoading: true, error: null });
    try {
      await apiAddDailyNotesToAdmission(admissionId, data);
      
      // Update current admission if it's the one being edited
      if (get().currentAdmission?.id === admissionId) {
        const updatedAdmission = await get().getAdmission(admissionId);
        set({ currentAdmission: updatedAdmission });
      }
      
      // Refresh the admissions list
      await get().getAdmissions();
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error('❌ Failed to add daily note:', error);
      set({ error: error.message || 'Failed to add daily note', isLoading: false });
      throw error;
    }
  },

  // ============================================
  // STATS & REPORTS
  // ============================================

  /**
   * Get admission statistics (total, active, discharged, by ward)
   */
  getAdmissionStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await apiGetAdmissionStats();
      set({ admissionStats: stats, isLoading: false });
    } catch (error: any) {
      console.error('❌ Failed to fetch admission stats:', error);
      set({ error: error.message || 'Failed to fetch admission stats', isLoading: false });
    }
  },

  /**
   * Get admission history for a specific patient
   */
  getAdmissionsByPatientId: async (patientId, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const admissions = await apiGetAdmissionsByPatientId(patientId, filters);
      const transformed = Array.isArray(admissions) 
        ? admissions.map(transformAdmission) 
        : [];
      set({ isLoading: false });
      return transformed;
    } catch (error: any) {
      console.error('❌ Failed to fetch patient admissions:', error);
      set({ error: error.message || 'Failed to fetch patient admissions', isLoading: false });
      return [];
    }
  },

  /**
   * Get current bed occupancy (all patients in beds)
   */
  getBedOccupancy: async () => {
    set({ isLoading: true, error: null });
    try {
      const occupancy = await apiGetBedOccupancy();
      set({ bedOccupancy: occupancy, isLoading: false });
    } catch (error: any) {
      console.error('❌ Failed to fetch bed occupancy:', error);
      set({ error: error.message || 'Failed to fetch bed occupancy', isLoading: false });
    }
  },

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  clearError: () => set({ error: null }),
  
  clearCurrentAdmission: () => set({ currentAdmission: null }),
  
  reset: () => set({
    admissions: [],
    currentAdmission: null,
    daycasePatients: [],
    detentionPatients: [],
    formalIPDPatients: [],
    detentionSummary: null,
    admissionStats: null,
    bedOccupancy: null,
    isLoading: false,
    error: null
  })
}))