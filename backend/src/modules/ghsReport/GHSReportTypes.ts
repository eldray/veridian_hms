// GHSReportTypes.ts - Complete TypeScript types and DTOs for GHS Report module

import { ReportType as PrismaReportType } from '@prisma/client';

// Re-export the Prisma ReportType enum
export type ReportType = PrismaReportType;

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

export interface GetReportSubmissionsQuery {
  reportType?: ReportType;
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
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

// ========== AGE GROUP TYPES ==========
export type GHSAgeGroup = 
  | '<28d' | '1-11m' | '1-4' | '5-9' | '10-14'
  | '15-17' | '18-19' | '20-34' | '35-49' | '50-59'
  | '60-69' | '70+';

export type OPD_AgeGroup =
  | '0-28d' | '1-11m' | '1-4y' | '5-9y' | '10-14y'
  | '15-17y' | '18-19y' | '20-34y' | '35-49y' | '50-59y' | '60-69y' | '70+y';

export type IPD_AgeGroup =
  | '0-28d' | '1-11m' | '5-9y' | '10-14y';

// ========== BASE TYPES ==========
export interface AgeSexBreakdown {
  [ageGroup: string]: { male: number; female: number };
}

export interface TopDiagnosis {
  diagnosisId: string;
  diagnosisName: string;
  icdCode: string;
  morbidityGroup: string;
  totalCases: number;
  male: number;
  female: number;
  byAgeGroup: Record<GHSAgeGroup, { male: number; female: number }>;
}

// ========== CONSULTING ROOM REGISTER TYPES ==========
export interface ConsultingRoomRegisterEntry {
  date: string;
  attendanceNumber: string;
  patientNo: string;
  nhisNo: string | null;
  patientName: string;
  address: string;
  age: number;
  ageGroup: string;
  telephone: string;
  sex: string;
  patientType: 'NEW' | 'OLD';
  pregnant: boolean;
  isNHIS: boolean;
  provisionalDiagnosis: string;
  labTestsRequested: string;
  labResults: string;
  principalDiagnosis: string;
  newDiagnosis: string;
  oldDiagnosis: string;
  additionalDiagnosis: string;
  newAdditionalDiagnosis: string;
  oldAdditionalDiagnosis: string;
  drugsPrescribed: string;
  drugsGiven: string;
  referredTo: string | null;
  referredFrom: string | null;
  clinician: string;
  attendanceId: string;
}

export interface ConsultingRoomRegisterReport {
  period: {
    startDate: Date;
    endDate: Date;
    date: string;
    week?: number;
    month?: string;
  };
  facility: {
    name: string;
    district: string;
    ghfCode: string;
  };
  summary: {
    totalPatients: number;
    newPatients: number;
    oldPatients: number;
    nhisPatients: number;
    cashPatients: number;
    pregnantWomen: number;
    referrals: number;
  };
  entries: ConsultingRoomRegisterEntry[];
  generatedAt: Date;
}

// ========== MORBIDITY REPORT TYPES ==========
export interface GHSMorbidityReport {
  period: {
    startDate: Date;
    endDate: Date;
    year: number;
    month: number;
  };
  facility: {
    name: string;
    district: string;
    region: string;
    ghfCode: string;
  };
  communicableImmunizable: Record<string, AgeSexBreakdown>;
  communicableNonImmunizable: Record<string, AgeSexBreakdown>;
  nonCommunicable: Record<string, AgeSexBreakdown>;
  mentalHealth: Record<string, AgeSexBreakdown>;
  specializedConditions: Record<string, AgeSexBreakdown>;
  obstetricsGynaecology: Record<string, AgeSexBreakdown>;
  reproductiveTract: Record<string, AgeSexBreakdown>;
  injuries: Record<string, AgeSexBreakdown>;
  reAttendancesReferrals: Record<string, AgeSexBreakdown>;
  topDiagnoses: TopDiagnosis[];
  totals: {
    totalAttendances: number;
    totalNewCases: number;
    totalReAttendances: number;
    totalReferrals: number;
  };
}

// ========== FORM A REPORT TYPES (Complete GHS Monthly Midwives Returns) ==========
export interface FormAReport {
  period: {
    startDate: Date;
    endDate: Date;
    year: number;
    month: number;
    monthName: string;
  };
  facility: {
    name: string;
    district: string;
    region: string;
    ghfCode: string;
  };
  
  // ========== ANTENATAL SECTION ==========
  antenatal: {
    newRegistrants: number;
    totalAttendances: number;
    making4thVisit: number;
    making8thVisit: number;
    td2Plus: number;
    mothersBelow150cm: number;
    seenAt36Weeks: number;
    iptp: {
      dose1: number;
      dose2: number;
      dose3: number;
      dose4: number;
      dose5Plus: number;
    };
    ttVaccination: {
      dose1: number;
      dose2: number;
      dose3: number;
      dose4: number;
      dose5: number;
      tt2Plus: number;
    };
    itnDistributed: number;
    ironFolateGiven: number;
    ifa3Times: number;
    ifa6Times: number;
    malariaTested: number;
    malariaPositive: number;
    malariaTreated: number;
    highRisk: number;
    anaemiaAtBooking: number;
    severeAnaemiaAtBooking: number;
    anaemiaAt36Weeks: number;
    referralsMade: number;
    firstVisits: number;
    fourthVisits: number;
    registration1stTrimester: number;
    registration2ndTrimester: number;
    registration3rdTrimester: number;
    parity: {
      '0': number;
      '1-2': number;
      '3-4': number;
      '5+': number;
    };
    ageAtRegistration: {
      '10-14': number;
      '15-19': number;
      '20-24': number;
      '25-29': number;
      '30-34': number;
      '35+': number;
    };
    syphilisTested: number;
    syphilisPositive: number;
    syphilisTreated: number;
    tbScreened: number;
    tbPositive: number;
    tbTreated: number;
    hepatitisBScreened: number;
    hepatitisBPositive: number;
    hepatitisBProphylaxis: number;
    hivTested: number;
    hivPositive: number;
    onARVTreatment: number;
    partnerTested: number;
    coupleTesting: number;
    babyOnProphylaxis: number;
    malePartnerInvolved: number;
  };
  
  // ========== DELIVERY SECTION ==========
  delivery: {
    totalDeliveries: number;
    spontaneousVertex: number;
    assistedBreech: number;
    vacuum: number;
    forceps: number;
    caesareanSection: number;
    multiple: number;
    liveBirths: number;
    stillbirthsFresh: number;
    stillbirthsMacerated: number;
    neonatalDeaths: number;
    maternalDeaths: number;
    lowBirthWeight: number;
    birthWeightBelow2_5: number;
    birthWeightAbove2_5: number;
    birthWeightByParity: {
      primigravidae: { below2_5: number; above2_5: number };
      multipara: { below2_5: number; above2_5: number };
    };
    placeOfDelivery: {
      private_hospital: number;
      government_hospital: number;
      health_centre: number;
      clinic: number;
      chag_facility: number;
      private_midwife: number;
      tba_trained: number;
      tba_untrained: number;
      home: number;
      en_route: number;
      mines_facility: number;
      quasi_govt_institution: number;
    };
    attendant: {
      doctor: number;
      midwife: number;
      nurse: number;
      community_health_officer: number;
      tba_trained: number;
      tba_untrained: number;
      other: number;
    };
    primigravidae: {
      liveBirths: { male: number; female: number };
      stillbirths: { fresh: number; macerated: number };
    };
    essentialNewbornCare: {
      breastfeedingWithin30Min: number;
      eyeProphylaxisGiven: number;
      cordCareChlorhexidine: number;
      cordCareMethylated: number;
      cordCareDry: number;
      babyWeightAt6to10Days: number;
    };
    morbidities: {
      vvfSeen: number;
      vvfRepaired: number;
      vvfReferred: number;
      dropFoot: number;
      puerperalPsychosis: number;
      endometritis: number;
      mastitis: number;
    };
    maternalDeathsByAge: {
      '10-14': number;
      '15-19': number;
      '20-24': number;
      '25-29': number;
      '30-34': number;
      '35+': number;
    };
    maternalDeathsAudited: number;
    neonatalDeathsBreakdown: {
      early_0_7days: number;
      late_8_28days: number;
      post_neonatal_1_11months: number;
    };
    ageAtDelivery: {
      '10-14': number;
      '15-19': number;
      '20-24': number;
      '25-29': number;
      '30-34': number;
      '35+': number;
    };
  };
  
  // ========== POSTNATAL SECTION ==========
  postnatal: {
    newMothers: number;
    totalVisits: number;
    pncDay1or2: number;
    pncDay3to7: number;
    pncDay8Plus: number;
    ageAtPNC: {
      '10-14': number;
      '15-19': number;
      '20-24': number;
      '25-29': number;
      '30-34': number;
      '35+': number;
    };
    familyPlanningAccepted: number;
    postPartumFPAcceptors: number;
    fpMethodBreakdown: {
      pill: number;
      injectable: number;
      implant: number;
      iud: number;
      condom: number;
      sterilization: number;
      other: number;
    };
    exclusiveBreastfeeding: number;
    exclusiveBFAtDischarge: number;
    immunizationGiven: number;
    complications: number;
    malePartnerInvolved: number;
  };
  
  // ========== ABORTIONS SECTION ==========
  abortions: {
    total: number;
    byType: {
      spontaneous: number;
      induced_safe: number;
      induced_unsafe: number;
      septic: number;
      incomplete: number;
      complete: number;
      missed: number;
      recurrent: number;
    };
    byMethod: {
      medical: number;
      surgical_d_and_c: number;
      surgical_mva: number;
      other: number;
    };
    complications: number;
    byAge: {
      '10-14': number;
      '15-19': number;
      '20-24': number;
      '25-29': number;
      '30-34': number;
      '35+': number;
    };
    postAbortionFPAccepted: number;
  };
  
  // ========== REFERRALS SECTION ==========
  referrals: {
    total: number;
    antenatal: {
      in: number;
      out: number;
    };
    labor: {
      in: number;
      out: number;
    };
    postnatal: {
      in: number;
      out: number;
    };
    byAge: {
      '10-14': number;
      '15-19': number;
      '20-24': number;
      '25-29': number;
      '30-34': number;
      '35+': number;
    };
  };
  
  // ========== BIRTH ABNORMALITIES ==========
  birthAbnormalities: {
    hareLip: number;
    anencephaly: number;
    talipes: number;
    hydrocephalus: number;
    spinaBifida: number;
    cleftPalate: number;
    downSyndrome: number;
    other: number;
  };
  
  // ========== NEWBORN COMPLICATIONS ==========
  newbornComplications: {
    asphyxia: number;
    jaundice: number;
    sepsis: number;
    ophthalmia: number;
    umbilicalInfection: number;
    prematurity: number;
    congenitalAnomaly: number;
    other: number;
  };
  
  // ========== MALE INVOLVEMENT SUMMARY ==========
  maleInvolvement: {
    anc: number;
    delivery: number;
    pnc: number;
    familyPlanning: number;
    cwc: number;
  };
  
  generatedAt: Date;
}

// ========== IPD REPORT TYPES ==========
export interface IPDReport {
  period: {
    startDate: Date;
    endDate: Date;
    year: number;
    month: number;
  };
  facility: {
    name: string;
    district: string;
    region: string;
    ghfCode: string;
  };
  ageGroups: Record<IPD_AgeGroup, {
    admissions: {
      insured: { male: number; female: number };
      nonInsured: { male: number; female: number };
    };
    deaths: {
      insured: { male: number; female: number };
      nonInsured: { male: number; female: number };
    };
  }>;
  malaria: {
    under5Admitted: number;
    above5Admitted: number;
    under5Deaths: number;
    above5Deaths: number;
  };
  totals: {
    totalAdmissions: number;
    totalDeaths: number;
    insured: { admissions: number; deaths: number };
    nonInsured: { admissions: number; deaths: number };
  };
}

// ========== MALARIA REPORT TYPES ==========
export interface MalariaReport {
  period: {
    startDate: Date;
    endDate: Date;
    year: number;
    month: number;
  };
  facility: {
    name: string;
    district: string;
    ghfCode: string;
  };
  opdMalaria: {
    under5: {
      suspected: number;
      tested: number;
      confirmed: number;
      treatedWithACT: number;
    };
    above5: {
      suspected: number;
      tested: number;
      confirmed: number;
      treatedWithACT: number;
    };
  };
  testing: {
    microscopy: number;
    microscopyPositive: number;
    rdt: number;
    rdtPositive: number;
  };
  commodities: Record<string, {
    openingStock: number;
    dispensed: number;
    closingStock: number;
    stockOutDays: number;
  }>;
}

// ========== OPD REPORT TYPES ==========
export interface OPDReport {
  period: {
    startDate: Date;
    endDate: Date;
    year: number;
    month: number;
  };
  facility: {
    name: string;
    district: string;
    ghfCode: string;
  };
  ageGroups: Record<OPD_AgeGroup, {
    insured: { male: number; female: number };
    nonInsured: { male: number; female: number };
    new: number;
    old: number;
  }>;
  totals: {
    totalAttendances: number;
    insured: { male: number; female: number; total: number };
    nonInsured: { male: number; female: number; total: number };
    new: number;
    old: number;
  };
}

// ========== IDSR REPORT TYPES ==========
export interface IDSRReport {
  period: {
    startDate: Date;
    endDate: Date;
    year: number;
    month: number;
  };
  facility: {
    name: string;
    district: string;
    ghfCode: string;
  };
  diseases: Array<{
    disease: string;
    code: string;
    suspected: number;
    confirmed: number;
    deaths: number;
  }>;
}

// ========== DELIVERY REPORT TYPES ==========
export interface DeliveryReport {
  summary: {
    totalDeliveries: number;
    csRate: number;
    stillbirthRate: number;
    maternalMortalityRate: number;
    avgBirthWeight: number;
    lowBirthWeightRate: number;
  };
  breakdowns: {
    deliveryType: Record<string, number>;
    outcome: Record<string, number>;
    maternalOutcome: Record<string, number>;
    paymentMode: Record<string, number>;
  };
  deliveries: any[];
  period: {
    startDate: Date;
    endDate: Date;
  };
}

// ========== FAMILY PLANNING REPORT TYPES ==========
export interface FamilyPlanningReport {
  facility: {
    name: string;
    district: string;
    ghfCode: string;
  };
  period: {
    startDate: Date;
    endDate: Date;
    generated: string;
  };
  summary: {
    totalFPClients: number;
    totalFPVisits: number;
  };
  demographicBreakdown: {
    '15-19 years': number;
    '20-34 years': number;
    '35-49 years': number;
    '50+ years': number;
  };
  methodMix: Record<string, number>;
  generatedAt: Date;
}

// ========== REPORT SUBMISSION TYPES ==========
export interface ReportSubmission {
  id: string;
  reportType: ReportType;
  reportingYear: number;
  reportingMonth: number;
  periodStart: Date;
  periodEnd: Date;
  data: any;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: {
    fullName: string;
    username: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}