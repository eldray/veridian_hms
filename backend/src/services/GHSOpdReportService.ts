// services/GHSOpdReportService.ts
// Based on opd.pdf - Exact format

import { PrismaClient, PaymentMode, Gender } from '@prisma/client';

const prisma = new PrismaClient();

export type OPD_AgeGroup = 
  | '0-28d' | '1-11m' | '1-4y' | '5-9y' | '10-14y' 
  | '15-17y' | '18-19y' | '20-34y' | '35-49y' | '50-59y' | '60-69y' | '70+y';

export interface OPD_AgeGroupData {
  insured: { male: number; female: number };
  nonInsured: { male: number; female: number };
  new: number;
  old: number;
}

export interface OPDReport {
  period: { startDate: Date; endDate: Date; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
  ageGroups: Record<OPD_AgeGroup, OPD_AgeGroupData>;
  totals: {
    totalAttendances: number;
    insured: { male: number; female: number; total: number };
    nonInsured: { male: number; female: number; total: number };
    new: number;
    old: number;
  };
}

export class GHSOpdReportService {
  
  private static readonly AGE_GROUPS: OPD_AgeGroup[] = [
    '0-28d', '1-11m', '1-4y', '5-9y', '10-14y', 
    '15-17y', '18-19y', '20-34y', '35-49y', '50-59y', '60-69y', '70+y'
  ];

  private static getAgeGroup(dob: Date, referenceDate: Date): OPD_AgeGroup {
    const ageInDays = Math.floor((referenceDate.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
    const ageInYears = ageInDays / 365.25;
    
    if (ageInDays < 28) return '0-28d';
    if (ageInDays < 365) return '1-11m';
    if (ageInYears < 5) return '1-4y';
    if (ageInYears < 10) return '5-9y';
    if (ageInYears < 15) return '10-14y';
    if (ageInYears < 18) return '15-17y';
    if (ageInYears < 20) return '18-19y';
    if (ageInYears < 35) return '20-34y';
    if (ageInYears < 50) return '35-49y';
    if (ageInYears < 60) return '50-59y';
    if (ageInYears < 70) return '60-69y';
    return '70+y';
  }

  private static createEmptyAgeGroupData(): OPD_AgeGroupData {
    return {
      insured: { male: 0, female: 0 },
      nonInsured: { male: 0, female: 0 },
      new: 0,
      old: 0
    };
  }

  private static async getPatientVisitCount(patientId: string, currentDate: Date): Promise<number> {
    return await prisma.attendance.count({
      where: {
        patientId,
        dateTime: { lt: currentDate },
        status: { not: 'cancelled' }
      }
    });
  }

  static async generateOPDReport(startDate: Date, endDate: Date): Promise<OPDReport> {
    // Initialize age group data
    const ageGroups: Record<OPD_AgeGroup, OPD_AgeGroupData> = {} as any;
    for (const ageGroup of this.AGE_GROUPS) {
      ageGroups[ageGroup] = this.createEmptyAgeGroupData();
    }

    let totals = {
      totalAttendances: 0,
      insured: { male: 0, female: 0, total: 0 },
      nonInsured: { male: 0, female: 0, total: 0 },
      new: 0,
      old: 0
    };

    // Fetch OPD attendances
    const attendances = await prisma.attendance.findMany({
      where: {
        encounterCategory: 'opd',
        dateTime: { gte: startDate, lte: endDate },
        status: { not: 'cancelled' }
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

    // Process each attendance
    for (const attendance of attendances) {
      const patient = attendance.Patient;
      const ageGroup = this.getAgeGroup(patient.dateOfBirth, attendance.dateTime);
      const gender = patient.gender.toLowerCase() as 'male' | 'female';
      const isInsured = patient.paymentMode !== 'cash';
      
      // Get visit count to determine new vs old
      const visitCount = await this.getPatientVisitCount(patient.id, attendance.dateTime);
      const isNew = visitCount === 0;
      
      // Update age group data
      if (isInsured) {
        if (gender === 'male') ageGroups[ageGroup].insured.male++;
        else ageGroups[ageGroup].insured.female++;
        if (isNew) ageGroups[ageGroup].new++;
        else ageGroups[ageGroup].old++;
      } else {
        if (gender === 'male') ageGroups[ageGroup].nonInsured.male++;
        else ageGroups[ageGroup].nonInsured.female++;
        if (isNew) ageGroups[ageGroup].new++;
        else ageGroups[ageGroup].old++;
      }
      
      // Update totals
      totals.totalAttendances++;
      if (isInsured) {
        if (gender === 'male') totals.insured.male++;
        else totals.insured.female++;
        totals.insured.total++;
      } else {
        if (gender === 'male') totals.nonInsured.male++;
        else totals.nonInsured.female++;
        totals.nonInsured.total++;
      }
      if (isNew) totals.new++;
      else totals.old++;
    }

    // Get facility info
    const hospital = await prisma.hospital.findFirst();

    return {
      period: {
        startDate,
        endDate,
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1
      },
      facility: {
        name: hospital?.name || 'Hospital',
        district: hospital?.ghsDistrictCode || 'Unknown',
        ghfCode: hospital?.ghaHFCode || 'Unknown'
      },
      ageGroups,
      totals
    };
  }

  static exportToCSV(report: OPDReport): string {
    const rows: string[] = [];
    
    // Header
    rows.push(`OPD Morbidity Report,${report.period.startDate.toISOString().split('T')[0]},${report.period.endDate.toISOString().split('T')[0]}`);
    rows.push(`Facility,${report.facility.name},District,${report.facility.district},GHF Code,${report.facility.ghfCode}`);
    rows.push('');
    
    // Main table header
    const headerRow = [
      'AGE GROUPS',
      'INSURED - MALE',
      'INSURED - FEMALE',
      'NON-INSURED - MALE',
      'NON-INSURED - FEMALE',
      'NEW',
      'OLD'
    ];
    rows.push(headerRow.join(','));
    
    // Data rows
    for (const ageGroup of this.AGE_GROUPS) {
      const data = report.ageGroups[ageGroup];
      rows.push([
        ageGroup,
        data.insured.male,
        data.insured.female,
        data.nonInsured.male,
        data.nonInsured.female,
        data.new,
        data.old
      ].join(','));
    }
    
    // Totals row
    rows.push('');
    rows.push(`TOTAL,${report.totals.insured.male},${report.totals.insured.female},${report.totals.nonInsured.male},${report.totals.nonInsured.female},${report.totals.new},${report.totals.old}`);
    
    return rows.join('\n');
  }
}