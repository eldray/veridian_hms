import { PrismaClient, WaiverStatus, WaiverType } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';

const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class WaiverRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'patientWaiver');
  }

  async findAll(filters: any) {
    const { billId, patientId, status, waiverType, startDate, endDate, page = 1, limit = 50 } = filters;
    const where: any = {};
    if (billId) where.billId = billId;
    if (patientId) where.patientId = patientId;
    if (status) where.status = status;
    if (waiverType) where.waiverType = waiverType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return this.findManyWithPagination({
      where, page, limit, orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true, contact: true } },
        bill: { select: { id: true, billNumber: true, totalAmount: true, paidAmount: true, balance: true } },
        requestedBy: { select: { id: true, fullName: true, username: true, role: true } },
        approvedBy: { select: { id: true, fullName: true, username: true, role: true } } // ✅ FIXED: Aligned with schema
      }
    });
  }

  async findById(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true, contact: true, paymentMode: true } },
        bill: { include: { BillLineItem: { take: 10, select: { id: true, description: true, lineTotal: true, serviceType: true } } } },
        requestedBy: { select: { id: true, fullName: true, username: true, role: true } },
        approvedBy: { select: { id: true, fullName: true, username: true, role: true } } // ✅ FIXED
      }
    });
  }

  async create(data: any) {
    return this.getModel().create({
      data: {
        billId: data.billId, patientId: data.patientId, waiverType: data.waiverType,
        amountRequested: data.amountRequested, amountApproved: 0, reason: data.reason,
        status: 'pending', requestedById: data.requestedById, supportingDocs: data.supportingDocs
      },
      include: {
        patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
        bill: { select: { id: true, billNumber: true, totalAmount: true, paidAmount: true, balance: true } },
        requestedBy: { select: { id: true, fullName: true, username: true, role: true } },
        approvedBy: { select: { id: true, fullName: true, username: true, role: true } }
      }
    });
  }

  async approve(id: string, approvedById: string, amountApproved: number, rejectionReason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const updatedWaiver = await tx.patientWaiver.update({
        where: { id },
        data: { status: 'approved', amountApproved, approvedById, approvedAt: new Date(), rejectionReason: null },
        include: {
          patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
          bill: { select: { id: true, billNumber: true, totalAmount: true, paidAmount: true, balance: true } },
          requestedBy: { select: { id: true, fullName: true, username: true } },
          approvedBy: { select: { id: true, fullName: true, username: true } }
        }
      });

      // ✅ FIXED: Safely parse Decimals before updating bill
      if (updatedWaiver.billId && amountApproved > 0) {
        const bill = await tx.bill.findUnique({ where: { id: updatedWaiver.billId } });
        if (bill) {
          const total = toNumber(bill.totalAmount);
          const insurance = toNumber(bill.insuranceCovered);
          const discount = toNumber(bill.discount);
          const paid = toNumber(bill.paidAmount);
          const currentWaiver = toNumber(bill.waiverAmount);

          await tx.bill.update({
            where: { id: bill.id },
            data: {
              waiverAmount: currentWaiver + amountApproved,
              patientPayable: total - insurance - discount - (currentWaiver + amountApproved),
              balance: total - paid - (currentWaiver + amountApproved)
            }
          });
        }
      }
      return updatedWaiver;
    });
  }

  async reject(id: string, approvedById: string, rejectionReason: string) {
    return this.getModel().update({
      where: { id },
      data: { status: 'rejected', approvedById, approvedAt: new Date(), rejectionReason },
      include: {
        patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
        bill: { select: { id: true, billNumber: true, totalAmount: true } },
        requestedBy: { select: { id: true, fullName: true, username: true } },
        approvedBy: { select: { id: true, fullName: true, username: true } }
      }
    });
  }

  async getStatistics(filters: any) {
    const where: any = {};
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [totalWaivers, pendingWaivers, approvedWaivers, rejectedWaivers, totalRequestedAmount, totalApprovedAmount] = await Promise.all([
      this.count(where),
      this.count({ ...where, status: 'pending' }),
      this.count({ ...where, status: 'approved' }),
      this.count({ ...where, status: 'rejected' }),
      this.prisma.patientWaiver.aggregate({ where, _sum: { amountRequested: true } }),
      this.prisma.patientWaiver.aggregate({ where: { ...where, status: 'approved' }, _sum: { amountApproved: true } })
    ]);

    const byWaiverType = await Promise.all([
      this.count({ ...where, waiverType: 'indigent' }),
      this.count({ ...where, waiverType: 'nhis_exempt' }),
      this.count({ ...where, waiverType: 'staff_discount' }),
      this.count({ ...where, waiverType: 'management_discretion' }),
      this.count({ ...where, waiverType: 'other' })
    ]);

    return {
      totalWaivers, pendingWaivers, approvedWaivers, rejectedWaivers,
      totalRequestedAmount: totalRequestedAmount._sum.amountRequested,
      totalApprovedAmount: totalApprovedAmount._sum.amountApproved,
      approvalRate: totalWaivers > 0 ? (approvedWaivers / totalWaivers) * 100 : 0,
      byWaiverType: {
        indigent: byWaiverType[0], nhisExempt: byWaiverType[1], staffDiscount: byWaiverType[2],
        managementDiscretion: byWaiverType[3], other: byWaiverType[4]
      }
    };
  }

  async findByBillId(billId: string) {
    return this.getModel().findMany({
      where: { billId }, orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
        bill: { select: { id: true, billNumber: true, totalAmount: true, paidAmount: true, balance: true } },
        requestedBy: { select: { id: true, fullName: true, username: true, role: true } },
        approvedBy: { select: { id: true, fullName: true, username: true, role: true } }
      }
    });
  }

  async findByPatientId(patientId: string) {
    return this.getModel().findMany({
      where: { patientId }, orderBy: { createdAt: 'desc' },
      include: {
        patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
        bill: { select: { id: true, billNumber: true, totalAmount: true, paidAmount: true, balance: true } },
        requestedBy: { select: { id: true, fullName: true, username: true, role: true } },
        approvedBy: { select: { id: true, fullName: true, username: true, role: true } }
      }
    });
  }

  async update(id: string, data: any) {
    return this.getModel().update({
      where: { id }, data,
      include: {
        patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
        bill: { select: { id: true, billNumber: true, totalAmount: true } },
        requestedBy: { select: { id: true, fullName: true, username: true } }
      }
    });
  }

  async delete(id: string) {
    return this.getModel().delete({ where: { id } });
  }

  async getBillById(id: string) {
    return this.prisma.bill.findUnique({ where: { id }, include: { Patient: true } });
  }
}