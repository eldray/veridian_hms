import { PurchaseInvoiceRepository } from './purchaseInvoice.repository';
import { 
  CreatePurchaseInvoiceDTO, 
  UpdatePurchaseInvoiceDTO, 
  PurchaseInvoiceStats 
} from './purchaseInvoice.types';

export class PurchaseInvoiceService {
  private invoiceRepository: PurchaseInvoiceRepository;

  constructor(invoiceRepository?: PurchaseInvoiceRepository) {
    this.invoiceRepository = invoiceRepository || new PurchaseInvoiceRepository();
  }

  async getAllInvoices(filters: {
    supplierName?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    return this.invoiceRepository.findAll(filters);
  }

  async getInvoiceById(id: string) {
    return this.invoiceRepository.findById(id);
  }

  async createInvoice(data: CreatePurchaseInvoiceDTO, createdById: string) {
    // Check for duplicate invoice number
    const existingInvoice = await this.invoiceRepository.findByInvoiceNumber(data.invoiceNumber);
    
    if (existingInvoice) {
      throw new Error('Invoice number already exists');
    }

    return this.invoiceRepository.create(data, createdById);
  }

  async updateInvoice(id: string, data: UpdatePurchaseInvoiceDTO) {
    return this.invoiceRepository.update(id, data);
  }

  async deleteInvoice(id: string) {
    return this.invoiceRepository.delete(id);
  }

  async getSuppliers() {
    return this.invoiceRepository.getSuppliers();
  }

  async getInvoiceStats(filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<PurchaseInvoiceStats> {
    return this.invoiceRepository.getStats(filters);
  }
}