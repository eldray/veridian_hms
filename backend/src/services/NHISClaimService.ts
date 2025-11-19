
// services/NHISClaimService.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class NHISClaimService {

  static async generateNHISClaimData(attendanceId: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        patient: { select: { fullName: true, dateOfBirth: true, gender: true } },
        diagnoses: { 
          include: { 
            diagnosis: { 
              select: { 
                name: true, 
                icdCode: true, 
                gdrgCode: true 
              } 
            } 
          } 
        },
        servicesRendered: { 
          include: { 
            serviceItem: { 
              select: { 
                name: true, 
                code: true,
                nhisServiceCode: true, // ONLY submit NHIS codes, NOT prices
                serviceCategory: true
              } 
            } 
          } 
        }
      }
    });

    if (!attendance) throw new Error('Attendance not found');

    const primaryDiagnosis = attendance.diagnoses.find(d => d.primary)?.diagnosis;

    // NHIS CLAIM: Only submit services with NHIS codes, no prices
    const nhisServices = attendance.servicesRendered
      .filter(service => service.serviceItem.nhisServiceCode) // Only services with NHIS codes
      .map(service => ({
        description: service.serviceItem.name,
        nhisServiceCode: service.serviceItem.nhisServiceCode, // NHIS tariff code
        quantity: service.quantity,
        // NO PRICES SUBMITTED TO NHIS - they use their own tariff
      }));

    return {
      claimType: 'NHIS',
      encounterType: attendance.visitCategory,
      patient: {
        nhisNumber: attendance.nhisCCC, // NHIS member number
        fullName: attendance.patient.fullName,
        dateOfBirth: attendance.patient.dateOfBirth,
        gender: attendance.patient.gender
      },
      clinical: {
        attendanceDate: attendance.dateTime,
        primaryDiagnosis: {
          description: primaryDiagnosis?.name,
          icdCode: primaryDiagnosis?.icdCode,
          gdrgCode: primaryDiagnosis?.gdrgCode
        },
        secondaryDiagnoses: attendance.diagnoses
          .filter(d => !d.primary)
          .map(d => ({
            description: d.diagnosis.name,
            icdCode: d.diagnosis.icdCode
          }))
      },
      services: nhisServices, // Only services with NHIS codes, no prices
      metadata: {
        totalServices: nhisServices.length,
        servicesWithNHISCodes: nhisServices.length,
        totalServicesRendered: attendance.servicesRendered.length
      },
      attendanceId: attendance.id
    };
  }

  static async generateIPDClaimData(admissionId: string) {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        patient: { select: { fullName: true, dateOfBirth: true, gender: true } },
        principalDiagnosis: { select: { name: true, icdCode: true, gdrgCode: true, category: true } },
        secondaryDiagnoses: { include: { diagnosis: { select: { name: true, icdCode: true } } } },
        attendance: {
          include: {
            servicesRendered: { 
              include: { 
                serviceItem: { 
                  select: { 
                    name: true, 
                    nhisServiceCode: true // Only NHIS codes for IPD too
                  } 
                } 
              } 
            }
          }
        }
      }
    });

    if (!admission) throw new Error('Admission not found');

    // NHIS IPD: DRG-based payment, not service-based
    return {
      claimType: 'IPD',
      admissionType: admission.admissionType,
      lengthOfStay: admission.lengthOfStay,
      patient: {
        nhisNumber: admission.attendance?.nhisCCC,
        fullName: admission.patient.fullName,
        dateOfBirth: admission.patient.dateOfBirth,
        gender: admission.patient.gender
      },
      clinical: {
        admissionDate: admission.admissionDate,
        dischargeDate: admission.dischargeDate,
        dischargeStatus: admission.dischargeStatus,
        principalDiagnosis: {
          description: admission.principalDiagnosis.name,
          icdCode: admission.principalIcdCode,
          gdrgCode: admission.principalDiagnosis.gdrgCode, // DRG code for IPD pricing
          presentOnAdmission: admission.principalPresentOnAdmission,
          category: admission.principalDiagnosis.category
        },
        secondaryDiagnoses: admission.secondaryDiagnoses.map(d => ({
          description: d.diagnosis.name,
          icdCode: d.icdCode,
          presentOnAdmission: d.presentOnAdmission,
          diagnosisType: d.diagnosisType
        }))
      },
      // NHIS uses DRG for IPD pricing, not individual services
      drgInformation: {
        gdrgCode: admission.principalDiagnosis.gdrgCode,
        // NHIS will determine payment based on their DRG tariff
      },
      admissionId: admission.id,
      attendanceId: admission.attendanceId
    };
  }
  
  static async validateNHISClaim(attendanceId: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        diagnoses: { include: { diagnosis: true } },
        servicesRendered: { include: { serviceItem: true } }
      }
    });

    if (!attendance) {
      throw new Error('Attendance not found');
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate NHIS number
    if (attendance.paymentMode === 'nhis' && !attendance.nhisCCC) {
      errors.push('NHIS CCC number is required for NHIS claims');
    }

    // Validate primary diagnosis
    const primaryDiagnosis = attendance.diagnoses.find(d => d.primary);
    if (!primaryDiagnosis) {
      errors.push('Primary diagnosis is required for NHIS claims');
    }

    // Validate services have NHIS codes
    for (const service of attendance.servicesRendered) {
      if (!service.serviceItem?.nhisServiceCode) {
        warnings.push(`Service "${service.serviceItem?.name}" missing NHIS service code`);
      }
    }

    // Validate present on admission for inpatient
    if (attendance.encounterCategory === 'ipd') {
      for (const diagnosis of attendance.diagnoses) {
        if (!diagnosis.presentOnAdmission) {
          warnings.push(`Diagnosis "${diagnosis.diagnosis?.name}" missing Present on Admission indicator`);
        }
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
    // Simplified XML generation - implement full NHIS spec as needed
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Claim>
  <FacilityCode>${process.env.NHIS_FACILITY_CODE || 'FAC001'}</FacilityCode>
  <ClaimType>${claimData.claimType}</ClaimType>
  <PatientCCC>${claimData.patient.nhisNumber}</PatientCCC>
  <TotalAmount>${claimData.drgInformation?.totalPayment || claimData.services?.reduce((sum: number, s: any) => sum + s.totalPrice, 0) || 0}</TotalAmount>
</Claim>`;

    return xml;
  }
}