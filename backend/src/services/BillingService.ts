// services/BillingService.ts - COMPLETE CORRECTED VERSION
import { PrismaClient, PaymentMode, EncounterCategory, AttendanceType, ServiceType } from '@prisma/client';
import { NHISClaimService } from './NHISClaimService';

const prisma = new PrismaClient();

// Helper to map category to valid ServiceType enum
const mapCategoryToServiceType = (category: string): ServiceType => {
  const mapping: Record<string, ServiceType> = {
    'opd': ServiceType.consultation,
    'ipd': ServiceType.ward,
    'diagnostics': ServiceType.lab_test,
    'pharmacy': ServiceType.medication,
    'consultation': ServiceType.consultation,
    'lab_test': ServiceType.lab_test,
    'scan': ServiceType.scan,
    'procedure': ServiceType.procedure,
    'medication': ServiceType.medication,
    'ward': ServiceType.ward,
    'diagnosis': ServiceType.diagnosis,
    'other': ServiceType.miscellaneous
  };
  return mapping[category] || ServiceType.miscellaneous;
};

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

export interface BillItem {
  serviceCatalogId: string;
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
    serviceCatalogId: string,
    quantity: number,
    paymentMode: PaymentMode,
    insuranceProvider?: any
  ): Promise<BillingCalculation> {
    const service = await prisma.serviceCatalog.findUnique({
      where: { id: serviceCatalogId },
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
          requiresAuthorization = service.nhisRequiresAuth || false;
          
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

        const isPrivateCovered = service.isNHISCovered !== false;
        if (!isPrivateCovered) {
          isExempted = true;
          insuranceCovered = 0;
          patientPayable = baseCashPrice;
        } else {
          requiresAuthorization = service.privateInsRequiresAuth || true;
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

  static async generateBillFromAttendance(attendanceId: string) {
    return await prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.findUnique({
        where: { id: attendanceId },
        include: {
          ServiceRendered: {
            include: { 
              ServiceCatalog: { 
                include: { pricing: true }
              }
            }
          },
          Patient: true,
          InsuranceProvider: true
        }
      });

      if (!attendance) {
        throw new Error('Attendance not found');
      }

      if (attendance.paymentMode === 'nhis' && !attendance.nhisCCC) {
        throw new Error('NHIS CCC number is required for NHIS billing');
      }

      if (attendance.paymentMode === 'private_insurance' && !attendance.InsuranceProvider) {
        throw new Error('Insurance provider is required for private insurance billing');
      }

      const billItems: BillItem[] = [];
      let totalCashPrice = 0;
      let totalInsuranceCovered = 0;
      let totalPatientPayable = 0;
      let totalCopay = 0;
      let hasExemptedServices = false;
      let requiresAuthorization = false;

      for (const rendered of attendance.ServiceRendered) {
        const service = rendered.ServiceCatalog;
        if (!service || !service.pricing) continue;

        const calculation = await this.calculateServiceBilling(
          service.id,
          rendered.quantity,
          attendance.paymentMode,
          attendance.InsuranceProvider
        );

        totalCashPrice += calculation.cashPrice;
        totalInsuranceCovered += calculation.insuranceCovered;
        totalPatientPayable += calculation.patientPayable;
        totalCopay += calculation.copayAmount;

        if (calculation.isExempted) hasExemptedServices = true;
        if (calculation.requiresAuthorization) requiresAuthorization = true;

        billItems.push({
          serviceCatalogId: service.id,
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

      let bill = await tx.bill.findUnique({
        where: { attendanceId }
      });

      const subtotal = totalCashPrice;
      const taxAmount = 0;
      const totalAmount = subtotal + taxAmount;
      const patientPayable = totalPatientPayable;
      const balance = patientPayable - (bill?.paidAmount || 0);

      const billData = {
        subtotal,
        taxAmount,
        totalAmount,
        insuranceCovered: totalInsuranceCovered,
        patientPayable,
        balance,
        status: patientPayable <= 0 ? 'paid' as const : 'pending' as const
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

      // Delete existing line items
      await tx.billLineItem.deleteMany({
        where: { billId: bill.id }
      });

      // ✅ FIXED: Create new line items with correct ServiceType enum
      for (const item of billItems) {
        const serviceType = mapCategoryToServiceType(item.category);
        
        await tx.billLineItem.create({
          data: {
            billId: bill.id,
            serviceCatalogId: item.serviceCatalogId,
            description: item.serviceName,
            serviceType: serviceType,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            pricingBasis: attendance.paymentMode,
            vatRate: 0,
            vatAmount: 0,
            lineTotal: item.totalCashPrice,
            insuranceCoveredAmount: item.insuranceCovered,
            patientPayableAmount: item.patientPayable,
            discount: 0,
            pricingSnapshotId: null
          }
        });
      }

      await tx.attendance.update({
        where: { id: attendanceId },
        data: {
          totalBill: totalCashPrice,
          outstandingBalance: patientPayable
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
        ServiceRendered: {
          include: { 
            ServiceCatalog: { 
              include: { pricing: true }
            }
          }
        },
        InsuranceProvider: true,
        Bill: {
          include: {
            BillLineItem: true
          }
        }
      }
    });

    if (!attendance) {
      throw new Error('Attendance not found');
    }

    const breakdown = {
      paymentMode: attendance.paymentMode,
      insuranceProvider: attendance.InsuranceProvider?.name,
      coveragePercentage: attendance.InsuranceProvider?.coveragePercentage,
      
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

    for (const rendered of attendance.ServiceRendered) {
      const service = rendered.ServiceCatalog;
      if (!service || !service.pricing) continue;

      const calculation = await this.calculateServiceBilling(
        service.id,
        rendered.quantity,
        attendance.paymentMode,
        attendance.InsuranceProvider
      );

      const item = {
        name: service.name,
        quantity: rendered.quantity,
        ...calculation
      };

      if (calculation.isExempted) {
        breakdown.services.byCoverage.exempted.push(item);
      } else if (calculation.coverageType === 'full') {
        breakdown.services.byCoverage.fullyCovered.push(item);
      } else if (calculation.coverageType === 'partial') {
        breakdown.services.byCoverage.partiallyCovered.push(item);
      } else {
        breakdown.services.byCoverage.notCovered.push(item);
      }

      const category = service.serviceCategory as keyof typeof breakdown.services.byCategory;
      if (breakdown.services.byCategory[category]) {
        breakdown.services.byCategory[category].push(item);
      } else {
        breakdown.services.byCategory.other.push(item);
      }

      breakdown.totals.cashPrice += calculation.cashPrice;
      breakdown.totals.insuranceCovered += calculation.insuranceCovered;
      breakdown.totals.patientCopay += calculation.copayAmount;
      breakdown.totals.patientPayable += calculation.patientPayable;

      if (calculation.requiresAuthorization) {
        breakdown.authorization.required = true;
        breakdown.authorization.services.push(service.name);
      }
    }

    return breakdown;
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

  static async voidBillLineItem(lineItemId: string, voidedById: string, reason: string) {
    return await prisma.$transaction(async (tx) => {
      const lineItem = await tx.billLineItem.findUnique({
        where: { id: lineItemId },
        include: { bill: true }
      });

      if (!lineItem) {
        throw new Error('Bill line item not found');
      }

      if (lineItem.isVoided) {
        throw new Error('Line item already voided');
      }

      const voidedItem = await tx.billLineItem.update({
        where: { id: lineItemId },
        data: {
          isVoided: true,
          voidedById,
          voidedAt: new Date(),
          voidReason: reason
        }
      });

      const activeItems = await tx.billLineItem.findMany({
        where: {
          billId: lineItem.billId,
          isVoided: false
        }
      });

      const subtotal = activeItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const insuranceCovered = activeItems.reduce((sum, item) => sum + item.insuranceCoveredAmount, 0);
      const patientPayable = activeItems.reduce((sum, item) => sum + item.patientPayableAmount, 0);
      const totalAmount = subtotal;
      const balance = patientPayable - (lineItem.bill.paidAmount || 0);

      await tx.bill.update({
        where: { id: lineItem.billId },
        data: {
          subtotal,
          totalAmount,
          insuranceCovered,
          patientPayable,
          balance,
          status: balance <= 0 ? 'paid' : patientPayable > 0 ? 'pending' : 'draft'
        }
      });

      return voidedItem;
    });
  }

  static async getGDRGForAttendance(attendanceId: string): Promise<any | null> {
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        Patient: { select: { dateOfBirth: true } },
        AttendanceDiagnosis: {
          where: { primary: true },
          include: { Diagnosis: true }
        }
      }
    });

    if (!attendance) return null;

    const ageInYears = NHISClaimService.calculateAgeInYears(
      attendance.Patient.dateOfBirth,
      attendance.dateTime
    );

    return await NHISClaimService.resolveGDRGByContext(attendance, ageInYears);
  }
}