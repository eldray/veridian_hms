// src/seed/testSeed/stockLedger.ts
//
// An in-memory copy of the three numbers the dispensing workflow moves together:
// the physical batch quantity, the department (or ward) balance and the hospital-wide
// aggregate on the stock item. Seeded dispensing, requisitions, transfers and purchases
// all go through here, so the stock screens, the batch list and the transaction history
// agree with the clinical evidence exactly, and nothing is ever driven below zero.
import type { BatchRow, BalanceRow, StockRow } from './lookups.js';

export const locationKeyFor = (departmentId?: string | null, wardId?: string | null): string => {
  if (departmentId && wardId) throw new Error('Stock cannot belong to a department and a ward at the same time');
  if (departmentId) return departmentId;
  if (wardId) return `WARD:${wardId}`;
  return '__UNASSIGNED__';
};

export interface BatchAllocation {
  batchId: string;
  batchNumber: string;
  quantity: number;
  expiryDate: Date;
  costPrice: string;
}

export interface Movement {
  stockItemId: string;
  transactionType: string;
  quantity: number;
  reference: string;
  notes: string;
  performedBy: string;
  departmentId: string | null;
  wardId: string | null;
  transactionDate: Date;
  batchAllocations: BatchAllocation[] | null;
  balanceAfter: number;
  adjustmentDirection?: 'increase' | 'decrease';
  /** The document that caused the movement, so the ledger row is traceable. */
  invoiceId?: string | null;
  requisitionId?: string | null;
}

export interface ConsumeOptions {
  departmentId?: string | null;
  wardId?: string | null;
  /** Ignore batches whose expiry falls on or before this instant. */
  asOf?: Date;
  reference: string;
  notes: string;
  performedBy: string;
  transactionType: string;
  transactionDate: Date;
  /** The document that caused the movement, so the ledger row is traceable. */
  requisitionId?: string | null;
}

interface LedgerBatch extends BatchRow {
  remaining: number;
  receivedDate: Date;
}

interface LedgerBalance extends BalanceRow {
  isNew: boolean;
  touched: boolean;
}

export interface PendingStockWrites {
  batches: Array<{ id: string; quantity: number }>;
  balances: Array<{ id: string | null; stockItemId: string; locationKey: string; departmentId: string | null; wardId: string | null; quantity: number }>;
  stockItems: Array<{ id: string; currentStock: number }>;
  transactions: Movement[];
}

export class StockLedger {
  private batchesByItem = new Map<string, LedgerBatch[]>();
  private balancesByKey = new Map<string, LedgerBalance>();
  private aggregate = new Map<string, number>();
  private touchedBatches = new Set<string>();
  private touchedBalances = new Set<string>();
  private touchedItems = new Set<string>();
  private transactions: Movement[] = [];
  /** Batches a receipt invented, in the order they were created. */
  private newBatches: LedgerBatch[] = [];

  constructor(batches: BatchRow[], balances: BalanceRow[], stockItems: StockRow[]) {
    for (const item of stockItems) this.aggregate.set(item.id, item.currentStock);
    for (const batch of batches) {
      const list = this.batchesByItem.get(batch.stockItemId) ?? [];
      list.push({ ...batch, remaining: batch.quantity, receivedDate: batch.receivedDate });
      this.batchesByItem.set(batch.stockItemId, list);
    }
    for (const list of this.batchesByItem.values()) {
      list.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime() || a.id.localeCompare(b.id));
    }
    for (const balance of balances) {
      this.balancesByKey.set(`${balance.stockItemId}|${balance.locationKey}`, { ...balance, isNew: false, touched: false });
    }
  }

  /** Total usable batch stock in one location right now. */
  availableBatchQuantity(stockItemId: string, options: { departmentId?: string | null; wardId?: string | null; asOf?: Date }): number {
    const asOf = options.asOf ?? new Date();
    return this.usableBatches(stockItemId, options.departmentId, options.wardId, asOf)
      .reduce((sum, batch) => sum + batch.remaining, 0);
  }

  /**
   * Batches are only ever dispensed from their department (the live pharmacy takes
   * `wardId: null` lots), so a ward location has nothing to dispense and is unbatched.
   * A ward-held lot still counts towards the item, it just sits where it was delivered.
   */
  private usableBatches(stockItemId: string, departmentId?: string | null, wardId?: string | null, asOf = new Date()): LedgerBatch[] {
    if (wardId) return [];
    const list = this.batchesByItem.get(stockItemId) ?? [];
    return list.filter((batch) => batch.remaining > 0
      && !batch.wardId
      && batch.expiryDate.getTime() >= asOf.getTime()
      && ((departmentId ? batch.departmentId === departmentId : !batch.departmentId)));
  }

  balance(stockItemId: string, departmentId?: string | null, wardId?: string | null): number {
    const key = `${stockItemId}|${locationKeyFor(departmentId, wardId)}`;
    return this.balancesByKey.get(key)?.quantity ?? 0;
  }

  aggregateQuantity(stockItemId: string): number {
    return this.aggregate.get(stockItemId) ?? 0;
  }

  hasBatchStock(stockItemId: string): boolean {
    return (this.batchesByItem.get(stockItemId) ?? []).length > 0;
  }

  /**
   * The lot row that already holds this batch number in this location, whether the
   * database created it or an earlier receipt in this run did. A transfer-in, a
   * requisition issue or a repeat purchase must add to that lot rather than invent a
   * second row with the same identity, which the unique constraint would silently drop.
   */
  batchIdAtLocation(stockItemId: string, batchNumber: string, departmentId: string | null, wardId: string | null = null): string | null {
    const list = this.batchesByItem.get(stockItemId) ?? [];
    const found = list.find((batch) => batch.batchNumber === batchNumber
      && batch.departmentId === departmentId && (batch.wardId ?? null) === wardId);
    return found ? found.id : null;
  }

  /**
   * Take quantity out of a location. FEFO across batches, then the location balance and
   * the hospital-wide aggregate, all three or none - the same guarantee the live
   * dispensing transaction gives. A shortfall leaves every number untouched and reports
   * what was actually available, so the caller can decide rather than silently overselling.
   */
  consume(stockItemId: string, quantity: number, options: ConsumeOptions): { ok: boolean; allocations: BatchAllocation[]; balanceAfter: number; available: number } {
    const key = `${stockItemId}|${locationKeyFor(options.departmentId, options.wardId)}`;
    const balance = this.balancesByKey.get(key);
    const balanceQuantity = balance?.quantity ?? 0;
    const batched = this.hasBatchStock(stockItemId);
    const usable = this.usableBatches(stockItemId, options.departmentId, options.wardId, options.asOf);
    const batchTotal = usable.reduce((sum, batch) => sum + batch.remaining, 0);
    const available = Math.min(balanceQuantity, this.aggregateQuantity(stockItemId), batched ? batchTotal : Number.MAX_SAFE_INTEGER);

    if (!Number.isInteger(quantity) || quantity <= 0 || available < quantity) {
      return { ok: false, allocations: [], balanceAfter: balanceQuantity, available };
    }

    const allocations: BatchAllocation[] = [];
    if (batched) {
      let remaining = quantity;
      for (const batch of usable) {
        if (remaining <= 0) break;
        const move = Math.min(batch.remaining, remaining);
        batch.remaining -= move;
        this.touchedBatches.add(batch.id);
        allocations.push({ batchId: batch.id, batchNumber: batch.batchNumber, quantity: move, expiryDate: batch.expiryDate, costPrice: String(batch.costPrice) });
        remaining -= move;
      }
      if (remaining > 0) return { ok: false, allocations: [], balanceAfter: balanceQuantity, available };
    }

    const newBalanceQuantity = balanceQuantity - quantity;
    if (balance) {
      balance.quantity = newBalanceQuantity;
      balance.touched = true;
      this.touchedBalances.add(key);
    } else if (newBalanceQuantity === 0) {
      // Nothing to record for a location that never held this item.
    } else {
      return { ok: false, allocations: [], balanceAfter: 0, available };
    }

    this.aggregate.set(stockItemId, this.aggregateQuantity(stockItemId) - quantity);
    this.touchedItems.add(stockItemId);

    const movement: Movement = {
      stockItemId,
      transactionType: options.transactionType,
      quantity,
      reference: options.reference,
      notes: options.notes,
      performedBy: options.performedBy,
      departmentId: options.departmentId ?? null,
      wardId: options.wardId ?? null,
      transactionDate: options.transactionDate,
      batchAllocations: allocations.length ? allocations : null,
      balanceAfter: newBalanceQuantity,
      adjustmentDirection: 'decrease',
      requisitionId: options.requisitionId ?? null,
    };
    this.transactions.push(movement);
    return { ok: true, allocations, balanceAfter: newBalanceQuantity, available };
  }

  /** Put quantity into a location, creating the batch and the balance rows it needs. */
  receive(input: {
    stockItemId: string;
    quantity: number;
    batchNumber?: string | null;
    expiryDate?: Date | null;
    costPrice: number;
    departmentId?: string | null;
    wardId?: string | null;
    receivedDate: Date;
    reference: string;
    notes: string;
    performedBy: string;
    transactionType: string;
    transactionDate: Date;
    /** The batch row the seed already created for this receipt, when there is one. */
    existingBatchId?: string | null;
    /** The purchase invoice or requisition this receipt belongs to. */
    invoiceId?: string | null;
    requisitionId?: string | null;
  }): Movement {
    const key = `${input.stockItemId}|${locationKeyFor(input.departmentId, input.wardId)}`;
    let balance = this.balancesByKey.get(key);
    if (!balance) {
      balance = {
        id: null as unknown as string, stockItemId: input.stockItemId, locationKey: locationKeyFor(input.departmentId, input.wardId),
        departmentId: input.departmentId ?? null, wardId: input.wardId ?? null, quantity: 0, isNew: true, touched: true,
      };
      this.balancesByKey.set(key, balance);
    }
    balance.quantity += input.quantity;
    balance.touched = true;
    this.touchedBalances.add(key);

    let createdBatchId: string | null = null;
    if (input.batchNumber && input.expiryDate) {
      const list = this.batchesByItem.get(input.stockItemId) ?? [];
      const existing = input.existingBatchId ? list.find((b) => b.id === input.existingBatchId) : undefined;
      if (existing) {
        existing.remaining += input.quantity;
        existing.quantity += input.quantity;
        this.touchedBatches.add(existing.id);
        createdBatchId = existing.id;
      } else {
        const created: LedgerBatch = {
          id: `seedbatch:${(this.newBatches.length + 1).toString(36).padStart(4, '0')}`,
          stockItemId: input.stockItemId, batchNumber: input.batchNumber, expiryDate: input.expiryDate,
          quantity: input.quantity, costPrice: input.costPrice, departmentId: input.departmentId ?? null,
          wardId: input.wardId ?? null,
          receivedDate: input.receivedDate, remaining: input.quantity,
        };
        list.push(created);
        this.batchesByItem.set(input.stockItemId, list);
        list.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime() || a.id.localeCompare(b.id));
        this.newBatches.push(created);
        createdBatchId = created.id;
      }
    }

    this.aggregate.set(input.stockItemId, this.aggregateQuantity(input.stockItemId) + input.quantity);
    this.touchedItems.add(input.stockItemId);

    const movement: Movement = {
      stockItemId: input.stockItemId,
      transactionType: input.transactionType,
      quantity: input.quantity,
      reference: input.reference,
      notes: input.notes,
      performedBy: input.performedBy,
      departmentId: input.departmentId ?? null,
      wardId: input.wardId ?? null,
      transactionDate: input.transactionDate,
      batchAllocations: createdBatchId && input.batchNumber && input.expiryDate
        ? [{ batchId: createdBatchId, batchNumber: input.batchNumber, quantity: input.quantity, expiryDate: input.expiryDate, costPrice: String(input.costPrice) }]
        : null,
      balanceAfter: balance.quantity,
      adjustmentDirection: 'increase',
      invoiceId: input.invoiceId ?? null,
      requisitionId: input.requisitionId ?? null,
    };
    this.transactions.push(movement);
    return movement;
  }

  /** Batches the receipts above invented, so the writer can create them with this id. */
  pendingBatches(): Array<{ id: string; stockItemId: string; batchNumber: string; expiryDate: Date; quantity: number; costPrice: number; departmentId: string | null; wardId: string | null; receivedDate: Date }> {
    return this.newBatches.map((batch) => ({
      id: batch.id, stockItemId: batch.stockItemId, batchNumber: batch.batchNumber, expiryDate: batch.expiryDate,
      quantity: batch.remaining, costPrice: batch.costPrice, departmentId: batch.departmentId,
      wardId: batch.wardId ?? null, receivedDate: batch.receivedDate,
    }));
  }

  /**
   * Everything the database has to change. Quantity columns are written as absolute
   * values, never increments, so the ledger is the single source of truth for the run.
   */
  pendingWrites(): PendingStockWrites {
    // A touched lot is either a row the database already has, or one a receipt invented
    // during this run. The invented ones are written by pendingBatches() with their final
    // quantity, so updating them here would target a row that does not exist yet.
    const invented = new Set(this.newBatches.map((batch) => batch.id));
    const batches = [...this.touchedBatches]
      .filter((id) => !invented.has(id))
      .map((id) => {
        for (const list of this.batchesByItem.values()) {
          const found = list.find((b) => b.id === id);
          if (found) return { id, quantity: found.remaining };
        }
        return null;
      }).filter((row): row is { id: string; quantity: number } => row !== null);

    const balances = [...this.touchedBalances].map((key) => {
      const balance = this.balancesByKey.get(key)!;
      if (!balance.touched) return null;
      return {
        id: balance.isNew ? null : balance.id, stockItemId: balance.stockItemId, locationKey: balance.locationKey,
        departmentId: balance.departmentId, wardId: balance.wardId, quantity: Math.max(0, balance.quantity),
      };
    }).filter((row): row is PendingStockWrites['balances'][number] => row !== null);

    const stockItems = [...this.touchedItems].map((id) => ({ id, currentStock: Math.max(0, this.aggregateQuantity(id)) }));
    return { batches, balances, stockItems, transactions: this.transactions };
  }

  transactionCount(): number {
    return this.transactions.length;
  }
}
