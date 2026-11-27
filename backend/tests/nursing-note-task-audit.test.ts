import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/auditChain', () => ({
  appendAuditLogWithinTransaction: vi.fn().mockResolvedValue({ id: 'audit-1' }),
}));

import { appendAuditLogWithinTransaction } from '../src/services/auditChain';
import { NursingRepository } from '../src/modules/nursing/NursingRepository';

describe('nursing note and task audit integrity', () => {
  it('commits a nursing note and privacy-minimised audit entry in one transaction', async () => {
    const created = {
      id: 'note-1', attendanceId: 'attendance-1', admissionId: 'admission-1',
      noteType: 'progress', shift: 'day', isFlagged: false,
      content: 'Sensitive patient narrative', createdById: 'nurse-1',
    };
    const tx: any = {
      nursingNote: { create: vi.fn().mockResolvedValue(created) },
    };
    const repository = new NursingRepository({
      $transaction: vi.fn(async (callback: (client: any) => Promise<any>) => callback(tx)),
    } as any);

    await expect(repository.createNote({
      content: created.content, createdById: 'nurse-1',
      attendanceId: 'attendance-1', admissionId: 'admission-1',
      noteType: 'progress', shift: 'day', isFlagged: false,
    })).resolves.toMatchObject({ id: 'note-1' });

    expect(appendAuditLogWithinTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      entityType: 'NursingNote', entityId: 'note-1', action: 'create', performedById: 'nurse-1',
      newState: expect.objectContaining({
        attendanceId: 'attendance-1', admissionId: 'admission-1',
        noteType: 'progress', contentRecorded: true,
      }),
    }));
    const entry = vi.mocked(appendAuditLogWithinTransaction).mock.calls.at(-1)?.[1];
    expect(JSON.stringify(entry)).not.toContain('Sensitive patient narrative');
  });

  it('audits nursing task status changes without copying task narrative', async () => {
    const current = {
      id: 'task-1', attendanceId: 'attendance-1', admissionId: 'admission-1',
      taskType: 'observation', priority: 'medium', status: 'pending',
      scheduledAt: new Date('2026-11-27T08:00:00Z'), completedAt: null,
      completedById: null, description: 'Sensitive clinical task details',
    };
    const updated = { ...current, status: 'completed', completedAt: new Date(), completedById: 'nurse-1' };
    const tx: any = {
      nursingTask: {
        findUnique: vi.fn().mockResolvedValue(current),
        update: vi.fn().mockResolvedValue(updated),
      },
    };
    const repository = new NursingRepository({
      $transaction: vi.fn(async (callback: (client: any) => Promise<any>) => callback(tx)),
    } as any);

    await expect(repository.updateTask('task-1', { status: 'completed' }, 'nurse-1'))
      .resolves.toMatchObject({ id: 'task-1', status: 'completed' });

    expect(appendAuditLogWithinTransaction).toHaveBeenCalledWith(tx, expect.objectContaining({
      entityType: 'NursingTask', entityId: 'task-1', action: 'update', performedById: 'nurse-1',
      previousState: expect.objectContaining({ status: 'pending' }),
      newState: expect.objectContaining({ status: 'completed', completedById: 'nurse-1' }),
    }));
    const entry = vi.mocked(appendAuditLogWithinTransaction).mock.calls.at(-1)?.[1];
    expect(JSON.stringify(entry)).not.toContain('Sensitive clinical task details');
  });
});
