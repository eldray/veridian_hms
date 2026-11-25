import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/auditChain', () => ({
  appendAuditLogWithinTransaction: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}));

import { appendAuditLogWithinTransaction } from '../src/services/auditChain';
import { EncounterRepository } from '../src/modules/encounter/EncounterRepository';

describe('laboratory result audit integrity', () => {
  it('writes a privacy-minimised audit event through the same transaction as a lab result update', async () => {
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      attendance: {
        findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'pending' }),
      },
      labTest: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({
            id: 'lab-1',
            status: 'requested',
            attendanceId: 'attendance-1',
            result: null,
          })
          .mockResolvedValueOnce({ id: 'lab-1', status: 'completed' })
          .mockResolvedValueOnce({ id: 'lab-1', status: 'completed' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const transaction = vi.fn(async (callback: (client: any) => Promise<any>) => callback(tx));
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      $transaction: transaction,
    };
    const repository = new EncounterRepository(prisma);
    const resultPayload = { parameters: [{ name: 'Haemoglobin', value: '12.4 g/dL' }] };

    const result = await repository.updateLabTestStatus(
      'lab-1',
      'completed',
      { result: resultPayload, normalRange: '12-16', units: 'g/dL' },
      'staff-1',
    );

    expect(result).toEqual({ id: 'lab-1', status: 'completed' });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(appendAuditLogWithinTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        entityType: 'LabTest',
        entityId: 'lab-1',
        action: 'update',
        performedById: 'staff-1',
        previousState: { status: 'requested' },
        newState: { status: 'completed' },
        metadata: expect.objectContaining({
          operation: 'laboratory_result_update',
          fromStatus: 'requested',
          toStatus: 'completed',
          clinicalContentOmitted: true,
        }),
      }),
    );
    const auditEntry = vi.mocked(appendAuditLogWithinTransaction).mock.calls[0][1];
    expect(JSON.stringify(auditEntry)).not.toContain('12.4 g/dL');
    expect(JSON.stringify(auditEntry)).not.toContain('Haemoglobin');
  });
});
