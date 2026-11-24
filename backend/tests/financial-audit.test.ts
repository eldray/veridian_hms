import { describe, expect, it, vi } from 'vitest';
import { appendPaymentFinancialAudit, appendRefundFinancialAudit, appendStructuredFinancialAudit } from '../src/modules/bill/financialAudit';

function buildTransaction() {
  const rows: any[] = [];
  const tx: any = {
    $queryRawUnsafe: vi.fn().mockResolvedValue(1),
    auditLog: {
      findMany: vi.fn(async () => rows.slice(-50).reverse()),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `audit-${rows.length + 1}`, ...data };
        rows.push(row);
        return row;
      }),
    },
  };
  return { tx, rows };
}

describe('transactional financial audit', () => {
  it('records a payment and bill balance transition without free-text payment details', async () => {
    const { tx, rows } = buildTransaction();
    await appendPaymentFinancialAudit(
      tx,
      'user-1',
      {
        id: 'payment-1', billId: 'bill-1', amount: '25.50', paymentMethod: 'cash',
        receivedById: 'user-1', transactionDate: new Date('2026-11-24T10:00:00Z'),
        reference: 'provider reference', notes: 'sensitive cashier note',
      },
      { id: 'bill-1', paidAmount: 0, balance: 50, status: 'pending' },
      { id: 'bill-1', paidAmount: 25.5, balance: 24.5, status: 'partial' },
      'test_payment',
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].entityType).toBe('Payment');
    expect(rows[0].newState).toMatchObject({ id: 'payment-1', billId: 'bill-1', amount: 25.5, paymentMethod: 'cash' });
    expect(rows[0].newState).not.toHaveProperty('reference');
    expect(rows[0].newState).not.toHaveProperty('notes');
    expect(rows[1].entityType).toBe('Bill');
    expect(rows[1].previousState).toEqual({ paidAmount: 0, balance: 50, status: 'pending' });
    expect(rows[1].newState).toEqual({ paidAmount: 25.5, balance: 24.5, status: 'partial' });
  });

  it('records structured waiver and bill-line adjustments without free-text reasons', async () => {
    const { tx, rows } = buildTransaction();
    await appendStructuredFinancialAudit(
      tx, 'user-3', 'PatientWaiver', 'waiver-1', 'update',
      { id: 'waiver-1', status: 'approved', appliedAt: null, amountApproved: 20 },
      { id: 'waiver-1', status: 'approved', appliedAt: new Date('2026-11-24T12:00:00Z'), amountApproved: 20 },
      { source: 'approved_waiver_application' },
    );
    await appendStructuredFinancialAudit(
      tx, 'user-3', 'BillLineItem', 'line-1', 'update',
      { id: 'line-1', isVoided: false, lineTotal: 15 },
      { id: 'line-1', isVoided: true, lineTotal: 15, voidedById: 'user-3' },
      { source: 'bill_line_item_void' },
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].entityType).toBe('PatientWaiver');
    expect(rows[1].entityType).toBe('BillLineItem');
    expect(rows[1].newState).not.toHaveProperty('voidReason');
  });

  it('records a refund and bill balance transition without the refund reason or reference', async () => {
    const { tx, rows } = buildTransaction();
    await appendRefundFinancialAudit(
      tx,
      'user-2',
      {
        id: 'refund-1', refundNumber: 'RFD-1', billId: 'bill-1', paymentId: 'payment-1',
        amount: '10.00', refundMethod: 'cash', processedById: 'user-2',
        refundedAt: new Date('2026-11-24T11:00:00Z'), reason: 'private reason', reference: 'private ref',
      },
      { id: 'bill-1', paidAmount: 25.5, balance: 24.5, status: 'partial' },
      { id: 'bill-1', paidAmount: 15.5, balance: 34.5, status: 'partial' },
      'test_refund',
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].entityType).toBe('Refund');
    expect(rows[0].newState).toMatchObject({ id: 'refund-1', billId: 'bill-1', paymentId: 'payment-1', amount: 10, refundMethod: 'cash' });
    expect(rows[0].newState).not.toHaveProperty('reason');
    expect(rows[0].newState).not.toHaveProperty('reference');
    expect(rows[1].entityType).toBe('Bill');
    expect(rows[1].previousState).toEqual({ paidAmount: 25.5, balance: 24.5, status: 'partial' });
    expect(rows[1].newState).toEqual({ paidAmount: 15.5, balance: 34.5, status: 'partial' });
  });
});
