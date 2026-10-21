import { PrismaClient, StockTransactionType, RequisitionStatus, ServiceType, ServiceCategory } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { getCounterService } from '../../services/CounterService';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import { StockItemRepository, increaseDepartmentStockBalance } from './StockItemRepository';


const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

const slugPart = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');

type PriceInput = { cashPrice?: any; nhisPrice?: any; insurancePrice?: any; corporatePrice?: any };

/** Blank / missing -> undefined (keep the current value); otherwise a number that must be 0 or more. */
const optionalMoney = (label: string, v: any): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new ValidationError(`${label} must be a number that is 0 or more`);
  return n;
};

export class StockItemService extends BaseService {
  private repo: StockItemRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('StockItemService');
    this.prisma = prisma;
    this.repo = new StockItemRepository(prisma);
  }

  // Builds a readable unique code in the same style as the seed data, e.g. "GLOVES-BOX" or "SYRINGE-5ML-2"
  private async generateDrugCode(name: string, strength?: string): Promise<string> {
    const namePart = slugPart(name);
    const strengthPart = slugPart(strength || '');
    // Only append the strength when the name doesn't already contain it ("Syringe 5ml" + "5ml" -> SYRINGE-5ML)
    const parts = strengthPart && !namePart.includes(strengthPart) ? [namePart, strengthPart] : [namePart];
    const base = parts.filter(Boolean).join('-').slice(0, 40).replace(/-+$/, '') || 'ITEM';
    let code = base;
    for (let i = 2; await this.prisma.stockItem.findUnique({ where: { drugCode: code }, select: { id: true } }); i++) {
      code = `${base}-${i}`;
    }
    return code;
  }

  /**
   * Keeps the item's service-catalog entry and its four-payer price row (cash / NHIS / insurance / corporate)
   * in step with the stock item. A prescription needs a catalog entry (serviceCatalogId), so every stock
   * item must have one. Only the prices that are supplied change; the others keep their current value.
   * First save: cash defaults to cost + 20% (the markup the NHIS import uses), insurance to cash, NHIS and
   * corporate to 0 (0 = billed at the cash price, or at the corporate account's discount off cash).
   */
  private async savePatientPrices(tx: any, item: any, input: PriceInput, userId?: string) {
    const cashIn = optionalMoney('Cash price', input.cashPrice);
    const nhisIn = optionalMoney('NHIS price', input.nhisPrice);
    const insIn = optionalMoney('Insurance price', input.insurancePrice);
    const corpIn = optionalMoney('Corporate price', input.corporatePrice);

    let catalog = await tx.serviceCatalog.findFirst({ where: { stockItemId: item.id }, orderBy: { createdAt: 'asc' } });
    const current = catalog
      ? await tx.servicePricing.findFirst({ where: { serviceCatalogId: catalog.id, isActive: true }, orderBy: { effectiveDate: 'desc' } })
      : null;

    const cost = toNumber(item.costPrice);
    const cash = cashIn ?? (current ? toNumber(current.cashPrice) : Math.round(cost * 1.2 * 100) / 100);
    const nhis = nhisIn ?? (current ? toNumber(current.nhisPrice) : 0);
    const insurance = insIn ?? (current ? toNumber(current.insurancePrice) : cash);
    const corporate = corpIn ?? (current ? toNumber(current.corporatePrice) : 0);

    const flags = {
      name: item.name,
      isActive: item.isActive,
      tariffCode: item.tariffCode ?? null,
      isNHISCovered: item.isNHISCovered !== false && nhis > 0,
      isPrivateInsuranceExempted: item.isPrivateInsExempted === true,
      nhisRequiresAuth: item.nhisRequiresAuth === true,
      privateInsRequiresAuth: item.privateInsRequiresAuth === true
    };

    if (!catalog) {
      catalog = await tx.serviceCatalog.create({
        data: {
          ...flags,
          code: `MED-${item.drugCode}`,
          serviceType: ServiceType.medication,
          serviceCategory: ServiceCategory.pharmacy,
          subType: item.category || 'medication',
          nhisServiceCode: item.drugCode,
          unit: item.unitOfMeasure || 'Each',
          isPending: false,
          stockItemId: item.id,
          createdById: userId ?? null
        }
      });
    } else {
      await tx.serviceCatalog.update({ where: { id: catalog.id }, data: flags });
    }

    const changed = !current
      || toNumber(current.cashPrice) !== cash || toNumber(current.nhisPrice) !== nhis
      || toNumber(current.insurancePrice) !== insurance || toNumber(current.corporatePrice) !== corporate;

    if (changed) {
      // Historical pricing: expire the old row, create a new one that holds all four prices
      await tx.servicePricing.updateMany({ where: { serviceCatalogId: catalog.id, isActive: true }, data: { isActive: false, expiryDate: new Date() } });
      await tx.servicePricing.create({
        data: {
          serviceCatalogId: catalog.id,
          cashPrice: cash, nhisPrice: nhis, insurancePrice: insurance, corporatePrice: corporate,
          vatRate: item.vatRate ?? 0, isTaxable: item.isTaxable ?? true,
          isActive: true, effectiveDate: new Date()
        }
      });
    }
  }

  async create(data: any, userId?: string) {
    const name = String(data.name ?? '').trim();
    const category = String(data.category ?? '').trim();
    const unitOfMeasure = String(data.unitOfMeasure ?? '').trim();
    const strength = String(data.strength ?? '').trim();
    const costPrice = Number(data.costPrice ?? 0);

    if (!name) throw new ValidationError('Name is required');
    if (!category) throw new ValidationError('Category is required');
    if (!unitOfMeasure) throw new ValidationError('Unit of measure is required');
    if (!Number.isFinite(costPrice) || costPrice < 0) throw new ValidationError('Cost price must be a number that is 0 or more');

    const initialStock = Number(data.currentStock ?? 0);
    if (!Number.isSafeInteger(initialStock) || initialStock < 0) {
      throw new ValidationError('Initial stock must be a non-negative whole number');
    }
    const hasOpeningQuantity =
      data.quantityReceived !== undefined && data.quantityReceived !== null && data.quantityReceived !== '';
    if (hasOpeningQuantity && !(data.batchNumber && data.expiryDate)) {
      throw new ValidationError('Batch number and expiry date are required when an opening batch quantity is supplied');
    }
    const hasOpeningBatch = Boolean(data.batchNumber && data.expiryDate && hasOpeningQuantity);
    let openingBatchExpiryDate: Date | undefined;
    let openingBatchReceivedDate: Date | undefined;
    if (hasOpeningBatch) {
      const receivedQuantity = Number(data.quantityReceived);
      if (!Number.isSafeInteger(receivedQuantity) || receivedQuantity <= 0) {
        throw new ValidationError('Opening batch quantity must be a positive whole number');
      }
      if (initialStock > 0) {
        throw new ValidationError('Provide either initial stock or an opening batch quantity, not both, to avoid counting the same stock twice');
      }
      if (!String(data.batchNumber).trim()) throw new ValidationError('Batch number is required');

      openingBatchExpiryDate = new Date(data.expiryDate);
      openingBatchReceivedDate = data.receivedDate ? new Date(data.receivedDate) : new Date();
      if (!Number.isFinite(openingBatchExpiryDate.getTime())) throw new ValidationError('A valid batch expiry date is required');
      if (!Number.isFinite(openingBatchReceivedDate.getTime())) throw new ValidationError('A valid received date is required');
      if (openingBatchExpiryDate <= openingBatchReceivedDate) throw new ValidationError('Batch expiry date must be after its received date');
      if (openingBatchReceivedDate.getTime() > Date.now()) throw new ValidationError('Received date cannot be in the future');
      if (data.departmentId) {
        const department = await this.prisma.department.findUnique({ where: { id: String(data.departmentId) }, select: { id: true } });
        if (!department) throw new ValidationError('Selected stock department does not exist');
      }
    }

    // drugCode is required + unique in the schema: use the one supplied, otherwise generate it
    let drugCode = String(data.drugCode ?? '').trim().toUpperCase();
    if (drugCode) {
      const existing = await this.prisma.stockItem.findUnique({ where: { drugCode }, select: { id: true } });
      if (existing) throw new ConflictError(`Drug code "${drugCode}" is already in use`);
    } else {
      drugCode = await this.generateDrugCode(name, strength);
    }

    this.logInfo('Creating stock item', { name, drugCode });
    // Stock item + its catalog entry and prices are saved together, so an item is never left without a price
    const item = await this.prisma.$transaction(async (tx) => {
      const created = await this.repo.create({
        name, category, description: data.description, strength, unitOfMeasure, drugCode,
        reorderLevel: data.reorderLevel || 0, currentStock: hasOpeningBatch ? 0 : initialStock, costPrice, isNHISCovered: data.isNHISCovered ?? true,
        isPrivateInsExempted: data.isPrivateInsExempted ?? false, nhisRequiresAuth: data.nhisRequiresAuth ?? false, privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
        supplier: data.supplier, expiryDate: data.expiryDate ? new Date(data.expiryDate) : null, batchNumber: data.batchNumber, isActive: data.isActive ?? true,
        tariffCode: data.tariffCode, vatRate: data.vatRate ?? 0, isTaxable: data.isTaxable ?? true, isMedication: data.isMedication ?? true
      }, tx);
      await this.savePatientPrices(tx, created, data, userId);
      if (initialStock > 0) {
        const departmentId = data.departmentId ? String(data.departmentId) : undefined;
        await increaseDepartmentStockBalance(tx, created.id, departmentId, initialStock);
        await tx.stockTransaction.create({
          data: {
            stockItemId: created.id,
            transactionType: 'purchase',
            quantity: initialStock,
            balanceAfter: initialStock,
            reference: 'OPENING-STOCK',
            notes: 'Opening stock balance',
            performedBy: userId || undefined,
            departmentId,
          },
        });
      }
      if (hasOpeningBatch) {
        await this.repo.addBatchWithinTransaction(
          tx,
          created.id,
          String(data.batchNumber).trim(),
          openingBatchExpiryDate!,
          Number(data.quantityReceived),
          costPrice,
          openingBatchReceivedDate,
          data.departmentId ? String(data.departmentId) : undefined,
        );
      }
      return created;
    });

    // Return the refreshed aggregate and batch list after the atomic opening receipt.
    return hasOpeningBatch ? this.getById(item.id) : item;
  }

  async getAll(filters: any) { return this.repo.findAllWithFilters(filters); }
  async getById(id: string, filters: any = {}) {
    const item = await this.repo.findByIdWithRelations(id, filters);
    if (!item) throw new NotFoundError('Stock item not found');
    return item;
  }

  async update(id: string, updateData: any, userId?: string) {
    // Price fields and relations are not stock-item columns: strip them, then apply the prices to the catalog entry
    const { id: _, createdAt, cashPrice, nhisPrice, insurancePrice, corporatePrice, ServiceCatalog, StockBatch, currentStock: _currentStock, stockBalances: _stockBalances, ...cleanData } = updateData;
    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repo.update(id, { ...cleanData, expiryDate: cleanData.expiryDate ? new Date(cleanData.expiryDate) : undefined }, tx);
      await this.savePatientPrices(tx, updated, { cashPrice, nhisPrice, insurancePrice, corporatePrice }, userId);
      return updated;
    });
  }

  async deleteStockItem(id: string) {
    const existing = await this.prisma.stockItem.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundError('Stock item not found');

    const hasDeps = await this.repo.hasDependencies(id);
    if (hasDeps) {
      throw new ConflictError('This item cannot be deleted because it has stock history (batches, transactions, prescriptions, invoices, requisitions or transfers). Mark it as inactive instead.');
    }

    // The item's own catalog entry + prices go with it, unless that entry was already billed or prescribed
    await this.prisma.$transaction(async (tx) => {
      const catalogs = await tx.serviceCatalog.findMany({
        where: { stockItemId: id },
        select: { id: true, _count: { select: { medications: true, BillLineItem: true, ProformaInvoiceItem: true, ServiceRendered: true } } }
      });
      const inUse = catalogs.some(c => c._count.medications + c._count.BillLineItem + c._count.ProformaInvoiceItem + c._count.ServiceRendered > 0);
      if (inUse) {
        throw new ConflictError('This item cannot be deleted because it has been billed or prescribed. Mark it as inactive instead.');
      }
      const catalogIds = catalogs.map(c => c.id);
      if (catalogIds.length > 0) {
        await tx.servicePricing.deleteMany({ where: { serviceCatalogId: { in: catalogIds } } });
        await tx.serviceCatalog.deleteMany({ where: { id: { in: catalogIds } } });
      }
      await tx.stockItem.delete({ where: { id } });
    });
    return { message: 'Stock item deleted successfully' };
  }

  async updateStockLevel(
    id: string,
    quantity: number,
    transactionType: StockTransactionType,
    reference?: string,
    notes?: string,
    performedBy?: string,
    departmentId?: string,
    role?: string,
  ) {
    if (!Number.isSafeInteger(quantity) || quantity === 0 || (quantity < 0 && transactionType !== 'adjustment')) {
      throw new ValidationError('Stock quantity must be a non-zero whole number; negative quantities are only allowed for adjustments');
    }
    if (!['purchase', 'adjustment', 'requisition', 'sale', 'write_off'].includes(transactionType)) {
      throw new ValidationError('Invalid stock transaction type');
    }
    const isAdmin = ['admin', 'super_admin'].includes(String(role || '').toLowerCase());
    if (transactionType === 'adjustment' && !isAdmin) {
      throw new ValidationError('Only an administrator may record a stock adjustment');
    }
    if (transactionType === 'adjustment' && !String(notes || '').trim()) {
      throw new ValidationError('A reason is required for every stock adjustment');
    }
    if (transactionType === 'write_off' && !String(notes || '').trim()) {
      throw new ValidationError('A reason is required for expired, damaged, or otherwise written-off stock');
    }
    if (!isAdmin && !departmentId) {
      throw new ValidationError('Assign this user to a department before recording stock movements');
    }
    this.logInfo('Updating stock level', { id, quantity, transactionType });
    return this.repo.updateStockLevelSafely(id, quantity, transactionType, reference, notes, performedBy, departmentId);
  }

  async allocateUnassignedStock(stockItemId: string, departmentId: string, quantity: number, performedBy?: string) {
    if (!stockItemId?.trim()) throw new ValidationError('Stock item ID is required');
    if (!departmentId?.trim()) throw new ValidationError('Receiving department is required');
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new ValidationError('Allocation quantity must be a positive whole number');
    return this.repo.allocateUnassignedStockSafely(stockItemId, departmentId, quantity, performedBy);
  }

  async getStockTransactions(
    id: string,
    page: number = 1,
    limit: number = 50,
    filters: { departmentId?: string; includeAllStockLocations?: boolean } = {},
  ) {
    const result = await this.repo.getTransactions(id, page, limit, filters);
    return {
      transactions: result.transactions,
      pagination: { page: result.page, limit: result.limit, total: result.total, pages: result.pages },
    };
  }

  async addStockBatch(
    stockItemId: string,
    batchNumber: string,
    expiryDate: Date,
    quantity: number,
    costPrice: number,
    receivedDate?: Date,
    departmentId?: string,
  ) {
    if (!stockItemId.trim()) throw new ValidationError('Stock item ID is required');
    if (!batchNumber?.trim()) throw new ValidationError('Batch number is required');
    if (!(expiryDate instanceof Date) || !Number.isFinite(expiryDate.getTime())) {
      throw new ValidationError('A valid batch expiry date is required');
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new ValidationError('Batch quantity must be a positive whole number');
    }
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      throw new ValidationError('Batch cost price must be a number that is 0 or more');
    }
    const received = receivedDate ?? new Date();
    if (!(received instanceof Date) || !Number.isFinite(received.getTime())) {
      throw new ValidationError('A valid received date is required');
    }
    if (expiryDate <= received) throw new ValidationError('Batch expiry date must be after its received date');
    if (received.getTime() > Date.now()) throw new ValidationError('Received date cannot be in the future');
    return this.repo.addBatchSafely(stockItemId, batchNumber.trim(), expiryDate, quantity, costPrice, received, departmentId);
  }

  async getExpiringBatches(days: number) { return this.repo.getExpiringBatches(days); }
  async getLowStockAlerts(category?: string, filters: { departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    const items: any[] = await this.repo.getLowStockItems(category, filters);
    return { totalLowStock: items.length, criticalCount: items.filter(i => i.currentStock === 0).length, warningCount: items.filter(i => i.currentStock > 0 && i.currentStock <= i.reorderLevel).length, items };
  }
  async getCategories() { return this.repo.getCategories(); }

  // ==========================================
  // REPORTS (Preserved exactly, Fixed Decimal Math)
  // ==========================================

  async getValueSummary(category?: string, filters: { departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    const stockItems: any[] = await this.repo.getItemsForValueReport(category, filters);

    // Use the actual cost recorded on each remaining batch. For legacy/unbatched
    // units, retain the catalogue item's costPrice as the fallback valuation.
    // If batch quantities exceed aggregate stock, value the recorded batches and
    // expose the discrepancy rather than silently hiding it.
    const valuedItems = stockItems.map((item: any) => {
      const batches = Array.isArray(item.StockBatch) ? item.StockBatch : [];
      const batchQuantity = batches.reduce((sum: number, batch: any) => sum + Math.max(0, Number(batch.quantity) || 0), 0);
      const currentStock = filters.includeAllStockLocations
        ? Number(item.currentStock) || 0
        : (Array.isArray(item.stockBalances) ? item.stockBalances.reduce((sum: number, balance: any) => sum + (Number(balance.quantity) || 0), 0) : 0);
      const batchValue = batches.reduce((sum: number, batch: any) => {
        const quantity = Math.max(0, Number(batch.quantity) || 0);
        return sum + toNumber(batch.costPrice) * quantity;
      }, 0);
      const unbatchedQuantity = Math.max(0, currentStock - batchQuantity);
      const unbatchedValue = toNumber(item.costPrice) * unbatchedQuantity;
      return {
        ...item,
        batchQuantity,
        batchValue,
        unbatchedQuantity,
        unbatchedValue,
        currentStock,
        stockDiscrepancy: Math.max(0, batchQuantity - currentStock),
        totalValue: batchValue + unbatchedValue,
      };
    });

    const totalValue = valuedItems.reduce((sum: number, item: any) => sum + item.totalValue, 0);
    return {
      totalItems: valuedItems.length,
      medications: valuedItems.filter((item: any) => item.isMedication).length,
      nonMedications: valuedItems.filter((item: any) => !item.isMedication).length,
      totalValue,
      lowStockItems: valuedItems.filter((item: any) => item.currentStock <= item.reorderLevel).length,
      outOfStockItems: valuedItems.filter((item: any) => item.currentStock === 0).length,
      batchQuantityDiscrepancies: valuedItems.filter((item: any) => item.stockDiscrepancy > 0).length,
      byCategory: valuedItems.reduce((acc: Record<string, any>, item: any) => {
        const cat = item.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = { count: 0, value: 0, items: [] };
        acc[cat].count++;
        acc[cat].value += item.totalValue;
        acc[cat].items.push(item.name);
        return acc;
      }, {} as Record<string, any>),
      items: valuedItems,
    };
  }

  async getExpiryReport(days: number = 30, category?: string) {
    const safeDays = Number.isSafeInteger(Number(days)) && Number(days) >= 0 ? Math.min(Number(days), 3650) : 30;
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + safeDays);
    const stockItems: any[] = await this.repo.getItemsForExpiryReport(category);

    // Report lot-level expiry for batch-tracked stock, while retaining legacy
    // item-level expiry for stock records created before batch tracking.
    const itemHasBatchData = (item: any) => Array.isArray(item.StockBatch) && item.StockBatch.length > 0;
    const itemBatches = (item: any) => (item.StockBatch || []).filter((batch: any) => Number(batch.quantity) > 0);
    const legacyExpiry = (item: any) => item.expiryDate ? new Date(item.expiryDate) : null;
    const isSoon = (date: Date) => date >= today && date <= futureDate;
    const isExpired = (date: Date) => date < today;
    const isHealthy = (date: Date) => date > futureDate;

    const expiringSoon = stockItems.filter(item => {
      const batches = itemBatches(item);
      if (itemHasBatchData(item)) return batches.some((batch: any) => isSoon(new Date(batch.expiryDate)));
      const expiry = legacyExpiry(item);
      return expiry ? isSoon(expiry) : false;
    });
    const expired = stockItems.filter(item => {
      const batches = itemBatches(item);
      if (itemHasBatchData(item)) return batches.some((batch: any) => isExpired(new Date(batch.expiryDate)));
      const expiry = legacyExpiry(item);
      return expiry ? isExpired(expiry) : false;
    });
    const healthy = stockItems.filter(item => {
      const batches = itemBatches(item);
      if (itemHasBatchData(item)) return batches.some((batch: any) => isHealthy(new Date(batch.expiryDate)));
      const expiry = legacyExpiry(item);
      return expiry ? isHealthy(expiry) : false;
    });
    const expiringBatches: any[] = await this.repo.getExpiringBatches(safeDays);
    const expiringValue = expiringSoon.reduce((sum: number, item: any) => {
      const batches = itemBatches(item);
      if (itemHasBatchData(item)) {
        return sum + batches
          .filter((batch: any) => isSoon(new Date(batch.expiryDate)))
          .reduce((batchSum: number, batch: any) => batchSum + toNumber(batch.costPrice) * Number(batch.quantity), 0);
      }
      return sum + toNumber(item.costPrice) * Number(item.currentStock);
    }, 0);

    return {
      summary: { totalWithExpiry: stockItems.length, expiringSoon: expiringSoon.length, expired: expired.length, healthy: healthy.length, expiringValue, expiringBatches: expiringBatches.length },
      expiringSoon: expiringSoon.slice(0, 50), expired: expired.slice(0, 50), expiringBatches: expiringBatches.slice(0, 50), reportPeriod: safeDays
    };
  }

  /**
   * Stock movement: a per-item summary (opening, in, out, closing) plus the full transaction history.
   * Direction comes from the transaction type, because older writers stored sales as negative numbers and
   * adjustments lost their sign; for an adjustment the change in balance decides whether it added or removed stock.
   */
  async getMovementSummary(startDate?: Date, endDate?: Date, category?: string, extra: { stockItemId?: string; transactionType?: string; departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    const LIMIT = 5000;
    const { rows, total } = await this.repo.getLedgerTransactions({ startDate, endDate, category, stockItemId: extra.stockItemId, transactionType: extra.transactionType, departmentId: extra.departmentId, includeAllStockLocations: extra.includeAllStockLocations, limit: LIMIT });

    const lastBalance = new Map<string, number>();
    const items = new Map<string, any>();
    const byType: Record<string, { count: number; quantity: number; value: number }> = {};
    const ledger: any[] = [];
    let totalIn = 0, totalOut = 0;

    for (const t of rows as any[]) {
      const q = Math.abs(t.quantity);
      const prev = lastBalance.get(t.stockItemId);
      let signed: number;
      switch (t.transactionType) {
        case 'purchase': case 'transfer_in': signed = q; break;
        case 'sale': case 'requisition': case 'transfer_out': case 'write_off': signed = -q; break;
        case 'adjustment': signed = t.adjustmentDirection === 'decrease' ? -q : t.adjustmentDirection === 'increase' ? q : t.quantity < 0 ? -q : prev !== undefined ? t.balanceAfter - prev : q; break;
        default: signed = t.quantity < 0 ? -q : prev !== undefined ? t.balanceAfter - prev : q;
      }
      lastBalance.set(t.stockItemId, t.balanceAfter);

      const qtyIn = signed > 0 ? signed : 0;
      const qtyOut = signed < 0 ? -signed : 0;
      totalIn += qtyIn; totalOut += qtyOut;

      const item = items.get(t.stockItemId) ?? { stockItemId: t.stockItemId, itemName: t.StockItem?.name ?? 'Unknown', category: t.StockItem?.category ?? '', unit: t.StockItem?.unitOfMeasure ?? '', openingStock: t.balanceAfter - signed, quantityIn: 0, quantityOut: 0, closingStock: t.balanceAfter, transactions: 0 };
      item.quantityIn += qtyIn; item.quantityOut += qtyOut; item.closingStock = t.balanceAfter; item.transactions++;
      items.set(t.stockItemId, item);

      const bt = byType[t.transactionType] ?? { count: 0, quantity: 0, value: 0 };
      bt.count++; bt.quantity += q; bt.value += toNumber(t.StockItem?.costPrice) * q;
      byType[t.transactionType] = bt;

      ledger.push({
        id: t.id, date: t.transactionDate, stockItemId: t.stockItemId, itemName: t.StockItem?.name ?? 'Unknown', category: t.StockItem?.category ?? '',
        unit: t.StockItem?.unitOfMeasure ?? '', type: t.transactionType, quantityIn: qtyIn, quantityOut: qtyOut, balanceAfter: t.balanceAfter,
        reference: t.reference ?? '', document: t.Requisition?.requisitionNumber ?? t.Invoice?.invoiceNumber ?? '', supplier: t.Invoice?.supplierName ?? '',
        department: t.Department?.name ?? '', performedBy: t.User?.fullName ?? (t.performedBy && t.performedBy !== 'system' ? 'Unknown user' : 'System'), notes: t.notes ?? '',
      });
    }

    const itemList = [...items.values()].sort((a, b) => (b.quantityIn + b.quantityOut) - (a.quantityIn + a.quantityOut));
    const g = (k: string) => byType[k] ?? { count: 0, quantity: 0, value: 0 };
    const summary = {
      totalTransactions: total, totalIn, totalOut, netChange: totalIn - totalOut, itemsMoved: itemList.length,
      byType: {
        purchases: g('purchase').count, purchaseQuantity: g('purchase').quantity, purchaseValue: g('purchase').value,
        sales: g('sale').count, saleQuantity: g('sale').quantity,
        requisitions: g('requisition').count, requisitionQuantity: g('requisition').quantity,
        transfersIn: g('transfer_in').count, transferInQuantity: g('transfer_in').quantity,
        transfersOut: g('transfer_out').count, transferOutQuantity: g('transfer_out').quantity,
        adjustments: g('adjustment').count, adjustmentQuantity: g('adjustment').quantity,
        writeOffs: g('write_off').count, writeOffQuantity: g('write_off').quantity,
      },
    };

    return {
      period: { startDate: startDate || null, endDate: endDate || null },
      ...summary, summary, items: itemList,
      topMovements: itemList.slice(0, 10).map((i) => ({ name: i.itemName, quantity: i.quantityIn + i.quantityOut, type: i.quantityIn >= i.quantityOut ? 'in' : 'out' })),
      transactions: ledger.reverse(), // newest first
      truncated: total > rows.length, shown: rows.length,
    };
  }

  async getUsageReport(period: string = 'month', limit: number = 20, category?: string) {
    let startDate = new Date();
    if (period === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (period === 'quarter') startDate.setMonth(startDate.getMonth() - 3);
    else if (period === 'year') startDate.setFullYear(startDate.getFullYear() - 1);
    else startDate.setMonth(startDate.getMonth() - 1);

    const safeLimit = Number.isSafeInteger(Number(limit)) && Number(limit) > 0
      ? Math.min(Number(limit), 200)
      : 20;
    const allTransactions = await this.repo.getTransactionsForUsageReport(startDate);
    const filtered = category ? allTransactions.filter((t: any) => t.StockItem?.category === category) : allTransactions;

    // Key by stock item ID, not its display name: two catalogue items may share a name.
    // Use absolute quantities because older transaction writers sometimes stored issues as negative values.
    const itemUsage = filtered.reduce((acc: Record<string, any>, t: any) => {
      const stockItemId = t.stockItemId || t.StockItem?.id || (t.StockItem?.name || 'unknown');
      const name = t.StockItem?.name || 'Unknown';
      const quantity = Math.abs(Number(t.quantity) || 0);
      if (!acc[stockItemId]) {
        acc[stockItemId] = {
          stockItemId,
          name,
          category: t.StockItem?.category || 'other',
          unit: t.StockItem?.unitOfMeasure || 'unit',
          isMedication: t.StockItem?.isMedication || false,
          quantity: 0,
          transactions: 0,
          salesQuantity: 0,
          requisitionQuantity: 0,
        };
      }
      acc[stockItemId].quantity += quantity;
      acc[stockItemId].transactions++;
      if (t.transactionType === 'sale') acc[stockItemId].salesQuantity += quantity;
      if (t.transactionType === 'requisition') acc[stockItemId].requisitionQuantity += quantity;
      return acc;
    }, {} as Record<string, any>);

    const allItems = Object.values(itemUsage).sort((a: any, b: any) => b.quantity - a.quantity);
    const topItems = allItems.slice(0, safeLimit);
    return {
      period,
      startDate,
      summary: {
        totalItemsDispensed: allItems.length,
        totalQuantity: allItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
        topItem: topItems[0] || null,
        medicationsOnly: allItems.filter((item: any) => item.isMedication).length,
      },
      topItems,
    };
  }

  async getSupplierReport(supplierId?: string) {
    const invoices = await this.repo.getInvoicesForSupplierReport();
    const supplierSummary = invoices.reduce((acc, inv) => {
      const supplierName = inv.supplierName;
      if (!acc[supplierName]) acc[supplierName] = { name: supplierName, totalSpent: 0, invoiceCount: 0, itemCount: 0, uniqueItems: new Set(), lastOrderDate: inv.invoiceDate, firstOrderDate: inv.invoiceDate };
      acc[supplierName].totalSpent += toNumber(inv.totalAmount); // ✅ FIXED
      acc[supplierName].invoiceCount++; acc[supplierName].itemCount += inv.InvoiceItem?.length || 0;
      inv.InvoiceItem?.forEach(item => { if (item.StockItem?.name) acc[supplierName].uniqueItems.add(item.StockItem.name); });
      if (new Date(inv.invoiceDate) < new Date(acc[supplierName].firstOrderDate)) acc[supplierName].firstOrderDate = inv.invoiceDate;
      if (new Date(inv.invoiceDate) > new Date(acc[supplierName].lastOrderDate)) acc[supplierName].lastOrderDate = inv.invoiceDate;
      return acc;
    }, {} as Record<string, any>);

    const suppliers = Object.values(supplierSummary).map((s: any) => ({ ...s, uniqueItemCount: s.uniqueItems.size, uniqueItems: undefined }));
    const totalSpent = suppliers.reduce((sum, s: any) => sum + s.totalSpent, 0);

    return { summary: { totalSuppliers: suppliers.length, totalSpent, averageSpent: suppliers.length > 0 ? totalSpent / suppliers.length : 0, totalInvoices: invoices.length }, suppliers: suppliers.sort((a: any, b: any) => b.totalSpent - a.totalSpent) };
  }

  async getRequisitionSummary(startDate?: Date, endDate?: Date, status?: RequisitionStatus) {
    const requisitions = await this.repo.getRequisitionsForSummaryReport(startDate, endDate, status);
    const byStatus = { draft: 0, submitted: 0, approved: 0, fulfilled: 0, cancelled: 0 };
    requisitions.forEach(r => byStatus[r.status]++);

    const fulfillmentRate = requisitions.length > 0 ? (byStatus.fulfilled / requisitions.length * 100).toFixed(1) : 0;

    return {
      summary: { total: requisitions.length, byStatus, fulfillmentRate: `${fulfillmentRate}%` },
      recentRequisitions: requisitions.slice(0, 20).map(r => ({ id: r.id, requisitionNumber: r.requisitionNumber, status: r.status, urgency: r.urgency, createdAt: r.createdAt, department: r.departments?.name, requestedBy: r.requestedBy?.fullName, itemCount: r.RequisitionItem?.length || 0 }))
    };
  }

  async getMedicationsByStockItem(id: string) {
    const medications = await this.repo.getMedicationsByStockItem(id);
    const summary = { totalPrescribed: medications.length, dispensed: medications.filter(m => m.status === 'dispensed').length, pending: medications.filter(m => m.status === 'prescribed').length, totalQuantityDispensed: medications.reduce((sum, m) => sum + (m.quantity || 0), 0), uniquePatients: new Set(medications.map(m => m.Attendance?.patientId)).size };
    return { medications, summary };
  }
}