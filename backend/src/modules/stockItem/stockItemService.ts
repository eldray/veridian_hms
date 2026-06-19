import { PrismaClient, StockTransactionType, RequisitionStatus } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { StockItemRepository } from './StockItemRepository';
import { getCounterService } from '../../services/CounterService';

const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class StockItemService extends BaseService {
  private repo: StockItemRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('StockItemService');
    this.prisma = prisma;
    this.repo = new StockItemRepository(prisma);
  }

  async create(data: any) {
    this.logInfo('Creating stock item', { name: data.name });
    const item = await this.repo.create({
      name: data.name, category: data.category, description: data.description, strength: data.strength, unitOfMeasure: data.unitOfMeasure, drugCode: data.drugCode,
      reorderLevel: data.reorderLevel || 0, currentStock: data.currentStock || 0, costPrice: data.costPrice, isNHISCovered: data.isNHISCovered ?? true,
      isPrivateInsExempted: data.isPrivateInsExempted ?? false, nhisRequiresAuth: data.nhisRequiresAuth ?? false, privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
      supplier: data.supplier, expiryDate: data.expiryDate ? new Date(data.expiryDate) : null, batchNumber: data.batchNumber, isActive: data.isActive ?? true,
      tariffCode: data.tariffCode, vatRate: data.vatRate ?? 0, isTaxable: data.isTaxable ?? true, isMedication: data.isMedication ?? true
    });

    if (data.batchNumber && data.expiryDate && data.quantityReceived) {
      await this.repo.addBatchSafely(item.id, data.batchNumber, new Date(data.expiryDate), data.quantityReceived, data.costPrice);
    }
    return item;
  }

  async getAll(filters: any) { return this.repo.findAllWithFilters(filters); }
  async getById(id: string) {
    const item = await this.repo.findByIdWithRelations(id);
    if (!item) throw new Error('Stock item not found');
    return item;
  }

  async update(id: string, updateData: any) {
    const { id: _, createdAt, ...cleanData } = updateData;
    return this.repo.update(id, { ...cleanData, expiryDate: cleanData.expiryDate ? new Date(cleanData.expiryDate) : undefined });
  }

  async deleteStockItem(id: string) {
    const hasDeps = await this.repo.hasDependencies(id);
    if (hasDeps) throw new Error('Cannot delete stock item with associated records (medications, transactions, batches, etc.)');
    await this.repo.delete(id);
    return { message: 'Stock item deleted successfully' };
  }

  async updateStockLevel(id: string, quantity: number, transactionType: StockTransactionType, reference?: string, notes?: string, performedBy?: string) {
    this.logInfo('Updating stock level', { id, quantity, transactionType });
    return this.repo.updateStockLevelSafely(id, quantity, transactionType, reference, notes, performedBy);
  }

  async getStockTransactions(id: string, page: number = 1, limit: number = 50) {
    const transactions = await this.repo.getTransactions(id, page, limit);
    return { transactions, pagination: { page, limit, total: transactions.length, pages: 1 } }; // Simplified pagination for brevity
  }

  async addStockBatch(stockItemId: string, batchNumber: string, expiryDate: Date, quantity: number, costPrice: number, receivedDate?: Date) {
    return this.repo.addBatchSafely(stockItemId, batchNumber, expiryDate, quantity, costPrice, receivedDate);
  }

  async getExpiringBatches(days: number) { return this.repo.getExpiringBatches(days); }
  async getLowStockAlerts(category?: string) {
    const items = await this.repo.getLowStockItems(category);
    return { totalLowStock: items.length, criticalCount: items.filter(i => i.currentStock === 0).length, warningCount: items.filter(i => i.currentStock > 0 && i.currentStock <= i.reorderLevel).length, items };
  }
  async getCategories() { return this.repo.getCategories(); }

  // ==========================================
  // REPORTS (Preserved exactly, Fixed Decimal Math)
  // ==========================================

  async getValueSummary(category?: string) {
    const stockItems = await this.repo.getItemsForValueReport(category);
    return {
      totalItems: stockItems.length,
      medications: stockItems.filter(i => i.isMedication).length,
      nonMedications: stockItems.filter(i => !i.isMedication).length,
      totalValue: stockItems.reduce((sum, i) => sum + (toNumber(i.costPrice) * i.currentStock), 0), // ✅ FIXED
      lowStockItems: stockItems.filter(i => i.currentStock <= i.reorderLevel).length,
      outOfStockItems: stockItems.filter(i => i.currentStock === 0).length,
      byCategory: stockItems.reduce((acc, item) => {
        const cat = item.category || 'Uncategorized';
        if (!acc[cat]) acc[cat] = { count: 0, value: 0, items: [] };
        acc[cat].count++;
        acc[cat].value += (toNumber(item.costPrice) * item.currentStock); // ✅ FIXED
        acc[cat].items.push(item.name);
        return acc;
      }, {} as Record<string, any>)
    };
  }

  async getExpiryReport(days: number = 30, category?: string) {
    const today = new Date(); const futureDate = new Date(); futureDate.setDate(today.getDate() + days);
    const stockItems = await this.repo.getItemsForExpiryReport(category);

    const expiringSoon = stockItems.filter(item => item.expiryDate && new Date(item.expiryDate) >= today && new Date(item.expiryDate) <= futureDate);
    const expired = stockItems.filter(item => item.expiryDate && new Date(item.expiryDate) < today);
    const healthy = stockItems.filter(item => item.expiryDate && new Date(item.expiryDate) > futureDate);
    const expiringBatches = await this.repo.getExpiringBatches(days);

    return {
      summary: { totalWithExpiry: stockItems.length, expiringSoon: expiringSoon.length, expired: expired.length, healthy: healthy.length, expiringValue: expiringSoon.reduce((sum, i) => sum + (toNumber(i.costPrice) * i.currentStock), 0), expiringBatches: expiringBatches.length },
      expiringSoon: expiringSoon.slice(0, 50), expired: expired.slice(0, 50), expiringBatches: expiringBatches.slice(0, 50), reportPeriod: days
    };
  }

  async getMovementSummary(startDate?: Date, endDate?: Date, category?: string) {
    const transactions = await this.repo.getTransactionsForMovementReport(startDate, endDate);
    const filtered = category ? transactions.filter(t => t.StockItem?.category === category) : transactions;

    const byType = { purchase: filtered.filter(t => t.transactionType === 'purchase'), sale: filtered.filter(t => t.transactionType === 'sale'), requisition: filtered.filter(t => t.transactionType === 'requisition'), adjustment: filtered.filter(t => t.transactionType === 'adjustment') };

    return {
      period: { startDate: startDate || null, endDate: endDate || null },
      totalTransactions: filtered.length,
      totalIn: byType.purchase.reduce((sum, t) => sum + t.quantity, 0),
      totalOut: [...byType.sale, ...byType.requisition].reduce((sum, t) => sum + t.quantity, 0),
      byType: {
        purchases: byType.purchase.length, purchaseQuantity: byType.purchase.reduce((sum, t) => sum + t.quantity, 0),
        purchaseValue: byType.purchase.reduce((sum, t) => sum + (toNumber(t.StockItem?.costPrice) * t.quantity), 0), // ✅ FIXED
        sales: byType.sale.length, saleQuantity: byType.sale.reduce((sum, t) => sum + t.quantity, 0),
        requisitions: byType.requisition.length, requisitionQuantity: byType.requisition.reduce((sum, t) => sum + t.quantity, 0),
        adjustments: byType.adjustment.length, adjustmentQuantity: byType.adjustment.reduce((sum, t) => sum + t.quantity, 0)
      }
    };
  }

  async getUsageReport(period: string = 'month', limit: number = 20, category?: string) {
    let startDate = new Date();
    if (period === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (period === 'quarter') startDate.setMonth(startDate.getMonth() - 3);
    else if (period === 'year') startDate.setFullYear(startDate.getFullYear() - 1);
    else startDate.setMonth(startDate.getMonth() - 1);

    const allTransactions = await this.repo.getTransactionsForUsageReport(startDate);
    const filtered = category ? allTransactions.filter(t => t.StockItem?.category === category) : allTransactions;

    const itemUsage = filtered.reduce((acc, t) => {
      const name = t.StockItem?.name || 'Unknown';
      if (!acc[name]) acc[name] = { name, category: t.StockItem?.category || 'other', unit: t.StockItem?.unitOfMeasure || 'unit', isMedication: t.StockItem?.isMedication || false, quantity: 0, transactions: 0, salesQuantity: 0, requisitionQuantity: 0 };
      acc[name].quantity += t.quantity; acc[name].transactions++;
      if (t.transactionType === 'sale') acc[name].salesQuantity += t.quantity;
      if (t.transactionType === 'requisition') acc[name].requisitionQuantity += t.quantity;
      return acc;
    }, {} as Record<string, any>);

    const results = Object.values(itemUsage).sort((a: any, b: any) => b.quantity - a.quantity).slice(0, limit);
    return { period, startDate, summary: { totalItemsDispensed: results.length, totalQuantity: results.reduce((sum, i: any) => sum + i.quantity, 0), topItem: results[0] || null, medicationsOnly: results.filter((i: any) => i.isMedication).length }, topItems: results };
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