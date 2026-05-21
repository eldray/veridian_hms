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
    // Validate corporate account if payment mode is corporate
    if (data.paymentMode === 'corporate') {
      if (!data.corporateAccountId) {
        throw new Error('Corporate Account ID is required for corporate payment');
      }
      
      // Verify corporate account exists and is active
      const corporate = await this.repository.prisma.corporateAccount.findUnique({
        where: { id: data.corporateAccountId }
      });
      
      if (!corporate) {
        throw new Error('Corporate account not found');
      }
      
      if (!corporate.isActive) {
        throw new Error('Corporate account is not active');
      }
    }

    // Get actual prices from service catalog based on payment mode
    let totalAmount = 0;
    const itemsWithPrices = [];

    for (const item of data.items) {
      const price = await this.repository.getServicePrice(
        item.serviceId, 
        data.paymentMode,
        data.corporateAccountId
      );
      const lineTotal = item.quantity * price;
      totalAmount += lineTotal;
      
      itemsWithPrices.push({
        serviceCatalogId: item.serviceId,
        quantity: item.quantity,
        unitPrice: price,
        pricingBasis: data.paymentMode,
        lineTotal: lineTotal,
        insuranceCoveredAmount: 0,
        patientPayableAmount: lineTotal,
        discount: 0,
        description: `Service ${item.serviceId}`,
        serviceType: 'consultation'
      });
    }
    
    const billData = {
      patientId: data.patientId,
      attendanceId: data.attendanceId,
      paymentMode: data.paymentMode,
      billNumber: `BIL-${Date.now()}`,
      subtotal: totalAmount,
      taxAmount: 0,
      totalAmount: totalAmount,
      insuranceCovered: 0,
      patientPayable: totalAmount,
      paidAmount: 0,
      balance: totalAmount,
      status: 'pending' as any,
      createdById: userId,
      billDate: new Date(),
      insuranceProviderId: data.insuranceProviderId,
      corporateAccountId: data.corporateAccountId
    };

    return this.repository.create(billData, itemsWithPrices);
  }

  async addPaymentToBill(id: string, data: AddPaymentDTO, userId: string) {
    const bill = await this.repository.findById(id);
    if (!bill) {
      throw new Error('Bill not found');
    }

    if (bill.status === 'paid') {
      throw new Error('Cannot add payment to a fully paid bill');
    }

    if (data.amount > bill.balance) {
      throw new Error(`Payment amount (${data.amount}) exceeds bill balance (${bill.balance})`);
    }

    return this.repository.addPayment(id, { ...data, userId });
  }

  async updateBillStatus(id: string, data: UpdateBillStatusDTO, userId: string) {
    const bill = await this.repository.findById(id);
    if (!bill) {
      throw new Error('Bill not found');
    }

    return this.repository.updateStatus(id, data.status, userId);
  }

  async getStatistics(period: string) {
    return this.repository.getStatistics(period);
  }

  async getLineItems(billId: string) {
    const bill = await this.repository.findById(billId);
    if (!bill) {
      throw new Error('Bill not found');
    }
    return this.repository.getLineItems(billId);
  }

  async voidLineItem(lineItemId: string, userId: string, reason: string) {
    return this.repository.voidLineItem(lineItemId, userId, reason);
  }

  async applyWaiver(billId: string, waiverId: string) {
    const bill = await this.repository.findById(billId);
    if (!bill) {
      throw new Error('Bill not found');
    }
    return this.repository.applyWaiver(billId, waiverId);
  }
}