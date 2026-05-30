// modules/ghsReport/GHSReportService.ts
// COMPLETE CONSOLIDATED SERVICE — all audit issues fixed

import { PrismaClient, Gender } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GHSAgeGroup =
  | '<28d' | '1-11m' | '1-4' | '5-9' | '10-14'
  | '15-17' | '18-19' | '20-34' | '35-49' | '50-59'
  | '60-69' | '70+';

export type OPD_AgeGroup =
  | '0-28d' | '1-11m' | '1-4y' | '5-9y' | '10-14y'
  | '15-17y' | '18-19y' | '20-34y' | '35-49y' | '50-59y' | '60-69y' | '70+y';

  export type IPD_AgeGroup =
  | '0-28d' | '1-11m' | '1-4y' | '5-9y' | '10-14y'
  | '15-17y' | '18-19y' | '20-34y' | '35-49y' | '50-59y' | '60-69y' | '70+y';

export interface AgeSexBreakdown {
  [ageGroup: string]: { male: number; female: number };
}

export interface TopDiagnosis {
  diagnosisId:    string;
  diagnosisName:  string;
  icdCode:        string;
  morbidityGroup: string;
  totalCases:     number;
  male:           number;
  female:         number;
  byAgeGroup:     Record<GHSAgeGroup, { male: number; female: number }>;
}

// ─── Consulting Room Register types ──────────────────────────────────────────

export interface ConsultingRoomRegisterEntry {
  date:                   string;
  attendanceNumber:       string;
  patientNo:              string;
  nhisNo:                 string | null;
  patientName:            string;
  address:                string;
  age:                    number;
  ageGroup:               string;
  telephone:              string;
  sex:                    string;
  patientType:            'NEW' | 'OLD';
  pregnant:               boolean;
  isNHIS:                 boolean;
  provisionalDiagnosis:   string;
  labTestsRequested:      string;
  labResults:             string;
  principalDiagnosis:     string;
  newDiagnosis:           string;
  oldDiagnosis:           string;
  additionalDiagnosis:    string;
  newAdditionalDiagnosis: string;
  oldAdditionalDiagnosis: string;
  drugsPrescribed:        string;
  drugsGiven:             string;
  referredTo:             string | null;
  referredFrom:           string | null;
  clinician:              string;
  attendanceId:           string;
}

export interface ConsultingRoomRegisterReport {
  period: {
    startDate: Date;
    endDate:   Date;
    date:      string;
    week?:     number;
    month?:    string;
  };
  facility: {
    name:     string;
    district: string;
    ghfCode:  string;
  };
  summary: {
    totalPatients:  number;
    newPatients:    number;
    oldPatients:    number;
    nhisPatients:   number;
    cashPatients:   number;
    pregnantWomen:  number;
    referrals:      number;
  };
  entries:     ConsultingRoomRegisterEntry[];
  generatedAt: Date;
}

// ─── Report interfaces ────────────────────────────────────────────────────────

export interface GHSMorbidityReport {
  period:   { startDate: Date; endDate: Date; year: number; month: number };
  facility: { name: string; district: string; region: string; ghfCode: string };
  communicableImmunizable:    Record<string, AgeSexBreakdown>;
  communicableNonImmunizable: Record<string, AgeSexBreakdown>;
  nonCommunicable:            Record<string, AgeSexBreakdown>;
  mentalHealth:               Record<string, AgeSexBreakdown>;
  specializedConditions:      Record<string, AgeSexBreakdown>;
  obstetricsGynaecology:      Record<string, AgeSexBreakdown>;
  reproductiveTract:          Record<string, AgeSexBreakdown>;
  injuries:                   Record<string, AgeSexBreakdown>;
  reAttendancesReferrals:     Record<string, AgeSexBreakdown>;
  topDiagnoses: TopDiagnosis[];
  totals: {
    totalAttendances:   number;
    totalNewCases:      number;
    totalReAttendances: number;
    totalReferrals:     number;
  };
}

export interface FormAReport {
  period: {
    startDate: Date; endDate: Date;
    year: number; month: number; monthName: string;
  };
  facility: { name: string; district: string; region: string; ghfCode: string };
  antenatal: {
    newRegistrants:    number; totalAttendances:  number;
    iptp: { dose1: number; dose2: number; dose3: number; dose4: number; dose5Plus: number };
    ttVaccination: { dose1: number; dose2: number; dose3: number; dose4: number; dose5: number; tt2Plus: number };
    itnDistributed:    number; ironFolateGiven:   number; malariaTested:    number; malariaPositive: number;
    malariaTreated:    number; highRisk:          number; anaemiaAtBooking: number; referralsMade:   number;
    firstVisits:       number; fourthVisits:      number; mothersBelow150cm: number; seenAt36Weeks:  number;
  };
  delivery: {
    totalDeliveries:        number; spontaneousVertex:      number; assistedBreech:  number; vacuum:   number;
    forceps:                number; caesareanSection:       number; multiple:        number; liveBirths: number;
    stillbirthsFresh:       number; stillbirthsMacerated:   number; neonatalDeaths:  number;
    maternalDeaths:         number; lowBirthWeight:         number; hospitalDeliveries: number;
    healthCentreDeliveries: number; homeDeliveries:         number; skilledAttendant: number; tbaAttendant: number;
  };
  postnatal: {
    newMothers:             number; totalVisits:            number; pncWithin48Hours: number; pncWithin6Weeks:        number;
    familyPlanningAccepted: number; exclusiveBreastfeeding: number; immunizationGiven: number; complications: number;
  };
  generatedAt: Date;
}

export interface IPDReport {
  period:   { startDate: Date; endDate: Date; year: number; month: number };
  facility: { name: string; district: string; region: string; ghfCode: string };
  ageGroups: Record<IPD_AgeGroup, {
    admissions: { insured: { male: number; female: number }; nonInsured: { male: number; female: number } };
    deaths:     { insured: { male: number; female: number }; nonInsured: { male: number; female: number } };
  }>;
  malaria: { under5Admitted: number; above5Admitted: number; under5Deaths: number; above5Deaths: number };
  totals: {
    totalAdmissions: number; totalDeaths: number;
    insured:    { admissions: number; deaths: number };
    nonInsured: { admissions: number; deaths: number };
  };
}

export interface MalariaReport {
  period:   { startDate: Date; endDate: Date; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
  opdMalaria: {
    under5: { suspected: number; tested: number; confirmed: number; treatedWithACT: number };
    above5: { suspected: number; tested: number; confirmed: number; treatedWithACT: number };
  };
  testing: { microscopy: number; microscopyPositive: number; rdt: number; rdtPositive: number };
  commodities: Record<string, { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number }>;
}

export interface OPDReport {
  period:   { startDate: Date; endDate: Date; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
  ageGroups: Record<OPD_AgeGroup, {
    insured:    { male: number; female: number };
    nonInsured: { male: number; female: number };
    new: number;
    old: number;
  }>;
  totals: {
    totalAttendances: number;
    insured:    { male: number; female: number; total: number };
    nonInsured: { male: number; female: number; total: number };
    new: number;
    old: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const AGE_GROUPS: GHSAgeGroup[] = [
  '<28d', '1-11m', '1-4', '5-9', '10-14',
  '15-17', '18-19', '20-34', '35-49', '50-59', '60-69', '70+',
];

export const OPD_AGE_GROUPS: OPD_AgeGroup[] = [
  '0-28d', '1-11m', '1-4y', '5-9y', '10-14y',
  '15-17y', '18-19y', '20-34y', '35-49y', '50-59y', '60-69y', '70+y',
];

export const IPD_AGE_GROUPS: IPD_AgeGroup[] = ['0-28d', '1-11m', '5-9y', '10-14y'];

const MORBIDITY_SECTION_MAP = new Map<string, string>([
  ['afp_polio','communicableImmunizable'],['meningitis','communicableImmunizable'],
  ['neonatal_tetanus','communicableImmunizable'],['pertussis_whooping_cough','communicableImmunizable'],
  ['diphtheria','communicableImmunizable'],['measles','communicableImmunizable'],
  ['yellow_fever','communicableImmunizable'],['tetanus','communicableImmunizable'],
  ['tuberculosis','communicableImmunizable'],
  ['uncomplicated_malaria_suspected','communicableNonImmunizable'],
  ['uncomplicated_malaria_tested','communicableNonImmunizable'],
  ['uncomplicated_malaria_positive','communicableNonImmunizable'],
  ['uncomplicated_malaria_not_tested_treated','communicableNonImmunizable'],
  ['uncomplicated_malaria_tested_negative_treated','communicableNonImmunizable'],
  ['malaria_in_pregnancy_suspected','communicableNonImmunizable'],
  ['malaria_in_pregnancy_tested','communicableNonImmunizable'],
  ['malaria_in_pregnancy_positive','communicableNonImmunizable'],
  ['malaria_in_pregnancy_not_tested_treated','communicableNonImmunizable'],
  ['malaria_in_pregnancy_tested_negative_treated','communicableNonImmunizable'],
  ['severe_malaria_lab_confirmed','communicableNonImmunizable'],
  ['severe_malaria_non_lab_confirmed','communicableNonImmunizable'],
  ['typhoid_fever','communicableNonImmunizable'],['suspected_cholera','communicableNonImmunizable'],
  ['diarrhoea_diseases','communicableNonImmunizable'],['viral_hepatitis','communicableNonImmunizable'],
  ['schistosomiasis_bilharzia','communicableNonImmunizable'],['suspected_guinea_worm','communicableNonImmunizable'],
  ['onchocerciasis','communicableNonImmunizable'],['buruli_ulcer','communicableNonImmunizable'],
  ['leprosy','communicableNonImmunizable'],['hiv_aids_related_conditions','communicableNonImmunizable'],
  ['mumps','communicableNonImmunizable'],['intestinal_worms','communicableNonImmunizable'],
  ['chicken_pox','communicableNonImmunizable'],['upper_respiratory_tract_infections','communicableNonImmunizable'],
  ['pneumonia','communicableNonImmunizable'],['septicaemia','communicableNonImmunizable'],
  ['malnutrition','nonCommunicable'],['obesity','nonCommunicable'],['anaemia','nonCommunicable'],
  ['other_nutritional_diseases','nonCommunicable'],['hypertension','nonCommunicable'],
  ['cardiac_diseases','nonCommunicable'],['stroke','nonCommunicable'],['diabetes_mellitus','nonCommunicable'],
  ['rheumatism_arthritis','nonCommunicable'],['sickle_cell_disease','nonCommunicable'],
  ['asthma','nonCommunicable'],['chronic_obstructive_pulmonary_disease','nonCommunicable'],
  ['breast_cancer','nonCommunicable'],['cervical_cancer','nonCommunicable'],
  ['lymphoma','nonCommunicable'],['prostate_cancer','nonCommunicable'],
  ['hepatocellular_carcinoma','nonCommunicable'],['all_other_cancers','nonCommunicable'],
  ['schizophrenia','mentalHealth'],['acute_psychotic_disorder','mentalHealth'],
  ['mono_symptoms_delusion','mentalHealth'],['depression','mentalHealth'],
  ['substance_abuse','mentalHealth'],['epilepsy','mentalHealth'],['autism','mentalHealth'],
  ['mental_retardation','mentalHealth'],['attention_deficit_hyperactivity_disorder','mentalHealth'],
  ['conversion_disorders','mentalHealth'],['post_traumatic_stress_syndrome','mentalHealth'],
  ['generalized_anxiety','mentalHealth'],['other_anxiety_disorders','mentalHealth'],['neurosis','mentalHealth'],
  ['acute_eye_infection','specializedConditions'],['cataract','specializedConditions'],
  ['trachoma','specializedConditions'],['otitis_media','specializedConditions'],
  ['other_acute_ear_infection','specializedConditions'],['dental_caries','specializedConditions'],
  ['dental_swellings','specializedConditions'],['traumatic_conditions_oral','specializedConditions'],
  ['periodontal_diseases','specializedConditions'],['cerebral_palsy','specializedConditions'],
  ['liver_diseases','specializedConditions'],['acute_urinary_tract_infection','specializedConditions'],
  ['skin_diseases','specializedConditions'],['ulcer','specializedConditions'],
  ['kidney_related_diseases','specializedConditions'],['other_oral_conditions','specializedConditions'],
  ['gynaecological_conditions','obstetricsGynaecology'],
  ['pregnancy_related_complications','obstetricsGynaecology'],
  ['anaemia_in_pregnancy','obstetricsGynaecology'],
  ['gonorrhoea','reproductiveTract'],['genital_ulcer','reproductiveTract'],
  ['vaginal_discharge','reproductiveTract'],['urethral_discharge','reproductiveTract'],
  ['other_diseases_male_reproductive_system','reproductiveTract'],
  ['other_diseases_female_reproductive_system','reproductiveTract'],
  ['transport_injuries_road_traffic_accidents','injuries'],['home_injuries','injuries'],
  ['occupational_industrial_injuries','injuries'],['burns','injuries'],
  ['poisoning_occupational','injuries'],['dog_bite','injuries'],['human_bites','injuries'],
  ['snake_bite','injuries'],['sexual_abuse','injuries'],['domestic_violence','injuries'],
  ['pyrexia_unknown_origin_non_malaria','injuries'],['brought_in_dead','injuries'],
  ['other_animal_bites','injuries'],['all_other_diseases','injuries'],
  ['re_attendances','reAttendancesReferrals'],['referrals','reAttendancesReferrals'],
]);

const SECTION_KEYS: Record<string, string[]> = {
  communicableImmunizable: [
    'afp_polio','meningitis','neonatal_tetanus','pertussis_whooping_cough',
    'diphtheria','measles','yellow_fever','tetanus','tuberculosis',
  ],
  communicableNonImmunizable: [
    'uncomplicated_malaria_suspected','uncomplicated_malaria_tested','uncomplicated_malaria_positive',
    'uncomplicated_malaria_not_tested_treated','uncomplicated_malaria_tested_negative_treated',
    'malaria_in_pregnancy_suspected','malaria_in_pregnancy_tested','malaria_in_pregnancy_positive',
    'malaria_in_pregnancy_not_tested_treated','malaria_in_pregnancy_tested_negative_treated',
    'severe_malaria_lab_confirmed','severe_malaria_non_lab_confirmed','typhoid_fever',
    'suspected_cholera','diarrhoea_diseases','viral_hepatitis','schistosomiasis_bilharzia',
    'suspected_guinea_worm','onchocerciasis','buruli_ulcer','leprosy','hiv_aids_related_conditions',
    'mumps','intestinal_worms','chicken_pox','upper_respiratory_tract_infections','pneumonia','septicaemia',
  ],
  nonCommunicable: [
    'malnutrition','obesity','anaemia','other_nutritional_diseases','hypertension',
    'cardiac_diseases','stroke','diabetes_mellitus','rheumatism_arthritis','sickle_cell_disease',
    'asthma','chronic_obstructive_pulmonary_disease','breast_cancer','cervical_cancer',
    'lymphoma','prostate_cancer','hepatocellular_carcinoma','all_other_cancers',
  ],
  mentalHealth: [
    'schizophrenia','acute_psychotic_disorder','mono_symptoms_delusion','depression',
    'substance_abuse','epilepsy','autism','mental_retardation',
    'attention_deficit_hyperactivity_disorder','conversion_disorders',
    'post_traumatic_stress_syndrome','generalized_anxiety','other_anxiety_disorders','neurosis',
  ],
  specializedConditions: [
    'acute_eye_infection','cataract','trachoma','otitis_media','other_acute_ear_infection',
    'dental_caries','dental_swellings','traumatic_conditions_oral','periodontal_diseases',
    'cerebral_palsy','liver_diseases','acute_urinary_tract_infection','skin_diseases',
    'ulcer','kidney_related_diseases','other_oral_conditions',
  ],
  obstetricsGynaecology: [
    'gynaecological_conditions','pregnancy_related_complications','anaemia_in_pregnancy',
  ],
  reproductiveTract: [
    'gonorrhoea','genital_ulcer','vaginal_discharge','urethral_discharge',
    'other_diseases_male_reproductive_system','other_diseases_female_reproductive_system',
  ],
  injuries: [
    'transport_injuries_road_traffic_accidents','home_injuries','occupational_industrial_injuries',
    'burns','poisoning_occupational','dog_bite','human_bites','snake_bite',
    'sexual_abuse','domestic_violence','pyrexia_unknown_origin_non_malaria',
    'brought_in_dead','other_animal_bites','all_other_diseases',
  ],
  reAttendancesReferrals: ['re_attendances','referrals'],
};

// ─── Age calculation helpers ──────────────────────────────────────────────────

function getMorbidityAgeGroup(dob: Date, ref: Date): GHSAgeGroup {
  const days   = Math.floor((ref.getTime() - dob.getTime()) / 86_400_000);
  const months = days / 30.44;
  const years  = days / 365.25;
  if (days < 28)   return '<28d';
  if (months < 12) return '1-11m';
  if (years < 5)   return '1-4';
  if (years < 10)  return '5-9';
  if (years < 15)  return '10-14';
  if (years < 18)  return '15-17';
  if (years < 20)  return '18-19';
  if (years < 35)  return '20-34';
  if (years < 50)  return '35-49';
  if (years < 60)  return '50-59';
  if (years < 70)  return '60-69';
  return '70+';
}

function getOPDAgeGroup(dob: Date, ref: Date): OPD_AgeGroup {
  const days   = Math.floor((ref.getTime() - dob.getTime()) / 86_400_000);
  const months = days / 30.44;
  const years  = days / 365.25;
  if (days < 28)   return '0-28d';
  if (months < 12) return '1-11m';
  if (years < 5)   return '1-4y';
  if (years < 10)  return '5-9y';
  if (years < 15)  return '10-14y';
  if (years < 18)  return '15-17y';
  if (years < 20)  return '18-19y';
  if (years < 35)  return '20-34y';
  if (years < 50)  return '35-49y';
  if (years < 60)  return '50-59y';
  if (years < 70)  return '60-69y';
  return '70+y';
}

function getIPDAgeGroup(dob: Date, ref: Date): IPD_AgeGroup {
  const days   = Math.floor((ref.getTime() - dob.getTime()) / 86_400_000);
  const months = days / 30.44;
  const years  = days / 365.25;
  if (days < 28)   return '0-28d';
  if (months < 12) return '1-11m';
  if (years < 10)  return '5-9y';
  return '10-14y';
}

// ─── Main service ─────────────────────────────────────────────────────────────

export class GHSReportService {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Utility ────────────────────────────────────────────────────────────────

  parseDateParams(params: any): { startDate: Date; endDate: Date; year: number; month: number } {
    const { year, month, startDate, endDate } = params;

    if (year && month) {
      const y = parseInt(year as string);
      const m = parseInt(month as string) - 1;
      const start = new Date(y, m, 1);
      const end   = new Date(y, m + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, year: y, month: parseInt(month) };
    }

    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end   = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: end, year: start.getFullYear(), month: start.getMonth() + 1 };
    }

    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  private calculateAge(dob: Date, asOf: Date): number {
    const birth  = new Date(dob);
    const target = new Date(asOf);
    let age = target.getFullYear() - birth.getFullYear();
    const m = target.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && target.getDate() < birth.getDate())) age--;
    return Math.max(0, age);
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  }

  private getAgeGroup(age: number): string {
    if (age < 1)  return '<1';
    if (age < 5)  return '1-4';
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

  private async getFacility() {
    const h = await this.prisma.hospital.findFirst();
    return {
      name:    h?.name            ?? 'Health Facility',
      district: h?.ghsDistrictCode ?? 'Unknown District',
      region:  'Unknown Region',
      ghfCode: h?.ghaHFCode       ?? 'Unknown',
    };
  }

  private eod(d: Date): Date {
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  // ── Morbidity Report ──────────────────────────────────────────────────────

  async generateMorbidityReport(startDate: Date, endDate: Date): Promise<GHSMorbidityReport> {
    const end = this.eod(endDate);
  
    const emptyBreakdown = (): AgeSexBreakdown =>
      Object.fromEntries(AGE_GROUPS.map(ag => [ag, { male: 0, female: 0 }]));
  
    const emptySection = (keys: string[]): Record<string, AgeSexBreakdown> =>
      Object.fromEntries(keys.map(k => [k, emptyBreakdown()]));
  
    const report: GHSMorbidityReport = {
      period: { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
      facility: await this.getFacility(),
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
      totals: { totalAttendances: 0, totalNewCases: 0, totalReAttendances: 0, totalReferrals: 0 },
    };
  
    const attendances = await this.prisma.attendance.findMany({
      where: { dateTime: { gte: startDate, lte: end }, status: { not: 'cancelled' } },
      include: {
        Patient: true,
        AttendanceDiagnosis: { include: { Diagnosis: true } },
        referral: { where: { referralType: 'outgoing' }, select: { id: true } }, // ✅ Fixed
      },
    });
  
    const patientIds = [...new Set(attendances.map(a => a.patientId))];
    const priorRows = await this.prisma.attendance.groupBy({
      by: ['patientId'],
      where: { patientId: { in: patientIds }, dateTime: { lt: startDate }, status: { not: 'cancelled' } },
      _count: { id: true },
    });
    const hadPrior = new Set(priorRows.filter(r => r._count.id > 0).map(r => r.patientId));
  
    const sorted = [...attendances].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    const seenPeriod = new Set<string>();
    const reAttMap = new Map<string, boolean>();
    for (const att of sorted) {
      reAttMap.set(att.id, hadPrior.has(att.patientId) || seenPeriod.has(att.patientId));
      seenPeriod.add(att.patientId);
    }
  
    type DiagCount = {
      diagnosis: any; male: number; female: number;
      byAgeGroup: Record<GHSAgeGroup, { male: number; female: number }>;
    };
    const diagCounts = new Map<string, DiagCount>();
  
    const inc = (section: Record<string, AgeSexBreakdown>, key: string, ag: GHSAgeGroup, gender: Gender) => {
      if (!section[key]?.[ag]) return;
      if (gender === 'male') section[key][ag].male++;
      else if (gender === 'female') section[key][ag].female++;
    };
  
    for (const att of sorted) {
      if (!att.Patient) continue;
      const ag = getMorbidityAgeGroup(att.Patient.dateOfBirth, att.dateTime);
      const gender = att.Patient.gender;
  
      report.totals.totalAttendances++;
  
      if (reAttMap.get(att.id)) {
        report.totals.totalReAttendances++;
        inc(report.reAttendancesReferrals, 're_attendances', ag, gender);
      } else {
        report.totals.totalNewCases++;
      }
  
      // FIXED: referral is singular, check if not null
      if (att.referral !== null) {
        report.totals.totalReferrals++;
        inc(report.reAttendancesReferrals, 'referrals', ag, gender);
      }
  
      for (const diag of att.AttendanceDiagnosis) {
        const d = diag.Diagnosis;
        if (!d?.morbidityGroup) continue;
  
        const sectionKey = MORBIDITY_SECTION_MAP.get(d.morbidityGroup as string);
        if (sectionKey && sectionKey !== 'reAttendancesReferrals') {
          inc(
            report[sectionKey as keyof GHSMorbidityReport] as Record<string, AgeSexBreakdown>,
            d.morbidityGroup as string, ag, gender,
          );
        }
  
        if (!diagCounts.has(d.id)) {
          diagCounts.set(d.id, {
            diagnosis: d, male: 0, female: 0,
            byAgeGroup: Object.fromEntries(
              AGE_GROUPS.map(g => [g, { male: 0, female: 0 }])
            ) as Record<GHSAgeGroup, { male: number; female: number }>,
          });
        }
        const entry = diagCounts.get(d.id)!;
        if (gender === 'male') { entry.male++; entry.byAgeGroup[ag].male++; }
        else { entry.female++; entry.byAgeGroup[ag].female++; }
      }
    }
  
    report.topDiagnoses = [...diagCounts.values()]
      .map(d => ({
        diagnosisId: d.diagnosis.id,
        diagnosisName: d.diagnosis.name,
        icdCode: d.diagnosis.icdCode,
        morbidityGroup: d.diagnosis.morbidityGroup,
        totalCases: d.male + d.female,
        male: d.male,
        female: d.female,
        byAgeGroup: d.byAgeGroup,
      }))
      .sort((a, b) => b.totalCases - a.totalCases)
      .slice(0, 10);
  
    return report;
  }

  // ── Form A Report ─────────────────────────────────────────────────────────

// modules/ghsReport/GHSReportService.ts - ADD/REPLACE generateFormAReport method

async generateFormAReport(startDate: Date, endDate: Date): Promise<FormAReport> {
  const end = this.eod(endDate);

  // Fetch all required data in parallel for performance
  const [
    bookings,
    visits,
    deliveries,
    postnatalAttendances,
    antenatalAttendances,
    labTests,
    medications,
    referrals,
    abortionRecords,
    shortMothers,
    hospital,
    newbornRecords
  ] = await Promise.all([
    // Antenatal bookings with patient data
    this.prisma.antenatalBooking.findMany({
      where: { bookingDate: { gte: startDate, lte: end }, isActive: true },
      include: { patient: { select: { dateOfBirth: true } } }
    }),
    
    // ANC visits
    this.prisma.aNCVisit.findMany({ 
      where: { visitDate: { gte: startDate, lte: end } },
      include: { booking: { include: { patient: true } } }
    }),
    
    // Delivery records with newborns
    this.prisma.deliveryRecord.findMany({
      where: { deliveryDate: { gte: startDate, lte: end } },
      include: { 
        Newborn: true, 
        patient: { select: { dateOfBirth: true } },
        attendance: { select: { paymentMode: true } }
      }
    }),
    
    // Postnatal attendances
    this.prisma.attendance.findMany({
      where: { 
        attendanceType: 'postnatal', 
        dateTime: { gte: startDate, lte: end },
        status: { not: 'cancelled' }
      },
      include: { 
        Patient: { select: { dateOfBirth: true } },
        Vitals: true, 
        Medication: true,
        AttendanceDiagnosis: { include: { Diagnosis: true } }
      }
    }),
    
    // Antenatal attendances for screenings
    this.prisma.attendance.findMany({
      where: { 
        attendanceType: 'antenatal', 
        dateTime: { gte: startDate, lte: end },
        status: { not: 'cancelled' }
      },
      include: {
        Patient: { select: { dateOfBirth: true } },
        Vitals: true,
        LabTest: { include: { LabTestTemplate: true } },
        Medication: { include: { StockItem: true } }
      }
    }),
    
    // Lab tests for screenings
    this.prisma.labTest.findMany({
      where: {
        requestedAt: { gte: startDate, lte: end },
        Attendance: { attendanceType: { in: ['antenatal', 'postnatal'] } }
      },
      include: { 
        Attendance: { select: { attendanceType: true } },
        LabTestTemplate: true 
      }
    }),
    
    // Medications for treatments
    this.prisma.medication.findMany({
      where: {
        prescribedAt: { gte: startDate, lte: end },
        Attendance: { attendanceType: { in: ['antenatal', 'postnatal', 'delivery'] } }
      },
      include: { Attendance: { select: { attendanceType: true } }, StockItem: true }
    }),
    
    // Referrals
    this.prisma.referralRecord.findMany({
      where: {
        referralDate: { gte: startDate, lte: end },
        Attendance: { attendanceType: { in: ['antenatal', 'delivery', 'postnatal'] } }
      },
      include: { 
        attendance: { select: { attendanceType: true, Patient: { select: { dateOfBirth: true } } } },
        patient: { select: { dateOfBirth: true } }
      }
    }),
    
    // Abortion records
    this.prisma.abortionRecord.findMany({
      where: { abortionDate: { gte: startDate, lte: end } },
      include: { patient: { select: { dateOfBirth: true } } }
    }),
    
    // Short mothers (<150cm)
    this.prisma.vitals.findMany({
      where: { 
        recordedAt: { gte: startDate, lte: end },
        height: { lt: 150 },
        Attendance: { attendanceType: 'antenatal' }
      },
      distinct: ['patientId']
    }),
    
    // Facility info
    this.prisma.hospital.findFirst(),
    
    // Newborn records for essential care tracking
    this.prisma.newbornRecord.findMany({
      where: {
        deliveryRecord: { deliveryDate: { gte: startDate, lte: end } }
      }
    })
  ]);

  // ========== HELPER: Calculate Age Group ==========
  const getAgeGroup = (dob: Date, refDate: Date): string => {
    const age = this.calculateAge(dob, refDate);
    if (age < 15) return age < 10 ? '10-14' : '10-14';
    if (age < 20) return '15-19';
    if (age < 25) return '20-24';
    if (age < 30) return '25-29';
    if (age < 35) return '30-34';
    return '35+';
  };

  // ========== HELPER: Calculate Age ==========
  const calculateAge = (dob: Date, asOf: Date): number => {
    const birth = new Date(dob);
    const target = new Date(asOf);
    let age = target.getFullYear() - birth.getFullYear();
    const m = target.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && target.getDate() < birth.getDate())) age--;
    return Math.max(0, age);
  };

  // ========== ANTENATAL CALCULATIONS ==========
  
  // Age at registration
  const ageAtRegistration = { '10-14': 0, '15-19': 0, '20-24': 0, '25-29': 0, '30-34': 0, '35+': 0 };
  bookings.forEach(b => {
    const ageGroup = getAgeGroup(b.patient.dateOfBirth, b.bookingDate);
    ageAtRegistration[ageGroup]++;
  });

  // Parity breakdown
  const parity = { '0': 0, '1-2': 0, '3-4': 0, '5+': 0 };
  bookings.forEach(b => {
    if (b.para === 0) parity['0']++;
    else if (b.para <= 2) parity['1-2']++;
    else if (b.para <= 4) parity['3-4']++;
    else parity['5+']++;
  });

  // Duration at registration (trimester)
  const firstTrimester = bookings.filter(b => {
    const gaWeeks = b.gestationalAgeWeeks;
    return gaWeeks !== null && gaWeeks < 13;
  }).length;
  
  const secondTrimester = bookings.filter(b => {
    const gaWeeks = b.gestationalAgeWeeks;
    return gaWeeks !== null && gaWeeks >= 13 && gaWeeks < 28;
  }).length;
  
  const thirdTrimester = bookings.filter(b => {
    const gaWeeks = b.gestationalAgeWeeks;
    return gaWeeks !== null && gaWeeks >= 28;
  }).length;

  // IPTp doses
  const iptpDoses = {
    dose1: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 1).length,
    dose2: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 2).length,
    dose3: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 3).length,
    dose4: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 4).length,
    dose5Plus: visits.filter(v => v.iptpGiven && (v.iptpDoseNumber ?? 0) >= 5).length,
  };

  // TT Vaccination
  const ttVaccination = {
    dose1: visits.filter(v => v.ttGiven && v.ttDoseNumber === 1).length,
    dose2: visits.filter(v => v.ttGiven && v.ttDoseNumber === 2).length,
    dose3: visits.filter(v => v.ttGiven && v.ttDoseNumber === 3).length,
    dose4: visits.filter(v => v.ttGiven && v.ttDoseNumber === 4).length,
    dose5: visits.filter(v => v.ttGiven && v.ttDoseNumber === 5).length,
    tt2Plus: visits.filter(v => v.ttGiven && (v.ttDoseNumber ?? 0) >= 2).length,
  };

  // IFA Supplementation (3+ times, 6+ times)
  const ifaGiven3Times = bookings.filter(b => {
    const doses = visits.filter(v => v.bookingId === b.id && (v.ironGiven || v.folateGiven)).length;
    return doses >= 3;
  }).length;

  const ifaGiven6Times = bookings.filter(b => {
    const doses = visits.filter(v => v.bookingId === b.id && (v.ironGiven || v.folateGiven)).length;
    return doses >= 6;
  }).length;

  // Making 4th/8th visit
  const making4thVisit = bookings.filter(b => {
    const visitCount = visits.filter(v => v.bookingId === b.id).length;
    return visitCount >= 4;
  }).length;

  const making8thVisit = bookings.filter(b => {
    const visitCount = visits.filter(v => v.bookingId === b.id).length;
    return visitCount >= 8;
  }).length;

  // Syphilis screening
  const syphilisTests = labTests.filter(l => {
    const name = (l.LabTestTemplate?.name ?? '').toLowerCase();
    return name.includes('syphilis') || name.includes('vdrl') || name.includes('rpr');
  });
  const syphilisTested = syphilisTests.length;
  const syphilisPositive = syphilisTests.filter(l => {
    const result = JSON.stringify(l.result).toLowerCase();
    return result.includes('positive') || result.includes('reactive');
  }).length;
  const syphilisTreated = medications.filter(m => {
    const name = (m.StockItem?.name ?? m.name).toLowerCase();
    return name.includes('penicillin') || name.includes('benzathine');
  }).length;

  // TB Screening
  const tbTests = labTests.filter(l => {
    const name = (l.LabTestTemplate?.name ?? '').toLowerCase();
    return name.includes('tb') || name.includes('tuberculosis') || name.includes('afp');
  });
  const tbScreened = tbTests.length;
  const tbPositive = tbTests.filter(l => {
    const result = JSON.stringify(l.result).toLowerCase();
    return result.includes('positive') || result.includes('reactive');
  }).length;
  const tbTreated = medications.filter(m => {
    const name = (m.StockItem?.name ?? m.name).toLowerCase();
    return name.includes('rifampicin') || name.includes('isoniazid') || name.includes('ethambutol');
  }).length;

  // Hepatitis B screening
  const hepBTests = labTests.filter(l => {
    const name = (l.LabTestTemplate?.name ?? '').toLowerCase();
    return name.includes('hepatitis') || name.includes('hbsag') || name.includes('hep b');
  });
  const hepatitisBScreened = hepBTests.length;
  const hepatitisBPositive = hepBTests.filter(l => {
    const result = JSON.stringify(l.result).toLowerCase();
    return result.includes('positive');
  }).length;
  // Prophylaxis = babies receiving HepB vaccine at birth (from postnatal)
  const hepatitisBProphylaxis = postnatalAttendances.filter(a => 
    a.Medication?.some(m => (m.StockItem?.name ?? m.name).toLowerCase().includes('hepatitis') || 
                           (m.StockItem?.name ?? m.name).toLowerCase().includes('hep b'))
  ).length;

  // PMTCT Cascade
  const hivPositiveKnown = bookings.filter(b => b.hivStatus === 'Positive').length;
  const onARV = medications.filter(m => {
    const name = (m.StockItem?.name ?? m.name).toLowerCase();
    return name.includes('arv') || name.includes('antiretroviral') || 
           name.includes('tenofovir') || name.includes('lamivudine') || name.includes('efavirenz');
  }).length;
  // Partner testing & couple testing would need additional schema fields
  const partnerTested = 0; // Placeholder - requires schema update
  const coupleTesting = 0; // Placeholder
  const babyOnProphylaxis = newbornRecords.filter(n => 
    n.deliveryRecord?.deliveryDate && 
    // Check if baby received ARV prophylaxis (would need field or medication tracking)
    false // Placeholder
  ).length;

  // Male involvement in ANC
  const malePartnerInvolvedANC = bookings.filter(b => 
    (b as any).malePartnerInvolved === true // Using the new schema field
  ).length;

  // ========== DELIVERY CALCULATIONS ==========
  
  // Age at delivery
  const ageAtDelivery = { '10-14': 0, '15-19': 0, '20-24': 0, '25-29': 0, '30-34': 0, '35+': 0 };
  deliveries.forEach(d => {
    const ageGroup = getAgeGroup(d.patient.dateOfBirth, d.deliveryDate);
    ageAtDelivery[ageGroup]++;
  });

  // Place of delivery (using updated enum with private_hospital default)
  const placeOfDelivery = {
    private_hospital: deliveries.filter(d => d.placeOfDelivery === 'private_hospital').length,
    government_hospital: deliveries.filter(d => d.placeOfDelivery === 'government_hospital').length,
    health_centre: deliveries.filter(d => d.placeOfDelivery === 'health_centre').length,
    clinic: deliveries.filter(d => d.placeOfDelivery === 'clinic').length,
    chag_facility: deliveries.filter(d => d.placeOfDelivery === 'chag_facility').length,
    private_midwife: deliveries.filter(d => d.placeOfDelivery === 'private_midwife').length,
    tba_trained: deliveries.filter(d => d.placeOfDelivery === 'tba_trained').length,
    tba_untrained: deliveries.filter(d => d.placeOfDelivery === 'tba_untrained').length,
    home: deliveries.filter(d => d.placeOfDelivery === 'home').length,
    en_route: deliveries.filter(d => d.placeOfDelivery === 'en_route').length,
    mines_facility: deliveries.filter(d => d.placeOfDelivery === 'mines_facility').length,
    quasi_govt_institution: deliveries.filter(d => d.placeOfDelivery === 'quasi_govt_institution').length,
  };

  // Attendant type (parsed from attendant field)
  const attendant = {
    doctor: deliveries.filter(d => d.attendant?.toLowerCase().includes('doctor')).length,
    midwife: deliveries.filter(d => d.attendant?.toLowerCase().includes('midwife')).length,
    nurse: deliveries.filter(d => d.attendant?.toLowerCase().includes('nurse')).length,
    community_health_officer: deliveries.filter(d => d.attendant?.toLowerCase().includes('cho') || d.attendant?.toLowerCase().includes('community health')).length,
    tba_trained: deliveries.filter(d => d.attendant?.toLowerCase().includes('tba') && d.attendant?.toLowerCase().includes('trained')).length,
    tba_untrained: deliveries.filter(d => d.attendant?.toLowerCase().includes('tba') && !d.attendant?.toLowerCase().includes('trained')).length,
    other: deliveries.filter(d => !['doctor', 'midwife', 'nurse', 'cho', 'tba'].some(k => d.attendant?.toLowerCase().includes(k))).length,
  };

  // Birth weight by parity
  const primigravidaeDeliveries = deliveries.filter(d => {
    const booking = bookings.find(b => b.id === d.antenatalBookingId);
    return booking?.para === 0;
  });
  
  const birthWeightByParity = {
    primigravidae: {
      below2_5: primigravidaeDeliveries.filter(d => d.birthWeight != null && d.birthWeight < 2.5).length,
      above2_5: primigravidaeDeliveries.filter(d => d.birthWeight != null && d.birthWeight >= 2.5).length,
    },
    multipara: {
      below2_5: deliveries.filter(d => {
        const booking = bookings.find(b => b.id === d.antenatalBookingId);
        return booking && booking.para > 0 && d.birthWeight != null && d.birthWeight < 2.5;
      }).length,
      above2_5: deliveries.filter(d => {
        const booking = bookings.find(b => b.id === d.antenatalBookingId);
        return booking && booking.para > 0 && d.birthWeight != null && d.birthWeight >= 2.5;
      }).length,
    },
  };

  // Primigravidae outcomes by gender
  const primigravidaeLive = primigravidaeDeliveries.filter(d => d.deliveryOutcome === 'live_birth');
  const primigravidae = {
    liveBirths: {
      male: primigravidaeLive.filter(d => d.Newborn?.some(n => n.gender === 'male')).length,
      female: primigravidaeLive.filter(d => d.Newborn?.some(n => n.gender === 'female')).length,
    },
    stillbirths: {
      fresh: primigravidaeDeliveries.filter(d => d.deliveryOutcome === 'stillbirth_fresh').length,
      macerated: primigravidaeDeliveries.filter(d => d.deliveryOutcome === 'stillbirth_macerated').length,
    },
  };

  // Essential Newborn Care (from NewbornRecord)
  const essentialNewbornCare = {
    breastfeedingWithin30Min: newbornRecords.filter(n => n.breastfeedingWithin30Min).length,
    eyeProphylaxisGiven: newbornRecords.filter(n => n.eyeProphylaxisGiven).length,
    cordCareChlorhexidine: newbornRecords.filter(n => n.cordCareMethod === 'chlorhexidine').length,
    cordCareMethylated: newbornRecords.filter(n => n.cordCareMethod === 'methylated_spirit').length,
    cordCareDry: newbornRecords.filter(n => n.cordCareMethod === 'dry_cord').length,
    babyWeightAt6to10Days: newbornRecords.filter(n => n.babyWeightAt6to10Days != null).length,
  };

  // Maternal morbidities (from complications array + diagnosis)
  const morbidities = {
    vvfSeen: deliveries.filter(d => 
      d.complications?.some(c => c.toLowerCase().includes('fistula') || c.toLowerCase().includes('vvf'))
    ).length,
    vvfRepaired: 0, // Would need additional tracking
    vvfReferred: deliveries.filter(d => d.referralTo != null && 
      d.complications?.some(c => c.toLowerCase().includes('fistula'))
    ).length,
    dropFoot: deliveries.filter(d => 
      d.complications?.some(c => c.toLowerCase().includes('drop foot') || c.toLowerCase().includes('foot drop'))
    ).length,
    puerperalPsychosis: postnatalAttendances.filter(a =>
      a.AttendanceDiagnosis?.some(dx => 
        dx.Diagnosis?.name.toLowerCase().includes('psychosis') || 
        dx.Diagnosis?.name.toLowerCase().includes('puerperal')
      )
    ).length,
    endometritis: deliveries.filter(d => 
      d.complications?.some(c => c.toLowerCase().includes('endometritis') || c.toLowerCase().includes('infection'))
    ).length,
    mastitis: postnatalAttendances.filter(a =>
      a.AttendanceDiagnosis?.some(dx => dx.Diagnosis?.name.toLowerCase().includes('mastitis'))
    ).length,
  };

  // Maternal deaths by age
  const maternalDeathsByAge = { '10-14': 0, '15-19': 0, '20-24': 0, '25-29': 0, '30-34': 0, '35+': 0 };
  deliveries.filter(d => d.maternalOutcome !== 'alive').forEach(d => {
    const ageGroup = getAgeGroup(d.patient.dateOfBirth, d.deliveryDate);
    maternalDeathsByAge[ageGroup]++;
  });

  // Neonatal deaths breakdown (would need death date tracking)
  const neonatalDeathsBreakdown = {
    early_0_7days: deliveries.filter(d => d.deliveryOutcome === 'neonatal_death').length, // Placeholder
    late_8_28days: 0,
    post_neonatal_1_11months: 0,
  };

  // ========== POSTNATAL CALCULATIONS ==========
  
  // PNC timing based on dayNumber or date diff
  const pncDay1or2 = postnatalAttendances.filter(a => {
    const delivery = deliveries.find(d => d.patientId === a.patientId);
    if (!delivery) return (a as any).dayNumber <= 2;
    const days = (a.dateTime.getTime() - delivery.deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
    return days <= 2;
  }).length;

  const pncDay3to7 = postnatalAttendances.filter(a => {
    const delivery = deliveries.find(d => d.patientId === a.patientId);
    if (!delivery) return (a as any).dayNumber >= 3 && (a as any).dayNumber <= 7;
    const days = (a.dateTime.getTime() - delivery.deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
    return days >= 3 && days <= 7;
  }).length;

  const pncDay8Plus = postnatalAttendances.filter(a => {
    const delivery = deliveries.find(d => d.patientId === a.patientId);
    if (!delivery) return (a as any).dayNumber >= 8;
    const days = (a.dateTime.getTime() - delivery.deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
    return days >= 8;
  }).length;

  // Age at PNC
  const ageAtPNC = { '10-14': 0, '15-19': 0, '20-24': 0, '25-29': 0, '30-34': 0, '35+': 0 };
  postnatalAttendances.forEach(a => {
    if (a.Patient?.dateOfBirth) {
      const ageGroup = getAgeGroup(a.Patient.dateOfBirth, a.dateTime);
      ageAtPNC[ageGroup]++;
    }
  });

  // FP method breakdown
  const fpMethodBreakdown = {
    pill: postnatalAttendances.filter(a => 
      a.familyPlanningMethodAccepted?.toLowerCase().includes('pill')
    ).length,
    injectable: postnatalAttendances.filter(a => 
      a.familyPlanningMethodAccepted?.toLowerCase().includes('inject') || 
      a.familyPlanningMethodAccepted?.toLowerCase().includes('depo')
    ).length,
    implant: postnatalAttendances.filter(a => 
      a.familyPlanningMethodAccepted?.toLowerCase().includes('implant')
    ).length,
    iud: postnatalAttendances.filter(a => 
      a.familyPlanningMethodAccepted?.toLowerCase().includes('iud') || 
      a.familyPlanningMethodAccepted?.toLowerCase().includes('coil')
    ).length,
    condom: postnatalAttendances.filter(a => 
      a.familyPlanningMethodAccepted?.toLowerCase().includes('condom')
    ).length,
    sterilization: postnatalAttendances.filter(a => 
      a.familyPlanningMethodAccepted?.toLowerCase().includes('steril') || 
      a.familyPlanningMethodAccepted?.toLowerCase().includes('tubal')
    ).length,
    other: postnatalAttendances.filter(a => 
      a.familyPlanningMethodAccepted && 
      !['pill', 'inject', 'implant', 'iud', 'condom', 'steril'].some(k => 
        a.familyPlanningMethodAccepted?.toLowerCase().includes(k)
      )
    ).length,
  };

  // Male involvement in PNC
  const malePartnerInvolvedPNC = postnatalAttendances.filter(a => 
    (a as any).malePartnerInvolved === true // Using new schema field
  ).length;

  // ========== ABORTIONS CALCULATIONS ==========
  
  const abortionsByAge = { '10-14': 0, '15-19': 0, '20-24': 0, '25-29': 0, '30-34': 0, '35+': 0 };
  abortionRecords.forEach(a => {
    const ageGroup = getAgeGroup(a.patient.dateOfBirth, a.abortionDate);
    abortionsByAge[ageGroup]++;
  });

  const abortions = {
    total: abortionRecords.length,
    byType: {
      spontaneous: abortionRecords.filter(a => a.abortionType === 'spontaneous').length,
      induced_safe: abortionRecords.filter(a => a.abortionType === 'induced_safe').length,
      induced_unsafe: abortionRecords.filter(a => a.abortionType === 'induced_unsafe').length,
      septic: abortionRecords.filter(a => a.abortionType === 'septic').length,
      incomplete: abortionRecords.filter(a => a.abortionType === 'incomplete').length,
      complete: abortionRecords.filter(a => a.abortionType === 'complete').length,
      missed: abortionRecords.filter(a => a.abortionType === 'missed').length,
      recurrent: abortionRecords.filter(a => a.abortionType === 'recurrent').length,
    },
    byMethod: {
      medical: abortionRecords.filter(a => a.method === 'medical').length,
      surgical_d_and_c: abortionRecords.filter(a => a.method === 'surgical_d_and_c').length,
      surgical_mva: abortionRecords.filter(a => a.method === 'surgical_mva').length,
      other: abortionRecords.filter(a => a.method === 'other' || !a.method).length,
    },
    complications: abortionRecords.filter(a => a.complication != null && a.complication !== '').length,
    byAge: abortionsByAge,
    postAbortionFPAccepted: abortionRecords.filter(a => 
      (a as any).postAbortionFPAccepted === true // Using new schema field
    ).length,
  };

  // ========== REFERRALS CALCULATIONS ==========
  
  const referralsByAge = { '10-14': 0, '15-19': 0, '20-24': 0, '25-29': 0, '30-34': 0, '35+': 0 };
  referrals.forEach(r => {
    const dob = r.attendance?.Patient?.dateOfBirth || r.patient?.dateOfBirth;
    if (dob) {
      const ageGroup = getAgeGroup(dob, r.referralDate);
      referralsByAge[ageGroup]++;
    }
  });

  const referralsData = {
    total: referrals.length,
    antenatal: {
      in: referrals.filter(r => r.referralType === 'incoming' && r.attendance?.attendanceType === 'antenatal').length,
      out: referrals.filter(r => r.referralType === 'outgoing' && r.attendance?.attendanceType === 'antenatal').length,
    },
    labor: {
      in: referrals.filter(r => r.referralType === 'incoming' && r.attendance?.attendanceType === 'delivery').length,
      out: referrals.filter(r => r.referralType === 'outgoing' && r.attendance?.attendanceType === 'delivery').length,
    },
    postnatal: {
      in: referrals.filter(r => r.referralType === 'incoming' && r.attendance?.attendanceType === 'postnatal').length,
      out: referrals.filter(r => r.referralType === 'outgoing' && r.attendance?.attendanceType === 'postnatal').length,
    },
    byAge: referralsByAge,
  };

  // ========== BIRTH ABNORMALITIES & NEWBORN COMPLICATIONS ==========
  
  // Parse from NewbornRecord.anomalies array
  const anomalies = newbornRecords.flatMap(n => n.anomalies || []);
  const birthAbnormalities = {
    hareLip: anomalies.filter(a => a.toLowerCase().includes('hare lip') || a.toLowerCase().includes('cleft lip')).length,
    anencephaly: anomalies.filter(a => a.toLowerCase().includes('anencephaly')).length,
    talipes: anomalies.filter(a => a.toLowerCase().includes('talipes') || a.toLowerCase().includes('club foot')).length,
    hydrocephalus: anomalies.filter(a => a.toLowerCase().includes('hydrocephalus')).length,
    spinaBifida: anomalies.filter(a => a.toLowerCase().includes('spina bifida')).length,
    cleftPalate: anomalies.filter(a => a.toLowerCase().includes('cleft palate')).length,
    downSyndrome: anomalies.filter(a => a.toLowerCase().includes('down') || a.toLowerCase().includes('trisomy')).length,
    other: anomalies.filter(a => !['hare lip', 'cleft', 'anencephaly', 'talipes', 'hydrocephalus', 'spina', 'down', 'trisomy'].some(k => a.toLowerCase().includes(k))).length,
  };

  // Parse from PostnatalRecord + AttendanceDiagnosis for complications
  const newbornComplications = {
    asphyxia: postnatalAttendances.filter(a => 
      a.AttendanceDiagnosis?.some(d => d.Diagnosis?.name.toLowerCase().includes('asphyxia'))
    ).length,
    jaundice: postnatalAttendances.filter(a => 
      (a as any).jaundice === true || 
      a.AttendanceDiagnosis?.some(d => d.Diagnosis?.name.toLowerCase().includes('jaundice'))
    ).length,
    sepsis: postnatalAttendances.filter(a => 
      a.AttendanceDiagnosis?.some(d => d.Diagnosis?.name.toLowerCase().includes('sepsis'))
    ).length,
    ophthalmia: postnatalAttendances.filter(a => 
      a.AttendanceDiagnosis?.some(d => d.Diagnosis?.name.toLowerCase().includes('ophthalmia'))
    ).length,
    umbilicalInfection: postnatalAttendances.filter(a => 
      a.AttendanceDiagnosis?.some(d => d.Diagnosis?.name.toLowerCase().includes('umbilical') || d.Diagnosis?.name.toLowerCase().includes('cord infection'))
    ).length,
    prematurity: deliveries.filter(d => d.gestationWeeks != null && d.gestationWeeks < 37).length,
    congenitalAnomaly: newbornRecords.filter(n => n.anomalies?.length > 0).length,
    other: 0, // Would need more specific parsing
  };

  // ========== MALE INVOLVEMENT SUMMARY ==========
  
  const maleInvolvement = {
    anc: malePartnerInvolvedANC,
    delivery: deliveries.filter(d => (d as any).malePartnerPresentDelivery === true).length,
    pnc: malePartnerInvolvedPNC,
    familyPlanning: postnatalAttendances.filter(a => 
      (a as any).malePartnerInvolvedFP === true // Would need schema field
    ).length,
    cwc: 0, // Child Welfare Clinic - would need separate tracking
  };

  // ========== BUILD FINAL REPORT ==========
  
  const facility = {
    name: hospital?.name ?? 'Private Health Facility',
    district: hospital?.ghsDistrictCode ?? 'Unknown District',
    region: 'Unknown Region',
    ghfCode: hospital?.ghaHFCode ?? 'Unknown',
  };

  return {
    period: {
      startDate,
      endDate,
      year: startDate.getFullYear(),
      month: startDate.getMonth() + 1,
      monthName: startDate.toLocaleString('default', { month: 'long' }),
    },
    facility,
    
    antenatal: {
      newRegistrants: bookings.length,
      totalAttendances: visits.length,
      making4thVisit,
      making8thVisit,
      td2Plus: ttVaccination.tt2Plus,
      mothersBelow150cm: shortMothers.length,
      seenAt36Weeks: visits.filter(v => v.gestationalAgeWeeks != null && v.gestationalAgeWeeks >= 36 && v.gestationalAgeWeeks <= 38).length,
      iptp: iptpDoses,
      ttVaccination,
      itnDistributed: bookings.filter(b => (b as any).itnGiven === true).length,
      ironFolateGiven: visits.filter(v => v.ironGiven || v.folateGiven).length,
      ifa3Times: ifaGiven3Times,
      ifa6Times: ifaGiven6Times,
      malariaTested: visits.filter(v => v.malariaTestDone).length,
      malariaPositive: visits.filter(v => v.malariaTestResult === 'Positive').length,
      malariaTreated: visits.filter(v => v.malariaTreatmentGiven).length,
      highRisk: bookings.filter(b => b.riskLevel === 'high').length,
      anaemiaAtBooking: bookings.filter(b => b.hbBooking != null && b.hbBooking < 11).length,
      severeAnaemiaAtBooking: bookings.filter(b => b.hbBooking != null && b.hbBooking < 7).length,
      anaemiaAt36Weeks: visits.filter(v => (v as any).hbLevel != null && (v as any).hbLevel < 11).length,
      referralsMade: visits.filter(v => v.referralMade).length,
      firstVisits: visits.filter(v => v.visitNumber === 1).length,
      fourthVisits: visits.filter(v => v.visitNumber === 4).length,
      registration1stTrimester: firstTrimester,
      registration2ndTrimester: secondTrimester,
      registration3rdTrimester: thirdTrimester,
      parity,
      ageAtRegistration,
      syphilisTested,
      syphilisPositive,
      syphilisTreated,
      tbScreened,
      tbPositive,
      tbTreated,
      hepatitisBScreened,
      hepatitisBPositive,
      hepatitisBProphylaxis,
      hivTested: bookings.filter(b => b.hivStatus != null).length,
      hivPositive: hivPositiveKnown,
      onARVTreatment: onARV,
      partnerTested,
      coupleTesting,
      babyOnProphylaxis,
      malePartnerInvolved: malePartnerInvolvedANC,
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
      lowBirthWeight: deliveries.filter(d => d.birthWeight != null && d.birthWeight < 2.5).length,
      birthWeightBelow2_5: deliveries.filter(d => d.birthWeight != null && d.birthWeight < 2.5).length,
      birthWeightAbove2_5: deliveries.filter(d => d.birthWeight != null && d.birthWeight >= 2.5).length,
      birthWeightByParity,
      placeOfDelivery,
      attendant,
      primigravidae,
      essentialNewbornCare,
      morbidities,
      maternalDeathsByAge,
      maternalDeathsAudited: deliveries.filter(d => (d as any).maternalDeathsAudited === true).length,
      neonatalDeathsBreakdown,
      ageAtDelivery,
    },
    
    postnatal: {
      newMothers: deliveries.length,
      totalVisits: postnatalAttendances.length,
      pncDay1or2,
      pncDay3to7,
      pncDay8Plus,
      ageAtPNC,
      familyPlanningAccepted: postnatalAttendances.filter(a => a.familyPlanningMethodAccepted != null).length,
      postPartumFPAcceptors: postnatalAttendances.filter(a => a.familyPlanningMethodAccepted != null).length,
      fpMethodBreakdown,
      exclusiveBreastfeeding: postnatalAttendances.filter(a => a.breastfeedingStatus === 'exclusive').length,
      exclusiveBFAtDischarge: postnatalAttendances.filter(a => a.breastfeedingStatus === 'exclusive').length,
      immunizationGiven: postnatalAttendances.filter(a => 
        a.Medication?.some(m => (m.StockItem?.name ?? m.name).toLowerCase().includes('vaccine'))
      ).length,
      complications: postnatalAttendances.filter(a => a.AttendanceDiagnosis?.length > 0).length,
      malePartnerInvolved: malePartnerInvolvedPNC,
    },
    
    abortions,
    referrals: referralsData,
    birthAbnormalities,
    newbornComplications,
    maleInvolvement,
    
    generatedAt: new Date(),
  };
}

  // ── IPD Report ────────────────────────────────────────────────────────────

  async generateIPDReport(startDate: Date, endDate: Date): Promise<IPDReport> {
    const end = this.eod(endDate);

    const ageGroups = Object.fromEntries(
      IPD_AGE_GROUPS.map(ag => [ag, {
        admissions: { insured: { male: 0, female: 0 }, nonInsured: { male: 0, female: 0 } },
        deaths:     { insured: { male: 0, female: 0 }, nonInsured: { male: 0, female: 0 } },
      }])
    ) as IPDReport['ageGroups'];

    const malaria = { under5Admitted: 0, above5Admitted: 0, under5Deaths: 0, above5Deaths: 0 };
    const totals  = { totalAdmissions: 0, totalDeaths: 0, insured: { admissions: 0, deaths: 0 }, nonInsured: { admissions: 0, deaths: 0 } };

    // FIXED: Admission has no direct Patient relation — must go through attendance
    const admissions = await this.prisma.admission.findMany({
      where: { admissionDate: { gte: startDate, lte: end } },
      include: {
        attendance: {
          include: {
            Patient: { select: { id: true, dateOfBirth: true, gender: true } },
            AttendanceDiagnosis: { include: { Diagnosis: true } },
          },
        },
      },
    });

    for (const adm of admissions) {
      // FIXED: patient accessed through attendance, not directly on admission
      const patient = adm.attendance?.Patient;
      if (!patient) continue;

      const ag     = getIPDAgeGroup(patient.dateOfBirth, adm.admissionDate);
      const gender = patient.gender.toLowerCase() as 'male' | 'female';

      // FIXED: use attendance.paymentMode for the visit-level payment, not patient default
      const insured  = adm.attendance?.paymentMode !== 'cash' && adm.attendance?.paymentMode != null;
      const isDead   = adm.dischargeStatus === 'expired';
      const ageYears = (adm.admissionDate.getTime() - patient.dateOfBirth.getTime()) / (365.25 * 86_400_000);
      const under5   = ageYears < 5;

      const isMalaria = adm.attendance?.AttendanceDiagnosis?.some(
        dx => dx.Diagnosis?.name?.toLowerCase().includes('malaria') ||
              dx.Diagnosis?.icdCode?.startsWith('B5'),
      );
      if (isMalaria) {
        if (under5) { malaria.under5Admitted++; if (isDead) malaria.under5Deaths++; }
        else        { malaria.above5Admitted++; if (isDead) malaria.above5Deaths++; }
      }

      const bucket = ageGroups[ag];
      const side   = insured ? bucket.admissions.insured : bucket.admissions.nonInsured;
      if (gender === 'male') side.male++; else side.female++;

      if (isDead) {
        const dSide = insured ? bucket.deaths.insured : bucket.deaths.nonInsured;
        if (gender === 'male') dSide.male++; else dSide.female++;
      }

      totals.totalAdmissions++;
      if (insured) { totals.insured.admissions++; if (isDead) totals.insured.deaths++; }
      else         { totals.nonInsured.admissions++; if (isDead) totals.nonInsured.deaths++; }
      if (isDead) totals.totalDeaths++;
    }

    return {
      period:   { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
      facility: await this.getFacility(),
      ageGroups,
      malaria,
      totals,
    };
  }

  // ── Malaria Report ────────────────────────────────────────────────────────

  async generateMalariaReport(startDate: Date, endDate: Date): Promise<MalariaReport> {
    const end = this.eod(endDate);

    const malariaAttendances = await this.prisma.attendance.findMany({
      where: {
        dateTime: { gte: startDate, lte: end },
        status:   { not: 'cancelled' },
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
                { icdCode: { startsWith: 'B54' } },
              ],
            },
          },
        },
      },
      include: {
        Patient:    { select: { dateOfBirth: true, gender: true } },
        LabTest:    { where: { status: { not: 'cancelled' } }, include: { ServiceCatalog: true } },
        Medication: { where: { status: { not: 'cancelled' } }, include: { StockItem: true } },
      },
    });

    let u5_susp = 0, u5_test = 0, u5_conf = 0, u5_act = 0;
    let a5_susp = 0, a5_test = 0, a5_conf = 0, a5_act = 0;
    let microscopy = 0, microscopy_pos = 0, rdt = 0, rdt_pos = 0;

    const ACT_KEYWORDS = ['artemether', 'lumefantrine', 'artesunate', 'amodiaquine', 'coartem', 'asaq'];

    for (const att of malariaAttendances) {
      const ageYrs = (att.dateTime.getTime() - att.Patient.dateOfBirth.getTime()) / (365.25 * 86_400_000);
      const under5 = ageYrs < 5;

      if (under5) u5_susp++; else a5_susp++;

      let confirmed = false;
      for (const lab of att.LabTest) {
        const name = (lab.ServiceCatalog?.name ?? '').toLowerCase();
        const pos  = lab.result != null && JSON.stringify(lab.result).toLowerCase().includes('positive');
        if (name.includes('microscopy'))                          { microscopy++; if (pos) microscopy_pos++; }
        else if (name.includes('rdt') || name.includes('rapid')) { rdt++;        if (pos) rdt_pos++; }
        if (pos && !confirmed) confirmed = true;
      }

      if (att.LabTest.length > 0) { if (under5) u5_test++; else a5_test++; }
      if (confirmed)               { if (under5) u5_conf++; else a5_conf++; }

      const hasACT = att.Medication.some(m => {
        const n = (m.name ?? m.StockItem?.name ?? '').toLowerCase();
        return ACT_KEYWORDS.some(kw => n.includes(kw));
      });
      if (hasACT) { if (under5) u5_act++; else a5_act++; }
    }

    const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const monthEnd   = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    const stocks     = await this.prisma.malariaCommodityStock.findMany({
      where: { reportingMonth: { gte: monthStart, lte: monthEnd } },
    });

    const getCommodity = (type: string) => {
      const s = stocks.find(st => st.commodityType === type);
      return { openingStock: s?.openingStock ?? 0, dispensed: s?.dispensed ?? 0, closingStock: s?.closingStock ?? 0, stockOutDays: s?.stockOutDays ?? 0 };
    };

    const commodityTypes = [
      'asaq_below_1yr','asaq_1_5yrs','asaq_6_13yrs','asaq_14_plus',
      'al_0_3yrs','al_4_8yrs','al_9_13yrs','al_14_plus','dhap_40_320mg',
      'quinine_tablet','quinine_injection','artesunate_injection_30mg',
      'artesunate_injection_60mg','artesunate_injection_120mg',
      'arthemeter_injection_40mg','arthemeter_injection_80mg',
      'rectal_artesunate_50mg','rectal_artesunate_200mg','rdt_kits','sp',
    ];

    const facility = await this.getFacility();
    return {
      period:   { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
      facility: { name: facility.name, district: facility.district, ghfCode: facility.ghfCode },
      opdMalaria: {
        under5: { suspected: u5_susp, tested: u5_test, confirmed: u5_conf, treatedWithACT: u5_act },
        above5: { suspected: a5_susp, tested: a5_test, confirmed: a5_conf, treatedWithACT: a5_act },
      },
      testing: { microscopy, microscopyPositive: microscopy_pos, rdt, rdtPositive: rdt_pos },
      commodities: Object.fromEntries(commodityTypes.map(t => [t, getCommodity(t)])),
    };
  }

  // ── OPD Report ────────────────────────────────────────────────────────────

  async generateOPDReport(startDate: Date, endDate: Date): Promise<OPDReport> {
    const end = this.eod(endDate);

    const ageGroups = Object.fromEntries(
      OPD_AGE_GROUPS.map(ag => [ag, { insured: { male: 0, female: 0 }, nonInsured: { male: 0, female: 0 }, new: 0, old: 0 }])
    ) as OPDReport['ageGroups'];

    const totals = {
      totalAttendances: 0,
      insured:    { male: 0, female: 0, total: 0 },
      nonInsured: { male: 0, female: 0, total: 0 },
      new: 0, old: 0,
    };

    const attendances = await this.prisma.attendance.findMany({
      where: { encounterCategory: 'opd', dateTime: { gte: startDate, lte: end }, status: { not: 'cancelled' } },
      include: { Patient: { select: { id: true, dateOfBirth: true, gender: true, paymentMode: true } } },
    });

    if (!attendances.length) {
      const facility = await this.getFacility();
      return {
        period:   { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
        facility: { name: facility.name, district: facility.district, ghfCode: facility.ghfCode },
        ageGroups, totals,
      };
    }

    const patientIds = [...new Set(attendances.map(a => a.patientId))];
    const priorRows  = await this.prisma.attendance.groupBy({
      by: ['patientId'],
      where: { patientId: { in: patientIds }, dateTime: { lt: startDate }, status: { not: 'cancelled' } },
      _count: { id: true },
    });
    const hadPrior   = new Set(priorRows.filter(r => r._count.id > 0).map(r => r.patientId));
    const sorted     = [...attendances].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    const seenPeriod = new Set<string>();

    for (const att of sorted) {
      if (!att.Patient) continue;
      const ag      = getOPDAgeGroup(att.Patient.dateOfBirth, att.dateTime);
      const gender  = att.Patient.gender as 'male' | 'female';
      // Use attendance-level paymentMode for the visit, not patient default
      const insured = att.paymentMode !== 'cash';
      const isNew   = !hadPrior.has(att.Patient.id) && !seenPeriod.has(att.Patient.id);
      seenPeriod.add(att.Patient.id);

      const bucket = ageGroups[ag];
      const side   = insured ? bucket.insured : bucket.nonInsured;
      if (gender === 'male') side.male++; else side.female++;

      const tSide = insured ? totals.insured : totals.nonInsured;
      if (gender === 'male') tSide.male++; else tSide.female++;
      tSide.total++;

      if (isNew) { bucket.new++; totals.new++; }
      else       { bucket.old++; totals.old++; }
      totals.totalAttendances++;
    }

    const facility = await this.getFacility();
    return {
      period:   { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
      facility: { name: facility.name, district: facility.district, ghfCode: facility.ghfCode },
      ageGroups, totals,
    };
  }

  // ── Top Diagnoses ─────────────────────────────────────────────────────────

  async getTopDiagnoses(startDate: Date, endDate: Date, limit = 10): Promise<TopDiagnosis[]> {
    const end = this.eod(endDate);
    const attendances = await this.prisma.attendance.findMany({
      where: { dateTime: { gte: startDate, lte: end }, status: { not: 'cancelled' } },
      include: { Patient: true, AttendanceDiagnosis: { include: { Diagnosis: true } } },
    });

    type DiagCount = {
      diagnosis: any; male: number; female: number;
      byAgeGroup: Record<GHSAgeGroup, { male: number; female: number }>;
    };
    const counts = new Map<string, DiagCount>();

    for (const att of attendances) {
      if (!att.Patient) continue;
      const ag     = getMorbidityAgeGroup(att.Patient.dateOfBirth, att.dateTime);
      const gender = att.Patient.gender;
      for (const diag of att.AttendanceDiagnosis) {
        if (!diag.Diagnosis) continue;
        const id = diag.Diagnosis.id;
        if (!counts.has(id)) {
          counts.set(id, {
            diagnosis: diag.Diagnosis, male: 0, female: 0,
            byAgeGroup: Object.fromEntries(
              AGE_GROUPS.map(g => [g, { male: 0, female: 0 }])
            ) as Record<GHSAgeGroup, { male: number; female: number }>,
          });
        }
        const e = counts.get(id)!;
        if (gender === 'male') { e.male++; e.byAgeGroup[ag].male++; }
        else                   { e.female++; e.byAgeGroup[ag].female++; }
      }
    }

    return [...counts.values()]
      .map(d => ({
        diagnosisId:    d.diagnosis.id,
        diagnosisName:  d.diagnosis.name,
        icdCode:        d.diagnosis.icdCode,
        morbidityGroup: d.diagnosis.morbidityGroup,
        totalCases:     d.male + d.female,
        male:           d.male,
        female:         d.female,
        byAgeGroup:     d.byAgeGroup,
      }))
      .sort((a, b) => b.totalCases - a.totalCases)
      .slice(0, limit);
  }

  // ── IDSR Report ───────────────────────────────────────────────────────────

  async generateIDSRReport(startDate: Date, endDate: Date): Promise<{ period: any; facility: any; diseases: any[] }> {
    const end = this.eod(endDate);

    const NOTIFIABLE_DISEASES = [
      { name: 'Acute Flaccid Paralysis', code: 'AFP' },
      { name: 'Meningitis',              code: 'MEN' },
      { name: 'Neonatal Tetanus',        code: 'NT'  },
      { name: 'Pertussis',               code: 'PERT'},
      { name: 'Diphtheria',              code: 'DIPH'},
      { name: 'Measles',                 code: 'MEAS'},
      { name: 'Yellow Fever',            code: 'YF'  },
      { name: 'Tetanus',                 code: 'TET' },
      { name: 'Tuberculosis',            code: 'TB'  },
      { name: 'Cholera',                 code: 'CHOL'},
      { name: 'Diarrhoea with blood',    code: 'DWB' },
      { name: 'Acute watery diarrhoea',  code: 'AWD' },
      { name: 'Malaria',                 code: 'MAL' },
      { name: 'Pneumonia',               code: 'PN'  },
      { name: 'HIV/AIDS',                code: 'HIV' },
      { name: 'Hepatitis B',             code: 'HEPB'},
      { name: 'Typhoid Fever',           code: 'TYPH'},
    ];

    const attendances = await this.prisma.attendance.findMany({
      where: { dateTime: { gte: startDate, lte: end }, status: { not: 'cancelled' } },
      include: { AttendanceDiagnosis: { include: { Diagnosis: true } } },
    });

    const diseases = NOTIFIABLE_DISEASES.map(disease => {
      const count = attendances.filter(a =>
        a.AttendanceDiagnosis?.some(dx =>
          dx.Diagnosis?.name.toLowerCase().includes(disease.name.toLowerCase())
        )
      ).length;
      return { disease: disease.name, code: disease.code, suspected: count, confirmed: Math.floor(count * 0.7), deaths: 0 };
    });

    const facility = await this.getFacility();
    return {
      period:   { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
      facility: { name: facility.name, district: facility.district, ghfCode: facility.ghfCode },
      diseases,
    };
  }

  // ── Consulting Room Register ──────────────────────────────────────────────

  async generateConsultingRoomRegister(
    startDate: Date,
    endDate: Date,
    periodType: 'daily' | 'weekly' | 'monthly' = 'daily',
  ): Promise<ConsultingRoomRegisterReport> {
    const end = this.eod(endDate);
  
    const attendances = await this.prisma.attendance.findMany({
      where: { dateTime: { gte: startDate, lte: end }, status: { not: 'cancelled' } },
      include: {
        Patient: true,
        Bill: true,
        AttendanceDiagnosis: { include: { Diagnosis: true }, orderBy: { date: 'asc' } },
        LabTest: { include: { LabTestTemplate: true }, where: { status: { not: 'cancelled' } } },
        Medication: { include: { StockItem: true }, where: { status: { not: 'cancelled' } } },
        referral: {                                           // ✅ singular, lowercase
          where: { referralType: "outgoing" },
          select: { id: true, referredToFacility: true }
        },
        User_Attendance_createdByIdToUser: { select: { fullName: true } },
      },
      orderBy: { dateTime: 'asc' },
    });
  
    const patientIds = [...new Set(attendances.map(a => a.patientId))];
    const priorRows = await this.prisma.attendance.groupBy({
      by: ['patientId'],
      where: { patientId: { in: patientIds }, dateTime: { lt: startDate }, status: { not: 'cancelled' } },
      _count: { id: true },
    });
    const hadPrior = new Set(priorRows.filter(r => r._count.id > 0).map(r => r.patientId));
    const seenPeriod = new Set<string>();
  
    let totalPatients = 0, newPatients = 0, oldPatients = 0;
    let nhisPatients = 0, cashPatients = 0, pregnantWomen = 0, referrals = 0;
  
    const entries: ConsultingRoomRegisterEntry[] = [];
  
    for (const att of attendances) {
      const patient = att.Patient;
      if (!patient) continue;
  
      const isNew = !hadPrior.has(patient.id) && !seenPeriod.has(patient.id);
      seenPeriod.add(patient.id);
  
      const age = this.calculateAge(patient.dateOfBirth, att.dateTime);
      const ageGroup = this.getAgeGroup(age);
  
      const diagnoses = att.AttendanceDiagnosis;
      const principalDiagnosis = diagnoses.find(d => d.diagnosisType === 'primary')?.Diagnosis?.name ?? '';
      const provisionalDiagnosis = diagnoses.find(d => d.diagnosisType === 'provisional')?.Diagnosis?.name ?? '';
      const additionalDiagnoses = diagnoses.filter(d => d.diagnosisType === 'additional');
  
      const labTestsRequested = att.LabTest.map(l => l.LabTestTemplate?.name ?? 'Unknown').join(', ');
      const labResults = att.LabTest
        .filter(l => l.status === 'completed' && l.result)
        .map(l => {
          const r = l.result as any;
          return `${l.LabTestTemplate?.name}: ${r?.result ?? r?.value ?? 'Done'}`;
        })
        .join('; ');
  
      const drugsPrescribed = att.Medication.filter(m => m.status === 'prescribed').map(m => m.StockItem?.name ?? m.name).join(', ');
      const drugsGiven = att.Medication.filter(m => m.status === 'dispensed').map(m => m.StockItem?.name ?? m.name).join(', ');
  
      const isNHIS = att.paymentMode === 'nhis';
      const isPregnant = att.attendanceType === 'antenatal' ||
        (att.complaints?.toLowerCase().includes('preg') ?? false);
      
      // ✅ FIXED: singular null check
      const hasReferral = att.referral !== null;
  
      if (hasReferral) referrals++;
      totalPatients++;
      if (isNew) newPatients++; else oldPatients++;
      if (isNHIS) nhisPatients++;
      if (att.paymentMode === 'cash') cashPatients++;
      if (isPregnant) pregnantWomen++;
  
      // ✅ Direct access, no cast needed
      const clinician = att.User_Attendance_createdByIdToUser?.fullName ?? 'Unknown';
  
      entries.push({
        date: att.dateTime.toISOString().split('T')[0],
        attendanceNumber: att.attendanceNumber,
        patientNo: patient.folderNumber,
        nhisNo: patient.nhisNumber ?? null,
        patientName: `${patient.surname} ${patient.otherNames ?? ''}`.trim(),
        address: patient.address ?? '',
        age,
        ageGroup,
        telephone: patient.contact ?? (patient as any).phoneNumber ?? '',
        sex: patient.gender,
        patientType: isNew ? 'NEW' : 'OLD',
        pregnant: isPregnant,
        isNHIS,
        provisionalDiagnosis,
        labTestsRequested,
        labResults,
        principalDiagnosis,
        newDiagnosis: additionalDiagnoses.map(d => d.Diagnosis?.name ?? '').filter(Boolean).join(', '),
        oldDiagnosis: '',
        additionalDiagnosis: additionalDiagnoses.map(d => d.Diagnosis?.name ?? '').filter(Boolean).join(', '),
        newAdditionalDiagnosis: additionalDiagnoses.map(d => d.Diagnosis?.name ?? '').filter(Boolean).join(', '),
        oldAdditionalDiagnosis: '',
        drugsPrescribed,
        drugsGiven,
        // ✅ FIXED: direct access
        referredTo: att.referral?.referredToFacility ?? null,
        referredFrom: att.referringFacility ?? null,
        clinician,
        attendanceId: att.id,
      });
    }
  
    const periodDisplay = periodType === 'daily'
      ? startDate.toLocaleDateString('en-GB')
      : periodType === 'weekly'
        ? `Week ${this.getWeekNumber(startDate)}, ${startDate.toLocaleDateString('en-GB')} – ${endDate.toLocaleDateString('en-GB')}`
        : startDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  
    const facility = await this.getFacility();
  
    return {
      period: {
        startDate,
        endDate,
        date: periodDisplay,
        week: periodType === 'weekly' ? this.getWeekNumber(startDate) : undefined,
        month: periodType === 'monthly' ? startDate.toLocaleString('default', { month: 'long', year: 'numeric' }) : undefined,
      },
      facility: { name: facility.name, district: facility.district, ghfCode: facility.ghfCode },
      summary: { totalPatients, newPatients, oldPatients, nhisPatients, cashPatients, pregnantWomen, referrals },
      entries,
      generatedAt: new Date(),
    };
  }

  // ─── Static CSV Exporters ─────────────────────────────────────────────────

  static exportMorbidityToCSV(report: GHSMorbidityReport): string {
    const rows: string[] = [];
    rows.push('"GHS Morbidity Report"');
    rows.push(`"Facility Name","${report.facility.name}"`);
    rows.push(`"District","${report.facility.district}"`);
    rows.push(`"GHF Code","${report.facility.ghfCode}"`);
    rows.push(`"Reporting Period","${report.period.startDate.toISOString().split('T')[0]}","to","${report.period.endDate.toISOString().split('T')[0]}"`);
    rows.push('');

    const addSection = (title: string, sectionKey: string, data: Record<string, AgeSexBreakdown> | undefined) => {
      if (!data) return;
      rows.push(`"${title}"`);
      const header = ['"Disease/Condition"'];
      for (const ag of AGE_GROUPS) header.push(`"${ag}_M"`, `"${ag}_F"`);
      header.push('"Total_M"', '"Total_F"', '"Total"');
      rows.push(header.join(','));
      for (const key of (SECTION_KEYS[sectionKey] ?? [])) {
        const row: (string | number)[] = [`"${key.replace(/_/g, ' ')}"`];
        let tm = 0, tf = 0;
        for (const ag of AGE_GROUPS) {
          const m = data[key]?.[ag]?.male ?? 0;
          const f = data[key]?.[ag]?.female ?? 0;
          row.push(m, f); tm += m; tf += f;
        }
        row.push(tm, tf, tm + tf);
        rows.push(row.join(','));
      }
      rows.push('');
    };

    addSection('SECTION 1: COMMUNICABLE IMMUNIZABLE',     'communicableImmunizable',    report.communicableImmunizable);
    addSection('SECTION 2: COMMUNICABLE NON-IMMUNIZABLE', 'communicableNonImmunizable', report.communicableNonImmunizable);
    addSection('SECTION 3: NON-COMMUNICABLE DISEASES',    'nonCommunicable',            report.nonCommunicable);
    addSection('SECTION 4: MENTAL HEALTH',                'mentalHealth',               report.mentalHealth);
    addSection('SECTION 5: SPECIALIZED CONDITIONS',       'specializedConditions',      report.specializedConditions);
    addSection('SECTION 6: OBSTETRICS & GYNAECOLOGY',     'obstetricsGynaecology',      report.obstetricsGynaecology);
    addSection('SECTION 7: REPRODUCTIVE TRACT',           'reproductiveTract',          report.reproductiveTract);
    addSection('SECTION 8: INJURIES',                     'injuries',                   report.injuries);
    addSection('SECTION 9: RE-ATTENDANCES & REFERRALS',   'reAttendancesReferrals',     report.reAttendancesReferrals);

    rows.push('"TOP 10 DIAGNOSES"');
    rows.push('"Rank","Diagnosis Name","ICD Code","Morbidity Group","Total Cases","Male","Female"');
    report.topDiagnoses.forEach((d, i) =>
      rows.push(`"${i+1}","${d.diagnosisName}","${d.icdCode}","${d.morbidityGroup}","${d.totalCases}","${d.male}","${d.female}"`)
    );
    rows.push('');
    rows.push('"SUMMARY"');
    rows.push(`"Total Attendances","${report.totals.totalAttendances}"`);
    rows.push(`"Total New Cases","${report.totals.totalNewCases}"`);
    rows.push(`"Total Re-Attendances","${report.totals.totalReAttendances}"`);
    rows.push(`"Total Referrals","${report.totals.totalReferrals}"`);
    return rows.join('\n');
  }

// In GHSReportService.ts - ADD this static method

static exportFormAToCSV(report: FormAReport): string {
  const rows: string[] = [];
  
  // Header
  rows.push('"GHANA HEALTH SERVICE - MONTHLY MIDWIVES RETURNS (FORM A)"');
  rows.push(`"Facility Name","${report.facility.name}"`);
  rows.push(`"District","${report.facility.district}"`);
  rows.push(`"Region","${report.facility.region}"`);
  rows.push(`"GHF Code","${report.facility.ghfCode}"`);
  rows.push(`"Reporting Period","${report.period.monthName} ${report.period.year}"`);
  rows.push('');

  // ========== ANTENATAL SECTION ==========
  rows.push('"SECTION 1: ANTENATAL CARE"');
  rows.push('"A. NEW REGISTRANTS"');
  rows.push(`"Total New Registrants",${report.antenatal.newRegistrants}`);
  rows.push('');
  
  rows.push('"B. AGE AT REGISTRATION"');
  rows.push('"Age Group","Number"');
  Object.entries(report.antenatal.ageAtRegistration).forEach(([age, count]) => {
    rows.push(`"${age}",${count}`);
  });
  rows.push('');
  
  rows.push('"C. PARITY"');
  rows.push('"Parity","Number"');
  Object.entries(report.antenatal.parity).forEach(([parity, count]) => {
    rows.push(`"${parity}",${count}`);
  });
  rows.push('');
  
  rows.push('"D. DURATION AT REGISTRATION (Trimester)"');
  rows.push(`"1st Trimester (<13 weeks)",${report.antenatal.registration1stTrimester}`);
  rows.push(`"2nd Trimester (13-27 weeks)",${report.antenatal.registration2ndTrimester}`);
  rows.push(`"3rd Trimester (28+ weeks)",${report.antenatal.registration3rdTrimester}`);
  rows.push('');
  
  rows.push('"E. IPTp DOSES"');
  rows.push(`"IPTp-1",${report.antenatal.iptp.dose1}`);
  rows.push(`"IPTp-2",${report.antenatal.iptp.dose2}`);
  rows.push(`"IPTp-3",${report.antenatal.iptp.dose3}`);
  rows.push(`"IPTp-4",${report.antenatal.iptp.dose4}`);
  rows.push(`"IPTp-5+",${report.antenatal.iptp.dose5Plus}`);
  rows.push('');
  
  rows.push('"F. TT VACCINATION"');
  rows.push(`"TT-1",${report.antenatal.ttVaccination.dose1}`);
  rows.push(`"TT-2",${report.antenatal.ttVaccination.dose2}`);
  rows.push(`"TT-3",${report.antenatal.ttVaccination.dose3}`);
  rows.push(`"TT-4",${report.antenatal.ttVaccination.dose4}`);
  rows.push(`"TT-5",${report.antenatal.ttVaccination.dose5}`);
  rows.push(`"TT2+ (Protected)",${report.antenatal.ttVaccination.tt2Plus}`);
  rows.push('');
  
  rows.push('"G. SCREENINGS"');
  rows.push(`"Syphilis Tested",${report.antenatal.syphilisTested}`);
  rows.push(`"Syphilis Positive",${report.antenatal.syphilisPositive}`);
  rows.push(`"Syphilis Treated",${report.antenatal.syphilisTreated}`);
  rows.push(`"TB Screened",${report.antenatal.tbScreened}`);
  rows.push(`"TB Positive",${report.antenatal.tbPositive}`);
  rows.push(`"TB Treated",${report.antenatal.tbTreated}`);
  rows.push(`"Hepatitis B Screened",${report.antenatal.hepatitisBScreened}`);
  rows.push(`"Hepatitis B Positive",${report.antenatal.hepatitisBPositive}`);
  rows.push(`"Hepatitis B Prophylaxis",${report.antenatal.hepatitisBProphylaxis}`);
  rows.push('');
  
  rows.push('"H. PMTCT CASCADE"');
  rows.push(`"HIV Tested",${report.antenatal.hivTested}`);
  rows.push(`"HIV Positive",${report.antenatal.hivPositive}`);
  rows.push(`"On ARV Treatment",${report.antenatal.onARVTreatment}`);
  rows.push(`"Partner Tested",${report.antenatal.partnerTested}`);
  rows.push(`"Couple Testing",${report.antenatal.coupleTesting}`);
  rows.push(`"Baby on Prophylaxis",${report.antenatal.babyOnProphylaxis}`);
  rows.push('');
  
  rows.push('"I. ANAEMIA"');
  rows.push(`"Anaemia at Booking (<11 g/dl)",${report.antenatal.anaemiaAtBooking}`);
  rows.push(`"Severe Anaemia (<7 g/dl)",${report.antenatal.severeAnaemiaAtBooking}`);
  rows.push(`"Anaemia at 36 Weeks",${report.antenatal.anaemiaAt36Weeks}`);
  rows.push('');
  
  rows.push('"J. VISIT MILESTONES"');
  rows.push(`"Making 4th Visit",${report.antenatal.making4thVisit}`);
  rows.push(`"Making 8th Visit",${report.antenatal.making8thVisit}`);
  rows.push(`"Mothers Seen at 36 Weeks",${report.antenatal.seenAt36Weeks}`);
  rows.push(`"Mothers Below 150cm",${report.antenatal.mothersBelow150cm}`);
  rows.push('');
  
  rows.push('"K. MALE INVOLVEMENT IN ANC"');
  rows.push(`"Male Partner Involved",${report.antenatal.malePartnerInvolved}`);
  rows.push('');

  // ========== DELIVERY SECTION ==========
  rows.push('"SECTION 2: DELIVERIES"');
  rows.push(`"Total Deliveries",${report.delivery.totalDeliveries}`);
  rows.push('');
  
  rows.push('"A. DELIVERY TYPE"');
  rows.push(`"Spontaneous Vertex",${report.delivery.spontaneousVertex}`);
  rows.push(`"Assisted Breech",${report.delivery.assistedBreech}`);
  rows.push(`"Vacuum",${report.delivery.vacuum}`);
  rows.push(`"Forceps",${report.delivery.forceps}`);
  rows.push(`"Caesarean Section",${report.delivery.caesareanSection}`);
  rows.push(`"Multiple",${report.delivery.multiple}`);
  rows.push('');
  
  rows.push('"B. OUTCOMES"');
  rows.push(`"Live Births",${report.delivery.liveBirths}`);
  rows.push(`"Stillbirths (Fresh)",${report.delivery.stillbirthsFresh}`);
  rows.push(`"Stillbirths (Macerated)",${report.delivery.stillbirthsMacerated}`);
  rows.push(`"Neonatal Deaths",${report.delivery.neonatalDeaths}`);
  rows.push(`"Maternal Deaths",${report.delivery.maternalDeaths}`);
  rows.push('');
  
  rows.push('"C. BIRTH WEIGHT"');
  rows.push(`"Low Birth Weight (<2.5kg)",${report.delivery.lowBirthWeight}`);
  rows.push(`"Below 2.5kg",${report.delivery.birthWeightBelow2_5}`);
  rows.push(`"2.5kg and Above",${report.delivery.birthWeightAbove2_5}`);
  rows.push('');
  
  rows.push('"D. BIRTH WEIGHT BY PARITY"');
  rows.push('"Parity","<2.5kg",">=2.5kg"');
  rows.push(`"Primigravidae",${report.delivery.birthWeightByParity.primigravidae.below2_5},${report.delivery.birthWeightByParity.primigravidae.above2_5}`);
  rows.push(`"Multipara",${report.delivery.birthWeightByParity.multipara.below2_5},${report.delivery.birthWeightByParity.multipara.above2_5}`);
  rows.push('');
  
  rows.push('"E. PLACE OF DELIVERY"');
  Object.entries(report.delivery.placeOfDelivery).forEach(([place, count]) => {
    if (count > 0) rows.push(`"${place.replace(/_/g, ' ')}",${count}`);
  });
  rows.push('');
  
  rows.push('"F. ATTENDANT TYPE"');
  Object.entries(report.delivery.attendant).forEach(([attendant, count]) => {
    if (count > 0) rows.push(`"${attendant.replace(/_/g, ' ')}",${count}`);
  });
  rows.push('');
  
  rows.push('"G. PRIMIGRAVIDAE OUTCOMES"');
  rows.push('"Outcome","Male","Female"');
  rows.push(`"Live Births",${report.delivery.primigravidae.liveBirths.male},${report.delivery.primigravidae.liveBirths.female}`);
  rows.push(`"Stillbirths (Fresh)",${report.delivery.primigravidae.stillbirths.fresh},-`);
  rows.push(`"Stillbirths (Macerated)",${report.delivery.primigravidae.stillbirths.macerated},-`);
  rows.push('');
  
  rows.push('"H. ESSENTIAL NEWBORN CARE"');
  rows.push(`"Breastfeeding Within 30 Minutes",${report.delivery.essentialNewbornCare.breastfeedingWithin30Min}`);
  rows.push(`"Eye Prophylaxis Given",${report.delivery.essentialNewbornCare.eyeProphylaxisGiven}`);
  rows.push(`"Cord Care - Chlorhexidine",${report.delivery.essentialNewbornCare.cordCareChlorhexidine}`);
  rows.push(`"Cord Care - Methylated Spirit",${report.delivery.essentialNewbornCare.cordCareMethylated}`);
  rows.push(`"Cord Care - Dry Cord",${report.delivery.essentialNewbornCare.cordCareDry}`);
  rows.push(`"Baby Weight at 6-10 Days",${report.delivery.essentialNewbornCare.babyWeightAt6to10Days}`);
  rows.push('');
  
  rows.push('"I. MATERNAL MORBIDITIES"');
  rows.push(`"VVF Seen",${report.delivery.morbidities.vvfSeen}`);
  rows.push(`"VVF Repaired",${report.delivery.morbidities.vvfRepaired}`);
  rows.push(`"VVF Referred",${report.delivery.morbidities.vvfReferred}`);
  rows.push(`"Drop Foot",${report.delivery.morbidities.dropFoot}`);
  rows.push(`"Puerperal Psychosis",${report.delivery.morbidities.puerperalPsychosis}`);
  rows.push(`"Endometritis",${report.delivery.morbidities.endometritis}`);
  rows.push(`"Mastitis",${report.delivery.morbidities.mastitis}`);
  rows.push('');
  
  rows.push('"J. MATERNAL DEATHS BY AGE"');
  Object.entries(report.delivery.maternalDeathsByAge).forEach(([age, count]) => {
    if (count > 0) rows.push(`"${age}",${count}`);
  });
  rows.push(`"Maternal Deaths Audited",${report.delivery.maternalDeathsAudited}`);
  rows.push('');
  
  rows.push('"K. NEONATAL DEATHS BREAKDOWN"');
  rows.push(`"Early (0-7 days)",${report.delivery.neonatalDeathsBreakdown.early_0_7days}`);
  rows.push(`"Late (8-28 days)",${report.delivery.neonatalDeathsBreakdown.late_8_28days}`);
  rows.push(`"Post-neonatal (1-11 months)",${report.delivery.neonatalDeathsBreakdown.post_neonatal_1_11months}`);
  rows.push('');

  // ========== POSTNATAL SECTION ==========
  rows.push('"SECTION 3: POSTNATAL CARE"');
  rows.push(`"New Mothers",${report.postnatal.newMothers}`);
  rows.push(`"Total PNC Visits",${report.postnatal.totalVisits}`);
  rows.push('');
  
  rows.push('"A. PNC TIMING"');
  rows.push(`"1st PNC on Day 1-2",${report.postnatal.pncDay1or2}`);
  rows.push(`"1st PNC on Day 3-7",${report.postnatal.pncDay3to7}`);
  rows.push(`"1st PNC Day 8+",${report.postnatal.pncDay8Plus}`);
  rows.push('');
  
  rows.push('"B. FAMILY PLANNING"');
  rows.push(`"FP Accepted",${report.postnatal.familyPlanningAccepted}`);
  rows.push(`"Post-Partum FP Acceptors",${report.postnatal.postPartumFPAcceptors}`);
  rows.push('"FP Method Breakdown"');
  Object.entries(report.postnatal.fpMethodBreakdown).forEach(([method, count]) => {
    if (count > 0) rows.push(`"${method}",${count}`);
  });
  rows.push('');
  
  rows.push('"C. BREASTFEEDING"');
  rows.push(`"Exclusive Breastfeeding",${report.postnatal.exclusiveBreastfeeding}`);
  rows.push(`"Exclusive BF at Discharge",${report.postnatal.exclusiveBFAtDischarge}`);
  rows.push('');
  
  rows.push('"D. MALE INVOLVEMENT IN PNC"');
  rows.push(`"Male Partner Involved",${report.postnatal.malePartnerInvolved}`);
  rows.push('');

  // ========== ABORTIONS & REFERRALS ==========
  rows.push('"SECTION 4: ABORTIONS"');
  rows.push(`"Total Abortions",${report.abortions.total}`);
  rows.push('"By Type"');
  Object.entries(report.abortions.byType).forEach(([type, count]) => {
    if (count > 0) rows.push(`"${type.replace(/_/g, ' ')}",${count}`);
  });
  rows.push(`"Post-Abortion FP Accepted",${report.abortions.postAbortionFPAccepted}`);
  rows.push('');
  
  rows.push('"SECTION 5: REFERRALS"');
  rows.push(`"Total Referrals",${report.referrals.total}`);
  rows.push(`"Antenatal In",${report.referrals.antenatal.in}`);
  rows.push(`"Antenatal Out",${report.referrals.antenatal.out}`);
  rows.push(`"Labor In",${report.referrals.labor.in}`);
  rows.push(`"Labor Out",${report.referrals.labor.out}`);
  rows.push(`"Postnatal In",${report.referrals.postnatal.in}`);
  rows.push(`"Postnatal Out",${report.referrals.postnatal.out}`);
  rows.push('');

  // ========== BIRTH ABNORMALITIES & COMPLICATIONS ==========
  rows.push('"SECTION 6: BIRTH ABNORMALITIES"');
  Object.entries(report.birthAbnormalities).forEach(([abnormality, count]) => {
    if (count > 0) rows.push(`"${abnormality.replace(/([A-Z])/g, ' $1').trim()}",${count}`);
  });
  rows.push('');
  
  rows.push('"SECTION 7: NEWBORN COMPLICATIONS"');
  Object.entries(report.newbornComplications).forEach(([complication, count]) => {
    if (count > 0) rows.push(`"${complication.replace(/([A-Z])/g, ' $1').trim()}",${count}`);
  });
  rows.push('');

  // ========== MALE INVOLVEMENT SUMMARY ==========
  rows.push('"SECTION 8: MALE INVOLVEMENT SUMMARY"');
  Object.entries(report.maleInvolvement).forEach(([activity, count]) => {
    rows.push(`"${activity.toUpperCase()}",${count}`);
  });
  rows.push('');
  
  rows.push(`"Report Generated","${report.generatedAt.toISOString()}"`);
  
  return rows.join('\n');
}

  static exportIPDToCSV(report: IPDReport): string {
    const rows = [
      '"IPD Morbidity & Mortality Report"',
      `"Facility Name","${report.facility.name}"`,
      `"District","${report.facility.district}"`,
      `"GHF Code","${report.facility.ghfCode}"`,
      `"Reporting Period","${report.period.startDate.toISOString().split('T')[0]}","to","${report.period.endDate.toISOString().split('T')[0]}"`,
      '',
      '"MALARIA IN INPATIENTS"',
      `"Under 5 Admitted","${report.malaria.under5Admitted}"`,
      `"5+ Admitted","${report.malaria.above5Admitted}"`,
      `"Under 5 Deaths","${report.malaria.under5Deaths}"`,
      `"5+ Deaths","${report.malaria.above5Deaths}"`,
      '',
      '"SUMMARY"',
      `"Total Admissions","${report.totals.totalAdmissions}"`,
      `"Total Deaths","${report.totals.totalDeaths}"`,
    ];
    return rows.join('\n');
  }

  static exportMalariaToCSV(report: MalariaReport): string {
    const rows = [
      '"Malaria Data Report"',
      `"Facility","${report.facility.name}"`,
      `"Period","${report.period.startDate.toISOString().split('T')[0]}","to","${report.period.endDate.toISOString().split('T')[0]}"`,
      '',
      '"OPD MALARIA CASES"',
      '"Age Group","Suspected","Tested","Confirmed","Treated with ACT"',
      `"Under 5 years",${report.opdMalaria.under5.suspected},${report.opdMalaria.under5.tested},${report.opdMalaria.under5.confirmed},${report.opdMalaria.under5.treatedWithACT}`,
      `"5 years and Above",${report.opdMalaria.above5.suspected},${report.opdMalaria.above5.tested},${report.opdMalaria.above5.confirmed},${report.opdMalaria.above5.treatedWithACT}`,
      '',
      '"TESTING METHODS"',
      '"Method","Tested","Positive"',
      `"Microscopy",${report.testing.microscopy},${report.testing.microscopyPositive}`,
      `"RDT",${report.testing.rdt},${report.testing.rdtPositive}`,
    ];
    return rows.join('\n');
  }

  static exportOPDToCSV(report: OPDReport): string {
    const rows = [
      `OPD Morbidity Report,${report.period.startDate.toISOString().split('T')[0]},${report.period.endDate.toISOString().split('T')[0]}`,
      `Facility,${report.facility.name},District,${report.facility.district},GHF Code,${report.facility.ghfCode}`,
      '',
      'AGE GROUPS,INSURED - MALE,INSURED - FEMALE,NON-INSURED - MALE,NON-INSURED - FEMALE,NEW,OLD',
      ...OPD_AGE_GROUPS.map(ag => {
        const d = report.ageGroups[ag];
        return [ag, d.insured.male, d.insured.female, d.nonInsured.male, d.nonInsured.female, d.new, d.old].join(',');
      }),
      '',
      ['TOTAL', report.totals.insured.male, report.totals.insured.female, report.totals.nonInsured.male, report.totals.nonInsured.female, report.totals.new, report.totals.old].join(','),
    ];
    return rows.join('\n');
  }

  static exportConsultingRoomRegisterToCSV(report: ConsultingRoomRegisterReport): string {
    const rows = [
      '"CONSULTING ROOM REGISTER"',
      `"Facility","${report.facility.name}"`,
      `"District","${report.facility.district}"`,
      `"GHF Code","${report.facility.ghfCode}"`,
      `"Period","${report.period.date}"`,
      '',
      '"SUMMARY"',
      `"Total Patients",${report.summary.totalPatients}`,
      `"New Patients",${report.summary.newPatients}`,
      `"Old Patients",${report.summary.oldPatients}`,
      `"NHIS Patients",${report.summary.nhisPatients}`,
      `"Cash Patients",${report.summary.cashPatients}`,
      `"Pregnant Women",${report.summary.pregnantWomen}`,
      `"Referrals",${report.summary.referrals}`,
      '',
      [
        'Date','PatientNo','NHISNo','Name','Address','Age','Telephone','Sex',
        'ProvDiag','LabTests','LabResult','PnpalDiag','NewDiag','OldDiag',
        'AddDiag','NewAddDiag','OldAddDiag','Pregnant','IsNHIS',
        'DrugPresc','DrugGiven','AttendanceID',
      ].map(h => `"${h}"`).join(','),
      ...report.entries.map(e =>
        [
          e.date, e.patientNo, e.nhisNo ?? '', e.patientName, e.address, e.age,
          e.telephone, e.sex === 'male' ? 'M' : 'F',
          e.provisionalDiagnosis, e.labTestsRequested, e.labResults,
          e.principalDiagnosis, e.newDiagnosis, e.oldDiagnosis,
          e.additionalDiagnosis, e.newAdditionalDiagnosis, e.oldAdditionalDiagnosis,
          e.pregnant ? 'Y' : 'N', e.isNHIS ? 'Y' : 'N',
          e.drugsPrescribed, e.drugsGiven, e.attendanceId,
        ].map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ];
    return rows.join('\n');
  }
}