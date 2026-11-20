import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/CounterService', () => ({
  getCounterService: () => ({ nextRefundNumber: () => 'RFD-10001' }),
}));

import { BillRepository } from '../src/modules/bill/BillRepository';
import { BillingRepository } from '../src/modules/billing/BillingRepository';
import { refundableAmount, billStatusAfterRefund, roundMoney } from '../src/utils/refunds';

const bill = (overrides: Record<string, any> = {}) => ({
  id: 'bill-1',
  attendanceId: 'attendance-1',
  status: 'paid',
  paidAmount: 100,
  balance: 0,
  totalAmount: 100,
  ...overrides,
});

const payment = (overrides: Record<string, any> = {}) => ({
  id: 'payment-1',
  billId: 'bill-1',
  amount: 100,
  paymentMethod: 'cash',
  isVoided: false,
  ...overrides,
});

const buildTx = (options: {
  bill?: Record<string, any>;
  payment?: Record<string, any> | null;
  priorRefunds?: Array<{ amount: any }>;
  updatedBill?: Record<string, any>;
} = {}) => {
  const refundCreate = vi.fn().mockResolvedValue({
    id: 'refund-1',
    refundNumber: 'RFD-10001',
    amount: 40,
  });
  const billUpdate = vi.fn().mockResolvedValue(options.updatedBill ?? bill());
  const attendanceUpdate = vi.fn().mockResolvedValue({ id: 'attendance-1' });
  const tx: any = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    bill: {
      findUnique: vi.fn().mockResolvedValue(options.bill ?? bill()),
      update: billUpdate,
    },
    payment: {
      findUnique: vi.fn().mockResolvedValue(options.payment === undefined ? payment() : options.payment),
    },
    refund: {
      findMany: vi.fn().mockResolvedValue(options.priorRefunds ?? []),
      create: refundCreate,
    },
    attendance: { update: attendanceUpdate },
  };
  return { tx, refundCreate, billUpdate, attendanceUpdate };
};

describe('refund helpers', () => {
  it('reports the unrefunded remainder and never goes negative', () => {
    expect(refundableAmount(100, 30)).toBe(70);
    expect(refundableAmount(100, 100)).toBe(0);
    expect(refundableAmount(100, 140)).toBe(0);
    expect(refundableAmount(0.1 + 0.2, 0)).toBe(0.3);
  });

  it('re-opens the liability when money is handed back', () => {
    expect(billStatusAfterRefund(0, 100)).toBe('pending');
    expect(billStatusAfterRefund(60, 40)).toBe('partial');
    expect(billStatusAfterRefund(100, 0)).toBe('paid');
  });

  it('rounds to the cent', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(Number.NaN)).toBe(0);
  });
});

describe('bill repository refunds', () => {
  it('reduces paid amount, reopens the balance and syncs the visit', async () => {
    const { tx, refundCreate, billUpdate, attendanceUpdate } = buildTx({
      updatedBill: bill({ paidAmount: 60, balance: 40, status: 'partial' }),
    });
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillRepository(prisma);

    const result = await repository.createRefund('bill-1', {
      paymentId: 'payment-1',
      amount: 40,
      reason: 'Patient declined the procedure',
      reference: 'VCH-22',
    }, 'cashier-1');

    expect(refundCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        refundNumber: 'RFD-10001',
        billId: 'bill-1',
        paymentId: 'payment-1',
        amount: 40,
        refundMethod: 'cash',
        reference: 'VCH-22',
        reason: 'Patient declined the procedure',
        processedById: 'cashier-1',
      }),
    });
    expect(billUpdate).toHaveBeenCalledWith({
      where: { id: 'bill-1' },
      data: { paidAmount: 60, balance: 40, status: 'partial' },
    });
    expect(attendanceUpdate).toHaveBeenCalledWith({
      where: { id: 'attendance-1' },
      data: { totalBill: 100, paidAmount: 60, outstandingBalance: 40 },
    });
    expect(result.refund.id).toBe('refund-1');
  });

  it('allows a partial refund against one payment', async () => {
    const { tx, billUpdate } = buildTx({
      bill: bill({ paidAmount: 100, balance: 0, status: 'paid', totalAmount: 100 }),
      updatedBill: bill({ paidAmount: 70, balance: 30, status: 'partial' }),
    });
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillRepository(prisma);

    await repository.createRefund('bill-1', {
      paymentId: 'payment-1',
      amount: 30,
      reason: 'Overpayment corrected',
    }, 'cashier-1');

    expect(billUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { paidAmount: 70, balance: 30, status: 'partial' },
    }));
  });

  it('rejects a refund larger than the payment remainder', async () => {
    const { tx, refundCreate } = buildTx({
      priorRefunds: [{ amount: 30 }],
    });
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillRepository(prisma);

    await expect(repository.createRefund('bill-1', {
      paymentId: 'payment-1',
      amount: 80,
      reason: 'Too much',
    }, 'cashier-1')).rejects.toThrow(/exceeds the unrefunded amount on this payment \(70\.00\)/i);
    expect(refundCreate).not.toHaveBeenCalled();
  });

  it('rejects a payment recorded on another bill', async () => {
    const { tx, refundCreate } = buildTx({ payment: payment({ billId: 'bill-2' }) });
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillRepository(prisma);

    await expect(repository.createRefund('bill-1', {
      paymentId: 'payment-1',
      amount: 10,
      reason: 'Wrong bill',
    }, 'cashier-1')).rejects.toThrow(/payment not found on this bill/i);
    expect(refundCreate).not.toHaveBeenCalled();
  });

  it('rejects a voided payment and a cancelled bill', async () => {
    const voided = buildTx({ payment: payment({ isVoided: true }) });
    const voidedPrisma: any = { $transaction: vi.fn(async (callback: any) => callback(voided.tx)) };
    await expect(new BillRepository(voidedPrisma).createRefund('bill-1', {
      paymentId: 'payment-1', amount: 10, reason: 'Voided payment',
    }, 'cashier-1')).rejects.toThrow(/was voided and cannot be refunded/i);
    expect(voided.refundCreate).not.toHaveBeenCalled();

    const cancelled = buildTx({ bill: bill({ status: 'cancelled' }) });
    const cancelledPrisma: any = { $transaction: vi.fn(async (callback: any) => callback(cancelled.tx)) };
    await expect(new BillRepository(cancelledPrisma).createRefund('bill-1', {
      paymentId: 'payment-1', amount: 10, reason: 'Cancelled bill',
    }, 'cashier-1')).rejects.toThrow(/cannot refund a cancelled bill/i);
    expect(cancelled.refundCreate).not.toHaveBeenCalled();
  });

  it('applies the same rules on the legacy billing module', async () => {
    const { tx, refundCreate, billUpdate } = buildTx({
      updatedBill: bill({ paidAmount: 0, balance: 100, status: 'pending' }),
    });
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillingRepository(prisma);

    await repository.createRefund('bill-1', {
      paymentId: 'payment-1',
      amount: 100,
      reason: 'Full refund',
    }, 'accounts-1');

    expect(refundCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 100, processedById: 'accounts-1' }),
    }));
    expect(billUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ paidAmount: 0, balance: 100, status: 'pending' }),
    }));
  });
});
