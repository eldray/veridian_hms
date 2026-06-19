// stores/attendanceStore.ts - COMPLETE FIXED VERSION (Single copy)
import { create } from 'zustand';
import {
  getEncounters as apiGetAttendances,
  getEncounter as apiGetAttendance,
  createEncounter as apiCreateAttendance,
  updateEncounter as apiUpdateAttendance,
  deleteEncounter as apiDeleteAttendance,
  updateEncounterStatus as apiUpdateAttendanceStatus,
  addDiagnosisToEncounter as apiAddDiagnosis,
  removeDiagnosisFromEncounter as apiRemoveDiagnosis,
  addLabTestToEncounter as apiAddLabTest,
  updateLabTestInEncounter as apiUpdateLabTestStatus,
  removeLabTestFromEncounter as apiRemoveLabTest,
  addProcedureToEncounter as apiAddProcedure,
  updateProcedureStatus as apiUpdateProcedureStatus,
  removeProcedureFromEncounter as apiRemoveProcedure,
  addMedicationToEncounter as apiAddMedication,
  updateMedicationStatus as apiUpdateMedicationStatus,
  removeMedicationFromEncounter as apiRemoveMedication,
  addScanToEncounter as apiAddScan,
  updateScanStatus as apiUpdateScanStatus,
  removeScanFromEncounter as apiRemoveScan,
  addVitalsToEncounter as apiAddVitals,
  getVitalsByEncounter as apiGetVitals,
  updateVitals as apiUpdateVitals,
  deleteVitals as apiDeleteVitals,
  calculateEncounterBill as apiCalculateBill,
  getEncounterStats as apiGetAttendanceStats,
  addServiceToEncounter as apiAddService,
  removeServiceFromEncounter as apiRemoveService,
} from '../api';

// Types
interface Attendance {
  id: string;
  attendanceNumber: string;
  patientId: string;
  patient?: {
    id: string;
    surname: string;
    otherNames: string;
    folderNumber: string;
    contact: string;
    dateOfBirth: string;
    gender: string;
  };
  attendanceType: string;
  dateTime: string;
  paymentMode: string;
  nhisCCC?: string;
  complaints: string;
  medicalNotes?: string;
  encounterCategory: 'opd' | 'ipd' | 'daycase';  // ✅ UPDATED
  visitCategory: string;
  gdrgCategory?: string;
  serviceCategory?: string;
  totalBill: number;
  paidAmount: number;
  outstandingBalance: number;
  insuranceProviderId?: string;
  status: string;
  bedId?: string;      // ✅ ADDED
  wardId?: string;     // ✅ ADDED
  createdById: string;
  createdBy?: {
    id: string;
    fullName: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
  Bill?: any;
  AttendanceDiagnosis?: any[];
  LabTest?: any[];
  Procedure?: any[];
  Medication?: any[];
  Scan?: any[];
  ServiceRendered?: any[];
  Vitals?: any[];
  Admission?: any;  // Optional - only for IPD encounters
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface AttendanceState {
  attendances: Attendance[];
  currentAttendance: Attendance | null;
  isLoading: boolean;
  pagination: Pagination | null;
  stats: any;
  error: string | null;

  // Status helpers
  canAddActivities: (attendance: Attendance) => boolean;
  canModifyActivities: (attendance: Attendance) => boolean;
  canAddMedicalEntries: (attendance: Attendance) => boolean;
  canRecordVitals: (attendance: Attendance) => boolean;
  canCompleteAttendance: (attendance: Attendance) => boolean;
  isIPD: (attendance: Attendance) => boolean;
  isDaycase: (attendance: Attendance) => boolean;
  isOPD: (attendance: Attendance) => boolean;

  // Core operations
  getAttendances: (filters?: any) => Promise<Attendance[]>;
  getAttendance: (id: string) => Promise<Attendance>;
  createAttendance: (data: any) => Promise<Attendance>;
  updateAttendance: (id: string, data: any) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;
  updateAttendanceStatus: (id: string, data: any) => Promise<void>;
  completeAttendance: (id: string, data?: any) => Promise<void>;

  // Diagnosis operations
  addDiagnosis: (attendanceId: string, data: any) => Promise<void>;
  removeDiagnosis: (attendanceId: string, diagnosisId: string) => Promise<void>;
  
  // Lab Test operations
  addLabTest: (attendanceId: string, data: { serviceCatalogId: string; priority?: string; notes?: string }) => Promise<void>;
  updateLabTestStatus: (attendanceId: string, labTestId: string, data: any) => Promise<void>;
  removeLabTest: (attendanceId: string, labTestId: string) => Promise<void>;
  
  // Procedure operations
  addProcedure: (attendanceId: string, data: { serviceCatalogId: string; scheduledDate?: string; notes?: string }) => Promise<void>;
  updateProcedureStatus: (attendanceId: string, procedureId: string, data: any) => Promise<void>;
  removeProcedure: (attendanceId: string, procedureId: string) => Promise<void>;
  
  // Medication operations
  addMedication: (attendanceId: string, data: { 
    stockItemId: string; 
    serviceCatalogId: string; 
    dosage: string; 
    frequency: string; 
    duration: string; 
    route?: string; 
    instructions?: string 
  }) => Promise<void>;
  updateMedicationStatus: (attendanceId: string, medicationId: string, data: any) => Promise<void>;
  removeMedication: (attendanceId: string, medicationId: string) => Promise<void>;
  
  // Scan operations
  addScan: (attendanceId: string, data: { serviceCatalogId: string; priority?: string; notes?: string }) => Promise<void>;
  updateScanStatus: (attendanceId: string, scanId: string, data: any) => Promise<void>;
  removeScan: (attendanceId: string, scanId: string) => Promise<void>;

  // Vitals operations
  addVitals: (attendanceId: string, data: any) => Promise<void>;
  getVitalsByAttendance: (attendanceId: string) => Promise<any[]>;
  updateVitals: (attendanceId: string, vitalsId: string, data: any) => Promise<void>;
  deleteVitals: (attendanceId: string, vitalsId: string) => Promise<void>;

  // Billing operations
  calculateBill: (attendanceId: string) => Promise<any>;
  getAttendanceStats: (filters?: any) => Promise<void>;

  // Service operations
  addService: (attendanceId: string, data: any) => Promise<void>;
  removeService: (attendanceId: string, serviceId: string) => Promise<void>;

  // Utils
  clearCurrentAttendance: () => void;
  clearError: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  attendances: [],
  currentAttendance: null,
  isLoading: false,
  pagination: null,
  stats: null,
  error: null,

  // Status helpers
  canAddActivities: (attendance) => attendance?.status === 'pending' || attendance?.status === 'admitted',
  canModifyActivities: (attendance) => attendance?.status === 'pending' || attendance?.status === 'admitted',
  canAddMedicalEntries: (attendance) => attendance?.status === 'pending' || attendance?.status === 'admitted',
  canRecordVitals: (attendance) => attendance?.status === 'pending' || attendance?.status === 'admitted',
  canCompleteAttendance: (attendance) => attendance?.status === 'pending' || attendance?.status === 'admitted',
  isIPD: (attendance) => attendance?.encounterCategory === 'ipd',
  isDaycase: (attendance) => attendance?.encounterCategory === 'daycase',
  isOPD: (attendance) => attendance?.encounterCategory === 'opd',
  
  // ==========================================
  // CORE OPERATIONS
  // ==========================================

  getAttendances: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetAttendances(filters);
      let attendances: Attendance[] = [];
      let pagination: Pagination | null = null;

      if (Array.isArray(response)) {
        attendances = response;
      } else if (response.attendances) {
        attendances = response.attendances;
        pagination = response.pagination;
      } else if (response.data?.attendances) {
        attendances = response.data.attendances;
        pagination = response.data.pagination;
      } else if (response.data && Array.isArray(response.data)) {
        attendances = response.data;
      }

      set({ attendances, pagination, isLoading: false });
      return attendances;
    } catch (error: any) {
      console.error('Error fetching attendances:', error);
      set({ error: error.message || 'Failed to fetch attendances', isLoading: false });
      throw error;
    }
  },

  getAttendance: async (id: string) => {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Valid attendance ID is required');
    }
    
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetAttendance(id);
      const attendance = response.data || response;
      set({ currentAttendance: attendance, isLoading: false });
      return attendance;
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      set({ error: error.message || 'Failed to fetch attendance', isLoading: false });
      throw error;
    }
  },

  createAttendance: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiCreateAttendance(data);
      const newAttendance = response.attendance || response.data || response;
      set((state) => ({
        attendances: [newAttendance, ...state.attendances],
        currentAttendance: newAttendance,
        isLoading: false,
      }));
      return newAttendance;
    } catch (error: any) {
      console.error('Error creating attendance:', error);
      set({ error: error.message || 'Failed to create attendance', isLoading: false });
      throw error;
    }
  },

  updateAttendance: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      console.log('📝 Updating attendance:', { id, data });
      
      // ✅ Filter out undefined values and fields that should not be sent
      const cleanData = Object.keys(data).reduce((acc, key) => {
        if (data[key] !== undefined && data[key] !== null) {
          // Remove updatedAt if present - let backend handle it
          if (key !== 'updatedAt') {
            acc[key] = data[key];
          }
        }
        return acc;
      }, {} as any);
      
      console.log('🧹 Cleaned data being sent:', cleanData);
      
      const updated = await apiUpdateAttendance(id, cleanData);
      
      console.log('✅ Attendance updated successfully:', updated);
      
      set({
        attendances: get().attendances.map((a) => (a.id === id ? updated : a)),
        currentAttendance: get().currentAttendance?.id === id ? updated : get().currentAttendance,
        isLoading: false,
        error: null,
      });
      
      return updated;
    } catch (error: any) {
      console.error('❌ Error updating attendance:', {
        id,
        data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        responseData: error.response?.data
      });
      
      // ✅ Extract detailed error message from response
      let errorMessage = error.message || 'Failed to update attendance';
      if (error.response?.data?.errors) {
        // Handle validation errors array
        const validationErrors = error.response.data.errors;
        errorMessage = validationErrors.map((err: any) => err.msg).join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      set({ 
        error: errorMessage, 
        isLoading: false 
      });
      throw new Error(errorMessage);
    }
  },

  deleteAttendance: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteAttendance(id);
      set({
        attendances: get().attendances.filter((a) => a.id !== id),
        currentAttendance: get().currentAttendance?.id === id ? null : get().currentAttendance,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Error deleting attendance:', error);
      set({ error: error.message || 'Failed to delete attendance', isLoading: false });
      throw error;
    }
  },

  updateAttendanceStatus: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiUpdateAttendanceStatus(id, data);
      set({
        attendances: get().attendances.map((a) => (a.id === id ? updated : a)),
        currentAttendance: get().currentAttendance?.id === id ? updated : get().currentAttendance,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Error updating attendance status:', error);
      set({ error: error.message || 'Failed to update attendance status', isLoading: false });
      throw error;
    }
  },

  completeAttendance: (id, data = {}) => 
    get().updateAttendanceStatus(id, { status: 'completed', ...data }),

  // ==========================================
  // DIAGNOSIS OPERATIONS
  // ==========================================

  addDiagnosis: async (attendanceId, data) => {
    const att = get().attendances.find((a) => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canAddActivities(att)) {
      throw new Error('Cannot add diagnosis to non-pending attendance');
    }
    
    set({ isLoading: true, error: null });
    try {
      const updated = await apiAddDiagnosis(attendanceId, data);
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Error adding diagnosis:', error);
      set({ error: error.message || 'Failed to add diagnosis', isLoading: false });
      throw error;
    }
  },

  removeDiagnosis: async (attendanceId, diagnosisId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiRemoveDiagnosis(attendanceId, diagnosisId);
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Error removing diagnosis:', error);
      set({ error: error.message || 'Failed to remove diagnosis', isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // LAB TEST OPERATIONS
  // ==========================================

  addLabTest: async (attendanceId, { serviceCatalogId, priority, notes }) => {
    const att = get().attendances.find((a) => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canAddActivities(att)) {
      throw new Error('Cannot add lab test to non-pending attendance');
    }
    
    set({ isLoading: true, error: null });
    try {
      const updated = await apiAddLabTest(attendanceId, { serviceCatalogId, priority, notes });
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Error adding lab test:', error);
      set({ error: error.message || 'Failed to add lab test', isLoading: false });
      throw error;
    }
  },

  updateLabTestStatus: async (attendanceId, labTestId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiUpdateLabTestStatus(attendanceId, labTestId, data);
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Error updating lab test status:', error);
      set({ error: error.message || 'Failed to update lab test status', isLoading: false });
      throw error;
    }
  },

  removeLabTest: async (attendanceId, labTestId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiRemoveLabTest(attendanceId, labTestId);
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Error removing lab test:', error);
      set({ error: error.message || 'Failed to remove lab test', isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // PROCEDURE OPERATIONS
  // ==========================================

  addProcedure: async (attendanceId, { serviceCatalogId, scheduledDate, notes }) => {
    const att = get().attendances.find((a) => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canAddActivities(att)) {
      throw new Error('Cannot add procedure to non-pending attendance');
    }
    
    set({ isLoading: true, error: null });
    try {
      const updated = await apiAddProcedure(attendanceId, { serviceCatalogId, scheduledDate, notes });
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Error adding procedure:', error);
      set({ error: error.message || 'Failed to add procedure', isLoading: false });
      throw error;
    }
  },

  updateProcedureStatus: async (attendanceId, procedureId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiUpdateProcedureStatus(attendanceId, procedureId, data);
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Error updating procedure status:', error);
      set({ error: error.message || 'Failed to update procedure status', isLoading: false });
      throw error;
    }
  },

  removeProcedure: async (attendanceId, procedureId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiRemoveProcedure(attendanceId, procedureId);
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Error removing procedure:', error);
      set({ error: error.message || 'Failed to remove procedure', isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // MEDICATION OPERATIONS
  // ==========================================

  addMedication: async (attendanceId, { stockItemId, serviceCatalogId, dosage, frequency, duration, route, instructions }) => {
    const att = get().attendances.find((a) => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canAddActivities(att)) {
      throw new Error('Cannot add medication to non-pending attendance');
    }
    
    set({ isLoading: true, error: null });
    try {
      const updated = await apiAddMedication(attendanceId, {
        stockItemId,
        serviceCatalogId,
        dosage,
        frequency,
        duration,
        route,
        instructions,
      });
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Error adding medication:', error);
      set({ error: error.message || 'Failed to add medication', isLoading: false });
      throw error;
    }
  },

  updateMedicationStatus: async (attendanceId, medicationId, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiUpdateMedicationStatus(attendanceId, medicationId, data);
      const updatedAttendance = response.data || response;
      
      set((state) => {
        const updatedAttendances = state.attendances.map((att) => {
          if (att.id === attendanceId) return updatedAttendance;
          return att;
        });
        
        const updatedCurrentAttendance = state.currentAttendance?.id === attendanceId
          ? updatedAttendance
          : state.currentAttendance;
        
        return {
          attendances: updatedAttendances,
          currentAttendance: updatedCurrentAttendance,
          isLoading: false,
          error: null
        };
      });
      
      const updatedMedication = updatedAttendance.Medication?.find((m: any) => m.id === medicationId);
      return updatedMedication;
      
    } catch (error: any) {
      console.error('Error updating medication status:', error);
      set({ 
        error: error.response?.data?.message || error.message || 'Failed to update medication status', 
        isLoading: false 
      });
      throw error;
    }
  },

  removeMedication: async (attendanceId, medicationId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiRemoveMedication(attendanceId, medicationId);
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Error removing medication:', error);
      set({ error: error.message || 'Failed to remove medication', isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // SCAN OPERATIONS
  // ==========================================

  addScan: async (attendanceId, { serviceCatalogId, priority, notes }) => {
    const att = get().attendances.find((a) => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canAddActivities(att)) {
      throw new Error('Cannot add scan to non-pending attendance');
    }
    
    set({ isLoading: true, error: null });
    try {
      const updated = await apiAddScan(attendanceId, { serviceCatalogId, priority, notes });
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Error adding scan:', error);
      set({ error: error.message || 'Failed to add scan', isLoading: false });
      throw error;
    }
  },

  updateScanStatus: async (attendanceId, scanId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiUpdateScanStatus(attendanceId, scanId, data);
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Error updating scan status:', error);
      set({ error: error.message || 'Failed to update scan status', isLoading: false });
      throw error;
    }
  },

  removeScan: async (attendanceId, scanId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiRemoveScan(attendanceId, scanId);
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Error removing scan:', error);
      set({ error: error.message || 'Failed to remove scan', isLoading: false });
      throw error;
    }
  },

// stores/attendanceStore.ts - FIXED Vitals functions

  // ==========================================
  // VITALS OPERATIONS - FIXED
  // ==========================================

  addVitals: async (attendanceId, data) => {
    const att = get().attendances.find((a) => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canRecordVitals(att)) {
      throw new Error('Cannot record vitals on non-pending attendance');
    }
    
    set({ isLoading: true, error: null });
    try {
      // Save the vitals (API only needs attendanceId)
      const savedVitals = await apiAddVitals(attendanceId, data);
      console.log('✅ Vitals saved:', savedVitals);
      
      // Fetch fresh vitals after save
      const freshVitals = await apiGetVitals(attendanceId);
      console.log('📊 Fresh vitals after save:', freshVitals);
      
      // Update the vitals in the local attendance object
      const updatedAttendances = get().attendances.map((a) => {
        if (a.id === attendanceId) {
          return { ...a, Vitals: freshVitals };
        }
        return a;
      });
      
      const updatedCurrentAttendance = get().currentAttendance?.id === attendanceId
        ? { ...get().currentAttendance, Vitals: freshVitals }
        : get().currentAttendance;
      
      set({
        attendances: updatedAttendances,
        currentAttendance: updatedCurrentAttendance,
        isLoading: false,
      });
      
      return savedVitals;
    } catch (error: any) {
      console.error('Error adding vitals:', error);
      set({ error: error.message || 'Failed to add vitals', isLoading: false });
      throw error;
    }
  },

  getVitalsByAttendance: async (attendanceId) => {
    console.log('🔍 Fetching vitals for attendance:', attendanceId);
    try {
      const vitals = await apiGetVitals(attendanceId);
      console.log('📊 API returned vitals:', vitals);
      console.log('📊 Vitals count:', vitals?.length || 0);
      return vitals || [];
    } catch (error) {
      console.error('Error fetching vitals:', error);
      return [];
    }
  },

  updateVitals: async (attendanceId, vitalsId, data) => {
    set({ isLoading: true, error: null });
    try {
      // ✅ Only need vitalsId for the API call
      await apiUpdateVitals(vitalsId, data);
      console.log('✅ Vitals updated for vitalsId:', vitalsId);
      
      // Fetch fresh vitals after update using attendanceId
      const freshVitals = await apiGetVitals(attendanceId);
      console.log('📊 Fresh vitals after update:', freshVitals);
      
      const updatedAttendances = get().attendances.map((a) => {
        if (a.id === attendanceId) {
          return { ...a, Vitals: freshVitals };
        }
        return a;
      });
      
      const updatedCurrentAttendance = get().currentAttendance?.id === attendanceId
        ? { ...get().currentAttendance, Vitals: freshVitals }
        : get().currentAttendance;
      
      set({
        attendances: updatedAttendances,
        currentAttendance: updatedCurrentAttendance,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Error updating vitals:', error);
      set({ error: error.message || 'Failed to update vitals', isLoading: false });
      throw error;
    }
  },

  deleteVitals: async (attendanceId, vitalsId) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🗑️ Deleting vitals:', { attendanceId, vitalsId });
      
      // ✅ Only need vitalsId for the API call
      await apiDeleteVitals(vitalsId);
      console.log('✅ Vitals deleted successfully');
      
      // Fetch fresh vitals after delete using attendanceId
      const freshVitals = await apiGetVitals(attendanceId);
      console.log('📊 Fresh vitals after delete:', freshVitals);
      
      const updatedAttendances = get().attendances.map((a) => {
        if (a.id === attendanceId) {
          return { ...a, Vitals: freshVitals };
        }
        return a;
      });
      
      const updatedCurrentAttendance = get().currentAttendance?.id === attendanceId
        ? { ...get().currentAttendance, Vitals: freshVitals }
        : get().currentAttendance;
      
      set({
        attendances: updatedAttendances,
        currentAttendance: updatedCurrentAttendance,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Error deleting vitals:', error);
      set({ error: error.message || 'Failed to delete vitals', isLoading: false });
      throw error;
    }
  },


  // ==========================================
  // BILLING OPERATIONS
  // ==========================================

  calculateBill: async (attendanceId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiCalculateBill(attendanceId);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      console.error('Error calculating bill:', error);
      set({ error: error.message || 'Failed to calculate bill', isLoading: false });
      throw error;
    }
  },

  getAttendanceStats: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const stats = await apiGetAttendanceStats(filters);
      set({ stats, isLoading: false });
    } catch (error: any) {
      console.error('Error fetching attendance stats:', error);
      set({ error: error.message || 'Failed to fetch attendance stats', isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // SERVICE OPERATIONS
  // ==========================================

  addService: async (attendanceId, data) => {
    const att = get().attendances.find((a) => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canAddActivities(att)) {
      throw new Error('Cannot add service to non-pending attendance');
    }
    
    set({ isLoading: true, error: null });
    try {
      const updated = await apiAddService(attendanceId, data);
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Error adding service:', error);
      set({ error: error.message || 'Failed to add service', isLoading: false });
      throw error;
    }
  },

  removeService: async (attendanceId, serviceId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiRemoveService(attendanceId, serviceId);
      set({
        attendances: get().attendances.map((a) => (a.id === updated.id ? updated : a)),
        currentAttendance: updated,
        isLoading: false,
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Error removing service:', error);
      set({ error: error.message || 'Failed to remove service', isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // UTILITIES
  // ==========================================

  clearCurrentAttendance: () => set({ currentAttendance: null }),
  clearError: () => set({ error: null }),
}));