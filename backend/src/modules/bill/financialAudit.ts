import { Prisma } from '@prisma/client';
import { appendAuditLogWithinTransaction } from '../../services/auditChain';

const amount = (value: unknown): number => value == null ? 0 : Number(String(value));

function billFinancialState(bill: any) {
  return {
    paidAmount: amount(bill.paidAmount),
    balance: amount(bill.balance),
    status: bill.status,
  };
}

/** Append a payment ledger event and its matching bill-balance transition atomically. */
export async function appendPaymentFinancialAudit(
  tx: any,
  actorId: string,
  payment: any,
  billBefore: any,
  billAfter: any,
  source: string,
) {
  if (!tx?.auditLog || typeof tx.$queryRawUnsafe !== 'function') return;
  await appendAuditLogWithinTransaction(tx as Prisma.TransactionClient, {
    entityType: 'Payment',
    entityId: payment.id,
    action: 'create',
    performedById: actorId,
    newState: {
      id: payment.id,
      billId: payment.billId,
      amount: amount(payment.amount),
      paymentMethod: payment.paymentMethod,
      receivedById: payment.receivedById ?? actorId,
      transactionDate: payment.transactionDate,
    },
    metadata: { source },
  });

  await appendAuditLogWithinTransaction(tx as Prisma.TransactionClient, {
    entityType: 'Bill',
    entityId: billAfter.id,
    action: 'update',
    performedById: actorId,
    previousState: billFinancialState(billBefore),
    newState: billFinancialState(billAfter),
    metadata: { source: 'payment_balance_transition', paymentId: payment.id },
  });
}

/** Append a refund ledger event and its matching bill-balance transition atomically. */
export async function appendRefundFinancialAudit(
  tx: any,
  actorId: string,
  refund: any,
  billBefore: any,
  billAfter: any,
  source: string,
) {
  if (!tx?.auditLog || typeof tx.$queryRawUnsafe !== 'function') return;
  await appendAuditLogWithinTransaction(tx as Prisma.TransactionClient, {
    entityType: 'Refund',
    entityId: refund.id,
    action: 'create',
    performedById: actorId,
    newState: {
      id: refund.id,
      refundNumber: refund.refundNumber,
      billId: refund.billId,
      paymentId: refund.paymentId,
      amount: amount(refund.amount),
      refundMethod: refund.refundMethod,
      processedById: refund.processedById ?? actorId,
      refundedAt: refund.refundedAt,
    },
    metadata: { source },
  });

  await appendAuditLogWithinTransaction(tx as Prisma.TransactionClient, {
    entityType: 'Bill',
    entityId: billAfter.id,
    action: 'update',
    performedById: actorId,
    previousState: billFinancialState(billBefore),
    newState: billFinancialState(billAfter),
    metadata: { source: 'refund_balance_transition', refundId: refund.id },
  });
}

/** Generic structured financial event for bill adjustments beyond collections/refunds. */
export async function appendStructuredFinancialAudit(
  tx: any,
  actorId: string,
  entityType: string,
  entityId: string,
  action: 'create' | 'update' | 'delete',
  previousState: Record<string, unknown> | undefined,
  newState: Record<string, unknown> | undefined,
  metadata: Record<string, unknown>,
) {
  if (!tx?.auditLog || typeof tx.$queryRawUnsafe !== 'function') return;
  await appendAuditLogWithinTransaction(tx as Prisma.TransactionClient, {
    entityType,
    entityId,
    action,
    performedById: actorId,
    ...(previousState ? { previousState } : {}),
    ...(newState ? { newState } : {}),
    metadata,
  });
}
