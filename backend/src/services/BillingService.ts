// services/BillingService.ts - COMPLETE UPDATED VERSION
import { PrismaClient, PaymentMode } from '@prisma/client';

const prisma = new PrismaClient();

export interface BillingCalculation {
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  insuranceCovered: number;
  patientPayable: number;
  requiresAuthorization: boolean;
  coverageType: 'full' | 'partial' | 'not_covered';
  isExempted: boolean;
  copayAmount: number;
}

export interface ServiceCoverage {
  isCovered: boolean;
  coverageType: 'full' | 'partial' | 'not_covered';
  requiresAuthorization: boolean;
  patientResponsibility: number;
  insuranceCovered: number;
  isExempted: boolean;
  notes?: string;
}

export interface BillItem {
  serviceCatalogId: string; // ✅ UPDATED: serviceId → serviceCatalogId
  serviceName: string;
  serviceCode: string;
  nhisServiceCode?: string;
  quantity: number;
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  unitPrice: number;
  totalCashPrice: number;
  insuranceCovered: number;
  patientCopay: number;
  patientPayable: number;
  isExempted: boolean;
  requiresAuth: boolean;
  coverageType?: string;
  category: string;
}

export class BillingService {
  static async calculateServiceBilling(
    serviceCatalogId: string, // ✅ UPDATED: serviceId → serviceCatalogId
    quantity: number,
    paymentMode: PaymentMode,
    insuranceProvider?: any
  ): Promise<BillingCalculation> {
    const service = await prisma.serviceCatalog.findUnique({
      where: { id: serviceCatalogId }, // ✅ UPDATED
      include: { pricing: true }
    });

    if (!service) {
      throw new Error('Service not found');
    }

    if (!service.pricing) {
      throw new Error('Service pricing not configured');
    }

    const baseCashPrice = service.pricing.cashPrice * quantity;
    const baseNHISPrice = service.pricing.nhisPrice * quantity;
    const baseInsurancePrice = service.pricing.insurancePrice * quantity;

    let insuranceCovered = 0;
    let patientPayable = 0;
    let requiresAuthorization = false;
    let isExempted = false;
    let copayAmount = 0;

    switch (paymentMode) {
      case 'cash':
        patientPayable = baseCashPrice;
        insuranceCovered = 0;
        requiresAuthorization = false;
        isExempted = false;
        break;

      case 'nhis':
        if (!service.isNHISCovered) {
          isExempted = true;
          insuranceCovered = 0;
          patientPayable = baseCashPrice;
        } else {
          requiresAuthorization = service.requiresAuthorization || false;
          
          if (service.nhisCoverageType === 'full') {
            insuranceCovered = baseNHISPrice;
            patientPayable = 0;
            copayAmount = 0;
          } else if (service.nhisCoverageType === 'partial') {
            insuranceCovered = baseNHISPrice;
            patientPayable = Math.max(0, baseCashPrice - baseNHISPrice);
            copayAmount = patientPayable;
          } else {
            insuranceCovered = 0;
            patientPayable = baseCashPrice;
            isExempted = true;
          }
        }
        break;

      case 'private_insurance':
        if (!insuranceProvider) {
          throw new Error('Insurance provider required for private insurance billing');
        }

        // ✅ UPDATED: Check if service is covered by private insurance
        const isPrivateCovered = service.isNHISCovered !== false; // Default to true if not specified
        if (!isPrivateCovered) {
          isExempted = true;
          insuranceCovered = 0;
          patientPayable = baseCashPrice;
        } else {
          requiresAuthorization = service.requiresAuthorization || true;
          const coveragePercentage = insuranceProvider.coveragePercentage || 80;
          insuranceCovered = (baseInsurancePrice * coveragePercentage) / 100;
          patientPayable = baseInsurancePrice - insuranceCovered;
          copayAmount = patientPayable;
        }
        break;
    }

    return {
      cashPrice: baseCashPrice,
      nhisPrice: baseNHISPrice,
      insurancePrice: baseInsurancePrice,
      insuranceCovered,
      patientPayable,
      requiresAuthorization,
      coverageType: service.nhisCoverageType,
      isExempted,
      copayAmount
    };
  }

  static async validateServiceCoverage(
    serviceCatalogId: string, // ✅ UPDATED
    paymentMode: PaymentMode,
    insuranceProvider?: any
  ): Promise<ServiceCoverage> {
    const service = await prisma.serviceCatalog.findUnique({
      where: { id: serviceCatalogId }, // ✅ UPDATED
      include: { pricing: true }
    });

    if (!service) {
      throw new Error('Service not found');
    }

    let isCovered = true;
    let requiresAuthorization = false;
    let notes = '';
    let patientResponsibility = 0;
    let insuranceCovered = 0;
    let isExempted = false;

    switch (paymentMode) {
      case 'cash':
        patientResponsibility = service.pricing?.cashPrice || 0;
        insuranceCovered = 0;
        notes = 'Patient pays full amount';
        break;

      case 'nhis':
        if (!service.isNHISCovered) {
          isCovered = false;
          isExempted = true;
          notes = 'Service not covered by NHIS';
          patientResponsibility = service.pricing?.cashPrice || 0;
        } else {
          requiresAuthorization = service.requiresAuthorization || false;
          
          if (service.nhisCoverageType === 'full') {
            insuranceCovered = service.pricing?.nhisPrice || 0;
            patientResponsibility = 0;
            notes = 'NHIS covers full cost';
          } else if (service.nhisCoverageType === 'partial') {
            insuranceCovered = service.pricing?.nhisPrice || 0;
            patientResponsibility = (service.pricing?.cashPrice || 0) - insuranceCovered;
            notes = `NHIS partial coverage - patient copay: GHS ${patientResponsibility.toFixed(2)}`;
          } else {
            insuranceCovered = 0;
            patientResponsibility = service.pricing?.cashPrice || 0;
            isExempted = true;
            notes = 'Service listed but not covered by NHIS';
          }
        }
        break;

      case 'private_insurance':
        if (!insuranceProvider) {
          throw new Error('Insurance provider required');
        }

        const isPrivateCovered = service.isNHISCovered !== false;
        if (!isPrivateCovered) {
          isCovered = false;
          isExempted = true;
          notes = 'Service not covered by private insurance';
          patientResponsibility = service.pricing?.cashPrice || 0;
        } else {
          requiresAuthorization = service.requiresAuthorization || true;
          const coveragePercentage = insuranceProvider.coveragePercentage || 80;
          insuranceCovered = ((service.pricing?.insurancePrice || 0) * coveragePercentage) / 100;
          patientResponsibility = (service.pricing?.insurancePrice || 0) - insuranceCovered;
          notes = `Covered at ${coveragePercentage}% by ${insuranceProvider.name}`;
        }
        break;
    }

    return {
      isCovered,
      coverageType: service.nhisCoverageType,
      requiresAuthorization,
      patientResponsibility,
      insuranceCovered,
      isExempted,
      notes
    };
  }

  static async generateBillFromAttendance(attendanceId: string) {
    return await prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: {
          servicesRendered: {
            include: { 
              serviceCatalog: { // ✅ UPDATED: serviceItem → serviceCatalog
                include: { pricing: true }
              }
            }
          },
          patient: true,
          insuranceProvider: true
        }
      });

      if (!attendance) {
        throw new Error('Attendance not found');
      }

      // Validate payment mode requirements
      if (attendance.paymentMode === 'nhis' && !attendance.nhisCCC) {
        throw new Error('NHIS CCC number is required for NHIS billing');
      }

      if (attendance.paymentMode === 'private_insurance' && !attendance.insuranceProvider) {
        throw new Error('Insurance provider is required for private insurance billing');
      }

      // Calculate billing for each service
      const billItems: BillItem[] = [];
      let totalCashPrice = 0;
      let totalInsuranceCovered = 0;
      let totalPatientPayable = 0;
      let totalCopay = 0;
      let hasExemptedServices = false;
      let requiresAuthorization = false;

      for (const rendered of attendance.servicesRendered) {
        const service = rendered.serviceCatalog; // ✅ UPDATED
        if (!service || !service.pricing) continue;

        const calculation = await this.calculateServiceBilling(
          service.id,
          rendered.quantity,
          attendance.paymentMode,
          attendance.insuranceProvider
        );

        totalCashPrice += calculation.cashPrice;
        totalInsuranceCovered += calculation.insuranceCovered;
        totalPatientPayable += calculation.patientPayable;
        totalCopay += calculation.copayAmount;

        if (calculation.isExempted) hasExemptedServices = true;
        if (calculation.requiresAuthorization) requiresAuthorization = true;

        billItems.push({
          serviceCatalogId: service.id, // ✅ UPDATED
          serviceName: service.name,
          serviceCode: service.code,
          nhisServiceCode: service.nhisServiceCode || undefined,
          quantity: rendered.quantity,
          cashPrice: service.pricing.cashPrice,
          nhisPrice: service.pricing.nhisPrice,
          insurancePrice: service.pricing.insurancePrice,
          unitPrice: service.pricing.cashPrice,
          totalCashPrice: calculation.cashPrice,
          insuranceCovered: calculation.insuranceCovered,
          patientCopay: calculation.copayAmount,
          patientPayable: calculation.patientPayable,
          isExempted: calculation.isExempted,
          requiresAuth: calculation.requiresAuthorization,
          coverageType: calculation.coverageType,
          category: service.serviceCategory
        });
      }

      // Find or create bill
      let bill = await tx.bill.findUnique({
        where: { attendanceId }
      });

      const billData = {
        items: billItems as any,
        subtotal: totalCashPrice,
        taxAmount: 0,
        totalAmount: totalCashPrice,
        insuranceCovered: totalInsuranceCovered,
        patientPayable: totalPatientPayable,
        paidAmount: 0,
        balance: totalPatientPayable,
        status: totalPatientPayable <= 0 ? 'paid' as const : 'pending' as const
      };

      if (!bill) {
        bill = await tx.bill.create({
          data: {
            patientId: attendance.patientId,
            attendanceId: attendance.id,
            paymentMode: attendance.paymentMode,
            insuranceProviderId: attendance.insuranceProviderId,
            billNumber: `BILL-${Date.now()}`,
            createdById: attendance.createdById,
            ...billData
          }
        });
      } else {
        bill = await tx.bill.update({
          where: { id: bill.id },
          data: billData
        });
      }

      // Update attendance totals
      await tx.attendance.update({
        where: { id: attendanceId },
        data: {
          totalBill: totalCashPrice,
          outstandingBalance: totalPatientPayable
        }
      });

      return {
        bill,
        summary: {
          totalCashPrice,
          totalInsuranceCovered,
          totalPatientPayable,
          totalCopay,
          hasExemptedServices,
          requiresAuthorization,
          itemCount: billItems.length
        },
        items: billItems
      };
    });
  }

  static async getBillingBreakdown(attendanceId: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        servicesRendered: {
          include: { 
            serviceCatalog: { // ✅ UPDATED
              include: { pricing: true }
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

    const breakdown = {
      paymentMode: attendance.paymentMode,
      insuranceProvider: attendance.insuranceProvider?.name,
      coveragePercentage: attendance.insuranceProvider?.coveragePercentage,
      
      services: {
        byCoverage: {
          fullyCovered: [] as any[],
          partiallyCovered: [] as any[],
          notCovered: [] as any[],
          exempted: [] as any[]
        },
        byCategory: {
          opd: [] as any[],
          ipd: [] as any[],
          diagnostics: [] as any[],
          pharmacy: [] as any[],
          other: [] as any[]
        }
      },
      
      totals: {
        cashPrice: 0,
        insuranceCovered: 0,
        patientCopay: 0,
        patientPayable: 0
      },
      
      authorization: {
        required: false,
        services: [] as string[]
      }
    };

    for (const rendered of attendance.servicesRendered) {
      const service = rendered.serviceCatalog; // ✅ UPDATED
      if (!service || !service.pricing) continue;

      const calculation = await this.calculateServiceBilling(
        service.id,
        rendered.quantity,
        attendance.paymentMode,
        attendance.insuranceProvider
      );

      const item = {
        name: service.name,
        quantity: rendered.quantity,
        ...calculation
      };

      // Categorize by coverage
      if (calculation.isExempted) {
        breakdown.services.byCoverage.exempted.push(item);
      } else if (calculation.coverageType === 'full') {
        breakdown.services.byCoverage.fullyCovered.push(item);
      } else if (calculation.coverageType === 'partial') {
        breakdown.services.byCoverage.partiallyCovered.push(item);
      } else {
        breakdown.services.byCoverage.notCovered.push(item);
      }

      // Categorize by service category
      const category = service.serviceCategory as keyof typeof breakdown.services.byCategory;
      breakdown.services.byCategory[category].push(item);

      // Update totals
      breakdown.totals.cashPrice += calculation.cashPrice;
      breakdown.totals.insuranceCovered += calculation.insuranceCovered;
      breakdown.totals.patientCopay += calculation.copayAmount;
      breakdown.totals.patientPayable += calculation.patientPayable;

      // Track authorization
      if (calculation.requiresAuthorization) {
        breakdown.authorization.required = true;
        breakdown.authorization.services.push(service.name);
      }
    }

    return breakdown;
  }

  static async calculateBillTotal(
    serviceItems: Array<{
      serviceCatalogId: string; // ✅ UPDATED
      quantity: number;
    }>,
    paymentMode: PaymentMode,
    insuranceProvider?: any
  ) {
    let totalCash = 0;
    let totalNHIS = 0;
    let totalInsurance = 0;
    let totalInsuranceCovered = 0;
    let totalPatientPayable = 0;
    const items = [];

    for (const item of serviceItems) {
      const calculation = await this.calculateServiceBilling(
        item.serviceCatalogId, // ✅ UPDATED
        item.quantity,
        paymentMode,
        insuranceProvider
      );

      totalCash += calculation.cashPrice;
      totalNHIS += calculation.nhisPrice;
      totalInsurance += calculation.insurancePrice;
      totalInsuranceCovered += calculation.insuranceCovered;
      totalPatientPayable += calculation.patientPayable;

      items.push({
        serviceCatalogId: item.serviceCatalogId, // ✅ UPDATED
        quantity: item.quantity,
        calculation
      });
    }

    return {
      subtotal: totalCash,
      insuranceCovered: totalInsuranceCovered,
      patientPayable: totalPatientPayable,
      items,
      summary: {
        cashTotal: totalCash,
        nhisTotal: totalNHIS,
        insuranceTotal: totalInsurance
      }
    };
  }
}