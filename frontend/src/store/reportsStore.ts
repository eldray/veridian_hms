// src/store/reportsStore.ts
import { create } from 'zustand';
import {
  getGHSOPDReport,
  getGHSIPDReport,
  getGHSIDSRReport,
  getGHSMalariaReport,
  getGHSFormAReport,
  getMorbidityMortalityReport,
  getTopDiagnoses,
  getFinancialReport,
  getInsuranceClaimsReport,
  getClinicalReport,
  getEncounterReport,          // aliased as getAttendanceReport in store actions
  getRevenueReport,
  getFamilyPlanningReport,
  getDemographicReport,
  getLabReport,
  getScanReport,
  getProcedureReport,
  getMedicationReport,
  getVitalsReport,
  getReportSubmissions,
  getReportSubmissionById,
  exportGHSReportToCSV,
  exportReport as exportReportApi,
  exportReportToCSV,
  getNhisExpiryReport,
  getNhisClaimsSummary,
  getConsultingRoomRegister,
} from '../api';

interface ReportFilter {
  startDate?: string;
  endDate?: string;
  [key: string]: any;
}

// FIXED: all report fields are top-level so Reports.tsx destructuring works directly.
// The old version nested everything inside ghsReports.* and clinicalReports.* which
// the component never read from.
interface ReportsState {
  isLoading: boolean;
  error: string | null;

  // ── GHS ──────────────────────────────────────
  opdReport:                any | null;
  ipdReport:                any | null;
  idsrReport:               any | null;
  malariaReport:            any | null;
  formAReport:              any | null;
  morbidityMortalityReport: any | null;
  topDiagnoses:             any[] | null;
  familyPlanningReport:     any | null;
  consultingRoomRegister:   any | null;

  // ── Financial / clinical ──────────────────────
  financialReport:       any | null;
  insuranceClaimsReport: any | null;
  clinicalReport:        any | null;
  attendanceReport:      any | null;
  revenueReport:         any | null;
  demographicReport:     any | null;

  // ── Clinical detail ───────────────────────────
  labReport:       any | null;
  scanReport:      any | null;
  procedureReport: any | null;
  medicationReport:any | null;
  vitalsReport:    any | null;

  // ── NHIS ─────────────────────────────────────
  nhisExpiryReport:  any | null;
  nhisClaimsSummary: any | null;

  // ── Submissions ───────────────────────────────
  submissions:       any[];
  currentSubmission: any | null;

  // ── Actions: GHS ─────────────────────────────
  getGHSOPDReport:              (filters: ReportFilter) => Promise<void>;
  getGHSIPDReport:              (filters: ReportFilter) => Promise<void>;
  getGHSIDSRReport:             (filters: ReportFilter) => Promise<void>;
  getGHSMalariaReport:          (filters: ReportFilter) => Promise<void>;
  getGHSFormAReport:            (filters: ReportFilter) => Promise<void>;
  getMorbidityMortalityReport:  (filters: ReportFilter) => Promise<void>;
  getTopDiagnoses:              (filters: ReportFilter, limit?: number) => Promise<void>;
  getFamilyPlanningReport:      (filters: ReportFilter) => Promise<void>;
  getConsultingRoomRegister:    (params: { startDate?: string; endDate?: string; period?: 'daily' | 'weekly' | 'monthly' }) => Promise<void>;

  // ── Actions: Financial / clinical ────────────
  getFinancialReport:       (filters: ReportFilter) => Promise<void>;
  getInsuranceClaimsReport: (filters: ReportFilter) => Promise<void>;
  getClinicalReport:        (filters: ReportFilter) => Promise<void>;
  getAttendanceReport:      (filters: ReportFilter) => Promise<void>;
  getRevenueReport:         (filters: ReportFilter) => Promise<void>;
  getDemographicReport:     (filters: ReportFilter) => Promise<void>;

  // ── Actions: Clinical detail ──────────────────
  getLabReport:        (filters: ReportFilter) => Promise<void>;
  getScanReport:       (filters: ReportFilter) => Promise<void>;
  getProcedureReport:  (filters: ReportFilter) => Promise<void>;
  getMedicationReport: (filters: ReportFilter) => Promise<void>;
  getVitalsReport:     (filters: ReportFilter) => Promise<void>;

  // ── Actions: NHIS ─────────────────────────────
  getNhisExpiryReport:  (params: { daysThreshold?: number; startDate?: string; endDate?: string }) => Promise<void>;
  getNhisClaimsSummary: (params: { startDate?: string; endDate?: string; expiryStatus?: string }) => Promise<void>;

  // ── Actions: Export / submissions ────────────
  exportReport:       (data: { reportType: string; format: string; filters: ReportFilter; data: any }) => Promise<any>;
  exportReportToCSV:  (reportType: string, filters: ReportFilter) => Promise<Blob>;
  getReportSubmissions: (filters?: any) => Promise<void>;
  getReportById:       (id: string) => Promise<void>;
  clearError:          () => void;
  clearReports:        () => void;
}

// ── Helper to unwrap API response ────────────────────────────────────────────
// In reportsStore.ts, update the unwrap helper:
const unwrap = (response: any) => {
  // If response has data.data (double nested)
  if (response?.data?.data) return response.data.data;
  // If response has data property and it contains facility (single nested)
  if (response?.data?.facility) return response.data;
  // If response itself has facility (direct)
  if (response?.facility) return response;
  // Otherwise return as-is
  return response;
};

export const useReportsStore = create<ReportsState>((set) => ({
  isLoading: false,
  error:     null,

  // initial state
  opdReport: null, ipdReport: null, idsrReport: null, malariaReport: null,
  formAReport: null, morbidityMortalityReport: null, topDiagnoses: null,
  familyPlanningReport: null, consultingRoomRegister: null,
  financialReport: null, insuranceClaimsReport: null, clinicalReport: null,
  attendanceReport: null, revenueReport: null, demographicReport: null,
  labReport: null, scanReport: null, procedureReport: null,
  medicationReport: null, vitalsReport: null,
  nhisExpiryReport: null, nhisClaimsSummary: null,
  submissions: [], currentSubmission: null,

  // ── GHS ──────────────────────────────────────────────────────────────────

  getGHSOPDReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getGHSOPDReport(filters));
      set({ opdReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getGHSIPDReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getGHSIPDReport(filters));
      set({ ipdReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getGHSIDSRReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getGHSIDSRReport(filters));
      set({ idsrReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getGHSMalariaReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getGHSMalariaReport(filters));
      set({ malariaReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getGHSFormAReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getGHSFormAReport(filters));
      set({ formAReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getMorbidityMortalityReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getMorbidityMortalityReport(filters));
      set({ morbidityMortalityReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getTopDiagnoses: async (filters, limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getTopDiagnoses(filters, limit));
      set({ topDiagnoses: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getFamilyPlanningReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getFamilyPlanningReport(filters));
      set({ familyPlanningReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getConsultingRoomRegister: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getConsultingRoomRegister(params));
      set({ consultingRoomRegister: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  // ── Financial / clinical ─────────────────────────────────────────────────

  getFinancialReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getFinancialReport(filters));
      set({ financialReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getInsuranceClaimsReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getInsuranceClaimsReport(filters));
      set({ insuranceClaimsReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getClinicalReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getClinicalReport(filters));
      set({ clinicalReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getAttendanceReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getEncounterReport(filters));
      set({ attendanceReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getRevenueReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getRevenueReport(filters));
      set({ revenueReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getDemographicReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getDemographicReport(filters));
      set({ demographicReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  // ── Clinical detail ───────────────────────────────────────────────────────

  getLabReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getLabReport(filters));
      set({ labReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getScanReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getScanReport(filters));
      set({ scanReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getProcedureReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getProcedureReport(filters));
      set({ procedureReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getMedicationReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getMedicationReport(filters));
      set({ medicationReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getVitalsReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getVitalsReport(filters));
      set({ vitalsReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  // ── NHIS ──────────────────────────────────────────────────────────────────

  getNhisExpiryReport: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getNhisExpiryReport(params));
      set({ nhisExpiryReport: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getNhisClaimsSummary: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const data = unwrap(await getNhisClaimsSummary(params));
      set({ nhisClaimsSummary: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  // ── Export / submissions ─────────────────────────────────────────────────

  // FIXED: was missing from the store — Reports.tsx calls exportReport from the store
  exportReport: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await exportReportApi(data);
      set({ isLoading: false });
      return result;
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  exportReportToCSV: async (reportType, filters) => {
    set({ isLoading: true, error: null });
    try {
      const blob = await exportReportToCSV(reportType, filters);
      set({ isLoading: false });
      return blob;
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getReportSubmissions: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getReportSubmissions(filters);
      const data = response?.data ?? response;
      set({ submissions: Array.isArray(data) ? data : data?.data ?? [], isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  getReportById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getReportSubmissionById(id);
      const data = response?.data ?? response;
      set({ currentSubmission: data, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },

  clearError: () => set({ error: null }),

  clearReports: () => set({
    opdReport: null, ipdReport: null, idsrReport: null, malariaReport: null,
    formAReport: null, morbidityMortalityReport: null, topDiagnoses: null,
    familyPlanningReport: null, consultingRoomRegister: null,
    financialReport: null, insuranceClaimsReport: null, clinicalReport: null,
    attendanceReport: null, revenueReport: null, demographicReport: null,
    labReport: null, scanReport: null, procedureReport: null,
    medicationReport: null, vitalsReport: null,
    nhisExpiryReport: null, nhisClaimsSummary: null,
    submissions: [], currentSubmission: null,
  }),
}));