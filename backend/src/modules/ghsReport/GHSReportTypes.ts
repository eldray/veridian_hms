// GHSReportTypes.ts - TypeScript types and DTOs for GHS Report module

export type ReportType = 
  | 'opd_attendance'
  | 'ipd_morbidity'
  | 'form_a_morbidity'
  | 'malaria_data'
  | 'idsr'
  | 'form_a_complete';

export interface DateRangeParams {
  year?: string;
  month?: string;
  startDate?: string;
  endDate?: string;
}

export interface ParsedDateParams {
  startDate: Date;
  endDate: Date;
  year: number;
  month: number;
}

export interface OPDReportData {
  totalAttendances: number;
  ageGroups: {
    under1: number;
    age1to4: number;
    age5to9: number;
    age10to14: number;
    age15to19: number;
    age20to24: number;
    age25to29: number;
    age30to34: number;
    age35to39: number;
    age40to44: number;
    age45to49: number;
    age50to54: number;
    age55to59: number;
    age60plus: number;
  };
  genderDistribution: {
    male: number;
    female: number;
  };
  topDiagnoses: Array<{
    diagnosisId: string;
    name: string;
    icdCode: string;
    count: number;
  }>;
}

export interface IPDReportData {
  totalAdmissions: number;
  totalDischarges: number;
  totalDeaths: number;
  mortalityRate: number;
  averageLengthOfStay: number;
  dischargeByOutcome: {
    discharged: number;
    expired: number;
    transferred: number;
    againstMedicalAdvice: number;
  };
}

export interface MorbidityReportData {
  totalCases: number;
  totalDeaths: number;
  topDiagnoses: Array<{
    rank: number;
    diagnosisId: string;
    name: string;
    icdCode: string;
    cases: number;
    deaths: number;
    caseFatalityRate: number;
  }>;
}

export interface MalariaReportData {
  totalSuspected: number;
  totalConfirmed: number;
  totalTreated: number;
  totalDeaths: number;
  positivityRate: number;
  ageDistribution: {
    under5: number;
    age5to14: number;
    age15plus: number;
  };
}

export interface IDSRReportData {
  diseases: Array<{
    disease: string;
    code: string;
    suspected: number;
    confirmed: number;
    deaths: number;
  }>;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface FormAReportData {
  anc: {
    newRegistrations: number;
    totalVisits: number;
    tetanusToxoidGiven: number;
    ironFolicAcidGiven: number;
  };
  delivery: {
    totalDeliveries: number;
    institutionalDeliveries: number;
    homeDeliveries: number;
    cesareanSections: number;
    maternalDeaths: number;
  };
  postnatal: {
    totalVisits: number;
    mothersSeen: number;
    newbornsSeen: number;
  };
}

export interface GetReportSubmissionsQuery {
  reportType?: ReportType;
  year?: number;
  month?: number;
}

export interface ExportReportToCSVParams {
  id: string;
}

export interface GHSReportResponse {
  success: boolean;
  data?: any;
  csv?: string;
  submissionId?: string;
  message?: string;
}
