// services/NHISClaimService.ts - COMPLETE CORRECTED VERSION
import { PrismaClient, DiagnosisType, PresentOnAdmission } from '@prisma/client';

const prisma = new PrismaClient();

export class NHISClaimService {

  static calculateAgeInDays(dateOfBirth: Date, asOfDate: Date): number {
    const birthDate = new Date(dateOfBirth);
    const targetDate = new Date(asOfDate);
    const diffTime = targetDate.getTime() - birthDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  static calculateAgeInYears(dateOfBirth: Date, asOfDate: Date): number {
    const birthDate = new Date(dateOfBirth);
    const targetDate = new Date(asOfDate);
    let age = targetDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = targetDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }

  static async findNHISProvider(): Promise<string | null> {
    const nhisProvider = await prisma.insuranceProvider.findFirst({
      where: { 
        type: 'nhis',
        isActive: true 
      },
      select: { id: true }
    });
    return nhisProvider?.id || null;
  }

  static async getBillLineItems(billId: string) {
    return await prisma.billLineItem.findMany({
      where: { billId, isVoided: false },
      include: {
        serviceCatalog: {
          select: {
            name: true,
            code: true,
            nhisServiceCode: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }
  
  static async validateNHISClaim(attendanceId: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        AttendanceDiagnosis: { include: { Diagnosis: true } },
        ServiceRendered: { include: { ServiceCatalog: true } },
        Patient: true
      }
    });

    if (!attendance) {
      throw new Error('Attendance not found');
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    if (attendance.paymentMode === 'nhis' && !attendance.nhisCCC) {
      errors.push('NHIS CCC number is required for NHIS claims');
    }

    // ✅ FIXED: Use diagnosisType instead of primary
    const primaryDiagnosis = attendance.AttendanceDiagnosis.find(d => d.diagnosisType === 'primary');
    if (!primaryDiagnosis) {
      errors.push('Primary diagnosis is required for NHIS claims');
    }

    for (const service of attendance.ServiceRendered) {
      if (!service.ServiceCatalog?.nhisServiceCode) {
        warnings.push(`Service "${service.ServiceCatalog?.name}" missing NHIS service code`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canSubmit: errors.length === 0
    };
  }

  static async generateClaimXML(claimData: any): Promise<string> {
    const facilityCode = process.env.NHIS_FACILITY_CODE || 'FAC001';
    
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NHISClaim>
  <FacilityCode>${facilityCode}</FacilityCode>
  <ClaimType>${claimData.claimType}</ClaimType>
  <PatientCCC>${claimData.patient?.nhisNumber || ''}</PatientCCC>
  <PatientAgeInYears>${claimData.patient?.ageInYears || 0}</PatientAgeInYears>
  <PatientGender>${claimData.patient?.gender || ''}</PatientGender>
  <PrimaryDiagnosis>
    <ICD10Code>${claimData.clinical?.primaryDiagnosis?.icdCode || ''}</ICD10Code>
  </PrimaryDiagnosis>
  <GDRGTariff>
    <Code>${claimData.gdrgTariff?.code || ''}</Code>
    <Amount>${claimData.gdrgTariff?.nhiaTariff || 0}</Amount>
  </GDRGTariff>
  <TotalServices>${claimData.services?.length || 0}</TotalServices>
  <TotalClaimAmount>${claimData.gdrgTariff?.nhiaTariff || 0}</TotalClaimAmount>
</NHISClaim>`;

    return xml;
  }
}