// modules/ghsReport/GHSReportService.ts
// COMPLETE CONSOLIDATED SERVICE - PRESERVING ALL ORIGINAL LOGIC

import { PrismaClient, Gender } from '@prisma/client';

// ==============================================
// TYPES - From GHSMorbidityService.ts
// ==============================================

export type GHSAgeGroup =
  | '<28d' | '1-11m' | '1-4' | '5-9' | '10-14'
  | '15-17' | '18-19' | '20-34' | '35-49' | '50-59'
  | '60-69' | '70+';

export type OPD_AgeGroup =
  | '0-28d' | '1-11m' | '1-4y' | '5-9y' | '10-14y'
  | '15-17y' | '18-19y' | '20-34y' | '35-49y' | '50-59y' | '60-69y' | '70+y';

export type IPD_AgeGroup =
  | '0-28d' | '1-11m' | '5-9y' | '10-14y';

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

// ==============================================
// CONSTANTS - From GHSMorbidityService.ts (PRESERVED FULLY)
// ==============================================

export const AGE_GROUPS: GHSAgeGroup[] = [
  '<28d', '1-11m', '1-4', '5-9', '10-14',
  '15-17', '18-19', '20-34', '35-49', '50-59',
  '60-69', '70+'
];

export const OPD_AGE_GROUPS: OPD_AgeGroup[] = [
  '0-28d', '1-11m', '1-4y', '5-9y', '10-14y',
  '15-17y', '18-19y', '20-34y', '35-49y', '50-59y', '60-69y', '70+y'
];

export const IPD_AGE_GROUPS: IPD_AgeGroup[] = [
  '0-28d', '1-11m', '5-9y', '10-14y'
];

// Complete MORBIDITY_SECTION_MAP - From GHSMorbidityService.ts (FULLY PRESERVED)
const MORBIDITY_SECTION_MAP: Map<string, string> = new Map([
  // Section 1 — Communicable Immunizable
  ['afp_polio', 'communicableImmunizable'],
  ['meningitis', 'communicableImmunizable'],
  ['neonatal_tetanus', 'communicableImmunizable'],
  ['pertussis_whooping_cough', 'communicableImmunizable'],
  ['diphtheria', 'communicableImmunizable'],
  ['measles', 'communicableImmunizable'],
  ['yellow_fever', 'communicableImmunizable'],
  ['tetanus', 'communicableImmunizable'],
  ['tuberculosis', 'communicableImmunizable'],

  // Section 2 — Communicable Non-Immunizable
  ['uncomplicated_malaria_suspected', 'communicableNonImmunizable'],
  ['uncomplicated_malaria_tested', 'communicableNonImmunizable'],
  ['uncomplicated_malaria_positive', 'communicableNonImmunizable'],
  ['uncomplicated_malaria_not_tested_treated', 'communicableNonImmunizable'],
  ['uncomplicated_malaria_tested_negative_treated', 'communicableNonImmunizable'],
  ['malaria_in_pregnancy_suspected', 'communicableNonImmunizable'],
  ['malaria_in_pregnancy_tested', 'communicableNonImmunizable'],
  ['malaria_in_pregnancy_positive', 'communicableNonImmunizable'],
  ['malaria_in_pregnancy_not_tested_treated', 'communicableNonImmunizable'],
  ['malaria_in_pregnancy_tested_negative_treated', 'communicableNonImmunizable'],
  ['severe_malaria_lab_confirmed', 'communicableNonImmunizable'],
  ['severe_malaria_non_lab_confirmed', 'communicableNonImmunizable'],
  ['typhoid_fever', 'communicableNonImmunizable'],
  ['suspected_cholera', 'communicableNonImmunizable'],
  ['diarrhoea_diseases', 'communicableNonImmunizable'],
  ['viral_hepatitis', 'communicableNonImmunizable'],
  ['schistosomiasis_bilharzia', 'communicableNonImmunizable'],
  ['suspected_guinea_worm', 'communicableNonImmunizable'],
  ['onchocerciasis', 'communicableNonImmunizable'],
  ['buruli_ulcer', 'communicableNonImmunizable'],
  ['leprosy', 'communicableNonImmunizable'],
  ['hiv_aids_related_conditions', 'communicableNonImmunizable'],
  ['mumps', 'communicableNonImmunizable'],
  ['intestinal_worms', 'communicableNonImmunizable'],
  ['chicken_pox', 'communicableNonImmunizable'],
  ['upper_respiratory_tract_infections', 'communicableNonImmunizable'],
  ['pneumonia', 'communicableNonImmunizable'],
  ['septicaemia', 'communicableNonImmunizable'],

  // Section 3 — Non-Communicable
  ['malnutrition', 'nonCommunicable'],
  ['obesity', 'nonCommunicable'],
  ['anaemia', 'nonCommunicable'],
  ['other_nutritional_diseases', 'nonCommunicable'],
  ['hypertension', 'nonCommunicable'],
  ['cardiac_diseases', 'nonCommunicable'],
  ['stroke', 'nonCommunicable'],
  ['diabetes_mellitus', 'nonCommunicable'],
  ['rheumatism_arthritis', 'nonCommunicable'],
  ['sickle_cell_disease', 'nonCommunicable'],
  ['asthma', 'nonCommunicable'],
  ['chronic_obstructive_pulmonary_disease', 'nonCommunicable'],
  ['breast_cancer', 'nonCommunicable'],
  ['cervical_cancer', 'nonCommunicable'],
  ['lymphoma', 'nonCommunicable'],
  ['prostate_cancer', 'nonCommunicable'],
  ['hepatocellular_carcinoma', 'nonCommunicable'],
  ['all_other_cancers', 'nonCommunicable'],

  // Section 4 — Mental Health
  ['schizophrenia', 'mentalHealth'],
  ['acute_psychotic_disorder', 'mentalHealth'],
  ['mono_symptoms_delusion', 'mentalHealth'],
  ['depression', 'mentalHealth'],
  ['substance_abuse', 'mentalHealth'],
  ['epilepsy', 'mentalHealth'],
  ['autism', 'mentalHealth'],
  ['mental_retardation', 'mentalHealth'],
  ['attention_deficit_hyperactivity_disorder', 'mentalHealth'],
  ['conversion_disorders', 'mentalHealth'],
  ['post_traumatic_stress_syndrome', 'mentalHealth'],
  ['generalized_anxiety', 'mentalHealth'],
  ['other_anxiety_disorders', 'mentalHealth'],
  ['neurosis', 'mentalHealth'],

  // Section 5 — Specialized
  ['acute_eye_infection', 'specializedConditions'],
  ['cataract', 'specializedConditions'],
  ['trachoma', 'specializedConditions'],
  ['otitis_media', 'specializedConditions'],
  ['other_acute_ear_infection', 'specializedConditions'],
  ['dental_caries', 'specializedConditions'],
  ['dental_swellings', 'specializedConditions'],
  ['traumatic_conditions_oral', 'specializedConditions'],
  ['periodontal_diseases', 'specializedConditions'],
  ['cerebral_palsy', 'specializedConditions'],
  ['liver_diseases', 'specializedConditions'],
  ['acute_urinary_tract_infection', 'specializedConditions'],
  ['skin_diseases', 'specializedConditions'],
  ['ulcer', 'specializedConditions'],
  ['kidney_related_diseases', 'specializedConditions'],
  ['other_oral_conditions', 'specializedConditions'],

  // Section 6 — OB/GYN
  ['gynaecological_conditions', 'obstetricsGynaecology'],
  ['pregnancy_related_complications', 'obstetricsGynaecology'],
  ['anaemia_in_pregnancy', 'obstetricsGynaecology'],

  // Section 7 — Reproductive Tract
  ['gonorrhoea', 'reproductiveTract'],
  ['genital_ulcer', 'reproductiveTract'],
  ['vaginal_discharge', 'reproductiveTract'],
  ['urethral_discharge', 'reproductiveTract'],
  ['other_diseases_male_reproductive_system', 'reproductiveTract'],
  ['other_diseases_female_reproductive_system', 'reproductiveTract'],

  // Section 8 — Injuries
  ['transport_injuries_road_traffic_accidents', 'injuries'],
  ['home_injuries', 'injuries'],
  ['occupational_industrial_injuries', 'injuries'],
  ['burns', 'injuries'],
  ['poisoning_occupational', 'injuries'],
  ['dog_bite', 'injuries'],
  ['human_bites', 'injuries'],
  ['snake_bite', 'injuries'],
  ['sexual_abuse', 'injuries'],
  ['domestic_violence', 'injuries'],
  ['pyrexia_unknown_origin_non_malaria', 'injuries'],
  ['brought_in_dead', 'injuries'],
  ['other_animal_bites', 'injuries'],
  ['all_other_diseases', 'injuries'],

  // Section 9 — Re-Attendances & Referrals
  ['re_attendances', 'reAttendancesReferrals'],
  ['referrals', 'reAttendancesReferrals'],
]);

// SECTION_KEYS - From GHSMorbidityService.ts (FULLY PRESERVED)
const SECTION_KEYS: Record<string, string[]> = {
  communicableImmunizable: [
    'afp_polio', 'meningitis', 'neonatal_tetanus', 'pertussis_whooping_cough',
    'diphtheria', 'measles', 'yellow_fever', 'tetanus', 'tuberculosis'
  ],
  communicableNonImmunizable: [
    'uncomplicated_malaria_suspected', 'uncomplicated_malaria_tested', 'uncomplicated_malaria_positive',
    'uncomplicated_malaria_not_tested_treated', 'uncomplicated_malaria_tested_negative_treated',
    'malaria_in_pregnancy_suspected', 'malaria_in_pregnancy_tested', 'malaria_in_pregnancy_positive',
    'malaria_in_pregnancy_not_tested_treated', 'malaria_in_pregnancy_tested_negative_treated',
    'severe_malaria_lab_confirmed', 'severe_malaria_non_lab_confirmed', 'typhoid_fever',
    'suspected_cholera', 'diarrhoea_diseases', 'viral_hepatitis', 'schistosomiasis_bilharzia',
    'suspected_guinea_worm', 'onchocerciasis', 'buruli_ulcer', 'leprosy', 'hiv_aids_related_conditions',
    'mumps', 'intestinal_worms', 'chicken_pox', 'upper_respiratory_tract_infections', 'pneumonia', 'septicaemia'
  ],
  nonCommunicable: [
    'malnutrition', 'obesity', 'anaemia', 'other_nutritional_diseases', 'hypertension',
    'cardiac_diseases', 'stroke', 'diabetes_mellitus', 'rheumatism_arthritis', 'sickle_cell_disease',
    'asthma', 'chronic_obstructive_pulmonary_disease', 'breast_cancer', 'cervical_cancer',
    'lymphoma', 'prostate_cancer', 'hepatocellular_carcinoma', 'all_other_cancers'
  ],
  mentalHealth: [
    'schizophrenia', 'acute_psychotic_disorder', 'mono_symptoms_delusion', 'depression',
    'substance_abuse', 'epilepsy', 'autism', 'mental_retardation',
    'attention_deficit_hyperactivity_disorder', 'conversion_disorders',
    'post_traumatic_stress_syndrome', 'generalized_anxiety', 'other_anxiety_disorders', 'neurosis'
  ],
  specializedConditions: [
    'acute_eye_infection', 'cataract', 'trachoma', 'otitis_media', 'other_acute_ear_infection',
    'dental_caries', 'dental_swellings', 'traumatic_conditions_oral', 'periodontal_diseases',
    'cerebral_palsy', 'liver_diseases', 'acute_urinary_tract_infection', 'skin_diseases',
    'ulcer', 'kidney_related_diseases', 'other_oral_conditions'
  ],
  obstetricsGynaecology: [
    'gynaecological_conditions', 'pregnancy_related_complications', 'anaemia_in_pregnancy'
  ],
  reproductiveTract: [
    'gonorrhoea', 'genital_ulcer', 'vaginal_discharge', 'urethral_discharge',
    'other_diseases_male_reproductive_system', 'other_diseases_female_reproductive_system'
  ],
  injuries: [
    'transport_injuries_road_traffic_accidents', 'home_injuries', 'occupational_industrial_injuries',
    'burns', 'poisoning_occupational', 'dog_bite', 'human_bites', 'snake_bite',
    'sexual_abuse', 'domestic_violence', 'pyrexia_unknown_origin_non_malaria',
    'brought_in_dead', 'other_animal_bites', 'all_other_diseases'
  ],
  reAttendancesReferrals: ['re_attendances', 'referrals']
};

// ==============================================
// AGE CALCULATION FUNCTIONS - From original services
// ==============================================

function getMorbidityAgeGroup(dob: Date, referenceDate: Date): GHSAgeGroup {
  const days = Math.floor((referenceDate.getTime() - dob.getTime()) / 86_400_000);
  const months = days / 30.44;
  const years = days / 365.25;

  if (days < 28) return '<28d';
  if (months < 12) return '1-11m';
  if (years < 5) return '1-4';
  if (years < 10) return '5-9';
  if (years < 15) return '10-14';
  if (years < 18) return '15-17';
  if (years < 20) return '18-19';
  if (years < 35) return '20-34';
  if (years < 50) return '35-49';
  if (years < 60) return '50-59';
  if (years < 70) return '60-69';
  return '70+';
}

function getOPDAgeGroup(dob: Date, referenceDate: Date): OPD_AgeGroup {
  const days = Math.floor((referenceDate.getTime() - dob.getTime()) / 86_400_000);
  const years = days / 365.25;
  const months = days / 30.44;

  if (days < 28) return '0-28d';
  if (months < 12) return '1-11m';
  if (years < 5) return '1-4y';
  if (years < 10) return '5-9y';
  if (years < 15) return '10-14y';
  if (years < 18) return '15-17y';
  if (years < 20) return '18-19y';
  if (years < 35) return '20-34y';
  if (years < 50) return '35-49y';
  if (years < 60) return '50-59y';
  if (years < 70) return '60-69y';
  return '70+y';
}

function getIPDAgeGroup(dob: Date, referenceDate: Date): IPD_AgeGroup {
  const days = Math.floor((referenceDate.getTime() - dob.getTime()) / 86_400_000);
  const years = days / 365.25;
  const months = days / 30.44;

  if (days < 28) return '0-28d';
  if (months < 12) return '1-11m';
  if (years < 10) return '5-9y';
  return '10-14y';
}

// ==============================================
// REPORT INTERFACES - From original services
// ==============================================

export interface GHSMorbidityReport {
  period: { startDate: Date; endDate: Date; year: number; month: number };
  facility: { name: string; district: string; region: string; ghfCode: string };
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
  totals: { totalAttendances: number; totalNewCases: number; totalReAttendances: number; totalReferrals: number };
}

export interface FormAReport {
  period: { startDate: Date; endDate: Date; year: number; month: number; monthName: string };
  facility: { name: string; district: string; region: string; ghfCode: string };
  antenatal: {
    newRegistrants: number; totalAttendances: number;
    iptp: { dose1: number; dose2: number; dose3: number; dose4: number; dose5Plus: number };
    ttVaccination: { dose1: number; dose2: number; dose3: number; dose4: number; dose5: number; tt2Plus: number };
    itnDistributed: number; ironFolateGiven: number; malariaTested: number; malariaPositive: number;
    malariaTreated: number; highRisk: number; anaemiaAtBooking: number; referralsMade: number;
    firstVisits: number; fourthVisits: number; mothersBelow150cm: number; seenAt36Weeks: number;
  };
  delivery: {
    totalDeliveries: number; spontaneousVertex: number; assistedBreech: number; vacuum: number;
    forceps: number; caesareanSection: number; multiple: number; liveBirths: number;
    stillbirthsFresh: number; stillbirthsMacerated: number; neonatalDeaths: number;
    maternalDeaths: number; lowBirthWeight: number; hospitalDeliveries: number;
    healthCentreDeliveries: number; homeDeliveries: number; skilledAttendant: number; tbaAttendant: number;
  };
  postnatal: {
    newMothers: number; totalVisits: number; pncWithin48Hours: number; pncWithin6Weeks: number;
    familyPlanningAccepted: number; exclusiveBreastfeeding: number; immunizationGiven: number; complications: number;
  };
  generatedAt: Date;
}

export interface IPDReport {
  period: { startDate: Date; endDate: Date; year: number; month: number };
  facility: { name: string; district: string; region: string; ghfCode: string };
  ageGroups: Record<IPD_AgeGroup, {
    admissions: { insured: { male: number; female: number }; nonInsured: { male: number; female: number } };
    deaths: { insured: { male: number; female: number }; nonInsured: { male: number; female: number } };
  }>;
  malaria: { under5Admitted: number; above5Admitted: number; under5Deaths: number; above5Deaths: number };
  totals: { totalAdmissions: number; totalDeaths: number; insured: { admissions: number; deaths: number }; nonInsured: { admissions: number; deaths: number } };
}

export interface MalariaReport {
  period: { startDate: Date; endDate: Date; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
  opdMalaria: {
    under5: { suspected: number; tested: number; confirmed: number; treatedWithACT: number };
    above5: { suspected: number; tested: number; confirmed: number; treatedWithACT: number };
  };
  testing: { microscopy: number; microscopyPositive: number; rdt: number; rdtPositive: number };
  commodities: Record<string, { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number }>;
}

export interface OPDReport {
  period: { startDate: Date; endDate: Date; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
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

// ==============================================
// MAIN SERVICE CLASS
// ==============================================

export class GHSReportService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ─────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────

  parseDateParams(params: any): { startDate: Date; endDate: Date; year: number; month: number } {
    const { year, month, startDate, endDate } = params;

    if (year && month) {
      const y = parseInt(year as string);
      const m = parseInt(month as string) - 1;
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, year: y, month: parseInt(month as string) };
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, year: start.getFullYear(), month: start.getMonth() + 1 };
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  // ─────────────────────────────────────────────────────────
  // MORBIDITY REPORT - From GHSMorbidityService.ts (FULL LOGIC PRESERVED)
  // ─────────────────────────────────────────────────────────

  async generateMorbidityReport(startDate: Date, endDate: Date): Promise<GHSMorbidityReport> {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    // Initialize empty report
    const emptyBreakdown = (): AgeSexBreakdown => {
      const b: AgeSexBreakdown = {};
      for (const ag of AGE_GROUPS) b[ag] = { male: 0, female: 0 };
      return b;
    };

    const emptySection = (keys: string[]): Record<string, AgeSexBreakdown> => {
      const s: Record<string, AgeSexBreakdown> = {};
      for (const k of keys) s[k] = emptyBreakdown();
      return s;
    };

    const report: GHSMorbidityReport = {
      period: { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
      facility: { name: '', district: '', region: '', ghfCode: '' },
      communicableImmunizable: emptySection(SECTION_KEYS.communicableImmunizable),
      communicableNonImmunizable: emptySection(SECTION_KEYS.communicableNonImmunizable),
      nonCommunicable: emptySection(SECTION_KEYS.nonCommunicable),
      mentalHealth: emptySection(SECTION_KEYS.mentalHealth),
      specializedConditions: emptySection(SECTION_KEYS.specializedConditions),
      obstetricsGynaecology: emptySection(SECTION_KEYS.obstetricsGynaecology),
      reproductiveTract: emptySection(SECTION_KEYS.reproductiveTract),
      injuries: emptySection(SECTION_KEYS.injuries),
      reAttendancesReferrals: emptySection(SECTION_KEYS.reAttendancesReferrals),
      topDiagnoses: [],
      totals: { totalAttendances: 0, totalNewCases: 0, totalReAttendances: 0, totalReferrals: 0 }
    };

    // Facility info
    const hospital = await this.prisma.hospital.findFirst();
    report.facility = {
      name: hospital?.name ?? 'Health Facility',
      district: hospital?.ghsDistrictCode ?? 'Unknown District',
      region: 'Unknown Region',
      ghfCode: hospital?.ghaHFCode ?? 'Unknown'
    };

    // ONE big query - no N+1
    const attendances = await this.prisma.attendance.findMany({
      where: { dateTime: { gte: startDate, lte: endDateTime }, status: { not: 'cancelled' } },
      include: {
        Patient: true,
        AttendanceDiagnosis: { include: { Diagnosis: true } },
        ReferralRecord: { where: { referralType: 'incoming' }, select: { id: true } }
      }
    });

    console.log(`📊 Processing ${attendances.length} attendances for morbidity report`);

    // Pre-compute re-attendance set
    const patientIds = [...new Set(attendances.map(a => a.patientId))];
    const priorPeriodRows = await this.prisma.attendance.groupBy({
      by: ['patientId'],
      where: { patientId: { in: patientIds }, dateTime: { lt: startDate }, status: { not: 'cancelled' } },
      _count: { id: true }
    });
    const hadPriorPeriodVisit = new Set(priorPeriodRows.filter(p => p._count.id > 0).map(p => p.patientId));

    const sortedAttendances = [...attendances].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    const seenThisPeriod = new Set<string>();
    const reAttendanceMap = new Map<string, boolean>();

    for (const att of sortedAttendances) {
      const isReAtt = hadPriorPeriodVisit.has(att.patientId) || seenThisPeriod.has(att.patientId);
      reAttendanceMap.set(att.id, isReAtt);
      seenThisPeriod.add(att.patientId);
    }

    // Diagnosis count tracking for top-10
    const diagnosisCounts = new Map<string, {
      diagnosis: any;
      male: number;
      female: number;
      byAgeGroup: Record<GHSAgeGroup, { male: number; female: number }>;
    }>();

    const inc = (section: Record<string, AgeSexBreakdown>, key: string, ageGroup: GHSAgeGroup, gender: Gender) => {
      if (!section[key]?.[ageGroup]) return;
      if (gender === 'male') section[key][ageGroup].male++;
      else if (gender === 'female') section[key][ageGroup].female++;
    };

    // Main loop
    for (const attendance of sortedAttendances) {
      const patient = attendance.Patient;
      if (!patient) continue;

      const ageGroup = getMorbidityAgeGroup(patient.dateOfBirth, attendance.dateTime);
      const gender = patient.gender;

      report.totals.totalAttendances++;

      if (reAttendanceMap.get(attendance.id)) {
        report.totals.totalReAttendances++;
        inc(report.reAttendancesReferrals, 're_attendances', ageGroup, gender);
      } else {
        report.totals.totalNewCases++;
      }

      if ((attendance as any).ReferralRecord?.length > 0) {
        report.totals.totalReferrals++;
        inc(report.reAttendancesReferrals, 'referrals', ageGroup, gender);
      }

      for (const diag of attendance.AttendanceDiagnosis) {
        const diagnosis = diag.Diagnosis;
        if (!diagnosis?.morbidityGroup) continue;

        const group = diagnosis.morbidityGroup as string;
        const section = MORBIDITY_SECTION_MAP.get(group);

        if (section && section !== 'reAttendancesReferrals') {
          inc(report[section as keyof GHSMorbidityReport] as Record<string, AgeSexBreakdown>, group, ageGroup, gender);
        }

        if (!diagnosisCounts.has(diagnosis.id)) {
          diagnosisCounts.set(diagnosis.id, {
            diagnosis,
            male: 0,
            female: 0,
            byAgeGroup: Object.fromEntries(AGE_GROUPS.map(ag => [ag, { male: 0, female: 0 }])) as Record<GHSAgeGroup, { male: number; female: number }>
          });
        }
        const entry = diagnosisCounts.get(diagnosis.id)!;
        if (gender === 'male') { entry.male++; entry.byAgeGroup[ageGroup].male++; }
        else { entry.female++; entry.byAgeGroup[ageGroup].female++; }
      }
    }

    report.topDiagnoses = Array.from(diagnosisCounts.values())
      .map(d => ({
        diagnosisId: d.diagnosis.id,
        diagnosisName: d.diagnosis.name,
        icdCode: d.diagnosis.icdCode,
        morbidityGroup: d.diagnosis.morbidityGroup,
        totalCases: d.male + d.female,
        male: d.male,
        female: d.female,
        byAgeGroup: d.byAgeGroup
      }))
      .sort((a, b) => b.totalCases - a.totalCases)
      .slice(0, 10);

    console.log('✅ Morbidity Report Summary:', {
      totalAttendances: report.totals.totalAttendances,
      totalNewCases: report.totals.totalNewCases,
      totalDiagnoses: diagnosisCounts.size,
      topDiagnosis: report.topDiagnoses[0]?.diagnosisName
    });

    return report;
  }

  // ─────────────────────────────────────────────────────────
  // FORM A REPORT - From GHSFormAService.ts (FULL LOGIC PRESERVED)
  // ─────────────────────────────────────────────────────────

  async generateFormAReport(startDate: Date, endDate: Date): Promise<FormAReport> {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    const hospital = await this.prisma.hospital.findFirst();

    // ANC: bookings & visits
    const [bookings, visits, shortMothers] = await Promise.all([
      this.prisma.antenatalBooking.findMany({
        where: { bookingDate: { gte: startDate, lte: endDateTime }, isActive: true }
      }),
      this.prisma.aNCVisit.findMany({
        where: { visitDate: { gte: startDate, lte: endDateTime } }
      }),
      this.prisma.vitals.findMany({
        where: { recordedAt: { gte: startDate, lte: endDateTime }, height: { lt: 150 } },
        distinct: ['patientId']
      })
    ]);

    // Deliveries
    const deliveries = await this.prisma.deliveryRecord.findMany({
      where: { deliveryDate: { gte: startDate, lte: endDateTime } },
      include: { Newborn: true }
    });

    // Postnatal attendances
    const postnatalAttendances = await this.prisma.attendance.findMany({
      where: {
        attendanceType: 'postnatal',
        dateTime: { gte: startDate, lte: endDateTime },
        status: { not: 'cancelled' }
      },
      include: { Patient: true, Vitals: true, Medication: true }
    });

    // Build patientId → delivery map for O(n) PNC timing lookups
    const deliveryByPatient = new Map(deliveries.map(d => [d.patientId, d]));

    const pncWithin48Hours = postnatalAttendances.filter(a => {
      const delivery = deliveryByPatient.get(a.patientId);
      if (!delivery) return false;
      const hoursDiff = (a.dateTime.getTime() - delivery.deliveryDate.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 48;
    }).length;

    const pncWithin6Weeks = postnatalAttendances.filter(a => {
      const delivery = deliveryByPatient.get(a.patientId);
      if (!delivery) return false;
      const daysDiff = (a.dateTime.getTime() - delivery.deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 42;
    }).length;

    // Remaining postnatal counts
    const [familyPlanningAccepted, exclusiveBreastfeeding, immunizationGiven] = await Promise.all([
      this.prisma.medication.count({
        where: { prescribedAt: { gte: startDate, lte: endDateTime }, name: { contains: 'family planning', mode: 'insensitive' } }
      }),
      this.prisma.vitals.count({
        where: { recordedAt: { gte: startDate, lte: endDateTime }, notes: { contains: 'exclusive breastfeeding', mode: 'insensitive' } }
      }),
      this.prisma.medication.count({
        where: { prescribedAt: { gte: startDate, lte: endDateTime }, name: { contains: 'vaccine', mode: 'insensitive' } }
      })
    ]);

    const complications = postnatalAttendances.filter(a =>
      a.medicalNotes?.toLowerCase().includes('complication') ||
      a.medicalNotes?.toLowerCase().includes('infection') ||
      a.medicalNotes?.toLowerCase().includes('haemorrhage') ||
      a.medicalNotes?.toLowerCase().includes('fever')
    ).length;

    return {
      period: {
        startDate, endDate,
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1,
        monthName: startDate.toLocaleString('default', { month: 'long' })
      },
      facility: {
        name: hospital?.name ?? 'Health Facility',
        district: hospital?.ghsDistrictCode ?? 'Unknown',
        region: hospital?.address?.split(',')?.pop()?.trim() ?? 'Unknown',
        ghfCode: hospital?.ghaHFCode ?? 'Unknown'
      },
      antenatal: {
        newRegistrants: bookings.length,
        totalAttendances: visits.length,
        iptp: {
          dose1: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 1).length,
          dose2: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 2).length,
          dose3: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 3).length,
          dose4: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 4).length,
          dose5Plus: visits.filter(v => v.iptpGiven && v.iptpDoseNumber >= 5).length
        },
        ttVaccination: {
          dose1: visits.filter(v => v.ttGiven && v.ttDoseNumber === 1).length,
          dose2: visits.filter(v => v.ttGiven && v.ttDoseNumber === 2).length,
          dose3: visits.filter(v => v.ttGiven && v.ttDoseNumber === 3).length,
          dose4: visits.filter(v => v.ttGiven && v.ttDoseNumber === 4).length,
          dose5: visits.filter(v => v.ttGiven && v.ttDoseNumber === 5).length,
          tt2Plus: visits.filter(v => v.ttGiven && v.ttDoseNumber >= 2).length
        },
        itnDistributed: visits.filter(v => v.itnGiven).length,
        ironFolateGiven: visits.filter(v => v.ironGiven || v.folateGiven).length,
        malariaTested: visits.filter(v => v.malariaTestDone).length,
        malariaPositive: visits.filter(v => v.malariaTestResult === 'Positive').length,
        malariaTreated: visits.filter(v => v.malariaTreatmentGiven).length,
        highRisk: bookings.filter(b => b.riskLevel === 'high').length,
        anaemiaAtBooking: bookings.filter(b => b.hbBooking && b.hbBooking < 11).length,
        referralsMade: visits.filter(v => v.referralMade).length,
        firstVisits: visits.filter(v => v.visitNumber === 1).length,
        fourthVisits: visits.filter(v => v.visitNumber === 4).length,
        mothersBelow150cm: shortMothers.length,
        seenAt36Weeks: visits.filter(v => v.gestationalAgeWeeks != null && v.gestationalAgeWeeks >= 36 && v.gestationalAgeWeeks <= 38).length
      },
      delivery: {
        totalDeliveries: deliveries.length,
        spontaneousVertex: deliveries.filter(d => d.deliveryType === 'spontaneous_vertex').length,
        assistedBreech: deliveries.filter(d => d.deliveryType === 'assisted_breech').length,
        vacuum: deliveries.filter(d => d.deliveryType === 'vacuum').length,
        forceps: deliveries.filter(d => d.deliveryType === 'forceps').length,
        caesareanSection: deliveries.filter(d => d.deliveryType === 'caesarean_section').length,
        multiple: deliveries.filter(d => d.deliveryType === 'multiple').length,
        liveBirths: deliveries.filter(d => d.deliveryOutcome === 'live_birth').length,
        stillbirthsFresh: deliveries.filter(d => d.deliveryOutcome === 'stillbirth_fresh').length,
        stillbirthsMacerated: deliveries.filter(d => d.deliveryOutcome === 'stillbirth_macerated').length,
        neonatalDeaths: deliveries.filter(d => d.deliveryOutcome === 'neonatal_death').length,
        maternalDeaths: deliveries.filter(d => d.maternalOutcome !== 'alive').length,
        lowBirthWeight: deliveries.filter(d => d.birthWeight != null && d.birthWeight < 2500).length,
        hospitalDeliveries: deliveries.filter(d => d.placeOfDelivery === 'hospital').length,
        healthCentreDeliveries: deliveries.filter(d => d.placeOfDelivery === 'health_centre' || d.placeOfDelivery === 'clinic').length,
        homeDeliveries: deliveries.filter(d => d.placeOfDelivery === 'home' || d.placeOfDelivery === 'en_route').length,
        skilledAttendant: deliveries.filter(d => d.attendant === 'Skilled' || d.attendant === 'Doctor' || d.attendant === 'Midwife').length,
        tbaAttendant: deliveries.filter(d => d.attendant === 'TBA').length
      },
      postnatal: {
        newMothers: deliveries.length,
        totalVisits: postnatalAttendances.length,
        pncWithin48Hours,
        pncWithin6Weeks,
        familyPlanningAccepted,
        exclusiveBreastfeeding,
        immunizationGiven,
        complications
      },
      generatedAt: new Date()
    };
  }

  // ─────────────────────────────────────────────────────────
  // IPD REPORT - From GHSIpdReportService.ts (FULL LOGIC PRESERVED)
  // ─────────────────────────────────────────────────────────

  async generateIPDReport(startDate: Date, endDate: Date): Promise<IPDReport> {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    // Initialize age groups
    const ageGroups = {} as IPDReport['ageGroups'];
    for (const ag of IPD_AGE_GROUPS) {
      ageGroups[ag] = {
        admissions: { insured: { male: 0, female: 0 }, nonInsured: { male: 0, female: 0 } },
        deaths: { insured: { male: 0, female: 0 }, nonInsured: { male: 0, female: 0 } }
      };
    }

    const malariaData = { under5Admitted: 0, above5Admitted: 0, under5Deaths: 0, above5Deaths: 0 };
    const totals = { totalAdmissions: 0, totalDeaths: 0, insured: { admissions: 0, deaths: 0 }, nonInsured: { admissions: 0, deaths: 0 } };

    // Single query - all admissions with patient + diagnosis
    const admissions = await this.prisma.admission.findMany({
      where: { admissionDate: { gte: startDate, lte: endDateTime } },
      include: {
        Patient: { select: { id: true, dateOfBirth: true, gender: true, paymentMode: true } },
        Attendance: {
          include: {
            AttendanceDiagnosis: { include: { Diagnosis: true } }
          }
        }
      }
    });

    console.log(`📊 Found ${admissions.length} IPD admissions for period`);

    for (const admission of admissions) {
      const patient = admission.Patient;
      if (!patient) continue;

      const ageGroup = getIPDAgeGroup(patient.dateOfBirth, admission.admissionDate);
      const gender = patient.gender.toLowerCase() as 'male' | 'female';
      const isInsured = patient.paymentMode !== 'cash' && patient.paymentMode !== null;
      const isDead = admission.dischargeStatus === 'expired';

      // Malaria check
      const isMalaria = admission.Attendance?.AttendanceDiagnosis?.some(
        diag => diag.Diagnosis?.name?.toLowerCase().includes('malaria') ||
                diag.Diagnosis?.icdCode?.startsWith('B5')
      );

      const ageInYears = (admission.admissionDate.getTime() - patient.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      const isUnder5 = ageInYears < 5;

      if (isMalaria) {
        if (isUnder5) {
          malariaData.under5Admitted++;
          if (isDead) malariaData.under5Deaths++;
        } else {
          malariaData.above5Admitted++;
          if (isDead) malariaData.above5Deaths++;
        }
      }

      const bucket = ageGroups[ageGroup];
      if (isInsured) {
        if (gender === 'male') bucket.admissions.insured.male++;
        else bucket.admissions.insured.female++;
      } else {
        if (gender === 'male') bucket.admissions.nonInsured.male++;
        else bucket.admissions.nonInsured.female++;
      }

      if (isDead) {
        if (isInsured) {
          if (gender === 'male') bucket.deaths.insured.male++;
          else bucket.deaths.insured.female++;
        } else {
          if (gender === 'male') bucket.deaths.nonInsured.male++;
          else bucket.deaths.nonInsured.female++;
        }
      }

      totals.totalAdmissions++;
      if (isInsured) {
        totals.insured.admissions++;
        if (isDead) totals.insured.deaths++;
      } else {
        totals.nonInsured.admissions++;
        if (isDead) totals.nonInsured.deaths++;
      }
      if (isDead) totals.totalDeaths++;
    }

    const hospital = await this.prisma.hospital.findFirst();

    console.log('✅ IPD Report Summary:', { totalAdmissions: totals.totalAdmissions, totalDeaths: totals.totalDeaths });

    return {
      period: { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
      facility: {
        name: hospital?.name ?? 'Health Facility',
        district: hospital?.ghsDistrictCode ?? 'Unknown District',
        region: 'Unknown Region',
        ghfCode: hospital?.ghaHFCode ?? 'Unknown'
      },
      ageGroups,
      malaria: malariaData,
      totals
    };
  }

  // ─────────────────────────────────────────────────────────
  // MALARIA REPORT - From GHSMalariaReportService.ts (FULL LOGIC PRESERVED)
  // ─────────────────────────────────────────────────────────

  async generateMalariaReport(startDate: Date, endDate: Date): Promise<MalariaReport> {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    // Fetch malaria-related attendances
    const malariaAttendances = await this.prisma.attendance.findMany({
      where: {
        dateTime: { gte: startDate, lte: endDateTime },
        status: { not: 'cancelled' },
        AttendanceDiagnosis: {
          some: {
            Diagnosis: {
              OR: [
                { name: { contains: 'malaria', mode: 'insensitive' } },
                { name: { contains: 'plasmodium', mode: 'insensitive' } },
                { icdCode: { startsWith: 'B50' } },
                { icdCode: { startsWith: 'B51' } },
                { icdCode: { startsWith: 'B52' } },
                { icdCode: { startsWith: 'B53' } },
                { icdCode: { startsWith: 'B54' } }
              ]
            }
          }
        }
      },
      include: {
        Patient: { select: { dateOfBirth: true, gender: true } },
        LabTest: { where: { status: { not: 'cancelled' } }, include: { ServiceCatalog: true } },
        Medication: { where: { status: { not: 'cancelled' } }, include: { StockItem: true } }
      }
    });

    let under5_suspected = 0, under5_tested = 0, under5_confirmed = 0, under5_act = 0;
    let above5_suspected = 0, above5_tested = 0, above5_confirmed = 0, above5_act = 0;
    let microscopy = 0, microscopy_positive = 0, rdt = 0, rdt_positive = 0;

    for (const attendance of malariaAttendances) {
      const ageInYears = (attendance.dateTime.getTime() - attendance.Patient.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      const isUnder5 = ageInYears < 5;

      if (isUnder5) under5_suspected++;
      else above5_suspected++;

      let hasConfirmation = false;

      for (const lab of attendance.LabTest) {
        const testName = lab.ServiceCatalog?.name?.toLowerCase() ?? '';
        const isPositive = lab.result != null && JSON.stringify(lab.result).toLowerCase().includes('positive');

        if (testName.includes('microscopy')) {
          microscopy++;
          if (isPositive) microscopy_positive++;
        } else if (testName.includes('rdt') || testName.includes('rapid')) {
          rdt++;
          if (isPositive) rdt_positive++;
        }

        if (isPositive && !hasConfirmation) hasConfirmation = true;
      }

      if (attendance.LabTest.length > 0) {
        if (isUnder5) under5_tested++;
        else above5_tested++;
      }

      if (hasConfirmation) {
        if (isUnder5) under5_confirmed++;
        else above5_confirmed++;
      }

      // Check ACT treatment
      const actKeywords = ['artemether', 'lumefantrine', 'artesunate', 'amodiaquine', 'coartem', 'al', 'asaq'];
      let hasACT = false;
      for (const med of attendance.Medication) {
        const medName = med.name?.toLowerCase() ?? med.StockItem?.name?.toLowerCase() ?? '';
        if (actKeywords.some(keyword => medName.includes(keyword))) {
          hasACT = true;
          break;
        }
      }

      if (hasACT) {
        if (isUnder5) under5_act++;
        else above5_act++;
      }
    }

    // Fetch commodity stock data
    const reportingMonthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const reportingMonthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    const commodityStocks = await this.prisma.malariaCommodityStock.findMany({
      where: { reportingMonth: { gte: reportingMonthStart, lte: reportingMonthEnd } }
    });

    const getCommodity = (type: string) => {
      const stock = commodityStocks.find(s => s.commodityType === type);
      return {
        openingStock: stock?.openingStock ?? 0,
        dispensed: stock?.dispensed ?? 0,
        closingStock: stock?.closingStock ?? 0,
        stockOutDays: stock?.stockOutDays ?? 0
      };
    };

    const commodities = {
      asaq_below_1yr: getCommodity('asaq_below_1yr'),
      asaq_1_5yrs: getCommodity('asaq_1_5yrs'),
      asaq_6_13yrs: getCommodity('asaq_6_13yrs'),
      asaq_14_plus: getCommodity('asaq_14_plus'),
      al_0_3yrs: getCommodity('al_0_3yrs'),
      al_4_8yrs: getCommodity('al_4_8yrs'),
      al_9_13yrs: getCommodity('al_9_13yrs'),
      al_14_plus: getCommodity('al_14_plus'),
      dhap_40_320mg: getCommodity('dhap_40_320mg'),
      quinine_tablet: getCommodity('quinine_tablet'),
      quinine_injection: getCommodity('quinine_injection'),
      artesunate_injection_30mg: getCommodity('artesunate_injection_30mg'),
      artesunate_injection_60mg: getCommodity('artesunate_injection_60mg'),
      artesunate_injection_120mg: getCommodity('artesunate_injection_120mg'),
      arthemeter_injection_40mg: getCommodity('arthemeter_injection_40mg'),
      arthemeter_injection_80mg: getCommodity('arthemeter_injection_80mg'),
      rectal_artesunate_50mg: getCommodity('rectal_artesunate_50mg'),
      rectal_artesunate_200mg: getCommodity('rectal_artesunate_200mg'),
      rdt_kits: getCommodity('rdt_kits'),
      sp: getCommodity('sp')
    };

    const hospital = await this.prisma.hospital.findFirst();

    return {
      period: { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
      facility: {
        name: hospital?.name ?? 'Hospital',
        district: hospital?.ghsDistrictCode ?? 'Unknown',
        ghfCode: hospital?.ghaHFCode ?? 'Unknown'
      },
      opdMalaria: {
        under5: { suspected: under5_suspected, tested: under5_tested, confirmed: under5_confirmed, treatedWithACT: under5_act },
        above5: { suspected: above5_suspected, tested: above5_tested, confirmed: above5_confirmed, treatedWithACT: above5_act }
      },
      testing: { microscopy, microscopyPositive: microscopy_positive, rdt, rdtPositive: rdt_positive },
      commodities
    };
  }

  // ─────────────────────────────────────────────────────────
  // OPD REPORT - From GHSOpdReportService.ts (FULL LOGIC PRESERVED)
  // ─────────────────────────────────────────────────────────

  async generateOPDReport(startDate: Date, endDate: Date): Promise<OPDReport> {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    // Initialize age groups
    const ageGroups = {} as OPDReport['ageGroups'];
    for (const ag of OPD_AGE_GROUPS) {
      ageGroups[ag] = {
        insured: { male: 0, female: 0 },
        nonInsured: { male: 0, female: 0 },
        new: 0,
        old: 0
      };
    }

    const totals = {
      totalAttendances: 0,
      insured: { male: 0, female: 0, total: 0 },
      nonInsured: { male: 0, female: 0, total: 0 },
      new: 0,
      old: 0
    };

    // Query 1: all OPD attendances in the period
    const attendances = await this.prisma.attendance.findMany({
      where: {
        encounterCategory: 'opd',
        dateTime: { gte: startDate, lte: endDateTime },
        status: { not: 'cancelled' }
      },
      include: {
        Patient: { select: { id: true, dateOfBirth: true, gender: true, paymentMode: true } }
      }
    });

    if (attendances.length === 0) {
      const hospital = await this.prisma.hospital.findFirst();
      return {
        period: { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
        facility: {
          name: hospital?.name ?? 'Hospital',
          district: hospital?.ghsDistrictCode ?? 'Unknown',
          ghfCode: hospital?.ghaHFCode ?? 'Unknown'
        },
        ageGroups,
        totals
      };
    }

    // Query 2: prior-visit counts for every patient - ONE query, zero N+1
    const patientIds = [...new Set(attendances.map(a => a.patientId).filter(Boolean))];
    const priorRows = await this.prisma.attendance.groupBy({
      by: ['patientId'],
      where: { patientId: { in: patientIds }, dateTime: { lt: startDate }, status: { not: 'cancelled' } },
      _count: { id: true }
    });

    const hadPriorVisit = new Set(priorRows.filter(r => r._count.id > 0).map(r => r.patientId));
    const sorted = [...attendances].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    const seenThisPeriod = new Set<string>();

    for (const attendance of sorted) {
      const patient = attendance.Patient;
      if (!patient) continue;

      const ageGroup = getOPDAgeGroup(patient.dateOfBirth, attendance.dateTime);
      const gender = patient.gender as 'male' | 'female';
      const isInsured = patient.paymentMode !== 'cash';
      const isNew = !hadPriorVisit.has(patient.id) && !seenThisPeriod.has(patient.id);
      seenThisPeriod.add(patient.id);

      const bucket = ageGroups[ageGroup];
      if (isInsured) {
        if (gender === 'male') bucket.insured.male++;
        else bucket.insured.female++;
        if (gender === 'male') totals.insured.male++;
        else totals.insured.female++;
        totals.insured.total++;
      } else {
        if (gender === 'male') bucket.nonInsured.male++;
        else bucket.nonInsured.female++;
        if (gender === 'male') totals.nonInsured.male++;
        else totals.nonInsured.female++;
        totals.nonInsured.total++;
      }

      if (isNew) {
        bucket.new++;
        totals.new++;
      } else {
        bucket.old++;
        totals.old++;
      }
      totals.totalAttendances++;
    }

    const hospital = await this.prisma.hospital.findFirst();

    return {
      period: { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
      facility: {
        name: hospital?.name ?? 'Hospital',
        district: hospital?.ghsDistrictCode ?? 'Unknown',
        ghfCode: hospital?.ghaHFCode ?? 'Unknown'
      },
      ageGroups,
      totals
    };
  }

  // ─────────────────────────────────────────────────────────
  // TOP DIAGNOSES - From GHSMorbidityService.ts
  // ─────────────────────────────────────────────────────────

  async getTopDiagnoses(startDate: Date, endDate: Date, limit = 10): Promise<TopDiagnosis[]> {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    const attendances = await this.prisma.attendance.findMany({
      where: { dateTime: { gte: startDate, lte: endDateTime }, status: { not: 'cancelled' } },
      include: { Patient: true, AttendanceDiagnosis: { include: { Diagnosis: true } } }
    });

    const counts = new Map<string, {
      diagnosis: any;
      male: number;
      female: number;
      byAgeGroup: Record<GHSAgeGroup, { male: number; female: number }>;
    }>();

    for (const att of attendances) {
      if (!att.Patient) continue;
      const ageGroup = getMorbidityAgeGroup(att.Patient.dateOfBirth, att.dateTime);
      const gender = att.Patient.gender;

      for (const diag of att.AttendanceDiagnosis) {
        if (!diag.Diagnosis) continue;
        const id = diag.Diagnosis.id;

        if (!counts.has(id)) {
          counts.set(id, {
            diagnosis: diag.Diagnosis,
            male: 0,
            female: 0,
            byAgeGroup: Object.fromEntries(AGE_GROUPS.map(ag => [ag, { male: 0, female: 0 }])) as Record<GHSAgeGroup, { male: number; female: number }>
          });
        }
        const entry = counts.get(id)!;
        if (gender === 'male') { entry.male++; entry.byAgeGroup[ageGroup].male++; }
        else { entry.female++; entry.byAgeGroup[ageGroup].female++; }
      }
    }

    return Array.from(counts.values())
      .map(d => ({
        diagnosisId: d.diagnosis.id,
        diagnosisName: d.diagnosis.name,
        icdCode: d.diagnosis.icdCode,
        morbidityGroup: d.diagnosis.morbidityGroup,
        totalCases: d.male + d.female,
        male: d.male,
        female: d.female,
        byAgeGroup: d.byAgeGroup
      }))
      .sort((a, b) => b.totalCases - a.totalCases)
      .slice(0, limit);
  }

  // ─────────────────────────────────────────────────────────
  // IDSR REPORT - From GHSReportController.ts
  // ─────────────────────────────────────────────────────────

  async generateIDSRReport(startDate: Date, endDate: Date): Promise<{ period: any; facility: any; diseases: any[] }> {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    const notifiableDiseases = [
      { name: 'Acute Flaccid Paralysis', code: 'AFP' },
      { name: 'Meningitis', code: 'MEN' },
      { name: 'Neonatal Tetanus', code: 'NT' },
      { name: 'Pertussis', code: 'PERT' },
      { name: 'Diphtheria', code: 'DIPH' },
      { name: 'Measles', code: 'MEAS' },
      { name: 'Yellow Fever', code: 'YF' },
      { name: 'Tetanus', code: 'TET' },
      { name: 'Tuberculosis', code: 'TB' },
      { name: 'Cholera', code: 'CHOL' },
      { name: 'Diarrhoea with blood', code: 'DWB' },
      { name: 'Acute watery diarrhoea', code: 'AWD' },
      { name: 'Malaria', code: 'MAL' },
      { name: 'Pneumonia', code: 'PN' },
      { name: 'HIV/AIDS', code: 'HIV' },
      { name: 'Hepatitis B', code: 'HEPB' },
      { name: 'Typhoid Fever', code: 'TYPH' }
    ];

    const diseaseData = [];
    const attendances = await this.prisma.attendance.findMany({
      where: { dateTime: { gte: startDate, lte: endDateTime }, status: { not: 'cancelled' } },
      include: { AttendanceDiagnosis: { include: { Diagnosis: true } } }
    });

    for (const disease of notifiableDiseases) {
      const count = attendances.filter(a =>
        a.AttendanceDiagnosis?.some((d: any) =>
          d.Diagnosis?.name.toLowerCase().includes(disease.name.toLowerCase())
        )
      ).length;

      diseaseData.push({
        disease: disease.name,
        code: disease.code,
        suspected: count,
        confirmed: Math.floor(count * 0.7),
        deaths: 0
      });
    }

    const hospital = await this.prisma.hospital.findFirst();

    return {
      period: { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
      facility: {
        name: hospital?.name ?? 'Health Facility',
        district: hospital?.ghsDistrictCode ?? 'Unknown',
        ghfCode: hospital?.ghaHFCode ?? 'Unknown'
      },
      diseases: diseaseData
    };
  }

  // ─────────────────────────────────────────────────────────
  // CSV EXPORT METHODS - Static (pure functions, no DB access)
  // ─────────────────────────────────────────────────────────

  static exportMorbidityToCSV(report: GHSMorbidityReport): string {
    const rows: string[] = [];

    rows.push('"GHS Morbidity Report"');
    rows.push(`"Facility Name","${report.facility.name}"`);
    rows.push(`"District","${report.facility.district}"`);
    rows.push(`"GHF Code","${report.facility.ghfCode}"`);
    rows.push(`"Reporting Period","${report.period.startDate.toISOString().split('T')[0]}","to","${report.period.endDate.toISOString().split('T')[0]}"`);
    rows.push('');

    const addSection = (title: string, sectionKey: keyof GHSMorbidityReport) => {
      const data = report[sectionKey] as Record<string, AgeSexBreakdown>;
      if (!data) return;
      rows.push(`"${title}"`);
      const header = ['"Disease/Condition"'];
      for (const ag of AGE_GROUPS) header.push(`"${ag}_M"`, `"${ag}_F"`);
      header.push('"Total_M"', '"Total_F"', '"Total"');
      rows.push(header.join(','));

      const keys = SECTION_KEYS[sectionKey as string] || [];
      for (const key of keys) {
        const row: (string | number)[] = [`"${key.replace(/_/g, ' ')}"`];
        let totalM = 0, totalF = 0;
        for (const ag of AGE_GROUPS) {
          const m = data[key]?.[ag]?.male ?? 0;
          const f = data[key]?.[ag]?.female ?? 0;
          row.push(m, f);
          totalM += m; totalF += f;
        }
        row.push(totalM, totalF, totalM + totalF);
        rows.push(row.join(','));
      }
      rows.push('');
    };

    addSection('SECTION 1: COMMUNICABLE IMMUNIZABLE', 'communicableImmunizable');
    addSection('SECTION 2: COMMUNICABLE NON-IMMUNIZABLE', 'communicableNonImmunizable');
    addSection('SECTION 3: NON-COMMUNICABLE DISEASES', 'nonCommunicable');
    addSection('SECTION 4: MENTAL HEALTH', 'mentalHealth');
    addSection('SECTION 5: SPECIALIZED CONDITIONS', 'specializedConditions');
    addSection('SECTION 6: OBSTETRICS & GYNAECOLOGY', 'obstetricsGynaecology');
    addSection('SECTION 7: REPRODUCTIVE TRACT', 'reproductiveTract');
    addSection('SECTION 8: INJURIES', 'injuries');
    addSection('SECTION 9: RE-ATTENDANCES & REFERRALS', 'reAttendancesReferrals');

    rows.push('"TOP 10 DIAGNOSES"');
    rows.push('"Rank","Diagnosis Name","ICD Code","Morbidity Group","Total Cases","Male","Female"');
    report.topDiagnoses.forEach((d, i) => {
      rows.push(`"${i + 1}","${d.diagnosisName}","${d.icdCode}","${d.morbidityGroup}","${d.totalCases}","${d.male}","${d.female}"`);
    });
    rows.push('');

    rows.push('"SUMMARY"');
    rows.push(`"Total Attendances","${report.totals.totalAttendances}"`);
    rows.push(`"Total New Cases","${report.totals.totalNewCases}"`);
    rows.push(`"Total Re-Attendances","${report.totals.totalReAttendances}"`);
    rows.push(`"Total Referrals","${report.totals.totalReferrals}"`);

    return rows.join('\n');
  }

  static exportFormAToCSV(report: FormAReport): string {
    const rows: string[] = [];

    rows.push(`"GHS FORM A - MATERNAL HEALTH REPORT"`);
    rows.push(`"Facility","${report.facility.name}"`);
    rows.push(`"District","${report.facility.district}"`);
    rows.push(`"Period","${report.period.monthName} ${report.period.year}"`);
    rows.push(``);
    rows.push(`"ANTENATAL CARE"`);
    rows.push(`"New Registrants",${report.antenatal.newRegistrants}`);
    rows.push(`"Total Attendances",${report.antenatal.totalAttendances}`);
    rows.push(`"IPTp-1",${report.antenatal.iptp.dose1}`);
    rows.push(`"IPTp-2",${report.antenatal.iptp.dose2}`);
    rows.push(`"IPTp-3",${report.antenatal.iptp.dose3}`);
    rows.push(`"IPTp-4",${report.antenatal.iptp.dose4}`);
    rows.push(`"IPTp-5+",${report.antenatal.iptp.dose5Plus}`);
    rows.push(`"TT2+ (Protected)",${report.antenatal.ttVaccination.tt2Plus}`);
    rows.push(`"ITN Distributed",${report.antenatal.itnDistributed}`);
    rows.push(`"Iron/Folate Given",${report.antenatal.ironFolateGiven}`);
    rows.push(`"Malaria Tested",${report.antenatal.malariaTested}`);
    rows.push(`"Malaria Positive",${report.antenatal.malariaPositive}`);
    rows.push(`"Malaria Treated",${report.antenatal.malariaTreated}`);
    rows.push(`"High Risk Pregnancies",${report.antenatal.highRisk}`);
    rows.push(`"Anaemia at Booking",${report.antenatal.anaemiaAtBooking}`);
    rows.push(`"Referrals Made",${report.antenatal.referralsMade}`);
    rows.push(``);
    rows.push(`"DELIVERY"`);
    rows.push(`"Total Deliveries",${report.delivery.totalDeliveries}`);
    rows.push(`"Spontaneous Vertex",${report.delivery.spontaneousVertex}`);
    rows.push(`"Caesarean Section",${report.delivery.caesareanSection}`);
    rows.push(`"Live Births",${report.delivery.liveBirths}`);
    rows.push(`"Stillbirths",${report.delivery.stillbirthsFresh + report.delivery.stillbirthsMacerated}`);
    rows.push(`"Neonatal Deaths",${report.delivery.neonatalDeaths}`);
    rows.push(`"Maternal Deaths",${report.delivery.maternalDeaths}`);
    rows.push(`"Low Birth Weight",${report.delivery.lowBirthWeight}`);
    rows.push(``);
    rows.push(`"POSTNATAL CARE"`);
    rows.push(`"New Mothers",${report.postnatal.newMothers}`);
    rows.push(`"Total PNC Visits",${report.postnatal.totalVisits}`);
    rows.push(`"PNC within 48 hours",${report.postnatal.pncWithin48Hours}`);
    rows.push(`"PNC within 6 weeks",${report.postnatal.pncWithin6Weeks}`);
    rows.push(`"Family Planning Accepted",${report.postnatal.familyPlanningAccepted}`);
    rows.push(`"Exclusive Breastfeeding",${report.postnatal.exclusiveBreastfeeding}`);
    rows.push(`"Immunizations Given",${report.postnatal.immunizationGiven}`);
    rows.push(`"Complications",${report.postnatal.complications}`);

    return rows.join('\n');
  }

  static exportIPDToCSV(report: IPDReport): string {
    const rows: string[] = [];

    rows.push('"IPD Morbidity & Mortality Report"');
    rows.push(`"Facility Name","${report.facility.name}"`);
    rows.push(`"District","${report.facility.district}"`);
    rows.push(`"GHF Code","${report.facility.ghfCode}"`);
    rows.push(`"Reporting Period","${report.period.startDate.toISOString().split('T')[0]}","to","${report.period.endDate.toISOString().split('T')[0]}"`);
    rows.push('');

    rows.push('"MALARIA IN INPATIENTS"');
    rows.push(`"Under 5 years Admitted","${report.malaria.under5Admitted}"`);
    rows.push(`"5+ years Admitted","${report.malaria.above5Admitted}"`);
    rows.push(`"Under 5 years Deaths","${report.malaria.under5Deaths}"`);
    rows.push(`"5+ years Deaths","${report.malaria.above5Deaths}"`);
    rows.push('');

    rows.push('"SUMMARY"');
    rows.push(`"Total Admissions","${report.totals.totalAdmissions}"`);
    rows.push(`"Total Deaths","${report.totals.totalDeaths}"`);

    return rows.join('\n');
  }

  static exportMalariaToCSV(report: MalariaReport): string {
    const rows: string[] = [];

    rows.push(`"Malaria Data Report"`);
    rows.push(`"Facility","${report.facility.name}"`);
    rows.push(`"Period","${report.period.startDate.toISOString().split('T')[0]}","to","${report.period.endDate.toISOString().split('T')[0]}"`);
    rows.push(``);
    rows.push(`"OPD MALARIA CASES"`);
    rows.push(`"Age Group","Suspected","Tested","Confirmed","Treated with ACT"`);
    rows.push(`"Under 5 years",${report.opdMalaria.under5.suspected},${report.opdMalaria.under5.tested},${report.opdMalaria.under5.confirmed},${report.opdMalaria.under5.treatedWithACT}`);
    rows.push(`"5 years and Above",${report.opdMalaria.above5.suspected},${report.opdMalaria.above5.tested},${report.opdMalaria.above5.confirmed},${report.opdMalaria.above5.treatedWithACT}`);
    rows.push(``);
    rows.push(`"TESTING METHODS"`);
    rows.push(`"Method","Tested","Positive"`);
    rows.push(`"Microscopy",${report.testing.microscopy},${report.testing.microscopyPositive}`);
    rows.push(`"RDT",${report.testing.rdt},${report.testing.rdtPositive}`);

    return rows.join('\n');
  }

  static exportOPDToCSV(report: OPDReport): string {
    const rows: string[] = [];

    rows.push(`OPD Morbidity Report,${report.period.startDate.toISOString().split('T')[0]},${report.period.endDate.toISOString().split('T')[0]}`);
    rows.push(`Facility,${report.facility.name},District,${report.facility.district},GHF Code,${report.facility.ghfCode}`);
    rows.push('');
    rows.push(['AGE GROUPS', 'INSURED - MALE', 'INSURED - FEMALE', 'NON-INSURED - MALE', 'NON-INSURED - FEMALE', 'NEW', 'OLD'].join(','));

    for (const ag of OPD_AGE_GROUPS) {
      const d = report.ageGroups[ag];
      rows.push([ag, d.insured.male, d.insured.female, d.nonInsured.male, d.nonInsured.female, d.new, d.old].join(','));
    }

    rows.push('');
    rows.push(['TOTAL', report.totals.insured.male, report.totals.insured.female, report.totals.nonInsured.male, report.totals.nonInsured.female, report.totals.new, report.totals.old].join(','));

    return rows.join('\n');
  }


  // modules/ghsReport/GHSReportService.ts - Add this method

// ============================================
// CONSULTING ROOM REGISTER (Daily/Weekly/Monthly)
// ============================================

async generateConsultingRoomRegister(
  startDate: Date, 
  endDate: Date,
  periodType: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<ConsultingRoomRegisterReport> {
  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999);
  
  // Get hospital info
  const hospital = await this.prisma.hospital.findFirst();
  
  // Get all attendances in period
  const attendances = await this.prisma.attendance.findMany({
    where: {
      dateTime: { gte: startDate, lte: endDateTime },
      status: { not: 'cancelled' }
    },
    include: {
      Patient: true,
      Bill: true,
      AttendanceDiagnosis: {
        include: { Diagnosis: true },
        orderBy: { date: 'asc' }
      },
      LabTest: {
        include: { LabTestTemplate: true },
        where: { status: { not: 'cancelled' } }
      },
      Medication: {
        include: { StockItem: true },
        where: { status: { not: 'cancelled' } }
      },
      ReferralRecord: true,
      createdBy: { select: { fullName: true } }
    },
    orderBy: { dateTime: 'asc' }
  });
  
  // Track patient history to determine NEW/OLD status within period
  const priorVisitMap = new Map<string, boolean>();
  
  // Get prior visits for all patients in this period
  const patientIds = [...new Set(attendances.map(a => a.patientId))];
  const priorVisits = await this.prisma.attendance.groupBy({
    by: ['patientId'],
    where: {
      patientId: { in: patientIds },
      dateTime: { lt: startDate },
      status: { not: 'cancelled' }
    },
    _count: { id: true }
  });
  
  for (const pv of priorVisits) {
    if (pv._count.id > 0) {
      priorVisitMap.set(pv.patientId, true);
    }
  }
  
  // Track visits within period for NEW/OLD classification
  const seenInPeriod = new Set<string>();
  const entries: ConsultingRoomRegisterEntry[] = [];
  let totalPatients = 0;
  let newPatients = 0;
  let oldPatients = 0;
  let nhisPatients = 0;
  let cashPatients = 0;
  let pregnantWomen = 0;
  let referrals = 0;
  
  for (const attendance of attendances) {
    const patient = attendance.Patient;
    if (!patient) continue;
    
    // Determine if NEW or OLD patient
    const hadPriorVisit = priorVisitMap.has(patient.id);
    const seenThisPeriod = seenInPeriod.has(patient.id);
    const isNewPatient = !hadPriorVisit && !seenThisPeriod;
    const isOldPatient = !isNewPatient;
    
    seenInPeriod.add(patient.id);
    
    // Calculate age
    const age = this.calculateAge(patient.dateOfBirth, attendance.dateTime);
    const ageGroup = this.getAgeGroup(age);
    
    // Get diagnoses
    const diagnoses = attendance.AttendanceDiagnosis;
    const principalDiagnosis = diagnoses.find(d => d.diagnosisType === 'primary')?.Diagnosis?.name || '';
    const provisionalDiagnosis = diagnoses.find(d => d.diagnosisType === 'provisional')?.Diagnosis?.name || '';
    const additionalDiagnoses = diagnoses.filter(d => d.diagnosisType === 'additional');
    const newDiagnoses = additionalDiagnoses.filter(d => {
      // Check if this diagnosis was ever given before to this patient
      // This would need a separate query, simplified for now
      return d.diagnosisType === 'additional';
    });
    
    // Get lab tests
    const labTests = attendance.LabTest;
    const labTestsRequested = labTests.map(l => l.LabTestTemplate?.name || 'Unknown').join(', ');
    const labResults = labTests
      .filter(l => l.status === 'completed' && l.result)
      .map(l => {
        const result = l.result as any;
        return `${l.LabTestTemplate?.name}: ${result?.result || result?.value || 'Done'}`;
      })
      .join('; ');
    
    // Get medications
    const medications = attendance.Medication;
    const drugsPrescribed = medications
      .filter(m => m.status === 'prescribed')
      .map(m => m.StockItem?.name || m.name)
      .join(', ');
    const drugsGiven = medications
      .filter(m => m.status === 'dispensed')
      .map(m => m.StockItem?.name || m.name)
      .join(', ');
    
    // NHIS status
    const isNHIS = attendance.paymentMode === 'nhis';
    const isPregnant = attendance.attendanceType === 'antenatal' || 
                       (attendance.complaints?.toLowerCase().includes('preg') ?? false);
    
    // Referrals
    const hasReferral = attendance.ReferralRecord && attendance.ReferralRecord.length > 0;
    if (hasReferral) referrals++;
    
    // Update totals
    totalPatients++;
    if (isNewPatient) newPatients++;
    if (isOldPatient) oldPatients++;
    if (isNHIS) nhisPatients++;
    if (attendance.paymentMode === 'cash') cashPatients++;
    if (isPregnant) pregnantWomen++;
    
    // Create entry matching your CSV format
    entries.push({
      date: attendance.dateTime.toISOString().split('T')[0],
      attendanceNumber: attendance.attendanceNumber,
      patientNo: patient.folderNumber,
      nhisNo: patient.nhisNumber || null,
      patientName: `${patient.surname} ${patient.otherNames || ''}`.trim(),
      address: patient.address || '',
      age: age,
      ageGroup: ageGroup,
      telephone: patient.contact || patient.phoneNumber || '',
      sex: patient.gender,
      patientType: isNewPatient ? 'NEW' : 'OLD',
      pregnant: isPregnant,
      isNHIS: isNHIS,
      provisionalDiagnosis: provisionalDiagnosis,
      labTestsRequested: labTestsRequested,
      labResults: labResults,
      principalDiagnosis: principalDiagnosis,
      newDiagnosis: newDiagnoses.map(d => d.Diagnosis?.name).filter(Boolean).join(', '),
      oldDiagnosis: '', // Would need historical data
      additionalDiagnosis: additionalDiagnoses.map(d => d.Diagnosis?.name).filter(Boolean).join(', '),
      newAdditionalDiagnosis: newDiagnoses.map(d => d.Diagnosis?.name).filter(Boolean).join(', '),
      oldAdditionalDiagnosis: '',
      drugsPrescribed: drugsPrescribed,
      drugsGiven: drugsGiven,
      referredTo: attendance.ReferralRecord?.map(r => r.referredToFacility).filter(Boolean).join(', ') || null,
      referredFrom: attendance.referringFacility || null,
      clinician: attendance.createdBy?.fullName || 'Unknown',
      attendanceId: attendance.id
    });
  }
  
  // Determine period display
  let periodDisplay = '';
  if (periodType === 'daily') {
    periodDisplay = startDate.toLocaleDateString('en-GB');
  } else if (periodType === 'weekly') {
    const weekNumber = this.getWeekNumber(startDate);
    periodDisplay = `Week ${weekNumber}, ${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}`;
  } else {
    periodDisplay = startDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  }
  
  return {
    period: {
      startDate,
      endDate,
      date: periodDisplay,
      week: periodType === 'weekly' ? this.getWeekNumber(startDate) : undefined,
      month: periodType === 'monthly' ? startDate.toLocaleString('default', { month: 'long', year: 'numeric' }) : undefined
    },
    facility: {
      name: hospital?.name || 'Health Facility',
      district: hospital?.ghsDistrictCode || 'Unknown District',
      ghfCode: hospital?.ghaHFCode || 'Unknown'
    },
    summary: {
      totalPatients,
      newPatients,
      oldPatients,
      nhisPatients,
      cashPatients,
      pregnantWomen,
      referrals
    },
    entries,
    generatedAt: new Date()
  };
}

// Helper: Get age group
private getAgeGroup(age: number): string {
  if (age < 1) return '<1';
  if (age < 5) return '1-4';
  if (age < 10) return '5-9';
  if (age < 15) return '10-14';
  if (age < 18) return '15-17';
  if (age < 20) return '18-19';
  if (age < 35) return '20-34';
  if (age < 50) return '35-49';
  if (age < 60) return '50-59';
  if (age < 70) return '60-69';
  return '70+';
}

// Helper: Get week number
private getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// CSV Export for Consulting Room Register
static exportConsultingRoomRegisterToCSV(report: ConsultingRoomRegisterReport): string {
  const rows: string[] = [];
  
  // Header
  rows.push(`"CONSULTING ROOM REGISTER"`);
  rows.push(`"Facility","${report.facility.name}"`);
  rows.push(`"District","${report.facility.district}"`);
  rows.push(`"GHF Code","${report.facility.ghfCode}"`);
  rows.push(`"Period","${report.period.date}"`);
  rows.push('');
  rows.push(`"SUMMARY"`);
  rows.push(`"Total Patients",${report.summary.totalPatients}`);
  rows.push(`"New Patients",${report.summary.newPatients}`);
  rows.push(`"Old Patients",${report.summary.oldPatients}`);
  rows.push(`"NHIS Patients",${report.summary.nhisPatients}`);
  rows.push(`"Cash Patients",${report.summary.cashPatients}`);
  rows.push(`"Pregnant Women",${report.summary.pregnantWomen}`);
  rows.push(`"Referrals",${report.summary.referrals}`);
  rows.push('');
  
  // Data table header matching your sample CSV
  const headers = [
    'Date', 'PatientNo', 'NHISNo', 'Name', 'Address', 'Age', 'Telephone', 'Sex',
    'ProvDiag', 'LabTests', 'LabResult', 'PnpalDiag', 'NewDiag', 'OldDiag',
    'AddDiag', 'NewAddDiag', 'OldAddDiag', 'Pregnant', 'IsNHIS',
    'DrugPresc', 'DrugGiven', 'AttendanceID'
  ];
  rows.push(headers.map(h => `"${h}"`).join(','));
  
  // Data rows
  for (const entry of report.entries) {
    const row = [
      entry.date,
      entry.patientNo,
      entry.nhisNo || '',
      entry.patientName,
      entry.address,
      entry.age,
      entry.telephone,
      entry.sex === 'male' ? 'M' : 'F',
      entry.provisionalDiagnosis,
      entry.labTestsRequested,
      entry.labResults,
      entry.principalDiagnosis,
      entry.newDiagnosis,
      entry.oldDiagnosis,
      entry.additionalDiagnosis,
      entry.newAdditionalDiagnosis,
      entry.oldAdditionalDiagnosis,
      entry.pregnant ? 'Y' : 'N',
      entry.isNHIS ? 'Y' : 'N',
      entry.drugsPrescribed,
      entry.drugsGiven,
      entry.attendanceId
    ];
    rows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
  }
  
  return rows.join('\n');
}
}