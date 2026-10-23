import { ValidationError, NotFoundError } from '../../utils/errors';
import { PrismaClient, BillStatus, PaymentMethod, PaymentMode, ServiceType } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { BillFilter, CreateBillInput, UpdateBillInput, AddPaymentInput } from './BillTypes';
import { getCounterService } from '../../services/CounterService';
import { isPayerCovered, resolveUnitPrice } from '../../utils/pricing';

// ✅ Helper to safely convert Prisma Decimal objects to JS numbers for math
const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class BillRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'bill');
  }

  async findAll(filters: BillFilter) {
    const { patientId, status, paymentMode, dateFrom, dateTo, attendanceId, page = 1, limit = 1000 } = filters;
    const where: any = {};

    if (patientId) where.patientId = patientId;
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
        Attendance: { select: { id: true, attendanceNumber: true, attendanceType: true } },
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
        Attendance: { select: { id: true, attendanceNumber: true, attendanceType: true, dateTime: true } },
        BillLineItem: { where: { isVoided: false }, include: { serviceCatalog: { select: { id: true, name: true, code: true, serviceType: true } } } },
        Payment: true
      }
    });
  }

  async create(data: CreateBillInput, createdBy: string) {
    const { patientId, attendanceId, paymentMode = 'cash', items } = data;

    // A bill belongs to a visit: attendanceId is a required column
    if (!attendanceId) throw new ValidationError('A bill must be created for a visit (attendanceId is required)');

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
          patientId, attendanceId, paymentMode,
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
        include: { BillLineItem: true, Patient: true }
      });

      // ✅ FIXED: Safely parse Prisma Decimals to numbers for JS math
      const totalAmount = bill.BillLineItem.reduce((sum, item) => sum + toNumber(item.lineTotal), 0);

      return tx.bill.update({
        where: { id: bill.id },
        data: { totalAmount, patientPayable: totalAmount, balance: totalAmount },
        include: { BillLineItem: true, Patient: true }
      });
    });
  }

  async update(id: string, data: UpdateBillInput) {
    return this.getModel().update({ where: { id }, data, include: { BillLineItem: true, Patient: true } });
  }

  async delete(id: string) {
    return this.getModel().delete({ where: { id } });
  }

  async addPayment(billId: string, paymentData: AddPaymentInput, receivedById: string) {
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({ where: { id: billId } });
      if (!bill) throw new Error('Bill not found');

      // Patient receipts reduce the patient's liability, not the insurer's share.
      const amount = toNumber(paymentData.amount);
      const patientLiability = toNumber(bill.patientPayable);
      const currentBalance = Math.max(0, toNumber(bill.balance));
      if (amount > currentBalance) {
        throw new ValidationError(`Payment exceeds the patient's outstanding balance (${currentBalance.toFixed(2)})`);
      }
      const newPaidAmount = toNumber(bill.paidAmount) + amount;
      const newBalance = Math.max(0, patientLiability - newPaidAmount);

      let newStatus: BillStatus = bill.status;
      if (newBalance <= 0) newStatus = 'paid';
      else if (newPaidAmount > 0) newStatus = 'partial';

      const [updatedBill, payment] = await Promise.all([
        tx.bill.update({ where: { id: billId }, data: { paidAmount: newPaidAmount, balance: newBalance, status: newStatus } }),
        tx.payment.create({
          data: {
            billId, amount,
            paymentMethod: paymentData.paymentMethod as PaymentMethod, // ✅ FIXED: Uses correct schema field
            reference: paymentData.reference,                           // ✅ FIXED: Uses correct schema field
            notes: paymentData.notes,
            receivedById,                                               // ✅ FIXED: Uses correct schema field
            transactionDate: new Date()
          }
        })
      ]);

      if (bill.attendanceId) {
        await tx.attendance.update({ where: { id: bill.attendanceId }, data: { outstandingBalance: newBalance } });
      }

      return { bill: updatedBill, payment };
    });
  }

  async voidLineItem(lineItemId: string, userId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      const lineItem = await tx.billLineItem.findUnique({ where: { id: lineItemId }, include: { bill: true } });
      if (!lineItem) throw new Error('Line item not found');
      if (lineItem.isVoided) throw new Error('Line item already voided');

      const updatedLineItem = await tx.billLineItem.update({
        where: { id: lineItemId },
        data: { isVoided: true, voidReason: reason, voidedAt: new Date(), voidedById: userId }
      });

      const activeLineItems = await tx.billLineItem.findMany({ where: { billId: lineItem.billId, isVoided: false } });

      // ✅ FIXED: Safely parse Decimals
      const newTotal = activeLineItems.reduce((sum, item) => sum + toNumber(item.lineTotal), 0);
      const grossPatientLiability = activeLineItems.reduce((sum, item) => sum + toNumber(item.patientPayableAmount), 0);
      const newInsuranceCovered = activeLineItems.reduce((sum, item) => sum + toNumber(item.insuranceCoveredAmount), 0);
      const bill = await tx.bill.findUnique({ where: { id: lineItem.billId } });
      // patientPayable already reflects approved waivers; recompute it from active lines
      // so voiding a line cannot accidentally restore liability that was previously waived.
      const newPatientPayable = Math.max(0, grossPatientLiability - toNumber(bill?.waiverAmount || 0));
      const newBalance = Math.max(0, newPatientPayable - toNumber(bill?.paidAmount || 0));

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

      if (bill?.attendanceId) {
        await tx.attendance.update({
          where: { id: bill.attendanceId },
          data: { totalBill: newTotal, outstandingBalance: newBalance }
        });
      }

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
      if (waiver.status !== 'approved') throw new Error('Only approved waivers can be applied');
      if (waiver.billId !== billId) throw new Error('Waiver does not belong to this bill');

      const bill = await tx.bill.findUnique({ where: { id: billId } });
      if (!bill) throw new Error('Bill not found');

      // Approved waivers may reduce only the remaining patient liability.
      const waiverAmount = toNumber(waiver.amountApproved);
      const remainingPatientLiability = Math.max(0, toNumber(bill.patientPayable) - toNumber(bill.paidAmount));
      if (waiverAmount <= 0 || waiverAmount > remainingPatientLiability) {
        throw new ValidationError('Approved waiver exceeds the remaining patient liability');
      }
      const newWaiverAmount = toNumber(bill.waiverAmount) + waiverAmount;
      const newPatientPayable = Math.max(0, toNumber(bill.patientPayable) - waiverAmount);
      const newBalance = Math.max(0, newPatientPayable - toNumber(bill.paidAmount));

      const updatedBill = await tx.bill.update({
        where: { id: billId },
        data: { waiverAmount: newWaiverAmount, patientPayable: newPatientPayable, balance: newBalance, status: newBalance <= 0 ? 'paid' : bill.status }
      });

      if (bill.attendanceId) {
        await tx.attendance.update({ where: { id: bill.attendanceId }, data: { outstandingBalance: newBalance } });
      }

      return updatedBill;
    });
  }

  // ✅ Builds a grouped/summary breakdown for a bill, matching the frontend BillingBreakdown type.
  async getBreakdown(billId: string) {
    const bill = await this.getModel().findUnique({
      where: { id: billId },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
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
      const activePricing = { pricing: { where: { isActive: true }, take: 1, orderBy: { effectiveDate: 'desc' as const } } };
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

      // Corporate patients with no corporate price get their account's discount off the cash price
      let corporateDiscountPercent = 0;
      if (paymentMode === 'corporate' && attendance.corporateAccountId) {
        const account = await tx.corporateAccount.findUnique({ where: { id: attendance.corporateAccountId }, select: { discountPercentage: true } });
        corporateDiscountPercent = toNumber(account?.discountPercentage);
      }

      // Same rules everywhere (utils/pricing.ts): uncovered NHIS / exempted insurance / missing corporate price fall back to cash
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

      const pushItem = (catalog: any, fallbackName: string, fallbackType: ServiceType, qty: number, sourceKey: string) => {
        const quantity = qty && qty > 0 ? qty : 1;
        const { unitPrice, lineTotal } = priceFor(catalog, quantity);
        const serviceType: ServiceType = (catalog?.serviceType as ServiceType) || fallbackType;
        const description = catalog ? `${catalog.name} (${catalog.code})` : fallbackName;
        // A covered payer tariff is the insurer's liability, not a patient charge.
        // Uncovered / missing-tariff services fall back to cash through resolveUnitPrice.
        const payerCoversLine = (paymentMode === 'nhis' || paymentMode === 'private_insurance') &&
          !!catalog && !!catalog.pricing?.[0] &&
          isPayerCovered(catalog.pricing[0], paymentMode, {
            isNHISCovered: catalog.isNHISCovered,
            isPrivateInsuranceExempted: catalog.isPrivateInsuranceExempted
          });
        const insuranceCoveredAmount = payerCoversLine ? lineTotal : 0;
        const patientPayableAmount = payerCoversLine ? 0 : lineTotal;
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
        pushItem(sr.ServiceCatalog, 'Service', 'miscellaneous', sr.quantity, `service-rendered:${sr.id}`);
      }
      for (const lt of attendance.LabTest || []) {
        pushItem(lt.ServiceCatalog, lt.LabTestTemplate?.name || 'Lab Test', 'lab_test', 1, `lab-test:${lt.id}`);
      }
      for (const sc of attendance.Scan || []) {
        pushItem(sc.ServiceCatalog, sc.scanType || 'Scan', 'scan', 1, `scan:${sc.id}`);
      }
      for (const pr of attendance.Procedure || []) {
        pushItem(pr.ServiceCatalog, 'Procedure', 'procedure', 1, `procedure:${pr.id}`);
      }
      for (const med of attendance.Medication || []) {
        pushItem(med.ServiceCatalog, med.name || 'Medication', 'medication', med.quantity, `medication:${med.id}`);
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
        lineItemsData.push({
          serviceCatalogId: null,
          sourceKey: `ward-charge:${charge.id}`,
          description,
          serviceType: 'ward',
          quantity: 1,
          unitPrice,
          pricingBasis: paymentMode,
          lineTotal,
          insuranceCoveredAmount: insurerCovers ? lineTotal : 0,
          patientPayableAmount: insurerCovers ? 0 : lineTotal,
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
      if (!existingBill) {
        const totalAmount = lineItemsData.reduce((sum, item) => sum + item.lineTotal, 0);
        const insuranceCovered = lineItemsData.reduce((sum, item) => sum + item.insuranceCoveredAmount, 0);
        const patientPayable = lineItemsData.reduce((sum, item) => sum + item.patientPayableAmount, 0);
        bill = await tx.bill.create({
          data: {
            patientId: attendance.patientId,
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
          Attendance: { select: { id: true, attendanceNumber: true, attendanceType: true } },
          BillLineItem: {
            where: { isVoided: false },
            include: { serviceCatalog: { select: { id: true, name: true, code: true, serviceType: true } } }
          }
        }
      });

      await tx.attendance.update({
        where: { id: attendance.id },
        data: { totalBill: totalAmount, outstandingBalance: balance }
      });

      return updatedBill;
    });
  }
}