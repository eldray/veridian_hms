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

// modules/ghsReport/GHSReportTypes.ts

// ... existing types ...

// ✅ COMPLETE FormAReport Interface for GHS Monthly Midwives Returns
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
    // Basic counts
    newRegistrants: number;
    totalAttendances: number;
    
    // Visit milestones
    making4thVisit: number;
    making8thVisit: number;
    
    // TD2+ Vaccination
    td2Plus: number;
    
    // Physical measurements
    mothersBelow150cm: number;
    seenAt36Weeks: number;
    
    // IPTp doses
    iptp: {
      dose1: number;
      dose2: number;
      dose3: number;
      dose4: number;
      dose5Plus: number;
    };
    
    // TT Vaccination breakdown
    ttVaccination: {
      dose1: number;
      dose2: number;
      dose3: number;
      dose4: number;
      dose5: number;
      tt2Plus: number;
    };
    
    // IFA Supplementation
    itnDistributed: number;
    ironFolateGiven: number;
    ifa3Times: number;
    ifa6Times: number;
    
    // Malaria in pregnancy
    malariaTested: number;
    malariaPositive: number;
    malariaTreated: number;
    
    // Risk assessment
    highRisk: number;
    anaemiaAtBooking: number;
    severeAnaemiaAtBooking: number;
    anaemiaAt36Weeks: number;
    
    // Referrals
    referralsMade: number;
    
    // Visit numbers
    firstVisits: number;
    fourthVisits: number;
    
    // Duration at registration (trimester)
    registration1stTrimester: number;
    registration2ndTrimester: number;
    registration3rdTrimester: number;
    
    // Parity breakdown
    parity: {
      '0': number;
      '1-2': number;
      '3-4': number;
      '5+': number;
    };
    
    // Age at registration
    ageAtRegistration: {
      '10-14': number;
      '15-19': number;
      '20-24': number;
      '25-29': number;
      '30-34': number;
      '35+': number;
    };
    
    // Screenings
    syphilisTested: number;
    syphilisPositive: number;
    syphilisTreated: number;
    tbScreened: number;
    tbPositive: number;
    tbTreated: number;
    hepatitisBScreened: number;
    hepatitisBPositive: number;
    hepatitisBProphylaxis: number;
    
    // PMTCT Cascade
    hivTested: number;
    hivPositive: number;
    onARVTreatment: number;
    partnerTested: number;
    coupleTesting: number;
    babyOnProphylaxis: number;
    
    // Male involvement in ANC
    malePartnerInvolved: number;
  };
  
  // ========== DELIVERY SECTION ==========
  delivery: {
    // Basic counts
    totalDeliveries: number;
    
    // Delivery type breakdown
    spontaneousVertex: number;
    assistedBreech: number;
    vacuum: number;
    forceps: number;
    caesareanSection: number;
    multiple: number;
    
    // Outcomes
    liveBirths: number;
    stillbirthsFresh: number;
    stillbirthsMacerated: number;
    neonatalDeaths: number;
    maternalDeaths: number;
    
    // Birth weight
    lowBirthWeight: number;
    birthWeightBelow2_5: number;
    birthWeightAbove2_5: number;
    
    // Birth weight by parity
    birthWeightByParity: {
      primigravidae: { below2_5: number; above2_5: number };
      multipara: { below2_5: number; above2_5: number };
    };
    
    // Place of delivery
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
    
    // Attendant type
    attendant: {
      doctor: number;
      midwife: number;
      nurse: number;
      community_health_officer: number;
      tba_trained: number;
      tba_untrained: number;
      other: number;
    };
    
    // Primigravidae outcomes
    primigravidae: {
      liveBirths: { male: number; female: number };
      stillbirths: { fresh: number; macerated: number };
    };
    
    // Essential Newborn Care (per baby)
    essentialNewbornCare: {
      breastfeedingWithin30Min: number;
      eyeProphylaxisGiven: number;
      cordCareChlorhexidine: number;
      cordCareMethylated: number;
      cordCareDry: number;
      babyWeightAt6to10Days: number;
    };
    
    // Maternal morbidities
    morbidities: {
      vvfSeen: number;
      vvfRepaired: number;
      vvfReferred: number;
      dropFoot: number;
      puerperalPsychosis: number;
      endometritis: number;
      mastitis: number;
    };
    
    // Maternal deaths by age
    maternalDeathsByAge: {
      '10-14': number;
      '15-19': number;
      '20-24': number;
      '25-29': number;
      '30-34': number;
      '35+': number;
    };
    maternalDeathsAudited: number;
    
    // Neonatal deaths breakdown
    neonatalDeathsBreakdown: {
      early_0_7days: number;
      late_8_28days: number;
      post_neonatal_1_11months: number;
    };
    
    // Age of mother at delivery
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
    
    // PNC timing
    pncDay1or2: number;
    pncDay3to7: number;
    pncDay8Plus: number;
    
    // Age of postnatal registrants
    ageAtPNC: {
      '10-14': number;
      '15-19': number;
      '20-24': number;
      '25-29': number;
      '30-34': number;
      '35+': number;
    };
    
    // Family Planning
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
    
    // Breastfeeding
    exclusiveBreastfeeding: number;
    exclusiveBFAtDischarge: number;
    
    // Immunization
    immunizationGiven: number;
    
    // Complications
    complications: number;
    
    // Male involvement in PNC
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

// ... rest of existing types ...