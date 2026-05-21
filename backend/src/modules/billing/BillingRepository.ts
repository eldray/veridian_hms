/**
 * Billing Module Repository
 * Data access layer for billing management
 */

import { PrismaClient, BillStatus, PaymentMode, PaymentMethod } from '@prisma/client';
import { CreateBillDTO, AddPaymentDTO, BillFilters } from './BillingTypes';
import { getCounterService } from '../../services/CounterService';

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
          CorporateAccount: {
            select: {
              id: true,
              companyName: true,
              creditLimit: true,
              currentBalance: true
            }
          },
          Payment: true
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
        CorporateAccount: {
          select: {
            id: true,
            companyName: true,
            creditLimit: true,
            currentBalance: true,
            discountPercentage: true
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
        },
        User_Bill_createdByIdToUser: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      }
    });
  }

  async create(data: any, items: any[]) {
    return this.prisma.$transaction(async (tx) => {
      // ✅ VALIDATION FIRST
      if (data.paymentMode === 'nhis' || data.paymentMode === 'private_insurance') {
        if (!data.insuranceProviderId) {
          throw new Error('Insurance Provider ID is required');
        }
        const provider = await tx.insuranceProvider.findUnique({
          where: { id: data.insuranceProviderId }
        });
        if (!provider || !provider.isActive) {
          throw new Error('Invalid or inactive insurance provider');
        }
      }
  
      if (data.paymentMode === 'corporate') {
        if (!data.corporateAccountId) {
          throw new Error('Corporate Account ID is required');
        }
        const corporate = await tx.corporateAccount.findUnique({
          where: { id: data.corporateAccountId }
        });
        if (!corporate || !corporate.isActive) {
          throw new Error('Invalid or inactive corporate account');
        }
      }
  
      const bill = await tx.bill.create({
        data,
        include: {
          Patient: { select: { surname: true, otherNames: true, folderNumber: true, contact: true } },
          Attendance: { select: { attendanceNumber: true, attendanceType: true } },
          CorporateAccount: true
        }
      });
  
      for (const item of items) {
        await tx.billLineItem.create({ data: item });
      }
  
      // Recalculate bill totals
      const lineItems = await tx.billLineItem.findMany({
        where: { billId: bill.id, isVoided: false }
      });
  
      const totalAmount = lineItems.reduce((sum, i) => sum + i.lineTotal, 0);
      let patientPayable = totalAmount;
      let insuranceCovered = 0;
      let corporateCovered = 0;
  
      // ✅ CALCULATE COVERAGE BASED ON PAYMENT MODE
      if (data.paymentMode === 'nhis' && data.insuranceProviderId) {
        const provider = await tx.insuranceProvider.findUnique({
          where: { id: data.insuranceProviderId }
        });
        if (provider) {
          insuranceCovered = totalAmount * (provider.coveragePercentage / 100);
          patientPayable = totalAmount - insuranceCovered;
        }
      } 
      else if (data.paymentMode === 'private_insurance' && data.insuranceProviderId) {
        const provider = await tx.insuranceProvider.findUnique({
          where: { id: data.insuranceProviderId }
        });
        if (provider) {
          insuranceCovered = totalAmount * (provider.coveragePercentage / 100);
          patientPayable = totalAmount - insuranceCovered;
        }
      }
      else if (data.paymentMode === 'corporate' && data.corporateAccountId) {
        const corporate = await tx.corporateAccount.findUnique({
          where: { id: data.corporateAccountId }
        });
        if (corporate) {
          const discount = totalAmount * (corporate.discountPercentage / 100);
          corporateCovered = totalAmount - discount;
          patientPayable = 0;
          
          await tx.corporateAccount.update({
            where: { id: data.corporateAccountId },
            data: { currentBalance: { increment: corporateCovered } }
          });
        }
      }
  
      const updatedBill = await tx.bill.update({
        where: { id: bill.id },
        data: {
          totalAmount,
          patientPayable,
          balance: patientPayable,
          subtotal: totalAmount,
          insuranceCovered,
          waiverAmount: 0
        },
        include: {
          Patient: true,
          Attendance: true,
          BillLineItem: true,
          CorporateAccount: true
        }
      });
  
      return updatedBill;
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
      } else if (newPaidAmount > 0 && newPaidAmount < bill.totalAmount) {
        newStatus = 'partial';
      }

      const updatedBill = await tx.bill.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
          updatedAt: new Date()
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
          },
          CorporateAccount: true
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

      // Update attendance outstanding balance if linked
      if (bill.attendanceId) {
        await tx.attendance.update({
          where: { id: bill.attendanceId },
          data: { outstandingBalance: newBalance }
        });
      }

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
        },
        CorporateAccount: true
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

    const [totalBills, totalAmount, totalPaid, totalPending, byPaymentMode, byStatus, corporateTotals] = await Promise.all([
      this.prisma.bill.count({ where }),
      this.prisma.bill.aggregate({ where, _sum: { totalAmount: true } }),
      this.prisma.bill.aggregate({ where, _sum: { paidAmount: true } }),
      this.prisma.bill.count({ where: { ...where, status: { in: ['pending', 'partial'] as BillStatus[] } } }),
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
      }),
      this.prisma.bill.aggregate({
        where: { ...where, paymentMode: 'corporate' },
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
      byStatus,
      corporateSummary: {
        totalCorporateBills: corporateTotals._sum.totalAmount || 0,
        totalCorporatePaid: corporateTotals._sum.paidAmount || 0
      }
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
      select: { 
        id: true,
        billNumber: getCounterService().nextBillNumber(),
        status: true, 
        totalAmount: true, 
        paidAmount: true, 
        balance: true,
        paymentMode: true,
        corporateAccountId: true,
        insuranceProviderId: true
      }
    });

    return {
      bill,
      lineItems,
      summary: {
        totalItems: lineItems.length,
        subtotal: lineItems.reduce((sum, i) => sum + (i.lineTotal || 0), 0),
        insuranceCovered: lineItems.reduce((sum, i) => sum + (i.insuranceCoveredAmount || 0), 0),
        patientPayable: lineItems.reduce((sum, i) => sum + (i.patientPayableAmount || 0), 0)
      }
    };
  }

  async voidLineItem(lineItemId: string, userId: string, reason: string) {
    return this.prisma.$transaction(async (tx) => {
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
          voidedAt: new Date(),
          voidedById: userId,
          voidReason: reason
        }
      });

      // Recalculate bill totals
      const activeLineItems = await tx.billLineItem.findMany({
        where: { billId: lineItem.billId, isVoided: false }
      });

      const newTotal = activeLineItems.reduce((sum, i) => sum + i.lineTotal, 0);
      const newPatientPayable = activeLineItems.reduce((sum, i) => sum + i.patientPayableAmount, 0);
      const newBalance = newPatientPayable - (lineItem.bill.paidAmount || 0);

      await tx.bill.update({
        where: { id: lineItem.billId },
        data: {
          totalAmount: newTotal,
          patientPayable: newPatientPayable,
          balance: newBalance,
          status: newBalance <= 0 ? 'paid' : lineItem.bill.status
        }
      });

      return updatedLineItem;
    });
  }

  async applyWaiver(billId: string, waiverId: string) {
    return this.prisma.$transaction(async (tx) => {
      const waiver = await tx.patientWaiver.findUnique({ 
        where: { id: waiverId }, 
        include: { bill: true } 
      });

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
          status: newBalance <= 0 ? 'paid' : bill.status
        },
        include: { Patient: true, Attendance: true, CorporateAccount: true }
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

  async getServicePrice(serviceCatalogId: string, paymentMode: string, corporateAccountId?: string): Promise<number> {
    const service = await this.prisma.serviceCatalog.findUnique({
      where: { id: serviceCatalogId },
      include: { pricing: true }
    });

    if (!service || !service.pricing) {
      return 100; // Default fallback price
    }

    // Return price based on payment mode
    switch (paymentMode) {
      case 'cash':
        return service.pricing.cashPrice;
      case 'nhis':
        return service.pricing.nhisPrice;
      case 'private_insurance':
        return service.pricing.insurancePrice;
        case 'corporate':
          // First check if there's a specific corporate price
          if (service.pricing.corporatePrice > 0) {
            return service.pricing.corporatePrice;
          }
          // Then apply discount to cash price
          if (corporateAccountId) {
            const corporate = await this.prisma.corporateAccount.findUnique({
              where: { id: corporateAccountId }
            });
            if (corporate && corporate.discountPercentage > 0) {
              return service.pricing.cashPrice * (1 - corporate.discountPercentage / 100);
            }
          }
          return service.pricing.cashPrice;
      default:
        return service.pricing.cashPrice;
    }
  }
}