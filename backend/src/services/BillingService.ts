// services/EnhancedBillingService.ts
import { PrismaClient, PaymentMode } from '@prisma/client';
const prisma = new PrismaClient();

interface BillingCalculation {
  cashPrice: number;
  insuranceCovered: number;
  patientPayable: number;
  copayAmount: number;
  isExempted: boolean;
  requiresAuthorization: boolean;
  coverageType?: string;
}

interface BillItem {
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  nhisServiceCode?: string;
  quantity: number;
  
  // PRICING FIELDS
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  unitPrice: number;
  totalCashPrice: number;
  
  // Coverage breakdown
  insuranceCovered: number;
  patientCopay: number;
  patientPayable: number;
  
  // Metadata
  isExempted: boolean;
  requiresAuth: boolean;
  coverageType?: string;
  category: string;
}

export class BillingService {
  
  /**
   * 🎯 CORRECTED BILLING CALCULATION ENGINE
   */
  static async calculateServiceBilling(
    serviceId: string,
    quantity: number,
    paymentMode: PaymentMode,
    insuranceProvider?: any
  ): Promise<BillingCalculation> {
    
    const service = await prisma.serviceCatalog.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      throw new Error('Service not found');
    }

    const totalCashPrice = service.cashPrice * quantity;
    
    // ==================== CASH PAYMENT ====================
    if (paymentMode === 'cash') {
      return {
        cashPrice: totalCashPrice,
        insuranceCovered: 0,
        patientPayable: totalCashPrice,
        copayAmount: 0,
        isExempted: false,
        requiresAuthorization: false
      };
    }
    
    // ==================== NHIS PAYMENT ====================
    if (paymentMode === 'nhis') {
      // Check if service is NHIS covered
      if (!service.isNHISCovered || service.nhisCoverageType === 'not_covered') {
        return {
          cashPrice: totalCashPrice,
          insuranceCovered: 0,
          patientPayable: totalCashPrice,
          copayAmount: 0,
          isExempted: true,
          requiresAuthorization: false,
          coverageType: 'not_covered'
        };
      }
      
      // NHIS pays their predetermined price, patient pays difference
      const nhisCovered = service.nhisPrice * quantity; // What NHIS will pay (their tariff)
      const patientCopay = Math.max(0, totalCashPrice - nhisCovered); // Patient pays difference
      
      return {
        cashPrice: totalCashPrice,
        insuranceCovered: nhisCovered, // NHIS pays their tariff
        patientPayable: patientCopay,  // Patient pays difference
        copayAmount: patientCopay,
        isExempted: false,
        requiresAuthorization: service.nhisRequiresAuth,
        coverageType: service.nhisCoverageType
      };
    }
    
    // ==================== PRIVATE INSURANCE PAYMENT ====================
    if (paymentMode === 'private_insurance') {
      if (!insuranceProvider) {
        throw new Error('Insurance provider required for private insurance billing');
      }
      
      // Check if service is EXEMPTED from insurance
      if (service.isPrivateInsuranceExempted) {
        return {
          cashPrice: totalCashPrice,
          insuranceCovered: 0,
          patientPayable: totalCashPrice,
          copayAmount: 0,
          isExempted: true,
          requiresAuthorization: false,
          coverageType: 'exempted'
        };
      }
      
      // Private insurance: We submit OUR prices, they pay percentage
      const totalInsurancePrice = service.insurancePrice * quantity;
      const coverageRate = insuranceProvider.coveragePercentage / 100;
      const insuranceCovered = totalInsurancePrice * coverageRate;
      const patientPayable = totalInsurancePrice - insuranceCovered;
      
      return {
        cashPrice: totalCashPrice,
        insuranceCovered,           // Insurance pays percentage of OUR price
        patientPayable,             // Patient pays remaining percentage
        copayAmount: patientPayable,
        isExempted: false,
        requiresAuthorization: service.privateInsRequiresAuth,
        coverageType: 'covered'
      };
    }
    
    // Fallback to cash
    return {
      cashPrice: totalCashPrice,
      insuranceCovered: 0,
      patientPayable: totalCashPrice,
      copayAmount: 0,
      isExempted: false,
      requiresAuthorization: false
    };
  }

  /**
   * 🎯 GENERATE PRIVATE INSURANCE CLAIM DATA
   */
  static async generatePrivateInsuranceClaim(attendanceId: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        patient: true,
        insuranceProvider: true,
        servicesRendered: {
          include: {
            serviceItem: {
              select: {
                id: true,
                name: true,
                code: true,
                insurancePrice: true, // OUR price for insurance
                serviceCategory: true
              }
            }
          }
        },
        bill: true
      }
    });

    if (!attendance) throw new Error('Attendance not found');
    if (!attendance.insuranceProvider) throw new Error('Insurance provider not found');

    const claimItems = attendance.servicesRendered.map(service => ({
      serviceCode: service.serviceItem.code,
      serviceName: service.serviceItem.name,
      serviceCategory: service.serviceItem.serviceCategory,
      quantity: service.quantity,
      unitPrice: service.serviceItem.insurancePrice, // OUR submitted price
      totalPrice: service.quantity * service.serviceItem.insurancePrice
    }));

    const totalClaimAmount = claimItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const insuranceCoverage = attendance.insuranceProvider.coveragePercentage / 100;
    const insurancePays = totalClaimAmount * insuranceCoverage;
    const patientPaid = totalClaimAmount - insurancePays;

    return {
      claimType: 'PRIVATE_INSURANCE',
      insuranceProvider: attendance.insuranceProvider.name,
      coveragePercentage: attendance.insuranceProvider.coveragePercentage,
      patient: {
        name: attendance.patient.fullName,
        insuranceId: attendance.patient.insuranceDetails?.memberId || 'N/A'
      },
      services: claimItems,
      financials: {
        totalClaimAmount,
        insurancePays,
        patientPaid,
        coverageRate: insuranceCoverage
      },
      attendanceId: attendance.id,
      billId: attendance.bill?.id
    };
  }

  /**
   * 🎯 GENERATE COMPLETE BILL FROM ATTENDANCE
   */
  static async generateBillFromAttendance(attendanceId: string) {
    return await prisma.$transaction(async (tx) => {
      
      const attendance = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: {
          servicesRendered: {
            include: { serviceItem: true }
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
        const service = rendered.serviceItem;
        if (!service) continue;

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
          serviceId: service.id,
          serviceName: service.name,
          serviceCode: service.code,
          nhisServiceCode: service.nhisServiceCode || undefined,
          quantity: rendered.quantity,
          cashPrice: service.cashPrice,
          unitPrice: service.cashPrice,
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
        status: totalPatientPayable <= 0 ? ('paid' as const) : ('pending' as const)
      };

      if (!bill) {
        bill = await tx.bill.create({
          data: {
            patientId: attendance.patientId,
            attendanceId: attendance.id,
            admissionId: attendance.admissionId,
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
          billId: bill.id,
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

  /**
   * 🎯 GET BILLING BREAKDOWN FOR DISPLAY
   */
  static async getBillingBreakdown(attendanceId: string) {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        servicesRendered: {
          include: { serviceItem: true }
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
          pharmacy: [] as any[]
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
      const service = rendered.serviceItem;
      if (!service) continue;

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

  /**
   * 🎯 VALIDATE INSURANCE COVERAGE FOR SERVICE
   */
  static async validateServiceCoverage(
    serviceId: string,
    paymentMode: PaymentMode,
    insuranceProviderId?: string
  ) {
    const service = await prisma.serviceCatalog.findUnique({
      where: { id: serviceId }
    });

    if (!service) {
      throw new Error('Service not found');
    }

    let insuranceProvider = null;
    if (insuranceProviderId) {
      insuranceProvider = await prisma.insuranceProvider.findUnique({
        where: { id: insuranceProviderId }
      });
    }

    const calculation = await this.calculateServiceBilling(
      serviceId,
      1,
      paymentMode,
      insuranceProvider
    );

    return {
      isCovered: calculation.insuranceCovered > 0,
      isExempted: calculation.isExempted,
      requiresAuthorization: calculation.requiresAuthorization,
      patientWillPay: calculation.patientPayable,
      insuranceWillCover: calculation.insuranceCovered,
      coverageType: calculation.coverageType,
      message: this.getCoverageMessage(calculation, paymentMode)
    };
  }

  /**
   * Helper: Generate user-friendly coverage message
   */
  private static getCoverageMessage(calc: BillingCalculation, mode: PaymentMode): string {
    if (mode === 'cash') {
      return 'Patient pays full amount';
    }

    if (calc.isExempted) {
      return 'Service not covered by insurance - patient pays full amount';
    }

    if (mode === 'nhis') {
      if (calc.coverageType === 'full') {
        return 'NHIS covers full cost - patient pays nothing';
      }
      if (calc.coverageType === 'partial') {
        return `NHIS covers part - patient pays GHS ${calc.copayAmount.toFixed(2)} copay`;
      }
      return 'Not covered by NHIS - patient pays full amount';
    }

    if (mode === 'private_insurance') {
      return `Insurance covers GHS ${calc.insuranceCovered.toFixed(2)} - patient pays GHS ${calc.patientPayable.toFixed(2)}`;
    }

    return 'Payment calculation available';
  }
}