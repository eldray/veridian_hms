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
  getGHSFormAReport as apiGetGHSFormAReport,    // ✅ NEW - Replaces ANC + Delivery
  getGHSMalariaReport as apiGetGHSMalariaReport,
  getGHSIDSRReport as apiGetGHSIDSRReport,
  getGHSFamilyPlanningReport as apiGetGHSFamilyPlanningReport,
  getMorbidityMortalityReport as apiGetMorbidityMortalityReport,
  getTopDiagnoses as apiGetTopDiagnoses,
  getDemographicReport as apiGetDemographicReport,

  getLabReport as apiGetLabReport,
  getScanReport as apiGetScanReport,
  getProcedureReport as apiGetProcedureReport,
  getMedicationReport as apiGetMedicationReport,
  getVitalsReport as apiGetVitalsReport,
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
  FormAReport,           // ✅ NEW type
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
  ancReport: ANCReport | null;           // ⚠️ DEPRECATED - kept for backward compatibility
  deliveryReport: DeliveryReport | null; // ⚠️ DEPRECATED - kept for backward compatibility
  formAReport: FormAReport | null;       // ✅ NEW - Replaces ANC + Delivery
  malariaReport: MalariaReport | null;
  idsrReport: IDSRReport | null;
  familyPlanningReport: FamilyPlanningReport | null;
  morbidityMortalityReport: MorbidityMortalityReport | null;
  topDiagnoses: any[] | null;            // ✅ NEW - Top 10 diagnoses
  demographicReport: DemographicReport | null;
  
  // Core Reports
  financialReport: FinancialReport | null;
  insuranceClaimsReport: InsuranceClaimsReport | null;
  clinicalReport: ClinicalReport | null;
  attendanceReport: AttendanceReport | null;
  revenueReport: RevenueReport | null;

  // Clinical Reports
  labReport: any | null;
  scanReport: any | null;
  procedureReport: any | null;
  medicationReport: any | null;
  vitalsReport: any | null;
  
  isLoading: boolean;
  error: string | null;
  
  // GHS Report Actions
  getOPDReport: (filters: ReportFilter) => Promise<void>;
  getIPDReport: (filters: ReportFilter) => Promise<void>;
  getFormAReport: (filters: ReportFilter) => Promise<void>;       // ✅ NEW
  getMalariaReport: (filters: ReportFilter) => Promise<void>;
  getIDSRReport: (filters: ReportFilter) => Promise<void>;
  getFamilyPlanningReport: (filters: ReportFilter) => Promise<void>;
  getMorbidityMortalityReport: (filters: ReportFilter) => Promise<void>;
  getTopDiagnoses: (filters: ReportFilter, limit?: number) => Promise<void>;  // ✅ NEW
  getDemographicReport: (filters: ReportFilter) => Promise<void>;
  
  // Core Report Actions
  getFinancialReport: (filters: ReportFilter) => Promise<void>;
  getInsuranceClaimsReport: (filters: ReportFilter) => Promise<void>;
  getClinicalReport: (filters: ReportFilter) => Promise<void>;
  getAttendanceReport: (filters: ReportFilter) => Promise<void>;
  getRevenueReport: (filters: ReportFilter) => Promise<void>;
  
  // Clinical Report Actions
  getLabReport: (filters: ReportFilter) => Promise<void>;
  getScanReport: (filters: ReportFilter) => Promise<void>;
  getProcedureReport: (filters: ReportFilter) => Promise<void>;
  getMedicationReport: (filters: ReportFilter) => Promise<void>;
  getVitalsReport: (filters: ReportFilter) => Promise<void>;

  exportReport: (data: any) => Promise<any>;
  clearReports: () => void;
  clearError: () => void;
}

export const useReportsStore = create<ReportsState>((set, get) => ({
  // GHS Reports initial state
  opdReport: null,
  ipdReport: null,
  formAReport: null,         // ✅ NEW
  malariaReport: null,
  idsrReport: null,
  familyPlanningReport: null,
  morbidityMortalityReport: null,
  topDiagnoses: null,        // ✅ NEW
  demographicReport: null,
  
  // Core Reports initial state
  financialReport: null,
  insuranceClaimsReport: null,
  clinicalReport: null,
  attendanceReport: null,
  revenueReport: null,
  
  labReport: null,
  scanReport: null,
  procedureReport: null,
  medicationReport: null,
  vitalsReport: null,

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

  // ✅ NEW - Form A Report (Combined ANC + Delivery + Postnatal)
  getFormAReport: async (filters: ReportFilter) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetGHSFormAReport(filters);
      // Handle both response formats
      const reportData = response.data || response;
      set({ formAReport: reportData, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch Form A report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch Form A report',
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
      const response = await apiGetMorbidityMortalityReport(filters);
      // Handle both response formats
      const reportData = response.data || response;
      set({ 
        morbidityMortalityReport: reportData,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch Morbidity/Mortality report:', error);
      set({ 
        error: error.response?.data?.message || 'Failed to fetch Morbidity/Mortality report',
        isLoading: false 
      });
      throw error;
    }
  },

// In reportsStore.ts - Fix getTopDiagnoses

getTopDiagnoses: async (filters: ReportFilter, limit: number = 10) => {
  set({ isLoading: true, error: null });
  try {
    const diagnoses = await apiGetTopDiagnoses(filters, limit);
    console.log('📊 Top diagnoses received:', diagnoses); // Debug log
    
    // Handle different response formats
    let diagnosesArray = [];
    if (Array.isArray(diagnoses)) {
      diagnosesArray = diagnoses;
    } else if (diagnoses?.data && Array.isArray(diagnoses.data)) {
      diagnosesArray = diagnoses.data;
    } else if (diagnoses?.success && Array.isArray(diagnoses.data)) {
      diagnosesArray = diagnoses.data;
    } else {
      diagnosesArray = [];
    }
    
    console.log('📊 Setting topDiagnoses:', diagnosesArray.length);
    set({ topDiagnoses: diagnosesArray, isLoading: false });
  } catch (error: any) {
    console.error('Failed to fetch Top Diagnoses:', error);
    set({ 
      error: error.response?.data?.message || 'Failed to fetch Top Diagnoses',
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

    // Clinical Report Actions
    getLabReport: async (filters: ReportFilter) => {
      set({ isLoading: true, error: null });
      try {
        const report = await apiGetLabReport(filters);
        set({ labReport: report, isLoading: false });
      } catch (error: any) {
        console.error('Failed to fetch Lab report:', error);
        set({ error: error.response?.data?.message || 'Failed to fetch Lab report', isLoading: false });
        throw error;
      }
    },
    
    getScanReport: async (filters: ReportFilter) => {
      set({ isLoading: true, error: null });
      try {
        const report = await apiGetScanReport(filters);
        set({ scanReport: report, isLoading: false });
      } catch (error: any) {
        console.error('Failed to fetch Scan report:', error);
        set({ error: error.response?.data?.message || 'Failed to fetch Scan report', isLoading: false });
        throw error;
      }
    },
    
    getProcedureReport: async (filters: ReportFilter) => {
      set({ isLoading: true, error: null });
      try {
        const report = await apiGetProcedureReport(filters);
        set({ procedureReport: report, isLoading: false });
      } catch (error: any) {
        console.error('Failed to fetch Procedure report:', error);
        set({ error: error.response?.data?.message || 'Failed to fetch Procedure report', isLoading: false });
        throw error;
      }
    },
    
    getMedicationReport: async (filters: ReportFilter) => {
      set({ isLoading: true, error: null });
      try {
        const report = await apiGetMedicationReport(filters);
        set({ medicationReport: report, isLoading: false });
      } catch (error: any) {
        console.error('Failed to fetch Medication report:', error);
        set({ error: error.response?.data?.message || 'Failed to fetch Medication report', isLoading: false });
        throw error;
      }
    },
    
    getVitalsReport: async (filters: ReportFilter) => {
      set({ isLoading: true, error: null });
      try {
        const report = await apiGetVitalsReport(filters);
        set({ vitalsReport: report, isLoading: false });
      } catch (error: any) {
        console.error('Failed to fetch Vitals report:', error);
        set({ error: error.response?.data?.message || 'Failed to fetch Vitals report', isLoading: false });
        throw error;
      }
    },

  clearReports: () => {
    set({
      opdReport: null,
      ipdReport: null,
      ancReport: null,
      deliveryReport: null,
      formAReport: null,      // ✅ NEW
      malariaReport: null,
      idsrReport: null,
      familyPlanningReport: null,
      morbidityMortalityReport: null,
      topDiagnoses: null,     // ✅ NEW
      demographicReport: null,
      financialReport: null,
      insuranceClaimsReport: null,
      clinicalReport: null,
      attendanceReport: null,
      revenueReport: null,
      labReport: null,
      scanReport: null,
      procedureReport: null,
      medicationReport: null,
      vitalsReport: null,
      error: null
    });
  },

  clearError: () => set({ error: null }),
}));