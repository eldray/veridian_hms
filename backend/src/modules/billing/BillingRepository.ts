import { PrismaClient, BillStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { BillFilters } from './BillingTypes';
import { resolveUnitPrice } from '../../utils/pricing';

// ✅ Helper to safely convert Prisma Decimal objects to JS numbers for math
const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class BillingRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'bill');
  }

  private async syncAttendanceFinancials(tx: any, attendanceId: string, fallback?: any) {
    // Visit summaries aggregate all non-cancelled bills attached to this attendance.
    if (typeof tx.bill.aggregate !== 'function') {
      // Lightweight unit-test doubles may omit Prisma aggregate; real Prisma supports it.
      if (fallback && tx.attendance?.update) {
        await tx.attendance.update({ where: { id: attendanceId }, data: {
          totalBill: toNumber(fallback.totalAmount),
          paidAmount: toNumber(fallback.paidAmount),
          outstandingBalance: toNumber(fallback.balance)
        }});
      }
      return;
    }
    const totals = await tx.bill.aggregate({
      where: { attendanceId, status: { not: 'cancelled' } },
      _sum: { totalAmount: true, paidAmount: true, balance: true }
    });
    await tx.attendance.update({ where: { id: attendanceId }, data: {
      totalBill: toNumber(totals._sum.totalAmount),
      paidAmount: toNumber(totals._sum.paidAmount),
      outstandingBalance: toNumber(totals._sum.balance)
    }});
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
        admission: { select: { id: true, admissionNumber: true, admissionDate: true, dischargeDate: true } },
        InsuranceProvider: { select: { id: true, name: true, type: true } },
        CorporateAccount: { select: { id: true, companyName: true, creditLimit: true, currentBalance: true } },
        Payment: true
      }
    });

    return { bills: result.data.map(this.withAdmission), total: result.total, page: result.page, limit: result.limit };
  }

  /** Screens read `bill.Admission` and `Admission.status`; the schema relation is `admission` and has no status column. */
  private withAdmission = (bill: any) => {
    if (!bill) return bill;
    const a = bill.admission;
    return { ...bill, Admission: a ? { ...a, status: a.dischargeDate ? 'discharged' : 'active' } : null };
  };

  async findById(id: string) {
    const bill = await this.getModel().findUnique({
      where: { id },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true, paymentMode: true } },
        Attendance: { select: { id: true, attendanceNumber: true, attendanceType: true, encounterCategory: true, dateTime: true } },
        admission: { select: { id: true, admissionNumber: true, admissionDate: true, dischargeDate: true } },
        InsuranceProvider: { select: { id: true, name: true, type: true, coveragePercentage: true } },
        CorporateAccount: { select: { id: true, companyName: true, creditLimit: true, currentBalance: true, discountPercentage: true } },
        Payment: { orderBy: { transactionDate: 'desc' } },
        InsuranceClaim: { select: { id: true, claimNumber: true, status: true, totalClaimAmount: true, submissionDate: true } },
        BillLineItem: { where: { isVoided: false }, include: { serviceCatalog: { select: { name: true, code: true, serviceType: true } } }, orderBy: { createdAt: 'asc' } },
        User_Bill_createdByIdToUser: { select: { id: true, fullName: true, username: true } }
      }
    });
    return this.withAdmission(bill);
  }

  async create(data: any, items: any[]) {
    return this.prisma.$transaction(async (tx) => {
      if (data.paymentMode === 'nhis' || data.paymentMode === 'private_insurance') {
        if (!data.insuranceProviderId) throw new Error('Insurance Provider ID is required');
        const provider = await tx.insuranceProvider.findUnique({ where: { id: data.insuranceProviderId } });
        if (!provider || !provider.isActive) throw new Error('Invalid or inactive insurance provider');
        if (data.paymentMode === 'nhis' && provider.type !== 'nhis') {
          throw new Error('The selected insurance provider is not configured as an NHIS payer.');
        }
        if (data.paymentMode === 'private_insurance' && provider.type === 'nhis') {
          throw new Error('NHIS payer cannot be used for a private-insurance bill.');
        }
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

      const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
      const totalAmount = money(lineItems.reduce((sum, item) => sum + toNumber(item.lineTotal), 0));
      // The service layer records payer allocation per line. Trust those explicit
      // allocations instead of applying a blanket provider coverage percentage to
      // uncovered/exempted services that were correctly priced at the cash tariff.
      let patientPayable = money(lineItems.reduce((sum, item) => sum + toNumber(item.patientPayableAmount), 0));
      let insuranceCovered = money(lineItems.reduce((sum, item) => sum + toNumber(item.insuranceCoveredAmount), 0));

      if (data.paymentMode === 'corporate' && data.corporateAccountId) {
        const corporate = await tx.corporateAccount.findUnique({ where: { id: data.corporateAccountId } });
        if (corporate) {
          patientPayable = 0;
          insuranceCovered = 0;
          await tx.corporateAccount.update({ where: { id: data.corporateAccountId }, data: { currentBalance: { increment: totalAmount } } });
        }
      }
  
      const updatedBill = await tx.bill.update({
        where: { id: bill.id },
        data: { totalAmount, patientPayable, balance: patientPayable, subtotal: totalAmount, insuranceCovered, waiverAmount: 0 },
        include: { Patient: true, Attendance: true, BillLineItem: true, CorporateAccount: true }
      });
      if (updatedBill.attendanceId) {
        await this.syncAttendanceFinancials(tx, updatedBill.attendanceId, updatedBill);
      }
      return updatedBill;
    });
  }

  async addPayment(id: string, paymentData: any) {
    const idempotencyKey = paymentData.idempotencyKey;
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (idempotencyKey) {
          const priorPayment = await tx.payment.findUnique({ where: { idempotencyKey } });
          if (priorPayment) {
            if (priorPayment.billId !== id) throw new Error('Payment request key has already been used for another bill.');
            const requestedAmount = Math.round(toNumber(paymentData.amount) * 100) / 100;
            const priorAmount = Math.round(toNumber(priorPayment.amount) * 100) / 100;
            const requestedReference = paymentData.reference || null;
            const priorReference = priorPayment.reference || null;
            if (priorAmount !== requestedAmount || priorPayment.paymentMethod !== paymentData.paymentMethod || priorReference !== requestedReference) {
              throw new Error('Payment idempotency key was already used with different payment details.');
            }
            const priorBill = await tx.bill.findUnique({ where: { id } });
            return { bill: priorBill, payment: priorPayment, duplicate: true };
          }
        }
        const bill = await tx.bill.findUnique({ where: { id } });
        if (!bill) throw new Error('Bill not found');
        const amount = Math.round(toNumber(paymentData.amount) * 100) / 100;
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('Payment amount must be greater than zero.');
        const changed = await tx.bill.updateMany({
          where: { id, balance: { gte: amount }, status: { not: 'cancelled' } },
          data: { paidAmount: { increment: amount }, balance: { decrement: amount } }
        });
        if (changed.count !== 1) {
          const latest = await tx.bill.findUnique({ where: { id }, select: { balance: true, status: true } });
          throw new Error(latest?.status === 'cancelled' ? 'Cannot accept payment against a cancelled bill.' : `Payment exceeds the patient's outstanding balance (${Math.max(0, toNumber(latest?.balance)).toFixed(2)}). Refresh the bill and try again.`);
        }
        const current = await tx.bill.findUnique({ where: { id } });
        if (!current) throw new Error('Bill not found');
        const newBalance = Math.max(0, toNumber(current.balance));
        const updatedBill = await tx.bill.update({
          where: { id }, data: { status: newBalance <= 0 ? 'paid' : 'partial', updatedAt: new Date() },
          include: { Patient: { select: { surname: true, otherNames: true, folderNumber: true, contact: true } }, Attendance: { select: { attendanceNumber: true, attendanceType: true } }, CorporateAccount: true }
        });
        const payment = await tx.payment.create({
          data: { billId: id, amount, paymentMethod: paymentData.paymentMethod, reference: paymentData.reference || null, idempotencyKey, receivedById: paymentData.userId, notes: paymentData.notes, transactionDate: new Date() }
        });
        if (current.attendanceId) await this.syncAttendanceFinancials(tx, current.attendanceId, { ...current, balance: newBalance });
        return { bill: updatedBill, payment, duplicate: false };
      });
    } catch (error: any) {
      if (idempotencyKey && error?.code === 'P2002') {
        const priorPayment = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
        if (priorPayment?.billId === id) {
          const requestedAmount = Math.round(toNumber(paymentData.amount) * 100) / 100;
          const priorAmount = Math.round(toNumber(priorPayment.amount) * 100) / 100;
          const requestedReference = paymentData.reference || null;
          const priorReference = priorPayment.reference || null;
          if (priorAmount !== requestedAmount || priorPayment.paymentMethod !== paymentData.paymentMethod || priorReference !== requestedReference) {
            throw new Error('Payment idempotency key was already used with different payment details.');
          }
          const priorBill = await this.prisma.bill.findUnique({ where: { id } });
          if (priorBill) return { bill: priorBill, payment: priorPayment, duplicate: true };
        }
      }
      throw error;
    }
  }

  async findCollections(dateFrom: Date, dateTo: Date) {
    return this.prisma.payment.findMany({
      where: {
        transactionDate: { gte: dateFrom, lte: dateTo },
        isVoided: false,
        amount: { gt: 0 }
      },
      orderBy: { transactionDate: 'desc' },
      include: {
        User: { select: { id: true, fullName: true, username: true } },
        Bill: {
          select: {
            id: true,
            billNumber: true,
            Patient: { select: { surname: true, otherNames: true, folderNumber: true } },
            BillLineItem: {
              where: { isVoided: false },
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                description: true,
                quantity: true,
                lineTotal: true,
                patientPayableAmount: true,
                serviceType: true,
                serviceCatalog: { select: { serviceCategory: true } }
              }
            }
          }
        }
      }
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
      const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
      const newTotal = money(activeLineItems.reduce((sum, item) => sum + toNumber(item.lineTotal), 0));
      const grossPatientLiability = money(activeLineItems.reduce((sum, item) => {
        const explicitPatient = toNumber(item.patientPayableAmount);
        const explicitInsurance = toNumber(item.insuranceCoveredAmount);
        // Older cash bills predate line-level payer allocation and have zero defaults.
        // Their line total remains patient liability; do not silently erase it on void.
        const legacyCashLiability = item.pricingBasis === 'cash' && explicitPatient === 0 && explicitInsurance === 0
          ? toNumber(item.lineTotal)
          : explicitPatient;
        return sum + legacyCashLiability;
      }, 0));
      const newInsuranceCovered = money(activeLineItems.reduce((sum, item) => sum + toNumber(item.insuranceCoveredAmount), 0));
      const currentBill = await tx.bill.findUnique({ where: { id: lineItem.billId } });
      if (!currentBill) throw new Error('Bill not found');
      const newPatientPayable = Math.max(0, money(grossPatientLiability - toNumber(currentBill.waiverAmount)));
      const newBalance = Math.max(0, money(newPatientPayable - toNumber(currentBill.paidAmount)));
      const newStatus: BillStatus = newBalance <= 0 ? 'paid' : (toNumber(currentBill.paidAmount) > 0 ? 'partial' : 'pending');

      await tx.bill.update({
        where: { id: lineItem.billId },
        data: {
          subtotal: newTotal,
          totalAmount: newTotal,
          insuranceCovered: newInsuranceCovered,
          patientPayable: newPatientPayable,
          balance: newBalance,
          status: newStatus,
          updatedAt: new Date()
        }
      });
      if (currentBill.attendanceId) await this.syncAttendanceFinancials(tx, currentBill.attendanceId, { ...currentBill, totalAmount: newTotal, balance: newBalance });

      return updatedLineItem;
    });
  }

  async applyWaiver(billId: string, waiverId: string) {
    return this.prisma.$transaction(async (tx) => {
      const waiver = await tx.patientWaiver.findUnique({ where: { id: waiverId }, include: { bill: true } });
      if (!waiver) throw new Error('Waiver not found');
      if (waiver.status !== 'approved') throw new Error('Only approved waivers can be applied');
      if (waiver.appliedAt) throw new Error('This waiver has already been applied');
      if (waiver.billId !== billId) throw new Error('Waiver does not belong to this bill');

      const bill = await tx.bill.findUnique({ where: { id: billId } });
      if (!bill) throw new Error('Bill not found');

      const amount = toNumber(waiver.amountApproved);
      const remainingPatientLiability = Math.max(0, toNumber(bill.patientPayable) - toNumber(bill.paidAmount));
      if (!Number.isFinite(amount) || amount <= 0 || amount > remainingPatientLiability) {
        throw new Error('Approved waiver exceeds the remaining patient liability');
      }
      // Claim the waiver atomically so concurrent requests cannot apply it twice.
      const claimed = await tx.patientWaiver.updateMany({
        where: { id: waiverId, status: 'approved', appliedAt: null },
        data: { appliedAt: new Date() }
      });
      if (claimed.count !== 1) throw new Error('This waiver has already been applied');

      const newWaiverAmount = toNumber(bill.waiverAmount) + amount;
      const newPatientPayable = Math.max(0, toNumber(bill.patientPayable) - amount);
      const newBalance = Math.max(0, newPatientPayable - toNumber(bill.paidAmount));

      const updated = await tx.bill.update({
        where: { id: billId },
        data: { waiverAmount: newWaiverAmount, patientPayable: newPatientPayable, balance: newBalance, status: newBalance <= 0 ? 'paid' : (toNumber(bill.paidAmount) > 0 ? 'partial' : 'pending') },
        include: { Patient: true, Attendance: true, CorporateAccount: true }
      });

      if (updated.attendanceId) await this.syncAttendanceFinancials(tx, updated.attendanceId, { ...updated, balance: newBalance });

      return updated;
    });
  }

  // ✅ FIXED: Historical Pricing Logic
  async getServicePrice(serviceCatalogId: string, paymentMode: string, corporateAccountId?: string, serviceDate?: Date): Promise<number> {
    const pricingWhere: any = { isActive: true };
    if (serviceDate) {
      pricingWhere.effectiveDate = { lte: serviceDate };
      pricingWhere.OR = [{ expiryDate: null }, { expiryDate: { gt: serviceDate } }];
    }
    const service = await this.prisma.serviceCatalog.findUnique({
      where: { id: serviceCatalogId },
      // Use the tariff effective when care was delivered, not a future/current tariff.
      include: { pricing: { where: pricingWhere, take: 1, orderBy: { effectiveDate: 'desc' } } }
    });

    // ✅ pricing is now an array, get the first element
    const price = service?.pricing?.[0]; 
    if (!price) throw new Error(`No active pricing is configured for service ${serviceCatalogId} on ${serviceDate ? serviceDate.toISOString().slice(0, 10) : 'the selected service date'}.`);

    // Same rules everywhere (utils/pricing.ts): uncovered NHIS / exempted insurance / missing corporate price fall back to cash
    let corporateDiscountPercent = 0;
    if (paymentMode === 'corporate' && toNumber(price.corporatePrice) <= 0 && corporateAccountId) {
      const corporate = await this.prisma.corporateAccount.findUnique({ where: { id: corporateAccountId } });
      corporateDiscountPercent = toNumber(corporate?.discountPercentage);
    }

    return resolveUnitPrice(price, paymentMode, {
      isNHISCovered: service?.isNHISCovered,
      isPrivateInsuranceExempted: service?.isPrivateInsuranceExempted,
      corporateDiscountPercent
    });
  }
}