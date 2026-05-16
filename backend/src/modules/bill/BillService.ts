import { BillRepository } from './BillRepository';
import { 
  BillWithRelations, 
  CreateBillInput, 
  UpdateBillInput, 
  BillFilter,
  AddPaymentInput
} from './BillTypes';

export class BillService {
  private billRepository: BillRepository;

  constructor() {
    this.billRepository = new BillRepository();
  }

  async getAllBills(filters: BillFilter, page: number = 1, limit: number = 50) {
    return this.billRepository.findAll(filters, page, limit);
  }

  async getBillById(id: string): Promise<BillWithRelations | null> {
    const bill = await this.billRepository.findById(id);
    
    if (!bill) {
      throw new Error('Bill not found');
    }
    
    return bill;
  }

  async createBill(data: CreateBillInput) {
    // Validate items
    if (!data.items || data.items.length === 0) {
      throw new Error('At least one line item is required');
    }

    for (const item of data.items) {
      if (item.quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }
      if (item.unitPrice < 0) {
        throw new Error('Unit price cannot be negative');
      }
    }

    return this.billRepository.create(data);
  }

  async updateBill(id: string, data: UpdateBillInput) {
    const existing = await this.billRepository.findById(id);
    
    if (!existing) {
      throw new Error('Bill not found');
    }

    if (data.totalAmount !== undefined && data.totalAmount < 0) {
      throw new Error('Total amount cannot be negative');
    }

    return this.billRepository.update(id, data);
  }

  async deleteBill(id: string) {
    const existing = await this.billRepository.findById(id);
    
    if (!existing) {
      throw new Error('Bill not found');
    }

    return this.billRepository.delete(id);
  }

  async addPayment(billId: string, paymentData: AddPaymentInput) {
    const bill = await this.billRepository.findById(billId);
    
    if (!bill) {
      throw new Error('Bill not found');
    }

    if (paymentData.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    if (bill.status === 'paid') {
      throw new Error('Cannot add payment to a fully paid bill');
    }

    return this.billRepository.addPayment(billId, paymentData);
  }

  async voidLineItem(lineItemId: string, userId: string, reason: string) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Void reason is required');
    }

    return this.billRepository.voidLineItem(lineItemId, userId, reason);
  }

  async getStatistics(dateFrom?: Date, dateTo?: Date) {
    return this.billRepository.getStatistics(dateFrom, dateTo);
  }

  async getLineItems(billId: string) {
    const bill = await this.billRepository.findById(billId);
    
    if (!bill) {
      throw new Error('Bill not found');
    }

    return this.billRepository.getLineItems(billId);
  }

  async applyWaiver(billId: string, waiverId: string) {
    const bill = await this.billRepository.findById(billId);
    
    if (!bill) {
      throw new Error('Bill not found');
    }

    return this.billRepository.applyWaiver(billId, waiverId);
  }
}
