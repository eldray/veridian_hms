import { describe, expect, it, vi } from 'vitest';
import { BillRepository } from '../src/modules/bill/BillRepository';

describe('billing payment concurrency guards', () => {
  it('uses an atomic balance condition before recording a payment', async () => {
    const billFindUnique = vi.fn()
      .mockResolvedValueOnce({ id: 'bill-1', balance: 100, paidAmount: 0, patientPayable: 100, attendanceId: 'attendance-1' })
      .mockResolvedValueOnce({ id: 'bill-1', totalAmount: 100, balance: 0, paidAmount: 100, patientPayable: 100, attendanceId: 'attendance-1' });
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
      data: { totalBill: 100, paidAmount: 100, outstandingBalance: 0 },
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
    const priorPayment = { id: 'payment-existing', billId: 'bill-1', amount: 25, paymentMethod: 'cash', reference: null, idempotencyKey: 'retry-key' };
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


  it('records a partial payment and keeps the exact remaining balance', async () => {
    const billFindUnique = vi.fn()
      .mockResolvedValueOnce({ id: 'bill-1', balance: 100, paidAmount: 0, patientPayable: 100, attendanceId: 'attendance-1' })
      .mockResolvedValueOnce({ id: 'bill-1', totalAmount: 100, balance: 70, paidAmount: 30, patientPayable: 100, attendanceId: 'attendance-1' });
    const billUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const billUpdate = vi.fn().mockResolvedValue({ id: 'bill-1', balance: 70, status: 'partial' });
    const paymentCreate = vi.fn().mockResolvedValue({ id: 'payment-partial', amount: 30 });
    const attendanceUpdate = vi.fn().mockResolvedValue({ id: 'attendance-1' });
    const tx: any = {
      bill: { findUnique: billFindUnique, updateMany: billUpdateMany, update: billUpdate },
      payment: { create: paymentCreate },
      attendance: { update: attendanceUpdate },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillRepository(prisma);

    const result = await repository.addPayment('bill-1', {
      amount: 30,
      paymentMethod: 'cash' as any,
    }, 'cashier-1');

    expect(result.bill.status).toBe('partial');
    expect(result.bill.balance).toBe(70);
    expect(result.payment.amount).toBe(30);
    expect(attendanceUpdate).toHaveBeenCalledWith({
      where: { id: 'attendance-1' },
      data: { totalBill: 100, paidAmount: 30, outstandingBalance: 70 },
    });
  });


import { BillingRepository } from '../src/modules/billing/BillingRepository';
import { BillService } from '../src/modules/bill/BillService';
import { BillingService } from '../src/modules/billing/BillingService';

describe('legacy billing-module payment safeguards', () => {
  it('returns the existing payment for an idempotent retry without changing balances', async () => {
    const existingPayment = { id: 'payment-legacy', billId: 'bill-legacy', amount: 20, paymentMethod: 'cash', reference: null, idempotencyKey: 'retry-key' };
    const tx: any = {
      payment: { findUnique: vi.fn().mockResolvedValue(existingPayment), create: vi.fn() },
      bill: { findUnique: vi.fn().mockResolvedValue({ id: 'bill-legacy', balance: 80 }), updateMany: vi.fn(), update: vi.fn() },
      attendance: { update: vi.fn() },
    };
    const prisma: any = {
      $transaction: vi.fn(async (callback: any) => callback(tx)),
      payment: { findUnique: vi.fn() },
      bill: { findUnique: vi.fn() },
    };
    const repository = new BillingRepository(prisma);

    const result = await repository.addPayment('bill-legacy', {
      amount: 20,
      paymentMethod: 'cash',
      idempotencyKey: 'retry-key',
      userId: 'cashier-1',
    });

    expect(result.payment.id).toBe('payment-legacy');
    expect(result.duplicate).toBe(true);
    expect(tx.bill.updateMany).not.toHaveBeenCalled();
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('keeps the outstanding balance after a partial payment in the legacy billing module', async () => {
    const findUnique = vi.fn()
      .mockResolvedValueOnce({ id: 'bill-legacy', balance: 100, paidAmount: 0, attendanceId: 'attendance-legacy', status: 'pending' })
      .mockResolvedValueOnce({ id: 'bill-legacy', totalAmount: 100, balance: 70, paidAmount: 30, attendanceId: 'attendance-legacy', status: 'pending' });
    const tx: any = {
      payment: { create: vi.fn().mockResolvedValue({ id: 'payment-legacy-partial', amount: 30 }) },
      bill: {
        findUnique,
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({ id: 'bill-legacy', balance: 70, status: 'partial' }),
      },
      attendance: { update: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillingRepository(prisma);

    const result = await repository.addPayment('bill-legacy', {
      amount: 30,
      paymentMethod: 'cash',
      userId: 'cashier-1',
    });

    expect(result.bill.balance).toBe(70);
    expect(result.bill.status).toBe('partial');
    expect(result.payment.amount).toBe(30);
    expect(tx.attendance.update).toHaveBeenCalledWith({
      where: { id: 'attendance-legacy' },
      data: { totalBill: 100, paidAmount: 30, outstandingBalance: 70 },
    });
  });

  it('rejects payments against cancelled bills in the legacy billing module', async () => {
    const findUnique = vi.fn()
      .mockResolvedValueOnce({ id: 'bill-legacy', balance: 100, paidAmount: 0, attendanceId: 'attendance-legacy', status: 'cancelled' })
      .mockResolvedValueOnce({ id: 'bill-legacy', balance: 100, status: 'cancelled' });
    const tx: any = {
      payment: { create: vi.fn() },
      bill: { findUnique, updateMany: vi.fn().mockResolvedValue({ count: 0 }), update: vi.fn() },
      attendance: { update: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillingRepository(prisma);

    await expect(repository.addPayment('bill-legacy', {
      amount: 20,
      paymentMethod: 'cash',
      userId: 'cashier-1',
    })).rejects.toThrow(/cancelled bill/i);
    expect(tx.payment.create).not.toHaveBeenCalled();
  });
});


describe('service-level idempotent retry handling', () => {
  it('does not reject a retry just because the first request fully paid the bill', async () => {
    const findBill = vi.spyOn(BillRepository.prototype, 'findById')
      .mockResolvedValue({ id: 'bill-paid', status: 'paid', balance: 0 } as any);
    const addPayment = vi.spyOn(BillRepository.prototype, 'addPayment')
      .mockResolvedValue({ bill: { id: 'bill-paid', status: 'paid', balance: 0 }, payment: { id: 'payment-original' }, duplicate: true } as any);
    try {
      const service = new BillService({} as any);
      const result = await service.addPayment('bill-paid', {
        amount: 100,
        paymentMethod: 'cash' as any,
        idempotencyKey: 'same-request-key',
      }, 'cashier-1');
      expect(result.payment.id).toBe('payment-original');
      expect(addPayment).toHaveBeenCalledOnce();
    } finally {
      findBill.mockRestore();
      addPayment.mockRestore();
    }
  });

  it('does not reject a billing-module retry just because the first request fully paid the bill', async () => {
    const findBill = vi.spyOn(BillingRepository.prototype, 'findById')
      .mockResolvedValue({ id: 'bill-paid', status: 'paid', balance: 0 } as any);
    const addPayment = vi.spyOn(BillingRepository.prototype, 'addPayment')
      .mockResolvedValue({ bill: { id: 'bill-paid', status: 'paid', balance: 0 }, payment: { id: 'payment-original' }, duplicate: true } as any);
    try {
      const service = new BillingService({} as any);
      const result = await service.addPaymentToBill('bill-paid', {
        amount: 100,
        paymentMethod: 'cash' as any,
        idempotencyKey: 'same-request-key',
      } as any, 'cashier-1');
      expect(result.payment.id).toBe('payment-original');
      expect(addPayment).toHaveBeenCalledOnce();
    } finally {
      findBill.mockRestore();
      addPayment.mockRestore();
    }
  });
});


describe('waiver application safeguards', () => {
  it('rejects reapplying an already-applied waiver in the primary billing path', async () => {
    const tx: any = {
      patientWaiver: { findUnique: vi.fn().mockResolvedValue({
        id: 'waiver-applied', billId: 'bill-1', status: 'approved', appliedAt: new Date(), amountApproved: 20,
      }) },
      bill: { findUnique: vi.fn(), update: vi.fn() },
      attendance: { update: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillRepository(prisma);
    await expect(repository.applyWaiver('bill-1', 'waiver-applied')).rejects.toThrow(/already been applied/i);
    expect(tx.bill.update).not.toHaveBeenCalled();
  });

  it('rejects reapplying an already-applied waiver in the legacy billing path', async () => {
    const tx: any = {
      patientWaiver: { findUnique: vi.fn().mockResolvedValue({
        id: 'waiver-applied', billId: 'bill-legacy', status: 'approved', appliedAt: new Date(), amountApproved: 20,
      }) },
      bill: { findUnique: vi.fn(), update: vi.fn() },
      attendance: { update: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillingRepository(prisma);
    await expect(repository.applyWaiver('bill-legacy', 'waiver-applied')).rejects.toThrow(/already been applied/i);
    expect(tx.bill.update).not.toHaveBeenCalled();
  });
});


describe('voided charge balance reconciliation', () => {
  it('does not leave a negative balance or stale attendance balance in the legacy billing path', async () => {
    const tx: any = {
      billLineItem: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'line-void', billId: 'bill-legacy', isVoided: false,
          bill: { id: 'bill-legacy', paidAmount: 70, waiverAmount: 0, attendanceId: 'attendance-legacy' },
        }),
        update: vi.fn().mockResolvedValue({ id: 'line-void', isVoided: true }),
        findMany: vi.fn().mockResolvedValue([{ lineTotal: 50, patientPayableAmount: 50, insuranceCoveredAmount: 0 }]),
      },
      bill: {
        findUnique: vi.fn().mockResolvedValue({ id: 'bill-legacy', paidAmount: 70, waiverAmount: 0, attendanceId: 'attendance-legacy' }),
        update: vi.fn().mockResolvedValue({ id: 'bill-legacy', balance: 0, status: 'paid' }),
      },
      attendance: { update: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillingRepository(prisma);

    await repository.voidLineItem('line-void', 'admin-1', 'Incorrect charge');

    expect(tx.bill.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'bill-legacy' },
      data: expect.objectContaining({ balance: 0, patientPayable: 50, status: 'paid' }),
    }));
    expect(tx.attendance.update).toHaveBeenCalledWith({
      where: { id: 'attendance-legacy' },
      data: { totalBill: 50, paidAmount: 70, outstandingBalance: 0 },
    });
  });
});

describe('bill financial record integrity', () => {
  it('rejects direct edits to derived financial fields', async () => {
    const findBill = vi.spyOn(BillRepository.prototype, 'findById')
      .mockResolvedValue({ id: 'bill-1', status: 'pending', Payment: [] } as any);
    const update = vi.spyOn(BillRepository.prototype, 'update').mockResolvedValue({ id: 'bill-1' } as any);
    try {
      const service = new BillService({} as any);
      await expect(service.updateBill('bill-1', { totalAmount: 1 } as any))
        .rejects.toThrow(/cannot directly edit bill financial field/i);
      expect(update).not.toHaveBeenCalled();
    } finally {
      findBill.mockRestore();
      update.mockRestore();
    }
  });

  it('preserves bills that have payment history instead of deleting the audit trail', async () => {
    const findBill = vi.spyOn(BillRepository.prototype, 'findById')
      .mockResolvedValue({ id: 'bill-1', status: 'partial', Payment: [{ id: 'payment-1' }] } as any);
    const remove = vi.spyOn(BillRepository.prototype, 'delete').mockResolvedValue({ id: 'bill-1' } as any);
    try {
      const service = new BillService({} as any);
      await expect(service.deleteBill('bill-1')).rejects.toThrow(/payment history cannot be deleted/i);
      expect(remove).not.toHaveBeenCalled();
    } finally {
      findBill.mockRestore();
      remove.mockRestore();
    }
  });

  it('still allows a notes-only update', async () => {
    const findBill = vi.spyOn(BillRepository.prototype, 'findById')
      .mockResolvedValue({ id: 'bill-1', status: 'pending', Payment: [] } as any);
    const update = vi.spyOn(BillRepository.prototype, 'update').mockResolvedValue({ id: 'bill-1', notes: 'Reviewed' } as any);
    try {
      const service = new BillService({} as any);
      await service.updateBill('bill-1', { notes: 'Reviewed' });
      expect(update).toHaveBeenCalledWith('bill-1', { notes: 'Reviewed' });
    } finally {
      findBill.mockRestore();
      update.mockRestore();
    }
  });
});



describe('attendance visit-level financial summaries', () => {
  it('aggregates every active bill on an attendance instead of copying one bill balance', async () => {
    const attendanceUpdate = vi.fn();
    const tx: any = {
      bill: { aggregate: vi.fn().mockResolvedValue({ _sum: {
        totalAmount: 240, paidAmount: 90, balance: 150
      }}) },
      attendance: { update: attendanceUpdate }
    };
    const repository = new BillRepository({} as any);
    await (repository as any).syncAttendanceFinancials(tx, 'attendance-multiple-bills');
    expect(tx.bill.aggregate).toHaveBeenCalledWith({
      where: { attendanceId: 'attendance-multiple-bills', status: { not: 'cancelled' } },
      _sum: { totalAmount: true, paidAmount: true, balance: true }
    });
    expect(attendanceUpdate).toHaveBeenCalledWith({
      where: { id: 'attendance-multiple-bills' },
      data: { totalBill: 240, paidAmount: 90, outstandingBalance: 150 }
    });
  });

  it('uses the same visit-level aggregation in the legacy billing repository', async () => {
    const attendanceUpdate = vi.fn();
    const tx: any = {
      bill: { aggregate: vi.fn().mockResolvedValue({ _sum: {
        totalAmount: 240, paidAmount: 90, balance: 150
      }}) },
      attendance: { update: attendanceUpdate }
    };
    const repository = new BillingRepository({} as any);
    await (repository as any).syncAttendanceFinancials(tx, 'attendance-multiple-bills');
    expect(attendanceUpdate).toHaveBeenCalledWith({
      where: { id: 'attendance-multiple-bills' },
      data: { totalBill: 240, paidAmount: 90, outstandingBalance: 150 }
    });
  });
});

describe('idempotency key payload consistency', () => {
  it('rejects reuse of a payment key with a different amount in the primary billing repository', async () => {
    const priorPayment = {
      id: 'payment-existing',
      billId: 'bill-1',
      amount: 25,
      paymentMethod: 'cash',
      reference: null,
      idempotencyKey: 'retry-key',
    };
    const tx: any = {
      payment: { findUnique: vi.fn().mockResolvedValue(priorPayment), create: vi.fn() },
      bill: { findUnique: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillRepository(prisma);

    await expect(repository.addPayment('bill-1', {
      amount: 30,
      paymentMethod: 'cash' as any,
      idempotencyKey: 'retry-key',
    }, 'cashier-1')).rejects.toThrow(/different payment details/i);

    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.bill.findUnique).not.toHaveBeenCalled();
  });

  it('rejects reuse of a payment key with a different amount in the legacy billing repository', async () => {
    const priorPayment = {
      id: 'payment-legacy',
      billId: 'bill-legacy',
      amount: 25,
      paymentMethod: 'cash',
      reference: null,
      idempotencyKey: 'retry-key',
    };
    const tx: any = {
      payment: { findUnique: vi.fn().mockResolvedValue(priorPayment), create: vi.fn() },
      bill: { findUnique: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillingRepository(prisma);

    await expect(repository.addPayment('bill-legacy', {
      amount: 30,
      paymentMethod: 'cash',
      idempotencyKey: 'retry-key',
    })).rejects.toThrow(/different payment details/i);

    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.bill.findUnique).not.toHaveBeenCalled();
  });
});


describe('pending MoMo intent cannot be bypassed with a manual mobile-money method', () => {
  it('blocks manual mobile-money collection when a pending intent exists', async () => {
    const pendingIntent = { id: 'momo-pending-1' };
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      momoPaymentIntent: { findFirst: vi.fn().mockResolvedValue(pendingIntent) },
      payment: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
      bill: {
        findUnique: vi.fn().mockResolvedValue({ id: 'bill-1', balance: 100, paidAmount: 0, attendanceId: null, status: 'pending' }),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
      attendance: { update: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillRepository(prisma);

    await expect(repository.addPayment('bill-1', {
      amount: 25,
      paymentMethod: 'mobile_money' as any,
    }, 'cashier-1')).rejects.toThrow(/Mobile Money payment is still pending/i);

    expect(tx.bill.updateMany).not.toHaveBeenCalled();
    expect(tx.payment.create).not.toHaveBeenCalled();
  });
});


describe('confirmed MoMo intent validation in the billing repository', () => {
  it('records a provider-confirmed payment only for its exact pending intent', async () => {
    const intentLookup = vi.fn().mockResolvedValue({ id: 'momo-intent-1' });
    const billFindUnique = vi.fn()
      .mockResolvedValueOnce({ id: 'bill-1', balance: 100, paidAmount: 0, attendanceId: null, status: 'pending' })
      .mockResolvedValueOnce({ id: 'bill-1', balance: 75, paidAmount: 25, attendanceId: null, status: 'partial' });
    const paymentCreate = vi.fn().mockResolvedValue({ id: 'payment-momo-1', amount: 25 });
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      momoPaymentIntent: { findFirst: intentLookup },
      payment: { findUnique: vi.fn().mockResolvedValue(null), create: paymentCreate },
      bill: {
        findUnique: billFindUnique,
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({ id: 'bill-1', balance: 75, status: 'partial' }),
      },
      attendance: { update: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillingRepository(prisma);

    const result = await repository.addPayment('bill-1', {
      amount: 25,
      paymentMethod: 'mobile_money',
      reference: 'MTN-MOMO:provider-ref',
      idempotencyKey: 'momo-payment-key',
      userId: 'cashier-1',
      internalMomoIntentId: 'momo-intent-1',
    });

    expect(intentLookup).toHaveBeenCalledWith({
      where: { id: 'momo-intent-1', billId: 'bill-1', status: { in: ['initiating', 'pending'] } },
      select: { id: true },
    });
    expect(result.payment.id).toBe('payment-momo-1');
  });

  it('rejects an internal MoMo posting if the specified intent is not pending for that bill', async () => {
    const intentLookup = vi.fn().mockResolvedValue(null);
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      momoPaymentIntent: { findFirst: intentLookup },
      payment: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
      bill: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
      attendance: { update: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillingRepository(prisma);

    await expect(repository.addPayment('bill-1', {
      amount: 25,
      paymentMethod: 'mobile_money',
      idempotencyKey: 'momo-payment-key',
      userId: 'cashier-1',
      internalMomoIntentId: 'wrong-or-terminal-intent',
    })).rejects.toThrow(/confirmed Mobile Money intent is no longer valid/i);

    expect(tx.bill.updateMany).not.toHaveBeenCalled();
    expect(tx.payment.create).not.toHaveBeenCalled();
  });
});


describe('bill lifecycle financial reconciliation', () => {
  it('reverses corporate credit and attendance totals when an unpaid bill is deleted', async () => {
    const attendanceUpdate = vi.fn();
    const corporateUpdate = vi.fn();
    const billDelete = vi.fn().mockResolvedValue({ id: 'bill-delete' });
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      bill: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'bill-delete',
          attendanceId: 'attendance-delete',
          paymentMode: 'corporate',
          corporateAccountId: 'corporate-1',
          totalAmount: 125,
          status: 'pending',
          Payment: [],
          InsuranceClaim: [],
          PatientWaiver: [],
        }),
        delete: billDelete,
        aggregate: vi.fn().mockResolvedValue({ _sum: { totalAmount: null, paidAmount: null, balance: null } }),
      },
      corporateAccount: { update: corporateUpdate },
      attendance: { update: attendanceUpdate },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillRepository(prisma);

    await repository.delete('bill-delete');

    expect(corporateUpdate).toHaveBeenCalledWith({
      where: { id: 'corporate-1' },
      data: { currentBalance: { decrement: 125 } },
    });
    expect(billDelete).toHaveBeenCalledWith({ where: { id: 'bill-delete' } });
    expect(attendanceUpdate).toHaveBeenCalledWith({
      where: { id: 'attendance-delete' },
      data: { totalBill: 0, paidAmount: 0, outstandingBalance: 0 },
    });
  });

  it('reverses corporate credit and attendance totals when a bill is cancelled', async () => {
    const attendanceUpdate = vi.fn();
    const corporateUpdate = vi.fn();
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      bill: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'bill-cancel',
          attendanceId: 'attendance-cancel',
          paymentMode: 'corporate',
          corporateAccountId: 'corporate-2',
          totalAmount: 240,
          status: 'pending',
        }),
        update: vi.fn().mockResolvedValue({
          id: 'bill-cancel',
          attendanceId: 'attendance-cancel',
          status: 'cancelled',
          totalAmount: 240,
          paidAmount: 0,
          balance: 240,
        }),
        aggregate: vi.fn().mockResolvedValue({ _sum: { totalAmount: null, paidAmount: null, balance: null } }),
      },
      corporateAccount: { update: corporateUpdate },
      attendance: { update: attendanceUpdate },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillingRepository(prisma);

    await repository.updateStatus('bill-cancel', 'cancelled' as any, 'admin-1');

    expect(corporateUpdate).toHaveBeenCalledWith({
      where: { id: 'corporate-2' },
      data: { currentBalance: { decrement: 240 } },
    });
    expect(attendanceUpdate).toHaveBeenCalledWith({
      where: { id: 'attendance-cancel' },
      data: { totalBill: 0, paidAmount: 0, outstandingBalance: 0 },
    });
  });
});
