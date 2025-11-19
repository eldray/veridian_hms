// src/store/reportsStore.ts - UPDATED WITH ALL API FUNCTIONS
import { create } from 'zustand';
import { 
  getFinancialReport as apiGetFinancialReport,
  getInsuranceClaimsReport as apiGetInsuranceClaimsReport,
  getClinicalReport as apiGetClinicalReport,
  getAttendanceReport as apiGetAttendanceReport,
  getRevenueReport as apiGetRevenueReport,
  exportReport as apiExportReport,
  // ✅ ADDED MISSING GHS REPORTS
  getGHSOPDReport as apiGetGHSOPDReport,
  getGHSIPDReport as apiGetGHSIPDReport,
  getGHSANCReport as apiGetGHSANCReport,
  getGHSCWCReport as apiGetGHSCWCReport,
  getGHSFamilyPlanningReport as apiGetGHSFamilyPlanningReport,
  // ✅ ADDED MISSING CLINICAL REPORTS
  getMorbidityMortalityReport as apiGetMorbidityMortalityReport,
  getDemographicReport as apiGetDemographicReport
} from '../api';
import type { 
  FinancialReport, 
  InsuranceClaimsReport, 
  ClinicalReport, 
  AttendanceReport, 
  RevenueReport,
  ReportFilter 
} from '../types';

// ✅ ADDED GHS REPORT INTERFACES
interface GHSOPDReport {
  totalVisits: number;
  newCases: number;
  followUpCases: number;
  maleCount: number;
  femaleCount: number;
  ageGroups: any;
  diagnoses: any[];
}

interface GHSIPDReport {
  totalAdmissions: number;
  discharges: number;
  deaths: number;
  averageLengthOfStay: number;
  bedOccupancyRate: number;
  wardStatistics: any[];
}

interface GHSANCReport {
  totalANCVisits: number;
  firstVisits: number;
  followUpVisits: number;
  highRiskPregnancies: number;
  deliveries: number;
  maternalDeaths: number;
}

interface GHSCWCReport {
  totalCWCVisits: number;
  immunizations: any[];
  growthMonitoring: any[];
  nutritionalStatus: any[];
}

interface GHSFamilyPlanningReport {
  totalClients: number;
  newAcceptors: number;
  continuingUsers: number;
  methodMix: any[];
  ageDistribution: any[];
}

interface ReportsState {
  // Core Reports
  financialReport: FinancialReport | null;
  insuranceClaimsReport: InsuranceClaimsReport | null;
  clinicalReport: ClinicalReport | null;
  attendanceReport: AttendanceReport | null;
  revenueReport: RevenueReport | null;
  
  // ✅ ADDED GHS REPORTS
  ghsOPDReport: GHSOPDReport | null;
  ghsIPDReport: GHSIPDReport | null;
  ghsANCReport: GHSANCReport | null;
  ghsCWCReport: GHSCWCReport | null;
  ghsFamilyPlanningReport: GHSFamilyPlanningReport | null;
  
  // ✅ ADDED CLINICAL REPORTS
  morbidityMortalityReport: any | null;
  demographicReport: any | null;
  
  isLoading: boolean;
  error: string | null; // ✅ ADDED ERROR HANDLING
  
  // Core Report Actions
  getFinancialReport: (filters: ReportFilter) => Promise<void>;
  getInsuranceClaimsReport: (filters: ReportFilter) => Promise<void>;
  getClinicalReport: (filters: ReportFilter) => Promise<void>;
  getAttendanceReport: (filters: ReportFilter) => Promise<void>;
  getRevenueReport: (filters: ReportFilter) => Promise<void>;
  exportReport: (data: any) => Promise<any>;
  
  // ✅ ADDED MISSING REPORT ACTIONS
  // GHS Standard Reports
  getGHSOPDReport: (filters: ReportFilter) => Promise<void>;
  getGHSIPDReport: (filters: ReportFilter) => Promise<void>;
  getGHSANCReport: (filters: ReportFilter) => Promise<void>;
  getGHSCWCReport: (filters: ReportFilter) => Promise<void>;
  getGHSFamilyPlanningReport: (filters: ReportFilter) => Promise<void>;
  
  // Clinical Reports
  getMorbidityMortalityReport: (filters: ReportFilter) => Promise<void>;
  getDemographicReport: (filters: ReportFilter) => Promise<void>;
  
  clearReports: () => void;
  clearError: () => void; // ✅ ADDED
}

export const useReportsStore = create<ReportsState>((set, get) => ({
  // Core Reports
  financialReport: null,
  insuranceClaimsReport: null,
  clinicalReport: null,
  attendanceReport: null,
  revenueReport: null,
  
  // ✅ ADDED GHS REPORTS
  ghsOPDReport: null,
  ghsIPDReport: null,
  ghsANCReport: null,
  ghsCWCReport: null,
  ghsFamilyPlanningReport: null,
  
  // ✅ ADDED CLINICAL REPORTS
  morbidityMortalityReport: null,
  demographicReport: null,
  
  isLoading: false,
  error: null, // ✅ ADDED

  getFinancialReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetFinancialReport(filters);
      set({ financialReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch financial report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch financial report',
        isLoading: false 
      });
      throw error;
    }
  },

  getInsuranceClaimsReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetInsuranceClaimsReport(filters);
      set({ insuranceClaimsReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch insurance claims report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch insurance claims report',
        isLoading: false 
      });
      throw error;
    }
  },

  getClinicalReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetClinicalReport(filters);
      set({ clinicalReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch clinical report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch clinical report',
        isLoading: false 
      });
      throw error;
    }
  },

  getAttendanceReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetAttendanceReport(filters);
      set({ attendanceReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch attendance report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch attendance report',
        isLoading: false 
      });
      throw error;
    }
  },

  getRevenueReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetRevenueReport(filters);
      set({ revenueReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch revenue report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch revenue report',
        isLoading: false 
      });
      throw error;
    }
  },

  exportReport: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiExportReport(data);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      console.error('Failed to export report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to export report',
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ ADDED MISSING REPORT ACTIONS
  // GHS Standard Reports
  getGHSOPDReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetGHSOPDReport(filters);
      set({ ghsOPDReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch GHS OPD report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch GHS OPD report',
        isLoading: false 
      });
      throw error;
    }
  },

  getGHSIPDReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetGHSIPDReport(filters);
      set({ ghsIPDReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch GHS IPD report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch GHS IPD report',
        isLoading: false 
      });
      throw error;
    }
  },

  getGHSANCReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetGHSANCReport(filters);
      set({ ghsANCReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch GHS ANC report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch GHS ANC report',
        isLoading: false 
      });
      throw error;
    }
  },

  getGHSCWCReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetGHSCWCReport(filters);
      set({ ghsCWCReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch GHS CWC report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch GHS CWC report',
        isLoading: false 
      });
      throw error;
    }
  },

  getGHSFamilyPlanningReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetGHSFamilyPlanningReport(filters);
      set({ ghsFamilyPlanningReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch GHS Family Planning report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch GHS Family Planning report',
        isLoading: false 
      });
      throw error;
    }
  },

  // Clinical Reports
  getMorbidityMortalityReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetMorbidityMortalityReport(filters);
      set({ morbidityMortalityReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch morbidity mortality report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch morbidity mortality report',
        isLoading: false 
      });
      throw error;
    }
  },

  getDemographicReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetDemographicReport(filters);
      set({ demographicReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch demographic report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch demographic report',
        isLoading: false 
      });
      throw error;
    }
  },

  clearReports: () => {
    set({
      financialReport: null,
      insuranceClaimsReport: null,
      clinicalReport: null,
      attendanceReport: null,
      revenueReport: null,
      ghsOPDReport: null,
      ghsIPDReport: null,
      ghsANCReport: null,
      ghsCWCReport: null,
      ghsFamilyPlanningReport: null,
      morbidityMortalityReport: null,
      demographicReport: null,
      error: null
    });
  },

  clearError: () => set({ error: null }),
}));