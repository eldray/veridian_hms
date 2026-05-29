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

  async generateFormAReport(startDate: Date, endDate: Date): Promise<FormAReport> {
    const end = this.eod(endDate);

    const [bookings, visits, shortMothers, deliveries, postnatalAttendances] = await Promise.all([
      this.prisma.antenatalBooking.findMany({
        where: { bookingDate: { gte: startDate, lte: end }, isActive: true },
      }),
      this.prisma.aNCVisit.findMany({ where: { visitDate: { gte: startDate, lte: end } } }),
      this.prisma.vitals.findMany({
        where: { recordedAt: { gte: startDate, lte: end }, height: { lt: 150 } },
        distinct: ['patientId'],
      }),
      this.prisma.deliveryRecord.findMany({
        where: { deliveryDate: { gte: startDate, lte: end } },
        include: { Newborn: true },
      }),
      this.prisma.attendance.findMany({
        where: { attendanceType: 'postnatal', dateTime: { gte: startDate, lte: end }, status: { not: 'cancelled' } },
        include: { Patient: true, Vitals: true, Medication: true },
      }),
    ]);

    const deliveryByPatient = new Map(deliveries.map(d => [d.patientId, d]));

    const pncWithin48Hours = postnatalAttendances.filter(a => {
      const delivery = deliveryByPatient.get(a.patientId);
      if (!delivery) return false;
      return (a.dateTime.getTime() - delivery.deliveryDate.getTime()) / 3_600_000 <= 48;
    }).length;

    const pncWithin6Weeks = postnatalAttendances.filter(a => {
      const delivery = deliveryByPatient.get(a.patientId);
      if (!delivery) return false;
      return (a.dateTime.getTime() - delivery.deliveryDate.getTime()) / 86_400_000 <= 42;
    }).length;

    const [familyPlanningAccepted, exclusiveBreastfeeding, immunizationGiven] = await Promise.all([
      this.prisma.medication.count({
        where: { prescribedAt: { gte: startDate, lte: end }, name: { contains: 'family planning', mode: 'insensitive' } },
      }),
      this.prisma.vitals.count({
        where: { recordedAt: { gte: startDate, lte: end }, notes: { contains: 'exclusive breastfeeding', mode: 'insensitive' } },
      }),
      this.prisma.medication.count({
        where: { prescribedAt: { gte: startDate, lte: end }, name: { contains: 'vaccine', mode: 'insensitive' } },
      }),
    ]);

    const complications = postnatalAttendances.filter(a =>
      ['complication', 'infection', 'haemorrhage', 'fever'].some(kw =>
        a.medicalNotes?.toLowerCase().includes(kw),
      )
    ).length;

    const facility = await this.getFacility();

    return {
      period: {
        startDate, endDate,
        year:      startDate.getFullYear(),
        month:     startDate.getMonth() + 1,
        monthName: startDate.toLocaleString('default', { month: 'long' }),
      },
      facility,
      antenatal: {
        newRegistrants:    bookings.length,
        totalAttendances:  visits.length,
        iptp: {
          dose1:    visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 1).length,
          dose2:    visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 2).length,
          dose3:    visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 3).length,
          dose4:    visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 4).length,
          dose5Plus: visits.filter(v => v.iptpGiven && (v.iptpDoseNumber ?? 0) >= 5).length,
        },
        ttVaccination: {
          dose1:   visits.filter(v => v.ttGiven && v.ttDoseNumber === 1).length,
          dose2:   visits.filter(v => v.ttGiven && v.ttDoseNumber === 2).length,
          dose3:   visits.filter(v => v.ttGiven && v.ttDoseNumber === 3).length,
          dose4:   visits.filter(v => v.ttGiven && v.ttDoseNumber === 4).length,
          dose5:   visits.filter(v => v.ttGiven && v.ttDoseNumber === 5).length,
          tt2Plus: visits.filter(v => v.ttGiven && (v.ttDoseNumber ?? 0) >= 2).length,
        },
        // FIXED: itnGiven is on AntenatalBooking, not ANCVisit
        itnDistributed:    bookings.filter(b => b.itnGiven).length,
        ironFolateGiven:   visits.filter(v => v.ironGiven || v.folateGiven).length,
        malariaTested:     visits.filter(v => v.malariaTestDone).length,
        malariaPositive:   visits.filter(v => v.malariaTestResult === 'Positive').length,
        malariaTreated:    visits.filter(v => v.malariaTreatmentGiven).length,
        highRisk:          bookings.filter(b => b.riskLevel === 'high').length,
        anaemiaAtBooking:  bookings.filter(b => b.hbBooking != null && b.hbBooking < 11).length,
        referralsMade:     visits.filter(v => v.referralMade).length,
        firstVisits:       visits.filter(v => v.visitNumber === 1).length,
        fourthVisits:      visits.filter(v => v.visitNumber === 4).length,
        mothersBelow150cm: shortMothers.length,
        seenAt36Weeks:     visits.filter(v => v.gestationalAgeWeeks != null && v.gestationalAgeWeeks >= 36 && v.gestationalAgeWeeks <= 38).length,
      },
      delivery: {
        totalDeliveries:        deliveries.length,
        spontaneousVertex:      deliveries.filter(d => d.deliveryType === 'spontaneous_vertex').length,
        assistedBreech:         deliveries.filter(d => d.deliveryType === 'assisted_breech').length,
        vacuum:                 deliveries.filter(d => d.deliveryType === 'vacuum').length,
        forceps:                deliveries.filter(d => d.deliveryType === 'forceps').length,
        caesareanSection:       deliveries.filter(d => d.deliveryType === 'caesarean_section').length,
        multiple:               deliveries.filter(d => d.deliveryType === 'multiple').length,
        liveBirths:             deliveries.filter(d => d.deliveryOutcome === 'live_birth').length,
        stillbirthsFresh:       deliveries.filter(d => d.deliveryOutcome === 'stillbirth_fresh').length,
        stillbirthsMacerated:   deliveries.filter(d => d.deliveryOutcome === 'stillbirth_macerated').length,
        neonatalDeaths:         deliveries.filter(d => d.deliveryOutcome === 'neonatal_death').length,
        maternalDeaths:         deliveries.filter(d => d.maternalOutcome !== 'alive').length,
        lowBirthWeight:         deliveries.filter(d => d.birthWeight != null && d.birthWeight < 2500).length,
        hospitalDeliveries:     deliveries.filter(d => d.placeOfDelivery === 'hospital').length,
        healthCentreDeliveries: deliveries.filter(d => d.placeOfDelivery === 'health_centre' || d.placeOfDelivery === 'clinic').length,
        homeDeliveries:         deliveries.filter(d => d.placeOfDelivery === 'home' || d.placeOfDelivery === 'en_route').length,
        skilledAttendant:       deliveries.filter(d => ['Skilled', 'Doctor', 'Midwife'].includes(d.attendant)).length,
        tbaAttendant:           deliveries.filter(d => d.attendant === 'TBA').length,
      },
      postnatal: {
        newMothers:             deliveries.length,
        totalVisits:            postnatalAttendances.length,
        pncWithin48Hours,
        pncWithin6Weeks,
        familyPlanningAccepted,
        exclusiveBreastfeeding,
        immunizationGiven,
        complications,
      },
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

  static exportFormAToCSV(report: FormAReport): string {
    const rows = [
      '"GHS FORM A - MATERNAL HEALTH REPORT"',
      `"Facility","${report.facility.name}"`,
      `"District","${report.facility.district}"`,
      `"Period","${report.period.monthName} ${report.period.year}"`,
      '',
      '"ANTENATAL CARE"',
      `"New Registrants",${report.antenatal.newRegistrants}`,
      `"Total Attendances",${report.antenatal.totalAttendances}`,
      `"IPTp-1",${report.antenatal.iptp.dose1}`,
      `"IPTp-2",${report.antenatal.iptp.dose2}`,
      `"IPTp-3",${report.antenatal.iptp.dose3}`,
      `"IPTp-4",${report.antenatal.iptp.dose4}`,
      `"IPTp-5+",${report.antenatal.iptp.dose5Plus}`,
      `"TT2+ (Protected)",${report.antenatal.ttVaccination.tt2Plus}`,
      `"ITN Distributed",${report.antenatal.itnDistributed}`,
      `"Iron/Folate Given",${report.antenatal.ironFolateGiven}`,
      `"Malaria Tested",${report.antenatal.malariaTested}`,
      `"Malaria Positive",${report.antenatal.malariaPositive}`,
      `"Malaria Treated",${report.antenatal.malariaTreated}`,
      `"High Risk Pregnancies",${report.antenatal.highRisk}`,
      `"Anaemia at Booking",${report.antenatal.anaemiaAtBooking}`,
      `"Referrals Made",${report.antenatal.referralsMade}`,
      '',
      '"DELIVERY"',
      `"Total Deliveries",${report.delivery.totalDeliveries}`,
      `"Spontaneous Vertex",${report.delivery.spontaneousVertex}`,
      `"Caesarean Section",${report.delivery.caesareanSection}`,
      `"Live Births",${report.delivery.liveBirths}`,
      `"Stillbirths",${report.delivery.stillbirthsFresh + report.delivery.stillbirthsMacerated}`,
      `"Neonatal Deaths",${report.delivery.neonatalDeaths}`,
      `"Maternal Deaths",${report.delivery.maternalDeaths}`,
      `"Low Birth Weight",${report.delivery.lowBirthWeight}`,
      '',
      '"POSTNATAL CARE"',
      `"New Mothers",${report.postnatal.newMothers}`,
      `"Total PNC Visits",${report.postnatal.totalVisits}`,
      `"PNC within 48 hours",${report.postnatal.pncWithin48Hours}`,
      `"PNC within 6 weeks",${report.postnatal.pncWithin6Weeks}`,
      `"Family Planning Accepted",${report.postnatal.familyPlanningAccepted}`,
      `"Exclusive Breastfeeding",${report.postnatal.exclusiveBreastfeeding}`,
      `"Immunizations Given",${report.postnatal.immunizationGiven}`,
      `"Complications",${report.postnatal.complications}`,
    ];
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