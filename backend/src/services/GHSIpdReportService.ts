// services/GHSIpdReportService.ts
// Based on ipd report.pdf - Complete with all 12 age groups

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ✅ COMPLETE AGE GROUPS for GHS IPD report (12 groups matching OPD)
export type IPD_AgeGroup = 
  | '0-28d' | '1-11m' | '1-4y' | '5-9y' | '10-14y' 
  | '15-17y' | '18-19y' | '20-34y' | '35-49y' | '50-59y' | '60-69y' | '70+y';

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
  facility: { name: string; district: string; region: string; ghfCode: string };
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
  
  private static readonly AGE_GROUPS: IPD_AgeGroup[] = [
    '0-28d', '1-11m', '1-4y', '5-9y', '10-14y', 
    '15-17y', '18-19y', '20-34y', '35-49y', '50-59y', '60-69y', '70+y'
  ];

  private static getAgeGroup(dob: Date, referenceDate: Date): IPD_AgeGroup {
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
    // Set end date to end of day
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    
    // Initialize age group data for ALL groups
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

    // Fetch all admissions during the period with patient and diagnosis data
    const admissions = await prisma.admission.findMany({
      where: {
        admissionDate: { gte: startDate, lte: endDateTime }
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

    console.log(`📊 Found ${admissions.length} IPD admissions for period: ${startDate.toISOString().split('T')[0]} to ${endDateTime.toISOString().split('T')[0]}`);

    // Process each admission
    for (const admission of admissions) {
      const patient = admission.Patient;
      if (!patient) continue;
      
      const ageGroup = this.getAgeGroup(patient.dateOfBirth, admission.admissionDate);
      const gender = patient.gender.toLowerCase() as 'male' | 'female';
      const isInsured = patient.paymentMode !== 'cash' && patient.paymentMode !== null;
      const isDead = admission.dischargeStatus === 'expired';
      
      // Check if this is a malaria case
      const isMalaria = admission.Attendance?.AttendanceDiagnosis?.some(
        diag => diag.Diagnosis?.name?.toLowerCase().includes('malaria') ||
                diag.Diagnosis?.icdCode?.startsWith('B5')
      );
      
      const ageInYears = (admission.admissionDate.getTime() - patient.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
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
      
      // Update age group data - Admissions
      if (isInsured) {
        if (gender === 'male') ageGroups[ageGroup].admissions.insured.male++;
        else ageGroups[ageGroup].admissions.insured.female++;
      } else {
        if (gender === 'male') ageGroups[ageGroup].admissions.nonInsured.male++;
        else ageGroups[ageGroup].admissions.nonInsured.female++;
      }
      
      // Update age group data - Deaths
      if (isDead) {
        if (isInsured) {
          if (gender === 'male') ageGroups[ageGroup].deaths.insured.male++;
          else ageGroups[ageGroup].deaths.insured.female++;
        } else {
          if (gender === 'male') ageGroups[ageGroup].deaths.nonInsured.male++;
          else ageGroups[ageGroup].deaths.nonInsured.female++;
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

    console.log('✅ IPD Report Summary:', {
      totalAdmissions: totals.totalAdmissions,
      totalDeaths: totals.totalDeaths
    });

    return {
      period: {
        startDate,
        endDate,
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1
      },
      facility: {
        name: hospital?.name || 'Health Facility',
        district: hospital?.ghsDistrictCode || 'Unknown District',
        region: 'Unknown Region',
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
    rows.push(`"IPD Morbidity & Mortality Report"`);
    rows.push(`"Facility Name","${report.facility.name}"`);
    rows.push(`"District","${report.facility.district}"`);
    rows.push(`"GHF Code","${report.facility.ghfCode}"`);
    rows.push(`"Reporting Period","${report.period.startDate.toISOString().split('T')[0]}","to","${report.period.endDate.toISOString().split('T')[0]}"`);
    rows.push('');
    
    // Admissions table
    rows.push('"ADMISSIONS"');
    const admissionHeader = ['"Age Group"'];
    for (const ageGroup of this.AGE_GROUPS) {
      admissionHeader.push(`"${ageGroup}_Insured_M"`, `"${ageGroup}_Insured_F"`, `"${ageGroup}_NonInsured_M"`, `"${ageGroup}_NonInsured_F"`);
    }
    admissionHeader.push('"Total"');
    rows.push(admissionHeader.join(','));
    
    const admissionRow = ['"Total"'];
    let totalAdmissions = 0;
    for (const ageGroup of this.AGE_GROUPS) {
      const data = report.ageGroups[ageGroup];
      const insuredM = data.admissions.insured.male;
      const insuredF = data.admissions.insured.female;
      const nonInsuredM = data.admissions.nonInsured.male;
      const nonInsuredF = data.admissions.nonInsured.female;
      const groupTotal = insuredM + insuredF + nonInsuredM + nonInsuredF;
      admissionRow.push(insuredM, insuredF, nonInsuredM, nonInsuredF);
      totalAdmissions += groupTotal;
    }
    admissionRow.push(totalAdmissions);
    rows.push(admissionRow.join(','));
    rows.push('');
    
    // Deaths table
    rows.push('"DEATHS"');
    const deathHeader = ['"Age Group"'];
    for (const ageGroup of this.AGE_GROUPS) {
      deathHeader.push(`"${ageGroup}_Insured_M"`, `"${ageGroup}_Insured_F"`, `"${ageGroup}_NonInsured_M"`, `"${ageGroup}_NonInsured_F"`);
    }
    deathHeader.push('"Total"');
    rows.push(deathHeader.join(','));
    
    const deathRow = ['"Total"'];
    let totalDeaths = 0;
    for (const ageGroup of this.AGE_GROUPS) {
      const data = report.ageGroups[ageGroup];
      const insuredM = data.deaths.insured.male;
      const insuredF = data.deaths.insured.female;
      const nonInsuredM = data.deaths.nonInsured.male;
      const nonInsuredF = data.deaths.nonInsured.female;
      const groupTotal = insuredM + insuredF + nonInsuredM + nonInsuredF;
      deathRow.push(insuredM, insuredF, nonInsuredM, nonInsuredF);
      totalDeaths += groupTotal;
    }
    deathRow.push(totalDeaths);
    rows.push(deathRow.join(','));
    rows.push('');
    
    // Malaria summary
    rows.push('"MALARIA IN INPATIENTS"');
    rows.push(`"Under 5 years Admitted","${report.malaria.under5_admitted}"`);
    rows.push(`"5+ years Admitted","${report.malaria.above5_admitted}"`);
    rows.push(`"Under 5 years Deaths","${report.malaria.under5_deaths}"`);
    rows.push(`"5+ years Deaths","${report.malaria.above5_deaths}"`);
    rows.push('');
    
    // Totals
    rows.push('"SUMMARY"');
    rows.push(`"Total Admissions","${report.totals.totalAdmissions}"`);
    rows.push(`"Total Deaths","${report.totals.totalDeaths}"`);
    
    return rows.join('\n');
  }
}