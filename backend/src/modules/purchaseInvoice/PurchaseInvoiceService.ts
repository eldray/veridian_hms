import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { PurchaseInvoiceRepository } from './PurchaseInvoiceRepository';
import { CreatePurchaseInvoiceDTO, UpdatePurchaseInvoiceDTO, PurchaseInvoiceStats } from './PurchaseInvoiceTypes';

export class PurchaseInvoiceService extends BaseService {
  private repo: PurchaseInvoiceRepository;

  constructor(prisma: PrismaClient) {
    super('PurchaseInvoiceService');
    this.repo = new PurchaseInvoiceRepository(prisma);
  }

  async getAllInvoices(filters: any) {
    this.logInfo('Fetching purchase invoices', { filters });
    return this.repo.findAll(filters);
  }

  async getInvoiceById(id: string) {
    this.logDebug('Fetching purchase invoice by ID', { id });
    const invoice = await this.repo.findByIdWithDetails(id);
    if (!invoice) throw new Error('Purchase invoice not found');
    return invoice;
  }

  private assertInvoiceTotalMatchesItems(totalAmount: number, items: Array<{ quantity: number; unitCost: number }>) {
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      throw new Error('Invoice total must be a valid non-negative amount');
    }
    const calculatedTotal = items.reduce((sum, item) =>
      sum + item.quantity * Math.round(Number(item.unitCost) * 100) / 100, 0);
    if (Math.abs(Math.round(totalAmount * 100) - Math.round(calculatedTotal * 100)) > 0) {
      throw new Error(`Invoice total does not match the item lines. Expected ${calculatedTotal.toFixed(2)}.`);
    }
  }

  async createInvoice(data: CreatePurchaseInvoiceDTO, createdById: string) {
    this.logInfo('Creating purchase invoice', { supplier: data.supplierName, amount: data.totalAmount });
    
    const existing = await this.repo.getModel().findUnique({ where: { invoiceNumber: data.invoiceNumber } });
    if (existing) throw new Error('Invoice number already exists');

    const hasDepartment = Boolean(data.receivedAtDepartmentId);
    const hasWard = Boolean(data.receivedAtWardId);
    if (hasDepartment === hasWard) throw new Error('Select exactly one receiving location: a department/store or a ward');
    if (!data.invoiceItems || data.invoiceItems.length === 0) throw new Error('At least one stock item is required on a purchase invoice');
    const seenStockItems = new Set<string>();
    for (const item of data.invoiceItems) {
      if (!item.stockItemId) throw new Error('Every invoice line must identify a stock item');
      if (seenStockItems.has(item.stockItemId)) throw new Error('A stock item can appear only once per invoice; combine duplicate lines');
      seenStockItems.add(item.stockItemId);
      if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new Error('Purchase quantities must be positive whole numbers');
      if (!Number.isFinite(item.unitCost) || item.unitCost < 0) throw new Error('Unit cost must be a valid non-negative amount');
    }
    this.assertInvoiceTotalMatchesItems(data.totalAmount, data.invoiceItems);

    return this.repo.create(data, createdById);
  }

  async updateInvoice(id: string, data: UpdatePurchaseInvoiceDTO) {
    this.logInfo('Updating purchase invoice', { id });
    const existing = await this.repo.findByIdWithDetails(id);
    if (!existing) throw new Error('Purchase invoice not found');

    // Invoice lines are immutable after receipt because they have already
    // generated stock batches, location balances and ledger transactions.
    // Reject a changed total instead of allowing the header to diverge from
    // the original received quantities and unit costs.
    const originalItems = (existing.InvoiceItem || []).map((item: any) => ({
      quantity: Number(item.quantity),
      unitCost: Number(item.unitCost),
    }));
    const originalTotal = originalItems.reduce((sum: number, item: any) => sum + item.quantity * item.unitCost, 0);
    if (data.totalAmount !== undefined &&
        Math.round(Number(data.totalAmount) * 100) !== Math.round(originalTotal * 100)) {
      throw new Error(`Invoice total cannot be changed without changing the received stock lines. Original total: ${originalTotal.toFixed(2)}.`);
    }
    if (data.supplierName !== undefined && !String(data.supplierName).trim()) {
      throw new Error('Supplier name cannot be empty');
    }
    if (data.invoiceDate !== undefined && !Number.isFinite(new Date(data.invoiceDate).getTime())) {
      throw new Error('Invoice date is invalid');
    }

    const updateData: any = {};
    if (data.supplierName !== undefined) updateData.supplierName = String(data.supplierName).trim();
    if (data.invoiceDate) updateData.invoiceDate = new Date(data.invoiceDate);
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.repo.update(id, updateData);
  }

  async deleteInvoice(id: string, performedById?: string) {
    this.logInfo('Attempting to delete purchase invoice', { id });
    return this.repo.deleteSafely(id, performedById); // Stock reversal and ledger audit share one transaction.
  }

  async getSuppliers() {
    const suppliers = await this.repo.getModel().findMany({ distinct: ['supplierName'], select: { supplierName: true }, orderBy: { supplierName: 'asc' } });
    return suppliers.map((i: any) => i.supplierName).filter(Boolean);
  }

  async getInvoiceStats(filters: any): Promise<PurchaseInvoiceStats> {
    this.logInfo('Fetching purchase invoice stats', { filters });
    return this.repo.getStats(filters);
  }
}