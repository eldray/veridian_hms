// src/store/reportsStore.ts
import { create } from 'zustand';
import { 
  getFinancialReport as apiGetFinancialReport,
  getInsuranceClaimsReport as apiGetInsuranceClaimsReport,
  getClinicalReport as apiGetClinicalReport,
  getAttendanceReport as apiGetAttendanceReport,
  getRevenueReport as apiGetRevenueReport,
  exportReport as apiExportReport,
  // GHS Reports
  getGHSOPDReport as apiGetGHSOPDReport,
  getGHSIPDReport as apiGetGHSIPDReport,
  getGHSANCReport as apiGetGHSANCReport,
  getGHSDeliveryReport as apiGetGHSDeliveryReport,
  getGHSMalariaReport as apiGetGHSMalariaReport,
  getGHSIDSRReport as apiGetGHSIDSRReport,
  getGHSFamilyPlanningReport as apiGetGHSFamilyPlanningReport,
  getMorbidityMortalityReport as apiGetMorbidityMortalityReport,
  getDemographicReport as apiGetDemographicReport
} from '../api';
import type { 
  FinancialReport, 
  InsuranceClaimsReport, 
  ClinicalReport, 
  AttendanceReport, 
  RevenueReport,
  OPDRreport,
  IPDReport,
  ANCReport,
  DeliveryReport,
  MalariaReport,
  IDSRReport,
  FamilyPlanningReport,
  MorbidityMortalityReport,
  DemographicReport,
  ReportFilter 
} from '../types';

interface ReportsState {
  // GHS Reports
  opdReport: OPDRreport | null;
  ipdReport: IPDReport | null;
  ancReport: ANCReport | null;
  deliveryReport: DeliveryReport | null;
  malariaReport: MalariaReport | null;
  idsrReport: IDSRReport | null;
  familyPlanningReport: FamilyPlanningReport | null;
  morbidityMortalityReport: MorbidityMortalityReport | null;
  demographicReport: DemographicReport | null;
  
  // Core Reports
  financialReport: FinancialReport | null;
  insuranceClaimsReport: InsuranceClaimsReport | null;
  clinicalReport: ClinicalReport | null;
  attendanceReport: AttendanceReport | null;
  revenueReport: RevenueReport | null;
  
  isLoading: boolean;
  error: string | null;
  
  // GHS Report Actions
  getOPDReport: (filters: ReportFilter) => Promise<void>;
  getIPDReport: (filters: ReportFilter) => Promise<void>;
  getANCReport: (filters: ReportFilter) => Promise<void>;
  getDeliveryReport: (filters: ReportFilter) => Promise<void>;
  getMalariaReport: (filters: ReportFilter) => Promise<void>;
  getIDSRReport: (filters: ReportFilter) => Promise<void>;
  getFamilyPlanningReport: (filters: ReportFilter) => Promise<void>;
  getMorbidityMortalityReport: (filters: ReportFilter) => Promise<void>;
  getDemographicReport: (filters: ReportFilter) => Promise<void>;
  
  // Core Report Actions
  getFinancialReport: (filters: ReportFilter) => Promise<void>;
  getInsuranceClaimsReport: (filters: ReportFilter) => Promise<void>;
  getClinicalReport: (filters: ReportFilter) => Promise<void>;
  getAttendanceReport: (filters: ReportFilter) => Promise<void>;
  getRevenueReport: (filters: ReportFilter) => Promise<void>;
  
  exportReport: (data: any) => Promise<any>;
  clearReports: () => void;
  clearError: () => void;
}

export const useReportsStore = create<ReportsState>((set, get) => ({
  // GHS Reports initial state
  opdReport: null,
  ipdReport: null,
  ancReport: null,
  deliveryReport: null,
  malariaReport: null,
  idsrReport: null,
  familyPlanningReport: null,
  morbidityMortalityReport: null,
  demographicReport: null,
  
  // Core Reports initial state
  financialReport: null,
  insuranceClaimsReport: null,
  clinicalReport: null,
  attendanceReport: null,
  revenueReport: null,
  
  isLoading: false,
  error: null,

  // ============================================
  // GHS REPORT ACTIONS
  // ============================================
  
  getOPDReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetGHSOPDReport(filters);
      set({ opdReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch OPD report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch OPD report',
        isLoading: false 
      });
      throw error;
    }
  },

  getIPDReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetGHSIPDReport(filters);
      set({ ipdReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch IPD report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch IPD report',
        isLoading: false 
      });
      throw error;
    }
  },

  getANCReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetGHSANCReport(filters);
      set({ ancReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch ANC report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch ANC report',
        isLoading: false 
      });
      throw error;
    }
  },

  getDeliveryReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetGHSDeliveryReport(filters);
      set({ deliveryReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch Delivery report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch Delivery report',
        isLoading: false 
      });
      throw error;
    }
  },

  getMalariaReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetGHSMalariaReport(filters);
      set({ malariaReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch Malaria report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch Malaria report',
        isLoading: false 
      });
      throw error;
    }
  },

  getIDSRReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetGHSIDSRReport(filters);
      set({ idsrReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch IDSR report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch IDSR report',
        isLoading: false 
      });
      throw error;
    }
  },

  getFamilyPlanningReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetGHSFamilyPlanningReport(filters);
      set({ familyPlanningReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch Family Planning report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch Family Planning report',
        isLoading: false 
      });
      throw error;
    }
  },

  getMorbidityMortalityReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const report = await apiGetMorbidityMortalityReport(filters);
      set({ morbidityMortalityReport: report, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch Morbidity/Mortality report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch Morbidity/Mortality report',
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
      console.error('Failed to fetch Demographic report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch Demographic report',
        isLoading: false 
      });
      throw error;
    }
  },

  // ============================================
  // CORE REPORT ACTIONS
  // ============================================

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

  clearReports: () => {
    set({
      opdReport: null,
      ipdReport: null,
      ancReport: null,
      deliveryReport: null,
      malariaReport: null,
      idsrReport: null,
      familyPlanningReport: null,
      morbidityMortalityReport: null,
      demographicReport: null,
      financialReport: null,
      insuranceClaimsReport: null,
      clinicalReport: null,
      attendanceReport: null,
      revenueReport: null,
      error: null
    });
  },

  clearError: () => set({ error: null }),
}));