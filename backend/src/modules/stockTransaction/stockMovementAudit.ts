import { Prisma } from '@prisma/client';
import { appendAuditLogWithinTransaction } from '../../services/auditChain';

type StockMovementAction = 'create' | 'update' | 'delete';

/**
 * Write a privacy-minimised stock-ledger audit event using the same transaction
 * as the movement. Free-text notes/references and patient identifiers are never
 * copied into the audit snapshot.
 */
export async function appendStockMovementAudit(
  tx: any,
  action: StockMovementAction,
  performedById: string | undefined,
  movement: any,
  previousState?: Record<string, unknown>,
  metadata?: Record<string, unknown>,
) {
  // System/legacy callers have no authenticated User FK to attach. Their
  // surrounding authenticated API request is still captured by auditWrites.
  if (!performedById || performedById === 'system') return;
  // Keep lightweight unit-test transaction doubles usable; real Prisma
  // transaction clients always expose both members.
  if (!tx?.auditLog || typeof tx.$queryRawUnsafe !== 'function') return;

  const snapshot = movement ? {
    id: movement.id,
    stockItemId: movement.stockItemId,
    transactionType: movement.transactionType,
    quantity: movement.quantity,
    balanceAfter: movement.balanceAfter,
    departmentId: movement.departmentId ?? null,
    wardId: movement.wardId ?? null,
    adjustmentDirection: movement.adjustmentDirection ?? null,
    performedBy: movement.performedBy ?? performedById,
    transactionDate: movement.transactionDate,
    createdAt: movement.createdAt,
  } : undefined;

  await appendAuditLogWithinTransaction(tx as Prisma.TransactionClient, {
    entityType: 'StockTransaction',
    entityId: String(movement?.id || previousState?.id || ''),
    action,
    performedById,
    ...(previousState ? { previousState } : {}),
    ...(action === 'create' && snapshot ? { newState: snapshot } : {}),
    metadata: { source: 'stock_movement_transaction', ...metadata },
  });
}
