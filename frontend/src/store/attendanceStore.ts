// stores/attendanceStore.ts - COMPLETE FIXED VERSION (Single copy)
import { create } from 'zustand';
import { describeApiError } from '../utils/apiError';

// Only the most recently requested visit/list request may replace shared store data.
let attendanceFetchSequence = 0;
let attendanceListFetchSequence = 0;
let attendanceListLoadingSequence: number | null = null;
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
  dispenseMedication as apiDispenseMedication,
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
  // A counter ticket is an ordinary visit held against a walk-in customer, so the
  // register link is the field that may be absent — never both, never neither.
  patientId: string | null;
  patient?: {
    id: string;
    surname: string;
    otherNames: string;
    folderNumber: string;
    contact: string;
    dateOfBirth: string;
    gender: string;
  } | null;
  counterClientId?: string | null;
  counterClient?: {
    id: string;
    name: string;
    ageYears: number | null;
    phone: string | null;
  } | null;
  attendanceType: string;
  dateTime: string;
  paymentMode: string;
  nhisCCC?: string;
  complaints: string;
  medicalNotes?: string;
  clinicalNotes?: Record<string, any> | null;
  historyPresentingComplaint?: string | null;
  reviewOfSystems?: Record<string, string> | null;
  physicalExamination?: string | null;
  physicalExamStructured?: Record<string, string> | null;
  assessment?: string | null;
  treatmentPlan?: string | null;
  clinicalOutcome?: 'improved' | 'stable' | 'unchanged' | 'deteriorated' | 'deceased' | 'unknown' | null;
  allergyReviewStatus?: 'not_reviewed' | 'no_known_allergies' | 'allergies_present' | null;
  allergyReviewNotes?: string | null;
  allergyReviewedAt?: string | null;
  allergyReviewedById?: string | null;
  providerId?: string | null;
  finalizedAt?: string | null;
  finalizedById?: string | null;
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
  getAttendances: (filters?: any, options?: { silent?: boolean }) => Promise<Attendance[]>;
  getAttendance: (id: string) => Promise<Attendance>;
  /**
   * Quietly re-fetch ONE visit and update it in place: in the shared list (other visits stay as they are),
   * and as `currentAttendance` if that is the visit being worked on. No loading flag, no error banner.
   * Used by live updates on data-entry screens so a background refresh never swaps the list under the user.
   */
  refreshAttendance: (id: string) => Promise<Attendance | null>;
  createAttendance: (data: any) => Promise<Attendance>;
  updateAttendance: (id: string, data: any) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;
  updateAttendanceStatus: (id: string, data: any) => Promise<void>;
  completeAttendance: (id: string, data?: any) => Promise<void>;

  // Diagnosis operations
  addDiagnosis: (attendanceId: string, data: any) => Promise<void>;
  removeDiagnosis: (attendanceId: string, diagnosisId: string) => Promise<void>;
  
  // Lab Test operations
  addLabTest: (attendanceId: string, data: { serviceCatalogId: string; templateId?: string; priority?: string; notes?: string }) => Promise<void>;
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
  dispenseMedication: (attendanceId: string, medicationId: string, data: { quantity: number; batchNumber?: string; expiryDate?: string }) => Promise<any>;
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

  getAttendances: async (filters = {}, options = {}) => {
    // The list is shared across screens; only the newest request may replace it.
    // A background refresh must not overwrite a newer, user-requested filter result.
    const requestSequence = ++attendanceListFetchSequence;
    // silent = background refresh: no loading flag, so screens don't flash a spinner
    if (!options.silent) {
      attendanceListLoadingSequence = requestSequence;
      set({ isLoading: true, error: null });
    }
    try {
      // The backend returns at most 100 rows per request (10 by default). Many screens call
      // getAttendances() with no arguments and expect "the visits happening now", so:
      //  - no filters at all   -> LIVE set: every admitted patient (however long ago they were
      //                           admitted) + pending visits from the last 14 days + every visit
      //                           from the last 72 hours. All pages, max 5,000 rows.
      //  - patientId only      -> that patient's 100 most recent visits
      //  - status only         -> open statuses (pending/admitted) are unbounded in age;
      //                           closed statuses are limited to the last 7 days
      //  - anything explicit   -> exactly what the caller asked for (limit > 100 walks the pages)
      const f: any = { ...filters };
      const explicit = f.page !== undefined || f.limit !== undefined || f.dateFrom || f.dateTo;
      if (!explicit) {
        if (f.patientId) {
          f.limit = 100;
        } else if (f.status) {
          const statuses = String(f.status).split(',').map((x: string) => x.trim());
          const openOnly = statuses.every((x: string) => x === 'pending' || x === 'admitted');
          if (!openOnly) {
            const since = new Date();
            since.setDate(since.getDate() - 7);
            since.setHours(0, 0, 0, 0);
            f.dateFrom = since.toISOString();
          }
          f.limit = 5000;
        } else {
          f.live = true;
          f.limit = 5000;
        }
      } else if (f.limit === undefined && (f.dateFrom || f.dateTo)) {
        f.limit = 5000;
      }
      const response = await apiGetAttendances(f);
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

      if (requestSequence === attendanceListFetchSequence) {
        set({
          attendances,
          pagination,
          ...(attendanceListLoadingSequence !== null && attendanceListLoadingSequence <= requestSequence
            ? { isLoading: false }
            : {}),
        });
        if (attendanceListLoadingSequence !== null && attendanceListLoadingSequence <= requestSequence) {
          attendanceListLoadingSequence = null;
        }
      }
      return attendances;
    } catch (error: any) {
      // Ignore stale failures too: they must not clear the current result or surface an
      // error for a filter the user has already replaced with a newer request.
      if (requestSequence === attendanceListFetchSequence) {
        if (!options.silent) console.error('Error fetching attendances:', error);
        set({
          ...(options.silent ? {} : { error: error.message || 'Failed to fetch attendances' }),
          ...(attendanceListLoadingSequence !== null && attendanceListLoadingSequence <= requestSequence
            ? { isLoading: false }
            : {}),
        });
        if (attendanceListLoadingSequence !== null && attendanceListLoadingSequence <= requestSequence) {
          attendanceListLoadingSequence = null;
        }
      }
      throw error;
    }
  },

  getAttendance: async (id: string) => {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Valid attendance ID is required');
    }

    const requestSequence = ++attendanceFetchSequence;
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetAttendance(id);
      const attendance = response.data || response;
      set((state) => requestSequence === attendanceFetchSequence
        ? { currentAttendance: attendance, isLoading: false, error: null }
        : state);
      return attendance;
    } catch (error: any) {
      console.error('Error fetching attendance:', error);
      set((state) => requestSequence === attendanceFetchSequence
        ? { error: error.message || 'Failed to fetch attendance', isLoading: false }
        : state);
      throw error;
    }
  },

  refreshAttendance: async (id: string) => {
    if (!id || id === 'undefined' || id === 'null') return null;
    try {
      const response = await apiGetAttendance(id);
      const fresh = (response.data || response) as Attendance;
      if (!fresh || !(fresh as any).id) return null;
      set((state) => {
        const index = state.attendances.findIndex((a) => a.id === fresh.id);
        const attendances = index >= 0
          ? state.attendances.map((a, i) => (i === index ? { ...a, ...fresh } : a))
          : state.attendances;
        return {
          attendances,
          currentAttendance: state.currentAttendance?.id === fresh.id ? fresh : state.currentAttendance,
        };
      });
      return fresh;
    } catch {
      return null; // a failed background refresh keeps what is on screen
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
      
      // ✅ Filter out undefined values and normalize legacy SOAP fields to the current Prisma schema
      const allowedTopLevelKeys = new Set([
        'status',
        'complaint',
        'complaints',
        'medicalNotes',
        'clinicalNotes',
        'historyPresentingComplaint',
        'reviewOfSystems',
        'physicalExamination',
        'physicalExamStructured',
        'assessment',
        'treatmentPlan',
        'clinicalOutcome',
        'allergyReviewStatus',
        'allergyReviewNotes',
        'providerId',
        'followUpDate',
        'dateTime',
        'attendanceType',
        'paymentMode',
        'nhisCCC',
        'insuranceProviderId',
        'corporateAccountId',
        'encounterCategory',
        'bedId',
        'wardId',
        'admissionType',
        'updatedById',
      ]);

      const legacyClinicalKeys = new Set([
        'onsetDurationQuality',
        'treatmentNotes',
        'physicianNotes',
      ]);

      const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
        if (value === undefined || (value === null && key !== 'followUpDate')) return acc;
        if (key === 'updatedAt') return acc;

        if (legacyClinicalKeys.has(key)) {
          acc.clinicalNotes = {
            ...(acc.clinicalNotes || {}),
            [key]: value,
          };
          return acc;
        }

        if (allowedTopLevelKeys.has(key)) {
          acc[key] = value;
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
      
      // Name what the API rejected. Reading only `errors[].msg` - the shape one validator used to
      // return - produced an empty message, so a refused update reported nothing at all.
      const errorMessage = describeApiError(error, 'Failed to update attendance');
      
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
    const state = get();
    const att = state.attendances.find((a) => a.id === attendanceId)
      || (state.currentAttendance?.id === attendanceId ? state.currentAttendance : undefined);
    if (!att || !get().canAddActivities(att)) {
      throw new Error('Cannot add diagnosis to non-pending attendance');
    }
    
    set({ isLoading: true, error: null });
    try {
      await apiAddDiagnosis(attendanceId, data);
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Diagnosis was saved, but the visit could not be refreshed');
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Error adding diagnosis:', error);
      set({ error: error.message || 'Failed to add diagnosis', isLoading: false });
      throw error;
    }
  },

  removeDiagnosis: async (attendanceId, diagnosisId) => {
    const state = get();
    const att = state.attendances.find((a) => a.id === attendanceId)
      || (state.currentAttendance?.id === attendanceId ? state.currentAttendance : undefined);
    if (!att) throw new Error('Cannot remove diagnosis: attendance not found');
    if (!get().canAddActivities(att)) throw new Error('Cannot remove diagnosis from non-pending attendance');
    set({ isLoading: true, error: null });
    try {
      await apiRemoveDiagnosis(attendanceId, diagnosisId);
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Diagnosis was removed, but the visit could not be refreshed');
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

  addLabTest: async (attendanceId, { serviceCatalogId, templateId, priority, notes }) => {
    const state = get();
    const att = state.attendances.find((a) => a.id === attendanceId)
      || (state.currentAttendance?.id === attendanceId ? state.currentAttendance : undefined);
    if (!att || !get().canAddActivities(att)) {
      throw new Error('Cannot add lab test to non-pending attendance');
    }
    
    set({ isLoading: true, error: null });
    try {
      await apiAddLabTest(attendanceId, { serviceCatalogId, templateId, priority, notes });
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Lab order was saved, but the visit could not be refreshed');
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
      await apiUpdateLabTestStatus(attendanceId, labTestId, data);
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Lab result was updated, but the visit could not be refreshed');
      if (String(data?.status || '').toLowerCase() === 'completed') {
        await get().calculateBill(attendanceId);
      }
    } catch (error: any) {
      console.error('Error updating lab test status:', error);
      set({ error: error.message || 'Failed to update lab test status', isLoading: false });
      throw error;
    }
  },

  removeLabTest: async (attendanceId, labTestId) => {
    set({ isLoading: true, error: null });
    try {
      await apiRemoveLabTest(attendanceId, labTestId);
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Lab order was removed, but the visit could not be refreshed');
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
    const state = get();
    const att = state.attendances.find((a) => a.id === attendanceId)
      || (state.currentAttendance?.id === attendanceId ? state.currentAttendance : undefined);
    if (!att || !get().canAddActivities(att)) {
      throw new Error('Cannot add procedure to non-pending attendance');
    }
    
    set({ isLoading: true, error: null });
    try {
      await apiAddProcedure(attendanceId, { serviceCatalogId, scheduledDate, notes });
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Procedure was saved, but the visit could not be refreshed');
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
      await apiUpdateProcedureStatus(attendanceId, procedureId, data);
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Procedure status was updated, but the visit could not be refreshed');
      if (String(data?.status || '').toLowerCase() === 'completed') {
        await get().calculateBill(attendanceId);
      }
    } catch (error: any) {
      console.error('Error updating procedure status:', error);
      set({ error: error.message || 'Failed to update procedure status', isLoading: false });
      throw error;
    }
  },

  removeProcedure: async (attendanceId, procedureId) => {
    set({ isLoading: true, error: null });
    try {
      await apiRemoveProcedure(attendanceId, procedureId);
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Procedure was removed, but the visit could not be refreshed');
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
    const state = get();
    const att = state.attendances.find((a) => a.id === attendanceId)
      || (state.currentAttendance?.id === attendanceId ? state.currentAttendance : undefined);
    if (!att || !get().canAddActivities(att)) {
      throw new Error('Cannot add medication to non-pending attendance');
    }
    
    set({ isLoading: true, error: null });
    try {
      await apiAddMedication(attendanceId, {
        stockItemId,
        serviceCatalogId,
        dosage,
        frequency,
        duration,
        route,
        instructions,
      });
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Prescription was saved, but the visit could not be refreshed');
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
      // This endpoint returns the updated medication, not the whole attendance.
      const response = await apiUpdateMedicationStatus(attendanceId, medicationId, data);
      const updatedMedication = response?.data?.data || response?.data || response;
      if (!updatedMedication || updatedMedication.id !== medicationId) {
        throw new Error('Medication update response was invalid; refresh and try again');
      }
      set({ isLoading: false, error: null });
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      if (!refreshedAttendance) throw new Error('Medication was updated, but the visit could not be refreshed');
      const medicationFromAttendance = (refreshedAttendance as any)?.Medication?.find(
        (medication: any) => medication.id === medicationId
      );
      if (['dispensed', 'administered'].includes(String(data?.status || '').toLowerCase())) {
        await get().calculateBill(attendanceId);
      }
      return medicationFromAttendance || updatedMedication;
    } catch (error: any) {
      console.error('Error updating medication status:', error);
      set({
        error: error.response?.data?.message || error.message || 'Failed to update medication status',
        isLoading: false
      });
      throw error;
    }
  },

  dispenseMedication: async (attendanceId, medicationId, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiDispenseMedication(attendanceId, medicationId, data);
      const updatedMedication = response?.data?.data || response?.data || response;
      if (!updatedMedication || updatedMedication.id !== medicationId) {
        throw new Error('Medication dispense response was invalid; refresh and verify the stock transaction');
      }
      set({ isLoading: false, error: null });
      // Dispensing is already committed by the backend. A failed follow-up refresh
      // must not be reported as a failed dispense or encourage a second attempt.
      let refreshedAttendance: any = null;
      try {
        refreshedAttendance = await get().refreshAttendance(attendanceId);
      } catch (refreshError) {
        console.warn('Medication was dispensed; attendance refresh will be retried separately', refreshError);
      }
      const medicationFromAttendance = (refreshedAttendance as any)?.Medication?.find(
        (medication: any) => medication.id === medicationId
      );
      await get().calculateBill(attendanceId);
      return medicationFromAttendance || updatedMedication;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || error.message || 'Failed to dispense medication',
        isLoading: false
      });
      throw error;
    }
  },

  removeMedication: async (attendanceId, medicationId) => {
    const state = get();
    const att = state.attendances.find((a) => a.id === attendanceId)
      || (state.currentAttendance?.id === attendanceId ? state.currentAttendance : undefined);
    if (!att) throw new Error('Cannot cancel prescription: attendance not found');
    if (!get().canAddActivities(att)) throw new Error('Cannot cancel prescription from non-pending attendance');
    set({ isLoading: true, error: null });
    try {
      await apiRemoveMedication(attendanceId, medicationId);
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Prescription was cancelled, but the visit could not be refreshed');
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
    const state = get();
    const att = state.attendances.find((a) => a.id === attendanceId)
      || (state.currentAttendance?.id === attendanceId ? state.currentAttendance : undefined);
    if (!att || !get().canAddActivities(att)) {
      throw new Error('Cannot add scan to non-pending attendance');
    }
    
    set({ isLoading: true, error: null });
    try {
      await apiAddScan(attendanceId, { serviceCatalogId, priority, notes });
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Scan order was saved, but the visit could not be refreshed');
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
      await apiUpdateScanStatus(attendanceId, scanId, data);
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Scan result was updated, but the visit could not be refreshed');
      if (String(data?.status || '').toLowerCase() === 'completed') {
        await get().calculateBill(attendanceId);
      }
    } catch (error: any) {
      console.error('Error updating scan status:', error);
      set({ error: error.message || 'Failed to update scan status', isLoading: false });
      throw error;
    }
  },

  removeScan: async (attendanceId, scanId) => {
    set({ isLoading: true, error: null });
    try {
      await apiRemoveScan(attendanceId, scanId);
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Scan order was removed, but the visit could not be refreshed');
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
    const state = get();
    const att = state.attendances.find((a) => a.id === attendanceId)
      || (state.currentAttendance?.id === attendanceId ? state.currentAttendance : undefined);
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

  // Best-effort refresh after a clinical change. The bill itself is produced by the billing
  // flow (POST /bills/generate/:encounterId), and the backend has no /calculate-bill route,
  // so this must never make an add/remove action (diagnosis, service, lab ...) look failed.
  calculateBill: async (attendanceId) => {
    try {
      return await apiCalculateBill(attendanceId);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status !== 404) console.warn('Bill refresh skipped:', error?.message || error);
      return null;
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
    const state = get();
    const att = state.attendances.find((a) => a.id === attendanceId)
      || (state.currentAttendance?.id === attendanceId ? state.currentAttendance : undefined);
    if (!att || !get().canAddActivities(att)) {
      throw new Error('Cannot add service to non-pending attendance');
    }

    set({ isLoading: true, error: null });
    try {
      // The API returns the created ServiceRendered row, not a replacement Attendance.
      await apiAddService(attendanceId, data);
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Service was added, but the visit could not be refreshed');
      await get().calculateBill(attendanceId);
    } catch (error: any) {
      console.error('Error adding service:', error);
      set({ error: error.message || 'Failed to add service', isLoading: false });
      throw error;
    }
  },

  removeService: async (attendanceId, serviceId) => {
    const state = get();
    const att = state.attendances.find((a) => a.id === attendanceId)
      || (state.currentAttendance?.id === attendanceId ? state.currentAttendance : undefined);
    if (!att) throw new Error('Cannot remove service: attendance not found');
    if (!get().canAddActivities(att)) throw new Error('Cannot remove service from non-pending attendance');

    set({ isLoading: true, error: null });
    try {
      // The API returns { id: serviceId, removed: true }, not an Attendance object.
      await apiRemoveService(attendanceId, serviceId);
      const refreshedAttendance = await get().refreshAttendance(attendanceId);
      set({ isLoading: false, error: null });
      if (!refreshedAttendance) throw new Error('Service was removed, but the visit could not be refreshed');
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

  clearCurrentAttendance: () => {
    // Invalidate any pending getAttendance request so it cannot restore a visit after navigation away.
    attendanceFetchSequence += 1;
    set({ currentAttendance: null });
  },
  clearError: () => set({ error: null }),
}));