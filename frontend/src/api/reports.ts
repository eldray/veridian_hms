// src/api/reports.ts
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
  getReportSubmissions,
  getReportById,
  exportReportToCSV,
};