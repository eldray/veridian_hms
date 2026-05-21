import { PrismaClient, BillStatus, PaymentMode, PaymentMethod } from '@prisma/client';
import { 
  BillWithRelations, 
  CreateBillInput, 
  UpdateBillInput, 
  BillFilter,
  AddPaymentInput,
  VoidLineItemInput
} from './BillTypes';

const prisma = new PrismaClient();

export class BillRepository {
  async findAll(filters: BillFilter, page: number = 1, limit: number = 50) {
    const where: any = {};
    
    if (filters.patientId) {
      where.patientId = filters.patientId;
    }
    
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: filters.status };
      } else {
        where.status = filters.status;
      }
    }
    
    if (filters.paymentMode) {
      where.paymentMode = filters.paymentMode;
    }
    
    if (filters.dateFrom || filters.dateTo) {
      where.billDate = {};
      if (filters.dateFrom) {
        where.billDate.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.billDate.lte = filters.dateTo;
      }
    }
    
    if (filters.attendanceId) {
      where.attendanceId = filters.attendanceId;
    }
    
    const skip = (page - 1) * limit;
    
    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: {
          Patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          Attendance: {
            select: {
              id: true,
              attendanceNumber: true,
              attendanceType: true
            }
          },
          BillLineItem: {
            where: { isVoided: false },
            include: {
              serviceCatalog: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  serviceType: true
                }
              }
            }
          },
          Payment: true
        },
        skip,
        take: limit,
        orderBy: { billDate: 'desc' }
      }),
      prisma.bill.count({ where })
    ]);
    
    return { bills, total, page, limit };
  }

  async findById(id: string): Promise<BillWithRelations | null> {
    return prisma.bill.findUnique({
      where: { id },
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
            dateTime: true
          }
        },
        BillLineItem: {
          where: { isVoided: false },
          include: {
            serviceCatalog: {
              select: {
                id: true,
                name: true,
                code: true,
                serviceType: true
              }
            }
          }
        },
        Payment: true
      }
    });
  }

  async create(data: CreateBillInput, createdBy: string) {
    const { patientId, attendanceId, paymentMode = 'cash', items } = data;
    
    const bill = await prisma.bill.create({
      data: {
        patientId,
        attendanceId,
        paymentMode,
        billNumber: this.generateBillNumber(),
        status: 'pending',
        totalAmount: 0,
        paidAmount: 0,
        balance: 0,
        patientPayable: 0,
        insuranceCovered: 0,
        waiverAmount: 0,
        discount: 0,
        createdById: createdBy,
        billDate: new Date(),
        BillLineItem: {
          create: items.map(item => ({
            serviceCatalogId: item.serviceCatalogId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.quantity * item.unitPrice,
            insuranceCoveredAmount: 0,
            patientPayableAmount: item.quantity * item.unitPrice,
            discount: 0,
            isVoided: false
          }))
        }
      },
      include: {
        BillLineItem: true,
        Patient: true
      }
    });
    
    // Calculate totals
    const totalAmount = bill.BillLineItem.reduce((sum, item) => sum + item.lineTotal, 0);
    
    const updated = await prisma.bill.update({
      where: { id: bill.id },
      data: {
        totalAmount,
        patientPayable: totalAmount,
        balance: totalAmount
      },
      include: {
        BillLineItem: true,
        Patient: true
      }
    });
    
    return updated;
  }

  async update(id: string, data: UpdateBillInput) {
    return prisma.bill.update({
      where: { id },
      data,
      include: {
        BillLineItem: true,
        Patient: true
      }
    });
  }

  async delete(id: string) {
    return prisma.bill.delete({
      where: { id }
    });
  }

  async addPayment(billId: string, paymentData: AddPaymentInput, receivedById: string) {
    const { amount, paymentMode, referenceNumber, paidBy, notes } = paymentData;
    
    return prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({ where: { id: billId } });
      
      if (!bill) {
        throw new Error('Bill not found');
      }
      
      const newPaidAmount = bill.paidAmount + amount;
      const newBalance = bill.totalAmount - newPaidAmount;
      let newStatus: BillStatus = bill.status;
      
      if (newBalance <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0 && newPaidAmount < bill.totalAmount) {
        newStatus = 'partial';
      }
      
      const [updatedBill, payment] = await Promise.all([
        tx.bill.update({
          where: { id: billId },
          data: {
            paidAmount: newPaidAmount,
            balance: newBalance,
            status: newStatus
          }
        }),
        tx.payment.create({
          data: {
            billId,
            amount,
            paymentMethod: paymentMode as PaymentMethod,
            reference: referenceNumber,
            notes,
            receivedById,
            transactionDate: new Date()
          }
        })
      ]);
      
      // Update attendance outstanding balance if linked
      if (bill.attendanceId) {
        await tx.attendance.update({
          where: { id: bill.attendanceId },
          data: {
            outstandingBalance: newBalance
          }
        });
      }
      
      return { bill: updatedBill, payment };
    });
  }

  async voidLineItem(lineItemId: string, userId: string, reason: string) {
    return prisma.$transaction(async (tx) => {
      const lineItem = await tx.billLineItem.findUnique({
        where: { id: lineItemId },
        include: { bill: true }
      });
      
      if (!lineItem) {
        throw new Error('Line item not found');
      }
      
      if (lineItem.isVoided) {
        throw new Error('Line item already voided');
      }
      
      const updatedLineItem = await tx.billLineItem.update({
        where: { id: lineItemId },
        data: {
          isVoided: true,
          voidReason: reason,
          voidedAt: new Date(),
          voidedById: userId
        }
      });
      
      // Recalculate bill totals
      const activeLineItems = await tx.billLineItem.findMany({
        where: { billId: lineItem.billId, isVoided: false }
      });
      
      const newTotal = activeLineItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const newPatientPayable = activeLineItems.reduce((sum, item) => sum + item.patientPayableAmount, 0);
      
      const bill = await tx.bill.findUnique({ where: { id: lineItem.billId } });
      
      const updatedBill = await tx.bill.update({
        where: { id: lineItem.billId },
        data: {
          totalAmount: newTotal,
          patientPayable: newPatientPayable,
          balance: newPatientPayable - (bill?.paidAmount || 0)
        }
      });
      
      return { lineItem: updatedLineItem, billId: lineItem.billId };
    });
  }

  async getStatistics(dateFrom?: Date, dateTo?: Date) {
    const startDate = dateFrom || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = dateTo || new Date();
    
    const where = {
      billDate: { gte: startDate, lte: endDate }
    };
    
    const [
      totalBills,
      totalAmount,
      totalPaid,
      totalPending,
      byPaymentMode,
      byStatus
    ] = await Promise.all([
      prisma.bill.count({ where }),
      prisma.bill.aggregate({ where, _sum: { totalAmount: true } }),
      prisma.bill.aggregate({ where, _sum: { paidAmount: true } }),
      prisma.bill.count({ where: { ...where, status: { in: ['pending', 'partial'] as BillStatus[] } } }),
      prisma.bill.groupBy({
        by: ['paymentMode'],
        where,
        _count: { id: true },
        _sum: { totalAmount: true, paidAmount: true }
      }),
      prisma.bill.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
        _sum: { totalAmount: true, paidAmount: true }
      })
    ]);
    
    return {
      period: {
        start: startDate,
        end: endDate,
        type: 'custom'
      },
      summary: {
        totalBills,
        totalAmount: totalAmount._sum.totalAmount || 0,
        totalPaid: totalPaid._sum.paidAmount || 0,
        totalPending,
        collectionRate: totalAmount._sum.totalAmount ?
          ((totalPaid._sum.paidAmount || 0) / totalAmount._sum.totalAmount) * 100 : 0
      },
      byPaymentMode,
      byStatus
    };
  }

  async getLineItems(billId: string) {
    return prisma.billLineItem.findMany({
      where: { billId, isVoided: false },
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
    });
  }

  async applyWaiver(billId: string, waiverId: string) {
    return prisma.$transaction(async (tx) => {
      const waiver = await tx.patientWaiver.findUnique({
        where: { id: waiverId },
        include: { bill: true }
      });
      
      if (!waiver) {
        throw new Error('Waiver not found');
      }
      
      if (waiver.status !== 'approved') {
        throw new Error('Only approved waivers can be applied');
      }
      
      if (waiver.billId !== billId) {
        throw new Error('Waiver does not belong to this bill');
      }
      
      const bill = await tx.bill.findUnique({ where: { id: billId } });
      
      if (!bill) {
        throw new Error('Bill not found');
      }
      
      const newWaiverAmount = (bill.waiverAmount || 0) + waiver.amountApproved;
      const newPatientPayable = bill.patientPayable - waiver.amountApproved;
      const newBalance = newPatientPayable - bill.paidAmount;
      
      const updatedBill = await tx.bill.update({
        where: { id: billId },
        data: {
          waiverAmount: newWaiverAmount,
          patientPayable: newPatientPayable,
          balance: newBalance,
          status: newBalance <= 0 ? 'paid' : bill.status
        }
      });
      
      if (bill.attendanceId) {
        await tx.attendance.update({
          where: { id: bill.attendanceId },
          data: {
            outstandingBalance: newBalance
          }
        });
      }
      
      return updatedBill;
    });
  }

  private generateBillNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `BILL-${year}${month}${day}-${random}`;
  }
}