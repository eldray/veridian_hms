// services/InsuranceService.ts - UPDATED
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class InsuranceService {

  static async generateClaimData(attendanceId: string, claimType: 'NHIS' | 'PRIVATE_INSURANCE') {
    if (claimType === 'NHIS') {
      const nhisClaimService = await import('./NHISClaimService');
      return await nhisClaimService.NHISClaimService.generateNHISClaimData(attendanceId);
    } else {
      return await this.generatePrivateInsuranceClaim(attendanceId);
    }
  }

  static async generatePrivateInsuranceClaim(attendanceId: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        Patient: {
          select: {
            surname: true,
            otherNames: true,
            dateOfBirth: true,
            gender: true,
            insuranceDetails: true  // ✅ UPDATED: Use JSON field
          }
        },
        AttendanceDiagnosis: {  // ✅ UPDATED: Correct relation name
          include: {
            Diagnosis: {
              select: {
                name: true,
                icdCode: true,
                gdrgGroupCode: true
              }
            }
          }
        },
        ServiceRendered: {  // ✅ UPDATED: Correct relation name
          include: {
            ServiceCatalog: {
              include: { pricing: true },
              select: {
                id: true,
                name: true,
                code: true,
                nhisServiceCode: true,
                serviceCategory: true
              }
            }
          }
        },
        InsuranceProvider: true,
        Bill: true
      }
    });

    if (!attendance) throw new Error('Attendance not found');
    if (attendance.paymentMode !== 'private_insurance') throw new Error('Only private insurance attendances can generate private insurance claims');
    if (!attendance.InsuranceProvider) throw new Error('Insurance provider not found for this attendance');

    // ✅ UPDATED: Extract insurance number from JSON field
    const insuranceDetails = attendance.Patient.insuranceDetails as any;
    const insuranceNumber = insuranceDetails?.memberId || insuranceDetails?.policyNumber || 'N/A';

    const servicesWithPricing = [];
    for (const rendered of attendance.ServiceRendered) {
      const service = rendered.ServiceCatalog;
      if (!service || !service.pricing) continue;

      const billingService = await import('./BillingService');
      const calculation = await billingService.BillingService.calculateServiceBilling(
        service.id,
        rendered.quantity,
        'private_insurance',
        attendance.InsuranceProvider
      );

      servicesWithPricing.push({
        description: service.name,
        serviceCode: service.code,
        nhisServiceCode: service.nhisServiceCode,
        quantity: rendered.quantity,
        unitPrice: calculation.insurancePrice / rendered.quantity,
        totalPrice: calculation.insurancePrice,
        insuranceCovered: calculation.insuranceCovered,
        patientCopay: calculation.patientPayable,
        coveragePercentage: attendance.InsuranceProvider.coveragePercentage
      });
    }

    const primaryDiagnosis = attendance.AttendanceDiagnosis.find(d => d.primary) || attendance.AttendanceDiagnosis[0];

    const claimData = {
      claimType: 'PRIVATE_INSURANCE',
      insuranceProvider: {
        name: attendance.InsuranceProvider.name,
        coveragePercentage: attendance.InsuranceProvider.coveragePercentage
      },
      patient: {
        insuranceNumber: insuranceNumber,  // ✅ UPDATED: From JSON field
        fullName: `${attendance.Patient.surname} ${attendance.Patient.otherNames}`.trim(),
        dateOfBirth: attendance.Patient.dateOfBirth,
        gender: attendance.Patient.gender
      },
      clinical: {
        attendanceDate: attendance.dateTime,
        primaryDiagnosis: primaryDiagnosis ? {
          description: primaryDiagnosis.Diagnosis.name,
          icdCode: primaryDiagnosis.Diagnosis.icdCode,
          gdrgCode: primaryDiagnosis.Diagnosis.gdrgGroupCode
        } : null
      },
      financial: {
        totalClaimAmount: attendance.Bill?.totalAmount || 0,
        insuranceCovered: attendance.Bill?.insuranceCovered || 0,
        patientResponsibility: attendance.Bill?.patientPayable || 0,
        services: servicesWithPricing
      },
      metadata: {
        totalServices: servicesWithPricing.length,
        requiresPreAuth: servicesWithPricing.some(s => s.requiresAuth)
      }
    };

    return claimData;
  }

  static async validateClaimReadiness(attendanceId: string, claimType: 'NHIS' | 'PRIVATE_INSURANCE') {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        ServiceRendered: { include: { ServiceCatalog: { include: { pricing: true } } } },
        AttendanceDiagnosis: true,
        Bill: true,
        InsuranceProvider: true
      }
    });

    if (!attendance) return { isValid: false, errors: ['Attendance not found'] };

    const errors: string[] = [];

    if (claimType === 'NHIS') {
      if (!attendance.nhisCCC) errors.push('NHIS CCC number required');
      
      const servicesWithoutNHISCodes = attendance.ServiceRendered
        .filter(s => !s.ServiceCatalog.nhisServiceCode)
        .map(s => s.ServiceCatalog.name);
      
      if (servicesWithoutNHISCodes.length > 0) {
        errors.push(`Services missing NHIS codes: ${servicesWithoutNHISCodes.join(', ')}`);
      }

      const servicesWithoutNHISPrices = attendance.ServiceRendered
        .filter(s => s.ServiceCatalog.pricing && s.ServiceCatalog.pricing.nhisPrice === 0)
        .map(s => s.ServiceCatalog.name);
      
      if (servicesWithoutNHISPrices.length > 0) {
        errors.push(`Services missing NHIS prices: ${servicesWithoutNHISPrices.join(', ')}`);
      }
    } else {
      if (!attendance.InsuranceProvider) errors.push('Insurance provider required');
      if (!attendance.Bill) errors.push('Bill required for insurance claim');
      
      const servicesWithoutInsurancePrices = attendance.ServiceRendered
        .filter(s => !s.ServiceCatalog.pricing || s.ServiceCatalog.pricing.insurancePrice === 0)
        .map(s => s.ServiceCatalog.name);
      
      if (servicesWithoutInsurancePrices.length > 0) {
        errors.push(`Services missing insurance prices: ${servicesWithoutInsurancePrices.join(', ')}`);
      }
    }

    return { isValid: errors.length === 0, errors, claimType, attendanceId };
  }
  
  static async findNHISProvider(): Promise<string | null> {
    try {
      const nhisProvider = await prisma.insuranceProvider.findFirst({
        where: { type: 'nhis', isActive: true },
        select: { id: true }
      });
      return nhisProvider?.id || null;
    } catch (error) {
      console.error('Error finding NHIS provider:', error);
      return null;
    }
  }

  static async resolveInsuranceProvider(paymentMode: string, patientId?: string): Promise<string | null> {
    if (paymentMode === 'nhis') return await this.findNHISProvider();
    
    if (paymentMode === 'private_insurance' && patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { insuranceProviderId: true }
      });
      return patient?.insuranceProviderId || null;
    }
    
    return null;
  }

  static async validateInsuranceCoverage(patientId: string, serviceCatalogId: string): Promise<{ covered: boolean; coveragePercentage?: number; requiresAuth: boolean }> {
    const [patient, service] = await Promise.all([
      prisma.patient.findUnique({
        where: { id: patientId },
        include: { insuranceProvider: true }
      }),
      prisma.serviceCatalog.findUnique({
        where: { id: serviceCatalogId },
        include: { pricing: true }
      })
    ]);

    if (!patient || !service) throw new Error('Patient or service not found');

    if (patient.paymentMode === 'cash') return { covered: false, requiresAuth: false };
    if (patient.paymentMode === 'nhis') {
      return { 
        covered: !!service.nhisServiceCode && service.isNHISCovered !== false,
        requiresAuth: service.nhisRequiresAuth || false
      };
    }
    if (patient.paymentMode === 'private_insurance' && patient.insuranceProvider) {
      return {
        covered: true,
        coveragePercentage: patient.insuranceProvider.coveragePercentage,
        requiresAuth: service.privateInsRequiresAuth || false
      };
    }

    return { covered: false, requiresAuth: false };
  }
}