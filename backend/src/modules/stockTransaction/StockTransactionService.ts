import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { StockTransactionRepository } from './StockTransactionRepository';
import { NotFoundError, ValidationError } from '../../utils/errors';

// ✅ Helper to safely convert Prisma Decimal objects to JS numbers for math
const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class StockTransactionService extends BaseService {
  private repo: StockTransactionRepository;

  constructor(prisma: PrismaClient) {
    super('StockTransactionService');
    this.repo = new StockTransactionRepository(prisma);
  }

  async create(data: any) {
    this.logInfo('Creating stock transaction', { stockItemId: data.stockItemId, type: data.transactionType });
    if (!data.stockItemId || !data.transactionType || data.quantity === undefined || data.quantity === null) {
      throw new ValidationError('Stock item ID, transaction type, and quantity are required');
    }
    const quantity = Number(data.quantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new ValidationError('Stock transaction quantity must be a positive whole number');
    }
    const validTypes = ['purchase', 'adjustment', 'requisition', 'sale', 'write_off'];
    if (!validTypes.includes(data.transactionType)) {
      throw new ValidationError(`Invalid transaction type. Must be one of: ${validTypes.join(', ')}`);
    }
    if (data.transactionType === 'write_off' && !String(data.notes || '').trim()) {
      throw new ValidationError('A reason is required for expired, damaged, or otherwise written-off stock');
    }
    const isAdmin = ['admin', 'super_admin'].includes(String(data.role || ''));
    if (!isAdmin && !data.departmentId) throw new ValidationError('Assign this user to a department before recording stock movements');
    if (data.departmentId && data.wardId) throw new ValidationError('Select either a department or a ward, not both');
    if (data.wardId && !isAdmin) {
      // Authorization is enforced by the controller; the service also rejects direct ward writes unless explicitly authorized.
      throw new ValidationError('Only an administrator may select a ward directly');
    }
    data.quantity = quantity;

    return this.repo.createSafely(data);
  }

  async getAll(filters: any) {
    return this.repo.findAllWithFilters(filters);
  }

  async getById(id: string, filters: { departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    const tx = await this.repo.findByIdWithRelations(id, filters);
    if (!tx) throw new NotFoundError('Stock transaction not found');
    return tx;
  }

  async update(id: string, data: any, filters: { departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    this.logInfo('Updating transaction notes', { id });
    const existing = await this.repo.findByIdWithRelations(id, filters);
    if (!existing) throw new Error('Stock transaction not found');
    return this.repo.updateNotes(id, data.notes, data.reference);
  }

  async delete(id: string) {
    this.logInfo('Deleting and reversing transaction', { id });
    return this.repo.deleteSafely(id);
  }

  async getLowStockAlerts(category?: string, filters: { departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    const items = await this.repo.getLowStockItems(category, filters);
    return items.map(item => ({
      id: item.id, name: item.name, category: item.category, drugCode: item.drugCode,
      currentQuantity: item.currentStock, reorderLevel: item.reorderLevel, unit: item.unitOfMeasure,
      shortage: Math.max(0, item.reorderLevel - item.currentStock),
      status: item.currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
    }));
  }

  async getRequisitionTransactions(filters: any) {
    const txs = await this.repo.getRequisitionTransactions(filters);
    return filters.status ? txs.filter((t: any) => t.Requisition?.status === filters.status) : txs;
  }

  // ==========================================
  // REPORTS (Preserved exactly, Fixed Decimal Math)
  // ==========================================

  async getStockValuation(category?: string) {
    const stockItems = await this.repo.getValuationData(category);
    
    // ✅ FIXED: Safely parse Decimals before math
    const totalValue = stockItems.reduce((sum, item) => sum + (toNumber(item.costPrice) * item.currentStock), 0);
    
    const byCategory = stockItems.reduce((acc, item) => {
      const cat = item.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = { count: 0, value: 0, items: [] };
      acc[cat].count++;
      acc[cat].value += (toNumber(item.costPrice) * item.currentStock); // ✅ FIXED
      acc[cat].items.push(item.name);
      return acc;
    }, {} as Record<string, any>);

    return {
      totalItems: stockItems.length, totalValue,
      averageValuePerItem: stockItems.length > 0 ? totalValue / stockItems.length : 0,
      byCategory,
      items: stockItems.map(item => ({ ...item, totalValue: toNumber(item.costPrice) * item.currentStock }))
    };
  }

  async getMovementSummary(filters: any) {
    const { stockItems, transactions } = await this.repo.getMovementData(filters.startDate, filters.endDate, filters.category, { departmentId: filters.departmentId, includeAllStockLocations: filters.includeAllStockLocations });

    const movementSummary = stockItems.map(item => {
      const itemTxs = transactions.filter((t: any) => t.stockItemId === item.id);
      const purchases = itemTxs.filter((t: any) => t.transactionType === 'purchase' || t.transactionType === 'transfer_in').reduce((sum: number, t: any) => sum + t.quantity, 0);
      const sales = itemTxs.filter((t: any) => t.transactionType === 'sale').reduce((sum: number, t: any) => sum + t.quantity, 0);
      const requisitions = itemTxs.filter((t: any) => t.transactionType === 'requisition').reduce((sum: number, t: any) => sum + t.quantity, 0);
      const writeOffs = itemTxs.filter((t: any) => t.transactionType === 'write_off').reduce((sum: number, t: any) => sum + t.quantity, 0);
      const adjustments = itemTxs.filter((t: any) => t.transactionType === 'adjustment').reduce((sum: number, t: any) => sum + t.quantity, 0);

      const totalOut = sales + requisitions + writeOffs;
      const totalIn = purchases + (adjustments > 0 ? adjustments : 0);
      const netChange = totalIn - totalOut;

      return { stockItemId: item.id, itemName: item.name, category: item.category, unit: item.unitOfMeasure, openingStock: item.currentStock - netChange, purchases, sales, requisitions, writeOffs, adjustments: Math.abs(adjustments), closingStock: item.currentStock, netChange };
    });

    const totals = movementSummary.reduce((acc, item) => {
      acc.totalPurchases += item.purchases; acc.totalSales += item.sales; acc.totalRequisitions += item.requisitions; acc.totalWriteOffs += item.writeOffs; acc.totalAdjustments += item.adjustments;
      return acc;
    }, { totalPurchases: 0, totalSales: 0, totalRequisitions: 0, totalWriteOffs: 0, totalAdjustments: 0 });

    return { period: { startDate: filters.startDate || null, endDate: filters.endDate || null }, totals, items: movementSummary.filter(item => item.purchases > 0 || item.sales > 0 || item.requisitions > 0 || item.writeOffs > 0 || item.adjustments !== 0) };
  }
}