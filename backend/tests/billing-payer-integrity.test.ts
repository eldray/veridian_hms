import { describe, expect, it, vi } from 'vitest';
import { BillRepository } from '../src/modules/bill/BillRepository';
import { BillService } from '../src/modules/bill/BillService';
import { BillingRepository } from '../src/modules/billing/BillingRepository';
import { BillingService } from '../src/modules/billing/BillingService';

describe('claims-only payer billing protections', () => {
  it.each(['private_insurance', 'corporate'])(
    'does not generate an operational bill for a %s attendance',
    async (paymentMode) => {
      const attendance = { id: 'attendance-1', paymentMode };
      const tx: any = {
        attendance: {
          findUnique: vi.fn()
            .mockResolvedValueOnce({ dateTime: new Date('2026-11-01T10:00:00.000Z') })
            .mockResolvedValueOnce(attendance),
        },
        bill: { findUnique: vi.fn() },
      };
      const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
      const repository = new BillRepository(prisma);

      await expect(repository.generateFromEncounter('attendance-1', 'user-1'))
        .rejects.toThrow(/Claims-only/i);
      expect(tx.bill.findUnique).not.toHaveBeenCalled();
    },
  );

  it.each(['private_insurance', 'corporate'])(
    'rejects a %s attendance even if the bill request says cash',
    async (paymentMode) => {
      const prisma: any = {
        attendance: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'attendance-1',
            patientId: 'patient-1',
            dateTime: new Date('2026-11-01T10:00:00.000Z'),
            paymentMode,
          }),
        },
      };
      const service = new BillingService(prisma);

      await expect(service.createBill({
        patientId: 'patient-1',
        attendanceId: 'attendance-1',
        paymentMode: 'cash',
        items: [{ serviceId: 'service-1', quantity: 1 }],
      } as any, 'user-1')).rejects.toThrow(/Claims-only/i);
    },
  );

  it('rejects direct repository bill creation for a claims-only attendance', async () => {
    const tx: any = {
      attendance: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'attendance-1',
          paymentMode: 'private_insurance',
          patientId: 'patient-1',
        }),
      },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillingRepository(prisma);

    await expect(repository.create({
      attendanceId: 'attendance-1',
      patientId: 'patient-1',
      paymentMode: 'cash',
    }, [])).rejects.toThrow(/Claims-only/i);
  });

  it('excludes legacy private-insurance and corporate bills from collections and refunds', async () => {
    const prisma: any = {
      payment: { findMany: vi.fn().mockResolvedValue([]) },
      refund: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const repository = new BillingRepository(prisma);
    const from = new Date('2026-11-01T00:00:00.000Z');
    const to = new Date('2026-11-30T23:59:59.999Z');

    await repository.findCollections(from, to);
    await repository.findRefunds(from, to);

    expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        Bill: { is: { paymentMode: { notIn: ['private_insurance', 'corporate'] } } },
      }),
    }));
    expect(prisma.refund.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        bill: { is: { paymentMode: { notIn: ['private_insurance', 'corporate'] } } },
      }),
    }));
  });

  it('excludes claims-only legacy bills from attendance financial summaries', async () => {
    const tx: any = {
      bill: { aggregate: vi.fn().mockResolvedValue({ _sum: { totalAmount: 0, paidAmount: 0, balance: 0 } }) },
      attendance: { update: vi.fn().mockResolvedValue({}) },
    };
    const repository = new BillRepository({} as any);

    await (repository as any).syncAttendanceFinancials(tx, 'attendance-1');

    expect(tx.bill.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        attendanceId: 'attendance-1',
        status: { not: 'cancelled' },
        paymentMode: { notIn: ['private_insurance', 'corporate'] },
      },
    }));
  });

  it('blocks claims-only bill generation at the service boundary too', async () => {
    const prisma: any = {
      attendance: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'attendance-1',
          paymentMode: 'corporate',
        }),
      },
    };
    const service = new BillService(prisma);

    await expect(service.generateFromEncounter('attendance-1', 'user-1'))
      .rejects.toThrow(/Claims-only/i);
  });
});
