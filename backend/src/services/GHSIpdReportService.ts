// services/GHSIpdReportService.ts
// Based on ipd report.pdf - Complete with all 12 age groups

import { PrismaClient } from '@prisma/client';

export type IPD_AgeGroup =
  | '0-28d' | '1-11m' | '1-4y' | '5-9y' | '10-14y'
  | '15-17y' | '18-19y' | '20-34y' | '35-49y' | '50-59y' | '60-69y' | '70+y';

export interface IPD_AgeGroupData {
  admissions: {
    insured:    { male: number; female: number };
    nonInsured: { male: number; female: number };
  };
  deaths: {
    insured:    { male: number; female: number };
    nonInsured: { male: number; female: number };
  };
}

export interface IPD_MalariaData {
  under5_admitted: number;
  above5_admitted: number;
  under5_deaths:   number;
  above5_deaths:   number;
}

export interface IPDReport {
  period:   { startDate: Date; endDate: Date; year: number; month: number };
  facility: { name: string; district: string; region: string; ghfCode: string };
  ageGroups: Record<IPD_AgeGroup, IPD_AgeGroupData>;
  malaria: IPD_MalariaData;
  totals: {
    totalAdmissions: number;
    totalDeaths:     number;
    insured:    { admissions: number; deaths: number };
    nonInsured: { admissions: number; deaths: number };
  };
}

export class GHSIpdReportService {
  private prisma: PrismaClient;  // ✅ injected instance

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ─────────────────────────────────────────────────────────
  // Pure helpers — no DB access → static OK
  // ─────────────────────────────────────────────────────────

  private static readonly AGE_GROUPS: IPD_AgeGroup[] = [
    '0-28d', '1-11m', '1-4y', '5-9y', '10-14y',
    '15-17y', '18-19y', '20-34y', '35-49y', '50-59y', '60-69y', '70+y'
  ];

  private static getAgeGroup(dob: Date, referenceDate: Date): IPD_AgeGroup {
    const ageInDays  = Math.floor((referenceDate.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
    const ageInYears = ageInDays / 365.25;

    if (ageInDays  <  28) return '0-28d';
    if (ageInDays  < 365) return '1-11m';
    if (ageInYears <   5) return '1-4y';
    if (ageInYears <  10) return '5-9y';
    if (ageInYears <  15) return '10-14y';
    if (ageInYears <  18) return '15-17y';
    if (ageInYears <  20) return '18-19y';
    if (ageInYears <  35) return '20-34y';
    if (ageInYears <  50) return '35-49y';
    if (ageInYears <  60) return '50-59y';
    if (ageInYears <  70) return '60-69y';
    return '70+y';
  }

  private static createEmptyAgeGroupData(): IPD_AgeGroupData {
    return {
      admissions: {
        insured:    { male: 0, female: 0 },
        nonInsured: { male: 0, female: 0 }
      },
      deaths: {
        insured:    { male: 0, female: 0 },
        nonInsured: { male: 0, female: 0 }
      }
    };
  }

  // ─────────────────────────────────────────────────────────
  // MAIN: generate IPD report  ← instance method (uses this.prisma)
  // ─────────────────────────────────────────────────────────

  async generateIPDReport(startDate: Date, endDate: Date): Promise<IPDReport> {
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);

    // Initialise age-group buckets
    const ageGroups = {} as Record<IPD_AgeGroup, IPD_AgeGroupData>;
    for (const ag of GHSIpdReportService.AGE_GROUPS) {
      ageGroups[ag] = GHSIpdReportService.createEmptyAgeGroupData();
    }

    const malariaData: IPD_MalariaData = {
      under5_admitted: 0,
      above5_admitted: 0,
      under5_deaths:   0,
      above5_deaths:   0
    };

    const totals = {
      totalAdmissions: 0,
      totalDeaths:     0,
      insured:    { admissions: 0, deaths: 0 },
      nonInsured: { admissions: 0, deaths: 0 }
    };

    // ── Single query — all admissions with patient + diagnosis ──
    const admissions = await this.prisma.admission.findMany({
      where: {
        admissionDate: { gte: startDate, lte: endDateTime }
      },
      include: {
        Patient: {
          select: {
            id:          true,
            dateOfBirth: true,
            gender:      true,
            paymentMode: true
          }
        },
        Attendance: {
          include: {
            AttendanceDiagnosis: {
              include: { Diagnosis: true }
            }
          }
        }
      }
    });

    console.log(
      `📊 Found ${admissions.length} IPD admissions for period: ` +
      `${startDate.toISOString().split('T')[0]} to ${endDateTime.toISOString().split('T')[0]}`
    );

    // ── Main loop ────────────────────────────────────────────
    for (const admission of admissions) {
      const patient = admission.Patient;
      if (!patient) continue;

      const ageGroup  = GHSIpdReportService.getAgeGroup(patient.dateOfBirth, admission.admissionDate);
      const gender    = patient.gender.toLowerCase() as 'male' | 'female';
      const isInsured = patient.paymentMode !== 'cash' && patient.paymentMode !== null;
      const isDead    = admission.dischargeStatus === 'expired';

      // Malaria check — already loaded inline, no extra query
      const isMalaria = admission.Attendance?.AttendanceDiagnosis?.some(
        diag =>
          diag.Diagnosis?.name?.toLowerCase().includes('malaria') ||
          diag.Diagnosis?.icdCode?.startsWith('B5')
      );

      const ageInYears =
        (admission.admissionDate.getTime() - patient.dateOfBirth.getTime()) /
        (1000 * 60 * 60 * 24 * 365.25);
      const isUnder5 = ageInYears < 5;

      if (isMalaria) {
        if (isUnder5) {
          malariaData.under5_admitted++;
          if (isDead) malariaData.under5_deaths++;
        } else {
          malariaData.above5_admitted++;
          if (isDead) malariaData.above5_deaths++;
        }
      }

      // ── Age-group admissions ───────────────────────────────
      const bucket = ageGroups[ageGroup];
      if (isInsured) {
        if (gender === 'male') bucket.admissions.insured.male++;
        else                   bucket.admissions.insured.female++;
      } else {
        if (gender === 'male') bucket.admissions.nonInsured.male++;
        else                   bucket.admissions.nonInsured.female++;
      }

      // ── Age-group deaths ───────────────────────────────────
      if (isDead) {
        if (isInsured) {
          if (gender === 'male') bucket.deaths.insured.male++;
          else                   bucket.deaths.insured.female++;
        } else {
          if (gender === 'male') bucket.deaths.nonInsured.male++;
          else                   bucket.deaths.nonInsured.female++;
        }
      }

      // ── Totals ─────────────────────────────────────────────
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

    console.log('✅ IPD Report Summary:', {
      totalAdmissions: totals.totalAdmissions,
      totalDeaths:     totals.totalDeaths
    });

    return {
      period: {
        startDate,
        endDate,
        year:  startDate.getFullYear(),
        month: startDate.getMonth() + 1
      },
      facility: {
        name:     hospital?.name            ?? 'Health Facility',
        district: hospital?.ghsDistrictCode ?? 'Unknown District',
        region:   'Unknown Region',
        ghfCode:  hospital?.ghaHFCode       ?? 'Unknown'
      },
      ageGroups,
      malaria: malariaData,
      totals
    };
  }

  // ─────────────────────────────────────────────────────────
  // CSV export — pure, no DB access → static OK
  // ─────────────────────────────────────────────────────────

  static exportToCSV(report: IPDReport): string {
    const rows: string[] = [];

    rows.push('"IPD Morbidity & Mortality Report"');
    rows.push(`"Facility Name","${report.facility.name}"`);
    rows.push(`"District","${report.facility.district}"`);
    rows.push(`"GHF Code","${report.facility.ghfCode}"`);
    rows.push(`"Reporting Period","${report.period.startDate.toISOString().split('T')[0]}","to","${report.period.endDate.toISOString().split('T')[0]}"`);
    rows.push('');

    // ── Admissions table ───────────────────────────────────
    rows.push('"ADMISSIONS"');
    const admissionHeader = ['"Age Group"'];
    for (const ag of GHSIpdReportService.AGE_GROUPS) {
      admissionHeader.push(
        `"${ag}_Insured_M"`, `"${ag}_Insured_F"`,
        `"${ag}_NonInsured_M"`, `"${ag}_NonInsured_F"`
      );
    }
    admissionHeader.push('"Total"');
    rows.push(admissionHeader.join(','));

    const admissionRow: (string | number)[] = ['"Total"'];
    let totalAdmissions = 0;
    for (const ag of GHSIpdReportService.AGE_GROUPS) {
      const d = report.ageGroups[ag];
      const insuredM    = d.admissions.insured.male;
      const insuredF    = d.admissions.insured.female;
      const nonInsuredM = d.admissions.nonInsured.male;
      const nonInsuredF = d.admissions.nonInsured.female;
      admissionRow.push(insuredM, insuredF, nonInsuredM, nonInsuredF);
      totalAdmissions += insuredM + insuredF + nonInsuredM + nonInsuredF;
    }
    admissionRow.push(totalAdmissions);
    rows.push(admissionRow.join(','));
    rows.push('');

    // ── Deaths table ───────────────────────────────────────
    rows.push('"DEATHS"');
    const deathHeader = ['"Age Group"'];
    for (const ag of GHSIpdReportService.AGE_GROUPS) {
      deathHeader.push(
        `"${ag}_Insured_M"`, `"${ag}_Insured_F"`,
        `"${ag}_NonInsured_M"`, `"${ag}_NonInsured_F"`
      );
    }
    deathHeader.push('"Total"');
    rows.push(deathHeader.join(','));

    const deathRow: (string | number)[] = ['"Total"'];
    let totalDeaths = 0;
    for (const ag of GHSIpdReportService.AGE_GROUPS) {
      const d = report.ageGroups[ag];
      const insuredM    = d.deaths.insured.male;
      const insuredF    = d.deaths.insured.female;
      const nonInsuredM = d.deaths.nonInsured.male;
      const nonInsuredF = d.deaths.nonInsured.female;
      deathRow.push(insuredM, insuredF, nonInsuredM, nonInsuredF);
      totalDeaths += insuredM + insuredF + nonInsuredM + nonInsuredF;
    }
    deathRow.push(totalDeaths);
    rows.push(deathRow.join(','));
    rows.push('');

    // ── Malaria summary ────────────────────────────────────
    rows.push('"MALARIA IN INPATIENTS"');
    rows.push(`"Under 5 years Admitted","${report.malaria.under5_admitted}"`);
    rows.push(`"5+ years Admitted","${report.malaria.above5_admitted}"`);
    rows.push(`"Under 5 years Deaths","${report.malaria.under5_deaths}"`);
    rows.push(`"5+ years Deaths","${report.malaria.above5_deaths}"`);
    rows.push('');

    // ── Summary ────────────────────────────────────────────
    rows.push('"SUMMARY"');
    rows.push(`"Total Admissions","${report.totals.totalAdmissions}"`);
    rows.push(`"Total Deaths","${report.totals.totalDeaths}"`);

    return rows.join('\n');
  }
}