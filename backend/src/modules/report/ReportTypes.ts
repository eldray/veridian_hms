/**
 * Report Types
 * TypeScript types and interfaces for report operations
 */

// ─── Base Filters ─────────────────────────────────────────────────────────────

export interface ReportFilters {
  // Standardised date params (use these — dateFrom/dateTo are legacy)
  startDate?: string;
  endDate?: string;

  // Legacy aliases kept for backward compat with controller query params
  dateFrom?: string;
  dateTo?: string;

  period?: string;
  diagnosisCode?: string;
  attendanceType?: string;
  paymentMode?: string;
  serviceCategory?: string;
  insuranceProviderId?: string;
  status?: string;

  // Corporate — was missing, used throughout the service
  corporateAccountId?: string;

  // NHIS expiry — was missing, used in NHIS service methods
  daysThreshold?: number;
  expiryStatus?: string;
}

// ─── Shared building blocks ───────────────────────────────────────────────────

export interface FacilityInfo {
  name: string;
  nhisFacilityCode: string;
  facilityType: string;
  district: string;
  ghfCode: string;
}

export interface ReportPeriod {
  startDate: string | Date;
  endDate: string | Date;
  generated: string;
}

// ─── Demographic Report ───────────────────────────────────────────────────────

export interface DemographicReport {
  reportType: 'DEMOGRAPHIC ANALYSIS REPORT';
  facility: FacilityInfo;
  period: ReportPeriod;
  patientDemographics: {
    totalPatients: number;
    genderDistribution: {
      male: number;
      female: number;
      other: number;
    };
    ageDistribution: Record<string, number>;
    paymentModeDistribution: Record<string, number>;
  };
  attendancePatterns: {
    totalAttendances: number;
    visitsPerPatient: number;
    newPatients: number;
  };
  generatedAt: Date;
}

// ─── Financial Report ─────────────────────────────────────────────────────────

export interface FinancialReport {
  reportPeriod: {
    startDate: string | Date;
    endDate: string | Date;
  };
  summary: {
    totalRevenue: number;
    totalPaid: number;
    outstandingBalance: number;
    totalBills: number;
  };
  byPaymentMode: Record<string, { count: number; amount: number }>;
  breakdown: any[];
  reportGenerated: Date;
}

// ─── Insurance Claims Report ──────────────────────────────────────────────────

export interface InsuranceClaimsReport {
  reportType: 'Insurance Claims Analysis';
  period: {
    startDate?: string;
    endDate?: string;
  };
  // Aligned with service which returns 'summary', not 'totals'
  summary: {
    totalClaims: number;
    corporateClaims: number;
    regularClaims: number;
    totalClaimAmount: number;
    totalPaidAmount: number;
  };
  claimsReport: any[];
  corporateClaims: any[];
  generatedAt: Date;
}

// ─── Clinical Report ──────────────────────────────────────────────────────────

export interface ClinicalReport {
  reportType: 'Clinical Statistics';
  period: {
    startDate?: string;
    endDate?: string;
  };
  clinicalReport: Array<{
    diagnosis: string;
    icdCode: string;
    morbidityGroup: string;
    totalCases: number;
    averageAge: number;
    genderDistribution: { male: number; female: number };
    paymentModeBreakdown: Record<string, number>;
  }>;
  generatedAt: Date;
}

// ─── Attendance Report ────────────────────────────────────────────────────────

export interface AttendanceReport {
  reportType: 'ATTENDANCE REPORT';
  facility: FacilityInfo;
  period: ReportPeriod;
  summary: {
    totalAttendances: number;
    uniquePatients: number;
    averageVisitsPerPatient: number;
    corporateShare: number;
  };
  // Removed dailyDistribution and hourlyDistribution — not computed in service
  attendancePatterns: {
    byType: Record<string, number>;
    byPaymentMode: Record<string, number>;
  };
  generatedAt: Date;
}

// ─── Revenue Report ───────────────────────────────────────────────────────────

export interface RevenueReport {
  reportType: 'REVENUE ANALYSIS REPORT';
  facility: FacilityInfo;
  period: ReportPeriod;
  summary: {
    totalRevenue: number;
    totalBills: number;
    averageBillAmount: number;
    corporateRevenue: number;
    corporateShare: number;
  };
  revenueByPaymentMode: Array<{
    paymentMode: string;
    totalRevenue: number;
    billCount: number;
    averageBill: number;
  }>;
  generatedAt: Date;
}

// ─── NHIS Reports ─────────────────────────────────────────────────────────────

export type NHISExpiryStatus = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'UNKNOWN';

export interface NHISExpiryPatient {
  id: string;
  folderNumber: string;
  surname: string;
  otherNames: string | null;
  contact: string;
  phoneNumber: string | null;
  nhisNumber: string | null;
  nhisExpiryDate: Date | null;
  nhisActive: boolean;
  fullName: string;
  daysUntilExpiry: number | null;
  expiryStatus: NHISExpiryStatus;
}

export interface NHISExpiryReport {
  reportType: 'NHIS MEMBERSHIP EXPIRY REPORT';
  facility: FacilityInfo;
  period: ReportPeriod;
  summary: {
    totalNHISPatients: number;
    expired: number;
    critical: number;
    warning: number;
    healthy: number;
    noExpiryDate: number;
  };
  patients: NHISExpiryPatient[];
  generatedAt: Date;
}

export interface NHISClaimsWithExpiryReport {
  reportType: 'NHIS CLAIMS WITH EXPIRY STATUS';
  facility: FacilityInfo;
  period: { startDate?: string; endDate?: string; generated: string };
  summary: {
    totalClaims: number;
    totalClaimAmount: number;
    byExpiryStatus: Record<NHISExpiryStatus, number>;
  };
  claims: any[];
  generatedAt: Date;
}

// ─── Family Planning Report ───────────────────────────────────────────────────

export interface FamilyPlanningReport {
  reportType: 'FAMILY PLANNING REPORT';
  facility: FacilityInfo;
  period: ReportPeriod;
  summary: {
    totalFPClients: number;
    totalFPVisits: number;
    newAcceptors: number;
    coupleYearProtection: number;
  };
  demographicBreakdown: Record<string, number>;
  methodMix: Record<string, number>;
  generatedAt: Date;
}

// ─── Morbidity Report ─────────────────────────────────────────────────────────

export interface MorbidityMortalityReport {
  reportType: 'MORBIDITY & MORTALITY REPORT';
  facility: {
    name: string;
    district: string;
    ghfCode: string;
  };
  period: ReportPeriod;
  totals: {
    totalAttendances: number;
    totalCases: number;
    under5: number;
    above5: number;
  };
  topDiseases: any[];
  generatedAt: Date;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export type ReportType =
  | 'family-planning'
  | 'demographic'
  | 'financial'
  | 'insurance-claims'
  | 'clinical'
  | 'morbidity-mortality'
  | 'attendance'
  | 'revenue'
  | 'nhis-expiry'
  | 'nhis-claims';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportRequest {
  reportType: ReportType;
  format: ExportFormat;
  startDate?: string;
  endDate?: string;
}

export interface ExportResponse {
  success: boolean;
  message: string;
  data: {
    reportType: string;
    format: string;
    downloadUrl: string;
    fileSize: string;
    generatedAt: Date;
  };
}