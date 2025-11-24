// stores/attendanceStore.ts - FINAL: NO 'active' STATUS + FULL NHIS + ROBUST
import { create } from 'zustand';
import { useGDRGTariffStore } from './gdrgTariffStore';
import { useHospitalStore } from './hospitalStore';
import { useSettingsStore } from './settingsStore';
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
  updateVitals as apiUpdateVitals,
  deleteVitals as apiDeleteVitals,
  calculateAttendanceBill as apiCalculateBill,
  getAttendanceStats as apiGetAttendanceStats,
  addServiceToAttendance as apiAddService,
  removeServiceFromAttendance as apiRemoveService,
} from '../api';

interface AttendanceState {
  attendances: Attendance[];
  currentAttendance: Attendance | null;
  isLoading: boolean;
  pagination: Pagination | null;
  stats: any;
  error: string | null;

  // === STATUS HELPERS (ONLY 'pending') ===
  canAddActivities: (attendance: Attendance) => boolean;
  canModifyActivities: (attendance: Attendance) => boolean;
  canAddMedicalEntries: (attendance: Attendance) => boolean;
  canRecordVitals: (attendance: Attendance) => boolean;
  canCompleteAttendance: (attendance: Attendance) => boolean;

  // === CORE ===
  getAttendances: (filters?: any) => Promise<void>;
  getAttendance: (id: string) => Promise<void>;
  createAttendance: (data: any) => Promise<Attendance>;
  updateAttendance: (id: string, data: any) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;
  updateAttendanceStatus: (id: string, data: any) => Promise<void>;
  completeAttendance: (id: string, data?: any) => Promise<void>;
  getAttendancesByPatient: (patientId: string) => Promise<void>;

  // === CLINICAL ===
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

  // === VITALS & NOTES ===
  addVitals: (attendanceId: string, data: any) => Promise<void>;
  getVitalsByAttendance: (attendanceId: string) => Promise<Vitals[]>;
  updateVitals: (attendanceId: string, vitalsId: string, data: any) => Promise<void>;
  deleteVitals: (attendanceId: string, vitalsId: string) => Promise<void>;

  // === BILLING & STATS ===
  calculateBill: (attendanceId: string) => Promise<any>;
  getAttendanceStats: (filters?: any) => Promise<void>;

  // === SERVICES ===
  addService: (attendanceId: string, data: any) => Promise<void>;
  removeService: (attendanceId: string, serviceId: string) => Promise<void>;

  // === UTILS ===
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

  // === STATUS HELPERS (ONLY 'pending') ===
  canAddActivities: (a) => a.status === 'pending',
  canModifyActivities: (a) => a.status === 'pending',
  canAddMedicalEntries: (a) => a.status === 'pending',
  canRecordVitals: (a) => a.status === 'pending',
  canAddProgressNotes: (a) => a.status === 'pending',
  canCompleteAttendance: (a) => a.status === 'pending',

  // === CORE ===
  // ✅ FIXED: Proper API response handling
  getAttendances: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🔄 Loading attendances with filters:', filters);
      const response = await apiGetAttendances(filters);
      
      let attendances = [];
      let pagination = null;

      // ✅ Handle different response formats
      if (Array.isArray(response)) {
        attendances = response;
      } else if (Array.isArray(response.attendances)) {
        attendances = response.attendances;
        pagination = response.pagination;
      } else if (Array.isArray(response.data)) {
        attendances = response.data;
        pagination = response.pagination;
      } else if (response.data && Array.isArray(response.data.attendances)) {
        attendances = response.data.attendances;
        pagination = response.data.pagination;
      }

      console.log('✅ Attendances loaded:', attendances.length);
      
      // ✅ Add fullName to patient data for frontend compatibility
      const attendancesWithFullName = attendances.map(attendance => ({
        ...attendance,
        patient: attendance.patient ? {
          ...attendance.patient,
          fullName: `${attendance.patient.surname || ''} ${attendance.patient.otherNames || ''}`.trim()
        } : null
      }));

      set({ 
        attendances: attendancesWithFullName, 
        pagination,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('❌ Failed to fetch attendances:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch attendances';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw new Error(errorMessage);
    }
  },

  getAttendance: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🔄 Fetching attendance:', id);
      const response = await apiGetAttendance(id);
      
      let attendanceData;
      if (response.data) {
        attendanceData = response.data;
      } else if (response.attendance) {
        attendanceData = response.attendance;
      } else {
        attendanceData = response;
      }

      // ✅ Add fullName to patient data
      if (attendanceData.patient) {
        attendanceData.patient = {
          ...attendanceData.patient,
          fullName: `${attendanceData.patient.surname || ''} ${attendanceData.patient.otherNames || ''}`.trim()
        };
      }

      console.log('✅ Attendance fetched:', attendanceData.id);
      set({ currentAttendance: attendanceData, isLoading: false });
    } catch (error: any) {
      console.error('❌ Failed to fetch attendance:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch attendance';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw new Error(errorMessage);
    }
  },

  // In your attendanceStore.ts - Add this method
getAttendancesByPatient: async (patientId: string) => {
  set({ isLoading: true, error: null });
  try {
    const response = await apiGetAttendances({ patientId });
    // ... handle response
    set({ attendances: filteredAttendances, isLoading: false });
  } catch (error: any) {
    set({ isLoading: false, error: error.message });
    throw error;
  }
},

  createAttendance: async (data) => {
    set({ isLoading: true, error: null });
    try {
      console.log('📝 Creating attendance:', data);
      const response = await apiCreateAttendance(data);
      
      let newAttendance;
      if (response.attendance) {
        newAttendance = response.attendance;
      } else if (response.data) {
        newAttendance = response.data;
      } else {
        newAttendance = response;
      }

      // ✅ Add fullName to patient data
      if (newAttendance.patient) {
        newAttendance.patient = {
          ...newAttendance.patient,
          fullName: `${newAttendance.patient.surname || ''} ${newAttendance.patient.otherNames || ''}`.trim()
        };
      }

      set((state) => ({ 
        attendances: [newAttendance, ...state.attendances],
        currentAttendance: newAttendance,
        isLoading: false 
      }));
      return newAttendance;
    } catch (error: any) {
      console.error('❌ Failed to create attendance:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create attendance';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
      throw new Error(errorMessage);
    }
  },

  // ✅ FIXED: Use correct ID field (id instead of id)
  updateAttendance: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiUpdateAttendance(id, data);
      set({
        attendances: get().attendances.map(a => a.id === id ? updated : a),
        currentAttendance: get().currentAttendance?.id === id ? updated : get().currentAttendance,
        isLoading: false
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update attendance' });
      throw error;
    }
  },

  deleteAttendance: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteAttendance(id);
      set({
        attendances: get().attendances.filter(a => a.id !== id),
        currentAttendance: get().currentAttendance?.id === id ? null : get().currentAttendance,
        isLoading: false
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to delete attendance' });
      throw error;
    }
  },

  updateAttendanceStatus: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiUpdateAttendanceStatus(id, data);
      set({
        attendances: get().attendances.map(a => a.id === id ? updated : a),
        currentAttendance: get().currentAttendance?.id === id ? updated : get().currentAttendance,
        isLoading: false
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update status' });
      throw error;
    }
  },

  completeAttendance: (id, data = {}) => get().updateAttendanceStatus(id, { status: 'completed', ...data }),

  // === CLINICAL OPERATIONS (ALL REQUIRE 'pending') ===
  addDiagnosis: async (attendanceId, data) => {
    const att = get().attendances.find(a => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canAddActivities(att)) throw new Error('Cannot add diagnosis to non-pending attendance');
    set({ isLoading: true, error: null });
    try {
      const gdrgCode = data.gdrgCode || data.diagnosis?.gdrgCode;
      if (gdrgCode && !useGDRGTariffStore.getState().getTariff(gdrgCode)) {
        await useGDRGTariffStore.getState().fetchTariffs();
      }
      const updated = await apiAddDiagnosis(attendanceId, data);
      set({
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a),
        currentAttendance: updated,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to add diagnosis' });
      throw error;
    }
  },

  removeDiagnosis: async (attendanceId, diagnosisId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiRemoveDiagnosis(attendanceId, diagnosisId);
      set({
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a),
        currentAttendance: updated,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to remove diagnosis' });
      throw error;
    }
  },

  addLabTest: async (attendanceId, data) => {
    const att = get().attendances.find(a => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canAddActivities(att)) throw new Error('Cannot add lab test to non-pending attendance');
    set({ isLoading: true, error: null });
    try {
      const updated = await apiAddLabTest(attendanceId, data);
      set({
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a),
        currentAttendance: updated,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to add lab test' });
      throw error;
    }
  },

  updateLabTestStatus: async (attendanceId, labTestId, data) => {
    const att = get().attendances.find(a => a.id === attendanceId) || get().currentAttendance;
    if (!att || att.status !== 'pending') throw new Error('Cannot update lab test on non-pending attendance');
    set({ isLoading: true, error: null });
    try {
      const updated = await apiUpdateLabTestStatus(attendanceId, labTestId, data);
      set({
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a),
        currentAttendance: updated,
        isLoading: false
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update lab test status' });
      throw error;
    }
  },

  removeLabTest: async (attendanceId, labTestId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiRemoveLabTest(attendanceId, labTestId);
      set({
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a),
        currentAttendance: updated,
        isLoading: false
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to remove lab test' });
      throw error;
    }
  },

  // === PROCEDURES, MEDS, SCANS (same pattern) ===
  addProcedure: async (attendanceId, data) => {
    const att = get().attendances.find(a => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canAddActivities(att)) throw new Error('Cannot add procedure to non-pending attendance');
    set({ isLoading: true, error: null });
    try {
      const updated = await apiAddProcedure(attendanceId, data);
      set({ 
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a), 
        currentAttendance: updated, 
        isLoading: false 
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to add procedure' });
      throw error;
    }
  },

  updateProcedureStatus: async (attendanceId, procedureId, data) => {
    const att = get().attendances.find(a => a.id === attendanceId) || get().currentAttendance;
    if (!att || att.status !== 'pending') throw new Error('Cannot update procedure on non-pending attendance');
    set({ isLoading: true, error: null });
    try {
      const updated = await apiUpdateProcedureStatus(attendanceId, procedureId, data);
      set({ 
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a), 
        currentAttendance: updated, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update procedure status' });
      throw error;
    }
  },

  removeProcedure: async (attendanceId, procedureId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiRemoveProcedure(attendanceId, procedureId);
      set({ 
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a), 
        currentAttendance: updated, 
        isLoading: false 
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to remove procedure' });
      throw error;
    }
  },

  addMedication: async (attendanceId, data) => {
    const att = get().attendances.find(a => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canAddActivities(att)) throw new Error('Cannot add medication to non-pending attendance');
    set({ isLoading: true, error: null });
    try {
      const updated = await apiAddMedication(attendanceId, data);
      set({ 
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a), 
        currentAttendance: updated, 
        isLoading: false 
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to add medication' });
      throw error;
    }
  },

  updateMedicationStatus: async (attendanceId, medicationId, data) => {
    const att = get().attendances.find(a => a.id === attendanceId) || get().currentAttendance;
    if (!att || att.status !== 'pending') throw new Error('Cannot dispense on non-pending attendance');
    set({ isLoading: true, error: null });
    try {
      const updated = await apiUpdateMedicationStatus(attendanceId, medicationId, data);
      set({ 
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a), 
        currentAttendance: updated, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update medication status' });
      throw error;
    }
  },

  removeMedication: async (attendanceId, medicationId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiRemoveMedication(attendanceId, medicationId);
      set({ 
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a), 
        currentAttendance: updated, 
        isLoading: false 
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to remove medication' });
      throw error;
    }
  },

  addScan: async (attendanceId, data) => {
    const att = get().attendances.find(a => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canAddActivities(att)) throw new Error('Cannot add scan to non-pending attendance');
    set({ isLoading: true, error: null });
    try {
      const updated = await apiAddScan(attendanceId, data);
      set({ 
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a), 
        currentAttendance: updated, 
        isLoading: false 
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to add scan' });
      throw error;
    }
  },

  updateScanStatus: async (attendanceId, scanId, data) => {
    const att = get().attendances.find(a => a.id === attendanceId) || get().currentAttendance;
    if (!att || att.status !== 'pending') throw new Error('Cannot update scan on non-pending attendance');
    set({ isLoading: true, error: null });
    try {
      const updated = await apiUpdateScanStatus(attendanceId, scanId, data);
      set({ 
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a), 
        currentAttendance: updated, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to update scan status' });
      throw error;
    }
  },

  removeScan: async (attendanceId, scanId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiRemoveScan(attendanceId, scanId);
      set({ 
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a), 
        currentAttendance: updated, 
        isLoading: false 
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to remove scan' });
      throw error;
    }
  },

  // === VITALS ===
  addVitals: async (attendanceId, data) => {
    const att = get().attendances.find(a => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canRecordVitals(att)) throw new Error('Cannot record vitals on non-pending attendance');
    set({ isLoading: true, error: null });
    try {
      const updated = await apiAddVitals(attendanceId, data);
      set({ 
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a), 
        currentAttendance: updated, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to record vitals' });
      throw error;
    }
  },

  getVitalsByAttendance: async (attendanceId) => {
    try {
      return await apiGetVitals(attendanceId);
    } catch (error) {
      console.error('Error fetching vitals:', error);
      return [];
    }
  },

  updateVitals: async (attendanceId: string, vitalsId: string, data: any) => {
    set({ isLoading: true, error: null });
    try {
      console.log('📝 Updating vitals:', { attendanceId, vitalsId, data });
      
      const response = await apiUpdateVitals(attendanceId, vitalsId, data);
      
      // ✅ UPDATE LOCAL STATE
      const updatedAttendance = await apiGetAttendance(attendanceId);
      
      set({
        attendances: get().attendances.map(a => 
          a.id === attendanceId ? updatedAttendance : a
        ),
        currentAttendance: get().currentAttendance?.id === attendanceId 
          ? updatedAttendance 
          : get().currentAttendance,
        isLoading: false
      });
      
      console.log('✅ Vitals updated successfully');
      return response.vitals;
    } catch (error: any) {
      console.error('❌ Failed to update vitals:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update vitals';
      set({
        error: errorMessage,
        isLoading: false
      });
      throw new Error(errorMessage);
    }
  },

  deleteVitals: async (attendanceId: string, vitalsId: string) => {
    set({ isLoading: true, error: null });
    try {
      console.log('🗑️ Deleting vitals:', { attendanceId, vitalsId });
      
      const response = await apiDeleteVitals(attendanceId, vitalsId);
      
      // ✅ UPDATE LOCAL STATE
      const updatedAttendance = await apiGetAttendance(attendanceId);
      
      set({
        attendances: get().attendances.map(a => 
          a.id === attendanceId ? updatedAttendance : a
        ),
        currentAttendance: get().currentAttendance?.id === attendanceId 
          ? updatedAttendance 
          : get().currentAttendance,
        isLoading: false
      });
      
      console.log('✅ Vitals deleted successfully');
      return response;
    } catch (error: any) {
      console.error('❌ Failed to delete vitals:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete vitals';
      set({
        error: errorMessage,
        isLoading: false
      });
      throw new Error(errorMessage);
    }
  },

  // === PROGRESS NOTES ===
  addProgressNote: async (attendanceId, data) => {
    const att = get().attendances.find(a => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canAddProgressNotes(att)) throw new Error('Cannot add note to non-pending attendance');
    set({ isLoading: true, error: null });
    try {
      const updated = await apiAddProgressNote(attendanceId, data);
      set({ 
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a), 
        currentAttendance: updated, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to add note' });
      throw error;
    }
  },

  removeProgressNote: async (attendanceId, noteId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiRemoveProgressNote(attendanceId, noteId);
      set({ 
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a), 
        currentAttendance: updated, 
        isLoading: false 
      });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to remove note' });
      throw error;
    }
  },

  // === BILLING & STATS ===
  calculateBill: async (attendanceId) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiCalculateBill(attendanceId);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to calculate bill' });
      throw error;
    }
  },

  getAttendanceStats: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const stats = await apiGetAttendanceStats(filters);
      set({ stats, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to fetch stats' });
      throw error;
    }
  },

  // === SERVICES ===
  addService: async (attendanceId, data) => {
    const att = get().attendances.find(a => a.id === attendanceId) || get().currentAttendance;
    if (!att || !get().canAddActivities(att)) throw new Error('Cannot add service to non-pending attendance');
    set({ isLoading: true, error: null });
    try {
      const updated = await apiAddService(attendanceId, data);
      set({ 
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a), 
        currentAttendance: updated, 
        isLoading: false 
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to add service' });
      throw error;
    }
  },

  removeService: async (attendanceId, serviceId) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await apiRemoveService(attendanceId, serviceId);
      set({ 
        attendances: get().attendances.map(a => a.id === updated.id ? updated : a), 
        currentAttendance: updated, 
        isLoading: false 
      });
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      set({ isLoading: false, error: error.message || 'Failed to remove service' });
      throw error;
    }
  },

  // === UTILS ===
  clearCurrentAttendance: () => set({ currentAttendance: null }),
  clearError: () => set({ error: null }),
}));