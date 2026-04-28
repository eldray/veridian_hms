// services/GHSMorbidityService.ts
// Complete GHS Morbidity Report Service - Based on morbi.pdf
// Includes all 9 sections with age/sex disaggregation

import { PrismaClient, MorbidityGroup, Gender } from '@prisma/client';

const prisma = new PrismaClient();

// ==============================================
// TYPES
// ==============================================

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

// Section 2: Communicable Non-Immunizable (Malaria detailed)
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
    'under_28_days',
    'one_to_eleven_months',
    'one_to_four_years',
    'five_to_nine_years',
    'ten_to_fourteen_years',
    'fifteen_to_seventeen_years',
    'eighteen_to_nineteen_years',
    'twenty_to_thirty_four_years',
    'thirty_five_to_forty_nine_years',
    'fifty_to_fifty_nine_years',
    'sixty_to_sixty_nine_years',
    'seventy_plus_years'
  ];

  private static getAgeGroup(dob: Date, referenceDate: Date): GHSAgeGroup {
    const ageInDays = Math.floor((referenceDate.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
    
    if (ageInDays < 28) return 'under_28_days';
    if (ageInDays < 365) return 'one_to_eleven_months';
    if (ageInDays < 5 * 365) return 'one_to_four_years';
    if (ageInDays < 10 * 365) return 'five_to_nine_years';
    if (ageInDays < 15 * 365) return 'ten_to_fourteen_years';
    if (ageInDays < 18 * 365) return 'fifteen_to_seventeen_years';
    if (ageInDays < 20 * 365) return 'eighteen_to_nineteen_years';
    if (ageInDays < 35 * 365) return 'twenty_to_thirty_four_years';
    if (ageInDays < 50 * 365) return 'thirty_five_to_forty_nine_years';
    if (ageInDays < 60 * 365) return 'fifty_to_fifty_nine_years';
    if (ageInDays < 70 * 365) return 'sixty_to_sixty_nine_years';
    return 'seventy_plus_years';
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
      } else {
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
      name: hospital?.name || 'Hospital',
      district: hospital?.ghsDistrictCode || 'Unknown',
      region: hospital?.address?.split(',')?.pop()?.trim() || 'Unknown',
      ghfCode: hospital?.ghaHFCode || 'Unknown'
    };

    report.period = {
      startDate,
      endDate,
      year: startDate.getFullYear(),
      month: startDate.getMonth() + 1
    };

    // Fetch all attendances with diagnoses
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

    // Process each attendance
    for (const attendance of attendances) {
      const patient = attendance.Patient;
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

        const morbidityGroup = diagnosis.morbidityGroup;
        
        // Map to appropriate section and increment
        // Section 1: Communicable Immunizable
        const immunizableGroups = ['afp_polio', 'meningitis', 'neonatal_tetanus', 'pertussis_whooping_cough',
          'diphtheria', 'measles', 'yellow_fever', 'tetanus', 'tuberculosis'];
        
        if (immunizableGroups.includes(morbidityGroup as string)) {
          this.incrementCount(report, 'communicableImmunizable', morbidityGroup as string, ageGroup, gender);
        }
        
        // Section 2: Communicable Non-Immunizable
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
        
        if (nonImmunizableGroups.includes(morbidityGroup as string)) {
          this.incrementCount(report, 'communicableNonImmunizable', morbidityGroup as string, ageGroup, gender);
        }
        
        // Section 3: Non-Communicable
        const ncdGroups = ['malnutrition', 'obesity', 'anaemia', 'other_nutritional_diseases',
          'hypertension', 'cardiac_diseases', 'stroke', 'diabetes_mellitus', 'rheumatism_arthritis',
          'sickle_cell_disease', 'asthma', 'chronic_obstructive_pulmonary_disease',
          'breast_cancer', 'cervical_cancer', 'lymphoma', 'prostate_cancer',
          'hepatocellular_carcinoma', 'all_other_cancers'];
        
        if (ncdGroups.includes(morbidityGroup as string)) {
          this.incrementCount(report, 'nonCommunicable', morbidityGroup as string, ageGroup, gender);
        }
        
        // Section 4: Mental Health
        const mentalHealthGroups = ['schizophrenia', 'acute_psychotic_disorder', 'mono_symptoms_delusion',
          'depression', 'substance_abuse', 'epilepsy', 'autism', 'mental_retardation',
          'attention_deficit_hyperactivity_disorder', 'conversion_disorders',
          'post_traumatic_stress_syndrome', 'generalized_anxiety', 'other_anxiety_disorders', 'neurosis'];
        
        if (mentalHealthGroups.includes(morbidityGroup as string)) {
          this.incrementCount(report, 'mentalHealth', morbidityGroup as string, ageGroup, gender);
        }
        
        // Section 5: Specialized Conditions
        const specializedGroups = ['acute_eye_infection', 'cataract', 'trachoma', 'otitis_media',
          'other_acute_ear_infection', 'dental_caries', 'dental_swellings', 'traumatic_conditions_oral',
          'periodontal_diseases', 'cerebral_palsy', 'liver_diseases', 'acute_urinary_tract_infection',
          'skin_diseases', 'ulcer', 'kidney_related_diseases', 'other_oral_conditions'];
        
        if (specializedGroups.includes(morbidityGroup as string)) {
          this.incrementCount(report, 'specializedConditions', morbidityGroup as string, ageGroup, gender);
        }
        
        // Section 6: Obstetrics & Gynaecological
        const obgynGroups = ['gynaecological_conditions', 'pregnancy_related_complications', 'anaemia_in_pregnancy'];
        
        if (obgynGroups.includes(morbidityGroup as string)) {
          this.incrementCount(report, 'obstetricsGynaecology', morbidityGroup as string, ageGroup, gender);
        }
        
        // Section 7: Reproductive Tract
        const reproductiveGroups = ['gonorrhoea', 'genital_ulcer', 'vaginal_discharge', 'urethral_discharge',
          'other_diseases_male_reproductive_system', 'other_diseases_female_reproductive_system'];
        
        if (reproductiveGroups.includes(morbidityGroup as string)) {
          this.incrementCount(report, 'reproductiveTract', morbidityGroup as string, ageGroup, gender);
        }
        
        // Section 8: Injuries
        const injuryGroups = ['transport_injuries_road_traffic_accidents', 'home_injuries',
          'occupational_industrial_injuries', 'burns', 'poisoning_occupational', 'dog_bite',
          'human_bites', 'snake_bite', 'sexual_abuse', 'domestic_violence',
          'pyrexia_unknown_origin_non_malaria', 'brought_in_dead', 'other_animal_bites', 'all_other_diseases'];
        
        if (injuryGroups.includes(morbidityGroup as string)) {
          this.incrementCount(report, 'injuries', morbidityGroup as string, ageGroup, gender);
        }
      }
    }

    return report;
  }

  static async exportToCSV(report: GHSMorbidityReport): Promise<string> {
    const rows: string[] = [];
    
    // Header
    rows.push(`GHS Morbidity Report,${report.period.startDate.toISOString().split('T')[0]},${report.period.endDate.toISOString().split('T')[0]}`);
    rows.push(`Facility,${report.facility.name},District,${report.facility.district},GHF Code,${report.facility.ghfCode}`);
    rows.push('');
    
    // Helper to generate CSV rows for a section
    const addSectionRows = (title: string, sectionData: any, keys: string[]) => {
      rows.push(`"${title}"`);
      const headerRow = ['Disease/Condition', ...this.AGE_GROUPS.map(g => `${g}_M`), ...this.AGE_GROUPS.map(g => `${g}_F`)];
      rows.push(headerRow.join(','));
      
      for (const key of keys) {
        if (sectionData[key]) {
          const row = [key.replace(/_/g, ' ')];
          for (const ageGroup of this.AGE_GROUPS) {
            row.push(sectionData[key][ageGroup]?.male || 0);
          }
          for (const ageGroup of this.AGE_GROUPS) {
            row.push(sectionData[key][ageGroup]?.female || 0);
          }
          rows.push(row.join(','));
        }
      }
      rows.push('');
    };
    
    // Add all sections
    addSectionRows('COMMUNICABLE IMMUNIZABLE', report.communicableImmunizable, [
      'afp_polio', 'meningitis', 'neonatal_tetanus', 'pertussis_whooping_cough',
      'diphtheria', 'measles', 'yellow_fever', 'tetanus', 'tuberculosis'
    ]);
    
    addSectionRows('COMMUNICABLE NON-IMMUNIZABLE', report.communicableNonImmunizable, [
      'uncomplicated_malaria_suspected', 'uncomplicated_malaria_tested', 'uncomplicated_malaria_positive',
      'severe_malaria_lab_confirmed', 'typhoid_fever', 'suspected_cholera', 'diarrhoea_diseases',
      'pneumonia', 'upper_respiratory_tract_infections'
    ]);
    
    addSectionRows('NON-COMMUNICABLE DISEASES', report.nonCommunicable, [
      'malnutrition', 'obesity', 'anaemia', 'hypertension', 'cardiac_diseases',
      'stroke', 'diabetes_mellitus', 'asthma'
    ]);
    
    addSectionRows('MENTAL HEALTH', report.mentalHealth, [
      'depression', 'epilepsy', 'schizophrenia', 'substance_abuse'
    ]);
    
    addSectionRows('INJURIES', report.injuries, [
      'transport_injuries_road_traffic_accidents', 'home_injuries', 'burns', 'snake_bite'
    ]);
    
    // Summary row
    rows.push('SUMMARY');
    rows.push(`Total Attendances,${report.totals.totalAttendances}`);
    rows.push(`Total New Cases,${report.totals.totalNewCases}`);
    rows.push(`Total Re-Attendances,${report.totals.totalReAttendances}`);
    rows.push(`Total Referrals,${report.totals.totalReferrals}`);
    
    return rows.join('\n');
  }
}