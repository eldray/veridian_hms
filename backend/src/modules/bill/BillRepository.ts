import { ValidationError, NotFoundError } from '../../utils/errors';
import { PrismaClient, BillStatus, PaymentMethod, PaymentMode, ServiceType } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { BillFilter, CreateBillInput, UpdateBillInput, AddPaymentInput } from './BillTypes';
import { getCounterService } from '../../services/CounterService';
import { calculateNHISMedicineAllocation, isPayerCovered, resolveConfiguredNHISTariff, resolveUnitPrice } from '../../utils/pricing';
import { approvedServicesCoverPrescription } from '../encounter/NHISPreAuthorisation';

// ✅ Helper to safely convert Prisma Decimal objects to JS numbers for math
const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class BillRepository extends BaseRepository<any, any, any> {
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

  async findAll(filters: BillFilter) {
    const { patientId, counterClientId, status, paymentMode, dateFrom, dateTo, attendanceId, page = 1, limit = 1000 } = filters;
    const where: any = {};

    if (patientId) where.patientId = patientId;
    if (counterClientId) where.counterClientId = counterClientId;
    if (attendanceId) where.attendanceId = attendanceId;
    if (status) where.status = Array.isArray(status) ? { in: status } : status;
    if (paymentMode) where.paymentMode = paymentMode;
    if (dateFrom || dateTo) {
      where.billDate = {};
      if (dateFrom) where.billDate.gte = dateFrom;
      if (dateTo) where.billDate.lte = dateTo;
    }

    return this.findManyWithPagination({
      where, page, limit: Math.min(limit, 1000), orderBy: { billDate: 'desc' },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
        CounterClient: { select: { id: true, name: true, ageYears: true, phone: true } },
        Attendance: { select: { id: true, attendanceNumber: true, attendanceType: true, dateTime: true } },
        BillLineItem: { where: { isVoided: false }, include: { serviceCatalog: { select: { id: true, name: true, code: true, serviceType: true } } } },
        Payment: true
      }
    }).then(res => ({ bills: res.data, total: res.total, page: res.page, limit: res.limit }));
  }

  async findById(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true } },
        CounterClient: { select: { id: true, name: true, ageYears: true, phone: true } },
        Attendance: { select: { id: true, attendanceNumber: true, attendanceType: true, dateTime: true } },
        BillLineItem: { where: { isVoided: false }, include: { serviceCatalog: { select: { id: true, name: true, code: true, serviceType: true } } } },
        InsuranceProvider: { select: { id: true, name: true, type: true, coveragePercentage: true } },
        Payment: true
      }
    });
  }

  async create(data: CreateBillInput, createdBy: string) {
    const { patientId, counterClientId, attendanceId, paymentMode = 'cash', items } = data;

    // A bill belongs to a visit: attendanceId is a required column
    if (!attendanceId) throw new ValidationError('A bill must be created for a visit (attendanceId is required)');
    // A bill is addressed to exactly one identity: a registered patient or a counter customer.
    if (Boolean(patientId) === Boolean(counterClientId)) {
      throw new ValidationError('A bill must be for either a registered patient or a counter customer, not both');
    }

    return this.prisma.$transaction(async (tx) => {
      // Each line needs the service's name and type (required columns): read them from the catalog
      const catalogIds = Array.from(new Set(items.map((i) => i.serviceCatalogId).filter(Boolean)));
      const catalog = await tx.serviceCatalog.findMany({
        where: { id: { in: catalogIds as string[] } },
        select: { id: true, name: true, serviceType: true }
      });
      const catalogById = new Map(catalog.map((c) => [c.id, c]));

      const bill = await tx.bill.create({
        data: {
          patientId, counterClientId, attendanceId, paymentMode,
          billNumber: getCounterService().nextBillNumber(), // ✅ FIXED: Uses CounterService instead of Math.random()
          status: 'pending', totalAmount: 0, paidAmount: 0, balance: 0, patientPayable: 0,
          insuranceCovered: 0, waiverAmount: 0, discount: 0, createdById: createdBy, billDate: new Date(),
          BillLineItem: {
            create: items.map(item => {
              const service = catalogById.get(item.serviceCatalogId);
              if (!service) throw new NotFoundError('Service', item.serviceCatalogId);
              return {
              serviceCatalogId: item.serviceCatalogId, description: service.name, serviceType: service.serviceType,
              pricingBasis: paymentMode, quantity: item.quantity, unitPrice: item.unitPrice,
              lineTotal: item.quantity * item.unitPrice, insuranceCoveredAmount: 0,
              patientPayableAmount: item.quantity * item.unitPrice, discount: 0, isVoided: false
              };
            })
          }
        },
        include: { BillLineItem: true, Patient: true, CounterClient: true }
      });

      // ✅ FIXED: Safely parse Prisma Decimals to numbers for JS math
      const totalAmount = bill.BillLineItem.reduce((sum, item) => sum + toNumber(item.lineTotal), 0);

      const updatedBill = await tx.bill.update({
        where: { id: bill.id },
        data: { totalAmount, patientPayable: totalAmount, balance: totalAmount },
        include: { BillLineItem: true, Patient: true, CounterClient: true }
      });
      await this.syncAttendanceFinancials(tx, attendanceId, updatedBill);
      return updatedBill;
    });
  }

  async update(id: string, data: UpdateBillInput) {
    return this.getModel().update({ where: { id }, data, include: { BillLineItem: true, Patient: true, CounterClient: true } });
  }

  async delete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      if (typeof tx.$queryRaw === 'function') {
        await tx.$queryRaw`SELECT "id" FROM "Bill" WHERE "id" = ${id} FOR UPDATE`;
      }
      const bill = await tx.bill.findUnique({
        where: { id },
        include: { Payment: { select: { id: true } }, InsuranceClaim: { select: { id: true } }, PatientWaiver: { select: { id: true, appliedAt: true } } }
      });
      if (!bill) throw new Error('Bill not found');
      if ((bill.Payment?.length ?? 0) > 0) {
        throw new Error('A bill with payment history cannot be deleted. Preserve the audit trail and use the approved cancellation or adjustment workflow.');
      }
      if ((bill.InsuranceClaim?.length ?? 0) > 0) {
        throw new Error('A bill linked to an insurance claim cannot be deleted. Preserve the claim audit trail and use the approved adjustment workflow.');
      }
      if ((bill.PatientWaiver?.length ?? 0) > 0) {
        throw new Error('A bill linked to a patient waiver cannot be deleted. Preserve the waiver audit trail and use the approved adjustment workflow.');
      }

      // Corporate currentBalance tracks outstanding billed credit. Reverse the
      // original charge only if it was never already reversed by cancellation.
      if (bill.paymentMode === 'corporate' && bill.corporateAccountId && bill.status !== 'cancelled') {
        await tx.corporateAccount.update({
          where: { id: bill.corporateAccountId },
          data: { currentBalance: { decrement: toNumber(bill.totalAmount) } }
        });
      }

      const deleted = await tx.bill.delete({ where: { id } });
      if (bill.attendanceId) await this.syncAttendanceFinancials(tx, bill.attendanceId);
      return deleted;
    });
  }

  async addPayment(billId: string, paymentData: AddPaymentInput, receivedById: string) {
    const idempotencyKey = paymentData.idempotencyKey;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const lockedBillId = billId;
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
            if (priorPayment.billId !== billId) throw new ValidationError('Payment request key has already been used for another bill.');
            const requestedAmount = Math.round(Number(paymentData.amount) * 100) / 100;
            const priorAmount = Math.round(toNumber(priorPayment.amount) * 100) / 100;
            const requestedReference = paymentData.reference || null;
            const priorReference = priorPayment.reference || null;
            if (priorAmount !== requestedAmount || priorPayment.paymentMethod !== paymentData.paymentMethod || priorReference !== requestedReference) {
              throw new ValidationError('Payment idempotency key was already used with different payment details.');
            }
            const priorBill = await tx.bill.findUnique({ where: { id: billId } });
            if (!priorBill) throw new Error('Bill not found');
            return { bill: priorBill, payment: priorPayment, duplicate: true };
          }
        }
        const pendingMomo = tx.momoPaymentIntent?.findFirst
          ? await tx.momoPaymentIntent.findFirst({
              where: { billId: lockedBillId, status: { in: ['initiating', 'pending'] } },
              select: { id: true }
            })
          : null;
        if (pendingMomo) throw Object.assign(new Error('A Mobile Money payment is still pending for this bill. Verify or resolve it before recording another payment.'), { statusCode: 409 });
        const bill = await tx.bill.findUnique({ where: { id: billId } });
        if (!bill) throw new Error('Bill not found');
        const amount = Math.round(Number(paymentData.amount) * 100) / 100;
        if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('Payment amount must be greater than zero.');

        const balanceUpdate = await tx.bill.updateMany({
          where: { id: billId, balance: { gte: amount }, status: { not: 'cancelled' } },
          data: { paidAmount: { increment: amount }, balance: { decrement: amount } }
        });
        if (balanceUpdate.count !== 1) {
          const latestBill = await tx.bill.findUnique({ where: { id: billId }, select: { balance: true, status: true } });
          const latestBalance = Math.max(0, toNumber(latestBill?.balance));
          throw new ValidationError(latestBill?.status === 'cancelled'
            ? 'Cannot accept payment against a cancelled bill.'
            : `Payment exceeds the patient's outstanding balance (${latestBalance.toFixed(2)}). Refresh the bill and try again.`);
        }
        const currentBill = await tx.bill.findUnique({ where: { id: billId } });
        if (!currentBill) throw new Error('Bill not found');
        const newBalance = Math.max(0, toNumber(currentBill.balance));
        const updatedBill = await tx.bill.update({ where: { id: billId }, data: { status: newBalance <= 0 ? 'paid' : 'partial' } });
        const payment = await tx.payment.create({
          data: {
            billId, amount, paymentMethod: paymentData.paymentMethod as PaymentMethod,
            reference: paymentData.reference || null, idempotencyKey, notes: paymentData.notes,
            receivedById, transactionDate: new Date()
          }
        });
        if (currentBill.attendanceId) await this.syncAttendanceFinancials(tx, currentBill.attendanceId, { ...currentBill, balance: newBalance });
        return { bill: updatedBill, payment, duplicate: false };
      });
    } catch (error: any) {
      if (idempotencyKey && error?.code === 'P2002') {
        const priorPayment = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
        if (priorPayment && priorPayment.billId !== billId) {
          throw new ValidationError('Payment request key has already been used for another bill.');
        }
        if (priorPayment?.billId === billId) {
          if (priorPayment.isVoided) {
            throw Object.assign(
              new Error('This payment was already voided. Do not report this retry as a successful collection; record a new payment only after verifying the original transaction.'),
              { statusCode: 409 },
            );
          }
          const requestedAmount = Math.round(Number(paymentData.amount) * 100) / 100;
          const priorAmount = Math.round(toNumber(priorPayment.amount) * 100) / 100;
          const requestedReference = paymentData.reference || null;
          const priorReference = priorPayment.reference || null;
          if (priorAmount !== requestedAmount || priorPayment.paymentMethod !== paymentData.paymentMethod || priorReference !== requestedReference) {
            throw new ValidationError('Payment idempotency key was already used with different payment details.');
          }
          const priorBill = await this.prisma.bill.findUnique({ where: { id: billId } });
          if (priorBill) return { bill: priorBill, payment: priorPayment, duplicate: true };
        }
      }
      throw error;
    }
  }

  async voidLineItem(lineItemId: string, userId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const lineItem = await tx.billLineItem.findUnique({ where: { id: lineItemId }, include: { bill: true } });
      if (!lineItem) throw new Error('Line item not found');
      if (lineItem.isVoided) throw new Error('Line item already voided');
      if (lineItem.bill.status === 'cancelled') {
        throw Object.assign(new Error('Cannot void a line item on a cancelled bill.'), { statusCode: 409 });
      }

      const updatedLineItem = await tx.billLineItem.update({
        where: { id: lineItemId },
        data: { isVoided: true, voidReason: reason, voidedAt: new Date(), voidedById: userId }
      });

      const activeLineItems = await tx.billLineItem.findMany({ where: { billId: lineItem.billId, isVoided: false } });

      // ✅ FIXED: Safely parse Decimals
      const newTotal = activeLineItems.reduce((sum, item) => sum + toNumber(item.lineTotal), 0);
      const grossPatientLiability = activeLineItems.reduce((sum, item) => {
        const explicitPatient = toNumber(item.patientPayableAmount);
        const explicitInsurance = toNumber(item.insuranceCoveredAmount);
        // Older cash bills predate line-level payer allocation and have zero defaults.
        const legacyCashLiability = item.pricingBasis === 'cash' && explicitPatient === 0 && explicitInsurance === 0
          ? toNumber(item.lineTotal)
          : explicitPatient;
        return sum + legacyCashLiability;
      }, 0);
      const newInsuranceCovered = activeLineItems.reduce((sum, item) => sum + toNumber(item.insuranceCoveredAmount), 0);
      const bill = await tx.bill.findUnique({ where: { id: lineItem.billId } });
      // patientPayable already reflects approved waivers; recompute it from active lines
      // so voiding a line cannot accidentally restore liability that was previously waived.
      const newPatientPayable = Math.max(0, grossPatientLiability - toNumber(bill?.waiverAmount || 0));
      const recordedPayments = toNumber(bill?.paidAmount || 0);

      // Voiding a charge must not silently turn a legitimate collection into an
      // overpayment. Refund/credit handling needs its own auditable workflow.
      if (recordedPayments > newPatientPayable) {
        throw Object.assign(
          new Error('This line item cannot be voided because recorded payments would exceed the revised patient liability. Process an approved refund or credit adjustment first.'),
          { statusCode: 409 },
        );
      }

      const newBalance = Math.max(0, newPatientPayable - recordedPayments);

      await tx.bill.update({
        where: { id: lineItem.billId },
        data: {
          subtotal: newTotal,
          totalAmount: newTotal,
          insuranceCovered: newInsuranceCovered,
          patientPayable: newPatientPayable,
          balance: newBalance,
          status: newBalance <= 0 ? 'paid' : (toNumber(bill?.paidAmount || 0) > 0 ? 'partial' : 'pending')
        }
      });

      if (bill?.paymentMode === 'corporate' && bill.corporateAccountId) {
        const removedCharge = Math.max(0, toNumber(bill.totalAmount) - newTotal);
        if (removedCharge > 0) {
          await tx.corporateAccount.update({
            where: { id: bill.corporateAccountId },
            data: { currentBalance: { decrement: removedCharge } }
          });
        }
      }
      if (bill?.attendanceId) await this.syncAttendanceFinancials(tx, bill.attendanceId, { ...bill, totalAmount: newTotal, balance: newBalance });

      return { lineItem: updatedLineItem, billId: lineItem.billId };
    });
  }

  async getStatistics(dateFrom?: Date, dateTo?: Date) {
    const startDate = dateFrom || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = dateTo || new Date();
    const where = { billDate: { gte: startDate, lte: endDate } };

    const [totalBills, totalAmount, totalPaid, totalPending, byPaymentMode, byStatus] = await Promise.all([
      this.count(where),
      this.prisma.bill.aggregate({ where, _sum: { totalAmount: true } }),
      this.prisma.bill.aggregate({ where, _sum: { paidAmount: true } }),
      this.count({ ...where, status: { in: ['pending', 'partial'] } }),
      this.prisma.bill.groupBy({ by: ['paymentMode'], where, _count: { id: true }, _sum: { totalAmount: true, paidAmount: true } }),
      this.prisma.bill.groupBy({ by: ['status'], where, _count: { id: true }, _sum: { totalAmount: true, paidAmount: true } })
    ]);

    return {
      period: { start: startDate, end: endDate, type: 'custom' },
      summary: {
        totalBills,
        totalAmount: toNumber(totalAmount._sum.totalAmount), // ✅ FIXED: Parse Decimal
        totalPaid: toNumber(totalPaid._sum.paidAmount),       // ✅ FIXED: Parse Decimal
        totalPending,
        collectionRate: totalAmount._sum.totalAmount ? (toNumber(totalPaid._sum.paidAmount) / toNumber(totalAmount._sum.totalAmount)) * 100 : 0
      },
      byPaymentMode, byStatus
    };
  }

  async getLineItems(billId: string) {
    return this.prisma.billLineItem.findMany({
      where: { billId, isVoided: false },
      include: { serviceCatalog: { select: { name: true, code: true, serviceType: true } } },
      orderBy: { createdAt: 'asc' }
    });
  }

  async applyWaiver(billId: string, waiverId: string) {
    return this.prisma.$transaction(async (tx) => {
      const waiver = await tx.patientWaiver.findUnique({ where: { id: waiverId }, include: { bill: true } });
      if (!waiver) throw new Error('Waiver not found');
      if (waiver.status !== 'approved') throw new ValidationError('Only approved waivers can be applied');
      if (waiver.appliedAt) throw new ValidationError('This waiver has already been applied');
      if (waiver.billId !== billId) throw new ValidationError('Waiver does not belong to this bill');

      // Serialize waiver applications for a bill so concurrent approvals cannot
      // overwrite one another's updated waiver total or patient balance.
      if (typeof tx.$queryRaw === 'function') {
        await tx.$queryRaw`SELECT "id" FROM "Bill" WHERE "id" = ${billId} FOR UPDATE`;
      }
      const bill = await tx.bill.findUnique({ where: { id: billId } });
      if (!bill) throw new Error('Bill not found');

      const waiverAmount = toNumber(waiver.amountApproved);
      const remainingPatientLiability = Math.max(0, toNumber(bill.patientPayable) - toNumber(bill.paidAmount));
      if (!Number.isFinite(waiverAmount) || waiverAmount <= 0 || waiverAmount > remainingPatientLiability) {
        throw new ValidationError('Approved waiver exceeds the remaining patient liability');
      }
      const claimed = await tx.patientWaiver.updateMany({
        where: { id: waiverId, status: 'approved', appliedAt: null },
        data: { appliedAt: new Date() }
      });
      if (claimed.count !== 1) throw new ValidationError('This waiver has already been applied');

      const newWaiverAmount = toNumber(bill.waiverAmount) + waiverAmount;
      const newPatientPayable = Math.max(0, toNumber(bill.patientPayable) - waiverAmount);
      const newBalance = Math.max(0, newPatientPayable - toNumber(bill.paidAmount));

      const updatedBill = await tx.bill.update({
        where: { id: billId },
        data: { waiverAmount: newWaiverAmount, patientPayable: newPatientPayable, balance: newBalance, status: newBalance <= 0 ? 'paid' : (toNumber(bill.paidAmount) > 0 ? 'partial' : 'pending') }
      });

      if (bill.attendanceId) await this.syncAttendanceFinancials(tx, bill.attendanceId, { ...bill, balance: newBalance });

      return updatedBill;
    });
  }

  // ✅ Builds a grouped/summary breakdown for a bill, matching the frontend BillingBreakdown type.
  async getBreakdown(billId: string) {
    const bill = await this.getModel().findUnique({
      where: { id: billId },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
        CounterClient: { select: { id: true, name: true, ageYears: true, phone: true } },
        Attendance: { select: { id: true, attendanceNumber: true, attendanceType: true } },
        BillLineItem: {
          where: { isVoided: false },
          include: { serviceCatalog: { select: { id: true, name: true, code: true, serviceType: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (!bill) throw new Error('Bill not found');

    const lineItems: any[] = bill.BillLineItem || [];

    // Flat items list — shape consumed by the frontend (description + totalPrice).
    const items = lineItems.map((li) => ({
      id: li.id,
      billId: li.billId,
      serviceId: li.serviceCatalogId ?? undefined,
      serviceName: li.description,
      description: li.description,
      serviceType: li.serviceType,
      quantity: li.quantity,
      unitPrice: toNumber(li.unitPrice),
      totalPrice: toNumber(li.lineTotal),
      lineTotal: toNumber(li.lineTotal),
      status: li.isVoided ? 'VOID' : 'ACTIVE',
      createdAt: li.createdAt
    }));

    // Group line items by serviceType with subtotals.
    const groupMap = new Map<string, { serviceType: string; items: any[]; subtotal: number; count: number }>();
    for (const item of items) {
      const key = item.serviceType as string;
      if (!groupMap.has(key)) groupMap.set(key, { serviceType: key, items: [], subtotal: 0, count: 0 });
      const group = groupMap.get(key)!;
      group.items.push(item);
      group.subtotal += item.totalPrice;
      group.count += 1;
    }
    const groups = Array.from(groupMap.values());

    const subtotal = toNumber(bill.subtotal) || items.reduce((sum, i) => sum + i.totalPrice, 0);
    const discount = toNumber(bill.discount);
    const tax = toNumber(bill.taxAmount);
    const total = toNumber(bill.totalAmount);
    const paid = toNumber(bill.paidAmount);
    const balance = toNumber(bill.balance);

    return {
      billId: bill.id,
      billNumber: bill.billNumber,
      status: bill.status,
      patient: bill.Patient,
      // A counter bill has no Patient row; the customer's name lives here instead.
      counterClient: bill.CounterClient ?? null,
      attendance: bill.Attendance,
      // Flat fields matching the BillingBreakdown type the frontend expects.
      subtotal,
      tax,
      discount,
      total,
      paid,
      balance,
      items,
      // Grouped breakdown by serviceType with subtotals.
      groups
    };
  }

  // ✅ Generates a Bill from an attendance's billable items (ServiceRendered, LabTest, Scan, Procedure, Medication).
  async generateFromEncounter(encounterId: string, createdBy: string) {
    return this.prisma.$transaction(async (tx) => {
      const attendanceDate = await tx.attendance.findUnique({
        where: { id: encounterId },
        select: { dateTime: true }
      });
      if (!attendanceDate) throw new Error('Encounter not found');
      // Bill from the tariff effective when this encounter occurred, not a future
      // or expired tariff that happens to be marked active today.
      const serviceDate = attendanceDate.dateTime;
      const activePricing = {
        pricing: {
          where: {
            isActive: true,
            effectiveDate: { lte: serviceDate },
            OR: [{ expiryDate: null }, { expiryDate: { gt: serviceDate } }]
          },
          take: 1,
          orderBy: { effectiveDate: 'desc' as const }
        }
      };
      const attendance = await tx.attendance.findUnique({
        where: { id: encounterId },
        include: {
          ServiceRendered: { include: { ServiceCatalog: { include: activePricing } } },
          LabTest: { where: { status: 'completed' }, include: { ServiceCatalog: { include: activePricing }, LabTestTemplate: true } },
          Scan: { where: { status: 'completed' }, include: { ServiceCatalog: { include: activePricing } } },
          Procedure: { where: { status: 'completed' }, include: { ServiceCatalog: { include: activePricing } } },
          Medication: { where: { status: { in: ['dispensed', 'administered'] } }, include: { ServiceCatalog: { include: activePricing } } },
          WardChargeRecord: { where: { isBilled: false } }
        }
      });
      if (!attendance) throw new Error('Encounter not found');

      // One bill per attendance. Existing bills are incrementally synchronized below.
      const existingBill = await tx.bill.findUnique({ where: { attendanceId: encounterId } });

      const paymentMode: PaymentMode = attendance.paymentMode;
      const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
      const payerProvider = (paymentMode === 'nhis' || paymentMode === 'private_insurance') && attendance.insuranceProviderId
        ? await tx.insuranceProvider.findUnique({
            where: { id: attendance.insuranceProviderId },
            select: { coveragePercentage: true }
          })
        : null;
      const coverageRate = Math.min(100, Math.max(0, Number(payerProvider?.coveragePercentage) || 0)) / 100;

      // Corporate patients with no corporate price get their account's discount off the cash price.
      let corporateDiscountPercent = 0;
      if (paymentMode === 'corporate' && attendance.corporateAccountId) {
        const account = await tx.corporateAccount.findUnique({ where: { id: attendance.corporateAccountId }, select: { discountPercentage: true } });
        corporateDiscountPercent = toNumber(account?.discountPercentage);
      }

      const priceFor = (catalog: any, qty: number): { unitPrice: number; lineTotal: number } => {
        const price = catalog?.pricing?.[0];
        const unitPrice = price
          ? resolveUnitPrice(price, paymentMode, {
              isNHISCovered: catalog?.isNHISCovered,
              isPrivateInsuranceExempted: catalog?.isPrivateInsuranceExempted,
              corporateDiscountPercent
            })
          : 0;
        return { unitPrice, lineTotal: unitPrice * qty };
      };

      const lineItemsData: any[] = [];

      const pushItem = async (catalog: any, fallbackName: string, fallbackType: ServiceType, qty: number, sourceKey: string) => {
        const quantity = qty && qty > 0 ? qty : 1;
        let { unitPrice, lineTotal } = priceFor(catalog, quantity);
        let insuranceCoveredAmount = 0;
        let patientPayableAmount = lineTotal;
        const serviceType: ServiceType = (catalog?.serviceType as ServiceType) || fallbackType;
        const description = catalog ? `${catalog.name} (${catalog.code})` : fallbackName;
        const pricing = catalog?.pricing?.[0];
        const payerCoversLine = (paymentMode === 'nhis' || paymentMode === 'private_insurance') &&
          !!catalog && !!pricing &&
          isPayerCovered(pricing, paymentMode, {
            isNHISCovered: catalog.isNHISCovered,
            isPrivateInsuranceExempted: catalog.isPrivateInsuranceExempted
          });

        if (payerCoversLine && payerProvider) {
          insuranceCoveredAmount = money(lineTotal * coverageRate);
          patientPayableAmount = money(lineTotal - insuranceCoveredAmount);
        }

        if (paymentMode === 'nhis' && catalog?.stockItemId) {
          const currentPrice = pricing;
          const cashPrice = Number(currentPrice?.cashPrice);
          if (!currentPrice || !Number.isFinite(cashPrice) || cashPrice <= 0) {
            throw new Error(`No valid active cash price is configured for medicine: ${catalog.name} on ${serviceDate.toISOString().slice(0, 10)}`);
          }
          const stockItem = await tx.stockItem.findUnique({
            where: { id: catalog.stockItemId },
            include: { payerRules: { where: { insuranceProviderId: attendance.insuranceProviderId ?? '' }, take: 1 } }
          });
          const rule = stockItem?.payerRules?.[0];
          const tariff = resolveConfiguredNHISTariff(rule?.tariffPrice, currentPrice.nhisPrice);
          const inEffectiveWindow = !!rule &&
            (!rule.effectiveFrom || rule.effectiveFrom <= serviceDate) &&
            (!rule.effectiveTo || rule.effectiveTo >= serviceDate);
          const validPrescribingLevels = ['A', 'M', 'B1', 'B2', 'C', 'D', 'SM'];
          const policyConfigured = !!rule &&
            rule.isCovered === true &&
            rule.authorizationRequired != null &&
            validPrescribingLevels.includes(String(rule.prescribingLevel ?? '').trim().toUpperCase()) &&
            tariff !== null;

          let hasRequiredAuthorization = rule?.authorizationRequired !== true;
          // Pre-authorisation is a claim against a registered patient's policy, so a counter
          // ticket (no patientId) can never satisfy an auth-required rule.
          if (rule?.authorizationRequired === true && attendance.insuranceProviderId && attendance.patientId) {
            const approvals = await tx.preAuthorisationRequest.findMany({
              where: {
                attendanceId: attendance.id,
                patientId: attendance.patientId,
                insuranceProviderId: attendance.insuranceProviderId,
                status: { in: ['approved', 'partially_approved'] },
                authNumber: { not: null },
                authExpiry: { gt: serviceDate },
              },
              select: { authNumber: true, approvedServices: true },
            });
            hasRequiredAuthorization = approvals.some((approval: any) =>
              Boolean(approval.authNumber) && approvedServicesCoverPrescription(approval.approvedServices, {
                stockItemId: catalog.stockItemId,
                serviceCatalogId: catalog.id,
              }, quantity),
            );
          }

          const allocation = calculateNHISMedicineAllocation({
            cashPrice,
            nhisTariff: tariff ?? 0,
            covered: policyConfigured && inEffectiveWindow && hasRequiredAuthorization,
            copaymentMode: rule?.copaymentMode,
            copaymentAmount: rule?.copaymentAmount == null ? null : Number(rule.copaymentAmount),
            copaymentPercentage: rule?.copaymentPercentage ?? null,
          });
          insuranceCoveredAmount = money(allocation.nhisCoveredAmount * quantity);
          patientPayableAmount = money(allocation.patientPayableAmount * quantity);
          lineTotal = money(insuranceCoveredAmount + patientPayableAmount);
          unitPrice = quantity > 0 ? money(lineTotal / quantity) : 0;
        }

        lineItemsData.push({
          serviceCatalogId: catalog?.id ?? null,
          sourceKey,
          description,
          serviceType,
          quantity,
          unitPrice,
          pricingBasis: paymentMode,
          lineTotal,
          insuranceCoveredAmount,
          patientPayableAmount,
          discount: 0,
          isVoided: false
        });
      };

      for (const sr of attendance.ServiceRendered || []) {
        await pushItem(sr.ServiceCatalog, 'Service', 'miscellaneous', sr.quantity, `service-rendered:${sr.id}`);
      }
      for (const lt of attendance.LabTest || []) {
        await pushItem(lt.ServiceCatalog, lt.LabTestTemplate?.name || 'Lab Test', 'lab_test', 1, `lab-test:${lt.id}`);
      }
      for (const sc of attendance.Scan || []) {
        await pushItem(sc.ServiceCatalog, sc.scanType || 'Scan', 'scan', 1, `scan:${sc.id}`);
      }
      for (const pr of attendance.Procedure || []) {
        await pushItem(pr.ServiceCatalog, 'Procedure', 'procedure', 1, `procedure:${pr.id}`);
      }
      for (const med of attendance.Medication || []) {
        await pushItem(med.ServiceCatalog, med.name || 'Medication', 'medication', med.quantity, `medication:${med.id}`);
      }

      // Ward charges are already priced and recorded per attendance/day by the ward workflow.
      // Include only unbilled records and link them to the generated bill lines below.
      const wardChargeLinks: Array<{ id: string; description: string }> = [];
      for (const charge of attendance.WardChargeRecord || []) {
        // Use the payer-specific rate snapshot, not dailyRate blindly: dailyRate is
        // historical/display data and may not be the rate applicable to this payer.
        const wardPrice = {
          cashPrice: charge.cashPrice,
          nhisPrice: charge.nhisPrice,
          insurancePrice: charge.insurancePrice,
          corporatePrice: charge.corporatePrice
        };
        const unitPrice = resolveUnitPrice(wardPrice, paymentMode);
        if (unitPrice <= 0) continue;
        const lineTotal = unitPrice;
        const serviceDate = new Date(charge.chargeDate).toISOString().slice(0, 10);
        const description = `Ward accommodation (${charge.wardId}) - ${serviceDate}`;
        const insurerCovers = (paymentMode === 'nhis' && toNumber(charge.nhisPrice) > 0) ||
          (paymentMode === 'private_insurance' && toNumber(charge.insurancePrice) > 0);
        const insuranceCoveredAmount = insurerCovers && payerProvider ? money(lineTotal * coverageRate) : 0;
        const patientPayableAmount = money(lineTotal - insuranceCoveredAmount);
        lineItemsData.push({
          serviceCatalogId: null,
          sourceKey: `ward-charge:${charge.id}`,
          description,
          serviceType: 'ward',
          quantity: 1,
          unitPrice,
          pricingBasis: paymentMode,
          lineTotal,
          insuranceCoveredAmount,
          patientPayableAmount,
          discount: 0,
          isVoided: false
        });
        wardChargeLinks.push({ id: charge.id, description });
      }

      // Legacy bills created before source tracking cannot be safely reconciled by matching
      // descriptions alone (two identical tests or medicines can be legitimate separate items).
      // Fail closed instead of silently adding duplicate charges to those bills.
      const existingLines = existingBill
        ? await tx.billLineItem.findMany({
            where: { billId: existingBill.id },
            select: { id: true, sourceKey: true }
          })
        : [];
      if (existingBill && existingLines.some((line) => !line.sourceKey)) {
        throw new Error(
          'This attendance has a legacy bill without source links. Review/reconcile the existing bill before synchronizing new charges.'
        );
      }

      const existingSourceKeys = new Set(existingLines.map((line) => line.sourceKey).filter(Boolean));
      const pendingItems = lineItemsData.filter((item) => !existingSourceKeys.has(item.sourceKey));

      let bill: any;
      if (!existingBill && lineItemsData.length === 0) {
        // Do not persist an empty, zero-value bill when an attendance has no
        // completed billable clinical items or unbilled ward charges.
        throw new Error('No billable items found for this encounter');
      }
      if (!existingBill) {
        const totalAmount = lineItemsData.reduce((sum, item) => sum + item.lineTotal, 0);
        const insuranceCovered = lineItemsData.reduce((sum, item) => sum + item.insuranceCoveredAmount, 0);
        const patientPayable = lineItemsData.reduce((sum, item) => sum + item.patientPayableAmount, 0);
        bill = await tx.bill.create({
          data: {
            patientId: attendance.patientId,
            counterClientId: attendance.counterClientId,
            attendanceId: attendance.id,
            paymentMode,
            billNumber: getCounterService().getBillNumberFromAttendance(attendance.attendanceNumber),
            status: patientPayable <= 0 ? 'paid' : 'pending',
            subtotal: totalAmount,
            totalAmount,
            patientPayable,
            balance: patientPayable,
            paidAmount: 0,
            insuranceCovered,
            waiverAmount: 0,
            discount: 0,
            taxAmount: 0,
            createdById: createdBy,
            billDate: new Date(),
            insuranceProviderId: attendance.insuranceProviderId ?? undefined,
            corporateAccountId: attendance.corporateAccountId ?? undefined,
            BillLineItem: lineItemsData.length > 0 ? { create: lineItemsData } : undefined
          }
        });
      } else {
        // Add only source records not already billed. The database unique constraint protects
        // concurrent retries from creating a duplicate line for the same source record.
        if (pendingItems.length > 0) {
          await tx.billLineItem.createMany({
            data: pendingItems.map((item) => ({ ...item, billId: existingBill.id })),
            skipDuplicates: true
          });
        }
        bill = existingBill;
      }

      // Resolve source links for ward charges after inserts; this also repairs an interrupted
      // earlier sync where the line exists but the ward record was not yet marked billed.
      for (const link of wardChargeLinks) {
        const line = await tx.billLineItem.findFirst({
          where: { billId: bill.id, sourceKey: `ward-charge:${link.id}`, isVoided: false },
          select: { id: true }
        });
        if (line) {
          await tx.wardChargeRecord.update({
            where: { id: link.id },
            data: { isBilled: true, billLineItemId: line.id }
          });
        }
      }

      const activeLines = await tx.billLineItem.findMany({
        where: { billId: bill.id, isVoided: false },
        select: { lineTotal: true, patientPayableAmount: true, insuranceCoveredAmount: true }
      });
      const totalAmount = activeLines.reduce((sum, item) => sum + toNumber(item.lineTotal), 0);
      const insuranceCovered = activeLines.reduce((sum, item) => sum + toNumber(item.insuranceCoveredAmount), 0);
      const grossPatientLiability = activeLines.reduce((sum, item) => sum + toNumber(item.patientPayableAmount), 0);
      const waiverAmount = toNumber(existingBill?.waiverAmount);
      const patientPayable = Math.max(0, grossPatientLiability - waiverAmount);
      const paidAmount = toNumber(existingBill?.paidAmount);
      const balance = Math.max(0, patientPayable - paidAmount);
      const status = balance <= 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';

      const updatedBill = await tx.bill.update({
        where: { id: bill.id },
        data: {
          subtotal: totalAmount,
          totalAmount,
          insuranceCovered,
          patientPayable,
          balance,
          status
        },
        include: {
          Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
          CounterClient: { select: { id: true, name: true, ageYears: true, phone: true } },
          Attendance: { select: { id: true, attendanceNumber: true, attendanceType: true } },
          BillLineItem: {
            where: { isVoided: false },
            include: { serviceCatalog: { select: { id: true, name: true, code: true, serviceType: true } } }
          }
        }
      });

      await this.syncAttendanceFinancials(tx, attendance.id, { ...updatedBill, balance });

      return updatedBill;
    });
  }
}