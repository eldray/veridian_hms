/**
 * Billing Module Repository
 * Data access layer for billing management
 */

import { PrismaClient, BillStatus, PaymentMode } from '@prisma/client';
import { CreateBillDTO, AddPaymentDTO, BillFilters } from './BillingTypes';

export class BillingRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll(filters: BillFilters) {
    const { patientId, status, paymentMode, dateFrom, dateTo, page = 1, limit = 50 } = filters;

    const where: any = {};
    if (patientId) where.patientId = patientId;

    if (status) {
      if (Array.isArray(status)) {
        where.status = { in: status };
      } else {
        where.status = status;
      }
    }

    if (paymentMode) {
      where.paymentMode = paymentMode;
    }

    if (dateFrom || dateTo) {
      where.billDate = {};
      if (dateFrom) where.billDate.gte = new Date(dateFrom);
      if (dateTo) where.billDate.lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const [bills, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        include: {
          Patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true
            }
          },
          Attendance: {
            select: {
              id: true,
              attendanceNumber: true,
              attendanceType: true,
              encounterCategory: true
            }
          },
          Admission: {
            select: {
              id: true,
              admissionNumber: true,
              status: true
            }
          },
          InsuranceProvider: {
            select: {
              id: true,
              name: true,
              type: true
            }
          },
          User_Bill_createdByIdToUser: {
            select: {
              id: true,
              fullName: true,
              username: true
            }
          }
        },
        orderBy: { billDate: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.bill.count({ where })
    ]);

    return { bills, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.bill.findUnique({
      where: { id },
      include: {
        Patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true,
            paymentMode: true
          }
        },
        Attendance: {
          select: {
            id: true,
            attendanceNumber: true,
            attendanceType: true,
            encounterCategory: true,
            dateTime: true
          }
        },
        Admission: {
          select: {
            id: true,
            admissionNumber: true,
            status: true,
            admissionDate: true
          }
        },
        InsuranceProvider: {
          select: {
            id: true,
            name: true,
            type: true,
            coveragePercentage: true
          }
        },
        User_Bill_createdByIdToUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        User_Bill_updatedByIdToUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        Payment: {
          orderBy: { transactionDate: 'desc' }
        },
        InsuranceClaim: {
          select: {
            id: true,
            claimNumber: true,
            status: true,
            totalClaimAmount: true,
            submissionDate: true
          }
        },
        BillLineItem: {
          where: { isVoided: false },
          include: {
            serviceCatalog: {
              select: {
                name: true,
                code: true,
                serviceType: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  async create(data: any, items: any[]) {
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.bill.create({
        data,
        include: {
          Patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true
            }
          },
          Attendance: {
            select: {
              attendanceNumber: true,
              attendanceType: true
            }
          },
          User_Bill_createdByIdToUser: {
            select: {
              fullName: true
            }
          }
        }
      });

      for (const item of items) {
        await tx.billLineItem.create({
          data: item,
          include: {
            serviceCatalog: {
              select: {
                name: true,
                code: true
              }
            }
          }
        });
      }

      return bill;
    });
  }

  async addPayment(id: string, paymentData: any) {
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({ where: { id } });
      if (!bill) throw new Error('Bill not found');

      const paymentAmount = paymentData.amount;
      const newPaidAmount = bill.paidAmount + paymentAmount;
      const newBalance = bill.totalAmount - newPaidAmount;

      let newStatus: BillStatus = bill.status;
      if (newBalance <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      const updatedBill = await tx.bill.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
          updatedAt: new Date(),
          updatedById: paymentData.userId
        },
        include: {
          Patient: {
            select: {
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true
            }
          },
          Attendance: {
            select: {
              attendanceNumber: true,
              attendanceType: true
            }
          }
        }
      });

      const payment = await tx.payment.create({
        data: {
          billId: id,
          amount: paymentAmount,
          paymentMethod: paymentData.paymentMethod,
          reference: paymentData.reference || `PAY-${Date.now()}`,
          receivedById: paymentData.userId,
          notes: paymentData.notes,
          transactionDate: new Date()
        }
      });

      return { bill: updatedBill, payment };
    });
  }

  async updateStatus(id: string, status: BillStatus, userId: string) {
    return this.prisma.bill.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
        updatedById: userId
      },
      include: {
        Patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true
          }
        },
        Attendance: {
          select: {
            attendanceNumber: true
          }
        }
      }
    });
  }

  async getStatistics(period: string) {
    const date = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        break;
      case 'week':
        startDate = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3);
        startDate = new Date(date.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(date.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    }

    const where = { billDate: { gte: startDate } };

    const [totalBills, totalAmount, totalPaid, totalPending, byPaymentMode, byStatus] = await Promise.all([
      this.prisma.bill.count({ where }),
      this.prisma.bill.aggregate({ where, _sum: { totalAmount: true } }),
      this.prisma.bill.aggregate({ where, _sum: { paidAmount: true } }),
      this.prisma.bill.count({ where: { ...where, status: { in: ['pending', 'partial'] } } }),
      this.prisma.bill.groupBy({
        by: ['paymentMode'],
        where,
        _count: { id: true },
        _sum: { totalAmount: true, paidAmount: true }
      }),
      this.prisma.bill.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
        _sum: { totalAmount: true, paidAmount: true }
      })
    ]);

    return {
      period: { start: startDate, end: new Date(), type: period },
      summary: {
        totalBills,
        totalAmount: totalAmount._sum.totalAmount || 0,
        totalPaid: totalPaid._sum.paidAmount || 0,
        totalPending,
        collectionRate: totalAmount._sum.totalAmount ? ((totalPaid._sum.paidAmount || 0) / totalAmount._sum.totalAmount) * 100 : 0
      },
      byPaymentMode,
      byStatus
    };
  }

  async getLineItems(billId: string) {
    const lineItems = await this.prisma.billLineItem.findMany({
      where: { billId, isVoided: false },
      include: {
        serviceCatalog: { select: { name: true, code: true, serviceType: true } },
        voidedBy: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      select: { billNumber: true, status: true, totalAmount: true, paidAmount: true, balance: true }
    });

    return {
      bill,
      lineItems,
      summary: {
        totalItems: lineItems.length,
        subtotal: lineItems.reduce((sum, i) => sum + i.lineTotal, 0),
        insuranceCovered: lineItems.reduce((sum, i) => sum + i.insuranceCoveredAmount, 0),
        patientPayable: lineItems.reduce((sum, i) => sum + i.patientPayableAmount, 0)
      }
    };
  }

  async voidLineItem(lineItemId: string, userId: string, reason: string) {
    return this.prisma.billLineItem.update({
      where: { id: lineItemId },
      data: {
        isVoided: true,
        voidedAt: new Date(),
        voidedById: userId,
        voidReason: reason
      }
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

      const newWaiverAmount = (bill.waiverAmount || 0) + waiver.amountApproved;
      const newPatientPayable = bill.patientPayable - waiver.amountApproved;
      const newBalance = newPatientPayable - bill.paidAmount;

      const updated = await tx.bill.update({
        where: { id: billId },
        data: {
          waiverAmount: newWaiverAmount,
          patientPayable: newPatientPayable,
          balance: newBalance,
          discount: newWaiverAmount,
          status: newBalance <= 0 ? 'paid' : bill.status
        },
        include: { Patient: true, Attendance: true }
      });

      if (updated.attendanceId) {
        await tx.attendance.update({
          where: { id: updated.attendanceId },
          data: { outstandingBalance: { decrement: waiver.amountApproved } }
        });
      }

      return updated;
    });
  }
}
