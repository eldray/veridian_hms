import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/auditChain', () => ({
  appendAuditLogWithinTransaction: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}));

import { appendAuditLogWithinTransaction } from '../src/services/auditChain';
import { NursingRepository } from '../src/modules/nursing/NursingRepository';

describe('MAR dose audit integrity', () => {
  it('audits administration in the same transaction without storing nursing notes', async () => {
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      medicationDose: {
        findUnique: vi.fn().mockResolvedValue({ id: 'dose-1', status: 'due' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'dose-1', status: 'administered' }),
      },
    };
    const transaction = vi.fn(async (callback: (client: any) => Promise<any>) => callback(tx));
    const repository = new NursingRepository({ $transaction: transaction } as any);

    await expect(repository.administerDose('dose-1', 'nurse-1', {
      site: 'Left arm',
      notes: 'Sensitive administration note',
    })).resolves.toMatchObject({ id: 'dose-1', status: 'administered' });

    expect(appendAuditLogWithinTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        entityType: 'MedicationDose',
        entityId: 'dose-1',
        action: 'update',
        performedById: 'nurse-1',
        previousState: { status: 'due' },
        newState: { status: 'administered' },
        metadata: expect.objectContaining({
          operation: 'mar_dose_administered',
          fromStatus: 'due',
          toStatus: 'administered',
          clinicalContentOmitted: true,
        }),
      }),
    );
    const auditEntry = vi.mocked(appendAuditLogWithinTransaction).mock.calls[0][1];
    expect(JSON.stringify(auditEntry)).not.toContain('Sensitive administration note');
    expect(JSON.stringify(auditEntry)).not.toContain('Left arm');
  });

  it('audits a medication variance without recording the clinical reason or notes', async () => {
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      medicationDose: {
        findUnique: vi.fn().mockResolvedValue({ id: 'dose-2', status: 'due' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'dose-2', status: 'refused' }),
      },
    };
    const repository = new NursingRepository({
      $transaction: vi.fn(async (callback: (client: any) => Promise<any>) => callback(tx)),
    } as any);

    await expect(repository.recordDoseVariance('dose-2', 'nurse-1', {
      status: 'refused',
      reason: 'Patient declined due to nausea',
      notes: 'Discussed with clinician',
    })).resolves.toMatchObject({ id: 'dose-2', status: 'refused' });

    expect(appendAuditLogWithinTransaction).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        entityType: 'MedicationDose',
        entityId: 'dose-2',
        previousState: { status: 'due' },
        newState: { status: 'refused' },
        metadata: expect.objectContaining({
          operation: 'mar_dose_variance_recorded',
          reasonProvided: true,
          notesProvided: true,
          clinicalContentOmitted: true,
        }),
      }),
    );
    const auditEntry = vi.mocked(appendAuditLogWithinTransaction).mock.calls.at(-1)?.[1];
    expect(JSON.stringify(auditEntry)).not.toContain('Patient declined');
    expect(JSON.stringify(auditEntry)).not.toContain('Discussed with clinician');
  });
});
