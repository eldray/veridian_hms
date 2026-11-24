import { Prisma } from '@prisma/client';
import { appendAuditLogWithinTransaction } from '../../services/auditChain';

/**
 * Append a structured clinical event inside the same transaction as the
 * clinical write. Callers must provide only whitelisted, non-narrative fields:
 * never pass results, notes, instructions, symptoms, or patient identifiers.
 */
export async function appendClinicalRecordAudit(
  tx: any,
  actorId: string | undefined,
  entityType: string,
  entityId: string,
  action: 'create' | 'update' | 'delete',
  previousState?: Record<string, unknown>,
  newState?: Record<string, unknown>,
  metadata: Record<string, unknown> = {},
) {
  if (!actorId || !tx?.auditLog || typeof tx.$queryRawUnsafe !== 'function') return;
  await appendAuditLogWithinTransaction(tx as Prisma.TransactionClient, {
    entityType,
    entityId,
    action,
    performedById: actorId,
    ...(previousState ? { previousState } : {}),
    ...(newState ? { newState } : {}),
    metadata: { source: 'clinical_record_transaction', ...metadata },
  });
}
