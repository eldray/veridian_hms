import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/modules/encounter/clinicalAudit', () => ({
  appendClinicalRecordAudit: vi.fn().mockResolvedValue(undefined),
}));

import { appendClinicalRecordAudit } from '../src/modules/encounter/clinicalAudit';
import { EncounterRepository } from '../src/modules/encounter/EncounterRepository';

describe('inpatient daily-note audit integrity', () => {
  it('commits a narrative-minimised audit event with the daily-note update', async () => {
    const existing = {
      id: 'admission-1',
      dischargeDate: null,
      dailyNotes: [],
      attendance: { id: 'attendance-1', status: 'admitted' },
    };
    const updated = { ...existing, dailyNotes: [{ id: 'note-1' }] };
    const tx: any = {
      admission: {
        findUnique: vi.fn().mockResolvedValue(existing),
        update: vi.fn().mockResolvedValue(updated),
      },
    };
    const prisma: any = {
      $transaction: vi.fn(async (callback: (client: any) => Promise<any>) => callback(tx)),
    };
    const repository = new EncounterRepository(prisma);

    await expect(repository.addDailyNotes('admission-1', { note: 'Sensitive clinical narrative' }, 'nurse-1'))
      .resolves.toMatchObject({ admission: updated, note: { recordedBy: 'nurse-1' } });

    expect(appendClinicalRecordAudit).toHaveBeenCalledWith(
      tx, 'nurse-1', 'AdmissionDailyNote', expect.any(String), 'create', undefined,
      expect.objectContaining({
        admissionId: 'admission-1',
        attendanceId: 'attendance-1',
        dailyNoteCount: 1,
        contentRecorded: true,
      }),
      expect.objectContaining({ clinicalNarrativeOmitted: true }),
    );
    const auditArgs = vi.mocked(appendClinicalRecordAudit).mock.calls.at(-1);
    expect(JSON.stringify(auditArgs)).not.toContain('Sensitive clinical narrative');
  });
});
