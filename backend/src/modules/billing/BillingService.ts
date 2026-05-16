/**
 * Billing Module Service
 * Business logic for billing management
 */

import { PrismaClient } from '@prisma/client';
import { BillingRepository } from './BillingRepository';
import { CreateBillDTO, AddPaymentDTO, UpdateBillStatusDTO, BillFilters } from './BillingTypes';

export class BillingService {
  private repository: BillingRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new BillingRepository(prisma);
  }

  async getBills(filters: BillFilters) {
    return this.repository.findAll(filters);
  }

  async getBillById(id: string) {
    const bill = await this.repository.findById(id);
    if (!bill) {
      throw new Error('Bill not found');
    }
    return bill;
  }

  async createBill(data: CreateBillDTO, userId: string) {
    const totalCashPrice = data.items.reduce((sum, item) => sum + (item.quantity * 100), 0);
    
    const billData = {
      patientId: data.patientId,
      attendanceId: data.attendanceId,
      paymentMode: data.paymentMode,
      billNumber: `BIL-${Date.now()}`,
      subtotal: totalCashPrice,
      taxAmount: 0,
      totalAmount: totalCashPrice,
      insuranceCovered: 0,
      patientPayable: totalCashPrice,
      paidAmount: 0,
      balance: totalCashPrice,
      status: 'pending' as any,
      createdById: userId
    };

    const items = data.items.map(item => ({
      serviceCatalogId: item.serviceId,
      quantity: item.quantity,
      unitPrice: 100,
      pricingBasis: data.paymentMode,
      lineTotal: item.quantity * 100,
      insuranceCoveredAmount: 0,
      patientPayableAmount: item.quantity * 100,
      discount: 0,
      description: `Service ${item.serviceId}`
    }));

    return this.repository.create(billData, items);
  }

  async addPaymentToBill(id: string, data: AddPaymentDTO, userId: string) {
    return this.repository.addPayment(id, { ...data, userId });
  }

  async updateBillStatus(id: string, data: UpdateBillStatusDTO, userId: string) {
    return this.repository.updateStatus(id, data.status, userId);
  }

  async getStatistics(period: string) {
    return this.repository.getStatistics(period);
  }

  async getLineItems(billId: string) {
    return this.repository.getLineItems(billId);
  }

  async voidLineItem(lineItemId: string, userId: string, reason: string) {
    return this.repository.voidLineItem(lineItemId, userId, reason);
  }

  async applyWaiver(billId: string, waiverId: string) {
    return this.repository.applyWaiver(billId, waiverId);
  }
}
