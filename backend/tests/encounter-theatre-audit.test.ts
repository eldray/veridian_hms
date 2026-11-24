import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/auditChain', () => ({
  appendAuditLogWithinTransaction: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}));

import { appendAuditLogWithinTransaction } from '../src/services/auditChain';
import { EncounterRepository } from '../src/modules/encounter/EncounterRepository';

describe('theatre procedure audit integrity', () => {
  it('commits procedure progress and a privacy-minimised audit event in the same transaction', async () => {
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'pending' }) },
      procedure: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ id: 'procedure-1', status: 'scheduled', attendanceId: 'attendance-1', clinicalRecord: null })
          .mockResolvedValueOnce({ id: 'procedure-1', status: 'in_progress' })
          .mockResolvedValueOnce({ id: 'procedure-1', status: 'in_progress', notes: 'Sensitive operative note' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const transaction = vi.fn(async (callback: (client: any) => Promise<any>) => callback(tx));
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'surgeon-1', isActive: true }) },
      $transaction: transaction,
    };
    const repository = new EncounterRepository(prisma);

    const result = await repository.updateProcedureStatus('procedure-1', 'in_progress', {
      notes: 'Sensitive operative note',
      clinicalRecord: { indication: 'Sensitive diagnosis', operativeSite: 'Left side' },
    }, 'surgeon-1');

    expect(result).toMatchObject({ id: 'procedure-1', status: 'in_progress' });
    expect(transaction).toHaveBeenCalledOnce();
    expect(appendAuditLogWithinTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        entityType: 'Procedure',
        entityId: 'procedure-1',
        action: 'update',
        performedById: 'surgeon-1',
        previousState: { status: 'scheduled' },
        newState: { status: 'in_progress' },
        metadata: expect.objectContaining({
          operation: 'theatre_procedure_update',
          fromStatus: 'scheduled',
          toStatus: 'in_progress',
          clinicalContentOmitted: true,
        }),
      }),
    );
    const auditEntry = vi.mocked(appendAuditLogWithinTransaction).mock.calls[0][1];
    expect(JSON.stringify(auditEntry)).not.toContain('Sensitive operative note');
    expect(JSON.stringify(auditEntry)).not.toContain('Sensitive diagnosis');
    expect(JSON.stringify(auditEntry)).not.toContain('Left side');
  });
});
