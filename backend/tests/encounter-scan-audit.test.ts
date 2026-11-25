import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/auditChain', () => ({
  appendAuditLogWithinTransaction: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}));

import { appendAuditLogWithinTransaction } from '../src/services/auditChain';
import { EncounterRepository } from '../src/modules/encounter/EncounterRepository';

describe('scan result audit integrity', () => {
  it('commits scan status and a privacy-minimised audit event in the same transaction', async () => {
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'pending' }) },
      scan: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({
            id: 'scan-1', status: 'in_progress', attendanceId: 'attendance-1',
            result: null, findings: null, impression: null,
          })
          .mockResolvedValueOnce({ id: 'scan-1', status: 'completed' })
          .mockResolvedValueOnce({ id: 'scan-1', status: 'completed', findings: 'No acute abnormality' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const transaction = vi.fn(async (callback: (client: any) => Promise<any>) => callback(tx));
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'sonographer-1', isActive: true }) },
      $transaction: transaction,
    };
    const repository = new EncounterRepository(prisma);

    const scan = await repository.updateScanStatus('scan-1', 'completed', {
      findings: 'No acute abnormality',
      impression: 'No acute cardiopulmonary process',
      priority: 'routine',
    }, 'sonographer-1');

    expect(scan).toMatchObject({ id: 'scan-1', status: 'completed' });
    expect(transaction).toHaveBeenCalledOnce();
    expect(appendAuditLogWithinTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        entityType: 'Scan',
        entityId: 'scan-1',
        action: 'update',
        performedById: 'sonographer-1',
        previousState: { status: 'in_progress' },
        newState: { status: 'completed' },
        metadata: expect.objectContaining({
          operation: 'scan_result_update',
          fromStatus: 'in_progress',
          toStatus: 'completed',
          clinicalContentOmitted: true,
        }),
      }),
    );
    const auditEntry = vi.mocked(appendAuditLogWithinTransaction).mock.calls[0][1];
    expect(JSON.stringify(auditEntry)).not.toContain('No acute abnormality');
    expect(JSON.stringify(auditEntry)).not.toContain('cardiopulmonary');
  });
});
