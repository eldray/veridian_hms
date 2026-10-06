import { PrismaClient, BillStatus } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { BillingRepository } from './BillingRepository';
import { CreateBillDTO, AddPaymentDTO, UpdateBillStatusDTO, BillFilters } from './BillingTypes';
import { getCounterService } from '../../services/CounterService';

export class BillingService extends BaseService {
  private repository: BillingRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('BillingService'); // ✅ Extends BaseService
    this.prisma = prisma;
    this.repository = new BillingRepository(prisma);
  }

  async getBills(filters: BillFilters) {
    this.logInfo('Fetching bills', { filters });
    return this.repository.findAll(filters);
  }

  async getBillById(id: string) {
    this.logDebug('Fetching bill by ID', { id });
    const bill = await this.repository.findById(id);
    if (!bill) throw new Error('Bill not found');
    return bill;
  }

  async createBill(data: CreateBillDTO, userId: string) {
    this.logInfo('Creating new bill', { patientId: data.patientId, paymentMode: data.paymentMode });

    let totalAmount = 0;
    const itemsWithPrices = [];

    for (const item of data.items) {
      // ✅ FIXED: Fetch actual service details instead of hardcoding 'consultation'
      const service = await this.prisma.serviceCatalog.findUnique({
        where: { id: item.serviceId },
        select: { name: true, code: true, serviceType: true }
      });

      if (!service) throw new Error(`Service catalog item not found for ID: ${item.serviceId}`);

      const price = await this.repository.getServicePrice(item.serviceId, data.paymentMode, data.corporateAccountId);
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
        description: `${service.name} (${service.code})`, // ✅ Uses actual name
        serviceType: service.serviceType // ✅ Uses actual serviceType
      });
    }
    
    const billData = {
      patientId: data.patientId,
      attendanceId: data.attendanceId,
      paymentMode: data.paymentMode,
      billNumber: getCounterService().nextBillNumber(), // ✅ FIXED: Uses CounterService
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
    this.logInfo('Adding payment to bill', { billId: id, amount: data.amount });
    const bill = await this.repository.findById(id);
    if (!bill) throw new Error('Bill not found');
    if (bill.status === 'paid') throw new Error('Cannot add payment to a fully paid bill');

    // ✅ FIXED: Safely compare Decimals
    const balance = parseFloat(bill.balance.toString());
    if (data.amount > balance) throw new Error(`Payment amount (${data.amount}) exceeds bill balance (${balance})`);

    return this.repository.addPayment(id, { ...data, userId });
  }

  async updateBillStatus(id: string, data: UpdateBillStatusDTO, userId: string) {
    this.logInfo('Updating bill status', { billId: id, status: data.status });
    const bill = await this.repository.findById(id);
    if (!bill) throw new Error('Bill not found');
    return this.repository.updateStatus(id, data.status, userId);
  }

  async getStatistics(period: string) {
    this.logInfo('Fetching billing statistics', { period });
    return this.repository.getStatistics(period);
  }

  async getCollections(dateFrom: Date, dateTo: Date) {
    this.logInfo('Fetching payment collections', { dateFrom, dateTo });
    const payments = await this.repository.findCollections(dateFrom, dateTo);

    const collectionPayments = payments.map((payment) => {
      const lineItems = payment.Bill.BillLineItem;
      const payableAmounts = lineItems.map((item) => Number(item.patientPayableAmount));
      const payableTotal = payableAmounts.reduce((sum, amount) => sum + amount, 0);
      const lineTotals = lineItems.map((item) => Number(item.lineTotal));
      const allocationBasis = payableTotal > 0 ? payableAmounts : lineTotals;
      const allocationTotal = allocationBasis.reduce((sum, amount) => sum + amount, 0);
      const paymentCents = Math.round(Number(payment.amount) * 100);
      const itemAmounts = allocationTotal > 0
        ? allocationBasis.map((amount) => Math.floor(paymentCents * amount / allocationTotal))
        : [];
      const remainingCents = allocationTotal > 0
        ? paymentCents - itemAmounts.reduce((sum, amount) => sum + amount, 0)
        : 0;
      const remainderOrder = allocationTotal > 0
        ? allocationBasis
            .map((amount, index) => ({
              index,
              remainder: paymentCents * amount / allocationTotal - itemAmounts[index]
            }))
            .sort((a, b) => b.remainder - a.remainder)
        : [];
      for (let index = 0; index < remainingCents; index += 1) {
        itemAmounts[remainderOrder[index].index] += 1;
      }

      return {
        id: payment.id,
        transactionDate: payment.transactionDate,
        amount: Number(payment.amount),
        paymentMethod: payment.paymentMethod,
        reference: payment.reference,
        notes: payment.notes,
        collector: payment.User,
        bill: {
          id: payment.Bill.id,
          billNumber: payment.Bill.billNumber,
          patient: payment.Bill.Patient
        },
        items: allocationTotal > 0
          ? lineItems.map((item, index) => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                serviceCategory: item.serviceCatalog?.serviceCategory || 'other',
                serviceType: item.serviceType,
                amount: itemAmounts[index] / 100
              }))
          : [{
              id: payment.id,
              description: 'Uncategorized collection',
              quantity: 1,
              serviceCategory: 'other',
              serviceType: 'miscellaneous',
              amount: paymentCents / 100
            }]
      };
    });

    return {
      totalAmount: Math.round(collectionPayments.reduce((sum, payment) => sum + payment.amount, 0) * 100) / 100,
      paymentCount: collectionPayments.length,
      payments: collectionPayments
    };
  }

  async getLineItems(billId: string) {
    this.logDebug('Fetching line items for bill', { billId });
    const bill = await this.repository.findById(billId);
    if (!bill) throw new Error('Bill not found');
    return this.repository.getLineItems(billId);
  }

  async voidLineItem(lineItemId: string, userId: string, reason: string) {
    this.logInfo('Voiding bill line item', { lineItemId, reason });
    return this.repository.voidLineItem(lineItemId, userId, reason);
  }

  async applyWaiver(billId: string, waiverId: string) {
    this.logInfo('Applying waiver to bill', { billId, waiverId });
    const bill = await this.repository.findById(billId);
    if (!bill) throw new Error('Bill not found');
    return this.repository.applyWaiver(billId, waiverId);
  }
}