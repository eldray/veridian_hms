// src/store/reportsStore.ts
import { create } from 'zustand';
import { 
  getFinancialReport as apiGetFinancialReport,
  getInsuranceClaimsReport as apiGetInsuranceClaimsReport,
  getClinicalReport as apiGetClinicalReport,
  getAttendanceReport as apiGetAttendanceReport,
  getRevenueReport as apiGetRevenueReport,
  exportReport as apiExportReport
} from '../api';
import type { 
  FinancialReport, 
  InsuranceClaimsReport, 
  ClinicalReport, 
  AttendanceReport, 
  RevenueReport,
  ReportFilter 
} from '../types';

interface ReportsState {
  financialReport: FinancialReport | null;
  insuranceClaimsReport: InsuranceClaimsReport | null;
  clinicalReport: ClinicalReport | null;
  attendanceReport: AttendanceReport | null;
  revenueReport: RevenueReport | null;
  isLoading: boolean;
  
  getFinancialReport: (filters: ReportFilter) => Promise<void>;
  getInsuranceClaimsReport: (filters: ReportFilter) => Promise<void>;
  getClinicalReport: (filters: ReportFilter) => Promise<void>;
  getAttendanceReport: (filters: ReportFilter) => Promise<void>;
  getRevenueReport: (filters: ReportFilter) => Promise<void>;
  exportReport: (data: any) => Promise<any>;
  
  clearReports: () => void;
}

export const useReportsStore = create<ReportsState>((set, get) => ({
  financialReport: null,
  insuranceClaimsReport: null,
  clinicalReport: null,
  attendanceReport: null,
  revenueReport: null,
  isLoading: false,

  getFinancialReport: async (filters: ReportFilter) => {
    set({ isLoading: true });
    try {
      const report = await apiGetFinancialReport(filters);
      set({ financialReport: report, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch financial report:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getInsuranceClaimsReport: async (filters: ReportFilter) => {
    set({ isLoading: true });
    try {
      const report = await apiGetInsuranceClaimsReport(filters);
      set({ insuranceClaimsReport: report, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch insurance claims report:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getClinicalReport: async (filters: ReportFilter) => {
    set({ isLoading: true });
    try {
      const report = await apiGetClinicalReport(filters);
      set({ clinicalReport: report, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch clinical report:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getAttendanceReport: async (filters: ReportFilter) => {
    set({ isLoading: true });
    try {
      const report = await apiGetAttendanceReport(filters);
      set({ attendanceReport: report, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch attendance report:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  getRevenueReport: async (filters: ReportFilter) => {
    set({ isLoading: true });
    try {
      const report = await apiGetRevenueReport(filters);
      set({ revenueReport: report, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch revenue report:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  exportReport: async (data: any) => {
    set({ isLoading: true });
    try {
      const result = await apiExportReport(data);
      set({ isLoading: false });
      return result;
    } catch (error) {
      console.error('Failed to export report:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  clearReports: () => {
    set({
      financialReport: null,
      insuranceClaimsReport: null,
      clinicalReport: null,
      attendanceReport: null,
      revenueReport: null
    });
  },
}));
