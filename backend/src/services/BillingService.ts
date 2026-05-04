// services/BillingService.ts - COMPLETE CORRECTED VERSION
import { PrismaClient, PaymentMode, EncounterCategory, AttendanceType, ServiceType } from '@prisma/client';
import { NHISClaimService } from './NHISClaimService';

const prisma = new PrismaClient();

// At the top of BillingService.ts, ensure this mapping is complete:
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
    'miscellaneous': ServiceType.miscellaneous,
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

  // Add to BillingService.ts - SYNTAX FIXED

static async verifyMedicationBilling(attendanceId: string): Promise<{
  medicationsInServiceRendered: any[];
  medicationsInBill: any[];
  missingFromBill: any[];
}> {
  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      Medication: {
        include: { ServiceCatalog: true }
      },
      ServiceRendered: {
        include: { ServiceCatalog: true }
      },
      Bill: {
        include: {
          BillLineItem: {
            include: { serviceCatalog: true }
          }
        }
      }
    }
  });

  if (!attendance) {
    throw new Error('Attendance not found');
  }

  const medicationsInServiceRendered = attendance.ServiceRendered.filter(
    (sr: any) => sr.ServiceCatalog?.serviceType === 'medication'
  );

  const medicationsInBill = attendance.Bill?.BillLineItem.filter(
    (item: any) => item.serviceCatalog?.serviceType === 'medication'
  ) || [];

  const prescribedMedications = attendance.Medication.filter((m: any) => m.status !== 'cancelled');
  
  const missingFromBill = prescribedMedications.filter((med: any) => {
    return !medicationsInBill.some((billItem: any) => 
      billItem.serviceCatalogId === med.serviceCatalogId
    );
  });

  return {
    medicationsInServiceRendered,
    medicationsInBill,
    missingFromBill
  };
}


// In BillingService.ts - Update generateBillFromAttendance
  static async generateBillFromAttendance(attendanceId: string) {
    console.log('=========================================');
    console.log('💰 BILLING SERVICE - generateBillFromAttendance');
    console.log('=========================================');
    console.log('📌 Attendance ID:', attendanceId);
    
    return await prisma.$transaction(async (tx) => {
      console.log('🔍 Fetching attendance with services...');
      
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
        console.log('❌ Attendance not found');
        throw new Error('Attendance not found');
      }

      console.log('📊 Attendance Data:', {
        id: attendance.id,
        patientId: attendance.patientId,
        paymentMode: attendance.paymentMode,
        servicesRenderedCount: attendance.ServiceRendered.length
      });

      console.log('📋 Services Rendered:');
      attendance.ServiceRendered.forEach((sr, index) => {
        console.log(`  ${index + 1}. ${sr.ServiceCatalog?.name} (${sr.ServiceCatalog?.code}) - Qty: ${sr.quantity}`);
      });

      if (attendance.paymentMode === 'nhis' && !attendance.nhisCCC) {
        console.log('❌ NHIS CCC missing');
        throw new Error('NHIS CCC number is required for NHIS billing');
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
        if (!service || !service.pricing) {
          console.log(`⚠️ Skipping service ${rendered.serviceItemId} - no pricing found`);
          continue;
        }

        console.log(`\n🔄 Processing service: ${service.name}`);
        console.log(`   Quantity: ${rendered.quantity}`);
        console.log(`   Pricing - Cash: ${service.pricing.cashPrice}, NHIS: ${service.pricing.nhisPrice}, Insurance: ${service.pricing.insurancePrice}`);

        const calculation = await this.calculateServiceBilling(
          service.id,
          rendered.quantity,
          attendance.paymentMode,
          attendance.InsuranceProvider
        );

        console.log(`   Calculation Result:`);
        console.log(`     - Cash Price: ${calculation.cashPrice}`);
        console.log(`     - Insurance Covered: ${calculation.insuranceCovered}`);
        console.log(`     - Patient Payable: ${calculation.patientPayable}`);
        console.log(`     - Requires Auth: ${calculation.requiresAuthorization}`);

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

      console.log('\n📊 TOTALS:');
      console.log(`   Total Cash Price: ${totalCashPrice}`);
      console.log(`   Total Insurance Covered: ${totalInsuranceCovered}`);
      console.log(`   Total Patient Payable: ${totalPatientPayable}`);

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

      console.log('\n💰 Bill Data to Save:', billData);

      if (!bill) {
        console.log('📝 Creating new bill...');
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
        console.log(`✅ Bill created: ${bill.billNumber} (${bill.id})`);
      } else {
        console.log(`📝 Updating existing bill: ${bill.billNumber}`);
        bill = await tx.bill.update({
          where: { id: bill.id },
          data: billData
        });
        console.log(`✅ Bill updated`);
      }

      // Delete existing line items
      const deleted = await tx.billLineItem.deleteMany({
        where: { billId: bill.id }
      });
      console.log(`🗑️ Deleted ${deleted.count} existing line items`);

      // Create new line items
      console.log(`📝 Creating ${billItems.length} new line items...`);
      for (const item of billItems) {
        const serviceType = mapCategoryToServiceType(item.category);
        
        const lineItem = await tx.billLineItem.create({
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
        console.log(`   ✅ Created line item: ${lineItem.description} - ${lineItem.lineTotal}`);
      }

      await tx.attendance.update({
        where: { id: attendanceId },
        data: {
          totalBill: totalCashPrice,
          outstandingBalance: patientPayable
        }
      });

      console.log('=========================================');
      console.log('✅ BILL GENERATION COMPLETE');
      console.log('=========================================');

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