// stores/attendanceStore.ts - FULLY ENHANCED WITH STATUS MANAGEMENT + ALL FEATURES
import { create } from 'zustand';
import {
  getAttendances as apiGetAttendances,
  getAttendance as apiGetAttendance,
  createAttendance as apiCreateAttendance,
  updateAttendance as apiUpdateAttendance,
  deleteAttendance as apiDeleteAttendance,
  updateAttendanceStatus as apiUpdateAttendanceStatus,
  addDiagnosisToAttendance as apiAddDiagnosis,
  removeDiagnosisFromAttendance as apiRemoveDiagnosis,
  addLabTestToAttendance as apiAddLabTest,
  updateLabTestStatus as apiUpdateLabTestStatus,
  removeLabTestFromAttendance as apiRemoveLabTest,
  addProcedureToAttendance as apiAddProcedure,
  updateProcedureStatus as apiUpdateProcedureStatus,
  removeProcedureFromAttendance as apiRemoveProcedure,
  addMedicationToAttendance as apiAddMedication,
  updateMedicationStatus as apiUpdateMedicationStatus,
  removeMedicationFromAttendance as apiRemoveMedication,
  addScanToAttendance as apiAddScan,
  updateScanStatus as apiUpdateScanStatus,
  removeScanFromAttendance as apiRemoveScan,
  addVitalsToAttendance as apiAddVitals,
  getVitalsByAttendance as apiGetVitals,
  addProgressNoteToAttendance as apiAddProgressNote,
  removeProgressNoteFromAttendance as apiRemoveProgressNote,
  calculateAttendanceBill as apiCalculateBill,
  getAttendanceStats as apiGetAttendanceStats,
  addServiceToAttendance as apiAddService,
  removeServiceFromAttendance as apiRemoveService,
} from '../api';
import type { Attendance, Pagination, Vitals, ProgressNote } from '../types';

interface AttendanceState {
  attendances: Attendance[];
  currentAttendance: Attendance | null;
  isLoading: boolean;
  pagination: Pagination | null;
  stats: any;
  error: string | null;

  // Status checking helpers
  canAddActivities: (attendance: Attendance) => boolean;
  canPerformActivities: (attendance: Attendance) => boolean;
  canModifyActivities: (attendance: Attendance) => boolean;
  canAddMedicalEntries: (attendance: Attendance) => boolean;
  canRecordVitals: (attendance: Attendance) => boolean;
  canAddProgressNotes: (attendance: Attendance) => boolean;
  canCompleteAttendance: (attendance: Attendance) => boolean;

  // Main operations
  getAttendances: (filters?: any) => Promise<void>;
  getAttendance: (id: string) => Promise<void>;
  createAttendance: (data: any) => Promise<Attendance>;
  updateAttendance: (id: string, data: any) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;
  updateAttendanceStatus: (id: string, data: any) => Promise<void>;
  activateAttendance: (id: string) => Promise<void>;
  completeAttendance: (id: string, data?: any) => Promise<void>;

  // Clinical operations (with status validation)
  addDiagnosis: (attendanceId: string, data: any) => Promise<void>;
  removeDiagnosis: (attendanceId: string, diagnosisId: string) => Promise<void>;
  addLabTest: (attendanceId: string, data: any) => Promise<void>;
  updateLabTestStatus: (attendanceId: string, labTestId: string, data: any) => Promise<void>;
  removeLabTest: (attendanceId: string, labTestId: string) => Promise<void>;
  addProcedure: (attendanceId: string, data: any) => Promise<void>;
  updateProcedureStatus: (attendanceId: string, procedureId: string, data: any) => Promise<void>;
  removeProcedure: (attendanceId: string, procedureId: string) => Promise<void>;
  addMedication: (attendanceId: string, data: any) => Promise<void>;
  updateMedicationStatus: (attendanceId: string, medicationId: string, data: any) => Promise<void>;
  removeMedication: (attendanceId: string, medicationId: string) => Promise<void>;
  addScan: (attendanceId: string, data: any) => Promise<void>;
  updateScanStatus: (attendanceId: string, scanId: string, data: any) => Promise<void>;
  removeScan: (attendanceId: string, scanId: string) => Promise<void>;

  // Vitals & Notes
  addVitals: (attendanceId: string, data: any) => Promise<void>;
  getVitals: (attendanceId: string) => Promise<Vitals[]>;
  addProgressNote: (attendanceId: string, data: any) => Promise<void>;
  removeProgressNote: (attendanceId: string, noteId: string) => Promise<void>;

  // Billing
  calculateBill: (attendanceId: string) => Promise<any>;

  // Stats
  getAttendanceStats: (filters?: any) => Promise<void>;

  // Services
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

  // 🔑 STATUS CHECKING HELPERS
  canAddActivities: (attendance: Attendance) => {
    return ['pending', 'active'].includes(attendance.status);
  },
  
  canPerformActivities: (attendance: Attendance) => {
    return attendance.status === 'active';
  },
  
  canModifyActivities: (attendance: Attendance) => {
    return ['pending', 'active'].includes(attendance.status);
  },
  
  canAddMedicalEntries: (attendance: Attendance) => {
    return attendance.status === 'pending';
  },
  
  canRecordVitals: (attendance: Attendance) => {
    return ['pending', 'active'].includes(attendance.status);
  },
  
  canAddProgressNotes: (attendance: Attendance) => {
    return ['pending', 'active'].includes(attendance.status);
  },
  
  canCompleteAttendance: (attendance: Attendance) => {
    return ['pending', 'active'].includes(attendance.status);
  },

  // --- CORE OPERATIONS ---
  getAttendances: async (filters: any = {}) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🔍 [AttendanceStore] Fetching attendances with filters:', filters);
      const response = await apiGetAttendances(filters);
      console.log('🔍 [AttendanceStore] Raw API response:', response);
      
      let attendances = [];
      
      // Debug all possible response structures
      if (Array.isArray(response)) {
        console.log('✅ Response is direct array');
        attendances = response;
      } else if (Array.isArray(response.attendances)) {
        console.log('✅ Response has attendances array');
        attendances = response.attendances;
      } else if (Array.isArray(response.data)) {
        console.log('✅ Response has data array');
        attendances = response.data;
      } else if (response.data && Array.isArray(response.data.attendances)) {
        console.log('✅ Response has data.attendances array');
        attendances = response.data.attendances;
      } else {
        console.warn('❌ Unexpected response structure:', response);
        attendances = [];
      }
      
      console.log('🔍 [AttendanceStore] Processed attendances:', attendances);
      
      // Log first attendance to see patient data structure
      if (attendances.length > 0) {
        console.log('🔍 [AttendanceStore] First attendance structure:', {
          id: attendances[0]._id || attendances[0].id,
          patientId: attendances[0].patientId,
          patient: attendances[0].patient,
          allKeys: Object.keys(attendances[0])
        });
      }
      
      set({
        attendances,
        pagination: response.pagination || null,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to fetch attendances:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch attendances'
      });
      throw error;
    }
  },

  getAttendance: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const attendance = await apiGetAttendance(id);
      set({ currentAttendance: attendance, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch attendance:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch attendance'
      });
      throw error;
    }
  },

  createAttendance: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const newAttendance = await apiCreateAttendance(data);
      const attendances = get().attendances;
      set({
        attendances: [newAttendance, ...attendances],
        currentAttendance: newAttendance,
        isLoading: false
      });
      return newAttendance;
    } catch (error: any) {
      console.error('Failed to create attendance:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to create attendance'
      });
      throw error;
    }
  },

  updateAttendance: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiUpdateAttendance(id, data);
      const attendances = get().attendances.map(attendance =>
        attendance._id === id ? updatedAttendance : attendance
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to update attendance:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to update attendance'
      });
      throw error;
    }
  },

  deleteAttendance: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteAttendance(id);
      const attendances = get().attendances.filter(attendance => attendance._id !== id);
      set({
        attendances,
        currentAttendance: get().currentAttendance?._id === id ? null : get().currentAttendance,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to delete attendance:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to delete attendance'
      });
      throw error;
    }
  },

  updateAttendanceStatus: async (id: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiUpdateAttendanceStatus(id, data);
      const attendances = get().attendances.map(attendance =>
        attendance._id === id ? updatedAttendance : attendance
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to update attendance status:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to update attendance status'
      });
      throw error;
    }
  },

  activateAttendance: async (id: string) => {
    return get().updateAttendanceStatus(id, { status: 'active' });
  },

  completeAttendance: async (id: string, data: any = {}) => {
    return get().updateAttendanceStatus(id, { status: 'completed', ...data });
  },

  // --- DIAGNOSIS ---
  addDiagnosis: async (attendanceId: string, data: any) => {
    const attendance = get().attendances.find(a => a._id === attendanceId) || get().currentAttendance;
    if (!attendance) throw new Error('Attendance not found');
    if (!get().canAddActivities(attendance)) {
      throw new Error('Cannot add diagnosis to completed or cancelled attendance');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiAddDiagnosis(attendanceId, data);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Failed to add diagnosis:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to add diagnosis'
      });
      throw error;
    }
  },

  removeDiagnosis: async (attendanceId: string, diagnosisId: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiRemoveDiagnosis(attendanceId, diagnosisId);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Failed to remove diagnosis:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to remove diagnosis'
      });
      throw error;
    }
  },

  // --- LAB TESTS ---
  addLabTest: async (attendanceId: string, data: any) => {
    const attendance = get().attendances.find(a => a._id === attendanceId) || get().currentAttendance;
    if (!attendance) throw new Error('Attendance not found');
    if (!get().canAddActivities(attendance)) {
      throw new Error('Cannot add lab test to completed or cancelled attendance');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiAddLabTest(attendanceId, data);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Failed to add lab test:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to add lab test'
      });
      throw error;
    }
  },

  updateLabTestStatus: async (attendanceId: string, labTestId: string, data: any) => {
    const attendance = get().attendances.find(a => a._id === attendanceId) || get().currentAttendance;
    if (!attendance) throw new Error('Attendance not found');
    if (!get().canPerformActivities(attendance)) {
      throw new Error('Cannot update lab test status for non-active attendance');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiUpdateLabTestStatus(attendanceId, labTestId, data);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to update lab test status:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to update lab test status'
      });
      throw error;
    }
  },

  removeLabTest: async (attendanceId: string, labTestId: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiRemoveLabTest(attendanceId, labTestId);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Failed to remove lab test:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to remove lab test'
      });
      throw error;
    }
  },

  // --- PROCEDURES ---
  addProcedure: async (attendanceId: string, data: any) => {
    const attendance = get().attendances.find(a => a._id === attendanceId) || get().currentAttendance;
    if (!attendance) throw new Error('Attendance not found');
    if (!get().canAddActivities(attendance)) {
      throw new Error('Cannot add procedure to completed or cancelled attendance');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiAddProcedure(attendanceId, data);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Failed to add procedure:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to add procedure'
      });
      throw error;
    }
  },

  updateProcedureStatus: async (attendanceId: string, procedureId: string, data: any) => {
    const attendance = get().attendances.find(a => a._id === attendanceId) || get().currentAttendance;
    if (!attendance) throw new Error('Attendance not found');
    if (!get().canPerformActivities(attendance)) {
      throw new Error('Cannot update procedure status for non-active attendance');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiUpdateProcedureStatus(attendanceId, procedureId, data);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to update procedure status:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to update procedure status'
      });
      throw error;
    }
  },

  removeProcedure: async (attendanceId: string, procedureId: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiRemoveProcedure(attendanceId, procedureId);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Failed to remove procedure:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to remove procedure'
      });
      throw error;
    }
  },

  // --- MEDICATIONS ---
  addMedication: async (attendanceId: string, data: any) => {
    const attendance = get().attendances.find(a => a._id === attendanceId) || get().currentAttendance;
    if (!attendance) throw new Error('Attendance not found');
    if (!get().canAddActivities(attendance)) {
      throw new Error('Cannot add medication to completed or cancelled attendance');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiAddMedication(attendanceId, data);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Failed to add medication:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to add medication'
      });
      throw error;
    }
  },

  updateMedicationStatus: async (attendanceId: string, medicationId: string, data: any) => {
    const attendance = get().attendances.find(a => a._id === attendanceId) || get().currentAttendance;
    if (!attendance) throw new Error('Attendance not found');
    if (!get().canPerformActivities(attendance)) {
      throw new Error('Cannot update medication status for non-active attendance');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiUpdateMedicationStatus(attendanceId, medicationId, data);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to update medication status:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to update medication status'
      });
      throw error;
    }
  },

  removeMedication: async (attendanceId: string, medicationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiRemoveMedication(attendanceId, medicationId);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Failed to remove medication:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to remove medication'
      });
      throw error;
    }
  },

  // --- SCANS ---
  addScan: async (attendanceId: string, data: any) => {
    const attendance = get().attendances.find(a => a._id === attendanceId) || get().currentAttendance;
    if (!attendance) throw new Error('Attendance not found');
    if (!get().canAddActivities(attendance)) {
      throw new Error('Cannot add scan to completed or cancelled attendance');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiAddScan(attendanceId, data);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Failed to add scan:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to add scan'
      });
      throw error;
    }
  },

  updateScanStatus: async (attendanceId: string, scanId: string, data: any) => {
    const attendance = get().attendances.find(a => a._id === attendanceId) || get().currentAttendance;
    if (!attendance) throw new Error('Attendance not found');
    if (!get().canPerformActivities(attendance)) {
      throw new Error('Cannot update scan status for non-active attendance');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiUpdateScanStatus(attendanceId, scanId, data);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to update scan status:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to update scan status'
      });
      throw error;
    }
  },

  removeScan: async (attendanceId: string, scanId: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiRemoveScan(attendanceId, scanId);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Failed to remove scan:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to remove scan'
      });
      throw error;
    }
  },

  // --- VITALS ---
  addVitals: async (attendanceId: string, data: any) => {
    const attendance = get().attendances.find(a => a._id === attendanceId) || get().currentAttendance;
    if (!attendance) throw new Error('Attendance not found');
    if (!get().canPerformActivities(attendance)) {
      throw new Error('Cannot record vitals for pending, completed, or cancelled attendance');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiAddVitals(attendanceId, data);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to add vitals:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to add vitals'
      });
      throw error;
    }
  },

  getVitals: async (attendanceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const vitals = await apiGetVitals(attendanceId);
      set({ isLoading: false });
      return vitals;
    } catch (error: any) {
      console.error('Failed to get vitals:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to get vitals'
      });
      throw error;
    }
  },

  // --- PROGRESS NOTES ---
  addProgressNote: async (attendanceId: string, data: any) => {
    const attendance = get().attendances.find(a => a._id === attendanceId) || get().currentAttendance;
    if (!attendance) throw new Error('Attendance not found');
    if (!get().canAddActivities(attendance)) {
      throw new Error('Cannot add progress note to completed or cancelled attendance');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiAddProgressNote(attendanceId, data);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to add progress note:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to add progress note'
      });
      throw error;
    }
  },

  removeProgressNote: async (attendanceId: string, noteId: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiRemoveProgressNote(attendanceId, noteId);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
    } catch (error: any) {
      console.error('Failed to remove progress note:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to remove progress note'
      });
      throw error;
    }
  },

  // --- BILLING ---
  calculateBill: async (attendanceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiCalculateBill(attendanceId);
      if (get().currentAttendance?._id === attendanceId) {
        await get().getAttendance(attendanceId);
      }
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      console.error('Failed to calculate bill:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to calculate bill'
      });
      throw error;
    }
  },

  // --- STATS ---
  getAttendanceStats: async (filters: any = {}) => {
    set({ isLoading: true, error: null });
    try {
      const stats = await apiGetAttendanceStats(filters);
      set({ stats, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch attendance stats:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch attendance stats'
      });
      throw error;
    }
  },

  // --- SERVICES ---
  addService: async (attendanceId: string, data: any) => {
    const attendance = get().attendances.find(a => a._id === attendanceId) || get().currentAttendance;
    if (!attendance) throw new Error('Attendance not found');
    if (!get().canAddActivities(attendance)) {
      throw new Error('Cannot add service to completed or cancelled attendance');
    }

    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiAddService(attendanceId, data);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Failed to add service:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to add service'
      });
      throw error;
    }
  },

  removeService: async (attendanceId: string, serviceId: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAttendance = await apiRemoveService(attendanceId, serviceId);
      const attendances = get().attendances.map(att =>
        att._id === updatedAttendance._id ? updatedAttendance : att
      );
      set({
        attendances,
        currentAttendance: updatedAttendance,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Failed to remove service:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to remove service'
      });
      throw error;
    }
  },

  // --- UTILS ---
  clearCurrentAttendance: () => {
    set({ currentAttendance: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));
