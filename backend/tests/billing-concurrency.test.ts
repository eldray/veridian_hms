import { describe, expect, it, vi } from 'vitest';
import { BillRepository } from '../src/modules/bill/BillRepository';

describe('billing payment concurrency guards', () => {
  it('uses an atomic balance condition before recording a payment', async () => {
    const billFindUnique = vi.fn()
      .mockResolvedValueOnce({ id: 'bill-1', balance: 100, paidAmount: 0, patientPayable: 100, attendanceId: 'attendance-1' })
      .mockResolvedValueOnce({ id: 'bill-1', balance: 0, paidAmount: 100, patientPayable: 100, attendanceId: 'attendance-1' });
    const billUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const billUpdate = vi.fn().mockResolvedValue({ id: 'bill-1', balance: 0, status: 'paid' });
    const paymentCreate = vi.fn().mockResolvedValue({ id: 'payment-1', amount: 100 });
    const attendanceUpdate = vi.fn().mockResolvedValue({ id: 'attendance-1' });
    const tx: any = {
      bill: { findUnique: billFindUnique, updateMany: billUpdateMany, update: billUpdate },
      payment: { create: paymentCreate },
      attendance: { update: attendanceUpdate },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillRepository(prisma);

    const result = await repository.addPayment('bill-1', {
      amount: 100,
      paymentMethod: 'cash' as any,
    }, 'cashier-1');

    expect(billUpdateMany).toHaveBeenCalledWith({
      where: { id: 'bill-1', balance: { gte: 100 }, status: { not: 'cancelled' } },
      data: { paidAmount: { increment: 100 }, balance: { decrement: 100 } },
    });
    expect(result.payment.id).toBe('payment-1');
    expect(attendanceUpdate).toHaveBeenCalledWith({
      where: { id: 'attendance-1' },
      data: { outstandingBalance: 0 },
    });
  });

  it('rejects a payment if another cashier has already reduced the balance', async () => {
    const billFindUnique = vi.fn()
      .mockResolvedValueOnce({ id: 'bill-1', balance: 100, paidAmount: 0, patientPayable: 100, attendanceId: 'attendance-1' })
      .mockResolvedValueOnce({ id: 'bill-1', balance: 20 });
    const billUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
    const paymentCreate = vi.fn();
    const tx: any = {
      bill: { findUnique: billFindUnique, updateMany: billUpdateMany, update: vi.fn() },
      payment: { create: paymentCreate },
      attendance: { update: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillRepository(prisma);

    await expect(repository.addPayment('bill-1', {
      amount: 80,
      paymentMethod: 'cash' as any,
    }, 'cashier-2')).rejects.toThrow(/refresh the bill and try again/i);

    expect(paymentCreate).not.toHaveBeenCalled();
    expect(billUpdateMany).toHaveBeenCalledWith({
      where: { id: 'bill-1', balance: { gte: 80 }, status: { not: 'cancelled' } },
      data: { paidAmount: { increment: 80 }, balance: { decrement: 80 } },
    });
  });
});


  it('returns the original payment when the same idempotency key is retried', async () => {
    const priorPayment = { id: 'payment-existing', billId: 'bill-1', amount: 25, idempotencyKey: 'retry-key' };
    const tx: any = {
      payment: { findUnique: vi.fn().mockResolvedValue(priorPayment), create: vi.fn() },
      bill: { findUnique: vi.fn().mockResolvedValue({ id: 'bill-1', balance: 75 }) },
      billLineItem: {},
      attendance: { update: vi.fn() },
    };
    const prisma: any = {
      $transaction: vi.fn(async (callback: any) => callback(tx)),
      payment: { findUnique: vi.fn() },
      bill: { findUnique: vi.fn() },
    };
    const repository = new BillRepository(prisma);
    const result = await repository.addPayment('bill-1', {
      amount: 25,
      paymentMethod: 'cash' as any,
      idempotencyKey: 'retry-key',
    }, 'cashier-1');

    expect(result.payment.id).toBe('payment-existing');
    expect((result as any).duplicate).toBe(true);
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.bill.updateMany).toBeUndefined();
  });
