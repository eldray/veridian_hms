import { PrismaClient, Prisma, BillStatus, PaymentMode } from '@prisma/client';
import { ValidationError } from '../../utils/errors';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { appendPaymentFinancialAudit, appendRefundFinancialAudit, appendStructuredFinancialAudit } from '../bill/financialAudit';
import { BillFilters } from './BillingTypes';
import { getCounterService } from '../../services/CounterService';
import { resolveMedicationUnitPrice, resolveUnitPrice } from '../../utils/pricing';
import { mergeTaxBreakdowns } from '../../utils/tax';
import { roundMoney, refundableAmount, billStatusAfterRefund, isValidRefundAmount } from '../../utils/refunds';
import { latestSubmissionEvent, withSubmissionDate } from '../insuranceClaim/helpers/claimSubmission';

// ✅ Helper to safely convert Prisma Decimal objects to JS numbers for math
const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;
const CLAIMS_ONLY_PAYMENT_MODES: PaymentMode[] = [PaymentMode.private_insurance, PaymentMode.corporate];

/**
 * The bill shape the cashbook needs to allocate money to the services it bought.
 * Shared by payment and refund rows so a reversal lands on the same lines the
 * original collection did.
 */
const COLLECTION_BILL_SELECT = {
  id: true,
  billNumber: true,
  Patient: { select: { surname: true, otherNames: true, folderNumber: true } },
  // A counter ticket bills a walk-in customer who is not in the patient register,
  // so the collections report has to know who paid as well as how much.
  CounterClient: { select: { name: true } },
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
      serviceCatalog: {
        select: {
          serviceCategory: true,
          subType: true,
          // A pharmacy line is a drug or a consumable depending on the stock card
          // behind it; the bill line alone cannot tell them apart.
          StockItem: { select: { isMedication: true, category: true } },
        },
      },
      // Bed days are charged by the ward itself and carry no catalog card, so the
      // ward behind the charge record is the only thing that says which one was paid for.
      wardChargeRecord: { select: { ward: { select: { wardName: true } } } },
    },
  },
} as const;

export class BillingRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'bill');
  }

  private async syncAttendanceFinancials(tx: any, attendanceId: string, fallback?: any) {
    // Operational attendance totals: totalBill is gross billed, paidAmount is actual cash collected,
    // and outstandingBalance is the remaining patient liability. Insurer claim values are separate.
    if (typeof tx.bill.aggregate !== 'function') {
      // Lightweight unit-test doubles may omit Prisma aggregate; real Prisma supports it.
      if (fallback && tx.attendance?.update && !CLAIMS_ONLY_PAYMENT_MODES.includes(fallback.paymentMode)) {
        await tx.attendance.update({ where: { id: attendanceId }, data: {
          totalBill: toNumber(fallback.totalAmount),
          paidAmount: toNumber(fallback.paidAmount),
          outstandingBalance: toNumber(fallback.balance)
        }});
      }
      return;
    }
    const totals = await tx.bill.aggregate({
      where: { attendanceId, status: { not: 'cancelled' }, paymentMode: { notIn: CLAIMS_ONLY_PAYMENT_MODES } },
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
    // Insurance and corporate attendances belong in Claims, never the operational Billing register.
    // Keep historical Bill rows in storage; exclude them from this view.
    where.paymentMode = paymentMode
      ? { in: [paymentMode], notIn: ['private_insurance', 'corporate'] }
      : { notIn: ['private_insurance', 'corporate'] };
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
        // Counter tickets bill a walk-in who is not in the register, so the queue needs a name.
        CounterClient: { select: { id: true, name: true } },
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
        CounterClient: { select: { id: true, name: true, ageYears: true, phone: true } },
        Attendance: { select: { id: true, attendanceNumber: true, attendanceType: true, encounterCategory: true, dateTime: true } },
        admission: { select: { id: true, admissionNumber: true, admissionDate: true, dischargeDate: true } },
        InsuranceProvider: { select: { id: true, name: true, type: true, coveragePercentage: true } },
        CorporateAccount: { select: { id: true, companyName: true, creditLimit: true, currentBalance: true, discountPercentage: true } },
        Payment: {
          orderBy: { transactionDate: 'desc' },
          include: { refunds: { orderBy: { refundedAt: 'asc' } } }
        },
        Refund: {
          orderBy: { refundedAt: 'desc' },
          include: { processedBy: { select: { id: true, fullName: true, username: true } } }
        },
        InsuranceClaim: {
          select: {
            id: true,
            claimNumber: true,
            status: true,
            totalClaimAmount: true,
            ...latestSubmissionEvent,
          }
        },
        BillLineItem: { where: { isVoided: false }, include: { serviceCatalog: { select: { name: true, code: true, serviceType: true } } }, orderBy: { createdAt: 'asc' } },
        User_Bill_createdByIdToUser: { select: { id: true, fullName: true, username: true } }
      }
    });
    if (!bill) return bill;
    return this.withAdmission({
      ...bill,
      InsuranceClaim: (bill.InsuranceClaim ?? []).map(withSubmissionDate),
    });
  }

  async create(data: any, items: any[]) {
    if (CLAIMS_ONLY_PAYMENT_MODES.includes(data.paymentMode)) {
      throw new ValidationError('Private Insurance and Corporate visits are Claims-only. Generate the claim from Insurance Claims; do not create a bill.');
    }
    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.findUnique({
        where: { id: data.attendanceId },
        select: { id: true, paymentMode: true, patientId: true }
      });
      if (!attendance) throw new Error('Attendance not found');
      if (CLAIMS_ONLY_PAYMENT_MODES.includes(attendance.paymentMode)) {
        throw new ValidationError('Private Insurance and Corporate attendances are Claims-only. Generate the claim from Insurance Claims; do not create a bill.');
      }
      if (attendance.paymentMode !== data.paymentMode || attendance.patientId !== data.patientId) {
        throw new ValidationError('The bill payer and patient must match the selected attendance.');
      }

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
      // Subtotal is net of tax; totalAmount includes it. Tax is charged only on the
      // patient-payable portion of each line, so insurer-covered amounts stay exempt.
      const subtotal = money(lineItems.reduce((sum, item) => sum + toNumber(item.lineTotal), 0));
      const taxAmount = money(lineItems.reduce((sum, item) => sum + toNumber(item.vatAmount), 0));
      const totalAmount = money(subtotal + taxAmount);
      let patientPayable = money(lineItems.reduce((sum, item) => sum + toNumber(item.patientPayableAmount), 0) + taxAmount);
      let insuranceCovered = money(lineItems.reduce((sum, item) => sum + toNumber(item.insuranceCoveredAmount), 0));
      const taxBreakdown = mergeTaxBreakdowns(lineItems.map((item) => item.taxBreakdown as any), String(data.paymentMode));

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
        data: { subtotal, taxAmount, totalAmount, patientPayable, balance: patientPayable, insuranceCovered, waiverAmount: 0, taxBreakdown: taxBreakdown ?? undefined },
        include: { Patient: true, Attendance: true, BillLineItem: true, CorporateAccount: true }
      });
      if (updatedBill.attendanceId) {
        await this.syncAttendanceFinancials(tx, updatedBill.attendanceId, updatedBill);
      }
      return updatedBill;
    });
  }

  async addPayment(id: string, paymentData: any) {
    const hasConfirmedIntentId = typeof paymentData.internalMomoIntentId === 'string' && paymentData.internalMomoIntentId.length > 0;
    if (paymentData.paymentMethod === 'mobile_money' && (!hasConfirmedIntentId || !paymentData.idempotencyKey)) {
      throw Object.assign(new Error('Mobile Money payments must be confirmed through the MTN MoMo workflow.'), { statusCode: 409 });
    }
    if (paymentData.paymentMethod !== 'mobile_money' && hasConfirmedIntentId) {
      throw Object.assign(new Error('A Mobile Money intent cannot be used for a manual payment.'), { statusCode: 409 });
    }
    const idempotencyKey = paymentData.idempotencyKey;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const lockedBillId = id;
        // Match MoMo initiation's row lock so pending-intent checks cannot race a collection.
        if (typeof tx.$queryRaw === 'function') {
          await tx.$queryRaw`SELECT "id" FROM "Bill" WHERE "id" = ${lockedBillId} FOR UPDATE`;
        }
        if (idempotencyKey) {
          const priorPayment = await tx.payment.findUnique({ where: { idempotencyKey } });
          if (priorPayment) {
            if (priorPayment.isVoided) {
              throw Object.assign(
                new Error('This payment was already voided. Do not report this retry as a successful collection; record a new payment only after verifying the original transaction.'),
                { statusCode: 409 },
              );
            }
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
        // Keep manual and provider-backed attempts in one idempotency namespace.
        // The bill lock above serializes this check with MoMo initiation.
        if (!paymentData.internalMomoIntentId && idempotencyKey && tx.momoPaymentIntent?.findUnique) {
          const priorMomoIntent = await tx.momoPaymentIntent.findUnique({
            where: { idempotencyKey },
            select: { id: true }
          });
          if (priorMomoIntent) {
            throw Object.assign(new Error('This payment attempt key already belongs to a Mobile Money request. Verify that request before recording another payment.'), { statusCode: 409 });
          }
        }
        if (paymentData.internalMomoIntentId) {
          const confirmedIntent = tx.momoPaymentIntent?.findFirst
            ? await tx.momoPaymentIntent.findFirst({
                where: {
                  id: paymentData.internalMomoIntentId,
                  billId: lockedBillId,
                  status: { in: ['initiating', 'pending'] }
                },
                select: { id: true }
              })
            : null;
          if (!confirmedIntent) throw Object.assign(new Error('The confirmed Mobile Money intent is no longer valid for this bill.'), { statusCode: 409 });
        } else {
          const pendingMomo = tx.momoPaymentIntent?.findFirst
            ? await tx.momoPaymentIntent.findFirst({
                where: { billId: lockedBillId, status: { in: ['initiating', 'pending'] } },
                select: { id: true }
              })
            : null;
          if (pendingMomo) throw Object.assign(new Error('A Mobile Money payment is still pending for this bill. Verify or resolve it before recording another payment.'), { statusCode: 409 });
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
        await appendPaymentFinancialAudit(tx, paymentData.userId, payment, bill, updatedBill, 'billing_repository_manual_or_confirmed_payment');
        if (current.attendanceId) await this.syncAttendanceFinancials(tx, current.attendanceId, { ...current, balance: newBalance });
        return { bill: updatedBill, payment, duplicate: false };
      });
    } catch (error: any) {
      if (idempotencyKey && error?.code === 'P2002') {
        const priorPayment = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
        if (priorPayment && priorPayment.billId !== id) {
          throw new Error('Payment request key has already been used for another bill.');
        }
        if (priorPayment?.billId === id) {
          if (priorPayment.isVoided) {
            throw Object.assign(
              new Error('This payment was already voided. Do not report this retry as a successful collection; record a new payment only after verifying the original transaction.'),
              { statusCode: 409 },
            );
          }
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

  /**
   * Hand money back against one recorded payment.
   *
   * The bill row is locked first, so a refund and a concurrent payment cannot both
   * read the same balance. The payment itself is never mutated: the refund row and
   * the reduced paid amount are the audit trail.
   */
  async createRefund(
    billId: string,
    data: { paymentId: string; amount: number; refundMethod?: string; reference?: string; reason: string; idempotencyKey?: string },
    userId: string,
  ) {
    const idempotencyKey = data.idempotencyKey?.trim();
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (typeof tx.$queryRaw === 'function') {
          await tx.$queryRaw`SELECT "id" FROM "Bill" WHERE "id" = ${billId} FOR UPDATE`;
        }

        const bill = await tx.bill.findUnique({ where: { id: billId } });
        if (!bill) throw Object.assign(new Error('Bill not found'), { statusCode: 404 });
        if (bill.status === 'cancelled') {
          throw Object.assign(new Error('Cannot refund a cancelled bill.'), { statusCode: 409 });
        }

        const payment = await tx.payment.findUnique({ where: { id: data.paymentId } });
        if (!payment || payment.billId !== billId) {
          throw Object.assign(new Error('Payment not found on this bill.'), { statusCode: 404 });
        }
        if (payment.isVoided) {
          throw Object.assign(new Error('This payment was voided and cannot be refunded.'), { statusCode: 409 });
        }

        const reason = String(data.reason || '').trim();
        if (!reason) throw Object.assign(new Error('A refund reason is required.'), { statusCode: 400 });

        const amount = roundMoney(Number(data.amount));
        const refundMethod = data.refundMethod || payment.paymentMethod;
        const reference = data.reference?.trim() || null;

        // Same-bill retries are serialized by the bill lock. A cross-bill retry
        // is resolved by the unique-key handler below after the losing tx rolls back.
        if (idempotencyKey) {
          const priorRefund = await tx.refund.findUnique({ where: { idempotencyKey } });
          if (priorRefund) {
            const sameRequest =
              priorRefund.billId === billId &&
              priorRefund.paymentId === payment.id &&
              Math.round(toNumber(priorRefund.amount) * 100) === Math.round(amount * 100) &&
              priorRefund.refundMethod === refundMethod &&
              (priorRefund.reference || null) === reference &&
              priorRefund.reason === reason &&
              priorRefund.processedById === userId;
            if (!sameRequest) {
              throw Object.assign(new Error('This refund request key has already been used with different details.'), { statusCode: 409 });
            }
            return { bill, refund: priorRefund, duplicate: true };
          }
        }

        const priorRefunds = await tx.refund.findMany({
          where: { paymentId: payment.id },
          select: { amount: true },
        });
        const alreadyRefunded = priorRefunds.reduce((sum, row) => sum + toNumber(row.amount), 0);
        const refundable = refundableAmount(toNumber(payment.amount), alreadyRefunded);
        if (!isValidRefundAmount(data.amount)) {
          throw Object.assign(new Error('Refund amount must be greater than zero and use no more than two decimal places.'), { statusCode: 400 });
        }
        if (amount > refundable) {
          throw Object.assign(
            new Error(`Refund exceeds the unrefunded amount on this payment (${refundable.toFixed(2)}).`),
            { statusCode: 409 },
          );
        }

        const paidNow = toNumber(bill.paidAmount);
        if (amount > roundMoney(paidNow)) {
          throw Object.assign(
            new Error('Refund exceeds the amount currently recorded as paid on this bill.'),
            { statusCode: 409 },
          );
        }

        const refund = await tx.refund.create({
          data: {
            refundNumber: getCounterService().nextRefundNumber(),
            billId,
            paymentId: payment.id,
            amount,
            refundMethod: refundMethod as any,
            reference,
            reason,
            idempotencyKey,
            processedById: userId,
          },
        });

        const paidAfter = roundMoney(paidNow - amount);
        const balanceAfter = roundMoney(toNumber(bill.balance) + amount);
        const updated = await tx.bill.update({
          where: { id: billId },
          data: {
            paidAmount: paidAfter,
            balance: balanceAfter,
            status: billStatusAfterRefund(paidAfter, balanceAfter),
            updatedAt: new Date(),
          },
          include: {
            Patient: { select: { surname: true, otherNames: true, folderNumber: true, contact: true } },
            Attendance: { select: { attendanceNumber: true, attendanceType: true } },
            CorporateAccount: true,
          },
        });
        await appendRefundFinancialAudit(tx, userId, refund, bill, updated, 'billing_repository_refund');

        if (updated.attendanceId) {
          await this.syncAttendanceFinancials(tx, updated.attendanceId, updated);
        }

        return { bill: updated, refund };
      });
    } catch (error: any) {
      // Concurrent requests can use the same globally unique key on different
      // bills. The losing transaction rolls back; only an exact replay succeeds.
      if (idempotencyKey && error?.code === 'P2002') {
        const priorRefund = await this.prisma.refund.findUnique({ where: { idempotencyKey } });
        if (priorRefund) {
          const originalPayment = await this.prisma.payment.findUnique({
            where: { id: data.paymentId },
            select: { billId: true, paymentMethod: true },
          });
          const requestedMethod = data.refundMethod || originalPayment?.paymentMethod;
          const sameRequest =
            priorRefund.billId === billId &&
            priorRefund.paymentId === data.paymentId &&
            Math.round(toNumber(priorRefund.amount) * 100) === Math.round(roundMoney(Number(data.amount)) * 100) &&
            priorRefund.refundMethod === requestedMethod &&
            (priorRefund.reference || null) === (data.reference?.trim() || null) &&
            priorRefund.reason === String(data.reason || '').trim() &&
            priorRefund.processedById === userId &&
            originalPayment?.billId === billId;
          if (!sameRequest) {
            throw Object.assign(new Error('This refund request key has already been used with different details.'), { statusCode: 409 });
          }
          const priorBill = await this.prisma.bill.findUnique({ where: { id: billId } });
          if (priorBill) return { bill: priorBill, refund: priorRefund, duplicate: true };
        }
      }
      throw error;
    }
  }

  /**
   * Every charged line in a date window, for the revenue-lines report. The bill travels with
   * each line because it is the bill that carries the payer and the customer — the alternative
   * was a lookup per row.
   */
  async findRevenueLines(filters: {
    dateFrom: Date;
    dateTo: Date;
    paymentMode?: string;
    billStatus?: string;
    serviceType?: string;
    search?: string;
    limit: number;
  }) {
    const billWhere: any = {
      billDate: { gte: filters.dateFrom, lte: filters.dateTo },
      paymentMode: filters.paymentMode
        ? { equals: filters.paymentMode, notIn: CLAIMS_ONLY_PAYMENT_MODES }
        : { notIn: CLAIMS_ONLY_PAYMENT_MODES }
    };
    if (filters.billStatus) billWhere.status = filters.billStatus;

    const where: any = { isVoided: false, bill: billWhere };
    if (filters.serviceType) where.serviceType = filters.serviceType;
    if (filters.search) {
      const contains = { contains: filters.search, mode: 'insensitive' as const };
      where.OR = [
        { description: contains },
        { bill: { ...billWhere, billNumber: contains } },
        { bill: { ...billWhere, Patient: { surname: contains } } },
        { bill: { ...billWhere, CounterClient: { name: contains } } },
      ];
    }

    return this.prisma.billLineItem.findMany({
      where,
      select: {
        id: true,
        description: true,
        serviceType: true,
        quantity: true,
        unitPrice: true,
        discount: true,
        vatAmount: true,
        lineTotal: true,
        insuranceCoveredAmount: true,
        patientPayableAmount: true,
        pricingBasis: true,
        createdAt: true,
        serviceCatalog: { select: { serviceCategory: true } },
        bill: {
          select: {
            id: true,
            billNumber: true,
            billDate: true,
            status: true,
            paymentMode: true,
            Patient: { select: { surname: true, otherNames: true, folderNumber: true } },
            // Same reason as findCollections: a counter ticket's customer is not in the register.
            CounterClient: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit,
    });
  }

  /**
   * Every payment in the window, voided ones included: the report needs the reversals
   * alongside the collections, otherwise a cashier's takings and the breakdown of what the
   * money bought cannot be reconciled. `voidedBy` is excluded because the caller only ever
   * reports the amount and the reason.
   */
  async findCollections(dateFrom: Date, dateTo: Date) {
    return this.prisma.payment.findMany({
      where: {
        transactionDate: { gte: dateFrom, lte: dateTo },
        amount: { gt: 0 },
        Bill: { is: { paymentMode: { notIn: CLAIMS_ONLY_PAYMENT_MODES } } }
      },
      orderBy: { transactionDate: 'desc' },
      include: {
        User: { select: { id: true, fullName: true, username: true } },
        Bill: { select: COLLECTION_BILL_SELECT }
      }
    });
  }

  /**
   * Refunds in the same window, shaped like a payment so the cashbook allocator
   * can place them on the lines they reverse. `processedBy` is the cashier who
   * handed the money back.
   */
  async findRefunds(dateFrom: Date, dateTo: Date) {
    return this.prisma.refund.findMany({
      where: {
        refundedAt: { gte: dateFrom, lte: dateTo },
        bill: { is: { paymentMode: { notIn: CLAIMS_ONLY_PAYMENT_MODES } } }
      },
      orderBy: { refundedAt: 'desc' },
      include: {
        processedBy: { select: { id: true, fullName: true, username: true } },
        bill: { select: COLLECTION_BILL_SELECT },
      },
    });
  }

  async updateStatus(id: string, status: BillStatus, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      if (typeof tx.$queryRaw === 'function') {
        await tx.$queryRaw`SELECT "id" FROM "Bill" WHERE "id" = ${id} FOR UPDATE`;
      }
      const current = await tx.bill.findUnique({ where: { id } });
      if (!current) throw new Error('Bill not found');

      // Enforce financial-state invariants inside the same locked transaction;
      // the service-level check alone can race a concurrent payment request.
      if (status === 'paid' || status === 'partial') {
        throw Object.assign(
          new Error('Cannot set a bill to paid or partial directly. Record the payment so status and balance are calculated together.'),
          { statusCode: 409 },
        );
      }
      const paymentHistory = tx.payment?.findFirst
        ? await tx.payment.findFirst({ where: { billId: id }, select: { id: true } })
        : null;
      const hasPaymentHistory = toNumber(current.paidAmount) > 0 || Boolean(paymentHistory);
      if (hasPaymentHistory && current.status !== status) {
        throw Object.assign(
          new Error('Cannot change the status of a bill with recorded payments. Use the approved adjustment/refund workflow to preserve the payment audit trail.'),
          { statusCode: 409 },
        );
      }

      // Corporate account balance is the outstanding billed credit. Cancellation
      // reverses the charge; restoring a cancelled bill re-applies it atomically.
      if (current.paymentMode === 'corporate' && current.corporateAccountId && current.status !== status) {
        const amount = toNumber(current.totalAmount);
        if (current.status !== 'cancelled' && status === 'cancelled') {
          await tx.corporateAccount.update({
            where: { id: current.corporateAccountId },
            data: { currentBalance: { decrement: amount } }
          });
        } else if (current.status === 'cancelled' && status !== 'cancelled') {
          await tx.corporateAccount.update({
            where: { id: current.corporateAccountId },
            data: { currentBalance: { increment: amount } }
          });
        }
      }

      const updated = await tx.bill.update({
        where: { id },
        data: { status, updatedAt: new Date(), updatedById: userId },
        include: {
          Patient: { select: { surname: true, otherNames: true, folderNumber: true } },
          Attendance: { select: { attendanceNumber: true } },
          CorporateAccount: true
        }
      });
      if (current.attendanceId) await this.syncAttendanceFinancials(tx, current.attendanceId, updated);
      return updated;
    });
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

    const where: any = { billDate: { gte: startDate }, paymentMode: { notIn: ['private_insurance', 'corporate'] } };
    const [totalBills, totalAmount, totalPaid, totalPending, byPaymentMode, byStatus] = await Promise.all([
      this.count(where),
      this.prisma.bill.aggregate({ where, _sum: { totalAmount: true } }),
      this.prisma.bill.aggregate({ where, _sum: { paidAmount: true } }),
      this.count({ ...where, status: { in: ['pending', 'partial'] } }),
      this.prisma.bill.groupBy({ by: ['paymentMode'], where, _count: { id: true }, _sum: { totalAmount: true, paidAmount: true } }),
      this.prisma.bill.groupBy({ by: ['status'], where, _count: { id: true }, _sum: { totalAmount: true, paidAmount: true } }),
    ]);

    return {
      period: { start: startDate, end: new Date(), type: period },
      summary: {
        totalBills,
        totalAmount: toNumber(totalAmount._sum?.totalAmount), // ✅ FIXED
        totalPaid: toNumber(totalPaid._sum?.paidAmount),       // ✅ FIXED
        totalPending,
        collectionRate: totalAmount._sum?.totalAmount ? (toNumber(totalPaid._sum?.paidAmount) / toNumber(totalAmount._sum?.totalAmount)) * 100 : 0
      },
      byPaymentMode, byStatus,
      corporateSummary: { totalCorporateBills: 0, totalCorporatePaid: 0 }
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
      summary: (() => {
        const subtotal = lineItems.reduce((sum, i) => sum + toNumber(i.lineTotal), 0);
        const taxAmount = lineItems.reduce((sum, i) => sum + toNumber(i.vatAmount), 0);
        return {
          totalItems: lineItems.length,
          subtotal,
          taxAmount,
          insuranceCovered: lineItems.reduce((sum, i) => sum + toNumber(i.insuranceCoveredAmount), 0),
          patientPayable: lineItems.reduce((sum, i) => sum + toNumber(i.patientPayableAmount), 0) + taxAmount
        };
      })()
    };
  }

  async voidLineItem(lineItemId: string, userId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const lineItem = await tx.billLineItem.findUnique({ where: { id: lineItemId }, include: { bill: true } });
      if (!lineItem) throw new Error('Line item not found');
      if (lineItem.isVoided) throw new Error('Line item already voided');
      if (lineItem.bill.status === 'cancelled') {
        throw Object.assign(new Error('Cannot void a line item on a cancelled bill.'), { statusCode: 409 });
      }

      const updatedLineItem = await tx.billLineItem.update({ where: { id: lineItemId }, data: { isVoided: true, voidedAt: new Date(), voidedById: userId, voidReason: reason } });

      const activeLineItems = await tx.billLineItem.findMany({ where: { billId: lineItem.billId, isVoided: false } });
      const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
      const newSubtotal = money(activeLineItems.reduce((sum, item) => sum + toNumber(item.lineTotal), 0));
      const newTax = money(activeLineItems.reduce((sum, item) => sum + toNumber(item.vatAmount), 0));
      const newTotal = money(newSubtotal + newTax);
      const lineLiability = money(activeLineItems.reduce((sum, item) => {
        const explicitPatient = toNumber(item.patientPayableAmount);
        const explicitInsurance = toNumber(item.insuranceCoveredAmount);
        // Older cash bills predate line-level payer allocation and have zero defaults.
        // Their line total remains patient liability; do not silently erase it on void.
        const legacyCashLiability = item.pricingBasis === 'cash' && explicitPatient === 0 && explicitInsurance === 0
          ? toNumber(item.lineTotal)
          : explicitPatient;
        return sum + legacyCashLiability;
      }, 0));
      const grossPatientLiability = money(lineLiability + newTax);
      const newInsuranceCovered = money(activeLineItems.reduce((sum, item) => sum + toNumber(item.insuranceCoveredAmount), 0));
      const taxBreakdown = mergeTaxBreakdowns(activeLineItems.map((item) => item.taxBreakdown as any));
      const currentBill = await tx.bill.findUnique({ where: { id: lineItem.billId } });
      if (!currentBill) throw new Error('Bill not found');
      const newPatientPayable = Math.max(0, money(grossPatientLiability - toNumber(currentBill.waiverAmount)));
      const newBalance = Math.max(0, money(newPatientPayable - toNumber(currentBill.paidAmount)));
      const newStatus: BillStatus = newBalance <= 0 ? 'paid' : (toNumber(currentBill.paidAmount) > 0 ? 'partial' : 'pending');

      const updatedBill = await tx.bill.update({
        where: { id: lineItem.billId },
        data: {
          subtotal: newSubtotal,
          taxAmount: newTax,
          totalAmount: newTotal,
          insuranceCovered: newInsuranceCovered,
          patientPayable: newPatientPayable,
          balance: newBalance,
          status: newStatus,
          taxBreakdown: taxBreakdown ?? Prisma.DbNull,
          updatedAt: new Date()
        }
      });
      await appendStructuredFinancialAudit(
        tx, userId, 'BillLineItem', lineItem.id, 'update',
        {
          id: lineItem.id, billId: lineItem.billId, isVoided: lineItem.isVoided,
          quantity: lineItem.quantity, lineTotal: toNumber(lineItem.lineTotal),
          patientPayableAmount: toNumber(lineItem.patientPayableAmount),
          insuranceCoveredAmount: toNumber(lineItem.insuranceCoveredAmount),
        },
        {
          id: updatedLineItem.id, billId: updatedLineItem.billId, isVoided: updatedLineItem.isVoided,
          quantity: updatedLineItem.quantity, lineTotal: toNumber(updatedLineItem.lineTotal),
          patientPayableAmount: toNumber(updatedLineItem.patientPayableAmount),
          insuranceCoveredAmount: toNumber(updatedLineItem.insuranceCoveredAmount),
          voidedAt: updatedLineItem.voidedAt, voidedById: updatedLineItem.voidedById,
        },
        { source: 'billing_repository_line_item_void' },
      );
      await appendStructuredFinancialAudit(
        tx, userId, 'Bill', updatedBill.id, 'update',
        {
          subtotal: toNumber(currentBill.subtotal), taxAmount: toNumber(currentBill.taxAmount),
          totalAmount: toNumber(currentBill.totalAmount), insuranceCovered: toNumber(currentBill.insuranceCovered),
          patientPayable: toNumber(currentBill.patientPayable), waiverAmount: toNumber(currentBill.waiverAmount),
          paidAmount: toNumber(currentBill.paidAmount), balance: toNumber(currentBill.balance), status: currentBill.status,
        },
        {
          subtotal: toNumber(updatedBill.subtotal), taxAmount: toNumber(updatedBill.taxAmount),
          totalAmount: toNumber(updatedBill.totalAmount), insuranceCovered: toNumber(updatedBill.insuranceCovered),
          patientPayable: toNumber(updatedBill.patientPayable), waiverAmount: toNumber(updatedBill.waiverAmount),
          paidAmount: toNumber(updatedBill.paidAmount), balance: toNumber(updatedBill.balance), status: updatedBill.status,
        },
        { source: 'billing_repository_line_item_void' },
      );

      // Voiding a corporate charge must reverse the same amount from account
      // utilization that was added when the bill was created.
      if (currentBill.paymentMode === 'corporate' && currentBill.corporateAccountId) {
        const removedCharge = Math.max(0, toNumber(currentBill.totalAmount) - newTotal);
        if (removedCharge > 0) {
          const corporateAfter = await tx.corporateAccount.update({
            where: { id: currentBill.corporateAccountId },
            data: { currentBalance: { decrement: removedCharge } },
            select: { id: true, currentBalance: true },
          });
          await appendStructuredFinancialAudit(
            tx, userId, 'CorporateAccount', corporateAfter.id, 'update',
            { currentBalance: toNumber(corporateAfter.currentBalance) + removedCharge },
            { currentBalance: toNumber(corporateAfter.currentBalance) },
            { source: 'billing_repository_line_item_void', billId: lineItem.billId },
          );
        }
      }
      if (currentBill.attendanceId) await this.syncAttendanceFinancials(tx, currentBill.attendanceId, { ...currentBill, totalAmount: newTotal, balance: newBalance });

      return updatedLineItem;
    });
  }

  async applyWaiver(billId: string, waiverId: string, userId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const waiver = await tx.patientWaiver.findUnique({ where: { id: waiverId }, include: { bill: true } });
      if (!waiver) throw new Error('Waiver not found');
      if (waiver.status !== 'approved') throw new Error('Only approved waivers can be applied');
      if (waiver.appliedAt) throw new Error('This waiver has already been applied');
      if (waiver.billId !== billId) throw new Error('Waiver does not belong to this bill');

      // Serialize separate waiver applications against the same outstanding balance.
      if (typeof tx.$queryRaw === 'function') {
        await tx.$queryRaw`SELECT "id" FROM "Bill" WHERE "id" = ${billId} FOR UPDATE`;
      }
      const bill = await tx.bill.findUnique({ where: { id: billId } });
      if (!bill) throw new Error('Bill not found');

      const amount = toNumber(waiver.amountApproved);
      const remainingPatientLiability = Math.max(0, toNumber(bill.patientPayable) - toNumber(bill.paidAmount));
      if (!Number.isFinite(amount) || amount <= 0 || amount > remainingPatientLiability) {
        throw new Error('Approved waiver exceeds the remaining patient liability');
      }
      // Claim the waiver atomically so concurrent requests cannot apply it twice.
      const appliedAt = new Date();
      const claimed = await tx.patientWaiver.updateMany({
        where: { id: waiverId, status: 'approved', appliedAt: null },
        data: { appliedAt }
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
      await appendStructuredFinancialAudit(
        tx, userId, 'PatientWaiver', waiver.id, 'update',
        { id: waiver.id, billId, status: waiver.status, appliedAt: waiver.appliedAt, amountApproved: toNumber(waiver.amountApproved) },
        { id: waiver.id, billId, status: waiver.status, appliedAt, amountApproved: toNumber(waiver.amountApproved) },
        { source: 'billing_repository_approved_waiver_application' },
      );
      await appendStructuredFinancialAudit(
        tx, userId, 'Bill', updated.id, 'update',
        {
          waiverAmount: toNumber(bill.waiverAmount), patientPayable: toNumber(bill.patientPayable),
          paidAmount: toNumber(bill.paidAmount), balance: toNumber(bill.balance), status: bill.status,
        },
        {
          waiverAmount: toNumber(updated.waiverAmount), patientPayable: toNumber(updated.patientPayable),
          paidAmount: toNumber(updated.paidAmount), balance: toNumber(updated.balance), status: updated.status,
        },
        { source: 'billing_repository_approved_waiver_application', waiverId: waiver.id },
      );

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

    const priceOptions = {
      isNHISCovered: service?.isNHISCovered,
      isPrivateInsuranceExempted: service?.isPrivateInsuranceExempted,
      corporateDiscountPercent,
    };
    return service?.serviceType === 'medication'
      ? resolveMedicationUnitPrice(price, paymentMode, priceOptions)
      : resolveUnitPrice(price, paymentMode, priceOptions);
  }
}