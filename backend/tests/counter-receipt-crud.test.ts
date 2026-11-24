import { describe, expect, it, vi } from 'vitest';
import { BillingRepository } from '../src/modules/billing/BillingRepository';
import { CounterRepository } from '../src/modules/counter/CounterRepository';

vi.mock('../src/services/CounterService', () => ({
  getCounterService: () => ({ nextAttendanceNumber: () => 'CNT-TEST-0001' }),
}));

describe('counter receipt and ticket persistence', () => {
  it('loads a counter bill without selecting the nonexistent InsuranceClaim.submissionDate field', async () => {
    const submittedAt = new Date('2026-11-24T10:30:00.000Z');
    const findUnique = vi.fn().mockResolvedValue({
      id: 'bill-1',
      CounterClient: { id: 'client-1', name: 'Walk-in customer' },
      InsuranceClaim: [{
        id: 'claim-1',
        claimNumber: 'CLM-1',
        status: 'submitted',
        totalClaimAmount: 25,
        trackingEvents: [{ submissionDate: submittedAt, createdAt: submittedAt }],
      }],
    });
    const repository = new BillingRepository({ bill: { findUnique } } as any);

    const bill = await repository.findById('bill-1');
    const claimSelect = findUnique.mock.calls[0][0].include.InsuranceClaim.select;

    expect(claimSelect).not.toHaveProperty('submissionDate');
    expect(claimSelect.trackingEvents).toMatchObject({
      where: { eventType: 'submission' },
      take: 1,
    });
    expect((bill as any).InsuranceClaim[0].submissionDate).toEqual(submittedAt);
    expect((bill as any).CounterClient.name).toBe('Walk-in customer');
  });

  it('sorts counter tickets in the database before pagination', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(21);
    const repository = new CounterRepository({
      attendance: { findMany, count },
      counterClient: { findMany: vi.fn().mockResolvedValue([]) },
    } as any);

    const result = await repository.listTickets({
      page: 2,
      limit: 10,
      sortBy: 'customerName',
      sortOrder: 'asc',
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 10,
      take: 10,
      orderBy: [
        { CounterClient: { name: 'asc' } },
        { Patient: { surname: 'asc' } },
        { id: 'asc' },
      ],
    }));
    expect(result.totalPages).toBe(3);
  });

  it('creates a new walk-in identity and its ticket in one database transaction', async () => {
    const clientCreate = vi.fn().mockResolvedValue({ id: 'client-1' });
    const attendanceCreate = vi.fn().mockResolvedValue({
      id: 'ticket-1',
      attendanceNumber: 'CNT-TEST-0001',
      counterClientId: 'client-1',
      attendanceType: 'walk_in',
    });
    const tx: any = {
      counterClient: { findMany: vi.fn().mockResolvedValue([]), create: clientCreate },
      attendance: { create: attendanceCreate },
    };
    const transaction = vi.fn(async (callback: (client: any) => Promise<any>) => callback(tx));
    const repository = new CounterRepository({ $transaction: transaction } as any);

    const ticket = await repository.createTicket({
      client: { name: '  Walk-in Customer  ', phone: '024 123 4567', ageYears: 30 },
      reason: 'Retail purchase',
      actorId: 'staff-1',
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(clientCreate).toHaveBeenCalledWith({
      data: { name: 'Walk-in Customer', ageYears: 30, phone: '024 123 4567' },
      select: { id: true },
    });
    expect(attendanceCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        attendanceNumber: 'CNT-TEST-0001',
        counterClientId: 'client-1',
        patientId: null,
        attendanceType: 'walk_in',
        createdById: 'staff-1',
      }),
    }));
    expect(ticket.id).toBe('ticket-1');
  });

  it('propagates ticket creation failure inside the customer-and-ticket transaction', async () => {
    const clientCreate = vi.fn().mockResolvedValue({ id: 'client-1' });
    const attendanceCreate = vi.fn().mockRejectedValue(new Error('attendance insert failed'));
    const tx: any = {
      counterClient: { findMany: vi.fn().mockResolvedValue([]), create: clientCreate },
      attendance: { create: attendanceCreate },
    };
    const transaction = vi.fn(async (callback: (client: any) => Promise<any>) => callback(tx));
    const repository = new CounterRepository({ $transaction: transaction } as any);

    await expect(repository.createTicket({
      client: { name: 'Walk-in Customer' },
      actorId: 'staff-1',
    })).rejects.toThrow('attendance insert failed');

    expect(clientCreate).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
