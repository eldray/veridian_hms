// src/store/reportsStore.ts - COMPLETE VERSION
import { create } from 'zustand';
import api from '../api/api';
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
  getAttendanceReport,
  getRevenueReport,
  getFamilyPlanningReport,
  getDemographicReport,
  getLabReport,
  getScanReport,
  getProcedureReport,
  getMedicationReport,
  getVitalsReport,
  getReportSubmissions,
  getReportById,
  exportReportToCSV,
} from '../api/reports';

// ... rest of your store code (same as before, but using these imported functions)
// ============================================
// TYPES
// ============================================

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
}

// ============================================
// REPORT API FUNCTIONS
// ============================================

// GHS Reports
const getGHSOPDReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/ghs/opd', { params });
  return response.data;
};

const getGHSIPDReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/ghs/ipd', { params });
  return response.data;
};

const getGHSIDSRReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/ghs/idsr', { params });
  return response.data;
};

const getGHSMalariaReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/ghs/malaria', { params });
  return response.data;
};

const getGHSFormAReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/ghs/form-a', { params });
  return response.data;
};

const getMorbidityMortalityReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/ghs/morbidity-mortality', { params });
  return response.data;
};

const getTopDiagnoses = async (params: ReportFilter, limit: number = 10) => {
  const response = await api.get('/reports/ghs/top-diagnoses', { params: { ...params, limit } });
  return response.data;
};

// Report Submissions
const getReportSubmissions = async (filters?: { reportType?: string; year?: number; month?: number }) => {
  const response = await api.get('/reports/ghs/submissions', { params: filters });
  return response.data;
};

const getReportById = async (id: string) => {
  const response = await api.get(`/reports/ghs/submissions/${id}`);
  return response.data;
};

const exportReportToCSV = async (id: string) => {
  const response = await api.get(`/reports/ghs/submissions/${id}/export`, { responseType: 'blob' });
  return response.data;
};

// ============================================
// FINANCIAL & CLINICAL REPORTS (from reportRoutes)
// ============================================

const getFinancialReportAPI = async (params: ReportFilter) => {
  const response = await api.get('/reports/financial', { params });
  return response.data;
};

const getInsuranceClaimsReportAPI = async (params: ReportFilter) => {
  const response = await api.get('/reports/insurance-claims', { params });
  return response.data;
};

const getClinicalReportAPI = async (params: ReportFilter) => {
  const response = await api.get('/reports/clinical', { params });
  return response.data;
};

const getAttendanceReportAPI = async (params: ReportFilter) => {
  const response = await api.get('/reports/attendance', { params });
  return response.data;
};

const getRevenueReportAPI = async (params: ReportFilter) => {
  const response = await api.get('/reports/revenue', { params });
  return response.data;
};

const getFamilyPlanningReportAPI = async (params: ReportFilter) => {
  const response = await api.get('/reports/family-planning', { params });
  return response.data;
};

const getDemographicReportAPI = async (params: ReportFilter) => {
  const response = await api.get('/reports/demographic', { params });
  return response.data;
};

// ============================================
// CLINICAL REPORTS (Lab, Scans, Procedures, Medications, Vitals)
// ============================================

const getLabReportAPI = async (params: ReportFilter) => {
  const response = await api.get('/reports/lab', { params });
  return response.data;
};

const getScanReportAPI = async (params: ReportFilter) => {
  const response = await api.get('/reports/scans', { params });
  return response.data;
};

const getProcedureReportAPI = async (params: ReportFilter) => {
  const response = await api.get('/reports/procedures', { params });
  return response.data;
};

const getMedicationReportAPI = async (params: ReportFilter) => {
  const response = await api.get('/reports/medications', { params });
  return response.data;
};

const getVitalsReportAPI = async (params: ReportFilter) => {
  const response = await api.get('/reports/vitals', { params });
  return response.data;
};

// ============================================
// STORE STATE
// ============================================

interface ReportsState {
  // GHS Reports
  opdReport: any | null;
  ipdReport: any | null;
  idsrReport: any | null;
  malariaReport: any | null;
  formAReport: any | null;
  morbidityMortalityReport: any | null;
  topDiagnoses: any[] | null;
  
  // Financial & Clinical Reports
  financialReport: any | null;
  insuranceClaimsReport: any | null;
  clinicalReport: any | null;
  attendanceReport: any | null;
  revenueReport: any | null;
  familyPlanningReport: any | null;
  demographicReport: any | null;
  
  // Laboratory & Clinical Reports
  labReport: any | null;
  scanReport: any | null;
  procedureReport: any | null;
  medicationReport: any | null;
  vitalsReport: any | null;
  
  // Report Submissions
  reportSubmissions: any[] | null;
  currentSubmission: any | null;
  
  // UI State
  isLoading: boolean;
  isExporting: boolean;
  error: string | null;
  
  // Actions
  getOPDReport: (filters: ReportFilter) => Promise<void>;
  getIPDReport: (filters: ReportFilter) => Promise<void>;
  getIDSRReport: (filters: ReportFilter) => Promise<void>;
  getMalariaReport: (filters: ReportFilter) => Promise<void>;
  getFormAReport: (filters: ReportFilter) => Promise<void>;
  getMorbidityMortalityReport: (filters: ReportFilter) => Promise<void>;
  getTopDiagnoses: (filters: ReportFilter, limit?: number) => Promise<void>;
  getFinancialReport: (filters: ReportFilter) => Promise<void>;
  getInsuranceClaimsReport: (filters: ReportFilter) => Promise<void>;
  getClinicalReport: (filters: ReportFilter) => Promise<void>;
  getAttendanceReport: (filters: ReportFilter) => Promise<void>;
  getRevenueReport: (filters: ReportFilter) => Promise<void>;
  getFamilyPlanningReport: (filters: ReportFilter) => Promise<void>;
  getDemographicReport: (filters: ReportFilter) => Promise<void>;
  getLabReport: (filters: ReportFilter) => Promise<void>;
  getScanReport: (filters: ReportFilter) => Promise<void>;
  getProcedureReport: (filters: ReportFilter) => Promise<void>;
  getMedicationReport: (filters: ReportFilter) => Promise<void>;
  getVitalsReport: (filters: ReportFilter) => Promise<void>;
  getReportSubmissions: (filters?: any) => Promise<void>;
  getReportById: (id: string) => Promise<any>;
  exportReport: (id: string) => Promise<void>;
  clearReports: () => void;
  clearError: () => void;
}

export const useReportsStore = create<ReportsState>((set, get) => ({
  // Initial State
  opdReport: null,
  ipdReport: null,
  idsrReport: null,
  malariaReport: null,
  formAReport: null,
  morbidityMortalityReport: null,
  topDiagnoses: null,
  financialReport: null,
  insuranceClaimsReport: null,
  clinicalReport: null,
  attendanceReport: null,
  revenueReport: null,
  familyPlanningReport: null,
  demographicReport: null,
  labReport: null,
  scanReport: null,
  procedureReport: null,
  medicationReport: null,
  vitalsReport: null,
  reportSubmissions: null,
  currentSubmission: null,
  isLoading: false,
  isExporting: false,
  error: null,

  // ============================================
  // GHS REPORT ACTIONS
  // ============================================

  getOPDReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getGHSOPDReport(filters);
      const reportData = response.data || response;
      set({ opdReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch OPD report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch OPD report', isLoading: false });
      throw error;
    }
  },

  getIPDReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getGHSIPDReport(filters);
      const reportData = response.data || response;
      set({ ipdReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch IPD report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch IPD report', isLoading: false });
      throw error;
    }
  },

  getIDSRReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getGHSIDSRReport(filters);
      const reportData = response.data || response;
      set({ idsrReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch IDSR report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch IDSR report', isLoading: false });
      throw error;
    }
  },

  getMalariaReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getGHSMalariaReport(filters);
      const reportData = response.data || response;
      set({ malariaReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Malaria report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Malaria report', isLoading: false });
      throw error;
    }
  },

  getFormAReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getGHSFormAReport(filters);
      const reportData = response.data || response;
      set({ formAReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Form A report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Form A report', isLoading: false });
      throw error;
    }
  },

  getMorbidityMortalityReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getMorbidityMortalityReport(filters);
      const reportData = response.data || response;
      set({ morbidityMortalityReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Morbidity/Mortality report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Morbidity/Mortality report', isLoading: false });
      throw error;
    }
  },

  getTopDiagnoses: async (filters, limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getTopDiagnoses(filters, limit);
      let diagnosesArray = [];
      
      if (Array.isArray(response)) {
        diagnosesArray = response;
      } else if (response.data && Array.isArray(response.data)) {
        diagnosesArray = response.data;
      } else if (response.success && Array.isArray(response.data)) {
        diagnosesArray = response.data;
      }
      
      set({ topDiagnoses: diagnosesArray, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Top Diagnoses:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch top diagnoses', isLoading: false });
      throw error;
    }
  },

  // ============================================
  // FINANCIAL REPORT ACTIONS
  // ============================================

  getFinancialReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getFinancialReportAPI(filters);
      const reportData = response.data || response;
      set({ financialReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Financial report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Financial report', isLoading: false });
      throw error;
    }
  },

  getInsuranceClaimsReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getInsuranceClaimsReportAPI(filters);
      const reportData = response.data || response;
      set({ insuranceClaimsReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Insurance Claims report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Insurance Claims report', isLoading: false });
      throw error;
    }
  },

  getClinicalReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getClinicalReportAPI(filters);
      const reportData = response.data || response;
      set({ clinicalReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Clinical report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Clinical report', isLoading: false });
      throw error;
    }
  },

  getAttendanceReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getAttendanceReportAPI(filters);
      const reportData = response.data || response;
      set({ attendanceReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Attendance report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Attendance report', isLoading: false });
      throw error;
    }
  },

  getRevenueReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getRevenueReportAPI(filters);
      const reportData = response.data || response;
      set({ revenueReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Revenue report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Revenue report', isLoading: false });
      throw error;
    }
  },

  // ============================================
  // FAMILY PLANNING & DEMOGRAPHIC REPORTS
  // ============================================

  getFamilyPlanningReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getFamilyPlanningReportAPI(filters);
      const reportData = response.data || response;
      set({ familyPlanningReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Family Planning report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Family Planning report', isLoading: false });
      throw error;
    }
  },

  getDemographicReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getDemographicReportAPI(filters);
      const reportData = response.data || response;
      set({ demographicReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Demographic report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Demographic report', isLoading: false });
      throw error;
    }
  },

  // ============================================
  // LABORATORY & CLINICAL REPORTS
  // ============================================

  getLabReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getLabReportAPI(filters);
      const reportData = response.data || response;
      set({ labReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Lab report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Lab report', isLoading: false });
      throw error;
    }
  },

  getScanReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getScanReportAPI(filters);
      const reportData = response.data || response;
      set({ scanReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Scan report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Scan report', isLoading: false });
      throw error;
    }
  },

  getProcedureReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getProcedureReportAPI(filters);
      const reportData = response.data || response;
      set({ procedureReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Procedure report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Procedure report', isLoading: false });
      throw error;
    }
  },

  getMedicationReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getMedicationReportAPI(filters);
      const reportData = response.data || response;
      set({ medicationReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Medication report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Medication report', isLoading: false });
      throw error;
    }
  },

  getVitalsReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getVitalsReportAPI(filters);
      const reportData = response.data || response;
      set({ vitalsReport: reportData, isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch Vitals report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch Vitals report', isLoading: false });
      throw error;
    }
  },

  // ============================================
  // REPORT SUBMISSIONS
  // ============================================

  getReportSubmissions: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getReportSubmissions(filters);
      const submissions = response.data || response;
      set({ reportSubmissions: Array.isArray(submissions) ? submissions : [], isLoading: false });
    } catch (error: unknown) {
      console.error('Failed to fetch report submissions:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch submissions', isLoading: false });
      throw error;
    }
  },

  getReportById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getReportById(id);
      const submission = response.data || response;
      set({ currentSubmission: submission, isLoading: false });
      return submission;
    } catch (error: unknown) {
      console.error('Failed to fetch report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch report', isLoading: false });
      throw error;
    }
  },

  exportReport: async (id) => {
    set({ isExporting: true, error: null });
    try {
      const blob = await exportReportToCSV(id);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${id}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      set({ isExporting: false });
    } catch (error: unknown) {
      console.error('Failed to export report:', error);
      set({ error: error.response?.data?.message || 'Failed to export report', isExporting: false });
      throw error;
    }
  },

  clearReports: () => {
    set({
      opdReport: null,
      ipdReport: null,
      idsrReport: null,
      malariaReport: null,
      formAReport: null,
      morbidityMortalityReport: null,
      topDiagnoses: null,
      financialReport: null,
      insuranceClaimsReport: null,
      clinicalReport: null,
      attendanceReport: null,
      revenueReport: null,
      familyPlanningReport: null,
      demographicReport: null,
      labReport: null,
      scanReport: null,
      procedureReport: null,
      medicationReport: null,
      vitalsReport: null,
      reportSubmissions: null,
      currentSubmission: null,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));