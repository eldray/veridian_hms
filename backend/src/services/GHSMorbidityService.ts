// services/GHSMorbidityService.ts
// Complete GHS Morbidity Report Service - Full 9 sections with age/sex disaggregation

import { PrismaClient, MorbidityGroup, Gender } from '@prisma/client';

const prisma = new PrismaClient();

// ==============================================
// TYPES - CORRECT AGE GROUPS FOR GHS MORBIDITY
// ==============================================

export type GHSAgeGroup = 
  | '<28d'
  | '1-11m'
  | '1-4'
  | '5-9'
  | '10-14'
  | '15-17'
  | '18-19'
  | '20-34'
  | '35-49'
  | '50-59'
  | '60-69'
  | '70+';

export interface AgeSexBreakdown {
  [key: string]: {
    male: number;
    female: number;
  };
}

export interface ReportingPeriod {
  startDate: Date;
  endDate: Date;
  year: number;
  month: number;
}

export interface FacilityInfo {
  name: string;
  district: string;
  region: string;
  ghfCode: string;
}

// Section 1: Communicable Immunizable
export interface CommunicableImmunizable {
  afp_polio: AgeSexBreakdown;
  meningitis: AgeSexBreakdown;
  neonatal_tetanus: AgeSexBreakdown;
  pertussis_whooping_cough: AgeSexBreakdown;
  diphtheria: AgeSexBreakdown;
  measles: AgeSexBreakdown;
  yellow_fever: AgeSexBreakdown;
  tetanus: AgeSexBreakdown;
  tuberculosis: AgeSexBreakdown;
}

// Section 2: Communicable Non-Immunizable
export interface CommunicableNonImmunizable {
  uncomplicated_malaria_suspected: AgeSexBreakdown;
  uncomplicated_malaria_tested: AgeSexBreakdown;
  uncomplicated_malaria_positive: AgeSexBreakdown;
  uncomplicated_malaria_not_tested_treated: AgeSexBreakdown;
  uncomplicated_malaria_tested_negative_treated: AgeSexBreakdown;
  malaria_in_pregnancy_suspected: AgeSexBreakdown;
  malaria_in_pregnancy_tested: AgeSexBreakdown;
  malaria_in_pregnancy_positive: AgeSexBreakdown;
  malaria_in_pregnancy_not_tested_treated: AgeSexBreakdown;
  malaria_in_pregnancy_tested_negative_treated: AgeSexBreakdown;
  severe_malaria_lab_confirmed: AgeSexBreakdown;
  severe_malaria_non_lab_confirmed: AgeSexBreakdown;
  typhoid_fever: AgeSexBreakdown;
  suspected_cholera: AgeSexBreakdown;
  diarrhoea_diseases: AgeSexBreakdown;
  viral_hepatitis: AgeSexBreakdown;
  schistosomiasis_bilharzia: AgeSexBreakdown;
  suspected_guinea_worm: AgeSexBreakdown;
  onchocerciasis: AgeSexBreakdown;
  buruli_ulcer: AgeSexBreakdown;
  leprosy: AgeSexBreakdown;
  hiv_aids_related_conditions: AgeSexBreakdown;
  mumps: AgeSexBreakdown;
  intestinal_worms: AgeSexBreakdown;
  chicken_pox: AgeSexBreakdown;
  upper_respiratory_tract_infections: AgeSexBreakdown;
  pneumonia: AgeSexBreakdown;
  septicaemia: AgeSexBreakdown;
}

// Section 3: Non-Communicable Diseases
export interface NonCommunicable {
  malnutrition: AgeSexBreakdown;
  obesity: AgeSexBreakdown;
  anaemia: AgeSexBreakdown;
  other_nutritional_diseases: AgeSexBreakdown;
  hypertension: AgeSexBreakdown;
  cardiac_diseases: AgeSexBreakdown;
  stroke: AgeSexBreakdown;
  diabetes_mellitus: AgeSexBreakdown;
  rheumatism_arthritis: AgeSexBreakdown;
  sickle_cell_disease: AgeSexBreakdown;
  asthma: AgeSexBreakdown;
  chronic_obstructive_pulmonary_disease: AgeSexBreakdown;
  breast_cancer: AgeSexBreakdown;
  cervical_cancer: AgeSexBreakdown;
  lymphoma: AgeSexBreakdown;
  prostate_cancer: AgeSexBreakdown;
  hepatocellular_carcinoma: AgeSexBreakdown;
  all_other_cancers: AgeSexBreakdown;
}

// Section 4: Mental Health Conditions
export interface MentalHealth {
  schizophrenia: AgeSexBreakdown;
  acute_psychotic_disorder: AgeSexBreakdown;
  mono_symptoms_delusion: AgeSexBreakdown;
  depression: AgeSexBreakdown;
  substance_abuse: AgeSexBreakdown;
  epilepsy: AgeSexBreakdown;
  autism: AgeSexBreakdown;
  mental_retardation: AgeSexBreakdown;
  attention_deficit_hyperactivity_disorder: AgeSexBreakdown;
  conversion_disorders: AgeSexBreakdown;
  post_traumatic_stress_syndrome: AgeSexBreakdown;
  generalized_anxiety: AgeSexBreakdown;
  other_anxiety_disorders: AgeSexBreakdown;
  neurosis: AgeSexBreakdown;
}

// Section 5: Specialized Conditions
export interface SpecializedConditions {
  acute_eye_infection: AgeSexBreakdown;
  cataract: AgeSexBreakdown;
  trachoma: AgeSexBreakdown;
  otitis_media: AgeSexBreakdown;
  other_acute_ear_infection: AgeSexBreakdown;
  dental_caries: AgeSexBreakdown;
  dental_swellings: AgeSexBreakdown;
  traumatic_conditions_oral: AgeSexBreakdown;
  periodontal_diseases: AgeSexBreakdown;
  cerebral_palsy: AgeSexBreakdown;
  liver_diseases: AgeSexBreakdown;
  acute_urinary_tract_infection: AgeSexBreakdown;
  skin_diseases: AgeSexBreakdown;
  ulcer: AgeSexBreakdown;
  kidney_related_diseases: AgeSexBreakdown;
  other_oral_conditions: AgeSexBreakdown;
}

// Section 6: Obstetrics & Gynaecological
export interface ObstetricsGynaecology {
  gynaecological_conditions: AgeSexBreakdown;
  pregnancy_related_complications: AgeSexBreakdown;
  anaemia_in_pregnancy: AgeSexBreakdown;
}

// Section 7: Reproductive Tract Diseases
export interface ReproductiveTract {
  gonorrhoea: AgeSexBreakdown;
  genital_ulcer: AgeSexBreakdown;
  vaginal_discharge: AgeSexBreakdown;
  urethral_discharge: AgeSexBreakdown;
  other_diseases_male_reproductive_system: AgeSexBreakdown;
  other_diseases_female_reproductive_system: AgeSexBreakdown;
}

// Section 8: Injuries and Others
export interface Injuries {
  transport_injuries_road_traffic_accidents: AgeSexBreakdown;
  home_injuries: AgeSexBreakdown;
  occupational_industrial_injuries: AgeSexBreakdown;
  burns: AgeSexBreakdown;
  poisoning_occupational: AgeSexBreakdown;
  dog_bite: AgeSexBreakdown;
  human_bites: AgeSexBreakdown;
  snake_bite: AgeSexBreakdown;
  sexual_abuse: AgeSexBreakdown;
  domestic_violence: AgeSexBreakdown;
  pyrexia_unknown_origin_non_malaria: AgeSexBreakdown;
  brought_in_dead: AgeSexBreakdown;
  other_animal_bites: AgeSexBreakdown;
  all_other_diseases: AgeSexBreakdown;
}

// Section 9: Re-Attendances and Referrals
export interface ReAttendancesReferrals {
  re_attendances: AgeSexBreakdown;
  referrals: AgeSexBreakdown;
}

// Top 10 Diagnoses
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

// Complete Report
export interface GHSMorbidityReport {
  period: ReportingPeriod;
  facility: FacilityInfo;
  communicableImmunizable: CommunicableImmunizable;
  communicableNonImmunizable: CommunicableNonImmunizable;
  nonCommunicable: NonCommunicable;
  mentalHealth: MentalHealth;
  specializedConditions: SpecializedConditions;
  obstetricsGynaecology: ObstetricsGynaecology;
  reproductiveTract: ReproductiveTract;
  injuries: Injuries;
  reAttendancesReferrals: ReAttendancesReferrals;
  topDiagnoses: TopDiagnosis[];
  totals: {
    totalAttendances: number;
    totalNewCases: number;
    totalReAttendances: number;
    totalReferrals: number;
  };
}

// ==============================================
// SERVICE CLASS
// ==============================================

export class GHSMorbidityService {
  
  private static readonly AGE_GROUPS: GHSAgeGroup[] = [
    '<28d',
    '1-11m',
    '1-4',
    '5-9',
    '10-14',
    '15-17',
    '18-19',
    '20-34',
    '35-49',
    '50-59',
    '60-69',
    '70+'
  ];

  private static getAgeGroup(dob: Date, referenceDate: Date): GHSAgeGroup {
    const ageInDays = Math.floor((referenceDate.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
    const ageInMonths = ageInDays / 30.44;
    const ageInYears = ageInDays / 365.25;
    
    if (ageInDays < 28) return '<28d';
    if (ageInMonths < 12) return '1-11m';
    if (ageInYears < 5) return '1-4';
    if (ageInYears < 10) return '5-9';
    if (ageInYears < 15) return '10-14';
    if (ageInYears < 18) return '15-17';
    if (ageInYears < 20) return '18-19';
    if (ageInYears < 35) return '20-34';
    if (ageInYears < 50) return '35-49';
    if (ageInYears < 60) return '50-59';
    if (ageInYears < 70) return '60-69';
    return '70+';
  }

  private static createEmptyAgeSexBreakdown(): AgeSexBreakdown {
    const breakdown: AgeSexBreakdown = {};
    for (const ageGroup of this.AGE_GROUPS) {
      breakdown[ageGroup] = { male: 0, female: 0 };
    }
    return breakdown;
  }

  private static initializeEmptyReport(): GHSMorbidityReport {
    const createEmptySection = (keys: string[]) => {
      const section: any = {};
      for (const key of keys) {
        section[key] = this.createEmptyAgeSexBreakdown();
      }
      return section;
    };

    const communicableImmunizableKeys = [
      'afp_polio', 'meningitis', 'neonatal_tetanus', 'pertussis_whooping_cough',
      'diphtheria', 'measles', 'yellow_fever', 'tetanus', 'tuberculosis'
    ];

    const communicableNonImmunizableKeys = [
      'uncomplicated_malaria_suspected', 'uncomplicated_malaria_tested', 'uncomplicated_malaria_positive',
      'uncomplicated_malaria_not_tested_treated', 'uncomplicated_malaria_tested_negative_treated',
      'malaria_in_pregnancy_suspected', 'malaria_in_pregnancy_tested', 'malaria_in_pregnancy_positive',
      'malaria_in_pregnancy_not_tested_treated', 'malaria_in_pregnancy_tested_negative_treated',
      'severe_malaria_lab_confirmed', 'severe_malaria_non_lab_confirmed', 'typhoid_fever',
      'suspected_cholera', 'diarrhoea_diseases', 'viral_hepatitis', 'schistosomiasis_bilharzia',
      'suspected_guinea_worm', 'onchocerciasis', 'buruli_ulcer', 'leprosy', 'hiv_aids_related_conditions',
      'mumps', 'intestinal_worms', 'chicken_pox', 'upper_respiratory_tract_infections',
      'pneumonia', 'septicaemia'
    ];

    const nonCommunicableKeys = [
      'malnutrition', 'obesity', 'anaemia', 'other_nutritional_diseases', 'hypertension',
      'cardiac_diseases', 'stroke', 'diabetes_mellitus', 'rheumatism_arthritis',
      'sickle_cell_disease', 'asthma', 'chronic_obstructive_pulmonary_disease',
      'breast_cancer', 'cervical_cancer', 'lymphoma', 'prostate_cancer',
      'hepatocellular_carcinoma', 'all_other_cancers'
    ];

    const mentalHealthKeys = [
      'schizophrenia', 'acute_psychotic_disorder', 'mono_symptoms_delusion', 'depression',
      'substance_abuse', 'epilepsy', 'autism', 'mental_retardation',
      'attention_deficit_hyperactivity_disorder', 'conversion_disorders',
      'post_traumatic_stress_syndrome', 'generalized_anxiety', 'other_anxiety_disorders', 'neurosis'
    ];

    const specializedConditionsKeys = [
      'acute_eye_infection', 'cataract', 'trachoma', 'otitis_media', 'other_acute_ear_infection',
      'dental_caries', 'dental_swellings', 'traumatic_conditions_oral', 'periodontal_diseases',
      'cerebral_palsy', 'liver_diseases', 'acute_urinary_tract_infection', 'skin_diseases',
      'ulcer', 'kidney_related_diseases', 'other_oral_conditions'
    ];

    const obstetricsGynaecologyKeys = [
      'gynaecological_conditions', 'pregnancy_related_complications', 'anaemia_in_pregnancy'
    ];

    const reproductiveTractKeys = [
      'gonorrhoea', 'genital_ulcer', 'vaginal_discharge', 'urethral_discharge',
      'other_diseases_male_reproductive_system', 'other_diseases_female_reproductive_system'
    ];

    const injuriesKeys = [
      'transport_injuries_road_traffic_accidents', 'home_injuries', 'occupational_industrial_injuries',
      'burns', 'poisoning_occupational', 'dog_bite', 'human_bites', 'snake_bite',
      'sexual_abuse', 'domestic_violence', 'pyrexia_unknown_origin_non_malaria',
      'brought_in_dead', 'other_animal_bites', 'all_other_diseases'
    ];

    const reAttendancesReferralsKeys = ['re_attendances', 'referrals'];

    return {
      period: { startDate: new Date(), endDate: new Date(), year: 0, month: 0 },
      facility: { name: '', district: '', region: '', ghfCode: '' },
      communicableImmunizable: createEmptySection(communicableImmunizableKeys),
      communicableNonImmunizable: createEmptySection(communicableNonImmunizableKeys),
      nonCommunicable: createEmptySection(nonCommunicableKeys),
      mentalHealth: createEmptySection(mentalHealthKeys),
      specializedConditions: createEmptySection(specializedConditionsKeys),
      obstetricsGynaecology: createEmptySection(obstetricsGynaecologyKeys),
      reproductiveTract: createEmptySection(reproductiveTractKeys),
      injuries: createEmptySection(injuriesKeys),
      reAttendancesReferrals: createEmptySection(reAttendancesReferralsKeys),
      topDiagnoses: [],
      totals: { totalAttendances: 0, totalNewCases: 0, totalReAttendances: 0, totalReferrals: 0 }
    };
  }

  private static incrementCount(
    report: GHSMorbidityReport,
    section: keyof GHSMorbidityReport,
    subKey: string,
    ageGroup: GHSAgeGroup,
    gender: Gender
  ) {
    const sectionData = report[section] as any;
    if (sectionData && sectionData[subKey] && sectionData[subKey][ageGroup]) {
      if (gender === 'male') {
        sectionData[subKey][ageGroup].male++;
      } else if (gender === 'female') {
        sectionData[subKey][ageGroup].female++;
      }
    }
  }

  private static async isReAttendance(patientId: string, currentDate: Date): Promise<boolean> {
    const previousCount = await prisma.attendance.count({
      where: {
        patientId,
        dateTime: { lt: currentDate },
        status: { not: 'cancelled' }
      }
    });
    return previousCount > 0;
  }

  private static async isReferral(attendanceId: string): Promise<boolean> {
    const referral = await prisma.referralRecord.findFirst({
      where: { attendanceId, referralType: 'incoming' }
    });
    return !!referral;
  }

  static async generateMorbidityReport(
    startDate: Date,
    endDate: Date
  ): Promise<GHSMorbidityReport> {
    const report = this.initializeEmptyReport();

    // Get facility info
    const hospital = await prisma.hospital.findFirst();
    report.facility = {
      name: hospital?.name || 'Health Facility',
      district: hospital?.ghsDistrictCode || 'Unknown District',
      region: 'Unknown Region', // Add region field to Hospital model if needed
      ghfCode: hospital?.ghaHFCode || 'Unknown'
    };

    report.period = {
      startDate,
      endDate,
      year: startDate.getFullYear(),
      month: startDate.getMonth() + 1
    };

    // Fetch all attendances with diagnoses and patient info
    const attendances = await prisma.attendance.findMany({
      where: {
        dateTime: { gte: startDate, lte: endDate },
        status: { not: 'cancelled' }
      },
      include: {
        Patient: true,
        AttendanceDiagnosis: {
          include: {
            Diagnosis: true
          }
        }
      }
    });

    console.log(`📊 Processing ${attendances.length} attendances for morbidity report`);

    // Track top diagnoses
    const diagnosisCounts: Map<string, {
      diagnosis: any;
      male: number;
      female: number;
      byAgeGroup: Record<GHSAgeGroup, { male: number; female: number }>;
    }> = new Map();

    // Process each attendance
    for (const attendance of attendances) {
      const patient = attendance.Patient;
      if (!patient) continue;
      
      const ageGroup = this.getAgeGroup(patient.dateOfBirth, attendance.dateTime);
      const gender = patient.gender;
      
      report.totals.totalAttendances++;

      // Check if re-attendance
      const isReAtt = await this.isReAttendance(patient.id, attendance.dateTime);
      if (isReAtt) {
        report.totals.totalReAttendances++;
        this.incrementCount(report, 'reAttendancesReferrals', 're_attendances', ageGroup, gender);
      } else {
        report.totals.totalNewCases++;
      }

      // Check if referral
      const isReferral = await this.isReferral(attendance.id);
      if (isReferral) {
        report.totals.totalReferrals++;
        this.incrementCount(report, 'reAttendancesReferrals', 'referrals', ageGroup, gender);
      }

      // Process each diagnosis
      for (const diag of attendance.AttendanceDiagnosis) {
        const diagnosis = diag.Diagnosis;
        if (!diagnosis?.morbidityGroup) continue;

        const morbidityGroup = diagnosis.morbidityGroup as string;
        
        // Track for top diagnoses
        if (!diagnosisCounts.has(diagnosis.id)) {
          diagnosisCounts.set(diagnosis.id, {
            diagnosis,
            male: 0,
            female: 0,
            byAgeGroup: {} as Record<GHSAgeGroup, { male: number; female: number }>
          });
        }
        const countData = diagnosisCounts.get(diagnosis.id)!;
        if (gender === 'male') {
          countData.male++;
        } else {
          countData.female++;
        }
        if (!countData.byAgeGroup[ageGroup]) {
          countData.byAgeGroup[ageGroup] = { male: 0, female: 0 };
        }
        if (gender === 'male') {
          countData.byAgeGroup[ageGroup].male++;
        } else {
          countData.byAgeGroup[ageGroup].female++;
        }

        // Map to appropriate section and increment
        const immunizableGroups = ['afp_polio', 'meningitis', 'neonatal_tetanus', 'pertussis_whooping_cough',
          'diphtheria', 'measles', 'yellow_fever', 'tetanus', 'tuberculosis'];
        
        if (immunizableGroups.includes(morbidityGroup)) {
          this.incrementCount(report, 'communicableImmunizable', morbidityGroup, ageGroup, gender);
          continue;
        }
        
        const nonImmunizableGroups = ['uncomplicated_malaria_suspected', 'uncomplicated_malaria_tested',
          'uncomplicated_malaria_positive', 'uncomplicated_malaria_not_tested_treated',
          'uncomplicated_malaria_tested_negative_treated', 'malaria_in_pregnancy_suspected',
          'malaria_in_pregnancy_tested', 'malaria_in_pregnancy_positive',
          'malaria_in_pregnancy_not_tested_treated', 'malaria_in_pregnancy_tested_negative_treated',
          'severe_malaria_lab_confirmed', 'severe_malaria_non_lab_confirmed', 'typhoid_fever',
          'suspected_cholera', 'diarrhoea_diseases', 'viral_hepatitis', 'schistosomiasis_bilharzia',
          'suspected_guinea_worm', 'onchocerciasis', 'buruli_ulcer', 'leprosy',
          'hiv_aids_related_conditions', 'mumps', 'intestinal_worms', 'chicken_pox',
          'upper_respiratory_tract_infections', 'pneumonia', 'septicaemia'];
        
        if (nonImmunizableGroups.includes(morbidityGroup)) {
          this.incrementCount(report, 'communicableNonImmunizable', morbidityGroup, ageGroup, gender);
          continue;
        }
        
        const ncdGroups = ['malnutrition', 'obesity', 'anaemia', 'other_nutritional_diseases',
          'hypertension', 'cardiac_diseases', 'stroke', 'diabetes_mellitus', 'rheumatism_arthritis',
          'sickle_cell_disease', 'asthma', 'chronic_obstructive_pulmonary_disease',
          'breast_cancer', 'cervical_cancer', 'lymphoma', 'prostate_cancer',
          'hepatocellular_carcinoma', 'all_other_cancers'];
        
        if (ncdGroups.includes(morbidityGroup)) {
          this.incrementCount(report, 'nonCommunicable', morbidityGroup, ageGroup, gender);
          continue;
        }
        
        const mentalHealthGroups = ['schizophrenia', 'acute_psychotic_disorder', 'mono_symptoms_delusion',
          'depression', 'substance_abuse', 'epilepsy', 'autism', 'mental_retardation',
          'attention_deficit_hyperactivity_disorder', 'conversion_disorders',
          'post_traumatic_stress_syndrome', 'generalized_anxiety', 'other_anxiety_disorders', 'neurosis'];
        
        if (mentalHealthGroups.includes(morbidityGroup)) {
          this.incrementCount(report, 'mentalHealth', morbidityGroup, ageGroup, gender);
          continue;
        }
        
        const specializedGroups = ['acute_eye_infection', 'cataract', 'trachoma', 'otitis_media',
          'other_acute_ear_infection', 'dental_caries', 'dental_swellings', 'traumatic_conditions_oral',
          'periodontal_diseases', 'cerebral_palsy', 'liver_diseases', 'acute_urinary_tract_infection',
          'skin_diseases', 'ulcer', 'kidney_related_diseases', 'other_oral_conditions'];
        
        if (specializedGroups.includes(morbidityGroup)) {
          this.incrementCount(report, 'specializedConditions', morbidityGroup, ageGroup, gender);
          continue;
        }
        
        const obgynGroups = ['gynaecological_conditions', 'pregnancy_related_complications', 'anaemia_in_pregnancy'];
        
        if (obgynGroups.includes(morbidityGroup)) {
          this.incrementCount(report, 'obstetricsGynaecology', morbidityGroup, ageGroup, gender);
          continue;
        }
        
        const reproductiveGroups = ['gonorrhoea', 'genital_ulcer', 'vaginal_discharge', 'urethral_discharge',
          'other_diseases_male_reproductive_system', 'other_diseases_female_reproductive_system'];
        
        if (reproductiveGroups.includes(morbidityGroup)) {
          this.incrementCount(report, 'reproductiveTract', morbidityGroup, ageGroup, gender);
          continue;
        }
        
        const injuryGroups = ['transport_injuries_road_traffic_accidents', 'home_injuries',
          'occupational_industrial_injuries', 'burns', 'poisoning_occupational', 'dog_bite',
          'human_bites', 'snake_bite', 'sexual_abuse', 'domestic_violence',
          'pyrexia_unknown_origin_non_malaria', 'brought_in_dead', 'other_animal_bites', 'all_other_diseases'];
        
        if (injuryGroups.includes(morbidityGroup)) {
          this.incrementCount(report, 'injuries', morbidityGroup, ageGroup, gender);
          continue;
        }
      }
    }

    // Build top 10 diagnoses
    const sortedDiagnoses = Array.from(diagnosisCounts.entries())
      .map(([id, data]) => ({
        diagnosisId: id,
        diagnosisName: data.diagnosis.name,
        icdCode: data.diagnosis.icdCode,
        morbidityGroup: data.diagnosis.morbidityGroup,
        totalCases: data.male + data.female,
        male: data.male,
        female: data.female,
        byAgeGroup: data.byAgeGroup
      }))
      .sort((a, b) => b.totalCases - a.totalCases)
      .slice(0, 10);

    report.topDiagnoses = sortedDiagnoses;

    console.log('✅ Morbidity Report Summary:', {
      totalAttendances: report.totals.totalAttendances,
      totalDiagnoses: diagnosisCounts.size,
      topDiagnosis: report.topDiagnoses[0]?.diagnosisName,
      topDiagnosisCount: report.topDiagnoses[0]?.totalCases
    });

    return report;
  }

  static async getTopDiagnosesOnly(
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<TopDiagnosis[]> {
    const attendances = await prisma.attendance.findMany({
      where: {
        dateTime: { gte: startDate, lte: endDate },
        status: { not: 'cancelled' }
      },
      include: {
        Patient: true,
        AttendanceDiagnosis: {
          include: {
            Diagnosis: true
          }
        }
      }
    });

    const diagnosisCounts: Map<string, {
      diagnosis: any;
      male: number;
      female: number;
      byAgeGroup: Record<GHSAgeGroup, { male: number; female: number }>;
    }> = new Map();

    for (const attendance of attendances) {
      const patient = attendance.Patient;
      if (!patient) continue;
      
      const ageGroup = this.getAgeGroup(patient.dateOfBirth, attendance.dateTime);
      const gender = patient.gender;

      for (const diag of attendance.AttendanceDiagnosis) {
        const diagnosis = diag.Diagnosis;
        if (!diagnosis) continue;

        if (!diagnosisCounts.has(diagnosis.id)) {
          diagnosisCounts.set(diagnosis.id, {
            diagnosis,
            male: 0,
            female: 0,
            byAgeGroup: {} as Record<GHSAgeGroup, { male: number; female: number }>
          });
        }
        const countData = diagnosisCounts.get(diagnosis.id)!;
        if (gender === 'male') {
          countData.male++;
        } else {
          countData.female++;
        }
        if (!countData.byAgeGroup[ageGroup]) {
          countData.byAgeGroup[ageGroup] = { male: 0, female: 0 };
        }
        if (gender === 'male') {
          countData.byAgeGroup[ageGroup].male++;
        } else {
          countData.byAgeGroup[ageGroup].female++;
        }
      }
    }

    return Array.from(diagnosisCounts.entries())
      .map(([id, data]) => ({
        diagnosisId: id,
        diagnosisName: data.diagnosis.name,
        icdCode: data.diagnosis.icdCode,
        morbidityGroup: data.diagnosis.morbidityGroup,
        totalCases: data.male + data.female,
        male: data.male,
        female: data.female,
        byAgeGroup: data.byAgeGroup
      }))
      .sort((a, b) => b.totalCases - a.totalCases)
      .slice(0, limit);
  }

  static exportToCSV(report: GHSMorbidityReport): string {
    const rows: string[] = [];
    
    // Header
    rows.push(`"GHS Morbidity Report"`);
    rows.push(`"Facility Name","${report.facility.name}"`);
    rows.push(`"District","${report.facility.district}"`);
    rows.push(`"GHF Code","${report.facility.ghfCode}"`);
    rows.push(`"Reporting Period","${report.period.startDate.toISOString().split('T')[0]}","to","${report.period.endDate.toISOString().split('T')[0]}"`);
    rows.push(``);
    
    // Helper to add section rows
    const addSectionRows = (title: string, sectionData: any, keys: string[]) => {
      rows.push(`"${title}"`);
      
      // Header row with age groups
      const headerRow = ['"Disease/Condition"'];
      for (const ageGroup of this.AGE_GROUPS) {
        headerRow.push(`"${ageGroup}_M"`);
      }
      for (const ageGroup of this.AGE_GROUPS) {
        headerRow.push(`"${ageGroup}_F"`);
      }
      headerRow.push('"Total_M"', '"Total_F"', '"Total"');
      rows.push(headerRow.join(','));
      
      for (const key of keys) {
        if (sectionData[key]) {
          const row = [`"${key.replace(/_/g, ' ')}"`];
          let totalMale = 0;
          let totalFemale = 0;
          
          for (const ageGroup of this.AGE_GROUPS) {
            const maleCount = sectionData[key][ageGroup]?.male || 0;
            const femaleCount = sectionData[key][ageGroup]?.female || 0;
            row.push(maleCount);
            row.push(femaleCount);
            totalMale += maleCount;
            totalFemale += femaleCount;
          }
          row.push(totalMale, totalFemale, totalMale + totalFemale);
          rows.push(row.join(','));
        }
      }
      rows.push(``);
    };
    
    // Add all 9 sections
    const immunizableKeys = [
      'afp_polio', 'meningitis', 'neonatal_tetanus', 'pertussis_whooping_cough',
      'diphtheria', 'measles', 'yellow_fever', 'tetanus', 'tuberculosis'
    ];
    addSectionRows('SECTION 1: COMMUNICABLE IMMUNIZABLE', report.communicableImmunizable, immunizableKeys);
    
    const nonImmunizableKeys = [
      'uncomplicated_malaria_suspected', 'uncomplicated_malaria_tested', 'uncomplicated_malaria_positive',
      'uncomplicated_malaria_not_tested_treated', 'uncomplicated_malaria_tested_negative_treated',
      'malaria_in_pregnancy_suspected', 'malaria_in_pregnancy_tested', 'malaria_in_pregnancy_positive',
      'malaria_in_pregnancy_not_tested_treated', 'malaria_in_pregnancy_tested_negative_treated',
      'severe_malaria_lab_confirmed', 'severe_malaria_non_lab_confirmed', 'typhoid_fever',
      'suspected_cholera', 'diarrhoea_diseases', 'viral_hepatitis', 'schistosomiasis_bilharzia',
      'suspected_guinea_worm', 'onchocerciasis', 'buruli_ulcer', 'leprosy', 'hiv_aids_related_conditions',
      'mumps', 'intestinal_worms', 'chicken_pox', 'upper_respiratory_tract_infections',
      'pneumonia', 'septicaemia'
    ];
    addSectionRows('SECTION 2: COMMUNICABLE NON-IMMUNIZABLE', report.communicableNonImmunizable, nonImmunizableKeys);
    
    const ncdKeys = [
      'malnutrition', 'obesity', 'anaemia', 'other_nutritional_diseases', 'hypertension',
      'cardiac_diseases', 'stroke', 'diabetes_mellitus', 'rheumatism_arthritis',
      'sickle_cell_disease', 'asthma', 'chronic_obstructive_pulmonary_disease',
      'breast_cancer', 'cervical_cancer', 'lymphoma', 'prostate_cancer',
      'hepatocellular_carcinoma', 'all_other_cancers'
    ];
    addSectionRows('SECTION 3: NON-COMMUNICABLE DISEASES', report.nonCommunicable, ncdKeys);
    
    const mentalHealthKeys = [
      'schizophrenia', 'acute_psychotic_disorder', 'mono_symptoms_delusion', 'depression',
      'substance_abuse', 'epilepsy', 'autism', 'mental_retardation',
      'attention_deficit_hyperactivity_disorder', 'conversion_disorders',
      'post_traumatic_stress_syndrome', 'generalized_anxiety', 'other_anxiety_disorders', 'neurosis'
    ];
    addSectionRows('SECTION 4: MENTAL HEALTH', report.mentalHealth, mentalHealthKeys);
    
    const specializedKeys = [
      'acute_eye_infection', 'cataract', 'trachoma', 'otitis_media', 'other_acute_ear_infection',
      'dental_caries', 'dental_swellings', 'traumatic_conditions_oral', 'periodontal_diseases',
      'cerebral_palsy', 'liver_diseases', 'acute_urinary_tract_infection', 'skin_diseases',
      'ulcer', 'kidney_related_diseases', 'other_oral_conditions'
    ];
    addSectionRows('SECTION 5: SPECIALIZED CONDITIONS', report.specializedConditions, specializedKeys);
    
    const obgynKeys = ['gynaecological_conditions', 'pregnancy_related_complications', 'anaemia_in_pregnancy'];
    addSectionRows('SECTION 6: OBSTETRICS & GYNAECOLOGY', report.obstetricsGynaecology, obgynKeys);
    
    const reproductiveKeys = [
      'gonorrhoea', 'genital_ulcer', 'vaginal_discharge', 'urethral_discharge',
      'other_diseases_male_reproductive_system', 'other_diseases_female_reproductive_system'
    ];
    addSectionRows('SECTION 7: REPRODUCTIVE TRACT', report.reproductiveTract, reproductiveKeys);
    
    const injuriesKeys = [
      'transport_injuries_road_traffic_accidents', 'home_injuries', 'occupational_industrial_injuries',
      'burns', 'poisoning_occupational', 'dog_bite', 'human_bites', 'snake_bite',
      'sexual_abuse', 'domestic_violence', 'pyrexia_unknown_origin_non_malaria',
      'brought_in_dead', 'other_animal_bites', 'all_other_diseases'
    ];
    addSectionRows('SECTION 8: INJURIES', report.injuries, injuriesKeys);
    
    const reAttendKeys = ['re_attendances', 'referrals'];
    addSectionRows('SECTION 9: RE-ATTENDANCES & REFERRALS', report.reAttendancesReferrals, reAttendKeys);
    
    // Add TOP 10 DIAGNOSES section
    rows.push(`"TOP 10 DIAGNOSES"`);
    rows.push(`"Rank","Diagnosis Name","ICD Code","Morbidity Group","Total Cases","Male","Female"`);
    report.topDiagnoses.forEach((diag, idx) => {
      rows.push(`"${idx + 1}","${diag.diagnosisName}","${diag.icdCode}","${diag.morbidityGroup}","${diag.totalCases}","${diag.male}","${diag.female}"`);
    });
    rows.push(``);
    
    // Summary
    rows.push(`"SUMMARY"`);
    rows.push(`"Total Attendances","${report.totals.totalAttendances}"`);
    rows.push(`"Total New Cases","${report.totals.totalNewCases}"`);
    rows.push(`"Total Re-Attendances","${report.totals.totalReAttendances}"`);
    rows.push(`"Total Referrals","${report.totals.totalReferrals}"`);
    rows.push(``);
    rows.push(`"Generated At","${new Date().toISOString()}"`);
    
    return rows.join('\n');
  }
}