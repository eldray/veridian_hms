import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { BillRepository } from './BillRepository';
import { BillWithRelations, CreateBillInput, UpdateBillInput, BillFilter, AddPaymentInput } from './BillTypes';

export class BillService extends BaseService {
  private billRepository: BillRepository;

  constructor(prisma: PrismaClient) {
    super('BillService'); // ✅ Extends BaseService for standardized logging
    this.billRepository = new BillRepository(prisma);
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
      if (item.unitPrice < 0) throw new Error('Unit price cannot be negative');
    }

    return this.billRepository.create(data, createdBy);
  }

  async updateBill(id: string, data: UpdateBillInput) {
    this.logInfo('Updating bill', { id });
    const existing = await this.billRepository.findById(id);
    if (!existing) throw new Error('Bill not found');
    if (data.totalAmount !== undefined && data.totalAmount < 0) throw new Error('Total amount cannot be negative');
    return this.billRepository.update(id, data);
  }

  async deleteBill(id: string) {
    this.logInfo('Deleting bill', { id });
    const existing = await this.billRepository.findById(id);
    if (!existing) throw new Error('Bill not found');
    return this.billRepository.delete(id);
  }

  async addPayment(billId: string, paymentData: AddPaymentInput, receivedById: string) {
    this.logInfo('Adding payment to bill', { billId, amount: paymentData.amount });
    const bill = await this.billRepository.findById(billId);
    if (!bill) throw new Error('Bill not found');
    if (paymentData.amount <= 0) throw new Error('Payment amount must be greater than 0');
    if (bill.status === 'paid') throw new Error('Cannot add payment to a fully paid bill');
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