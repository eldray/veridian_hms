// src/store/reportsStore.ts
import { create } from 'zustand';
import api from '../api/api';

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
// REPORT API FUNCTIONS (MOVED FROM ANTENATAL)
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
  reportSubmissions: null,
  currentSubmission: null,
  isLoading: false,
  isExporting: false,
  error: null,

  // ============================================
  // ACTIONS
  // ============================================

  getOPDReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getGHSOPDReport(filters);
      const reportData = response.data || response;
      set({ opdReport: reportData, isLoading: false });
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('Failed to fetch Top Diagnoses:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch top diagnoses', isLoading: false });
      throw error;
    }
  },

  getReportSubmissions: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getReportSubmissions(filters);
      const submissions = response.data || response;
      set({ reportSubmissions: Array.isArray(submissions) ? submissions : [], isLoading: false });
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('Failed to fetch report:', error);
      set({ error: error.response?.data?.message || 'Failed to fetch report', isLoading: false });
      throw error;
    }
  },

  exportReport: async (id) => {
    set({ isExporting: true, error: null });
    try {
      const blob = await exportReportToCSV(id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${id}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      set({ isExporting: false });
    } catch (error: any) {
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
      reportSubmissions: null,
      currentSubmission: null,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));