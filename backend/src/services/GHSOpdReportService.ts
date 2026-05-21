// services/GHSOpdReportService.ts
// Based on opd.pdf - Exact format

import { PrismaClient, Gender } from '@prisma/client';

export type OPD_AgeGroup =
  | '0-28d' | '1-11m' | '1-4y' | '5-9y' | '10-14y'
  | '15-17y' | '18-19y' | '20-34y' | '35-49y' | '50-59y' | '60-69y' | '70+y';

export interface OPD_AgeGroupData {
  insured:    { male: number; female: number };
  nonInsured: { male: number; female: number };
  new: number;
  old: number;
}

export interface OPDReport {
  period:   { startDate: Date; endDate: Date; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
  ageGroups: Record<OPD_AgeGroup, OPD_AgeGroupData>;
  totals: {
    totalAttendances: number;
    insured:    { male: number; female: number; total: number };
    nonInsured: { male: number; female: number; total: number };
    new: number;
    old: number;
  };
}

export class GHSOpdReportService {
  private prisma: PrismaClient;  // ✅ injected instance

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ─────────────────────────────────────────────────────────
  // Pure helpers — no DB access → static OK
  // ─────────────────────────────────────────────────────────

  private static readonly AGE_GROUPS: OPD_AgeGroup[] = [
    '0-28d', '1-11m', '1-4y', '5-9y', '10-14y',
    '15-17y', '18-19y', '20-34y', '35-49y', '50-59y', '60-69y', '70+y'
  ];

  private static getAgeGroup(dob: Date, referenceDate: Date): OPD_AgeGroup {
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

  private static createEmptyAgeGroupData(): OPD_AgeGroupData {
    return {
      insured:    { male: 0, female: 0 },
      nonInsured: { male: 0, female: 0 },
      new: 0,
      old: 0
    };
  }

  private static normaliseDates(
    startDateParam: string | Date,
    endDateParam:   string | Date
  ): { startDate: Date; endDate: Date } {
    const startDate = typeof startDateParam === 'string'
      ? new Date(startDateParam)
      : new Date(startDateParam);
    startDate.setHours(0, 0, 0, 0);

    const endDate = typeof endDateParam === 'string'
      ? new Date(endDateParam)
      : new Date(endDateParam);
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate.getTime())) throw new Error(`Invalid startDate: ${startDateParam}`);
    if (isNaN(endDate.getTime()))   throw new Error(`Invalid endDate: ${endDateParam}`);

    return { startDate, endDate };
  }

  // ─────────────────────────────────────────────────────────
  // MAIN: generate OPD report  ← instance method (uses this.prisma)
  //
  // N+1 FIX: the old code called getPatientVisitCount() once per attendance,
  // firing one COUNT query per row. Replaced with a single groupBy query that
  // fetches prior-visit counts for ALL patients in the period at once, then
  // does O(1) Map lookups inside the loop.
  // ─────────────────────────────────────────────────────────

  async generateOPDReport(
    startDateParam: string | Date,
    endDateParam:   string | Date
  ): Promise<OPDReport> {
    const { startDate, endDate } = GHSOpdReportService.normaliseDates(startDateParam, endDateParam);

    // Initialise age-group buckets
    const ageGroups = {} as Record<OPD_AgeGroup, OPD_AgeGroupData>;
    for (const ag of GHSOpdReportService.AGE_GROUPS) {
      ageGroups[ag] = GHSOpdReportService.createEmptyAgeGroupData();
    }

    const totals = {
      totalAttendances: 0,
      insured:    { male: 0, female: 0, total: 0 },
      nonInsured: { male: 0, female: 0, total: 0 },
      new: 0,
      old: 0
    };

    // ── Query 1: all OPD attendances in the period ──────────
    const attendances = await this.prisma.attendance.findMany({
      where: {
        encounterCategory: 'opd',
        dateTime: { gte: startDate, lte: endDate },
        status:   { not: 'cancelled' }
      },
      include: {
        Patient: {
          select: {
            id: true,
            dateOfBirth: true,
            gender: true,
            paymentMode: true
          }
        }
      }
    });

    if (attendances.length === 0) {
      const hospital = await this.prisma.hospital.findFirst();
      return this.buildReport(startDate, endDate, ageGroups, totals, hospital);
    }

    // ── Query 2: prior-visit counts for every patient — ONE query, zero N+1 ──
    //
    // We need to know, for each attendance, whether that patient had ANY
    // attendance BEFORE this one. The safest approach:
    //
    //   • Collect all unique patientIds.
    //   • Ask the DB how many non-cancelled attendances each patient had
    //     BEFORE startDate (prior-period visits).
    //   • Then sort this period's attendances chronologically and use a
    //     running seen-set to catch within-period first visits.
    //
    // This matches exactly the same logic used in GHSMorbidityService.

    const patientIds = [...new Set(attendances.map(a => a.patientId).filter(Boolean))];

    const priorRows = await this.prisma.attendance.groupBy({
      by: ['patientId'],
      where: {
        patientId: { in: patientIds },
        dateTime:  { lt: startDate },
        status:    { not: 'cancelled' }
      },
      _count: { id: true }
    });

    // Set of patients who had at least one visit before this reporting period
    const hadPriorVisit = new Set(
      priorRows.filter(r => r._count.id > 0).map(r => r.patientId)
    );

    // Sort chronologically so within-period first visits are detected correctly
    const sorted = [...attendances].sort(
      (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
    );

    // Running set: patients we have already seen once within this period
    const seenThisPeriod = new Set<string>();

    // ── Main loop ────────────────────────────────────────────
    for (const attendance of sorted) {
      const patient = attendance.Patient;
      if (!patient) continue;

      const ageGroup  = GHSOpdReportService.getAgeGroup(patient.dateOfBirth, attendance.dateTime);
      const gender    = patient.gender as 'male' | 'female';
      const isInsured = patient.paymentMode !== 'cash';

      // New = no prior visit before this period AND not yet seen this period
      const isNew = !hadPriorVisit.has(patient.id) && !seenThisPeriod.has(patient.id);
      seenThisPeriod.add(patient.id);

      // ── Age-group bucket ───────────────────────────────────
      const bucket = ageGroups[ageGroup];
      if (isInsured) {
        if (gender === 'male') bucket.insured.male++;
        else                   bucket.insured.female++;
      } else {
        if (gender === 'male') bucket.nonInsured.male++;
        else                   bucket.nonInsured.female++;
      }
      if (isNew) bucket.new++;
      else       bucket.old++;

      // ── Totals ─────────────────────────────────────────────
      totals.totalAttendances++;
      if (isInsured) {
        if (gender === 'male') totals.insured.male++;
        else                   totals.insured.female++;
        totals.insured.total++;
      } else {
        if (gender === 'male') totals.nonInsured.male++;
        else                   totals.nonInsured.female++;
        totals.nonInsured.total++;
      }
      if (isNew) totals.new++;
      else       totals.old++;
    }

    const hospital = await this.prisma.hospital.findFirst();
    return this.buildReport(startDate, endDate, ageGroups, totals, hospital);
  }

  // ─────────────────────────────────────────────────────────
  // Private helper to assemble the final report object
  // ─────────────────────────────────────────────────────────

  private buildReport(
    startDate: Date,
    endDate:   Date,
    ageGroups: Record<OPD_AgeGroup, OPD_AgeGroupData>,
    totals:    OPDReport['totals'],
    hospital:  any
  ): OPDReport {
    return {
      period: {
        startDate,
        endDate,
        year:  startDate.getFullYear(),
        month: startDate.getMonth() + 1
      },
      facility: {
        name:     hospital?.name            ?? 'Hospital',
        district: hospital?.ghsDistrictCode ?? 'Unknown',
        ghfCode:  hospital?.ghaHFCode       ?? 'Unknown'
      },
      ageGroups,
      totals
    };
  }

  // ─────────────────────────────────────────────────────────
  // CSV export — pure, no DB access → static OK
  // ─────────────────────────────────────────────────────────

  static exportToCSV(report: OPDReport): string {
    const rows: string[] = [];

    rows.push(`OPD Morbidity Report,${report.period.startDate.toISOString().split('T')[0]},${report.period.endDate.toISOString().split('T')[0]}`);
    rows.push(`Facility,${report.facility.name},District,${report.facility.district},GHF Code,${report.facility.ghfCode}`);
    rows.push('');

    rows.push([
      'AGE GROUPS',
      'INSURED - MALE',
      'INSURED - FEMALE',
      'NON-INSURED - MALE',
      'NON-INSURED - FEMALE',
      'NEW',
      'OLD'
    ].join(','));

    for (const ag of GHSOpdReportService.AGE_GROUPS) {
      const d = report.ageGroups[ag];
      rows.push([
        ag,
        d.insured.male,
        d.insured.female,
        d.nonInsured.male,
        d.nonInsured.female,
        d.new,
        d.old
      ].join(','));
    }

    rows.push('');
    rows.push([
      'TOTAL',
      report.totals.insured.male,
      report.totals.insured.female,
      report.totals.nonInsured.male,
      report.totals.nonInsured.female,
      report.totals.new,
      report.totals.old
    ].join(','));

    return rows.join('\n');
  }
}