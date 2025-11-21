// services/InsuranceService.ts - COMPLETE UPDATED VERSION
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class InsuranceService {

  /**
   * 🎯 GET CLAIM TYPE SPECIFIC LOGIC
   */
  static async generateClaimData(attendanceId: string, claimType: 'NHIS' | 'PRIVATE_INSURANCE') {
    if (claimType === 'NHIS') {
      // Use NHISClaimService for NHIS claims (no prices)
      const nhisClaimService = await import('./NHISClaimService');
      return await nhisClaimService.NHISClaimService.generateNHISClaimData(attendanceId);
    } else {
      // Use BillingService for private insurance claims (with prices)
      return await this.generatePrivateInsuranceClaim(attendanceId);
    }
  }

  /**
   * 🎯 GENERATE PRIVATE INSURANCE CLAIM
   */
  static async generatePrivateInsuranceClaim(attendanceId: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        patient: {
          select: {
            surname: true,
            otherNames: true,
            dateOfBirth: true,
            gender: true,
            insuranceNumber: true
          }
        },
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
            serviceCatalog: { // ✅ UPDATED: serviceItem → serviceCatalog
              select: {
                name: true,
                code: true,
                nhisServiceCode: true,
                serviceCategory: true
              }
            }
          }
        },
        insuranceProvider: true,
        bill: true
      }
    });

    if (!attendance) {
      throw new Error('Attendance not found');
    }

    if (attendance.paymentMode !== 'private_insurance') {
      throw new Error('Only private insurance attendances can generate private insurance claims');
    }

    if (!attendance.insuranceProvider) {
      throw new Error('Insurance provider not found for this attendance');
    }

    // ✅ Prepare services with pricing for private insurance
    const servicesWithPricing = [];
    for (const rendered of attendance.servicesRendered) {
      const service = rendered.serviceCatalog; // ✅ UPDATED
      if (!service) continue;

      const billingService = await import('./BillingService');
      const calculation = await billingService.BillingService.calculateServiceBilling(
        service.id,
        rendered.quantity,
        'private_insurance',
        attendance.insuranceProvider
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
        coveragePercentage: attendance.insuranceProvider.coveragePercentage
      });
    }

    const primaryDiagnosis = attendance.diagnoses.find(d => d.primary) || attendance.diagnoses[0];

    const claimData = {
      claimType: 'PRIVATE_INSURANCE',
      insuranceProvider: {
        name: attendance.insuranceProvider.name,
        coveragePercentage: attendance.insuranceProvider.coveragePercentage
      },
      patient: {
        insuranceNumber: attendance.patient.insuranceNumber,
        fullName: `${attendance.patient.surname} ${attendance.patient.otherNames}`.trim(),
        dateOfBirth: attendance.patient.dateOfBirth,
        gender: attendance.patient.gender
      },
      clinical: {
        attendanceDate: attendance.dateTime,
        primaryDiagnosis: primaryDiagnosis ? {
          description: primaryDiagnosis.diagnosis.name,
          icdCode: primaryDiagnosis.diagnosis.icdCode,
          gdrgCode: primaryDiagnosis.diagnosis.gdrgCode
        } : null
      },
      financial: {
        totalClaimAmount: attendance.bill?.totalAmount || 0,
        insuranceCovered: attendance.bill?.insuranceCovered || 0,
        patientResponsibility: attendance.bill?.patientPayable || 0,
        services: servicesWithPricing
      },
      metadata: {
        totalServices: servicesWithPricing.length,
        requiresPreAuth: servicesWithPricing.some(s => s.requiresAuth)
      }
    };

    return claimData;
  }

  /**
   * 🎯 VALIDATE CLAIM READINESS
   */
  static async validateClaimReadiness(attendanceId: string, claimType: 'NHIS' | 'PRIVATE_INSURANCE') {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        servicesRendered: { 
          include: { 
            serviceCatalog: true // ✅ UPDATED: serviceItem → serviceCatalog
          } 
        },
        diagnoses: true,
        bill: true,
        insuranceProvider: true
      }
    });

    if (!attendance) {
      return { isValid: false, errors: ['Attendance not found'] };
    }

    const errors: string[] = [];

    if (claimType === 'NHIS') {
      // NHIS validation
      if (!attendance.nhisCCC) errors.push('NHIS CCC number required');
      
      const servicesWithoutNHISCodes = attendance.servicesRendered
        .filter(s => !s.serviceCatalog.nhisServiceCode) // ✅ UPDATED
        .map(s => s.serviceCatalog.name); // ✅ UPDATED
      
      if (servicesWithoutNHISCodes.length > 0) {
        errors.push(`Services missing NHIS codes: ${servicesWithoutNHISCodes.join(', ')}`);
      }
    } else {
      // Private insurance validation
      if (!attendance.insuranceProvider) errors.push('Insurance provider required');
      if (!attendance.bill) errors.push('Bill required for insurance claim');
      
      // Check if services have insurance pricing
      const services = await prisma.serviceCatalog.findMany({
        where: {
          id: { in: attendance.servicesRendered.map(s => s.serviceCatalogId) } // ✅ UPDATED
        },
        include: { pricing: true }
      });

      const servicesWithoutInsurancePrices = services
        .filter(s => !s.pricing || s.pricing.insurancePrice === 0)
        .map(s => s.name);
      
      if (servicesWithoutInsurancePrices.length > 0) {
        errors.push(`Services missing insurance prices: ${servicesWithoutInsurancePrices.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      claimType,
      attendanceId
    };
  }
  
  static async findNHISProvider(): Promise<string | null> {
    try {
      const nhisProvider = await prisma.insuranceProvider.findFirst({
        where: { 
          type: 'nhis',
          isActive: true 
        },
        select: { id: true }
      });
      return nhisProvider?. id || null;
    } catch (error) {
      console.error('Error finding NHIS provider:', error);
      return null;
    }
  }

  static async resolveInsuranceProvider(paymentMode: string, patientId?: string): Promise<string | null> {
    if (paymentMode === 'nhis') {
      return await this.findNHISProvider();
    }
    
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
        where: { id: serviceCatalogId } // ✅ UPDATED
      })
    ]);

    if (!patient || !service) {
      throw new Error('Patient or service not found');
    }

    if (patient.paymentMode === 'cash') {
      return { covered: false, requiresAuth: false };
    }

    if (patient.paymentMode === 'nhis') {
      return { 
        covered: !!service.nhisServiceCode && service.isNHISCovered !== false,
        requiresAuth: service.requiresAuthorization || false
      };
    }

    if (patient.paymentMode === 'private_insurance' && patient.insuranceProvider) {
      return {
        covered: true,
        coveragePercentage: patient.insuranceProvider.coveragePercentage,
        requiresAuth: service.requiresAuthorization || false
      };
    }

    return { covered: false, requiresAuth: false };
  }
}