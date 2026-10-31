// src/seed/testSeed/inventory.ts
//
// Everything that moves stock after the pharmacy has dispensed, and then the single
// write-back of the ledger the whole run has been accumulating.
//
// The ledger is deliberately not flushed between documents: a requisition that takes
// units out of the store and a purchase that puts them back are both recorded against
// the same in-memory numbers, so the quantities written to the database at the end are
// the quantities the workflow would have reached, in the order it would have reached
// them, and no location is ever driven below zero.
import { Prisma } from '@prisma/client';
import type { GeneratedRequisition, GeneratedStockTransfer } from '../bulkGenerator.js';
import { ENUMS, type Lookups } from './lookups.js';
import type { Movement, StockLedger } from './stockLedger.js';
import { chunk, pickEnum, prisma, writeMany, type SeedStats } from './shared.js';

let requisitionCounter = 0;
const nextRequisitionId = () => `seedreq-${(++requisitionCounter).toString().padStart(6, '0')}`;
let transferCounter = 0;
const nextTransferId = () => `seedtr-${(++transferCounter).toString().padStart(6, '0')}`;

const transactionTypeOf = (value: string) =>
  ENUMS.stockTransactionType[value as keyof typeof ENUMS.stockTransactionType] ?? ENUMS.stockTransactionType.adjustment;

/**
 * Write the accumulated ledger once, in dependency order: the lots a receipt invented,
 * the quantity of every lot that moved, the location balances, the hospital-wide
 * aggregate on the item, and finally the transaction history that explains them.
 */
export const flushStockLedger = async (
  ledger: StockLedger,
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const newBatches = ledger.pendingBatches();
  await writeMany(
    'stock batches',
    (part) => prisma.stockBatch.createMany({ data: part, skipDuplicates: true }),
    newBatches.map((batch) => ({
      id: batch.id,
      stockItemId: batch.stockItemId,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      quantity: batch.quantity,
      costPrice: batch.costPrice,
      receivedDate: batch.receivedDate,
      isActive: true,
      departmentId: batch.departmentId,
      wardId: batch.wardId,
    })),
    stats,
    planned,
  );

  const writes = ledger.pendingWrites();

  // Lot quantities are absolute snapshots of the ledger, written in small parallel
  // batches because a single rejected decrement would otherwise cost the whole run.
  for (const part of chunk(writes.batches, 50)) {
    await Promise.all(part.map((batch) => prisma.stockBatch.update({ where: { id: batch.id }, data: { quantity: batch.quantity } })));
  }
  stats['stock lots updated'] = (stats['stock lots updated'] ?? 0) + writes.batches.length;

  for (const part of chunk(writes.balances, 50)) {
    await Promise.all(part.map((balance) => prisma.stockItemDepartmentBalance.upsert({
      where: { stockItemId_locationKey: { stockItemId: balance.stockItemId, locationKey: balance.locationKey } },
      create: {
        stockItemId: balance.stockItemId, locationKey: balance.locationKey,
        departmentId: balance.departmentId, wardId: balance.wardId, quantity: balance.quantity,
      },
      update: { quantity: balance.quantity },
    })));
  }
  stats['location balances'] = (stats['location balances'] ?? 0) + writes.balances.length;

  for (const part of chunk(writes.stockItems, 50)) {
    await Promise.all(part.map((item) => prisma.stockItem.update({ where: { id: item.id }, data: { currentStock: item.currentStock } })));
  }
  stats['stock items'] = (stats['stock items'] ?? 0) + writes.stockItems.length;

  const transactions: Prisma.StockTransactionCreateManyInput[] = writes.transactions.map((movement: Movement) => ({
    stockItemId: movement.stockItemId,
    transactionType: transactionTypeOf(movement.transactionType),
    quantity: movement.quantity,
    balanceAfter: movement.balanceAfter,
    reference: movement.reference,
    notes: movement.notes,
    transactionDate: movement.transactionDate,
    performedBy: movement.performedBy || null,
    departmentId: movement.departmentId,
    wardId: movement.wardId,
    invoiceId: movement.invoiceId ?? null,
    requisitionId: movement.requisitionId ?? null,
    batchAllocations: movement.batchAllocations ? (movement.batchAllocations as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
    adjustmentDirection: movement.adjustmentDirection,
    createdAt: movement.transactionDate,
    updatedAt: movement.transactionDate,
  }));
  await writeMany('stock transactions', (part) => prisma.stockTransaction.createMany({ data: part }), transactions, stats, planned);
  console.log(`✅ ${writes.transactions.length} stock movements, ${newBatches.length} new lots received`);
};

/**
 * Requisitions. A request from a department moves stock between two stock-holding
 * locations; a request from a ward issues it for use, which is the distinction the
 * fulfilment transaction makes and the reason the hospital-wide aggregate only falls
 * for the ward.
 */
export const seedRequisitions = async (
  lookups: Lookups,
  ledger: StockLedger,
  requisitions: GeneratedRequisition[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const headers: Prisma.RequisitionCreateManyInput[] = [];
  const items: Prisma.RequisitionItemCreateManyInput[] = [];
  let fulfilledLines = 0;
  let shortLines = 0;

  for (const plan of requisitions) {
    const ward = plan.requestingWardName ? lookups.wardByName.get(plan.requestingWardName) : null;
    const requestingDepartmentId = ward
      ? null
      : lookups.departmentIdByName.get(plan.requestingDepartmentName) ?? null;
    const supplyingDepartmentId = lookups.departmentIdByName.get(plan.supplyingDepartmentName)
      ?? lookups.departmentIdByName.get('Pharmacy')
      ?? null;
    if (!supplyingDepartmentId) continue;
    if (!ward && !requestingDepartmentId) continue;

    const status = pickEnum(ENUMS.requisitionStatus, plan.status) ?? ENUMS.requisitionStatus.draft;
    // The plan's own timestamps decide who signed what: a submitted requisition has been
    // sent but not yet approved, so it must not carry an approver.
    const approved = plan.approvedAt != null;
    const fulfilling = status === ENUMS.requisitionStatus.fulfilled && plan.fulfilledAt != null;
    const id = nextRequisitionId();

    headers.push({
      id,
      requisitionNumber: plan.requisitionNumber,
      requestingDepartmentId,
      supplyingDepartmentId,
      requestingWardId: ward?.id ?? null,
      requestedById: lookups.actorId(plan.requestedBy),
      urgency: pickEnum(ENUMS.requisitionUrgency, plan.urgency) ?? ENUMS.requisitionUrgency.routine,
      requiredDate: plan.requiredDate,
      purpose: plan.purpose,
      status,
      approvedById: approved ? lookups.actorId(plan.approvedBy) : null,
      approvedAt: plan.approvedAt,
      fulfilledById: fulfilling ? lookups.actorId(plan.fulfilledBy) : null,
      fulfilledAt: plan.fulfilledAt,
      notes: plan.notes,
      createdAt: plan.createdAt,
      updatedAt: plan.fulfilledAt ?? plan.approvedAt ?? plan.createdAt,
    });

    plan.items.forEach((line, position) => {
      const stock = lookups.stockSlot(line.stockItemSlot);
      if (!stock) return;
      const quantityRequested = Math.max(1, line.quantityRequested);
      const quantityApproved = approved ? Math.max(0, line.quantityApproved ?? quantityRequested) : 0;
      let quantityFulfilled = 0;

      if (fulfilling && quantityApproved > 0) {
        // A requisition can be fulfilled short of what was approved, so the quantity the
        // plan says went out is what moves - and the ledger decides whether the store had it.
        const move = Math.min(quantityApproved, Math.max(0, line.quantityFulfilled ?? quantityApproved));
        const outcome = ledger.consume(stock.id, move, {
          departmentId: supplyingDepartmentId,
          reference: `REQ-${plan.requisitionNumber}`,
          notes: ward
            ? `Issued to ward ${ward.wardName} on requisition ${plan.requisitionNumber}.`
            : `Transferred out on requisition ${plan.requisitionNumber}.`,
          performedBy: lookups.actorId(plan.fulfilledBy),
          transactionType: ward ? 'requisition' : 'transfer_out',
          transactionDate: plan.fulfilledAt ?? plan.createdAt,
          requisitionId: id,
        });
        if (!outcome.ok) { shortLines++; return; }
        quantityFulfilled = move;
        fulfilledLines++;

        // A department request receives the same lots into its own location; a ward
        // request consumes them where they are needed and holds nothing.
        if (!ward && requestingDepartmentId) {
          for (const allocation of outcome.allocations) {
            ledger.receive({
              stockItemId: stock.id,
              quantity: allocation.quantity,
              batchNumber: allocation.batchNumber,
              expiryDate: allocation.expiryDate,
              costPrice: Number(allocation.costPrice),
              departmentId: requestingDepartmentId,
              wardId: null,
              receivedDate: plan.fulfilledAt ?? plan.createdAt,
              reference: `REQ-${plan.requisitionNumber}`,
              notes: `Received from ${plan.supplyingDepartmentName} on requisition ${plan.requisitionNumber}.`,
              performedBy: lookups.actorId(plan.fulfilledBy),
              transactionType: 'transfer_in',
              transactionDate: plan.fulfilledAt ?? plan.createdAt,
              requisitionId: id,
              existingBatchId: ledger.batchIdAtLocation(stock.id, allocation.batchNumber, requestingDepartmentId),
            });
          }
        }
      }

      items.push({
        id: `${id}-${position + 1}`,
        requisitionId: id,
        stockItemId: stock.id,
        quantityRequested,
        quantityApproved: approved ? quantityApproved : null,
        quantityFulfilled,
        purpose: line.purpose,
        performedBy: fulfilling && quantityFulfilled > 0 ? lookups.actorId(plan.fulfilledBy) : null,
        createdAt: plan.createdAt,
        updatedAt: plan.fulfilledAt ?? plan.approvedAt ?? plan.createdAt,
      });
    });
  }

  await writeMany('requisitions', (part) => prisma.requisition.createMany({ data: part, skipDuplicates: true }), headers, stats, planned);
  await writeMany('requisition items', (part) => prisma.requisitionItem.createMany({ data: part }), items, stats, planned);
  console.log(`✅ ${headers.length} requisitions, ${fulfilledLines} lines issued${shortLines ? `, ${shortLines} short of stock` : ''}`);
};

/**
 * Stock transfers between two departments. Only a dispatched transfer has actually
 * left the origin, and only a received one has arrived - so the destination balance
 * moves on the received leg alone, exactly as the transfer workflow records it.
 */
export const seedStockTransfers = async (
  lookups: Lookups,
  ledger: StockLedger,
  transfers: GeneratedStockTransfer[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const headers: Prisma.StockTransferCreateManyInput[] = [];
  const items: Prisma.StockTransferItemCreateManyInput[] = [];
  let dispatchedLines = 0;
  let shortLines = 0;

  for (const plan of transfers) {
    const originId = lookups.departmentIdByName.get(plan.originDepartmentName)
      ?? lookups.departmentIdByName.get('Pharmacy')
      ?? null;
    const destinationId = lookups.departmentIdByName.get(plan.destinationDepartmentName) ?? null;
    if (!originId || !destinationId || originId === destinationId) continue;

    const status = pickEnum(ENUMS.transferStatus, plan.status) ?? ENUMS.transferStatus.requested;
    const isDispatched = status === ENUMS.transferStatus.dispatched || status === ENUMS.transferStatus.received;
    const isReceived = status === ENUMS.transferStatus.received;
    const id = nextTransferId();

    headers.push({
      id,
      transferNumber: plan.transferNumber,
      originId,
      destinationId,
      status,
      requestedById: lookups.actorId(plan.requestedBy),
      approvedById: plan.approvedBy ? lookups.actorId(plan.approvedBy) : null,
      dispatchedAt: isDispatched ? plan.dispatchedAt : null,
      receivedAt: isReceived ? plan.receivedAt : null,
      notes: plan.notes,
      createdAt: plan.createdAt,
      updatedAt: plan.receivedAt ?? plan.dispatchedAt ?? plan.createdAt,
    });

    if (!isDispatched) {
      // Nothing has physically moved, but the request still lists what it asks for.
      plan.items.forEach((line, position) => {
        const stock = lookups.stockSlot(line.stockItemSlot);
        if (!stock) return;
        items.push({
          id: `${id}-${position + 1}`,
          transferId: id,
          stockItemId: stock.id,
          quantityRequested: Math.max(1, line.quantityRequested),
          quantitySent: 0,
          quantityReceived: 0,
        });
      });
      continue;
    }

    plan.items.forEach((line, position) => {
      const stock = lookups.stockSlot(line.stockItemSlot);
      if (!stock) return;
      const quantitySent = Math.max(0, line.quantitySent);
      let allocations: unknown = null;

      if (quantitySent > 0) {
        const outcome = ledger.consume(stock.id, quantitySent, {
          departmentId: originId,
          reference: plan.transferNumber,
          notes: `Dispatched to ${destinationId}; stock reserved in transit.`,
          performedBy: lookups.actorId(plan.requestedBy),
          transactionType: 'transfer_out',
          transactionDate: plan.dispatchedAt ?? plan.createdAt,
        });
        if (!outcome.ok) { shortLines++; return; }
        dispatchedLines++;
        allocations = outcome.allocations;

        if (isReceived) {
          for (const allocation of outcome.allocations) {
            ledger.receive({
              stockItemId: stock.id,
              quantity: allocation.quantity,
              // The lot keeps its identity at the destination so the two locations can be
              // reconciled line by line, exactly as the receipt transaction restores it.
              batchNumber: allocation.batchNumber,
              expiryDate: allocation.expiryDate,
              costPrice: Number(allocation.costPrice),
              departmentId: destinationId,
              wardId: null,
              receivedDate: plan.receivedAt ?? plan.createdAt,
              reference: plan.transferNumber,
              notes: `Received reserved stock from ${plan.originDepartmentName}.`,
              performedBy: lookups.actorId(plan.requestedBy),
              transactionType: 'transfer_in',
              transactionDate: plan.receivedAt ?? plan.createdAt,
              existingBatchId: ledger.batchIdAtLocation(stock.id, allocation.batchNumber, destinationId),
            });
          }
        }
      }

      items.push({
        id: `${id}-${position + 1}`,
        transferId: id,
        stockItemId: stock.id,
        quantityRequested: Math.max(1, line.quantityRequested),
        quantitySent,
        // Receipt hands over the whole dispatched quantity; a shortfall would leave the
        // transfer item permanently out of balance.
        quantityReceived: isReceived ? quantitySent : 0,
        batchAllocations: (allocations ?? Prisma.DbNull) as Prisma.InputJsonValue,
      });
    });
  }

  await writeMany('stock transfers', (part) => prisma.stockTransfer.createMany({ data: part, skipDuplicates: true }), headers, stats, planned);
  await writeMany('stock transfer items', (part) => prisma.stockTransferItem.createMany({ data: part }), items, stats, planned);
  console.log(`✅ ${headers.length} transfers, ${dispatchedLines} lines dispatched${shortLines ? `, ${shortLines} short of stock` : ''}`);
};
