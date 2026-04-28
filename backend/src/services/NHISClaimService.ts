// services/NHISClaimService.ts - COMPLETE CORRECTED VERSION
import { PrismaClient } from '@prisma/client';

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

  static async resolveGDRGByContext(attendance: any, patientAgeInYears: number): Promise<any | null> {
    const isAdult = patientAgeInYears >= 12;
    
    // Antenatal/Postnatal OPD
    if (attendance.attendanceType === 'antenatal' || attendance.attendanceType === 'postnatal') {
      return await prisma.gDRGTariff.findFirst({
        where: { gdrgCode: 'OPDC02A', isActive: true }
      });
    }
    
    // Delivery
    if (attendance.attendanceType === 'delivery') {
      return await prisma.gDRGTariff.findFirst({
        where: { gdrgCode: 'OBGY34A', isActive: true }
      });
    }
    
    // Detention/Observation (daycase)
    if (attendance.encounterCategory === 'daycase') {
      const gdrgCode = isAdult ? 'ZOOM02A' : 'ZOOM02C';
      return await prisma.gDRGTariff.findFirst({
        where: { gdrgCode, isActive: true }
      });
    }
    
    // Inpatient Admission (IPD)
    if (attendance.encounterCategory === 'ipd') {
      const primaryDiagnosis = attendance.AttendanceDiagnosis?.[0]?.Diagnosis;
      const morbidityGroup = primaryDiagnosis?.morbidityGroup;
      
      let gdrgCode = isAdult ? 'MEDI26A' : 'PAED34C';
      
      if (morbidityGroup?.includes('malaria')) {
        gdrgCode = isAdult ? 'MEDI28A' : 'PAED36C';
      } else if (morbidityGroup === 'hypertension') {
        gdrgCode = isAdult ? 'MEDI32A' : 'PAED40C';
      } else if (morbidityGroup === 'pneumonia') {
        gdrgCode = isAdult ? 'MEDI31A' : 'PAED39C';
      } else if (morbidityGroup === 'diabetes_mellitus') {
        gdrgCode = isAdult ? 'MEDI02A' : 'PAED02C';
      } else if (morbidityGroup === 'asthma') {
        gdrgCode = isAdult ? 'MEDI22A' : 'PAED30C';
      }
      
      return await prisma.gDRGTariff.findFirst({
        where: { gdrgCode, isActive: true }
      });
    }
    
    // Default OPD
    const gdrgCode = isAdult ? 'OPDC06A' : 'OPDC06C';
    return await prisma.gDRGTariff.findFirst({
      where: { gdrgCode, isActive: true }
    });
  }

  static async generateNHISClaimData(attendanceId: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        Patient: { 
          select: { 
            surname: true, 
            otherNames: true, 
            dateOfBirth: true, 
            gender: true,
            folderNumber: true
          } 
        },
        AttendanceDiagnosis: { 
          include: { 
            Diagnosis: { 
              select: { 
                name: true, 
                icdCode: true, 
                morbidityGroup: true
              } 
            } 
          },
          where: { primary: true }
        },
        ServiceRendered: { 
          include: { 
            ServiceCatalog: { 
              select: { 
                name: true, 
                code: true,
                nhisServiceCode: true,
                serviceCategory: true
              } 
            } 
          } 
        }
      }
    });

    if (!attendance) throw new Error('Attendance not found');

    const primaryDiagnosis = attendance.AttendanceDiagnosis[0]?.Diagnosis;
    if (!primaryDiagnosis) {
      throw new Error('Primary diagnosis required for NHIS claim');
    }

    const patientAgeInYears = this.calculateAgeInYears(
      attendance.Patient.dateOfBirth,
      attendance.dateTime
    );

    const gdrgTariff = await this.resolveGDRGByContext(attendance, patientAgeInYears);

    if (!gdrgTariff) {
      console.warn(`⚠️ No GDRG tariff found for attendance: ${attendance.attendanceNumber}, age: ${patientAgeInYears}`);
    }

    const nhisServices = attendance.ServiceRendered
      .filter(service => service.ServiceCatalog.nhisServiceCode)
      .map(service => ({
        description: service.ServiceCatalog.name,
        nhisServiceCode: service.ServiceCatalog.nhisServiceCode,
        quantity: service.quantity,
      }));

    return {
      claimType: 'NHIS',
      encounterType: attendance.visitCategory,
      patient: {
        nhisNumber: attendance.nhisCCC,
        fullName: `${attendance.Patient.surname} ${attendance.Patient.otherNames}`.trim(),
        dateOfBirth: attendance.Patient.dateOfBirth,
        gender: attendance.Patient.gender,
        ageInYears: patientAgeInYears,
        folderNumber: attendance.Patient.folderNumber
      },
      clinical: {
        attendanceDate: attendance.dateTime,
        primaryDiagnosis: {
          description: primaryDiagnosis.name,
          icdCode: primaryDiagnosis.icdCode,
          morbidityGroup: primaryDiagnosis.morbidityGroup
        }
      },
      gdrgTariff: gdrgTariff ? {
        code: gdrgTariff.gdrgCode,
        description: gdrgTariff.description,
        nhiaTariff: gdrgTariff.nhiaTariff,
        nhisServiceCode: gdrgTariff.nhisServiceCode
      } : null,
      services: nhisServices,
      metadata: {
        totalServices: nhisServices.length,
        tariffFound: !!gdrgTariff,
        encounterCategory: attendance.encounterCategory,
        attendanceType: attendance.attendanceType,
        patientAge: patientAgeInYears
      },
      attendanceId: attendance.id
    };
  }

  static async generateIPDClaimData(admissionId: string) {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        Patient: { 
          select: { 
            surname: true, 
            otherNames: true, 
            dateOfBirth: true, 
            gender: true,
            folderNumber: true
          } 
        },
        Diagnosis: { 
          select: { 
            name: true, 
            icdCode: true, 
            morbidityGroup: true
          } 
        },
        AdmissionSecondaryDiagnosis: { 
          include: { 
            Diagnosis: { 
              select: { 
                name: true, 
                icdCode: true 
              } 
            } 
          } 
        },
        Attendance: {
          include: {
            ServiceRendered: { 
              include: { 
                ServiceCatalog: { 
                  select: { 
                    name: true, 
                    nhisServiceCode: true 
                  } 
                } 
              } 
            }
          }
        }
      }
    });

    if (!admission) throw new Error('Admission not found');

    const patientAgeInYears = this.calculateAgeInYears(
      admission.Patient.dateOfBirth,
      admission.admissionDate
    );

    const isAdult = patientAgeInYears >= 12;
    const morbidityGroup = admission.Diagnosis?.morbidityGroup;
    
    let gdrgCode = isAdult ? 'MEDI26A' : 'PAED34C';
    if (morbidityGroup?.includes('malaria')) {
      gdrgCode = isAdult ? 'MEDI28A' : 'PAED36C';
    } else if (morbidityGroup === 'hypertension') {
      gdrgCode = isAdult ? 'MEDI32A' : 'PAED40C';
    } else if (morbidityGroup === 'pneumonia') {
      gdrgCode = isAdult ? 'MEDI31A' : 'PAED39C';
    }

    const gdrgTariff = await prisma.gDRGTariff.findFirst({
      where: { gdrgCode, isActive: true }
    });

    return {
      claimType: 'IPD',
      admissionType: admission.admissionType,
      lengthOfStay: admission.lengthOfStay,
      patient: {
        nhisNumber: admission.Attendance?.nhisCCC,
        fullName: `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim(),
        dateOfBirth: admission.Patient.dateOfBirth,
        gender: admission.Patient.gender,
        ageInYears: patientAgeInYears,
        folderNumber: admission.Patient.folderNumber
      },
      clinical: {
        admissionDate: admission.admissionDate,
        dischargeDate: admission.dischargeDate,
        dischargeStatus: admission.dischargeStatus,
        principalDiagnosis: {
          description: admission.Diagnosis.name,
          icdCode: admission.principalIcdCode,
          morbidityGroup: admission.Diagnosis.morbidityGroup,
          presentOnAdmission: admission.principalPresentOnAdmission
        },
        secondaryDiagnoses: admission.AdmissionSecondaryDiagnosis.map(d => ({
          description: d.Diagnosis.name,
          icdCode: d.icdCode,
          presentOnAdmission: d.presentOnAdmission,
          diagnosisType: d.diagnosisType
        }))
      },
      gdrgTariff: gdrgTariff ? {
        code: gdrgTariff.gdrgCode,
        description: gdrgTariff.description,
        nhiaTariff: gdrgTariff.nhiaTariff
      } : null,
      admissionId: admission.id,
      attendanceId: admission.attendanceId
    };
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

    const primaryDiagnosis = attendance.AttendanceDiagnosis.find(d => d.primary);
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