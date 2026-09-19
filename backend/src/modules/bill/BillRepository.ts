import { PrismaClient, BillStatus, PaymentMethod, PaymentMode, ServiceType } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { BillFilter, CreateBillInput, UpdateBillInput, AddPaymentInput } from './BillTypes';
import { getCounterService } from '../../services/CounterService';

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

    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.bill.create({
        data: {
          patientId, attendanceId, paymentMode,
          billNumber: getCounterService().nextBillNumber(), // ✅ FIXED: Uses CounterService instead of Math.random()
          status: 'pending', totalAmount: 0, paidAmount: 0, balance: 0, patientPayable: 0,
          insuranceCovered: 0, waiverAmount: 0, discount: 0, createdById: createdBy, billDate: new Date(),
          BillLineItem: {
            create: items.map(item => ({
              serviceCatalogId: item.serviceCatalogId, quantity: item.quantity, unitPrice: item.unitPrice,
              lineTotal: item.quantity * item.unitPrice, insuranceCoveredAmount: 0,
              patientPayableAmount: item.quantity * item.unitPrice, discount: 0, isVoided: false
            }))
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

      // ✅ FIXED: Safely parse Decimals before math
      const amount = toNumber(paymentData.amount);
      const newPaidAmount = toNumber(bill.paidAmount) + amount;
      const newBalance = toNumber(bill.totalAmount) - newPaidAmount;

      let newStatus: BillStatus = bill.status;
      if (newBalance <= 0) newStatus = 'paid';
      else if (newPaidAmount > 0 && newPaidAmount < toNumber(bill.totalAmount)) newStatus = 'partial';

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
      const newPatientPayable = activeLineItems.reduce((sum, item) => sum + toNumber(item.patientPayableAmount), 0);
      const bill = await tx.bill.findUnique({ where: { id: lineItem.billId } });

      await tx.bill.update({
        where: { id: lineItem.billId },
        data: { totalAmount: newTotal, patientPayable: newPatientPayable, balance: newPatientPayable - toNumber(bill?.paidAmount || 0) }
      });

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

      // ✅ FIXED: Safely parse Decimals
      const newWaiverAmount = toNumber(bill.waiverAmount) + toNumber(waiver.amountApproved);
      const newPatientPayable = toNumber(bill.patientPayable) - toNumber(waiver.amountApproved);
      const newBalance = newPatientPayable - toNumber(bill.paidAmount);

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
          LabTest: { include: { ServiceCatalog: { include: activePricing }, LabTestTemplate: true } },
          Scan: { include: { ServiceCatalog: { include: activePricing } } },
          Procedure: { include: { ServiceCatalog: { include: activePricing } } },
          Medication: { include: { ServiceCatalog: { include: activePricing } } }
        }
      });
      if (!attendance) throw new Error('Encounter not found');

      // Bill.attendanceId is @unique — only one bill per encounter.
      const existing = await tx.bill.findUnique({ where: { attendanceId: encounterId } });
      if (existing) throw new Error('A bill already exists for this encounter');

      const paymentMode: PaymentMode = attendance.paymentMode;

      const priceFor = (catalog: any, qty: number): { unitPrice: number; lineTotal: number } => {
        const price = catalog?.pricing?.[0];
        let unitPrice = 0;
        if (price) {
          switch (paymentMode) {
            case 'cash': unitPrice = toNumber(price.cashPrice); break;
            case 'nhis': unitPrice = toNumber(price.nhisPrice); break;
            case 'private_insurance': unitPrice = toNumber(price.insurancePrice); break;
            case 'corporate': unitPrice = toNumber(price.corporatePrice) > 0 ? toNumber(price.corporatePrice) : toNumber(price.cashPrice); break;
            default: unitPrice = toNumber(price.cashPrice);
          }
        }
        return { unitPrice, lineTotal: unitPrice * qty };
      };

      const lineItemsData: any[] = [];

      const pushItem = (catalog: any, fallbackName: string, fallbackType: ServiceType, qty: number) => {
        const quantity = qty && qty > 0 ? qty : 1;
        const { unitPrice, lineTotal } = priceFor(catalog, quantity);
        const serviceType: ServiceType = (catalog?.serviceType as ServiceType) || fallbackType;
        const description = catalog ? `${catalog.name} (${catalog.code})` : fallbackName;
        lineItemsData.push({
          serviceCatalogId: catalog?.id ?? null,
          description,
          serviceType,
          quantity,
          unitPrice,
          pricingBasis: paymentMode,
          lineTotal,
          insuranceCoveredAmount: 0,
          patientPayableAmount: lineTotal,
          discount: 0,
          isVoided: false
        });
      };

      for (const sr of attendance.ServiceRendered || []) {
        pushItem(sr.ServiceCatalog, 'Service', 'miscellaneous', sr.quantity);
      }
      for (const lt of attendance.LabTest || []) {
        pushItem(lt.ServiceCatalog, lt.LabTestTemplate?.name || 'Lab Test', 'lab_test', 1);
      }
      for (const sc of attendance.Scan || []) {
        pushItem(sc.ServiceCatalog, sc.scanType || 'Scan', 'scan', 1);
      }
      for (const pr of attendance.Procedure || []) {
        pushItem(pr.ServiceCatalog, 'Procedure', 'procedure', 1);
      }
      for (const med of attendance.Medication || []) {
        pushItem(med.ServiceCatalog, med.name || 'Medication', 'medication', med.quantity);
      }

      const totalAmount = lineItemsData.reduce((sum, i) => sum + i.lineTotal, 0);

      const bill = await tx.bill.create({
        data: {
          patientId: attendance.patientId,
          attendanceId: attendance.id,
          paymentMode,
          billNumber: getCounterService().getBillNumberFromAttendance(attendance.attendanceNumber),
          status: 'pending',
          subtotal: totalAmount,
          totalAmount,
          patientPayable: totalAmount,
          balance: totalAmount,
          paidAmount: 0,
          insuranceCovered: 0,
          waiverAmount: 0,
          discount: 0,
          taxAmount: 0,
          createdById: createdBy,
          billDate: new Date(),
          insuranceProviderId: attendance.insuranceProviderId ?? undefined,
          corporateAccountId: attendance.corporateAccountId ?? undefined,
          BillLineItem: lineItemsData.length > 0 ? { create: lineItemsData } : undefined
        },
        include: {
          Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
          Attendance: { select: { id: true, attendanceNumber: true, attendanceType: true } },
          BillLineItem: { include: { serviceCatalog: { select: { id: true, name: true, code: true, serviceType: true } } } }
        }
      });

      await tx.attendance.update({ where: { id: attendance.id }, data: { totalBill: totalAmount, outstandingBalance: totalAmount } });

      return bill;
    });
  }
}