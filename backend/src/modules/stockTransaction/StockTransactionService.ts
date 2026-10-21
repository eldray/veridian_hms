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
    if (!Number.isSafeInteger(quantity) || quantity === 0 || (quantity < 0 && data.transactionType !== 'adjustment')) {
      throw new ValidationError('Stock transaction quantity must be a non-zero whole number; negative quantities are only allowed for stock decreases recorded as adjustments');
    }
    const validTypes = ['purchase', 'adjustment', 'requisition', 'sale', 'write_off'];
    if (!validTypes.includes(data.transactionType)) {
      throw new ValidationError(`Invalid transaction type. Must be one of: ${validTypes.join(', ')}`);
    }
    if (data.transactionType === 'write_off' && !String(data.notes || '').trim()) {
      throw new ValidationError('A reason is required for expired, damaged, or otherwise written-off stock');
    }
    const isAdmin = ['admin', 'super_admin'].includes(String(data.role || '').toLowerCase());
    if (data.transactionType === 'adjustment' && !isAdmin) {
      throw new ValidationError('Only an administrator may record a stock adjustment. Include an audit note explaining the reason.');
    }
    if (data.transactionType === 'adjustment' && !String(data.notes || '').trim()) {
      throw new ValidationError('A reason is required for every stock adjustment');
    }
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

  async delete(id: string, filters: { departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    this.logInfo('Deleting and reversing transaction', { id });
    // Enforce the same location scope used by read/update operations before
    // allowing a reversal. Without this check, a user could delete another
    // department's stock movement by guessing its transaction ID.
    const existing = await this.repo.findByIdWithRelations(id, filters);
    if (!existing) throw new NotFoundError('Stock transaction not found');
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

  async getStockValuation(category?: string, filters: { departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    const stockItems = await this.repo.getValuationData(category, filters);

    // Value batch-tracked stock at each lot's recorded cost. Use catalogue cost
    // only for the portion of the scoped balance not represented by batches.
    const valuedItems = stockItems.map((item: any) => {
      const batches = Array.isArray(item.StockBatch) ? item.StockBatch : [];
      const batchQuantity = batches.reduce((sum: number, batch: any) => sum + Math.max(0, Number(batch.quantity) || 0), 0);
      const batchValue = batches.reduce((sum: number, batch: any) => sum + toNumber(batch.costPrice) * Math.max(0, Number(batch.quantity) || 0), 0);
      const currentStock = Math.max(0, Number(item.currentStock) || 0);
      const unbatchedQuantity = Math.max(0, currentStock - batchQuantity);
      const stockDiscrepancy = Math.max(0, batchQuantity - currentStock);
      return {
        ...item,
        batchQuantity,
        batchValue,
        unbatchedQuantity,
        stockDiscrepancy,
        totalValue: batchValue + toNumber(item.costPrice) * unbatchedQuantity,
      };
    });
    const totalValue = valuedItems.reduce((sum: number, item: any) => sum + item.totalValue, 0);
    const byCategory = valuedItems.reduce((acc: Record<string, any>, item: any) => {
      const cat = item.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = { count: 0, value: 0, items: [] };
      acc[cat].count++;
      acc[cat].value += item.totalValue;
      acc[cat].items.push(item.name);
      return acc;
    }, {} as Record<string, any>);

    return {
      totalItems: valuedItems.length,
      totalValue,
      averageValuePerItem: valuedItems.length > 0 ? totalValue / valuedItems.length : 0,
      batchQuantityDiscrepancies: valuedItems.filter((item: any) => item.stockDiscrepancy > 0).length,
      byCategory,
      items: valuedItems,
    };
  }

  async getMovementSummary(filters: any) {
    const { stockItems, transactions, transactionsAfterEnd = [] } = await this.repo.getMovementData(filters.startDate, filters.endDate, filters.category, { departmentId: filters.departmentId, includeAllStockLocations: filters.includeAllStockLocations });

    const signedMovement = (t: any): number => {
      const quantity = Math.abs(Number(t.quantity) || 0);
      if (filters.includeAllStockLocations && (t.transactionType === 'transfer_in' || t.transactionType === 'transfer_out')) {
        return 0;
      }
      switch (t.transactionType) {
        case 'purchase': case 'transfer_in': return quantity;
        case 'sale': case 'requisition': case 'write_off': case 'transfer_out': return -quantity;
        case 'adjustment':
          return t.adjustmentDirection === 'decrease' ? -quantity
            : t.adjustmentDirection === 'increase' ? quantity
            : Number(t.quantity) < 0 ? -quantity : quantity;
        default: return Number(t.quantity) < 0 ? -quantity : quantity;
      }
    };
    const movementSummary = stockItems.map(item => {
      const itemTxs = transactions.filter((t: any) => t.stockItemId === item.id);
      const afterEndNetChange = (transactionsAfterEnd as any[])
        .filter((t: any) => t.stockItemId === item.id)
        .reduce((sum: number, t: any) => sum + signedMovement(t), 0);
      // Legacy rows may store outgoing quantities as negative values. Reports
      // normalize movement magnitudes here so totals remain correct for both
      // legacy and new positive-quantity ledger entries.
      const isReversedConsumableUse = (t: any) =>
        /^Consumable use:\s*\[(?:EDITED|DELETED)\]/i.test(String(t.notes || ''));
      const sumMagnitude = (type: string) => itemTxs
        .filter((t: any) => t.transactionType === type && !(type === 'sale' && isReversedConsumableUse(t)))
        .reduce((sum: number, t: any) => sum + Math.abs(Number(t.quantity) || 0), 0);
      const purchases = sumMagnitude('purchase');
      const transfersIn = sumMagnitude('transfer_in');
      const sales = sumMagnitude('sale');
      const requisitions = sumMagnitude('requisition');
      const writeOffs = sumMagnitude('write_off');
      const transfersOut = sumMagnitude('transfer_out');
      // Reversal rows are necessary to reconcile real stock balances, but they
      // are not new operational adjustments. Keep them in the signed ledger math
      // while excluding them from the adjustment activity totals.
      const adjustmentRows = itemTxs.filter((t: any) =>
        t.transactionType === 'adjustment' &&
        !/Consumable use (?:edit|deletion) reversal:/i.test(String(t.notes || ''))
      );
      const adjustmentIn = adjustmentRows
        .filter((t: any) => t.adjustmentDirection === 'increase' || (!t.adjustmentDirection && Number(t.quantity) >= 0))
        .reduce((sum: number, t: any) => sum + Math.abs(Number(t.quantity) || 0), 0);
      const adjustmentOut = adjustmentRows
        .filter((t: any) => t.adjustmentDirection === 'decrease' || (!t.adjustmentDirection && Number(t.quantity) < 0))
        .reduce((sum: number, t: any) => sum + Math.abs(Number(t.quantity) || 0), 0);

      // Internal transfers affect department-level balances, but they do not
      // increase or decrease the hospital-wide stock total. A dispatched transfer
      // remains in transit until receipt, so hospital-wide opening/closing
      // reconciliation must exclude both transfer directions from net change.
      const hospitalWide = Boolean(filters.includeAllStockLocations);
      const totalOut = sales + requisitions + writeOffs + (hospitalWide ? 0 : transfersOut) + adjustmentOut;
      const totalIn = purchases + (hospitalWide ? 0 : transfersIn) + adjustmentIn;
      // Reconcile against every ledger movement, including correction entries
      // for edited/deleted consumable uses. Activity columns intentionally omit
      // superseded uses and their reversal rows, but the balance must not.
      const netChange = itemTxs.reduce((sum: number, t: any) => sum + signedMovement(t), 0);
      // currentStock is today's balance. Reverse post-period movements to report
      // the actual closing balance at endDate, then derive the period opening balance.
      const closingStock = item.currentStock - afterEndNetChange;

      return { stockItemId: item.id, itemName: item.name, category: item.category, unit: item.unitOfMeasure, openingStock: closingStock - netChange, purchases, transfersIn, sales, requisitions, writeOffs, transfersOut, adjustments: adjustmentIn + adjustmentOut, adjustmentIn, adjustmentOut, closingStock, netChange };
    });

    const reportItems = movementSummary.filter(item =>
      item.purchases > 0 || item.transfersIn > 0 || item.sales > 0 ||
      item.requisitions > 0 || item.writeOffs > 0 || item.transfersOut > 0 ||
      item.adjustments !== 0
    );

    // Keep totals consistent with the item rows shown in the report.
    // Untouched catalogue items should not inflate opening/closing totals.
    const totals = reportItems.reduce((acc, item) => {
      acc.totalPurchases += item.purchases;
      acc.totalTransfersIn += item.transfersIn;
      acc.totalSales += item.sales;
      acc.totalRequisitions += item.requisitions;
      acc.totalWriteOffs += item.writeOffs;
      acc.totalTransfersOut += item.transfersOut;
      acc.totalAdjustments += item.adjustments;
      acc.totalAdjustmentIn += item.adjustmentIn;
      acc.totalAdjustmentOut += item.adjustmentOut;
      acc.totalNetChange += item.netChange;
      acc.totalOpeningStock += item.openingStock;
      acc.totalClosingStock += item.closingStock;
      return acc;
    }, {
      totalPurchases: 0, totalTransfersIn: 0, totalSales: 0, totalRequisitions: 0,
      totalWriteOffs: 0, totalTransfersOut: 0, totalAdjustments: 0,
      totalAdjustmentIn: 0, totalAdjustmentOut: 0, totalNetChange: 0,
      totalOpeningStock: 0, totalClosingStock: 0,
    });

    return { period: { startDate: filters.startDate || null, endDate: filters.endDate || null }, totals, items: reportItems };
  }
}