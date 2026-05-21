// src/store/reportsStore.ts - COMPLETE VERSION

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
  getEncounterReport as getAttendanceReport,
  getRevenueReport,
  getFamilyPlanningReport,  // ✅ Fixed: No 'GHS' prefix
  getDemographicReport,
  getLabReport,
  getScanReport,
  getProcedureReport,
  getMedicationReport,
  getVitalsReport,
  getReportSubmissions,
  getReportSubmissionById as getReportById,
  exportReportToCSV,
} from '../api';

interface ReportFilter {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  facilityId?: string;
  [key: string]: any;
}

interface ReportsState {
  isLoading: boolean;
  error: string | null;
  ghsReports: {
    opd: any[];
    ipd: any[];
    idsr: any[];
    malaria: any[];
    formA: any[];
    morbidityMortality: any[];
  };
  clinicalReports: {
    diagnoses: any[];
    financial: any[];
    attendance: any[];
    revenue: any[];
    insuranceClaims: any[]; 
    familyPlanning: any[];
    demographic: any[];
    lab: any[];
    scan: any[];
    procedure: any[];
    medication: any[];
    vitals: any[];
  };
  submissions: any[];
  currentReport: any | null;
  
  // GHS Reports
  getGHSOPDReport: (filters: ReportFilter) => Promise<void>;
  getGHSIPDReport: (filters: ReportFilter) => Promise<void>;
  getGHSIDSRReport: (filters: ReportFilter) => Promise<void>;
  getGHSMalariaReport: (filters: ReportFilter) => Promise<void>;
  getGHSFormAReport: (filters: ReportFilter) => Promise<void>;
  getMorbidityMortalityReport: (filters: ReportFilter) => Promise<void>;
  getTopDiagnoses: (filters: ReportFilter, limit?: number) => Promise<void>;
  
  // Clinical Reports
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
  
  // Report Management
  getReportSubmissions: (filters?: any) => Promise<void>;
  getReportById: (id: string) => Promise<void>;
  exportReportToCSV: (reportType: string, filters: ReportFilter) => Promise<Blob>;
  clearError: () => void;
  clearReports: () => void;
}

export const useReportsStore = create<ReportsState>((set, get) => ({
  isLoading: false,
  error: null,
  ghsReports: {
    opd: [],
    ipd: [],
    idsr: [],
    malaria: [],
    formA: [],
    morbidityMortality: [],
  },
  clinicalReports: {
    diagnoses: [],
    financial: [],
    attendance: [],
    revenue: [],
    familyPlanning: [],
    demographic: [],
    lab: [],
    scan: [],
    procedure: [],
    medication: [],
    vitals: [],
  },
  submissions: [],
  currentReport: null,

  getGHSOPDReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getGHSOPDReport(filters);
      const data = response.data || response;
      set((state) => ({
        ghsReports: { ...state.ghsReports, opd: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getGHSIPDReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getGHSIPDReport(filters);
      const data = response.data || response;
      set((state) => ({
        ghsReports: { ...state.ghsReports, ipd: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getGHSIDSRReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getGHSIDSRReport(filters);
      const data = response.data || response;
      set((state) => ({
        ghsReports: { ...state.ghsReports, idsr: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getGHSMalariaReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getGHSMalariaReport(filters);
      const data = response.data || response;
      set((state) => ({
        ghsReports: { ...state.ghsReports, malaria: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getGHSFormAReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getGHSFormAReport(filters);
      const data = response.data || response;
      set((state) => ({
        ghsReports: { ...state.ghsReports, formA: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getMorbidityMortalityReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getMorbidityMortalityReport(filters);
      const data = response.data || response;
      set((state) => ({
        ghsReports: { ...state.ghsReports, morbidityMortality: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getTopDiagnoses: async (filters, limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getTopDiagnoses(filters, limit);
      const data = response.data || response;
      set((state) => ({
        clinicalReports: { ...state.clinicalReports, diagnoses: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getFinancialReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getFinancialReport(filters);
      const data = response.data || response;
      set((state) => ({
        clinicalReports: { ...state.clinicalReports, financial: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getInsuranceClaimsReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getInsuranceClaimsReport(filters);
      const data = response.data || response;
      set((state) => ({
        clinicalReports: { ...state.clinicalReports, financial: data }, // or create a dedicated field
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getClinicalReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getClinicalReport(filters);
      const data = response.data || response;
      set((state) => ({
        clinicalReports: { ...state.clinicalReports, diagnoses: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getAttendanceReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getAttendanceReport(filters);
      const data = response.data || response;
      set((state) => ({
        clinicalReports: { ...state.clinicalReports, attendance: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getRevenueReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getRevenueReport(filters);
      const data = response.data || response;
      set((state) => ({
        clinicalReports: { ...state.clinicalReports, revenue: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getFamilyPlanningReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getFamilyPlanningReport(filters);
      const data = response.data || response;
      set((state) => ({
        clinicalReports: { ...state.clinicalReports, familyPlanning: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getDemographicReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getDemographicReport(filters);
      const data = response.data || response;
      set((state) => ({
        clinicalReports: { ...state.clinicalReports, demographic: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getLabReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getLabReport(filters);
      const data = response.data || response;
      set((state) => ({
        clinicalReports: { ...state.clinicalReports, lab: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getScanReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getScanReport(filters);
      const data = response.data || response;
      set((state) => ({
        clinicalReports: { ...state.clinicalReports, scan: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getProcedureReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getProcedureReport(filters);
      const data = response.data || response;
      set((state) => ({
        clinicalReports: { ...state.clinicalReports, procedure: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getMedicationReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getMedicationReport(filters);
      const data = response.data || response;
      set((state) => ({
        clinicalReports: { ...state.clinicalReports, medication: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getVitalsReport: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getVitalsReport(filters);
      const data = response.data || response;
      set((state) => ({
        clinicalReports: { ...state.clinicalReports, vitals: data },
        isLoading: false,
      }));
    } catch (error: unknown) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

getReportSubmissions: async (filters) => {
  set({ isLoading: true, error: null });
  try {
    const response = await getReportSubmissions(filters);
    const submissions = response.data || response;
    set({ submissions: Array.isArray(submissions) ? submissions : submissions.data || [], isLoading: false });
  } catch (error: any) {
    set({ error: error.message, isLoading: false });
    throw error;
  }
},

getReportById: async (id) => {
  set({ isLoading: true, error: null });
  try {
    const response = await getReportSubmissionById(id);
    const submission = response.data || response;
    set({ currentSubmission: submission, isLoading: false });
  } catch (error: any) {
    set({ error: error.message, isLoading: false });
    throw error;
  }
},

exportReportToCSV: async (reportType, filters) => {
  set({ isLoading: true, error: null });
  try {
    const blob = await exportReportToCSV(reportType, filters);
    set({ isLoading: false });
    return blob;
  } catch (error: any) {
    set({ error: error.message, isLoading: false });
    throw error;
  }
},

  clearError: () => set({ error: null }),
  clearReports: () => set({
    ghsReports: {
      opd: [],
      ipd: [],
      idsr: [],
      malaria: [],
      formA: [],
      morbidityMortality: [],
    },
    clinicalReports: {
      diagnoses: [],
      financial: [],
      attendance: [],
      insuranceClaims: [], 
      revenue: [],
      familyPlanning: [],
      demographic: [],
      lab: [],
      scan: [],
      procedure: [],
      medication: [],
      vitals: [],
    },
    submissions: [],
    currentReport: null,
  }),
}));
