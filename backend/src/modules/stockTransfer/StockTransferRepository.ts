import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { TransferQueryParams } from './StockTransferTypes';


/**
 * Adds an auditable in-transit quantity and reconciliation warnings to transfer
 * records. This is diagnostic only: legacy inconsistencies are surfaced for
 * review, never silently repaired or used to infer lot stock.
 */
export const annotateTransferReconciliation = (transfer: any) => {
  const items = Array.isArray(transfer?.items) ? transfer.items : [];
  const annotatedItems = items.map((item: any) => {
    const issues: string[] = [];
    const sent = item?.quantitySent;
    const received = item?.quantityReceived;
    const sentValid = Number.isSafeInteger(sent) && sent >= 0;
    const receivedValid = Number.isSafeInteger(received) && received >= 0;

    if (!sentValid) issues.push('Quantity sent is not a valid non-negative whole number.');
    if (!receivedValid) issues.push('Quantity received is not a valid non-negative whole number.');
    if (sentValid && receivedValid && received > sent) issues.push('Quantity received exceeds quantity sent.');

    if (transfer.status === 'dispatched') {
      if (!sentValid || sent <= 0) issues.push('Dispatched transfer has no valid positive sent quantity.');
      if (receivedValid && received > 0) issues.push('Transfer is still marked dispatched despite a recorded receipt; manual reconciliation is required.');
    } else if (transfer.status === 'received') {
      if (!sentValid || sent <= 0) issues.push('Received transfer has no valid positive sent quantity.');
      if (sentValid && receivedValid && received !== sent) issues.push('Transfer is marked received but sent and received quantities do not match.');
    }

    const batchTracked = Number(item?.stockItem?._count?.StockBatch ?? 0) > 0;
    if (batchTracked && ['dispatched', 'received'].includes(String(transfer.status))) {
      const allocations = item?.batchAllocations;
      if (!Array.isArray(allocations)) {
        issues.push('Batch-tracked transfer has missing or malformed batch allocations.');
      } else {
        let allocationTotal = 0;
        let validAllocations = true;
        for (const allocation of allocations) {
          if (!allocation || typeof allocation !== 'object' ||
              !Number.isSafeInteger(allocation.quantity) || allocation.quantity <= 0 ||
              typeof allocation.batchNumber !== 'string' || !allocation.batchNumber.trim()) {
            validAllocations = false;
            break;
          }
          allocationTotal += allocation.quantity;
          if (!Number.isSafeInteger(allocationTotal)) {
            validAllocations = false;
            break;
          }
        }
        if (!validAllocations) issues.push('Batch allocations contain invalid quantities or batch numbers.');
        else if (sentValid && allocationTotal !== sent) issues.push('Batch allocation total does not match quantity sent.');
      }
    }

    const quantitiesSafe = sentValid && receivedValid && received <= sent;
    const quantityInTransit = transfer.status === 'dispatched' && quantitiesSafe ? sent - received : 0;
    return { ...item, quantityInTransit, reconciliationIssues: issues, hasReconciliationIssues: issues.length > 0 };
  });
  const reconciliationIssues = annotatedItems.flatMap((item: any) =>
    item.reconciliationIssues.map((issue: string) => ({
      itemId: item.id,
      stockItemId: item.stockItemId,
      stockItemName: item.stockItem?.name || 'Unknown stock item',
      issue,
    })),
  );
  return {
    ...transfer,
    items: annotatedItems,
    hasStockInTransit: transfer.status === 'dispatched' && annotatedItems.some((item: any) => item.quantityInTransit > 0),
    hasReconciliationIssues: reconciliationIssues.length > 0,
    reconciliationIssues,
  };
};

const startOfCurrentDay = (): Date => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
};

export class StockTransferRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'stockTransfer');
  }

  async findAll(filters: TransferQueryParams) {
    const { originId, destinationId, status, page = 1, limit = 1000 } = filters;
    const where: any = {};
    if (originId) where.originId = originId;
    if (destinationId) where.destinationId = destinationId;
    // Keep transfer history scoped to the signed-in user's department unless
    // the controller explicitly grants an administrator cross-location view.
    if (!filters.includeAllStockLocations) {
      const departmentId = String(filters.departmentId || '');
      if (!departmentId) where.id = '__NO_ACCESS__';
      else where.OR = [{ originId: departmentId }, { destinationId: departmentId }];
    }
    if (status) where.status = status;

    const result = await this.findManyWithPagination({
      where, page, limit: Math.min(limit, 1000), orderBy: { createdAt: 'desc' },
      include: {
        origin: { select: { id: true, name: true } },
        destination: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
        items: { include: { stockItem: { select: { id: true, name: true, drugCode: true, _count: { select: { StockBatch: true } } } } } }
      }
    });

    // Keep register and detail diagnostics consistent. In-transit stock remains
    // excluded from department balances and is not added to aggregate stock twice.
    return {
      ...result,
      data: (result.data || []).map((transfer: any) => annotateTransferReconciliation(transfer)),
    };
  }

  async findByIdWithDetails(id: string) {
    const transfer = await this.getModel().findUnique({
      where: { id },
      include: {
        origin: { select: { id: true, name: true } },
        destination: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, fullName: true } },
        approvedBy: { select: { id: true, fullName: true } },
        items: { include: { stockItem: { select: { id: true, name: true, drugCode: true, unitOfMeasure: true, _count: { select: { StockBatch: true } } } } } }
      }
    });
    return transfer ? annotateTransferReconciliation(transfer) : null;
  }

  async createTransfer(data: any, userId: string, transferNumber: string) {
    return this.getModel().create({
      data: {
        transferNumber,
        originId: data.originId,
        destinationId: data.destinationId,
        status: 'requested',
        requestedById: userId,
        notes: data.notes,
        items: {
          create: data.items.map((i: any) => ({
            stockItemId: i.stockItemId,
            quantityRequested: i.quantityRequested
          }))
        }
      },
      include: { items: true, origin: true, destination: true }
    });
  }

  // ✅ CRITICAL: Gets batches from a specific department, sorted by Expiry Date (FEFO)
  async getBatchesByDepartment(stockItemId: string, departmentId: string, tx?: any) {
    const client = tx || this.prisma;
    return client.stockBatch.findMany({
      where: { stockItemId, departmentId, wardId: null, isActive: true, quantity: { gt: 0 }, expiryDate: { gte: startOfCurrentDay() } },
      // Deterministic FEFO: earliest expiry first, then oldest received batch.
      orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }]
    });
  }
}