// cron/wardChargeCron.ts - Daily Ward Charge Generation (CORPORATE SUPPORT ADDED)
import { PrismaClient, PaymentMode } from '@prisma/client';

const prisma = new PrismaClient();

export interface WardChargeResult {
  chargesCreated: number;
  errors: Array<{ admissionId: string; error: string }>;
  totalAmount: number;
}

export class WardChargeService {
  
  // Generate daily ward charges for all active admissions
  static async generateDailyWardCharges(chargeDate: Date = new Date()): Promise<WardChargeResult> {
    const result: WardChargeResult = {
      chargesCreated: 0,
      errors: [],
      totalAmount: 0
    };

    // Create clean date objects without mutating input
    const startOfDay = new Date(chargeDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(chargeDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all active admissions (not discharged)
    const activeAdmissions = await prisma.admission.findMany({
      where: {
        status: 'admitted',
        dischargeDate: null
      },
      include: {
        Ward: true,           // ✅ FIXED: Capital W
        Bed: true,
        Attendance: {
          include: {
            Patient: true,
            Bill: true,
            InsuranceProvider: true,
            CorporateAccount: true
          }
        }
      }
    });

    console.log(`🏥 Found ${activeAdmissions.length} active admissions for ward charges on ${startOfDay.toISOString().split('T')[0]}`);

    for (const admission of activeAdmissions) {
      try {
        // Check using clean date objects
        const existingCharge = await prisma.wardChargeRecord.findFirst({
          where: {
            admissionId: admission.id,
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

        // Handle missing attendance or bill
        if (!admission.Attendance) {
          console.error(`❌ Admission ${admission.id} has no attendance record`);
          result.errors.push({
            admissionId: admission.id,
            error: 'Missing attendance record'
          });
          continue;
        }

        // Determine daily rate based on payment mode (INCLUDING CORPORATE)
        const paymentMode = admission.Attendance?.paymentMode || 'cash';
        let dailyRate = 0;
        let nhisPrice = 0;
        let cashPrice = 0;
        let insurancePrice = 0;
        let corporatePrice = 0;

        switch (paymentMode) {
          case 'nhis':
            dailyRate = admission.Ward.dailyNHISRate || admission.Ward.dailyCashRate * 0.8;
            nhisPrice = dailyRate;
            cashPrice = 0;
            insurancePrice = 0;
            corporatePrice = 0;
            break;
          
          case 'private_insurance':
            dailyRate = admission.Ward.dailyInsuranceRate || admission.Ward.dailyCashRate * 0.9;
            insurancePrice = dailyRate;
            nhisPrice = 0;
            cashPrice = 0;
            corporatePrice = 0;
            break;
          
          case 'corporate':
            dailyRate = admission.Ward.dailyInsuranceRate || admission.Ward.dailyCashRate * 0.85;
            corporatePrice = dailyRate;
            insurancePrice = dailyRate;
            nhisPrice = 0;
            cashPrice = 0;
            
            console.log(`🏢 Corporate ward charge for admission ${admission.id}: GHS ${dailyRate}`);
            if (admission.Attendance.CorporateAccount) {
              console.log(`   Corporate Account: ${admission.Attendance.CorporateAccount.companyName}`);
            }
            break;
          
          case 'cash':
          default:
            dailyRate = admission.Ward.dailyCashRate;
            cashPrice = dailyRate;
            nhisPrice = 0;
            insurancePrice = 0;
            corporatePrice = 0;
            break;
        }

        if (dailyRate <= 0) {
          console.warn(`⚠️ Daily rate is 0 for ward ${admission.Ward.wardName} with payment mode ${paymentMode}`);
          dailyRate = admission.Ward.dailyCashRate;
          cashPrice = dailyRate;
          console.warn(`   Using fallback cash rate: GHS ${dailyRate}`);
        }

        // Create ward charge record
        const wardCharge = await prisma.wardChargeRecord.create({
          data: {
            attendanceId: admission.attendanceId!,
            admissionId: admission.id,
            wardId: admission.wardId,
            bedId: admission.bedId,
            chargeDate: startOfDay,
            dailyRate,
            paymentMode: paymentMode as PaymentMode,
            nhisPrice,
            cashPrice,
            insurancePrice,
            corporatePrice,  // ✅ ADDED: corporatePrice field exists in schema
            isBilled: false
          }
        });

        result.chargesCreated++;
        result.totalAmount += dailyRate;

        // If there's an active bill, add this charge as a bill line item
        if (admission.Attendance?.Bill && admission.Attendance.Bill.status !== 'paid') {
          await this.addWardChargeToBill(wardCharge.id, admission.Attendance.Bill.id);
        } else if (admission.Attendance && !admission.Attendance.Bill) {
          console.log(`📝 Creating missing bill for admission ${admission.id}`);
          const newBill = await this.createBillForAdmission(admission);
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

  // Create bill for admission
  static async createBillForAdmission(admission: any): Promise<any> {
    const paymentMode = admission.Attendance?.paymentMode || 'cash';
    const corporateAccountId = admission.Attendance?.corporateAccountId || null;
    
    return await prisma.bill.create({
      data: {
        billNumber: `BILL-${Date.now()}-${admission.id}`,
        patientId: admission.patientId,
        attendanceId: admission.attendanceId!,
        admissionId: admission.id,
        billDate: new Date(),
        paymentMode: paymentMode as PaymentMode,
        corporateAccountId: corporateAccountId,
        status: 'pending',
        createdById: 'system',
        subtotal: 0,
        totalAmount: 0,
        patientPayable: 0,
        paidAmount: 0,
        balance: 0
      }
    });
  }

  // Add ward charge to bill as line item (with corporate support)
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

    // Calculate insurance coverage and patient payable based on payment mode
    let insuranceCoveredAmount = 0;
    let patientPayableAmount = 0;
    let description = `Ward Charge - ${wardCharge.ward.wardName} - Day ${wardCharge.chargeDate.toISOString().split('T')[0]}`;
    
    switch (wardCharge.paymentMode) {
      case 'nhis':
        insuranceCoveredAmount = wardCharge.dailyRate;
        patientPayableAmount = 0;
        description += ' (NHIS Covered)';
        break;
      
      case 'private_insurance':
        insuranceCoveredAmount = wardCharge.dailyRate;
        patientPayableAmount = 0;
        description += ' (Private Insurance)';
        break;
      
      case 'corporate':
        insuranceCoveredAmount = wardCharge.dailyRate;
        patientPayableAmount = 0;
        description += ' (Corporate Account)';
        if (wardCharge.attendance?.CorporateAccount) {
          description += ` - ${wardCharge.attendance.CorporateAccount.companyName}`;
        }
        break;
      
      case 'cash':
      default:
        insuranceCoveredAmount = 0;
        patientPayableAmount = wardCharge.dailyRate;
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
        unitPrice: wardCharge.dailyRate,
        pricingBasis: wardCharge.paymentMode,
        vatRate: wardCharge.ward.vatRate || 0,
        vatAmount: 0,
        lineTotal: wardCharge.dailyRate,
        insuranceCoveredAmount,
        patientPayableAmount,
        discount: 0
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

    // Recalculate bill totals
    await this.recalculateBillTotals(billId);

    console.log(`✅ Added ward charge to bill ${billId}, line item ${lineItem.id} (${wardCharge.paymentMode})`);
  }

  // Recalculate bill totals after adding/removing charges (with corporate support)
  static async recalculateBillTotals(billId: string): Promise<void> {
    const lineItems = await prisma.billLineItem.findMany({
      where: { billId, isVoided: false }
    });

    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { CorporateAccount: true }
    });

    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const insuranceCovered = lineItems.reduce((sum, item) => sum + item.insuranceCoveredAmount, 0);
    const patientPayable = lineItems.reduce((sum, item) => sum + item.patientPayableAmount, 0);
    const totalAmount = subtotal;
    
    const balance = patientPayable - (bill?.paidAmount || 0);

    await prisma.bill.update({
      where: { id: billId },
      data: {
        subtotal,
        totalAmount,
        insuranceCovered,
        patientPayable,
        balance,
        status: balance <= 0 ? 'paid' : patientPayable > 0 ? 'pending' : 'draft'
      }
    });
    
    // Update corporate account balance if applicable
    if (bill?.corporateAccountId && patientPayable > 0) {
      await prisma.corporateAccount.update({
        where: { id: bill.corporateAccountId },
        data: {
          currentBalance: {
            increment: patientPayable
          }
        }
      });
      console.log(`🏢 Updated corporate account ${bill.corporateAccountId} balance: +GHS ${patientPayable}`);
    }
  }

  // Generate ward charges for a date range (catch-up)
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

  // Get ward charge summary for reporting (INCLUDING CORPORATE)
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
        admission: {
          include: {
            Patient: {
              select: {
                surname: true,
                otherNames: true,
                folderNumber: true
              }
            },
            Attendance: {
              include: {
                CorporateAccount: {
                  select: {
                    id: true,
                    companyName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { chargeDate: 'asc' }
    });

    // Include corporate in summary
    const summary = {
      period: { startDate, endDate },
      totalCharges: charges.length,
      totalAmount: charges.reduce((sum, c) => sum + c.dailyRate, 0),
      byPaymentMode: {
        cash: {
          count: charges.filter(c => c.paymentMode === 'cash').length,
          amount: charges.filter(c => c.paymentMode === 'cash').reduce((sum, c) => sum + c.dailyRate, 0)
        },
        nhis: {
          count: charges.filter(c => c.paymentMode === 'nhis').length,
          amount: charges.filter(c => c.paymentMode === 'nhis').reduce((sum, c) => sum + c.dailyRate, 0)
        },
        private_insurance: {
          count: charges.filter(c => c.paymentMode === 'private_insurance').length,
          amount: charges.filter(c => c.paymentMode === 'private_insurance').reduce((sum, c) => sum + c.dailyRate, 0)
        },
        corporate: {
          count: charges.filter(c => c.paymentMode === 'corporate').length,
          amount: charges.filter(c => c.paymentMode === 'corporate').reduce((sum, c) => sum + c.dailyRate, 0),
          byCompany: charges
            .filter(c => c.paymentMode === 'corporate')
            .reduce((acc: any, charge) => {
              const companyName = charge.admission?.Attendance?.CorporateAccount?.companyName || 'Unknown';
              if (!acc[companyName]) {
                acc[companyName] = { count: 0, amount: 0 };
              }
              acc[companyName].count++;
              acc[companyName].amount += charge.dailyRate;
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
        acc[wardName].amount += charge.dailyRate;
        return acc;
      }, {}),
      unbilledCharges: charges.filter(c => !c.isBilled).length,
      corporateInsights: {
        totalCorporateCharges: charges.filter(c => c.paymentMode === 'corporate').length,
        totalCorporateAmount: charges.filter(c => c.paymentMode === 'corporate').reduce((sum, c) => sum + c.dailyRate, 0),
        uniqueCompanies: new Set(charges
          .filter(c => c.paymentMode === 'corporate' && c.admission?.Attendance?.CorporateAccount)
          .map(c => c.admission?.Attendance?.CorporateAccount?.companyName)
        ).size
      }
    };

    return summary;
  }
}

// Cron job wrapper (to be called by your scheduler)
export async function runDailyWardChargeJob(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  console.log(`🕐 Running daily ward charge job for ${today.toISOString().split('T')[0]}`);
  
  try {
    const result = await WardChargeService.generateDailyWardCharges(today);
    
    if (result.errors.length > 0) {
      console.error(`⚠️ Ward charge job completed with ${result.errors.length} errors`);
    } else {
      console.log(`✅ Ward charge job completed: ${result.chargesCreated} charges, GHS ${result.totalAmount}`);
    }
  } catch (error) {
    console.error('❌ Ward charge job failed:', error);
  }
}

// Manual run endpoint with corporate support
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

// Endpoint to get corporate ward charge report
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
          admission: {
            include: {
              Patient: true
            }
          }
        }
      });
      
      corporateCharges = {
        count: companyCharges.length,
        amount: companyCharges.reduce((sum, c) => sum + c.dailyRate, 0),
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