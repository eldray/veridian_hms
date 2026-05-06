// src/api/reports.ts - COMPLETE VERSION
import api from './api';

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
// GHS REPORTS
// ============================================

export const getGHSOPDReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/ghs/opd', { params });
  return response.data;
};

export const getGHSIPDReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/ghs/ipd', { params });
  return response.data;
};

export const getGHSIDSRReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/ghs/idsr', { params });
  return response.data;
};

export const getGHSMalariaReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/ghs/malaria', { params });
  return response.data;
};

export const getGHSFormAReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/ghs/form-a', { params });
  return response.data;
};

export const getMorbidityMortalityReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/ghs/morbidity-mortality', { params });
  return response.data;
};

export const getTopDiagnoses = async (params: ReportFilter, limit: number = 10) => {
  const response = await api.get('/reports/ghs/top-diagnoses', { params: { ...params, limit } });
  return response.data;
};

// ============================================
// FINANCIAL & CLINICAL REPORTS
// ============================================

export const getFinancialReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/financial', { params });
  return response.data;
};

export const getInsuranceClaimsReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/insurance-claims', { params });
  return response.data;
};

export const getClinicalReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/clinical', { params });
  return response.data;
};

export const getAttendanceReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/attendance', { params });
  return response.data;
};

export const getRevenueReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/revenue', { params });
  return response.data;
};

// ============================================
// FAMILY PLANNING & DEMOGRAPHIC
// ============================================

export const getFamilyPlanningReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/family-planning', { params });
  return response.data;
};

export const getDemographicReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/demographic', { params });
  return response.data;
};

// ============================================
// CLINICAL REPORTS (Lab, Scans, Procedures, Medications, Vitals)
// ============================================

export const getLabReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/lab', { params });
  return response.data;
};

export const getScanReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/scans', { params });
  return response.data;
};

export const getProcedureReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/procedures', { params });
  return response.data;
};

export const getMedicationReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/medications', { params });
  return response.data;
};

export const getVitalsReport = async (params: ReportFilter) => {
  const response = await api.get('/reports/vitals', { params });
  return response.data;
};

// ============================================
// REPORT SUBMISSIONS
// ============================================

export const getReportSubmissions = async (filters?: { reportType?: string; year?: number; month?: number }) => {
  const response = await api.get('/reports/ghs/submissions', { params: filters });
  return response.data;
};

export const getReportById = async (id: string) => {
  const response = await api.get(`/reports/ghs/submissions/${id}`);
  return response.data;
};

export const exportReportToCSV = async (id: string) => {
  const response = await api.get(`/reports/ghs/submissions/${id}/export`, { responseType: 'blob' });
  return response.data;
};

export default {
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
};