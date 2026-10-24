import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { BillRepository } from './BillRepository';
import { BillingService } from '../billing/BillingService';
import { BillWithRelations, CreateBillInput, UpdateBillInput, BillFilter, AddPaymentInput } from './BillTypes';

export class BillService extends BaseService {
  private billRepository: BillRepository;
  private billingService: BillingService;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('BillService'); // ✅ Extends BaseService for standardized logging
    this.prisma = prisma;
    this.billRepository = new BillRepository(prisma);
    this.billingService = new BillingService(prisma);
  }

  async getAllBills(filters: BillFilter, page: number = 1, limit: number = 50) {
    this.logInfo('Fetching bills', { filters, page, limit });
    return this.billRepository.findAll({ ...filters, page, limit });
  }

  async getBillById(id: string): Promise<BillWithRelations | null> {
    this.logDebug('Fetching bill by ID', { id });
    const bill = await this.billRepository.findById(id);
    if (!bill) throw new Error('Bill not found');
    return bill;
  }

  async createBill(data: CreateBillInput, createdBy: string) {
    this.logInfo('Creating new bill', { patientId: data.patientId, itemCount: data.items.length });
    if (!data.items || data.items.length === 0) throw new Error('At least one line item is required');

    for (const item of data.items) {
      if (item.quantity <= 0) throw new Error('Quantity must be greater than 0');
      if (item.unitPrice !== undefined && item.unitPrice < 0) throw new Error('Unit price cannot be negative');
    }

    // Both bill-creation endpoints must use the same server-side tariff and payer rules.
    // Never trust a price supplied by the browser for cash, NHIS, or private insurance.
    return this.billingService.createBill({
      patientId: data.patientId,
      attendanceId: data.attendanceId!,
      paymentMode: data.paymentMode ?? 'cash',
      insuranceProviderId: data.insuranceProviderId,
      corporateAccountId: data.corporateAccountId,
      items: data.items.map((item) => ({
        serviceId: item.serviceCatalogId,
        quantity: item.quantity
      }))
    }, createdBy);
  }

  async updateBill(id: string, data: UpdateBillInput) {
    this.logInfo('Updating bill', { id });
    const existing = await this.billRepository.findById(id);
    if (!existing) throw new Error('Bill not found');
    // Financial totals and status are derived from line items, payments, waivers and cancellations.
    // They must not be overwritten through the general-purpose bill update endpoint.
    const unsafeFields = ['totalAmount', 'paidAmount', 'status', 'balance', 'patientPayable', 'insuranceCovered', 'waiverAmount', 'discount'];
    const attemptedFinancialEdit = unsafeFields.find((field) => Object.prototype.hasOwnProperty.call(data as object, field));
    if (attemptedFinancialEdit) {
      throw new Error(`Cannot directly edit bill financial field "${attemptedFinancialEdit}". Use the appropriate billing workflow.`);
    }
    return this.billRepository.update(id, { notes: data.notes });
  }

  async deleteBill(id: string) {
    this.logInfo('Deleting bill', { id });
    const existing = await this.billRepository.findById(id);
    if (!existing) throw new Error('Bill not found');
    if ((existing.Payment?.length ?? 0) > 0 || ['paid', 'partial'].includes(existing.status)) {
      throw new Error('A bill with payment history cannot be deleted. Preserve the audit trail and use the approved cancellation or adjustment workflow.');
    }
    return this.billRepository.delete(id);
  }

  async addPayment(billId: string, paymentData: AddPaymentInput, receivedById: string) {
    this.logInfo('Adding payment to bill', { billId, amount: paymentData.amount });
    const bill = await this.billRepository.findById(billId);
    if (!bill) throw new Error('Bill not found');
    if (paymentData.amount <= 0) throw new Error('Payment amount must be greater than 0');
    if (paymentData.paymentMethod !== 'mobile_money') {
      const momoIntentModel = (this.prisma as any).momoPaymentIntent;
      const pendingMomo = momoIntentModel?.findFirst
        ? await momoIntentModel.findFirst({
            where: { billId, status: { in: ['initiating', 'pending'] } },
            select: { id: true }
          })
        : null;
      if (pendingMomo) throw new Error('A Mobile Money payment is still pending for this bill. Verify or resolve it before recording another payment.');
    }
    // Resolve idempotent retries in the repository before rejecting a now-paid bill.
    if (!paymentData.idempotencyKey && bill.status === 'paid') {
      throw new Error('Cannot add payment to a fully paid bill');
    }
    return this.billRepository.addPayment(billId, paymentData, receivedById);
  }

  async voidLineItem(lineItemId: string, userId: string, reason: string) {
    this.logInfo('Voiding line item', { lineItemId, reason });
    if (!reason || reason.trim().length === 0) throw new Error('Void reason is required');
    return this.billRepository.voidLineItem(lineItemId, userId, reason);
  }

  async getStatistics(dateFrom?: Date, dateTo?: Date) {
    this.logInfo('Fetching bill statistics', { dateFrom, dateTo });
    return this.billRepository.getStatistics(dateFrom, dateTo);
  }

  async getLineItems(billId: string) {
    this.logDebug('Fetching line items for bill', { billId });
    const bill = await this.billRepository.findById(billId);
    if (!bill) throw new Error('Bill not found');
    return this.billRepository.getLineItems(billId);
  }

  async applyWaiver(billId: string, waiverId: string) {
    this.logInfo('Applying waiver to bill', { billId, waiverId });
    const bill = await this.billRepository.findById(billId);
    if (!bill) throw new Error('Bill not found');
    return this.billRepository.applyWaiver(billId, waiverId);
  }

  async getBreakdown(billId: string) {
    this.logDebug('Building billing breakdown for bill', { billId });
    return this.billRepository.getBreakdown(billId);
  }

  // Report reuses the breakdown shape (grouped line items + totals).
  async getReport(billId: string) {
    this.logDebug('Generating bill report', { billId });
    return this.billRepository.getBreakdown(billId);
  }

  async generateFromEncounter(encounterId: string, createdBy: string) {
    this.logInfo('Generating bill from encounter', { encounterId });
    return this.billRepository.generateFromEncounter(encounterId, createdBy);
  }
}