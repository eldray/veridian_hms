// services/GHSIpdReportService.ts
// Based on ipd report.pdf - Exact format with admissions and deaths

import { PrismaClient, PaymentMode, Gender, DischargeStatus } from '@prisma/client';

const prisma = new PrismaClient();

export type IPD_AgeGroup = '0-28d' | '1-11m' | '5-9y' | '10-14y';

export interface IPD_AgeGroupData {
  admissions: {
    insured: { male: number; female: number };
    nonInsured: { male: number; female: number };
  };
  deaths: {
    insured: { male: number; female: number };
    nonInsured: { male: number; female: number };
  };
}

export interface IPD_MalariaData {
  under5_admitted: number;
  above5_admitted: number;
  under5_deaths: number;
  above5_deaths: number;
}

export interface IPDReport {
  period: { startDate: Date; endDate: Date; year: number; month: number };
  facility: { name: string; district: string; ghfCode: string };
  ageGroups: Record<IPD_AgeGroup, IPD_AgeGroupData>;
  malaria: IPD_MalariaData;
  totals: {
    totalAdmissions: number;
    totalDeaths: number;
    insured: { admissions: number; deaths: number };
    nonInsured: { admissions: number; deaths: number };
  };
}

export class GHSIpdReportService {
  
  private static readonly AGE_GROUPS: IPD_AgeGroup[] = ['0-28d', '1-11m', '5-9y', '10-14y'];

  private static getAgeGroup(dob: Date, referenceDate: Date): IPD_AgeGroup | null {
    const ageInDays = Math.floor((referenceDate.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
    const ageInYears = ageInDays / 365.25;
    
    if (ageInDays < 28) return '0-28d';
    if (ageInDays < 365) return '1-11m';
    if (ageInYears < 10) return '5-9y';
    if (ageInYears < 15) return '10-14y';
    return null; // Age not in IPD reporting range
  }

  private static createEmptyAgeGroupData(): IPD_AgeGroupData {
    return {
      admissions: {
        insured: { male: 0, female: 0 },
        nonInsured: { male: 0, female: 0 }
      },
      deaths: {
        insured: { male: 0, female: 0 },
        nonInsured: { male: 0, female: 0 }
      }
    };
  }

  static async generateIPDReport(startDate: Date, endDate: Date): Promise<IPDReport> {
    // Initialize age group data
    const ageGroups: Record<IPD_AgeGroup, IPD_AgeGroupData> = {} as any;
    for (const ageGroup of this.AGE_GROUPS) {
      ageGroups[ageGroup] = this.createEmptyAgeGroupData();
    }

    let malariaData: IPD_MalariaData = {
      under5_admitted: 0,
      above5_admitted: 0,
      under5_deaths: 0,
      above5_deaths: 0
    };

    let totals = {
      totalAdmissions: 0,
      totalDeaths: 0,
      insured: { admissions: 0, deaths: 0 },
      nonInsured: { admissions: 0, deaths: 0 }
    };

    // Fetch IPD admissions (with discharge)
    const admissions = await prisma.admission.findMany({
      where: {
        admissionDate: { gte: startDate, lte: endDate },
        status: 'discharged'
      },
      include: {
        Patient: {
          select: {
            id: true,
            dateOfBirth: true,
            gender: true,
            paymentMode: true
          }
        },
        Attendance: {
          include: {
            AttendanceDiagnosis: {
              include: {
                Diagnosis: true
              }
            }
          }
        }
      }
    });

    // Process each admission
    for (const admission of admissions) {
      const patient = admission.Patient;
      const ageGroup = this.getAgeGroup(patient.dateOfBirth, admission.admissionDate);
      const gender = patient.gender.toLowerCase() as 'male' | 'female';
      const isInsured = patient.paymentMode !== 'cash';
      const isDead = admission.dischargeStatus === 'expired';
      
      // Check if this is a malaria case
      const isMalaria = admission.Attendance?.AttendanceDiagnosis?.some(
        diag => diag.Diagnosis?.name?.toLowerCase().includes('malaria') ||
                diag.Diagnosis?.icdCode?.startsWith('B5')
      );
      
      const ageInYears = (new Date(admission.admissionDate).getTime() - patient.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
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
      
      // Update age group data if age is within IPD reporting range
      if (ageGroup) {
        // Admissions
        if (isInsured) {
          if (gender === 'male') ageGroups[ageGroup].admissions.insured.male++;
          else ageGroups[ageGroup].admissions.insured.female++;
        } else {
          if (gender === 'male') ageGroups[ageGroup].admissions.nonInsured.male++;
          else ageGroups[ageGroup].admissions.nonInsured.female++;
        }
        
        // Deaths
        if (isDead) {
          if (isInsured) {
            if (gender === 'male') ageGroups[ageGroup].deaths.insured.male++;
            else ageGroups[ageGroup].deaths.insured.female++;
          } else {
            if (gender === 'male') ageGroups[ageGroup].deaths.nonInsured.male++;
            else ageGroups[ageGroup].deaths.nonInsured.female++;
          }
        }
      }
      
      // Update totals
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
      malaria: malariaData,
      totals
    };
  }

  static exportToCSV(report: IPDReport): string {
    const rows: string[] = [];
    
    // Header
    rows.push(`IPD Morbidity & Mortality Report,${report.period.startDate.toISOString().split('T')[0]},${report.period.endDate.toISOString().split('T')[0]}`);
    rows.push(`Facility,${report.facility.name},District,${report.facility.district},GHF Code,${report.facility.ghfCode}`);
    rows.push('');
    
    // Admissions table
    rows.push('ADMISSIONS');
    rows.push('AGE GROUPS,INSURED - MALE,INSURED - FEMALE,NON-INSURED - MALE,NON-INSURED - FEMALE');
    for (const ageGroup of this.AGE_GROUPS) {
      const data = report.ageGroups[ageGroup];
      rows.push([
        ageGroup,
        data.admissions.insured.male,
        data.admissions.insured.female,
        data.admissions.nonInsured.male,
        data.admissions.nonInsured.female
      ].join(','));
    }
    
    // Deaths table
    rows.push('');
    rows.push('DEATHS');
    rows.push('AGE GROUPS,INSURED - MALE,INSURED - FEMALE,NON-INSURED - MALE,NON-INSURED - FEMALE');
    for (const ageGroup of this.AGE_GROUPS) {
      const data = report.ageGroups[ageGroup];
      rows.push([
        ageGroup,
        data.deaths.insured.male,
        data.deaths.insured.female,
        data.deaths.nonInsured.male,
        data.deaths.nonInsured.female
      ].join(','));
    }
    
    // Malaria summary
    rows.push('');
    rows.push('SUMMARY OF INPATIENT MALARIA CASES');
    rows.push(`Number of Patients below 5 years of Age Admitted with Malaria,${report.malaria.under5_admitted}`);
    rows.push(`Number of Patients 5 years and above Admitted with Malaria,${report.malaria.above5_admitted}`);
    rows.push(`Number of Patients below 5 years of Age Dying of Malaria,${report.malaria.under5_deaths}`);
    rows.push(`Number of Patients 5 years and above Dying of Malaria,${report.malaria.above5_deaths}`);
    
    // Totals
    rows.push('');
    rows.push(`TOTAL ADMISSIONS,${report.totals.totalAdmissions}`);
    rows.push(`TOTAL DEATHS,${report.totals.totalDeaths}`);
    
    return rows.join('\n');
  }
}