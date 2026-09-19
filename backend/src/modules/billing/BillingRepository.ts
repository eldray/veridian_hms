import { PrismaClient, BillStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { BillFilters } from './BillingTypes';

// ✅ Helper to safely convert Prisma Decimal objects to JS numbers for math
const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class BillingRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'bill');
  }

  async findAll(filters: BillFilters) {
    const { patientId, status, paymentMode, dateFrom, dateTo, page = 1, limit = 1000 } = filters;
    const where: any = {};

    if (patientId) where.patientId = patientId;
    if (status) where.status = Array.isArray(status) ? { in: status } : status;
    if (paymentMode) where.paymentMode = paymentMode;
    if (dateFrom || dateTo) {
      where.billDate = {};
      if (dateFrom) where.billDate.gte = new Date(dateFrom);
      if (dateTo) where.billDate.lte = new Date(dateTo);
    }

    // ✅ Uses BaseRepository pagination helper
    const result = await this.findManyWithPagination({
      where, page, limit: Math.min(limit, 1000), orderBy: { billDate: 'desc' },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true } },
        Attendance: { select: { id: true, attendanceNumber: true, attendanceType: true, encounterCategory: true } },
        Admission: { select: { id: true, admissionNumber: true, status: true } },
        InsuranceProvider: { select: { id: true, name: true, type: true } },
        CorporateAccount: { select: { id: true, companyName: true, creditLimit: true, currentBalance: true } },
        Payment: true
      }
    });

    return { bills: result.data, total: result.total, page: result.page, limit: result.limit };
  }

  async findById(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true, paymentMode: true } },
        Attendance: { select: { id: true, attendanceNumber: true, attendanceType: true, encounterCategory: true, dateTime: true } },
        Admission: { select: { id: true, admissionNumber: true, status: true, admissionDate: true } },
        InsuranceProvider: { select: { id: true, name: true, type: true, coveragePercentage: true } },
        CorporateAccount: { select: { id: true, companyName: true, creditLimit: true, currentBalance: true, discountPercentage: true } },
        Payment: { orderBy: { transactionDate: 'desc' } },
        InsuranceClaim: { select: { id: true, claimNumber: true, status: true, totalClaimAmount: true, submissionDate: true } },
        BillLineItem: { where: { isVoided: false }, include: { serviceCatalog: { select: { name: true, code: true, serviceType: true } } }, orderBy: { createdAt: 'asc' } },
        User_Bill_createdByIdToUser: { select: { id: true, fullName: true, username: true } }
      }
    });
  }

  async create(data: any, items: any[]) {
    return this.prisma.$transaction(async (tx) => {
      if (data.paymentMode === 'nhis' || data.paymentMode === 'private_insurance') {
        if (!data.insuranceProviderId) throw new Error('Insurance Provider ID is required');
        const provider = await tx.insuranceProvider.findUnique({ where: { id: data.insuranceProviderId } });
        if (!provider || !provider.isActive) throw new Error('Invalid or inactive insurance provider');
      }
  
      if (data.paymentMode === 'corporate') {
        if (!data.corporateAccountId) throw new Error('Corporate Account ID is required');
        const corporate = await tx.corporateAccount.findUnique({ where: { id: data.corporateAccountId } });
        if (!corporate || !corporate.isActive) throw new Error('Invalid or inactive corporate account');
      }
  
      const bill = await tx.bill.create({
        data,
        include: { Patient: { select: { surname: true, otherNames: true, folderNumber: true, contact: true } }, Attendance: { select: { attendanceNumber: true, attendanceType: true } }, CorporateAccount: true }
      });
  
      for (const item of items) {
        await tx.billLineItem.create({ data: item });
      }
  
      const lineItems = await tx.billLineItem.findMany({ where: { billId: bill.id, isVoided: false } });
  
      // ✅ FIXED: Safely parse Prisma Decimals to numbers for JS math
      const totalAmount = lineItems.reduce((sum, i) => sum + toNumber(i.lineTotal), 0);
      let patientPayable = totalAmount;
      let insuranceCovered = 0;
  
      if ((data.paymentMode === 'nhis' || data.paymentMode === 'private_insurance') && data.insuranceProviderId) {
        const provider = await tx.insuranceProvider.findUnique({ where: { id: data.insuranceProviderId } });
        if (provider) {
          insuranceCovered = totalAmount * (toNumber(provider.coveragePercentage) / 100);
          patientPayable = totalAmount - insuranceCovered;
        }
      } else if (data.paymentMode === 'corporate' && data.corporateAccountId) {
        const corporate = await tx.corporateAccount.findUnique({ where: { id: data.corporateAccountId } });
        if (corporate) {
          patientPayable = 0;
          const corporateCovered = totalAmount;
          await tx.corporateAccount.update({ where: { id: data.corporateAccountId }, data: { currentBalance: { increment: corporateCovered } } });
        }
      }
  
      return tx.bill.update({
        where: { id: bill.id },
        data: { totalAmount, patientPayable, balance: patientPayable, subtotal: totalAmount, insuranceCovered, waiverAmount: 0 },
        include: { Patient: true, Attendance: true, BillLineItem: true, CorporateAccount: true }
      });
    });
  }

  async addPayment(id: string, paymentData: any) {
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({ where: { id } });
      if (!bill) throw new Error('Bill not found');

      // ✅ FIXED: Safely parse Decimals
      const paymentAmount = toNumber(paymentData.amount);
      const newPaidAmount = toNumber(bill.paidAmount) + paymentAmount;
      const newBalance = toNumber(bill.totalAmount) - newPaidAmount;

      let newStatus: BillStatus = bill.status;
      if (newBalance <= 0) newStatus = 'paid';
      else if (newPaidAmount > 0 && newPaidAmount < toNumber(bill.totalAmount)) newStatus = 'partial';

      const updatedBill = await tx.bill.update({
        where: { id },
        data: { paidAmount: newPaidAmount, balance: newBalance, status: newStatus, updatedAt: new Date() },
        include: { Patient: { select: { surname: true, otherNames: true, folderNumber: true, contact: true } }, Attendance: { select: { attendanceNumber: true, attendanceType: true } }, CorporateAccount: true }
      });

      const payment = await tx.payment.create({
        data: { billId: id, amount: paymentAmount, paymentMethod: paymentData.paymentMethod, reference: paymentData.reference || `PAY-${Date.now()}`, receivedById: paymentData.userId, notes: paymentData.notes, transactionDate: new Date() }
      });

      if (bill.attendanceId) {
        await tx.attendance.update({ where: { id: bill.attendanceId }, data: { outstandingBalance: newBalance } });
      }

      return { bill: updatedBill, payment };
    });
  }

  async updateStatus(id: string, status: BillStatus, userId: string) {
    return this.getModel().update({ where: { id }, data: { status, updatedAt: new Date(), updatedById: userId }, include: { Patient: { select: { surname: true, otherNames: true, folderNumber: true } }, Attendance: { select: { attendanceNumber: true } }, CorporateAccount: true } });
  }

  async getStatistics(period: string) {
    const date = new Date();
    let startDate: Date;
    switch (period) {
      case 'today': startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()); break;
      case 'week': startDate = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case 'month': startDate = new Date(date.getFullYear(), date.getMonth(), 1); break;
      case 'quarter': startDate = new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1); break;
      case 'year': startDate = new Date(date.getFullYear(), 0, 1); break;
      default: startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    }

    const where = { billDate: { gte: startDate } };
    const [totalBills, totalAmount, totalPaid, totalPending, byPaymentMode, byStatus, corporateTotals] = await Promise.all([
      this.count(where),
      this.prisma.bill.aggregate({ where, _sum: { totalAmount: true } }),
      this.prisma.bill.aggregate({ where, _sum: { paidAmount: true } }),
      this.count({ ...where, status: { in: ['pending', 'partial'] } }),
      this.prisma.bill.groupBy({ by: ['paymentMode'], where, _count: { id: true }, _sum: { totalAmount: true, paidAmount: true } }),
      this.prisma.bill.groupBy({ by: ['status'], where, _count: { id: true }, _sum: { totalAmount: true, paidAmount: true } }),
      this.prisma.bill.aggregate({ where: { ...where, paymentMode: 'corporate' }, _sum: { totalAmount: true, paidAmount: true } })
    ]);

    return {
      period: { start: startDate, end: new Date(), type: period },
      summary: {
        totalBills,
        totalAmount: toNumber(totalAmount._sum.totalAmount), // ✅ FIXED
        totalPaid: toNumber(totalPaid._sum.paidAmount),       // ✅ FIXED
        totalPending,
        collectionRate: totalAmount._sum.totalAmount ? (toNumber(totalPaid._sum.paidAmount) / toNumber(totalAmount._sum.totalAmount)) * 100 : 0
      },
      byPaymentMode, byStatus,
      corporateSummary: { totalCorporateBills: toNumber(corporateTotals._sum.totalAmount), totalCorporatePaid: toNumber(corporateTotals._sum.paidAmount) }
    };
  }

  async getLineItems(billId: string) {
    const lineItems = await this.prisma.billLineItem.findMany({
      where: { billId, isVoided: false },
      include: { serviceCatalog: { select: { name: true, code: true, serviceType: true } }, voidedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' }
    });

    const bill = await this.getModel().findUnique({
      where: { id: billId },
      select: { 
        id: true,
        billNumber: true, // ✅ FIXED: Removed getCounterService().nextBillNumber()
        status: true, totalAmount: true, paidAmount: true, balance: true, paymentMode: true, corporateAccountId: true, insuranceProviderId: true
      }
    });

    return {
      bill, lineItems,
      summary: {
        totalItems: lineItems.length,
        subtotal: lineItems.reduce((sum, i) => sum + toNumber(i.lineTotal), 0),
        insuranceCovered: lineItems.reduce((sum, i) => sum + toNumber(i.insuranceCoveredAmount), 0),
        patientPayable: lineItems.reduce((sum, i) => sum + toNumber(i.patientPayableAmount), 0)
      }
    };
  }

  async voidLineItem(lineItemId: string, userId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const lineItem = await tx.billLineItem.findUnique({ where: { id: lineItemId }, include: { bill: true } });
      if (!lineItem) throw new Error('Line item not found');
      if (lineItem.isVoided) throw new Error('Line item already voided');

      const updatedLineItem = await tx.billLineItem.update({ where: { id: lineItemId }, data: { isVoided: true, voidedAt: new Date(), voidedById: userId, voidReason: reason } });

      const activeLineItems = await tx.billLineItem.findMany({ where: { billId: lineItem.billId, isVoided: false } });
      
      // ✅ FIXED: Safely parse Decimals
      const newTotal = activeLineItems.reduce((sum, i) => sum + toNumber(i.lineTotal), 0);
      const newPatientPayable = activeLineItems.reduce((sum, i) => sum + toNumber(i.patientPayableAmount), 0);
      const newBalance = newPatientPayable - toNumber(lineItem.bill.paidAmount);

      await tx.bill.update({ where: { id: lineItem.billId }, data: { totalAmount: newTotal, patientPayable: newPatientPayable, balance: newBalance, status: newBalance <= 0 ? 'paid' : lineItem.bill.status } });

      return updatedLineItem;
    });
  }

  async applyWaiver(billId: string, waiverId: string) {
    return this.prisma.$transaction(async (tx) => {
      const waiver = await tx.patientWaiver.findUnique({ where: { id: waiverId }, include: { bill: true } });
      if (!waiver) throw new Error('Waiver not found');
      if (waiver.status !== 'approved') throw new Error('Only approved waivers can be applied');
      if (waiver.billId !== billId) throw new Error('Waiver does not belong to this bill');

      const bill = await tx.bill.findUnique({ where: { id: billId } });
      if (!bill) throw new Error('Bill not found');

      // ✅ FIXED: Safely parse Decimals
      const newWaiverAmount = toNumber(bill.waiverAmount) + toNumber(waiver.amountApproved);
      const newPatientPayable = toNumber(bill.patientPayable) - toNumber(waiver.amountApproved);
      const newBalance = newPatientPayable - toNumber(bill.paidAmount);

      const updated = await tx.bill.update({
        where: { id: billId },
        data: { waiverAmount: newWaiverAmount, patientPayable: newPatientPayable, balance: newBalance, status: newBalance <= 0 ? 'paid' : bill.status },
        include: { Patient: true, Attendance: true, CorporateAccount: true }
      });

      if (updated.attendanceId) {
        await tx.attendance.update({ where: { id: updated.attendanceId }, data: { outstandingBalance: { decrement: toNumber(waiver.amountApproved) } } });
      }

      return updated;
    });
  }

  // ✅ FIXED: Historical Pricing Logic
  async getServicePrice(serviceCatalogId: string, paymentMode: string, corporateAccountId?: string): Promise<number> {
    const service = await this.prisma.serviceCatalog.findUnique({
      where: { id: serviceCatalogId },
      // ✅ Only fetch the currently active pricing record
      include: { pricing: { where: { isActive: true }, take: 1, orderBy: { effectiveDate: 'desc' } } }
    });

    // ✅ pricing is now an array, get the first element
    const price = service?.pricing?.[0]; 
    if (!price) return 100; // Default fallback

    switch (paymentMode) {
      case 'cash': return toNumber(price.cashPrice);
      case 'nhis': return toNumber(price.nhisPrice);
      case 'private_insurance': return toNumber(price.insurancePrice);
      case 'corporate':
        if (toNumber(price.corporatePrice) > 0) return toNumber(price.corporatePrice);
        if (corporateAccountId) {
          const corporate = await this.prisma.corporateAccount.findUnique({ where: { id: corporateAccountId } });
          if (corporate && toNumber(corporate.discountPercentage) > 0) {
            return toNumber(price.cashPrice) * (1 - toNumber(corporate.discountPercentage) / 100);
          }
        }
        return toNumber(price.cashPrice);
      default: return toNumber(price.cashPrice);
    }
  }
}