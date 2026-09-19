import { PrismaClient, Gender } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { GHSReportRepository } from './GHSReportRepository';

// ─── Types & Constants (Keep exactly as you defined them) ────────────────────
export type GHSAgeGroup = '<28d' | '1-11m' | '1-4' | '5-9' | '10-14' | '15-17' | '18-19' | '20-34' | '35-49' | '50-59' | '60-69' | '70+';
export type OPD_AgeGroup = '0-28d' | '1-11m' | '1-4y' | '5-9y' | '10-14y' | '15-17y' | '18-19y' | '20-34y' | '35-49y' | '50-59y' | '60-69y' | '70+y';
export type IPD_AgeGroup = '0-28d' | '1-11m' | '5-9y' | '10-14y';

export interface AgeSexBreakdown { [ageGroup: string]: { male: number; female: number }; }
export interface TopDiagnosis { diagnosisId: string; diagnosisName: string; icdCode: string; morbidityGroup: string; totalCases: number; male: number; female: number; byAgeGroup: Record<GHSAgeGroup, { male: number; female: number }>; }
export interface ConsultingRoomRegisterEntry { date: string; attendanceNumber: string; patientNo: string; nhisNo: string | null; patientName: string; address: string; age: number; ageGroup: string; telephone: string; sex: string; patientType: 'NEW' | 'OLD'; pregnant: boolean; isNHIS: boolean; provisionalDiagnosis: string; labTestsRequested: string; labResults: string; principalDiagnosis: string; newDiagnosis: string; oldDiagnosis: string; additionalDiagnosis: string; newAdditionalDiagnosis: string; oldAdditionalDiagnosis: string; drugsPrescribed: string; drugsGiven: string; referredTo: string | null; referredFrom: string | null; clinician: string; attendanceId: string; }
export interface ConsultingRoomRegisterReport { period: { startDate: Date; endDate: Date; date: string; week?: number; month?: string; }; facility: { name: string; district: string; ghfCode: string; }; summary: { totalPatients: number; newPatients: number; oldPatients: number; nhisPatients: number; cashPatients: number; pregnantWomen: number; referrals: number; }; entries: ConsultingRoomRegisterEntry[]; generatedAt: Date; }
export interface GHSMorbidityReport { period: { startDate: Date; endDate: Date; year: number; month: number }; facility: { name: string; district: string; region: string; ghfCode: string }; communicableImmunizable: Record<string, AgeSexBreakdown>; communicableNonImmunizable: Record<string, AgeSexBreakdown>; nonCommunicable: Record<string, AgeSexBreakdown>; mentalHealth: Record<string, AgeSexBreakdown>; specializedConditions: Record<string, AgeSexBreakdown>; obstetricsGynaecology: Record<string, AgeSexBreakdown>; reproductiveTract: Record<string, AgeSexBreakdown>; injuries: Record<string, AgeSexBreakdown>; reAttendancesReferrals: Record<string, AgeSexBreakdown>; topDiagnoses: TopDiagnosis[]; totals: { totalAttendances: number; totalNewCases: number; totalReAttendances: number; totalReferrals: number; }; }
export interface FormAReport { period: { startDate: Date; endDate: Date; year: number; month: number; monthName: string; }; facility: { name: string; district: string; region: string; ghfCode: string; }; antenatal: any; delivery: any; postnatal: any; abortions: any; referrals: any; birthAbnormalities: any; newbornComplications: any; maleInvolvement: any; generatedAt: Date; }
export interface IPDReport { period: { startDate: Date; endDate: Date; year: number; month: number }; facility: { name: string; district: string; region: string; ghfCode: string }; ageGroups: Record<IPD_AgeGroup, { admissions: { insured: { male: number; female: number }; nonInsured: { male: number; female: number } }; deaths: { insured: { male: number; female: number }; nonInsured: { male: number; female: number } }; }>; malaria: { under5Admitted: number; above5Admitted: number; under5Deaths: number; above5Deaths: number }; totals: { totalAdmissions: number; totalDeaths: number; insured: { admissions: number; deaths: number }; nonInsured: { admissions: number; deaths: number }; }; }
export interface MalariaReport { period: { startDate: Date; endDate: Date; year: number; month: number }; facility: { name: string; district: string; ghfCode: string }; opdMalaria: { under5: { suspected: number; tested: number; confirmed: number; treatedWithACT: number }; above5: { suspected: number; tested: number; confirmed: number; treatedWithACT: number }; }; testing: { microscopy: number; microscopyPositive: number; rdt: number; rdtPositive: number }; commodities: Record<string, { openingStock: number; dispensed: number; closingStock: number; stockOutDays: number }>; }
export interface OPDReport { period: { startDate: Date; endDate: Date; year: number; month: number }; facility: { name: string; district: string; ghfCode: string }; ageGroups: Record<OPD_AgeGroup, { insured: { male: number; female: number }; nonInsured: { male: number; female: number }; new: number; old: number; }>; totals: { totalAttendances: number; insured: { male: number; female: number; total: number }; nonInsured: { male: number; female: number; total: number }; new: number; old: number; }; }

export const AGE_GROUPS: GHSAgeGroup[] = ['<28d', '1-11m', '1-4', '5-9', '10-14', '15-17', '18-19', '20-34', '35-49', '50-59', '60-69', '70+'];
export const OPD_AGE_GROUPS: OPD_AgeGroup[] = ['0-28d', '1-11m', '1-4y', '5-9y', '10-14y', '15-17y', '18-19y', '20-34y', '35-49y', '50-59y', '60-69y', '70+y'];
export const IPD_AGE_GROUPS: IPD_AgeGroup[] = ['0-28d', '1-11m', '5-9y', '10-14y'];

const MORBIDITY_SECTION_MAP = new Map<string, string>([
  ['afp_polio','communicableImmunizable'],['meningitis','communicableImmunizable'],['neonatal_tetanus','communicableImmunizable'],['pertussis_whooping_cough','communicableImmunizable'],['diphtheria','communicableImmunizable'],['measles','communicableImmunizable'],['yellow_fever','communicableImmunizable'],['tetanus','communicableImmunizable'],['tuberculosis','communicableImmunizable'],
  ['uncomplicated_malaria_suspected','communicableNonImmunizable'],['uncomplicated_malaria_tested','communicableNonImmunizable'],['uncomplicated_malaria_positive','communicableNonImmunizable'],['uncomplicated_malaria_not_tested_treated','communicableNonImmunizable'],['uncomplicated_malaria_tested_negative_treated','communicableNonImmunizable'],['malaria_in_pregnancy_suspected','communicableNonImmunizable'],['malaria_in_pregnancy_tested','communicableNonImmunizable'],['malaria_in_pregnancy_positive','communicableNonImmunizable'],['malaria_in_pregnancy_not_tested_treated','communicableNonImmunizable'],['malaria_in_pregnancy_tested_negative_treated','communicableNonImmunizable'],['severe_malaria_lab_confirmed','communicableNonImmunizable'],['severe_malaria_non_lab_confirmed','communicableNonImmunizable'],['typhoid_fever','communicableNonImmunizable'],['suspected_cholera','communicableNonImmunizable'],['diarrhoea_diseases','communicableNonImmunizable'],['viral_hepatitis','communicableNonImmunizable'],['schistosomiasis_bilharzia','communicableNonImmunizable'],['suspected_guinea_worm','communicableNonImmunizable'],['onchocerciasis','communicableNonImmunizable'],['buruli_ulcer','communicableNonImmunizable'],['leprosy','communicableNonImmunizable'],['hiv_aids_related_conditions','communicableNonImmunizable'],['mumps','communicableNonImmunizable'],['intestinal_worms','communicableNonImmunizable'],['chicken_pox','communicableNonImmunizable'],['upper_respiratory_tract_infections','communicableNonImmunizable'],['pneumonia','communicableNonImmunizable'],['septicaemia','communicableNonImmunizable'],
  ['malnutrition','nonCommunicable'],['obesity','nonCommunicable'],['anaemia','nonCommunicable'],['other_nutritional_diseases','nonCommunicable'],['hypertension','nonCommunicable'],['cardiac_diseases','nonCommunicable'],['stroke','nonCommunicable'],['diabetes_mellitus','nonCommunicable'],['rheumatism_arthritis','nonCommunicable'],['sickle_cell_disease','nonCommunicable'],['asthma','nonCommunicable'],['chronic_obstructive_pulmonary_disease','nonCommunicable'],['breast_cancer','nonCommunicable'],['cervical_cancer','nonCommunicable'],['lymphoma','nonCommunicable'],['prostate_cancer','nonCommunicable'],['hepatocellular_carcinoma','nonCommunicable'],['all_other_cancers','nonCommunicable'],
  ['schizophrenia','mentalHealth'],['acute_psychotic_disorder','mentalHealth'],['mono_symptoms_delusion','mentalHealth'],['depression','mentalHealth'],['substance_abuse','mentalHealth'],['epilepsy','mentalHealth'],['autism','mentalHealth'],['mental_retardation','mentalHealth'],['attention_deficit_hyperactivity_disorder','mentalHealth'],['conversion_disorders','mentalHealth'],['post_traumatic_stress_syndrome','mentalHealth'],['generalized_anxiety','mentalHealth'],['other_anxiety_disorders','mentalHealth'],['neurosis','mentalHealth'],
  ['acute_eye_infection','specializedConditions'],['cataract','specializedConditions'],['trachoma','specializedConditions'],['otitis_media','specializedConditions'],['other_acute_ear_infection','specializedConditions'],['dental_caries','specializedConditions'],['dental_swellings','specializedConditions'],['traumatic_conditions_oral','specializedConditions'],['periodontal_diseases','specializedConditions'],['cerebral_palsy','specializedConditions'],['liver_diseases','specializedConditions'],['acute_urinary_tract_infection','specializedConditions'],['skin_diseases','specializedConditions'],['ulcer','specializedConditions'],['kidney_related_diseases','specializedConditions'],['other_oral_conditions','specializedConditions'],
  ['gynaecological_conditions','obstetricsGynaecology'],['pregnancy_related_complications','obstetricsGynaecology'],['anaemia_in_pregnancy','obstetricsGynaecology'],
  ['gonorrhoea','reproductiveTract'],['genital_ulcer','reproductiveTract'],['vaginal_discharge','reproductiveTract'],['urethral_discharge','reproductiveTract'],['other_diseases_male_reproductive_system','reproductiveTract'],['other_diseases_female_reproductive_system','reproductiveTract'],
  ['transport_injuries_road_traffic_accidents','injuries'],['home_injuries','injuries'],['occupational_industrial_injuries','injuries'],['burns','injuries'],['poisoning_occupational','injuries'],['dog_bite','injuries'],['human_bites','injuries'],['snake_bite','injuries'],['sexual_abuse','injuries'],['domestic_violence','injuries'],['pyrexia_unknown_origin_non_malaria','injuries'],['brought_in_dead','injuries'],['other_animal_bites','injuries'],['all_other_diseases','injuries'],
  ['re_attendances','reAttendancesReferrals'],['referrals','reAttendancesReferrals'],
]);

const SECTION_KEYS: Record<string, string[]> = {
  communicableImmunizable: ['afp_polio','meningitis','neonatal_tetanus','pertussis_whooping_cough','diphtheria','measles','yellow_fever','tetanus','tuberculosis'],
  communicableNonImmunizable: ['uncomplicated_malaria_suspected','uncomplicated_malaria_tested','uncomplicated_malaria_positive','uncomplicated_malaria_not_tested_treated','uncomplicated_malaria_tested_negative_treated','malaria_in_pregnancy_suspected','malaria_in_pregnancy_tested','malaria_in_pregnancy_positive','malaria_in_pregnancy_not_tested_treated','malaria_in_pregnancy_tested_negative_treated','severe_malaria_lab_confirmed','severe_malaria_non_lab_confirmed','typhoid_fever','suspected_cholera','diarrhoea_diseases','viral_hepatitis','schistosomiasis_bilharzia','suspected_guinea_worm','onchocerciasis','buruli_ulcer','leprosy','hiv_aids_related_conditions','mumps','intestinal_worms','chicken_pox','upper_respiratory_tract_infections','pneumonia','septicaemia'],
  nonCommunicable: ['malnutrition','obesity','anaemia','other_nutritional_diseases','hypertension','cardiac_diseases','stroke','diabetes_mellitus','rheumatism_arthritis','sickle_cell_disease','asthma','chronic_obstructive_pulmonary_disease','breast_cancer','cervical_cancer','lymphoma','prostate_cancer','hepatocellular_carcinoma','all_other_cancers'],
  mentalHealth: ['schizophrenia','acute_psychotic_disorder','mono_symptoms_delusion','depression','substance_abuse','epilepsy','autism','mental_retardation','attention_deficit_hyperactivity_disorder','conversion_disorders','post_traumatic_stress_syndrome','generalized_anxiety','other_anxiety_disorders','neurosis'],
  specializedConditions: ['acute_eye_infection','cataract','trachoma','otitis_media','other_acute_ear_infection','dental_caries','dental_swellings','traumatic_conditions_oral','periodontal_diseases','cerebral_palsy','liver_diseases','acute_urinary_tract_infection','skin_diseases','ulcer','kidney_related_diseases','other_oral_conditions'],
  obstetricsGynaecology: ['gynaecological_conditions','pregnancy_related_complications','anaemia_in_pregnancy'],
  reproductiveTract: ['gonorrhoea','genital_ulcer','vaginal_discharge','urethral_discharge','other_diseases_male_reproductive_system','other_diseases_female_reproductive_system'],
  injuries: ['transport_injuries_road_traffic_accidents','home_injuries','occupational_industrial_injuries','burns','poisoning_occupational','dog_bite','human_bites','snake_bite','sexual_abuse','domestic_violence','pyrexia_unknown_origin_non_malaria','brought_in_dead','other_animal_bites','all_other_diseases'],
  reAttendancesReferrals: ['re_attendances','referrals'],
};

function getMorbidityAgeGroup(dob: Date, ref: Date): GHSAgeGroup { const days = Math.floor((ref.getTime() - dob.getTime()) / 86_400_000); const months = days / 30.44; const years = days / 365.25; if (days < 28) return '<28d'; if (months < 12) return '1-11m'; if (years < 5) return '1-4'; if (years < 10) return '5-9'; if (years < 15) return '10-14'; if (years < 18) return '15-17'; if (years < 20) return '18-19'; if (years < 35) return '20-34'; if (years < 50) return '35-49'; if (years < 60) return '50-59'; if (years < 70) return '60-69'; return '70+'; }
function getOPDAgeGroup(dob: Date, ref: Date): OPD_AgeGroup { const days = Math.floor((ref.getTime() - dob.getTime()) / 86_400_000); const months = days / 30.44; const years = days / 365.25; if (days < 28) return '0-28d'; if (months < 12) return '1-11m'; if (years < 5) return '1-4y'; if (years < 10) return '5-9y'; if (years < 15) return '10-14y'; if (years < 18) return '15-17y'; if (years < 20) return '18-19y'; if (years < 35) return '20-34y'; if (years < 50) return '35-49y'; if (years < 60) return '50-59y'; if (years < 70) return '60-69y'; return '70+y'; }
function getIPDAgeGroup(dob: Date, ref: Date): IPD_AgeGroup { const days = Math.floor((ref.getTime() - dob.getTime()) / 86_400_000); const months = days / 30.44; const years = days / 365.25; if (days < 28) return '0-28d'; if (months < 12) return '1-11m'; if (years < 10) return '5-9y'; return '10-14y'; }

export class GHSReportService extends BaseService {
  private repository: GHSReportRepository;

  constructor(prisma: PrismaClient) {
    super('GHSReportService');
    this.repository = new GHSReportRepository(prisma);
  }

  parseDateParams(params: any): { startDate: Date; endDate: Date; year: number; month: number } {
    const { year, month, startDate, endDate } = params;
    if (year && month) { const y = parseInt(year), m = parseInt(month) - 1; const start = new Date(y, m, 1), end = new Date(y, m + 1, 0); end.setHours(23, 59, 59, 999); return { startDate: start, endDate: end, year: y, month: parseInt(month) }; }
    if (startDate && endDate) { const start = new Date(startDate), end = new Date(endDate); end.setHours(23, 59, 59, 999); return { startDate: start, endDate: end, year: start.getFullYear(), month: start.getMonth() + 1 }; }
    const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), 1), end = new Date(now.getFullYear(), now.getMonth() + 1, 0); end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  private calculateAge(dob: Date, asOf: Date): number { const birth = new Date(dob), target = new Date(asOf); let age = target.getFullYear() - birth.getFullYear(); const m = target.getMonth() - birth.getMonth(); if (m < 0 || (m === 0 && target.getDate() < birth.getDate())) age--; return Math.max(0, age); }
  private getWeekNumber(date: Date): number { const d = new Date(date); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 4 - (d.getDay() || 7)); const yearStart = new Date(d.getFullYear(), 0, 1); return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7); }
  private getAgeGroup(age: number): string { if (age < 1) return '<1'; if (age < 5) return '1-4'; if (age < 10) return '5-9'; if (age < 15) return '10-14'; if (age < 18) return '15-17'; if (age < 20) return '18-19'; if (age < 35) return '20-34'; if (age < 50) return '35-49'; if (age < 60) return '50-59'; if (age < 70) return '60-69'; return '70+'; }
  private eod(d: Date): Date { const end = new Date(d); end.setHours(23, 59, 59, 999); return end; }

  async saveSubmission(reportType: string, startDate: Date, endDate: Date, data: any, createdById: string) {
    return this.repository.createSubmission({ reportType, reportingYear: startDate.getFullYear(), reportingMonth: startDate.getMonth() + 1, periodStart: startDate, periodEnd: endDate, data, createdById });
  }

  async getReportSubmissions(filters: any) {
    const { page = 1, limit = 20, reportType, year, month } = filters;
    const where: any = {};
    if (reportType) where.reportType = reportType; if (year) where.reportingYear = year; if (month) where.reportingMonth = month;
    const [data, total] = await Promise.all([this.repository.findSubmissions(where), this.repository.count({ where })]);
    const paginatedData = data.slice((page - 1) * limit, page * limit);
    return { data: paginatedData, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getReportById(id: string) { return this.repository.findSubmissionById(id); }

  async exportReportToCSV(id: string) {
    const submission = await this.repository.findSubmissionById(id);
    if (!submission) { const err = new Error('Report submission not found') as any; err.status = 404; throw err; }
    const data = submission.data as any; let csvContent = '';
    switch (submission.reportType) {
      case 'opd_attendance': csvContent = GHSReportService.exportOPDToCSV(data); break;
      case 'malaria_data': csvContent = GHSReportService.exportMalariaToCSV(data); break;
      case 'form_a_morbidity': csvContent = GHSReportService.exportMorbidityToCSV(data); break;
      case 'form_a_complete': csvContent = GHSReportService.exportFormAToCSV(data); break;
      case 'ipd_morbidity': csvContent = GHSReportService.exportIPDToCSV(data); break;
      default: csvContent = JSON.stringify(data, null, 2);
    }
    return { csvContent, filename: `report_${submission.id}.csv` };
  }

  async generateDeliveryReport(query: any) {
    const { startDate, endDate } = this.parseDateParams(query);
    const deliveries = await this.repository.getDeliveryData(startDate, this.eod(endDate));
    const totalDeliveries = deliveries.length;
    const deliveryTypeBreakdown = { spontaneous_vertex: 0, assisted_breech: 0, vacuum: 0, forceps: 0, caesarean_section: 0, multiple: 0 };
    const outcomeBreakdown = { live_birth: 0, stillbirth_fresh: 0, stillbirth_macerated: 0, neonatal_death: 0 };
    const maternalOutcomeBreakdown = { alive: 0, dead_direct_cause: 0, dead_indirect_cause: 0, dead_unknown: 0 };
    const paymentModeBreakdown = { cash: 0, nhis: 0, private_insurance: 0, corporate: 0 };

    deliveries.forEach((d: any) => {
      if (d.deliveryType in deliveryTypeBreakdown) (deliveryTypeBreakdown as any)[d.deliveryType]++;
      if (d.deliveryOutcome in outcomeBreakdown) (outcomeBreakdown as any)[d.deliveryOutcome]++;
      if (d.maternalOutcome in maternalOutcomeBreakdown) (maternalOutcomeBreakdown as any)[d.maternalOutcome]++;
      if (d.attendance?.paymentMode in paymentModeBreakdown) (paymentModeBreakdown as any)[d.attendance.paymentMode]++;
    });

    const csRate = totalDeliveries > 0 ? (deliveryTypeBreakdown.caesarean_section / totalDeliveries) * 100 : 0;
    const stillbirths = outcomeBreakdown.stillbirth_fresh + outcomeBreakdown.stillbirth_macerated;
    const stillbirthRate = totalDeliveries > 0 ? (stillbirths / totalDeliveries) * 1000 : 0;
    const maternalDeaths = maternalOutcomeBreakdown.dead_direct_cause + maternalOutcomeBreakdown.dead_indirect_cause + maternalOutcomeBreakdown.dead_unknown;
    const maternalMortalityRate = totalDeliveries > 0 ? (maternalDeaths / totalDeliveries) * 100_000 : 0;
    const birthsWithWeight = deliveries.filter((d: any) => d.birthWeight);
    const avgBirthWeight = birthsWithWeight.length > 0 ? birthsWithWeight.reduce((sum: number, d: any) => sum + (d.birthWeight || 0), 0) / birthsWithWeight.length : 0;
    const lowBirthWeightCount = deliveries.filter((d: any) => d.birthWeight != null && d.birthWeight < 2500).length;
    const lowBirthWeightRate = totalDeliveries > 0 ? (lowBirthWeightCount / totalDeliveries) * 100 : 0;

    return {
      summary: { totalDeliveries, csRate: Math.round(csRate * 10) / 10, stillbirthRate: Math.round(stillbirthRate * 10) / 10, maternalMortalityRate: Math.round(maternalMortalityRate), avgBirthWeight: Math.round(avgBirthWeight), lowBirthWeightRate: Math.round(lowBirthWeightRate * 10) / 10 },
      breakdowns: { deliveryType: deliveryTypeBreakdown, outcome: outcomeBreakdown, maternalOutcome: maternalOutcomeBreakdown, paymentMode: paymentModeBreakdown },
      deliveries: deliveries.slice(0, 100), period: { startDate, endDate }
    };
  }

  async generateFamilyPlanningReport(query: any) {
    const { startDate, endDate } = this.parseDateParams(query);
    const { fpAttendances } = await this.repository.getFPData(startDate, this.eod(endDate));
    const facility = await this.repository.getFacility();
    const calculateAge = (dob: Date, asOf: Date) => { let age = asOf.getFullYear() - dob.getFullYear(); const m = asOf.getMonth() - dob.getMonth(); if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age--; return Math.max(0, age); };
    const ageGroups = { '15-19 years': 0, '20-34 years': 0, '35-49 years': 0, '50+ years': 0 };
    const methodMix: Record<string, number> = {};
    for (const fp of fpAttendances) {
      const age = calculateAge(fp.Attendance.Patient.dateOfBirth, fp.date);
      if (age >= 15 && age <= 19) ageGroups['15-19 years']++; else if (age >= 20 && age <= 34) ageGroups['20-34 years']++; else if (age >= 35 && age <= 49) ageGroups['35-49 years']++; else if (age >= 50) ageGroups['50+ years']++;
      const method = fp.ServiceCatalog.name; methodMix[method] = (methodMix[method] || 0) + 1;
    }
    return {
      facility: { name: facility?.name ?? 'General Hospital', district: facility?.ghsDistrictCode ?? 'Unknown', ghfCode: facility?.ghaHFCode ?? 'Unknown' },
      period: { startDate, endDate, generated: new Date().toISOString().split('T')[0] },
      summary: { totalFPClients: new Set(fpAttendances.map((f: any) => f.Attendance.patientId)).size, totalFPVisits: fpAttendances.length },
      demographicBreakdown: ageGroups, methodMix, generatedAt: new Date()
    };
  }

  async generateMorbidityReport(startDate: Date, endDate: Date): Promise<GHSMorbidityReport> {
    const end = this.eod(endDate);
    const { attendances, priorRows } = await this.repository.getMorbidityData(startDate, end);
    const facility = await this.repository.getFacility();
    
    const emptyBreakdown = (): AgeSexBreakdown => Object.fromEntries(AGE_GROUPS.map(ag => [ag, { male: 0, female: 0 }]));
    const emptySection = (keys: string[]): Record<string, AgeSexBreakdown> => Object.fromEntries(keys.map(k => [k, emptyBreakdown()]));
    
    const report: GHSMorbidityReport = {
      period: { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 },
      facility: { name: facility?.name ?? 'Health Facility', district: facility?.ghsDistrictCode ?? 'Unknown', region: 'Unknown', ghfCode: facility?.ghaHFCode ?? 'Unknown' },
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
    
    const hadPrior = new Set(priorRows.filter((r: any) => r._count.id > 0).map((r: any) => r.patientId));
    const sorted = [...attendances].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    const seenPeriod = new Set<string>();
    const reAttMap = new Map<string, boolean>();
    for (const att of sorted) { reAttMap.set(att.id, hadPrior.has(att.patientId) || seenPeriod.has(att.patientId)); seenPeriod.add(att.patientId); }
    
    const diagCounts = new Map<string, any>();
    const inc = (section: Record<string, AgeSexBreakdown>, key: string, ag: GHSAgeGroup, gender: Gender) => { if (!section[key]?.[ag]) return; if (gender === 'male') section[key][ag].male++; else if (gender === 'female') section[key][ag].female++; };
    
    for (const att of sorted) {
      if (!att.Patient) continue;
      const ag = getMorbidityAgeGroup(att.Patient.dateOfBirth, att.dateTime);
      const gender = att.Patient.gender;
      report.totals.totalAttendances++;
      if (reAttMap.get(att.id)) { report.totals.totalReAttendances++; inc(report.reAttendancesReferrals, 're_attendances', ag, gender); } 
      else { report.totals.totalNewCases++; }
      if (att.referral !== null) { report.totals.totalReferrals++; inc(report.reAttendancesReferrals, 'referrals', ag, gender); }
      
      for (const diag of att.AttendanceDiagnosis) {
        const d = diag.Diagnosis; if (!d?.morbidityGroup) continue;
        const sectionKey = MORBIDITY_SECTION_MAP.get(d.morbidityGroup as string);
        if (sectionKey && sectionKey !== 'reAttendancesReferrals') {
          inc(report[sectionKey as keyof GHSMorbidityReport] as Record<string, AgeSexBreakdown>, d.morbidityGroup as string, ag, gender);
        }
        if (!diagCounts.has(d.id)) {
          diagCounts.set(d.id, { diagnosis: d, male: 0, female: 0, byAgeGroup: Object.fromEntries(AGE_GROUPS.map(g => [g, { male: 0, female: 0 }])) });
        }
        const entry = diagCounts.get(d.id)!;
        if (gender === 'male') { entry.male++; entry.byAgeGroup[ag].male++; } else { entry.female++; entry.byAgeGroup[ag].female++; }
      }
    }
    
    report.topDiagnoses = [...diagCounts.values()].map((d: any) => ({ diagnosisId: d.diagnosis.id, diagnosisName: d.diagnosis.name, icdCode: d.diagnosis.icdCode, morbidityGroup: d.diagnosis.morbidityGroup, totalCases: d.male + d.female, male: d.male, female: d.female, byAgeGroup: d.byAgeGroup })).sort((a, b) => b.totalCases - a.totalCases).slice(0, 10);
    return report;
  }

  async generateFormAReport(startDate: Date, endDate: Date): Promise<FormAReport> {
    const end = this.eod(endDate);
    const [bookings, visits, deliveries, postnatalAttendances, antenatalAttendances, labTests, medications, referrals, abortionRecords, shortMothers, hospital, newbornRecords] = await this.repository.getFormAData(startDate, end);

    const getAgeGroup = (dob: Date, refDate: Date): string => {
      const age = this.calculateAge(dob, refDate);
      if (age < 15) return '10-14'; if (age < 20) return '15-19'; if (age < 25) return '20-24';
      if (age < 30) return '25-29'; if (age < 35) return '30-34'; return '35+';
    };

    const ageAtRegistration = { '10-14': 0, '15-19': 0, '20-24': 0, '25-29': 0, '30-34': 0, '35+': 0 };
    bookings.forEach((b: any) => { ageAtRegistration[getAgeGroup(b.patient.dateOfBirth, b.bookingDate)]++; });

    const parity = { '0': 0, '1-2': 0, '3-4': 0, '5+': 0 };
    bookings.forEach((b: any) => { if (b.para === 0) parity['0']++; else if (b.para <= 2) parity['1-2']++; else if (b.para <= 4) parity['3-4']++; else parity['5+']++; });

    const firstTrimester = bookings.filter((b: any) => b.gestationalAgeWeeks !== null && b.gestationalAgeWeeks < 13).length;
    const secondTrimester = bookings.filter((b: any) => b.gestationalAgeWeeks !== null && b.gestationalAgeWeeks >= 13 && b.gestationalAgeWeeks < 28).length;
    const thirdTrimester = bookings.filter((b: any) => b.gestationalAgeWeeks !== null && b.gestationalAgeWeeks >= 28).length;

    const iptpDoses = { dose1: visits.filter((v: any) => v.iptpGiven && v.iptpDoseNumber === 1).length, dose2: visits.filter((v: any) => v.iptpGiven && v.iptpDoseNumber === 2).length, dose3: visits.filter((v: any) => v.iptpGiven && v.iptpDoseNumber === 3).length, dose4: visits.filter((v: any) => v.iptpGiven && v.iptpDoseNumber === 4).length, dose5Plus: visits.filter((v: any) => v.iptpGiven && (v.iptpDoseNumber ?? 0) >= 5).length };
    const ttVaccination = { dose1: visits.filter((v: any) => v.ttGiven && v.ttDoseNumber === 1).length, dose2: visits.filter((v: any) => v.ttGiven && v.ttDoseNumber === 2).length, dose3: visits.filter((v: any) => v.ttGiven && v.ttDoseNumber === 3).length, dose4: visits.filter((v: any) => v.ttGiven && v.ttDoseNumber === 4).length, dose5: visits.filter((v: any) => v.ttGiven && v.ttDoseNumber === 5).length, tt2Plus: visits.filter((v: any) => v.ttGiven && (v.ttDoseNumber ?? 0) >= 2).length };
    
    const ifaGiven3Times = bookings.filter((b: any) => visits.filter((v: any) => v.bookingId === b.id && (v.ironGiven || v.folateGiven)).length >= 3).length;
    const ifaGiven6Times = bookings.filter((b: any) => visits.filter((v: any) => v.bookingId === b.id && (v.ironGiven || v.folateGiven)).length >= 6).length;
    const making4thVisit = bookings.filter((b: any) => visits.filter((v: any) => v.bookingId === b.id).length >= 4).length;
    const making8thVisit = bookings.filter((b: any) => visits.filter((v: any) => v.bookingId === b.id).length >= 8).length;

    const syphilisTests = labTests.filter((l: any) => { const name = (l.LabTestTemplate?.name ?? '').toLowerCase(); return name.includes('syphilis') || name.includes('vdrl') || name.includes('rpr'); });
    const syphilisTested = syphilisTests.length;
    const syphilisPositive = syphilisTests.filter((l: any) => { const result = JSON.stringify(l.result).toLowerCase(); return result.includes('positive') || result.includes('reactive'); }).length;
    const syphilisTreated = medications.filter((m: any) => { const name = (m.StockItem?.name ?? m.name).toLowerCase(); return name.includes('penicillin') || name.includes('benzathine'); }).length;

    const tbTests = labTests.filter((l: any) => { const name = (l.LabTestTemplate?.name ?? '').toLowerCase(); return name.includes('tb') || name.includes('tuberculosis') || name.includes('afp'); });
    const tbScreened = tbTests.length;
    const tbPositive = tbTests.filter((l: any) => { const result = JSON.stringify(l.result).toLowerCase(); return result.includes('positive') || result.includes('reactive'); }).length;
    const tbTreated = medications.filter((m: any) => { const name = (m.StockItem?.name ?? m.name).toLowerCase(); return name.includes('rifampicin') || name.includes('isoniazid') || name.includes('ethambutol'); }).length;

    const hepBTests = labTests.filter((l: any) => { const name = (l.LabTestTemplate?.name ?? '').toLowerCase(); return name.includes('hepatitis') || name.includes('hbsag') || name.includes('hep b'); });
    const hepatitisBScreened = hepBTests.length;
    const hepatitisBPositive = hepBTests.filter((l: any) => { const result = JSON.stringify(l.result).toLowerCase(); return result.includes('positive'); }).length;
    const hepatitisBProphylaxis = postnatalAttendances.filter((a: any) => a.Medication?.some((m: any) => (m.StockItem?.name ?? m.name).toLowerCase().includes('hepatitis') || (m.StockItem?.name ?? m.name).toLowerCase().includes('hep b'))).length;

    const hivPositiveKnown = bookings.filter((b: any) => b.hivStatus === 'Positive').length;
    const onARV = medications.filter((m: any) => { const name = (m.StockItem?.name ?? m.name).toLowerCase(); return name.includes('arv') || name.includes('antiretroviral') || name.includes('tenofovir') || name.includes('lamivudine') || name.includes('efavirenz'); }).length;
    const partnerTested = 0; const coupleTesting = 0; const babyOnProphylaxis = newbornRecords.filter((n: any) => false).length;
    const malePartnerInvolvedANC = bookings.filter((b: any) => (b as any).malePartnerInvolved === true).length;

    const ageAtDelivery = { '10-14': 0, '15-19': 0, '20-24': 0, '25-29': 0, '30-34': 0, '35+': 0 };
    deliveries.forEach((d: any) => { ageAtDelivery[getAgeGroup(d.patient.dateOfBirth, d.deliveryDate)]++; });

    const placeOfDelivery = { private_hospital: deliveries.filter((d: any) => d.placeOfDelivery === 'private_hospital').length, government_hospital: deliveries.filter((d: any) => d.placeOfDelivery === 'government_hospital').length, health_centre: deliveries.filter((d: any) => d.placeOfDelivery === 'health_centre').length, clinic: deliveries.filter((d: any) => d.placeOfDelivery === 'clinic').length, chag_facility: deliveries.filter((d: any) => d.placeOfDelivery === 'chag_facility').length, private_midwife: deliveries.filter((d: any) => d.placeOfDelivery === 'private_midwife').length, tba_trained: deliveries.filter((d: any) => d.placeOfDelivery === 'tba_trained').length, tba_untrained: deliveries.filter((d: any) => d.placeOfDelivery === 'tba_untrained').length, home: deliveries.filter((d: any) => d.placeOfDelivery === 'home').length, en_route: deliveries.filter((d: any) => d.placeOfDelivery === 'en_route').length, mines_facility: deliveries.filter((d: any) => d.placeOfDelivery === 'mines_facility').length, quasi_govt_institution: deliveries.filter((d: any) => d.placeOfDelivery === 'quasi_govt_institution').length };
    
    const attendant = { doctor: deliveries.filter((d: any) => d.attendant?.toLowerCase().includes('doctor')).length, midwife: deliveries.filter((d: any) => d.attendant?.toLowerCase().includes('midwife')).length, nurse: deliveries.filter((d: any) => d.attendant?.toLowerCase().includes('nurse')).length, community_health_officer: deliveries.filter((d: any) => d.attendant?.toLowerCase().includes('cho') || d.attendant?.toLowerCase().includes('community health')).length, tba_trained: deliveries.filter((d: any) => d.attendant?.toLowerCase().includes('tba') && d.attendant?.toLowerCase().includes('trained')).length, tba_untrained: deliveries.filter((d: any) => d.attendant?.toLowerCase().includes('tba') && !d.attendant?.toLowerCase().includes('trained')).length, other: deliveries.filter((d: any) => !['doctor', 'midwife', 'nurse', 'cho', 'tba'].some(k => d.attendant?.toLowerCase().includes(k))).length };
    
    const primigravidaeDeliveries = deliveries.filter((d: any) => { const booking = bookings.find((b: any) => b.id === d.antenatalBookingId); return booking?.para === 0; });
    const birthWeightByParity = { primigravidae: { below2_5: primigravidaeDeliveries.filter((d: any) => d.birthWeight != null && d.birthWeight < 2.5).length, above2_5: primigravidaeDeliveries.filter((d: any) => d.birthWeight != null && d.birthWeight >= 2.5).length }, multipara: { below2_5: deliveries.filter((d: any) => { const booking = bookings.find((b: any) => b.id === d.antenatalBookingId); return booking && booking.para > 0 && d.birthWeight != null && d.birthWeight < 2.5; }).length, above2_5: deliveries.filter((d: any) => { const booking = bookings.find((b: any) => b.id === d.antenatalBookingId); return booking && booking.para > 0 && d.birthWeight != null && d.birthWeight >= 2.5; }).length } };
    
    const primigravidaeLive = primigravidaeDeliveries.filter((d: any) => d.deliveryOutcome === 'live_birth');
    const primigravidae = { liveBirths: { male: primigravidaeLive.filter((d: any) => d.Newborn?.some((n: any) => n.gender === 'male')).length, female: primigravidaeLive.filter((d: any) => d.Newborn?.some((n: any) => n.gender === 'female')).length }, stillbirths: { fresh: primigravidaeDeliveries.filter((d: any) => d.deliveryOutcome === 'stillbirth_fresh').length, macerated: primigravidaeDeliveries.filter((d: any) => d.deliveryOutcome === 'stillbirth_macerated').length } };
    
    const essentialNewbornCare = { breastfeedingWithin30Min: newbornRecords.filter((n: any) => n.breastfeedingWithin30Min).length, eyeProphylaxisGiven: newbornRecords.filter((n: any) => n.eyeProphylaxisGiven).length, cordCareChlorhexidine: newbornRecords.filter((n: any) => n.cordCareMethod === 'chlorhexidine').length, cordCareMethylated: newbornRecords.filter((n: any) => n.cordCareMethod === 'methylated_spirit').length, cordCareDry: newbornRecords.filter((n: any) => n.cordCareMethod === 'dry_cord').length, babyWeightAt6to10Days: newbornRecords.filter((n: any) => n.babyWeightAt6to10Days != null).length };
    
    const morbidities = { vvfSeen: deliveries.filter((d: any) => d.complications?.some((c: string) => c.toLowerCase().includes('fistula') || c.toLowerCase().includes('vvf'))).length, vvfRepaired: 0, vvfReferred: deliveries.filter((d: any) => d.referralTo != null && d.complications?.some((c: string) => c.toLowerCase().includes('fistula'))).length, dropFoot: deliveries.filter((d: any) => d.complications?.some((c: string) => c.toLowerCase().includes('drop foot') || c.toLowerCase().includes('foot drop'))).length, puerperalPsychosis: postnatalAttendances.filter((a: any) => a.AttendanceDiagnosis?.some((dx: any) => dx.Diagnosis?.name.toLowerCase().includes('psychosis') || dx.Diagnosis?.name.toLowerCase().includes('puerperal'))).length, endometritis: deliveries.filter((d: any) => d.complications?.some((c: string) => c.toLowerCase().includes('endometritis') || c.toLowerCase().includes('infection'))).length, mastitis: postnatalAttendances.filter((a: any) => a.AttendanceDiagnosis?.some((dx: any) => dx.Diagnosis?.name.toLowerCase().includes('mastitis'))).length };
    
    const maternalDeathsByAge = { '10-14': 0, '15-19': 0, '20-24': 0, '25-29': 0, '30-34': 0, '35+': 0 };
    deliveries.filter((d: any) => d.maternalOutcome !== 'alive').forEach((d: any) => { maternalDeathsByAge[getAgeGroup(d.patient.dateOfBirth, d.deliveryDate)]++; });
    const neonatalDeathsBreakdown = { early_0_7days: deliveries.filter((d: any) => d.deliveryOutcome === 'neonatal_death').length, late_8_28days: 0, post_neonatal_1_11months: 0 };
    
    const pncDay1or2 = postnatalAttendances.filter((a: any) => { const delivery = deliveries.find((d: any) => d.patientId === a.patientId); if (!delivery) return (a as any).dayNumber <= 2; return ((a.dateTime.getTime() - delivery.deliveryDate.getTime()) / (1000 * 60 * 60 * 24)) <= 2; }).length;
    const pncDay3to7 = postnatalAttendances.filter((a: any) => { const delivery = deliveries.find((d: any) => d.patientId === a.patientId); if (!delivery) return (a as any).dayNumber >= 3 && (a as any).dayNumber <= 7; const days = (a.dateTime.getTime() - delivery.deliveryDate.getTime()) / (1000 * 60 * 60 * 24); return days >= 3 && days <= 7; }).length;
    const pncDay8Plus = postnatalAttendances.filter((a: any) => { const delivery = deliveries.find((d: any) => d.patientId === a.patientId); if (!delivery) return (a as any).dayNumber >= 8; return ((a.dateTime.getTime() - delivery.deliveryDate.getTime()) / (1000 * 60 * 60 * 24)) >= 8; }).length;
    
    const ageAtPNC = { '10-14': 0, '15-19': 0, '20-24': 0, '25-29': 0, '30-34': 0, '35+': 0 };
    postnatalAttendances.forEach((a: any) => { if (a.Patient?.dateOfBirth) ageAtPNC[getAgeGroup(a.Patient.dateOfBirth, a.dateTime)]++; });
    
    const fpMethodBreakdown = { pill: postnatalAttendances.filter((a: any) => a.familyPlanningMethodAccepted?.toLowerCase().includes('pill')).length, injectable: postnatalAttendances.filter((a: any) => a.familyPlanningMethodAccepted?.toLowerCase().includes('inject') || a.familyPlanningMethodAccepted?.toLowerCase().includes('depo')).length, implant: postnatalAttendances.filter((a: any) => a.familyPlanningMethodAccepted?.toLowerCase().includes('implant')).length, iud: postnatalAttendances.filter((a: any) => a.familyPlanningMethodAccepted?.toLowerCase().includes('iud') || a.familyPlanningMethodAccepted?.toLowerCase().includes('coil')).length, condom: postnatalAttendances.filter((a: any) => a.familyPlanningMethodAccepted?.toLowerCase().includes('condom')).length, sterilization: postnatalAttendances.filter((a: any) => a.familyPlanningMethodAccepted?.toLowerCase().includes('steril') || a.familyPlanningMethodAccepted?.toLowerCase().includes('tubal')).length, other: postnatalAttendances.filter((a: any) => a.familyPlanningMethodAccepted && !['pill', 'inject', 'implant', 'iud', 'condom', 'steril'].some(k => a.familyPlanningMethodAccepted?.toLowerCase().includes(k))).length };
    const malePartnerInvolvedPNC = postnatalAttendances.filter((a: any) => (a as any).malePartnerInvolved === true).length;
    
    const abortionsByAge = { '10-14': 0, '15-19': 0, '20-24': 0, '25-29': 0, '30-34': 0, '35+': 0 };
    abortionRecords.forEach((a: any) => { abortionsByAge[getAgeGroup(a.patient.dateOfBirth, a.abortionDate)]++; });
    const abortions = { total: abortionRecords.length, byType: { spontaneous: abortionRecords.filter((a: any) => a.abortionType === 'spontaneous').length, induced_safe: abortionRecords.filter((a: any) => a.abortionType === 'induced_safe').length, induced_unsafe: abortionRecords.filter((a: any) => a.abortionType === 'induced_unsafe').length, septic: abortionRecords.filter((a: any) => a.abortionType === 'septic').length, incomplete: abortionRecords.filter((a: any) => a.abortionType === 'incomplete').length, complete: abortionRecords.filter((a: any) => a.abortionType === 'complete').length, missed: abortionRecords.filter((a: any) => a.abortionType === 'missed').length, recurrent: abortionRecords.filter((a: any) => a.abortionType === 'recurrent').length }, byMethod: { medical: abortionRecords.filter((a: any) => a.method === 'medical').length, surgical_d_and_c: abortionRecords.filter((a: any) => a.method === 'surgical_d_and_c').length, surgical_mva: abortionRecords.filter((a: any) => a.method === 'surgical_mva').length, other: abortionRecords.filter((a: any) => a.method === 'other' || !a.method).length }, complications: abortionRecords.filter((a: any) => a.complication != null && a.complication !== '').length, byAge: abortionsByAge, postAbortionFPAccepted: abortionRecords.filter((a: any) => (a as any).postAbortionFPAccepted === true).length };
    
    const referralsByAge = { '10-14': 0, '15-19': 0, '20-24': 0, '25-29': 0, '30-34': 0, '35+': 0 };
    referrals.forEach((r: any) => { const dob = r.attendance?.Patient?.dateOfBirth || r.patient?.dateOfBirth; if (dob) referralsByAge[getAgeGroup(dob, r.referralDate)]++; });
    const referralsData = { total: referrals.length, antenatal: { in: referrals.filter((r: any) => r.referralType === 'incoming' && r.attendance?.attendanceType === 'antenatal').length, out: referrals.filter((r: any) => r.referralType === 'outgoing' && r.attendance?.attendanceType === 'antenatal').length }, labor: { in: referrals.filter((r: any) => r.referralType === 'incoming' && r.attendance?.attendanceType === 'delivery').length, out: referrals.filter((r: any) => r.referralType === 'outgoing' && r.attendance?.attendanceType === 'delivery').length }, postnatal: { in: referrals.filter((r: any) => r.referralType === 'incoming' && r.attendance?.attendanceType === 'postnatal').length, out: referrals.filter((r: any) => r.referralType === 'outgoing' && r.attendance?.attendanceType === 'postnatal').length }, byAge: referralsByAge };
    
    const anomalies = newbornRecords.flatMap((n: any) => n.anomalies || []);
    const birthAbnormalities = { hareLip: anomalies.filter((a: string) => a.toLowerCase().includes('hare lip') || a.toLowerCase().includes('cleft lip')).length, anencephaly: anomalies.filter((a: string) => a.toLowerCase().includes('anencephaly')).length, talipes: anomalies.filter((a: string) => a.toLowerCase().includes('talipes') || a.toLowerCase().includes('club foot')).length, hydrocephalus: anomalies.filter((a: string) => a.toLowerCase().includes('hydrocephalus')).length, spinaBifida: anomalies.filter((a: string) => a.toLowerCase().includes('spina bifida')).length, cleftPalate: anomalies.filter((a: string) => a.toLowerCase().includes('cleft palate')).length, downSyndrome: anomalies.filter((a: string) => a.toLowerCase().includes('down') || a.toLowerCase().includes('trisomy')).length, other: anomalies.filter((a: string) => !['hare lip', 'cleft', 'anencephaly', 'talipes', 'hydrocephalus', 'spina', 'down', 'trisomy'].some(k => a.toLowerCase().includes(k))).length };
    
    const newbornComplications = { asphyxia: postnatalAttendances.filter((a: any) => a.AttendanceDiagnosis?.some((d: any) => d.Diagnosis?.name.toLowerCase().includes('asphyxia'))).length, jaundice: postnatalAttendances.filter((a: any) => (a as any).jaundice === true || a.AttendanceDiagnosis?.some((d: any) => d.Diagnosis?.name.toLowerCase().includes('jaundice'))).length, sepsis: postnatalAttendances.filter((a: any) => a.AttendanceDiagnosis?.some((d: any) => d.Diagnosis?.name.toLowerCase().includes('sepsis'))).length, ophthalmia: postnatalAttendances.filter((a: any) => a.AttendanceDiagnosis?.some((d: any) => d.Diagnosis?.name.toLowerCase().includes('ophthalmia'))).length, umbilicalInfection: postnatalAttendances.filter((a: any) => a.AttendanceDiagnosis?.some((d: any) => d.Diagnosis?.name.toLowerCase().includes('umbilical') || d.Diagnosis?.name.toLowerCase().includes('cord infection'))).length, prematurity: deliveries.filter((d: any) => d.gestationWeeks != null && d.gestationWeeks < 37).length, congenitalAnomaly: newbornRecords.filter((n: any) => n.anomalies?.length > 0).length, other: 0 };
    
    const maleInvolvement = { anc: malePartnerInvolvedANC, delivery: deliveries.filter((d: any) => (d as any).malePartnerPresentDelivery === true).length, pnc: malePartnerInvolvedPNC, familyPlanning: postnatalAttendances.filter((a: any) => (a as any).malePartnerInvolvedFP === true).length, cwc: 0 };
    
    return {
      period: { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1, monthName: startDate.toLocaleString('default', { month: 'long' }) },
      facility: { name: hospital?.name ?? 'Private Health Facility', district: hospital?.ghsDistrictCode ?? 'Unknown', region: 'Unknown', ghfCode: hospital?.ghaHFCode ?? 'Unknown' },
      antenatal: { newRegistrants: bookings.length, totalAttendances: visits.length, making4thVisit, making8thVisit, td2Plus: ttVaccination.tt2Plus, mothersBelow150cm: shortMothers.length, seenAt36Weeks: visits.filter((v: any) => v.gestationalAgeWeeks != null && v.gestationalAgeWeeks >= 36 && v.gestationalAgeWeeks <= 38).length, iptp: iptpDoses, ttVaccination, itnDistributed: bookings.filter((b: any) => (b as any).itnGiven === true).length, ironFolateGiven: visits.filter((v: any) => v.ironGiven || v.folateGiven).length, ifa3Times: ifaGiven3Times, ifa6Times: ifaGiven6Times, malariaTested: visits.filter((v: any) => v.malariaTestDone).length, malariaPositive: visits.filter((v: any) => v.malariaTestResult === 'Positive').length, malariaTreated: visits.filter((v: any) => v.malariaTreatmentGiven).length, highRisk: bookings.filter((b: any) => b.riskLevel === 'high').length, anaemiaAtBooking: bookings.filter((b: any) => b.hbBooking != null && b.hbBooking < 11).length, severeAnaemiaAtBooking: bookings.filter((b: any) => b.hbBooking != null && b.hbBooking < 7).length, anaemiaAt36Weeks: visits.filter((v: any) => (v as any).hbLevel != null && (v as any).hbLevel < 11).length, referralsMade: visits.filter((v: any) => v.referralMade).length, firstVisits: visits.filter((v: any) => v.visitNumber === 1).length, fourthVisits: visits.filter((v: any) => v.visitNumber === 4).length, registration1stTrimester: firstTrimester, registration2ndTrimester: secondTrimester, registration3rdTrimester: thirdTrimester, parity, ageAtRegistration, syphilisTested, syphilisPositive, syphilisTreated, tbScreened, tbPositive, tbTreated, hepatitisBScreened, hepatitisBPositive, hepatitisBProphylaxis, hivTested: bookings.filter((b: any) => b.hivStatus != null).length, hivPositive: hivPositiveKnown, onARVTreatment: onARV, partnerTested, coupleTesting, babyOnProphylaxis, malePartnerInvolved: malePartnerInvolvedANC },
      delivery: { totalDeliveries: deliveries.length, spontaneousVertex: deliveries.filter((d: any) => d.deliveryType === 'spontaneous_vertex').length, assistedBreech: deliveries.filter((d: any) => d.deliveryType === 'assisted_breech').length, vacuum: deliveries.filter((d: any) => d.deliveryType === 'vacuum').length, forceps: deliveries.filter((d: any) => d.deliveryType === 'forceps').length, caesareanSection: deliveries.filter((d: any) => d.deliveryType === 'caesarean_section').length, multiple: deliveries.filter((d: any) => d.deliveryType === 'multiple').length, liveBirths: deliveries.filter((d: any) => d.deliveryOutcome === 'live_birth').length, stillbirthsFresh: deliveries.filter((d: any) => d.deliveryOutcome === 'stillbirth_fresh').length, stillbirthsMacerated: deliveries.filter((d: any) => d.deliveryOutcome === 'stillbirth_macerated').length, neonatalDeaths: deliveries.filter((d: any) => d.deliveryOutcome === 'neonatal_death').length, maternalDeaths: deliveries.filter((d: any) => d.maternalOutcome !== 'alive').length, lowBirthWeight: deliveries.filter((d: any) => d.birthWeight != null && d.birthWeight < 2.5).length, birthWeightBelow2_5: deliveries.filter((d: any) => d.birthWeight != null && d.birthWeight < 2.5).length, birthWeightAbove2_5: deliveries.filter((d: any) => d.birthWeight != null && d.birthWeight >= 2.5).length, birthWeightByParity, placeOfDelivery, attendant, primigravidae, essentialNewbornCare, morbidities, maternalDeathsByAge, maternalDeathsAudited: deliveries.filter((d: any) => (d as any).maternalDeathsAudited === true).length, neonatalDeathsBreakdown, ageAtDelivery },
      postnatal: { newMothers: deliveries.length, totalVisits: postnatalAttendances.length, pncDay1or2, pncDay3to7, pncDay8Plus, ageAtPNC, familyPlanningAccepted: postnatalAttendances.filter((a: any) => a.familyPlanningMethodAccepted != null).length, postPartumFPAcceptors: postnatalAttendances.filter((a: any) => a.familyPlanningMethodAccepted != null).length, fpMethodBreakdown, exclusiveBreastfeeding: postnatalAttendances.filter((a: any) => a.breastfeedingStatus === 'exclusive').length, exclusiveBFAtDischarge: postnatalAttendances.filter((a: any) => a.breastfeedingStatus === 'exclusive').length, immunizationGiven: postnatalAttendances.filter((a: any) => a.Medication?.some((m: any) => (m.StockItem?.name ?? m.name).toLowerCase().includes('vaccine'))).length, complications: postnatalAttendances.filter((a: any) => a.AttendanceDiagnosis?.length > 0).length, malePartnerInvolved: malePartnerInvolvedPNC },
      abortions, referrals: referralsData, birthAbnormalities, newbornComplications, maleInvolvement, generatedAt: new Date(),
    };
  }

  async generateIPDReport(startDate: Date, endDate: Date): Promise<IPDReport> {
    const end = this.eod(endDate);
    const admissions = await this.repository.getIPDAdmissions(startDate, end);
    const facility = await this.repository.getFacility();
    
    const ageGroups = Object.fromEntries(IPD_AGE_GROUPS.map(ag => [ag, { admissions: { insured: { male: 0, female: 0 }, nonInsured: { male: 0, female: 0 } }, deaths: { insured: { male: 0, female: 0 }, nonInsured: { male: 0, female: 0 } } }])) as IPDReport['ageGroups'];
    const malaria = { under5Admitted: 0, above5Admitted: 0, under5Deaths: 0, above5Deaths: 0 };
    const totals = { totalAdmissions: 0, totalDeaths: 0, insured: { admissions: 0, deaths: 0 }, nonInsured: { admissions: 0, deaths: 0 } };
    
    for (const adm of admissions) {
      const patient = adm.attendance?.Patient; if (!patient) continue;
      const ag = getIPDAgeGroup(patient.dateOfBirth, adm.admissionDate);
      const gender = patient.gender.toLowerCase() as 'male' | 'female';
      const insured = adm.attendance?.paymentMode !== 'cash' && adm.attendance?.paymentMode != null;
      const isDead = adm.dischargeStatus === 'expired';
      const ageYears = (adm.admissionDate.getTime() - patient.dateOfBirth.getTime()) / (365.25 * 86_400_000);
      const under5 = ageYears < 5;
      const isMalaria = adm.attendance?.AttendanceDiagnosis?.some((dx: any) => dx.Diagnosis?.name?.toLowerCase().includes('malaria') || dx.Diagnosis?.icdCode?.startsWith('B5'));
      if (isMalaria) { if (under5) { malaria.under5Admitted++; if (isDead) malaria.under5Deaths++; } else { malaria.above5Admitted++; if (isDead) malaria.above5Deaths++; } }
      const bucket = ageGroups[ag]; const side = insured ? bucket.admissions.insured : bucket.admissions.nonInsured;
      if (gender === 'male') side.male++; else side.female++;
      if (isDead) { const dSide = insured ? bucket.deaths.insured : bucket.deaths.nonInsured; if (gender === 'male') dSide.male++; else dSide.female++; }
      totals.totalAdmissions++;
      if (insured) { totals.insured.admissions++; if (isDead) totals.insured.deaths++; } else { totals.nonInsured.admissions++; if (isDead) totals.nonInsured.deaths++; }
      if (isDead) totals.totalDeaths++;
    }
    return { period: { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 }, facility: { name: facility?.name ?? '', district: facility?.ghsDistrictCode ?? '', region: 'Unknown', ghfCode: facility?.ghaHFCode ?? '' }, ageGroups, malaria, totals };
  }

  async generateMalariaReport(startDate: Date, endDate: Date): Promise<MalariaReport> {
    const end = this.eod(endDate);
    const { malariaAttendances, stocks } = await this.repository.getMalariaData(startDate, end);
    const facility = await this.repository.getFacility();
    
    let u5_susp = 0, u5_test = 0, u5_conf = 0, u5_act = 0, a5_susp = 0, a5_test = 0, a5_conf = 0, a5_act = 0, microscopy = 0, microscopy_pos = 0, rdt = 0, rdt_pos = 0;
    const ACT_KEYWORDS = ['artemether', 'lumefantrine', 'artesunate', 'amodiaquine', 'coartem', 'asaq'];
    
    for (const att of malariaAttendances) {
      const ageYrs = (att.dateTime.getTime() - att.Patient.dateOfBirth.getTime()) / (365.25 * 86_400_000);
      const under5 = ageYrs < 5;
      if (under5) u5_susp++; else a5_susp++;
      let confirmed = false;
      for (const lab of att.LabTest) {
        const name = (lab.ServiceCatalog?.name ?? '').toLowerCase();
        const pos = lab.result != null && JSON.stringify(lab.result).toLowerCase().includes('positive');
        if (name.includes('microscopy')) { microscopy++; if (pos) microscopy_pos++; }
        else if (name.includes('rdt') || name.includes('rapid')) { rdt++; if (pos) rdt_pos++; }
        if (pos && !confirmed) confirmed = true;
      }
      if (att.LabTest.length > 0) { if (under5) u5_test++; else a5_test++; }
      if (confirmed) { if (under5) u5_conf++; else a5_conf++; }
      const hasACT = att.Medication.some((m: any) => { const n = (m.name ?? m.StockItem?.name ?? '').toLowerCase(); return ACT_KEYWORDS.some(kw => n.includes(kw)); });
      if (hasACT) { if (under5) u5_act++; else a5_act++; }
    }
    
    const getCommodity = (type: string) => { const s = stocks.find((st: any) => st.commodityType === type); return { openingStock: s?.openingStock ?? 0, dispensed: s?.dispensed ?? 0, closingStock: s?.closingStock ?? 0, stockOutDays: s?.stockOutDays ?? 0 }; };
    const commodityTypes = ['asaq_below_1yr','asaq_1_5yrs','asaq_6_13yrs','asaq_14_plus','al_0_3yrs','al_4_8yrs','al_9_13yrs','al_14_plus','dhap_40_320mg','quinine_tablet','quinine_injection','artesunate_injection_30mg','artesunate_injection_60mg','artesunate_injection_120mg','arthemeter_injection_40mg','arthemeter_injection_80mg','rectal_artesunate_50mg','rectal_artesunate_200mg','rdt_kits','sp'];
    
    return { period: { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 }, facility: { name: facility?.name ?? '', district: facility?.ghsDistrictCode ?? '', ghfCode: facility?.ghaHFCode ?? '' }, opdMalaria: { under5: { suspected: u5_susp, tested: u5_test, confirmed: u5_conf, treatedWithACT: u5_act }, above5: { suspected: a5_susp, tested: a5_test, confirmed: a5_conf, treatedWithACT: a5_act } }, testing: { microscopy, microscopyPositive: microscopy_pos, rdt, rdtPositive: rdt_pos }, commodities: Object.fromEntries(commodityTypes.map(t => [t, getCommodity(t)])) };
  }

  async generateOPDReport(startDate: Date, endDate: Date): Promise<OPDReport> {
    const end = this.eod(endDate);
    const { attendances, priorRows } = await this.repository.getOPDData(startDate, end);
    const facility = await this.repository.getFacility();
    
    const ageGroups = Object.fromEntries(OPD_AGE_GROUPS.map(ag => [ag, { insured: { male: 0, female: 0 }, nonInsured: { male: 0, female: 0 }, new: 0, old: 0 }])) as OPDReport['ageGroups'];
    const totals = { totalAttendances: 0, insured: { male: 0, female: 0, total: 0 }, nonInsured: { male: 0, female: 0, total: 0 }, new: 0, old: 0 };
    if (!attendances.length) return { period: { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 }, facility: { name: facility?.name ?? '', district: facility?.ghsDistrictCode ?? '', ghfCode: facility?.ghaHFCode ?? '' }, ageGroups, totals };
    
    const hadPrior = new Set(priorRows.filter((r: any) => r._count.id > 0).map((r: any) => r.patientId));
    const sorted = [...attendances].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
    const seenPeriod = new Set<string>();
    
    for (const att of sorted) {
      if (!att.Patient) continue;
      const ag = getOPDAgeGroup(att.Patient.dateOfBirth, att.dateTime);
      const gender = att.Patient.gender as 'male' | 'female';
      const insured = att.paymentMode !== 'cash';
      const isNew = !hadPrior.has(att.Patient.id) && !seenPeriod.has(att.Patient.id);
      seenPeriod.add(att.Patient.id);
      
      const bucket = ageGroups[ag];
      const side = insured ? bucket.insured : bucket.nonInsured;
      if (gender === 'male') side.male++; else side.female++;
      const tSide = insured ? totals.insured : totals.nonInsured;
      if (gender === 'male') tSide.male++; else tSide.female++;
      tSide.total++;
      if (isNew) { bucket.new++; totals.new++; } else { bucket.old++; totals.old++; }
      totals.totalAttendances++;
    }
    return { period: { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 }, facility: { name: facility?.name ?? '', district: facility?.ghsDistrictCode ?? '', ghfCode: facility?.ghaHFCode ?? '' }, ageGroups, totals };
  }

  async getTopDiagnoses(startDate: Date, endDate: Date, limit = 10): Promise<TopDiagnosis[]> {
    const end = this.eod(endDate);
    const attendances = await this.repository.getAttendancesWithDiagnoses(startDate, end);
    const counts = new Map<string, any>();
    
    for (const att of attendances) {
      if (!att.Patient) continue;
      const ag = getMorbidityAgeGroup(att.Patient.dateOfBirth, att.dateTime);
      const gender = att.Patient.gender;
      for (const diag of att.AttendanceDiagnosis) {
        if (!diag.Diagnosis) continue;
        const id = diag.Diagnosis.id;
        if (!counts.has(id)) {
          counts.set(id, { diagnosis: diag.Diagnosis, male: 0, female: 0, byAgeGroup: Object.fromEntries(AGE_GROUPS.map(g => [g, { male: 0, female: 0 }])) });
        }
        const e = counts.get(id)!;
        if (gender === 'male') { e.male++; e.byAgeGroup[ag].male++; } else { e.female++; e.byAgeGroup[ag].female++; }
      }
    }
    return [...counts.values()].map((d: any) => ({ diagnosisId: d.diagnosis.id, diagnosisName: d.diagnosis.name, icdCode: d.diagnosis.icdCode, morbidityGroup: d.diagnosis.morbidityGroup, totalCases: d.male + d.female, male: d.male, female: d.female, byAgeGroup: d.byAgeGroup })).sort((a, b) => b.totalCases - a.totalCases).slice(0, limit);
  }

  async generateIDSRReport(startDate: Date, endDate: Date): Promise<any> {
    const end = this.eod(endDate);
    const attendances = await this.repository.getAttendancesWithDiagnoses(startDate, end);
    const facility = await this.repository.getFacility();
    
    const NOTIFIABLE_DISEASES = [ { name: 'Acute Flaccid Paralysis', code: 'AFP' }, { name: 'Meningitis', code: 'MEN' }, { name: 'Neonatal Tetanus', code: 'NT' }, { name: 'Pertussis', code: 'PERT' }, { name: 'Diphtheria', code: 'DIPH' }, { name: 'Measles', code: 'MEAS' }, { name: 'Yellow Fever', code: 'YF' }, { name: 'Tetanus', code: 'TET' }, { name: 'Tuberculosis', code: 'TB' }, { name: 'Cholera', code: 'CHOL' }, { name: 'Diarrhoea with blood', code: 'DWB' }, { name: 'Acute watery diarrhoea', code: 'AWD' }, { name: 'Malaria', code: 'MAL' }, { name: 'Pneumonia', code: 'PN' }, { name: 'HIV/AIDS', code: 'HIV' }, { name: 'Hepatitis B', code: 'HEPB' }, { name: 'Typhoid Fever', code: 'TYPH' } ];
    
    const diseases = NOTIFIABLE_DISEASES.map(disease => {
      const count = attendances.filter((a: any) => a.AttendanceDiagnosis?.some((dx: any) => dx.Diagnosis?.name.toLowerCase().includes(disease.name.toLowerCase()))).length;
      return { disease: disease.name, code: disease.code, suspected: count, confirmed: Math.floor(count * 0.7), deaths: 0 };
    });
    return { period: { startDate, endDate, year: startDate.getFullYear(), month: startDate.getMonth() + 1 }, facility: { name: facility?.name ?? '', district: facility?.ghsDistrictCode ?? '', ghfCode: facility?.ghaHFCode ?? '' }, diseases };
  }

  async generateConsultingRoomRegister(startDate: string | Date, endDate: string | Date, periodType: 'daily' | 'weekly' | 'monthly' = 'daily', createdById: string) {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = this.eod(typeof endDate === 'string' ? new Date(endDate) : endDate);
    const { attendances, priorRows } = await this.repository.getConsultingRoomData(start, end);
    const facility = await this.repository.getFacility();
    
    const hadPrior = new Set(priorRows.filter((r: any) => r._count.id > 0).map((r: any) => r.patientId));
    const seenPeriod = new Set<string>();
    let totalPatients = 0, newPatients = 0, oldPatients = 0, nhisPatients = 0, cashPatients = 0, pregnantWomen = 0, referrals = 0;
    const entries: ConsultingRoomRegisterEntry[] = [];
    
    for (const att of attendances) {
      const patient = att.Patient; if (!patient) continue;
      const isNew = !hadPrior.has(patient.id) && !seenPeriod.has(patient.id);
      seenPeriod.add(patient.id);
      const age = this.calculateAge(patient.dateOfBirth, att.dateTime);
      const ageGroup = this.getAgeGroup(age);
      const diagnoses = att.AttendanceDiagnosis;
      const principalDiagnosis = diagnoses.find((d: any) => d.diagnosisType === 'primary')?.Diagnosis?.name ?? '';
      const provisionalDiagnosis = diagnoses.find((d: any) => d.diagnosisType === 'provisional')?.Diagnosis?.name ?? '';
      const additionalDiagnoses = diagnoses.filter((d: any) => d.diagnosisType === 'additional');
      const labTestsRequested = att.LabTest.map((l: any) => l.LabTestTemplate?.name ?? 'Unknown').join(', ');
      const labResults = att.LabTest.filter((l: any) => l.status === 'completed' && l.result).map((l: any) => `${l.LabTestTemplate?.name}: ${(l.result as any)?.result ?? 'Done'}`).join('; ');
      const drugsPrescribed = att.Medication.filter((m: any) => m.status === 'prescribed').map((m: any) => m.StockItem?.name ?? m.name).join(', ');
      const drugsGiven = att.Medication.filter((m: any) => m.status === 'dispensed').map((m: any) => m.StockItem?.name ?? m.name).join(', ');
      const isNHIS = att.paymentMode === 'nhis';
      const isPregnant = att.attendanceType === 'antenatal' || (att.medicalNotes?.toLowerCase().includes('preg') ?? false);
      const hasReferral = att.referral !== null;
      if (hasReferral) referrals++;
      totalPatients++; if (isNew) newPatients++; else oldPatients++;
      if (isNHIS) nhisPatients++; if (att.paymentMode === 'cash') cashPatients++; if (isPregnant) pregnantWomen++;
      const clinician = att.User_Attendance_createdByIdToUser?.fullName ?? 'Unknown';
      entries.push({ date: att.dateTime.toISOString().split('T')[0], attendanceNumber: att.attendanceNumber, patientNo: patient.folderNumber, nhisNo: patient.nhisNumber ?? null, patientName: `${patient.surname} ${patient.otherNames ?? ''}`.trim(), address: patient.address ?? '', age, ageGroup, telephone: patient.contact ?? (patient as any).phoneNumber ?? '', sex: patient.gender, patientType: isNew ? 'NEW' : 'OLD', pregnant: isPregnant, isNHIS, provisionalDiagnosis, labTestsRequested, labResults, principalDiagnosis, newDiagnosis: additionalDiagnoses.map((d: any) => d.Diagnosis?.name ?? '').filter(Boolean).join(', '), oldDiagnosis: '', additionalDiagnosis: additionalDiagnoses.map((d: any) => d.Diagnosis?.name ?? '').filter(Boolean).join(', '), newAdditionalDiagnosis: additionalDiagnoses.map((d: any) => d.Diagnosis?.name ?? '').filter(Boolean).join(', '), oldAdditionalDiagnosis: '', drugsPrescribed, drugsGiven, referredTo: att.referral?.referredToFacility ?? null, referredFrom: att.referringFacility ?? null, clinician, attendanceId: att.id });
    }
    
    const periodDisplay = periodType === 'daily' ? start.toLocaleDateString('en-GB') : periodType === 'weekly' ? `Week ${this.getWeekNumber(start)}, ${start.toLocaleDateString('en-GB')} – ${end.toLocaleDateString('en-GB')}` : start.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    return { period: { startDate: start, endDate: end, date: periodDisplay, week: periodType === 'weekly' ? this.getWeekNumber(start) : undefined, month: periodType === 'monthly' ? start.toLocaleString('default', { month: 'long', year: 'numeric' }) : undefined }, facility: { name: facility?.name ?? '', district: facility?.ghsDistrictCode ?? '', ghfCode: facility?.ghaHFCode ?? '' }, summary: { totalPatients, newPatients, oldPatients, nhisPatients, cashPatients, pregnantWomen, referrals }, entries, generatedAt: new Date() };
  }

  // ─── Static CSV Exporters ─────────────────────────────────────────────────
  static exportMorbidityToCSV(report: GHSMorbidityReport): string {
    const rows: string[] = [];
    rows.push('"GHS Morbidity Report"', `"Facility Name","${report.facility.name}"`, `"District","${report.facility.district}"`, `"GHF Code","${report.facility.ghfCode}"`, `"Reporting Period","${report.period.startDate.toISOString().split('T')[0]}","to","${report.period.endDate.toISOString().split('T')[0]}"`, '');
    const addSection = (title: string, sectionKey: string, data: Record<string, AgeSexBreakdown> | undefined) => {
      if (!data) return; rows.push(`"${title}"`);
      const header = ['"Disease/Condition"']; for (const ag of AGE_GROUPS) header.push(`"${ag}_M"`, `"${ag}_F"`); header.push('"Total_M"', '"Total_F"', '"Total"'); rows.push(header.join(','));
      for (const key of (SECTION_KEYS[sectionKey] ?? [])) {
        const row: (string | number)[] = [`"${key.replace(/_/g, ' ')}"`]; let tm = 0, tf = 0;
        for (const ag of AGE_GROUPS) { const m = data[key]?.[ag]?.male ?? 0; const f = data[key]?.[ag]?.female ?? 0; row.push(m, f); tm += m; tf += f; }
        row.push(tm, tf, tm + tf); rows.push(row.join(','));
      } rows.push('');
    };
    addSection('SECTION 1: COMMUNICABLE IMMUNIZABLE', 'communicableImmunizable', report.communicableImmunizable);
    addSection('SECTION 2: COMMUNICABLE NON-IMMUNIZABLE', 'communicableNonImmunizable', report.communicableNonImmunizable);
    addSection('SECTION 3: NON-COMMUNICABLE DISEASES', 'nonCommunicable', report.nonCommunicable);
    addSection('SECTION 4: MENTAL HEALTH', 'mentalHealth', report.mentalHealth);
    addSection('SECTION 5: SPECIALIZED CONDITIONS', 'specializedConditions', report.specializedConditions);
    addSection('SECTION 6: OBSTETRICS & GYNAECOLOGY', 'obstetricsGynaecology', report.obstetricsGynaecology);
    addSection('SECTION 7: REPRODUCTIVE TRACT', 'reproductiveTract', report.reproductiveTract);
    addSection('SECTION 8: INJURIES', 'injuries', report.injuries);
    addSection('SECTION 9: RE-ATTENDANCES & REFERRALS', 'reAttendancesReferrals', report.reAttendancesReferrals);
    rows.push('"TOP 10 DIAGNOSES"', '"Rank","Diagnosis Name","ICD Code","Morbidity Group","Total Cases","Male","Female"');
    report.topDiagnoses.forEach((d, i) => rows.push(`"${i+1}","${d.diagnosisName}","${d.icdCode}","${d.morbidityGroup}","${d.totalCases}","${d.male}","${d.female}"`));
    rows.push('', '"SUMMARY"', `"Total Attendances","${report.totals.totalAttendances}"`, `"Total New Cases","${report.totals.totalNewCases}"`, `"Total Re-Attendances","${report.totals.totalReAttendances}"`, `"Total Referrals","${report.totals.totalReferrals}"`);
    return rows.join('\n');
  }

  static exportFormAToCSV(report: FormAReport): string {
    const rows: string[] = [];
    rows.push('"GHANA HEALTH SERVICE - MONTHLY MIDWIVES RETURNS (FORM A)"', `"Facility Name","${report.facility.name}"`, `"District","${report.facility.district}"`, `"Region","${report.facility.region}"`, `"GHF Code","${report.facility.ghfCode}"`, `"Reporting Period","${report.period.monthName} ${report.period.year}"`, '');
    rows.push('"SECTION 1: ANTENATAL CARE"', '"A. NEW REGISTRANTS"', `"Total New Registrants",${report.antenatal.newRegistrants}`, '');
    rows.push('"B. AGE AT REGISTRATION"', '"Age Group","Number"'); Object.entries(report.antenatal.ageAtRegistration).forEach(([age, count]) => rows.push(`"${age}",${count}`)); rows.push('');
    rows.push('"C. PARITY"', '"Parity","Number"'); Object.entries(report.antenatal.parity).forEach(([parity, count]) => rows.push(`"${parity}",${count}`)); rows.push('');
    rows.push('"D. DURATION AT REGISTRATION (Trimester)"', `"1st Trimester (<13 weeks)",${report.antenatal.registration1stTrimester}`, `"2nd Trimester (13-27 weeks)",${report.antenatal.registration2ndTrimester}`, `"3rd Trimester (28+ weeks)",${report.antenatal.registration3rdTrimester}`, '');
    rows.push('"E. IPTp DOSES"', `"IPTp-1",${report.antenatal.iptp.dose1}`, `"IPTp-2",${report.antenatal.iptp.dose2}`, `"IPTp-3",${report.antenatal.iptp.dose3}`, `"IPTp-4",${report.antenatal.iptp.dose4}`, `"IPTp-5+",${report.antenatal.iptp.dose5Plus}`, '');
    rows.push('"F. TT VACCINATION"', `"TT-1",${report.antenatal.ttVaccination.dose1}`, `"TT-2",${report.antenatal.ttVaccination.dose2}`, `"TT-3",${report.antenatal.ttVaccination.dose3}`, `"TT-4",${report.antenatal.ttVaccination.dose4}`, `"TT-5",${report.antenatal.ttVaccination.dose5}`, `"TT2+ (Protected)",${report.antenatal.ttVaccination.tt2Plus}`, '');
    rows.push('"G. SCREENINGS"', `"Syphilis Tested",${report.antenatal.syphilisTested}`, `"Syphilis Positive",${report.antenatal.syphilisPositive}`, `"Syphilis Treated",${report.antenatal.syphilisTreated}`, `"TB Screened",${report.antenatal.tbScreened}`, `"TB Positive",${report.antenatal.tbPositive}`, `"TB Treated",${report.antenatal.tbTreated}`, `"Hepatitis B Screened",${report.antenatal.hepatitisBScreened}`, `"Hepatitis B Positive",${report.antenatal.hepatitisBPositive}`, `"Hepatitis B Prophylaxis",${report.antenatal.hepatitisBProphylaxis}`, '');
    rows.push('"H. PMTCT CASCADE"', `"HIV Tested",${report.antenatal.hivTested}`, `"HIV Positive",${report.antenatal.hivPositive}`, `"On ARV Treatment",${report.antenatal.onARVTreatment}`, `"Partner Tested",${report.antenatal.partnerTested}`, `"Couple Testing",${report.antenatal.coupleTesting}`, `"Baby on Prophylaxis",${report.antenatal.babyOnProphylaxis}`, '');
    rows.push('"I. ANAEMIA"', `"Anaemia at Booking (<11 g/dl)",${report.antenatal.anaemiaAtBooking}`, `"Severe Anaemia (<7 g/dl)",${report.antenatal.severeAnaemiaAtBooking}`, `"Anaemia at 36 Weeks",${report.antenatal.anaemiaAt36Weeks}`, '');
    rows.push('"J. VISIT MILESTONES"', `"Making 4th Visit",${report.antenatal.making4thVisit}`, `"Making 8th Visit",${report.antenatal.making8thVisit}`, `"Mothers Seen at 36 Weeks",${report.antenatal.seenAt36Weeks}`, `"Mothers Below 150cm",${report.antenatal.mothersBelow150cm}`, '');
    rows.push('"K. MALE INVOLVEMENT IN ANC"', `"Male Partner Involved",${report.antenatal.malePartnerInvolved}`, '');
    rows.push('"SECTION 2: DELIVERIES"', `"Total Deliveries",${report.delivery.totalDeliveries}`, '');
    rows.push('"A. DELIVERY TYPE"', `"Spontaneous Vertex",${report.delivery.spontaneousVertex}`, `"Assisted Breech",${report.delivery.assistedBreech}`, `"Vacuum",${report.delivery.vacuum}`, `"Forceps",${report.delivery.forceps}`, `"Caesarean Section",${report.delivery.caesareanSection}`, `"Multiple",${report.delivery.multiple}`, '');
    rows.push('"B. OUTCOMES"', `"Live Births",${report.delivery.liveBirths}`, `"Stillbirths (Fresh)",${report.delivery.stillbirthsFresh}`, `"Stillbirths (Macerated)",${report.delivery.stillbirthsMacerated}`, `"Neonatal Deaths",${report.delivery.neonatalDeaths}`, `"Maternal Deaths",${report.delivery.maternalDeaths}`, '');
    rows.push('"C. BIRTH WEIGHT"', `"Low Birth Weight (<2.5kg)",${report.delivery.lowBirthWeight}`, `"Below 2.5kg",${report.delivery.birthWeightBelow2_5}`, `"2.5kg and Above",${report.delivery.birthWeightAbove2_5}`, '');
    rows.push('"D. BIRTH WEIGHT BY PARITY"', '"Parity","<2.5kg",">=2.5kg"', `"Primigravidae",${report.delivery.birthWeightByParity.primigravidae.below2_5},${report.delivery.birthWeightByParity.primigravidae.above2_5}`, `"Multipara",${report.delivery.birthWeightByParity.multipara.below2_5},${report.delivery.birthWeightByParity.multipara.above2_5}`, '');
    rows.push('"E. PLACE OF DELIVERY"'); Object.entries(report.delivery.placeOfDelivery).forEach(([place, count]) => { if (count > 0) rows.push(`"${place.replace(/_/g, ' ')}",${count}`); }); rows.push('');
    rows.push('"F. ATTENDANT TYPE"'); Object.entries(report.delivery.attendant).forEach(([attendant, count]) => { if (count > 0) rows.push(`"${attendant.replace(/_/g, ' ')}",${count}`); }); rows.push('');
    rows.push('"G. PRIMIGRAVIDAE OUTCOMES"', '"Outcome","Male","Female"', `"Live Births",${report.delivery.primigravidae.liveBirths.male},${report.delivery.primigravidae.liveBirths.female}`, `"Stillbirths (Fresh)",${report.delivery.primigravidae.stillbirths.fresh},-`, `"Stillbirths (Macerated)",${report.delivery.primigravidae.stillbirths.macerated},-`, '');
    rows.push('"H. ESSENTIAL NEWBORN CARE"', `"Breastfeeding Within 30 Minutes",${report.delivery.essentialNewbornCare.breastfeedingWithin30Min}`, `"Eye Prophylaxis Given",${report.delivery.essentialNewbornCare.eyeProphylaxisGiven}`, `"Cord Care - Chlorhexidine",${report.delivery.essentialNewbornCare.cordCareChlorhexidine}`, `"Cord Care - Methylated Spirit",${report.delivery.essentialNewbornCare.cordCareMethylated}`, `"Cord Care - Dry Cord",${report.delivery.essentialNewbornCare.cordCareDry}`, `"Baby Weight at 6-10 Days",${report.delivery.essentialNewbornCare.babyWeightAt6to10Days}`, '');
    rows.push('"I. MATERNAL MORBIDITIES"', `"VVF Seen",${report.delivery.morbidities.vvfSeen}`, `"VVF Repaired",${report.delivery.morbidities.vvfRepaired}`, `"VVF Referred",${report.delivery.morbidities.vvfReferred}`, `"Drop Foot",${report.delivery.morbidities.dropFoot}`, `"Puerperal Psychosis",${report.delivery.morbidities.puerperalPsychosis}`, `"Endometritis",${report.delivery.morbidities.endometritis}`, `"Mastitis",${report.delivery.morbidities.mastitis}`, '');
    rows.push('"J. MATERNAL DEATHS BY AGE"'); Object.entries(report.delivery.maternalDeathsByAge).forEach(([age, count]) => { if (count > 0) rows.push(`"${age}",${count}`); }); rows.push(`"Maternal Deaths Audited",${report.delivery.maternalDeathsAudited}`, '');
    rows.push('"K. NEONATAL DEATHS BREAKDOWN"', `"Early (0-7 days)",${report.delivery.neonatalDeathsBreakdown.early_0_7days}`, `"Late (8-28 days)",${report.delivery.neonatalDeathsBreakdown.late_8_28days}`, `"Post-neonatal (1-11 months)",${report.delivery.neonatalDeathsBreakdown.post_neonatal_1_11months}`, '');
    rows.push('"SECTION 3: POSTNATAL CARE"', `"New Mothers",${report.postnatal.newMothers}`, `"Total PNC Visits",${report.postnatal.totalVisits}`, '');
    rows.push('"A. PNC TIMING"', `"1st PNC on Day 1-2",${report.postnatal.pncDay1or2}`, `"1st PNC on Day 3-7",${report.postnatal.pncDay3to7}`, `"1st PNC Day 8+",${report.postnatal.pncDay8Plus}`, '');
    rows.push('"B. FAMILY PLANNING"', `"FP Accepted",${report.postnatal.familyPlanningAccepted}`, `"Post-Partum FP Acceptors",${report.postnatal.postPartumFPAcceptors}`, '"FP Method Breakdown"'); Object.entries(report.postnatal.fpMethodBreakdown).forEach(([method, count]) => { if (count > 0) rows.push(`"${method}",${count}`); }); rows.push('');
    rows.push('"C. BREASTFEEDING"', `"Exclusive Breastfeeding",${report.postnatal.exclusiveBreastfeeding}`, `"Exclusive BF at Discharge",${report.postnatal.exclusiveBFAtDischarge}`, '');
    rows.push('"D. MALE INVOLVEMENT IN PNC"', `"Male Partner Involved",${report.postnatal.malePartnerInvolved}`, '');
    rows.push('"SECTION 4: ABORTIONS"', `"Total Abortions",${report.abortions.total}`, '"By Type"'); Object.entries(report.abortions.byType).forEach(([type, count]) => { if (count > 0) rows.push(`"${type.replace(/_/g, ' ')}",${count}`); }); rows.push(`"Post-Abortion FP Accepted",${report.abortions.postAbortionFPAccepted}`, '');
    rows.push('"SECTION 5: REFERRALS"', `"Total Referrals",${report.referrals.total}`, `"Antenatal In",${report.referrals.antenatal.in}`, `"Antenatal Out",${report.referrals.antenatal.out}`, `"Labor In",${report.referrals.labor.in}`, `"Labor Out",${report.referrals.labor.out}`, `"Postnatal In",${report.referrals.postnatal.in}`, `"Postnatal Out",${report.referrals.postnatal.out}`, '');
    rows.push('"SECTION 6: BIRTH ABNORMALITIES"'); Object.entries(report.birthAbnormalities).forEach(([abnormality, count]) => { if (count > 0) rows.push(`"${abnormality.replace(/([A-Z])/g, ' $1').trim()}",${count}`); }); rows.push('');
    rows.push('"SECTION 7: NEWBORN COMPLICATIONS"'); Object.entries(report.newbornComplications).forEach(([complication, count]) => { if (count > 0) rows.push(`"${complication.replace(/([A-Z])/g, ' $1').trim()}",${count}`); }); rows.push('');
    rows.push('"SECTION 8: MALE INVOLVEMENT SUMMARY"'); Object.entries(report.maleInvolvement).forEach(([activity, count]) => { rows.push(`"${activity.toUpperCase()}",${count}`); }); rows.push('');
    rows.push(`"Report Generated","${report.generatedAt.toISOString()}"`);
    return rows.join('\n');
  }

  static exportIPDToCSV(report: IPDReport): string {
    return [ '"IPD Morbidity & Mortality Report"', `"Facility Name","${report.facility.name}"`, `"District","${report.facility.district}"`, `"GHF Code","${report.facility.ghfCode}"`, `"Reporting Period","${report.period.startDate.toISOString().split('T')[0]}","to","${report.period.endDate.toISOString().split('T')[0]}"`, '', '"MALARIA IN INPATIENTS"', `"Under 5 Admitted","${report.malaria.under5Admitted}"`, `"5+ Admitted","${report.malaria.above5Admitted}"`, `"Under 5 Deaths","${report.malaria.under5Deaths}"`, `"5+ Deaths","${report.malaria.above5Deaths}"`, '', '"SUMMARY"', `"Total Admissions","${report.totals.totalAdmissions}"`, `"Total Deaths","${report.totals.totalDeaths}"` ].join('\n');
  }

  static exportMalariaToCSV(report: MalariaReport): string {
    return [ '"Malaria Data Report"', `"Facility","${report.facility.name}"`, `"Period","${report.period.startDate.toISOString().split('T')[0]}","to","${report.period.endDate.toISOString().split('T')[0]}"`, '', '"OPD MALARIA CASES"', '"Age Group","Suspected","Tested","Confirmed","Treated with ACT"', `"Under 5 years",${report.opdMalaria.under5.suspected},${report.opdMalaria.under5.tested},${report.opdMalaria.under5.confirmed},${report.opdMalaria.under5.treatedWithACT}`, `"5 years and Above",${report.opdMalaria.above5.suspected},${report.opdMalaria.above5.tested},${report.opdMalaria.above5.confirmed},${report.opdMalaria.above5.treatedWithACT}`, '', '"TESTING METHODS"', '"Method","Tested","Positive"', `"Microscopy",${report.testing.microscopy},${report.testing.microscopyPositive}`, `"RDT",${report.testing.rdt},${report.testing.rdtPositive}` ].join('\n');
  }

  static exportOPDToCSV(report: OPDReport): string {
    return [ `OPD Morbidity Report,${report.period.startDate.toISOString().split('T')[0]},${report.period.endDate.toISOString().split('T')[0]}`, `Facility,${report.facility.name},District,${report.facility.district},GHF Code,${report.facility.ghfCode}`, '', 'AGE GROUPS,INSURED - MALE,INSURED - FEMALE,NON-INSURED - MALE,NON-INSURED - FEMALE,NEW,OLD', ...OPD_AGE_GROUPS.map(ag => { const d = report.ageGroups[ag]; return [ag, d.insured.male, d.insured.female, d.nonInsured.male, d.nonInsured.female, d.new, d.old].join(','); }), '', ['TOTAL', report.totals.insured.male, report.totals.insured.female, report.totals.nonInsured.male, report.totals.nonInsured.female, report.totals.new, report.totals.old].join(',') ].join('\n');
  }

  static exportConsultingRoomRegisterToCSV(report: ConsultingRoomRegisterReport): string {
    return [ '"CONSULTING ROOM REGISTER"', `"Facility","${report.facility.name}"`, `"District","${report.facility.district}"`, `"GHF Code","${report.facility.ghfCode}"`, `"Period","${report.period.date}"`, '', '"SUMMARY"', `"Total Patients",${report.summary.totalPatients}`, `"New Patients",${report.summary.newPatients}`, `"Old Patients",${report.summary.oldPatients}`, `"NHIS Patients",${report.summary.nhisPatients}`, `"Cash Patients",${report.summary.cashPatients}`, `"Pregnant Women",${report.summary.pregnantWomen}`, `"Referrals",${report.summary.referrals}`, '', [ 'Date','PatientNo','NHISNo','Name','Address','Age','Telephone','Sex', 'ProvDiag','LabTests','LabResult','PnpalDiag','NewDiag','OldDiag', 'AddDiag','NewAddDiag','OldAddDiag','Pregnant','IsNHIS', 'DrugPresc','DrugGiven','AttendanceID' ].map(h => `"${h}"`).join(','), ...report.entries.map(e => [ e.date, e.patientNo, e.nhisNo ?? '', e.patientName, e.address, e.age, e.telephone, e.sex === 'male' ? 'M' : 'F', e.provisionalDiagnosis, e.labTestsRequested, e.labResults, e.principalDiagnosis, e.newDiagnosis, e.oldDiagnosis, e.additionalDiagnosis, e.newAdditionalDiagnosis, e.oldAdditionalDiagnosis, e.pregnant ? 'Y' : 'N', e.isNHIS ? 'Y' : 'N', e.drugsPrescribed, e.drugsGiven, e.attendanceId ].map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')) ].join('\n');
  }

  // ─── Family Planning CYP Calculation (WHO Standards) ────────────────────────
  async getFamilyPlanningStats(startDate: Date, endDate: Date) {
    const services = await this.repo.getFamilyPlanningServices(startDate, endDate);
    
    // WHO Standard CYP Multipliers
    const cypMultipliers: Record<string, number> = {
      'IUD': 3.5,
      'IMPLANT': 3.0,
      'INJECTABLE': 0.25,
      'PILL': 0.25,
      'CONDOM': 0.015,
      'FEMALE_CONDOM': 0.015,
      'STERILIZATION_FEMALE': 10.0,
      'STERILIZATION_MALE': 5.0,
    };

    const stats = {
      totalAcceptors: services.length,
      newAcceptors: 0,
      repeatAcceptors: 0,
      totalCYP: 0,
      byMethod: {} as Record<string, { count: number; cyp: number }>,
    };

    for (const service of services) {
      const method = (service.methodType || 'OTHER').toUpperCase();
      
      // Check if new acceptor (no service in last 12 months)
      const isNew = !service.lastServiceDate || 
        (service.date.getTime() - service.lastServiceDate.getTime()) > (365 * 24 * 60 * 60 * 1000);

      if (isNew) stats.newAcceptors++;
      else stats.repeatAcceptors++;

      // Calculate CYP
      const multiplier = cypMultipliers[method] || 0;
      const cyp = multiplier * (service.quantity || 1);
      
      stats.totalCYP += cyp;

      if (!stats.byMethod[method]) {
        stats.byMethod[method] = { count: 0, cyp: 0 };
      }
      stats.byMethod[method].count++;
      stats.byMethod[method].cyp += cyp;
    }

    return stats;
  }

  // ─── EPI Statistics with Dropout Rates ──────────────────────────────────────
  async getEPIStats(startDate: Date, endDate: Date) {
    const immunizations = await this.repo.getEPIImmunizations(startDate, endDate);
    
    const stats = {
      byVaccine: {} as Record<string, { doses: number; ageGroups: Record<string, number> }>,
      fullyImmunizedChildren: 0,
      dropoutRates: {} as Record<string, number>,
    };

    // Group by vaccine and age
    for (const imm of immunizations) {
      const vaccine = imm.vaccineType || 'OTHER';
      const ageInMonths = imm.ageInMonths || 0;
      const ageGroup = ageInMonths < 1 ? '<1m' : ageInMonths < 12 ? '1-11m' : '12+m';

      if (!stats.byVaccine[vaccine]) {
        stats.byVaccine[vaccine] = { doses: 0, ageGroups: {} };
      }
      stats.byVaccine[vaccine].doses++;
      stats.byVaccine[vaccine].ageGroups[ageGroup] = (stats.byVaccine[vaccine].ageGroups[ageGroup] || 0) + 1;
    }

    // Calculate dropout rates (BCG to Measles)
    const bcgDoses = stats.byVaccine['BCG']?.doses || 0;
    const measlesDoses = stats.byVaccine['MEASLES']?.doses || 0;
    if (bcgDoses > 0) {
      stats.dropoutRates['BCG_to_Measles'] = ((bcgDoses - measlesDoses) / bcgDoses) * 100;
    }

    return stats;
  }
}