
  // services/InsuranceService.ts
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
      const billingService = await import('./EnhancedBillingService');
      return await billingService.BillingService.generatePrivateInsuranceClaim(attendanceId);
    }
  }

  /**
   * 🎯 VALIDATE CLAIM READINESS
   */
  static async validateClaimReadiness(attendanceId: string, claimType: 'NHIS' | 'PRIVATE_INSURANCE') {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        servicesRendered: { include: { serviceItem: true } },
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
        .filter(s => !s.serviceItem.nhisServiceCode)
        .map(s => s.serviceItem.name);
      
      if (servicesWithoutNHISCodes.length > 0) {
        errors.push(`Services missing NHIS codes: ${servicesWithoutNHISCodes.join(', ')}`);
      }
    } else {
      // Private insurance validation
      if (!attendance.insuranceProvider) errors.push('Insurance provider required');
      if (!attendance.bill) errors.push('Bill required for insurance claim');
      
      const servicesWithoutInsurancePrices = attendance.servicesRendered
        .filter(s => s.serviceItem.insurancePrice === null || s.serviceItem.insurancePrice === 0)
        .map(s => s.serviceItem.name);
      
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
      return nhisProvider?.id || null;
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

  static async validateInsuranceCoverage(patientId: string, serviceId: string): Promise<{ covered: boolean; coveragePercentage?: number; requiresAuth: boolean }> {
    const [patient, service] = await Promise.all([
      prisma.patient.findUnique({
        where: { id: patientId },
        include: { insuranceProvider: true }
      }),
      prisma.serviceCatalog.findUnique({
        where: { id: serviceId }
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