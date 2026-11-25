import type { BillStatus } from '@prisma/client';

/** Money rounded to the cent, the unit every billing column stores. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** A refund must be expressed in whole cents; reject fractions of a pesewa. */
export function isValidRefundAmount(value: unknown): boolean {
  if (typeof value !== 'number' && typeof value !== 'string') return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  const amount = Number(value);
  return Number.isFinite(amount)
    && amount > 0
    && Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-7;
}

/**
 * What is still refundable on one recorded payment.
 *
 * Never negative: a legacy or manually corrected row can carry more refunds than
 * the original payment, and the API must report zero rather than a credit.
 */
export function refundableAmount(paymentAmount: number, alreadyRefunded: number): number {
  return Math.max(0, roundMoney(roundMoney(paymentAmount) - roundMoney(alreadyRefunded)));
}

/**
 * The bill status after money is handed back.
 *
 * A refund re-opens the liability: nothing paid means pending, some paid means
 * partial, and a zero balance (possible when a waiver covers the rest) is paid.
 */
export function billStatusAfterRefund(paidAfter: number, balanceAfter: number): BillStatus {
  if (balanceAfter <= 0) return 'paid';
  return paidAfter > 0 ? 'partial' : 'pending';
}
