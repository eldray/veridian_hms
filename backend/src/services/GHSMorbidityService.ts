// services/GHSMorbidityService.ts
// Complete GHS Morbidity Report Service — fixed N+1 queries and O(1) section dispatch

import { PrismaClient, Gender } from '@prisma/client';

// ==============================================
// TYPES
// ==============================================

export type GHSAgeGroup =
  | '<28d' | '1-11m' | '1-4' | '5-9' | '10-14'
  | '15-17' | '18-19' | '20-34' | '35-49' | '50-59'
  | '60-69' | '70+';

export interface AgeSexBreakdown {
  [ageGroup: string]: { male: number; female: number };
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

export interface GHSMorbidityReport {
  period: ReportingPeriod;
  facility: FacilityInfo;
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

// ==============================================
// STATIC LOOKUP MAP — built once at module load
// O(1) per diagnosis instead of 8 array.includes() calls
// ==============================================

type SectionKey =
  | 'communicableImmunizable'
  | 'communicableNonImmunizable'
  | 'nonCommunicable'
  | 'mentalHealth'
  | 'specializedConditions'
  | 'obstetricsGynaecology'
  | 'reproductiveTract'
  | 'injuries'
  | 'reAttendancesReferrals';

const MORBIDITY_SECTION_MAP: Map<string, SectionKey> = new Map([
  // Section 1 — Communicable Immunizable
  ['afp_polio',                   'communicableImmunizable'],
  ['meningitis',                  'communicableImmunizable'],
  ['neonatal_tetanus',            'communicableImmunizable'],
  ['pertussis_whooping_cough',    'communicableImmunizable'],
  ['diphtheria',                  'communicableImmunizable'],
  ['measles',                     'communicableImmunizable'],
  ['yellow_fever',                'communicableImmunizable'],
  ['tetanus',                     'communicableImmunizable'],
  ['tuberculosis',                'communicableImmunizable'],

  // Section 2 — Communicable Non-Immunizable
  ['uncomplicated_malaria_suspected',                    'communicableNonImmunizable'],
  ['uncomplicated_malaria_tested',                       'communicableNonImmunizable'],
  ['uncomplicated_malaria_positive',                     'communicableNonImmunizable'],
  ['uncomplicated_malaria_not_tested_treated',           'communicableNonImmunizable'],
  ['uncomplicated_malaria_tested_negative_treated',      'communicableNonImmunizable'],
  ['malaria_in_pregnancy_suspected',                     'communicableNonImmunizable'],
  ['malaria_in_pregnancy_tested',                        'communicableNonImmunizable'],
  ['malaria_in_pregnancy_positive',                      'communicableNonImmunizable'],
  ['malaria_in_pregnancy_not_tested_treated',            'communicableNonImmunizable'],
  ['malaria_in_pregnancy_tested_negative_treated',       'communicableNonImmunizable'],
  ['severe_malaria_lab_confirmed',                       'communicableNonImmunizable'],
  ['severe_malaria_non_lab_confirmed',                   'communicableNonImmunizable'],
  ['typhoid_fever',                                      'communicableNonImmunizable'],
  ['suspected_cholera',                                  'communicableNonImmunizable'],
  ['diarrhoea_diseases',                                 'communicableNonImmunizable'],
  ['viral_hepatitis',                                    'communicableNonImmunizable'],
  ['schistosomiasis_bilharzia',                          'communicableNonImmunizable'],
  ['suspected_guinea_worm',                              'communicableNonImmunizable'],
  ['onchocerciasis',                                     'communicableNonImmunizable'],
  ['buruli_ulcer',                                       'communicableNonImmunizable'],
  ['leprosy',                                            'communicableNonImmunizable'],
  ['hiv_aids_related_conditions',                        'communicableNonImmunizable'],
  ['mumps',                                              'communicableNonImmunizable'],
  ['intestinal_worms',                                   'communicableNonImmunizable'],
  ['chicken_pox',                                        'communicableNonImmunizable'],
  ['upper_respiratory_tract_infections',                 'communicableNonImmunizable'],
  ['pneumonia',                                          'communicableNonImmunizable'],
  ['septicaemia',                                        'communicableNonImmunizable'],

  // Section 3 — Non-Communicable
  ['malnutrition',                        'nonCommunicable'],
  ['obesity',                             'nonCommunicable'],
  ['anaemia',                             'nonCommunicable'],
  ['other_nutritional_diseases',          'nonCommunicable'],
  ['hypertension',                        'nonCommunicable'],
  ['cardiac_diseases',                    'nonCommunicable'],
  ['stroke',                              'nonCommunicable'],
  ['diabetes_mellitus',                   'nonCommunicable'],
  ['rheumatism_arthritis',                'nonCommunicable'],
  ['sickle_cell_disease',                 'nonCommunicable'],
  ['asthma',                              'nonCommunicable'],
  ['chronic_obstructive_pulmonary_disease','nonCommunicable'],
  ['breast_cancer',                       'nonCommunicable'],
  ['cervical_cancer',                     'nonCommunicable'],
  ['lymphoma',                            'nonCommunicable'],
  ['prostate_cancer',                     'nonCommunicable'],
  ['hepatocellular_carcinoma',            'nonCommunicable'],
  ['all_other_cancers',                   'nonCommunicable'],

  // Section 4 — Mental Health
  ['schizophrenia',                               'mentalHealth'],
  ['acute_psychotic_disorder',                    'mentalHealth'],
  ['mono_symptoms_delusion',                      'mentalHealth'],
  ['depression',                                  'mentalHealth'],
  ['substance_abuse',                             'mentalHealth'],
  ['epilepsy',                                    'mentalHealth'],
  ['autism',                                      'mentalHealth'],
  ['mental_retardation',                          'mentalHealth'],
  ['attention_deficit_hyperactivity_disorder',    'mentalHealth'],
  ['conversion_disorders',                        'mentalHealth'],
  ['post_traumatic_stress_syndrome',              'mentalHealth'],
  ['generalized_anxiety',                         'mentalHealth'],
  ['other_anxiety_disorders',                     'mentalHealth'],
  ['neurosis',                                    'mentalHealth'],

  // Section 5 — Specialized
  ['acute_eye_infection',             'specializedConditions'],
  ['cataract',                        'specializedConditions'],
  ['trachoma',                        'specializedConditions'],
  ['otitis_media',                    'specializedConditions'],
  ['other_acute_ear_infection',       'specializedConditions'],
  ['dental_caries',                   'specializedConditions'],
  ['dental_swellings',                'specializedConditions'],
  ['traumatic_conditions_oral',       'specializedConditions'],
  ['periodontal_diseases',            'specializedConditions'],
  ['cerebral_palsy',                  'specializedConditions'],
  ['liver_diseases',                  'specializedConditions'],
  ['acute_urinary_tract_infection',   'specializedConditions'],
  ['skin_diseases',                   'specializedConditions'],
  ['ulcer',                           'specializedConditions'],
  ['kidney_related_diseases',         'specializedConditions'],
  ['other_oral_conditions',           'specializedConditions'],

  // Section 6 — OB/GYN
  ['gynaecological_conditions',           'obstetricsGynaecology'],
  ['pregnancy_related_complications',     'obstetricsGynaecology'],
  ['anaemia_in_pregnancy',                'obstetricsGynaecology'],

  // Section 7 — Reproductive Tract
  ['gonorrhoea',                                  'reproductiveTract'],
  ['genital_ulcer',                               'reproductiveTract'],
  ['vaginal_discharge',                           'reproductiveTract'],
  ['urethral_discharge',                          'reproductiveTract'],
  ['other_diseases_male_reproductive_system',     'reproductiveTract'],
  ['other_diseases_female_reproductive_system',   'reproductiveTract'],

  // Section 8 — Injuries
  ['transport_injuries_road_traffic_accidents',   'injuries'],
  ['home_injuries',                               'injuries'],
  ['occupational_industrial_injuries',            'injuries'],
  ['burns',                                       'injuries'],
  ['poisoning_occupational',                      'injuries'],
  ['dog_bite',                                    'injuries'],
  ['human_bites',                                 'injuries'],
  ['snake_bite',                                  'injuries'],
  ['sexual_abuse',                                'injuries'],
  ['domestic_violence',                           'injuries'],
  ['pyrexia_unknown_origin_non_malaria',          'injuries'],
  ['brought_in_dead',                             'injuries'],
  ['other_animal_bites',                          'injuries'],
  ['all_other_diseases',                          'injuries'],

  // Section 9 — Re-Attendances & Referrals
  ['re_attendances',  'reAttendancesReferrals'],
  ['referrals',       'reAttendancesReferrals'],
]);

// All morbidity group keys per section (used for empty initialisation and CSV export)
const SECTION_KEYS: Record<SectionKey, string[]> = {
  communicableImmunizable: [
    'afp_polio','meningitis','neonatal_tetanus','pertussis_whooping_cough',
    'diphtheria','measles','yellow_fever','tetanus','tuberculosis'
  ],
  communicableNonImmunizable: [
    'uncomplicated_malaria_suspected','uncomplicated_malaria_tested','uncomplicated_malaria_positive',
    'uncomplicated_malaria_not_tested_treated','uncomplicated_malaria_tested_negative_treated',
    'malaria_in_pregnancy_suspected','malaria_in_pregnancy_tested','malaria_in_pregnancy_positive',
    'malaria_in_pregnancy_not_tested_treated','malaria_in_pregnancy_tested_negative_treated',
    'severe_malaria_lab_confirmed','severe_malaria_non_lab_confirmed','typhoid_fever',
    'suspected_cholera','diarrhoea_diseases','viral_hepatitis','schistosomiasis_bilharzia',
    'suspected_guinea_worm','onchocerciasis','buruli_ulcer','leprosy','hiv_aids_related_conditions',
    'mumps','intestinal_worms','chicken_pox','upper_respiratory_tract_infections','pneumonia','septicaemia'
  ],
  nonCommunicable: [
    'malnutrition','obesity','anaemia','other_nutritional_diseases','hypertension',
    'cardiac_diseases','stroke','diabetes_mellitus','rheumatism_arthritis','sickle_cell_disease',
    'asthma','chronic_obstructive_pulmonary_disease','breast_cancer','cervical_cancer',
    'lymphoma','prostate_cancer','hepatocellular_carcinoma','all_other_cancers'
  ],
  mentalHealth: [
    'schizophrenia','acute_psychotic_disorder','mono_symptoms_delusion','depression',
    'substance_abuse','epilepsy','autism','mental_retardation',
    'attention_deficit_hyperactivity_disorder','conversion_disorders',
    'post_traumatic_stress_syndrome','generalized_anxiety','other_anxiety_disorders','neurosis'
  ],
  specializedConditions: [
    'acute_eye_infection','cataract','trachoma','otitis_media','other_acute_ear_infection',
    'dental_caries','dental_swellings','traumatic_conditions_oral','periodontal_diseases',
    'cerebral_palsy','liver_diseases','acute_urinary_tract_infection','skin_diseases',
    'ulcer','kidney_related_diseases','other_oral_conditions'
  ],
  obstetricsGynaecology: [
    'gynaecological_conditions','pregnancy_related_complications','anaemia_in_pregnancy'
  ],
  reproductiveTract: [
    'gonorrhoea','genital_ulcer','vaginal_discharge','urethral_discharge',
    'other_diseases_male_reproductive_system','other_diseases_female_reproductive_system'
  ],
  injuries: [
    'transport_injuries_road_traffic_accidents','home_injuries','occupational_industrial_injuries',
    'burns','poisoning_occupational','dog_bite','human_bites','snake_bite',
    'sexual_abuse','domestic_violence','pyrexia_unknown_origin_non_malaria',
    'brought_in_dead','other_animal_bites','all_other_diseases'
  ],
  reAttendancesReferrals: ['re_attendances','referrals']
};

const AGE_GROUPS: GHSAgeGroup[] = [
  '<28d','1-11m','1-4','5-9','10-14','15-17','18-19','20-34','35-49','50-59','60-69','70+'
];

// ==============================================
// SERVICE CLASS
// ==============================================

export class GHSMorbidityService {
  private prisma: PrismaClient;  // ✅ injected instance

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ─────────────────────────────────────────────────────────
  // Age group calculation — pure function, no prisma needed → static OK
  // ─────────────────────────────────────────────────────────

  private static getAgeGroup(dob: Date, referenceDate: Date): GHSAgeGroup {
    const days   = Math.floor((referenceDate.getTime() - dob.getTime()) / 86_400_000);
    const months = days / 30.44;
    const years  = days / 365.25;

    if (days   <  28) return '<28d';
    if (months <  12) return '1-11m';
    if (years  <   5) return '1-4';
    if (years  <  10) return '5-9';
    if (years  <  15) return '10-14';
    if (years  <  18) return '15-17';
    if (years  <  20) return '18-19';
    if (years  <  35) return '20-34';
    if (years  <  50) return '35-49';
    if (years  <  60) return '50-59';
    if (years  <  70) return '60-69';
    return '70+';
  }

  // ─────────────────────────────────────────────────────────
  // Empty report scaffold — pure functions, no prisma → static OK
  // ─────────────────────────────────────────────────────────

  private static emptyBreakdown(): AgeSexBreakdown {
    const b: AgeSexBreakdown = {};
    for (const ag of AGE_GROUPS) b[ag] = { male: 0, female: 0 };
    return b;
  }

  private static emptySection(keys: string[]): Record<string, AgeSexBreakdown> {
    const s: Record<string, AgeSexBreakdown> = {};
    for (const k of keys) s[k] = GHSMorbidityService.emptyBreakdown();
    return s;
  }

  private static initEmptyReport(): GHSMorbidityReport {
    return {
      period:   { startDate: new Date(), endDate: new Date(), year: 0, month: 0 },
      facility: { name: '', district: '', region: '', ghfCode: '' },
      communicableImmunizable:    GHSMorbidityService.emptySection(SECTION_KEYS.communicableImmunizable),
      communicableNonImmunizable: GHSMorbidityService.emptySection(SECTION_KEYS.communicableNonImmunizable),
      nonCommunicable:            GHSMorbidityService.emptySection(SECTION_KEYS.nonCommunicable),
      mentalHealth:               GHSMorbidityService.emptySection(SECTION_KEYS.mentalHealth),
      specializedConditions:      GHSMorbidityService.emptySection(SECTION_KEYS.specializedConditions),
      obstetricsGynaecology:      GHSMorbidityService.emptySection(SECTION_KEYS.obstetricsGynaecology),
      reproductiveTract:          GHSMorbidityService.emptySection(SECTION_KEYS.reproductiveTract),
      injuries:                   GHSMorbidityService.emptySection(SECTION_KEYS.injuries),
      reAttendancesReferrals:     GHSMorbidityService.emptySection(SECTION_KEYS.reAttendancesReferrals),
      topDiagnoses: [],
      totals: { totalAttendances: 0, totalNewCases: 0, totalReAttendances: 0, totalReferrals: 0 }
    };
  }

  // ─────────────────────────────────────────────────────────
  // PRIVATE: increment a single cell — pure, no prisma → static OK
  // ─────────────────────────────────────────────────────────

  private static inc(
    section: Record<string, AgeSexBreakdown>,
    key: string,
    ageGroup: GHSAgeGroup,
    gender: Gender
  ): void {
    if (!section[key]?.[ageGroup]) return;
    if (gender === 'male')        section[key][ageGroup].male++;
    else if (gender === 'female') section[key][ageGroup].female++;
  }

  // ─────────────────────────────────────────────────────────
  // MAIN: generate full morbidity report  ← instance method (uses this.prisma)
  // ─────────────────────────────────────────────────────────

  async generateMorbidityReport(
    startDate: Date,
    endDate: Date
  ): Promise<GHSMorbidityReport> {
    const report = GHSMorbidityService.initEmptyReport();

    // Facility info
    const hospital = await this.prisma.hospital.findFirst();
    report.facility = {
      name:     hospital?.name            ?? 'Health Facility',
      district: hospital?.ghsDistrictCode ?? 'Unknown District',
      region:   'Unknown Region',
      ghfCode:  hospital?.ghaHFCode       ?? 'Unknown'
    };
    report.period = {
      startDate, endDate,
      year:  startDate.getFullYear(),
      month: startDate.getMonth() + 1
    };

    // ── ONE big query — no N+1 ──────────────────────────────
    const attendances = await this.prisma.attendance.findMany({
      where: {
        dateTime: { gte: startDate, lte: endDate },
        status:   { not: 'cancelled' }
      },
      include: {
        Patient: true,
        AttendanceDiagnosis: { include: { Diagnosis: true } },
        ReferralRecord: { where: { referralType: 'incoming' }, select: { id: true } }
      }
    });

    console.log(`📊 Processing ${attendances.length} attendances for morbidity report`);

    // ── Pre-compute re-attendance set — TWO queries, zero N+1 ──
    //
    // A visit is a RE-ATTENDANCE if the patient has ANY earlier attendance
    // (before this visit's dateTime) — whether prior to the period or earlier
    // within it.
    //
    // Strategy:
    //   (a) Query patients who had any attendance BEFORE startDate (prior period).
    //   (b) Sort this period's attendances by dateTime and use a running seen-set
    //       to catch same-period re-attendances.

    const patientIds = [...new Set(attendances.map(a => a.patientId))];

    const priorPeriodRows = await this.prisma.attendance.groupBy({
      by: ['patientId'],
      where: {
        patientId: { in: patientIds },
        dateTime:  { lt: startDate },
        status:    { not: 'cancelled' }
      },
      _count: { id: true }
    });
    const hadPriorPeriodVisit = new Set(
      priorPeriodRows.filter(p => p._count.id > 0).map(p => p.patientId)
    );

    const sortedAttendances = [...attendances].sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );

    const seenThisPeriod   = new Set<string>();
    const reAttendanceMap  = new Map<string, boolean>();

    for (const att of sortedAttendances) {
      const isReAtt = hadPriorPeriodVisit.has(att.patientId) || seenThisPeriod.has(att.patientId);
      reAttendanceMap.set(att.id, isReAtt);
      seenThisPeriod.add(att.patientId);
    }

    // ── Diagnosis count tracking for top-10 ─────────────────
    const diagnosisCounts = new Map<string, {
      diagnosis: any;
      male: number;
      female: number;
      byAgeGroup: Record<GHSAgeGroup, { male: number; female: number }>;
    }>();

    // ── Main loop ────────────────────────────────────────────
    for (const attendance of sortedAttendances) {
      const patient = attendance.Patient;
      if (!patient) continue;

      const ageGroup = GHSMorbidityService.getAgeGroup(patient.dateOfBirth, attendance.dateTime);
      const gender   = patient.gender;

      report.totals.totalAttendances++;

      if (reAttendanceMap.get(attendance.id)) {
        report.totals.totalReAttendances++;
        GHSMorbidityService.inc(report.reAttendancesReferrals, 're_attendances', ageGroup, gender);
      } else {
        report.totals.totalNewCases++;
      }

      if ((attendance as any).ReferralRecord?.length > 0) {
        report.totals.totalReferrals++;
        GHSMorbidityService.inc(report.reAttendancesReferrals, 'referrals', ageGroup, gender);
      }

      for (const diag of attendance.AttendanceDiagnosis) {
        const diagnosis = diag.Diagnosis;
        if (!diagnosis?.morbidityGroup) continue;

        const group   = diagnosis.morbidityGroup as string;
        const section = MORBIDITY_SECTION_MAP.get(group);

        if (section && section !== 'reAttendancesReferrals') {
          GHSMorbidityService.inc(
            report[section] as Record<string, AgeSexBreakdown>,
            group, ageGroup, gender
          );
        }

        if (!diagnosisCounts.has(diagnosis.id)) {
          diagnosisCounts.set(diagnosis.id, {
            diagnosis,
            male: 0,
            female: 0,
            byAgeGroup: Object.fromEntries(
              AGE_GROUPS.map(ag => [ag, { male: 0, female: 0 }])
            ) as Record<GHSAgeGroup, { male: number; female: number }>
          });
        }
        const entry = diagnosisCounts.get(diagnosis.id)!;
        if (gender === 'male')   { entry.male++;   entry.byAgeGroup[ageGroup].male++;   }
        else                     { entry.female++; entry.byAgeGroup[ageGroup].female++; }
      }
    }

    report.topDiagnoses = Array.from(diagnosisCounts.values())
      .map(d => ({
        diagnosisId:    d.diagnosis.id,
        diagnosisName:  d.diagnosis.name,
        icdCode:        d.diagnosis.icdCode,
        morbidityGroup: d.diagnosis.morbidityGroup,
        totalCases:     d.male + d.female,
        male:           d.male,
        female:         d.female,
        byAgeGroup:     d.byAgeGroup
      }))
      .sort((a, b) => b.totalCases - a.totalCases)
      .slice(0, 10);

    console.log('✅ Morbidity Report Summary:', {
      totalAttendances: report.totals.totalAttendances,
      totalNewCases:    report.totals.totalNewCases,
      totalDiagnoses:   diagnosisCounts.size,
      topDiagnosis:     report.topDiagnoses[0]?.diagnosisName,
      topCount:         report.topDiagnoses[0]?.totalCases
    });

    return report;
  }

  // ─────────────────────────────────────────────────────────
  // Top diagnoses only — lightweight endpoint  ← instance method (uses this.prisma)
  // ─────────────────────────────────────────────────────────

  async getTopDiagnoses(
    startDate: Date,
    endDate: Date,
    limit = 10
  ): Promise<TopDiagnosis[]> {
    const attendances = await this.prisma.attendance.findMany({
      where: {
        dateTime: { gte: startDate, lte: endDate },
        status:   { not: 'cancelled' }
      },
      include: {
        Patient: true,
        AttendanceDiagnosis: { include: { Diagnosis: true } }
      }
    });

    const counts = new Map<string, {
      diagnosis: any;
      male: number;
      female: number;
      byAgeGroup: Record<GHSAgeGroup, { male: number; female: number }>;
    }>();

    for (const att of attendances) {
      if (!att.Patient) continue;
      const ageGroup = GHSMorbidityService.getAgeGroup(att.Patient.dateOfBirth, att.dateTime);
      const gender   = att.Patient.gender;

      for (const diag of att.AttendanceDiagnosis) {
        if (!diag.Diagnosis) continue;
        const id = diag.Diagnosis.id;

        if (!counts.has(id)) {
          counts.set(id, {
            diagnosis: diag.Diagnosis,
            male: 0,
            female: 0,
            byAgeGroup: Object.fromEntries(
              AGE_GROUPS.map(ag => [ag, { male: 0, female: 0 }])
            ) as Record<GHSAgeGroup, { male: number; female: number }>
          });
        }
        const e = counts.get(id)!;
        if (gender === 'male')   { e.male++;   e.byAgeGroup[ageGroup].male++;   }
        else                     { e.female++; e.byAgeGroup[ageGroup].female++; }
      }
    }

    return Array.from(counts.values())
      .map(d => ({
        diagnosisId:    d.diagnosis.id,
        diagnosisName:  d.diagnosis.name,
        icdCode:        d.diagnosis.icdCode,
        morbidityGroup: d.diagnosis.morbidityGroup,
        totalCases:     d.male + d.female,
        male:           d.male,
        female:         d.female,
        byAgeGroup:     d.byAgeGroup
      }))
      .sort((a, b) => b.totalCases - a.totalCases)
      .slice(0, limit);
  }

  // ─────────────────────────────────────────────────────────
  // CSV export — pure function, no DB access → static OK
  // ─────────────────────────────────────────────────────────

  static exportToCSV(report: GHSMorbidityReport): string {
    const rows: string[] = [];

    rows.push('"GHS Morbidity Report"');
    rows.push(`"Facility Name","${report.facility.name}"`);
    rows.push(`"District","${report.facility.district}"`);
    rows.push(`"GHF Code","${report.facility.ghfCode}"`);
    rows.push(`"Reporting Period","${report.period.startDate.toISOString().split('T')[0]}","to","${report.period.endDate.toISOString().split('T')[0]}"`);
    rows.push('');

    const addSection = (title: string, sectionKey: SectionKey) => {
      const data = report[sectionKey] as Record<string, AgeSexBreakdown>;
      rows.push(`"${title}"`);

      const header = ['"Disease/Condition"'];
      for (const ag of AGE_GROUPS) header.push(`"${ag}_M"`, `"${ag}_F"`);
      header.push('"Total_M"', '"Total_F"', '"Total"');
      rows.push(header.join(','));

      for (const key of SECTION_KEYS[sectionKey]) {
        const row: (string | number)[] = [`"${key.replace(/_/g, ' ')}"`];
        let totalM = 0, totalF = 0;
        for (const ag of AGE_GROUPS) {
          const m = data[key]?.[ag]?.male   ?? 0;
          const f = data[key]?.[ag]?.female ?? 0;
          row.push(m, f);
          totalM += m; totalF += f;
        }
        row.push(totalM, totalF, totalM + totalF);
        rows.push(row.join(','));
      }
      rows.push('');
    };

    addSection('SECTION 1: COMMUNICABLE IMMUNIZABLE',     'communicableImmunizable');
    addSection('SECTION 2: COMMUNICABLE NON-IMMUNIZABLE', 'communicableNonImmunizable');
    addSection('SECTION 3: NON-COMMUNICABLE DISEASES',    'nonCommunicable');
    addSection('SECTION 4: MENTAL HEALTH',                'mentalHealth');
    addSection('SECTION 5: SPECIALIZED CONDITIONS',       'specializedConditions');
    addSection('SECTION 6: OBSTETRICS & GYNAECOLOGY',     'obstetricsGynaecology');
    addSection('SECTION 7: REPRODUCTIVE TRACT',           'reproductiveTract');
    addSection('SECTION 8: INJURIES',                     'injuries');
    addSection('SECTION 9: RE-ATTENDANCES & REFERRALS',   'reAttendancesReferrals');

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
    rows.push('');
    rows.push(`"Generated At","${new Date().toISOString()}"`);

    return rows.join('\n');
  }
}