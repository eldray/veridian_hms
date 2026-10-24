import { describe, expect, it, vi } from 'vitest';
import { BillRepository } from '../src/modules/bill/BillRepository';
import { BillingRepository } from '../src/modules/billing/BillingRepository';

const uniqueConstraintError = () => Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

describe.each([
  {
    name: 'primary bill repository',
    create: (prisma: any) => new BillRepository(prisma),
    billId: 'bill-1',
    add: (repository: any, billId: string, data: any) => repository.addPayment(billId, data, 'cashier-1'),
  },
  {
    name: 'legacy billing repository',
    create: (prisma: any) => new BillingRepository(prisma),
    billId: 'bill-1',
    add: (repository: any, billId: string, data: any) => repository.addPayment(billId, { ...data, userId: 'cashier-1' }),
  },
])('concurrent idempotency collision - $name', ({ create, billId, add }) => {
  const setup = (winningPayment: any) => {
    const tx = {
      payment: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockRejectedValue(uniqueConstraintError()),
      },
      bill: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ id: billId, balance: 100, paidAmount: 0, attendanceId: null, status: 'pending' })
          .mockResolvedValueOnce({ id: billId, balance: 75, paidAmount: 25, attendanceId: null, status: 'partial' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({ id: billId, balance: 75, status: 'partial' }),
      },
      attendance: { update: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: any) => callback(tx)),
      payment: { findUnique: vi.fn().mockResolvedValue(winningPayment) },
      bill: { findUnique: vi.fn().mockResolvedValue({ id: billId, balance: 75, status: 'partial' }) },
    };
    return { tx, prisma };
  };

  it('rejects a same-bill key collision when payment details differ', async () => {
    const { tx, prisma } = setup({
      id: 'payment-winner', billId, amount: 25, paymentMethod: 'cash', reference: 'original-ref',
    });
    const repository = create(prisma as any);

    await expect(add(repository, billId, {
      amount: 25, paymentMethod: 'cash', reference: 'different-ref', idempotencyKey: 'race-key',
    })).rejects.toThrow(/different payment details/i);

    expect(tx.payment.create).toHaveBeenCalledOnce();
    expect(prisma.payment.findUnique).toHaveBeenCalledWith({ where: { idempotencyKey: 'race-key' } });
  });

  it('rejects a key collision when the winning payment belongs to another bill', async () => {
    const { tx, prisma } = setup({
      id: 'payment-winner', billId: 'bill-elsewhere', amount: 25, paymentMethod: 'cash', reference: null,
    });
    const repository = create(prisma as any);

    await expect(add(repository, billId, {
      amount: 25, paymentMethod: 'cash', idempotencyKey: 'race-key',
    })).rejects.toThrow(/already been used for another bill/i);

    expect(tx.payment.create).toHaveBeenCalledOnce();
  });
});
