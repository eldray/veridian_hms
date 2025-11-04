// stores/attendanceStore.ts
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
  getAttendanceStats as apiGetAttendanceStats
} from '../api';
import type { Attendance, Pagination, Vitals, ProgressNote } from '../types';

interface AttendanceState {
  attendances: Attendance[];
  currentAttendance: Attendance | null;
  isLoading: boolean;
  pagination: Pagination | null;
  stats: any;
  
  // Main operations
  getAttendances: (filters?: any) => Promise<void>;
  getAttendance: (id: string) => Promise<void>;
  createAttendance: (data: any) => Promise<void>;
  updateAttendance: (id: string, data: any) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;
  updateAttendanceStatus: (id: string, data: any) => Promise<void>;
  
  // Clinical operations
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
  calculateBill: (attendanceId: string) => Promise<void>;
  
  // Stats
  getAttendanceStats: (filters?: any) => Promise<void>;
  
  clearCurrentAttendance: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  attendances: [],
  currentAttendance: null,
  isLoading: false,
  pagination: null,
  stats: null,

  getAttendances: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const response = await apiGetAttendances(filters);
      set({ 
        attendances: response.attendances || response.data || response,
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch attendances:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getAttendance: async (id: string) => {
    set({ isLoading: true });
    try {
      const attendance = await apiGetAttendance(id);
      set({ currentAttendance: attendance, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createAttendance: async (data: any) => {
    set({ isLoading: true });
    try {
      const newAttendance = await apiCreateAttendance(data);
      const attendances = get().attendances;
      set({ 
        attendances: [newAttendance, ...attendances],
        currentAttendance: newAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to create attendance:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateAttendance: async (id: string, data: any) => {
    set({ isLoading: true });
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
    } catch (error) {
      console.error('Failed to update attendance:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  deleteAttendance: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiDeleteAttendance(id);
      const attendances = get().attendances.filter(attendance => attendance._id !== id);
      set({ 
        attendances,
        currentAttendance: get().currentAttendance?._id === id ? null : get().currentAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to delete attendance:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateAttendanceStatus: async (id: string, data: any) => {
    set({ isLoading: true });
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
    } catch (error) {
      console.error('Failed to update attendance status:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Diagnosis operations
  addDiagnosis: async (attendanceId: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiAddDiagnosis(attendanceId, data);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to add diagnosis:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  removeDiagnosis: async (attendanceId: string, diagnosisId: string) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiRemoveDiagnosis(attendanceId, diagnosisId);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to remove diagnosis:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Lab test operations
  addLabTest: async (attendanceId: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiAddLabTest(attendanceId, data);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to add lab test:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateLabTestStatus: async (attendanceId: string, labTestId: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiUpdateLabTestStatus(attendanceId, labTestId, data);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update lab test status:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  removeLabTest: async (attendanceId: string, labTestId: string) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiRemoveLabTest(attendanceId, labTestId);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to remove lab test:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Procedure operations
  addProcedure: async (attendanceId: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiAddProcedure(attendanceId, data);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to add procedure:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateProcedureStatus: async (attendanceId: string, procedureId: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiUpdateProcedureStatus(attendanceId, procedureId, data);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update procedure status:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  removeProcedure: async (attendanceId: string, procedureId: string) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiRemoveProcedure(attendanceId, procedureId);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to remove procedure:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Medication operations
  addMedication: async (attendanceId: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiAddMedication(attendanceId, data);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to add medication:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateMedicationStatus: async (attendanceId: string, medicationId: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiUpdateMedicationStatus(attendanceId, medicationId, data);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update medication status:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  removeMedication: async (attendanceId: string, medicationId: string) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiRemoveMedication(attendanceId, medicationId);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to remove medication:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Scan operations
  addScan: async (attendanceId: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiAddScan(attendanceId, data);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to add scan:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  updateScanStatus: async (attendanceId: string, scanId: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiUpdateScanStatus(attendanceId, scanId, data);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to update scan status:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  removeScan: async (attendanceId: string, scanId: string) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiRemoveScan(attendanceId, scanId);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to remove scan:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Progress notes operations
  addProgressNote: async (attendanceId: string, data: any) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiAddProgressNote(attendanceId, data);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to add progress note:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  removeProgressNote: async (attendanceId: string, noteId: string) => {
    set({ isLoading: true });
    try {
      const updatedAttendance = await apiRemoveProgressNote(attendanceId, noteId);
      set({ 
        currentAttendance: updatedAttendance,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to remove progress note:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Billing operations
  calculateBill: async (attendanceId: string) => {
    set({ isLoading: true });
    try {
      const result = await apiCalculateBill(attendanceId);
      // Refresh the current attendance to get updated bill info
      if (get().currentAttendance?._id === attendanceId) {
        await get().getAttendance(attendanceId);
      }
      set({ isLoading: false });
      return result;
    } catch (error) {
      console.error('Failed to calculate bill:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Stats
  getAttendanceStats: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const stats = await apiGetAttendanceStats(filters);
      set({ stats, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch attendance stats:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  clearCurrentAttendance: () => {
    set({ currentAttendance: null });
  },
}));
