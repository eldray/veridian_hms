/**
 * Report Types
 * TypeScript types and interfaces for report operations
 */

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  period?: string;
  dateFrom?: string;
  dateTo?: string;
  diagnosisCode?: string;
  attendanceType?: string;
  paymentMode?: string;
  serviceCategory?: string;
  insuranceProviderId?: string;
  status?: string;
}

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
  breakdown: any[];
  reportGenerated: Date;
}

export interface InsuranceClaimsReport {
  reportType: 'Insurance Claims Analysis';
  period: {
    startDate?: string;
    endDate?: string;
  };
  claimsReport: any[];
  totals: {
    totalClaims: number;
    totalClaimAmount: number;
    totalPaidAmount: number;
  };
  generatedAt: Date;
}

export interface ClinicalReport {
  reportType: 'Clinical Statistics';
  period: {
    dateFrom?: string;
    dateTo?: string;
  };
  clinicalReport: any[];
  generatedAt: Date;
}

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

export interface AttendanceReport {
  reportType: 'ATTENDANCE REPORT';
  facility: FacilityInfo;
  period: ReportPeriod;
  summary: {
    totalAttendances: number;
    uniquePatients: number;
    averageVisitsPerPatient: number;
  };
  attendancePatterns: {
    byType: Record<string, number>;
    byPaymentMode: Record<string, number>;
    dailyDistribution: Record<string, number>;
    hourlyDistribution: Record<string, number>;
  };
  generatedAt: Date;
}

export interface RevenueReport {
  reportType: 'REVENUE ANALYSIS REPORT';
  facility: FacilityInfo;
  period: ReportPeriod;
  summary: {
    totalRevenue: number;
    totalBills: number;
    averageBillAmount: number;
  };
  revenueByPaymentMode: any[];
  monthlyRevenueTrend: any[];
  generatedAt: Date;
}

export interface LabReport {
  reportType: 'LABORATORY REPORT';
  facility: FacilityInfo;
  period: ReportPeriod;
  summary: {
    totalTests: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    averageTurnaroundTime: number;
  };
  topTests: any[];
  generatedAt: Date;
}

export interface ScanReport {
  summary: {
    totalScans: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    byBodyPart: Record<string, number>;
    averageTurnaroundTime: number;
  };
  topScans: any[];
  generatedAt: Date;
}

export interface ProcedureReport {
  summary: {
    totalProcedures: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    averageDuration: number;
  };
  topProcedures: any[];
  generatedAt: Date;
}

export interface MedicationReport {
  summary: {
    totalPrescriptions: number;
    byStatus: Record<string, number>;
    byRoute: Record<string, number>;
    totalQuantityDispensed: number;
  };
  topMedications: any[];
  generatedAt: Date;
}

export interface VitalsReport {
  summary: {
    totalVitalsRecords: number;
    uniquePatients: number;
    abnormalFindings: Record<string, number>;
  };
  trends: any[];
  generatedAt: Date;
}

export type ReportType = 
  | 'family-planning'
  | 'demographic'
  | 'financial'
  | 'insurance-claims'
  | 'clinical'
  | 'morbidity-mortality'
  | 'attendance'
  | 'revenue'
  | 'lab'
  | 'scan'
  | 'procedure'
  | 'medication'
  | 'vitals';

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
