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

  async createInvoice(data: CreatePurchaseInvoiceDTO, createdById: string) {
    this.logInfo('Creating purchase invoice', { supplier: data.supplierName, amount: data.totalAmount });
    
    const existing = await this.repo.getModel().findUnique({ where: { invoiceNumber: data.invoiceNumber } });
    if (existing) throw new Error('Invoice number already exists');

    return this.repo.create(data, createdById);
  }

  async updateInvoice(id: string, data: UpdatePurchaseInvoiceDTO) {
    this.logInfo('Updating purchase invoice', { id });
    const existing = await this.repo.findByIdWithDetails(id);
    if (!existing) throw new Error('Purchase invoice not found');

    const updateData: any = {};
    if (data.supplierName) updateData.supplierName = data.supplierName;
    if (data.invoiceDate) updateData.invoiceDate = new Date(data.invoiceDate);
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.repo.update(id, updateData);
  }

  async deleteInvoice(id: string) {
    this.logInfo('Attempting to delete purchase invoice', { id });
    return this.repo.deleteSafely(id); // ✅ Uses the new safe delete logic
  }

  async getSuppliers() {
    const suppliers = await this.repo.getModel().findMany({ distinct: ['supplierName'], select: { supplierName: true }, where: { supplierName: { not: null } }, orderBy: { supplierName: 'asc' } });
    return suppliers.map((i: any) => i.supplierName).filter(Boolean);
  }

  async getInvoiceStats(filters: any): Promise<PurchaseInvoiceStats> {
    this.logInfo('Fetching purchase invoice stats', { filters });
    return this.repo.getStats(filters);
  }
}