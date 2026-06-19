// cron/wardChargeCron.ts - Daily Ward Charge Generation (ALL BUGS FIXED)
import { PrismaClient, PaymentMode } from '@prisma/client';
import { getCounterService } from '../services/CounterService';

const prisma = new PrismaClient();

// ✅ Helper to safely convert Prisma Decimal objects to JS numbers
const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

// ✅ Resolve a real system actor for auto-generated bills.
// Bill.createdById is a REQUIRED foreign key to User, so a literal 'system'
// string violates the FK constraint. Attribute system bills to an admin user.
let cachedSystemUserId: string | null = null;
const getSystemUserId = async (): Promise<string> => {
  if (cachedSystemUserId) return cachedSystemUserId;
  const admin = await prisma.user.findFirst({
    where: { role: 'admin', isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true }
  });
  if (!admin) {
    throw new Error('No active admin user found to attribute system-generated ward-charge bills to');
  }
  cachedSystemUserId = admin.id;
  return cachedSystemUserId;
};

export interface WardChargeResult {
  chargesCreated: number;
  errors: Array<{ admissionId: string; error: string }>;
  totalAmount: number;
}

export class WardChargeService {

  // ==========================================
  // GENERATE DAILY WARD CHARGES
  // ==========================================
  static async generateDailyWardCharges(chargeDate: Date = new Date()): Promise<WardChargeResult> {
    const result: WardChargeResult = {
      chargesCreated: 0,
      errors: [],
      totalAmount: 0
    };

    const startOfDay = new Date(chargeDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(chargeDate);
    endOfDay.setHours(23, 59, 59, 999);

    // ✅ FIXED: Include all necessary relations through Attendance
    const activeAdmissions = await prisma.admission.findMany({
      where: {
        dischargeDate: null
      },
      include: {
        attendance: {
          include: {
            Patient: true,
            Bill: true,
            InsuranceProvider: true,
            CorporateAccount: true,
            Ward: true,      // ✅ Ward is on Attendance
            Bed: true        // ✅ Bed is on Attendance
          }
        }
      }
    });

    console.log(`🏥 Found ${activeAdmissions.length} active admissions for ward charges on ${startOfDay.toISOString().split('T')[0]}`);

    for (const admission of activeAdmissions) {
      try {
        // ✅ FIXED: Check if charge already exists for this date
        const existingCharge = await prisma.wardChargeRecord.findFirst({
          where: {
            attendanceId: admission.attendanceId,
            chargeDate: {
              gte: startOfDay,
              lt: endOfDay
            }
          }
        });

        if (existingCharge) {
          console.log(`⚠️ Ward charge already exists for admission ${admission.id} on ${startOfDay.toISOString().split('T')[0]}`);
          continue;
        }

        // ✅ FIXED: Access all fields through attendance, not admission
        const attendance = admission.attendance;
        if (!attendance) {
          console.error(`❌ Admission ${admission.id} has no attendance record`);
          result.errors.push({
            admissionId: admission.id,
            error: 'Missing attendance record'
          });
          continue;
        }

        if (!attendance.Ward) {
          console.error(`❌ Admission ${admission.id} has no ward assigned`);
          result.errors.push({
            admissionId: admission.id,
            error: 'Missing ward assignment'
          });
          continue;
        }

        // ✅ FIXED: Determine daily rate based on payment mode
        const paymentMode = attendance.paymentMode || 'cash';
        const ward = attendance.Ward;
        let dailyRate = 0;
        let nhisPrice = 0;
        let cashPrice = 0;
        let insurancePrice = 0;
        let corporatePrice = 0;

        // ✅ FIXED: Use toNumber() for all Decimal fields
        const wardCashRate = toNumber(ward.dailyCashRate);
        const wardNHISRate = toNumber(ward.dailyNHISRate);
        const wardInsuranceRate = toNumber(ward.dailyInsuranceRate);

        switch (paymentMode) {
          case 'nhis':
            dailyRate = wardNHISRate > 0 ? wardNHISRate : wardCashRate * 0.8;
            nhisPrice = dailyRate;
            break;

          case 'private_insurance':
            dailyRate = wardInsuranceRate > 0 ? wardInsuranceRate : wardCashRate * 0.9;
            insurancePrice = dailyRate;
            break;

          case 'corporate':
            dailyRate = wardInsuranceRate > 0 ? wardInsuranceRate : wardCashRate * 0.85;
            corporatePrice = dailyRate;
            insurancePrice = dailyRate; // Corporate uses insurance rate
            console.log(`🏢 Corporate ward charge for admission ${admission.id}: GHS ${dailyRate}`);
            if (attendance.CorporateAccount) {
              console.log(`   Corporate Account: ${attendance.CorporateAccount.companyName}`);
            }
            break;

          case 'cash':
          default:
            dailyRate = wardCashRate;
            cashPrice = dailyRate;
            break;
        }

        if (dailyRate <= 0) {
          console.warn(`⚠️ Daily rate is 0 for ward ${ward.wardName} with payment mode ${paymentMode}`);
          dailyRate = wardCashRate;
          cashPrice = dailyRate;
          console.warn(`   Using fallback cash rate: GHS ${dailyRate}`);
        }

        // ✅ FIXED: Create ward charge with correct field references
        const wardCharge = await prisma.wardChargeRecord.create({
          data: {
            attendanceId: attendance.id,
            admissionId: admission.id,
            wardId: ward.id,
            bedId: attendance.bedId || '',
            chargeDate: startOfDay,
            dailyRate,
            paymentMode: paymentMode as PaymentMode,
            nhisPrice,
            cashPrice,
            insurancePrice,
            corporatePrice,
            isBilled: false
          }
        });

        result.chargesCreated++;
        result.totalAmount += dailyRate;

        // If there's an active bill, add this charge as a bill line item
        if (attendance.Bill && attendance.Bill.status !== 'paid') {
          await this.addWardChargeToBill(wardCharge.id, attendance.Bill.id);
        } else if (attendance && !attendance.Bill) {
          console.log(`📝 Creating missing bill for admission ${admission.id}`);
          const newBill = await this.createBillForAdmission(admission, attendance);
          await this.addWardChargeToBill(wardCharge.id, newBill.id);
        }

        console.log(`✅ Created ward charge for admission ${admission.id}: ${paymentMode} - GHS ${dailyRate}`);

      } catch (error) {
        console.error(`❌ Error creating ward charge for admission ${admission.id}:`, error);
        result.errors.push({
          admissionId: admission.id,
          error: (error as Error).message
        });
      }
    }

    console.log(`📊 Ward charge generation complete: ${result.chargesCreated} charges created, total GHS ${result.totalAmount}`);
    return result;
  }

  // ==========================================
  // CREATE BILL FOR ADMISSION
  // ==========================================
  // ✅ FIXED: Accept attendance as parameter to access patientId, wardId, etc.
  static async createBillForAdmission(admission: any, attendance: any): Promise<any> {
    const paymentMode = attendance.paymentMode || 'cash';
    const corporateAccountId = attendance.corporateAccountId || null;

    // ✅ FIXED: Bill number is derived from the attendance number (one bill per attendance)
    const billNumber = getCounterService().getBillNumberFromAttendance(attendance.attendanceNumber);
    // ✅ FIXED: createdById must reference a real User row
    const systemUserId = await getSystemUserId();

    return await prisma.bill.create({
      data: {
        billNumber,
        patientId: attendance.patientId,  // ✅ From attendance, not admission
        attendanceId: attendance.id,
        admissionId: admission.id,
        billDate: new Date(),
        paymentMode: paymentMode as PaymentMode,
        corporateAccountId: corporateAccountId,
        insuranceProviderId: attendance.insuranceProviderId,
        status: 'pending',
        createdById: systemUserId,
        subtotal: 0,
        discount: 0,
        taxAmount: 0,
        totalAmount: 0,
        insuranceCovered: 0,
        patientPayable: 0,
        paidAmount: 0,
        balance: 0
      }
    });
  }

  // ==========================================
  // ADD WARD CHARGE TO BILL
  // ==========================================
  static async addWardChargeToBill(wardChargeId: string, billId: string): Promise<void> {
    const wardCharge = await prisma.wardChargeRecord.findUnique({
      where: { id: wardChargeId },
      include: {
        attendance: {
          include: {
            Patient: true,
            CorporateAccount: true
          }
        },
        ward: true
      }
    });

    if (!wardCharge) {
      throw new Error('Ward charge not found');
    }

    if (wardCharge.isBilled) {
      console.log(`⚠️ Ward charge ${wardChargeId} already billed`);
      return;
    }

    // ✅ FIXED: Use toNumber() for all Decimal calculations
    const dailyRate = toNumber(wardCharge.dailyRate);
    const vatRate = toNumber(wardCharge.ward.vatRate);
    const vatAmount = dailyRate * (vatRate / 100);
    const lineTotal = dailyRate + vatAmount;

    // Calculate insurance coverage and patient payable
    let insuranceCoveredAmount = 0;
    let patientPayableAmount = 0;
    let description = `Ward Charge - ${wardCharge.ward.wardName} - Day ${wardCharge.chargeDate.toISOString().split('T')[0]}`;

    switch (wardCharge.paymentMode) {
      case 'nhis':
        insuranceCoveredAmount = lineTotal;
        patientPayableAmount = 0;
        description += ' (NHIS Covered)';
        break;

      case 'private_insurance':
        insuranceCoveredAmount = lineTotal;
        patientPayableAmount = 0;
        description += ' (Private Insurance)';
        break;

      case 'corporate':
        insuranceCoveredAmount = lineTotal;
        patientPayableAmount = 0;
        description += ' (Corporate Account)';
        if (wardCharge.attendance?.CorporateAccount) {
          description += ` - ${wardCharge.attendance.CorporateAccount.companyName}`;
        }
        break;

      case 'cash':
      default:
        insuranceCoveredAmount = 0;
        patientPayableAmount = lineTotal;
        description += ' (Cash)';
        break;
    }

    // Create bill line item
    const lineItem = await prisma.billLineItem.create({
      data: {
        billId,
        description,
        serviceType: 'ward',
        quantity: 1,
        unitPrice: dailyRate,
        pricingBasis: wardCharge.paymentMode,
        vatRate,
        vatAmount,
        lineTotal,
        insuranceCoveredAmount,
        patientPayableAmount,
        discount: 0,
        isVoided: false
      }
    });

    // Update ward charge as billed
    await prisma.wardChargeRecord.update({
      where: { id: wardChargeId },
      data: {
        isBilled: true,
        billLineItemId: lineItem.id
      }
    });

    // ✅ FIXED: Recalculate bill totals WITHOUT touching corporate balance
    await this.recalculateBillTotals(billId);

    console.log(`✅ Added ward charge to bill ${billId}, line item ${lineItem.id} (${wardCharge.paymentMode})`);
  }

  // ==========================================
  // RECALCULATE BILL TOTALS
  // ==========================================
  // ✅ FIXED: This function should ONLY recalculate bill fields,
  // NOT increment corporate balance (that causes double-charging!)
  static async recalculateBillTotals(billId: string): Promise<void> {
    const lineItems = await prisma.billLineItem.findMany({
      where: { billId, isVoided: false }
    });

    // ✅ FIXED: Use toNumber() for all Decimal math
    const subtotal = lineItems.reduce((sum, item) => sum + toNumber(item.lineTotal), 0);
    const insuranceCovered = lineItems.reduce((sum, item) => sum + toNumber(item.insuranceCoveredAmount), 0);
    const patientPayable = lineItems.reduce((sum, item) => sum + toNumber(item.patientPayableAmount), 0);
    const totalAmount = subtotal;

    const bill = await prisma.bill.findUnique({
      where: { id: billId }
    });

    if (!bill) return;

    const paidAmount = toNumber(bill.paidAmount);
    const balance = patientPayable - paidAmount;

    // ✅ FIXED: Correct status logic
    let status: any = 'draft';
    if (balance <= 0 && patientPayable > 0) {
      status = 'paid';
    } else if (paidAmount > 0 && balance > 0) {
      status = 'partial';
    } else if (patientPayable > 0) {
      status = 'pending';
    }

    await prisma.bill.update({
      where: { id: billId },
      data: {
        subtotal,
        totalAmount,
        insuranceCovered,
        patientPayable,
        balance,
        status
      }
    });

    // ✅ FIXED: REMOVED corporate balance increment from here!
    // Corporate balance should ONLY be updated when a bill is FINALIZED/SENT,
    // not every time totals are recalculated.
    // The corporate account balance is managed separately when bills are submitted.
  }

  // ==========================================
  // FINALIZE CORPORATE BILL (Called when bill is sent to corporate)
  // ==========================================
  // ✅ NEW: Separate method to handle corporate balance updates
  static async finalizeCorporateBill(billId: string): Promise<void> {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { CorporateAccount: true }
    });

    if (!bill || !bill.corporateAccountId) return;

    const patientPayable = toNumber(bill.patientPayable);
    if (patientPayable <= 0) return;

    // ✅ Only increment corporate balance ONCE when bill is finalized
    await prisma.corporateAccount.update({
      where: { id: bill.corporateAccountId },
      data: {
        currentBalance: { increment: patientPayable }
      }
    });

    console.log(`🏢 Updated corporate account ${bill.corporateAccountId} balance: +GHS ${patientPayable}`);
  }

  // ==========================================
  // GENERATE WARD CHARGES FOR DATE RANGE
  // ==========================================
  static async generateWardChargesForRange(startDate: Date, endDate: Date): Promise<WardChargeResult[]> {
    const results: WardChargeResult[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const result = await this.generateDailyWardCharges(new Date(currentDate));
      results.push(result);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return results;
  }

  // ==========================================
  // WARD CHARGE SUMMARY REPORT
  // ==========================================
  static async getWardChargeSummary(startDate: Date, endDate: Date): Promise<any> {
    const charges = await prisma.wardChargeRecord.findMany({
      where: {
        chargeDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        ward: true,
        attendance: {
          include: {
            Patient: {
              select: {
                surname: true,
                otherNames: true,
                folderNumber: true
              }
            },
            CorporateAccount: {
              select: {
                id: true,
                companyName: true
              }
            }
          }
        }
      },
      orderBy: { chargeDate: 'asc' }
    });

    // ✅ FIXED: Use toNumber() for all financial calculations
    const summary = {
      period: { startDate, endDate },
      totalCharges: charges.length,
      totalAmount: charges.reduce((sum, c) => sum + toNumber(c.dailyRate), 0),
      byPaymentMode: {
        cash: {
          count: charges.filter(c => c.paymentMode === 'cash').length,
          amount: charges.filter(c => c.paymentMode === 'cash').reduce((sum, c) => sum + toNumber(c.dailyRate), 0)
        },
        nhis: {
          count: charges.filter(c => c.paymentMode === 'nhis').length,
          amount: charges.filter(c => c.paymentMode === 'nhis').reduce((sum, c) => sum + toNumber(c.dailyRate), 0)
        },
        private_insurance: {
          count: charges.filter(c => c.paymentMode === 'private_insurance').length,
          amount: charges.filter(c => c.paymentMode === 'private_insurance').reduce((sum, c) => sum + toNumber(c.dailyRate), 0)
        },
        corporate: {
          count: charges.filter(c => c.paymentMode === 'corporate').length,
          amount: charges.filter(c => c.paymentMode === 'corporate').reduce((sum, c) => sum + toNumber(c.dailyRate), 0),
          byCompany: charges
            .filter(c => c.paymentMode === 'corporate')
            .reduce((acc: any, charge) => {
              const companyName = charge.attendance?.CorporateAccount?.companyName || 'Unknown';
              if (!acc[companyName]) {
                acc[companyName] = { count: 0, amount: 0 };
              }
              acc[companyName].count++;
              acc[companyName].amount += toNumber(charge.dailyRate);
              return acc;
            }, {})
        }
      },
      byWard: charges.reduce((acc: any, charge) => {
        const wardName = charge.ward.wardName;
        if (!acc[wardName]) {
          acc[wardName] = { count: 0, amount: 0 };
        }
        acc[wardName].count++;
        acc[wardName].amount += toNumber(charge.dailyRate);
        return acc;
      }, {}),
      unbilledCharges: charges.filter(c => !c.isBilled).length,
      corporateInsights: {
        totalCorporateCharges: charges.filter(c => c.paymentMode === 'corporate').length,
        totalCorporateAmount: charges.filter(c => c.paymentMode === 'corporate').reduce((sum, c) => sum + toNumber(c.dailyRate), 0),
        uniqueCompanies: new Set(
          charges
            .filter(c => c.paymentMode === 'corporate' && c.attendance?.CorporateAccount)
            .map(c => c.attendance?.CorporateAccount?.companyName)
        ).size
      }
    };

    return summary;
  }
}

// ==========================================
// CRON JOB WRAPPER
// ==========================================
export async function runDailyWardChargeJob(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`🕐 Running daily ward charge job for ${today.toISOString().split('T')[0]}`);

  try {
    const result = await WardChargeService.generateDailyWardCharges(today);

    if (result.errors.length > 0) {
      console.error(`⚠️ Ward charge job completed with ${result.errors.length} errors`);
      result.errors.forEach(e => console.error(`   - Admission ${e.admissionId}: ${e.error}`));
    } else {
      console.log(`✅ Ward charge job completed: ${result.chargesCreated} charges, GHS ${result.totalAmount}`);
    }
  } catch (error) {
    console.error('❌ Ward charge job failed:', error);
  }
}

// ==========================================
// MANUAL RUN ENDPOINT
// ==========================================
export const manualRunWardCharges = async (req: any, res: any) => {
  try {
    const { date, startDate, endDate, paymentMode } = req.query;

    let result;
    if (startDate && endDate) {
      result = await WardChargeService.generateWardChargesForRange(
        new Date(startDate as string),
        new Date(endDate as string)
      );
    } else {
      const targetDate = date ? new Date(date as string) : new Date();
      result = await WardChargeService.generateDailyWardCharges(targetDate);
    }

    if (paymentMode === 'corporate') {
      const summary = await WardChargeService.getWardChargeSummary(
        startDate ? new Date(startDate as string) : new Date(),
        endDate ? new Date(endDate as string) : new Date()
      );
      res.json({
        success: true,
        message: 'Ward charges generated successfully',
        data: result,
        corporateSummary: summary.corporateInsights,
        corporateCharges: summary.byPaymentMode.corporate
      });
    } else {
      res.json({
        success: true,
        message: 'Ward charges generated successfully',
        data: result
      });
    }
  } catch (error) {
    console.error('Error running manual ward charges:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating ward charges',
      error: (error as Error).message
    });
  }
};

// ==========================================
// CORPORATE WARD CHARGE REPORT ENDPOINT
// ==========================================
export const getCorporateWardChargeReport = async (req: any, res: any) => {
  try {
    const { startDate, endDate, companyId } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate as string) : new Date();

    const summary = await WardChargeService.getWardChargeSummary(start, end);

    let corporateCharges = summary.byPaymentMode.corporate;

    if (companyId && corporateCharges.byCompany) {
      const companyCharges = await prisma.wardChargeRecord.findMany({
        where: {
          paymentMode: 'corporate',
          chargeDate: { gte: start, lte: end },
          attendance: {
            corporateAccountId: companyId as string
          }
        },
        include: {
          ward: true,
          attendance: {
            include: {
              Patient: true
            }
          }
        }
      });

      corporateCharges = {
        count: companyCharges.length,
        amount: companyCharges.reduce((sum, c) => sum + toNumber(c.dailyRate), 0),
        details: companyCharges
      };
    }

    res.json({
      success: true,
      data: {
        period: { start, end },
        summary: summary.byPaymentMode.corporate,
        corporateCharges,
        totalCorporateRevenue: summary.corporateInsights.totalCorporateAmount
      }
    });
  } catch (error) {
    console.error('Error getting corporate ward charge report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching corporate ward charge report',
      error: (error as Error).message
    });
  }
};