// InvoiceService.ts
import { InvoiceRepository } from './InvoiceRepository';
import { CreateInvoiceDTO, UpdateInvoiceDTO, InvoiceStats } from './InvoiceTypes';

export class InvoiceService {
  private invoiceRepository: InvoiceRepository;

  constructor(invoiceRepository?: InvoiceRepository) {
    this.invoiceRepository = invoiceRepository || new InvoiceRepository();
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

  async createInvoice(data: CreateInvoiceDTO, createdById: string) {
    // Check for duplicate invoice number
    const existingInvoice = await this.invoiceRepository.findByInvoiceNumber(data.invoiceNumber);
    
    if (existingInvoice) {
      throw new Error('Invoice number already exists');
    }

    return this.invoiceRepository.create(data, createdById);
  }

  async updateInvoice(id: string, data: UpdateInvoiceDTO) {
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
  }): Promise<InvoiceStats> {
    return this.invoiceRepository.getStats(filters);
  }
}
