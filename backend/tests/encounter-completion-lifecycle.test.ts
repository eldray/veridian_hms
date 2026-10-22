import { describe, expect, it, vi } from 'vitest';
import { EncounterService } from '../src/modules/encounter/EncounterService';

function setup(encounter: any, transitionCount = 1) {
  const updated = encounter ? { id: encounter.id, status: 'completed', updatedById: 'staff-1' } : null;
  const tx: any = {
    attendance: {
      findUnique: vi.fn().mockResolvedValue(encounter),
      updateMany: vi.fn().mockResolvedValue({ count: transitionCount }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(updated),
    },
  };
  const prisma: any = {
    $transaction: vi.fn(async (callback: any) => callback(tx)),
  };
  return { service: new EncounterService(prisma), prisma, tx, updated };
}

describe('encounter completion lifecycle', () => {
  it('completes an eligible encounter using a conditional status update inside a transaction', async () => {
    const { service, prisma, tx, updated } = setup({
      id: 'encounter-1',
      status: 'pending',
      Admission: null,
    });

    await expect(service.completeEncounter('encounter-1', 'staff-1')).resolves.toEqual(updated);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.attendance.updateMany).toHaveBeenCalledWith({
      where: { id: 'encounter-1', status: 'pending' },
      data: { status: 'completed', updatedById: 'staff-1' },
    });
  });

  it('refuses to complete an encounter with an active admission', async () => {
    const { service, tx } = setup({
      id: 'encounter-1',
      status: 'admitted',
      Admission: { id: 'admission-1', dischargeDate: null },
    });

    await expect(service.completeEncounter('encounter-1', 'staff-1'))
      .rejects.toThrow(/admission is active/i);
    expect(tx.attendance.updateMany).not.toHaveBeenCalled();
  });

  it.each(['discharged', 'referred', 'absconded', 'completed', 'cancelled'])(
    'refuses to complete an encounter already in terminal state %s',
    async (status) => {
      const { service, tx } = setup({ id: 'encounter-1', status, Admission: null });

      await expect(service.completeEncounter('encounter-1', 'staff-1'))
        .rejects.toThrow(/already/i);
      expect(tx.attendance.updateMany).not.toHaveBeenCalled();
    },
  );

  it('reports a conflict if another request changes the encounter first', async () => {
    const { service, tx } = setup({
      id: 'encounter-1',
      status: 'pending',
      Admission: null,
    }, 0);

    await expect(service.completeEncounter('encounter-1', 'staff-1'))
      .rejects.toThrow(/changed while completion was being saved/i);
    expect(tx.attendance.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('does not complete an encounter that cannot be found', async () => {
    const { service, tx } = setup(null);

    await expect(service.completeEncounter('missing', 'staff-1'))
      .rejects.toThrow(/not found/i);
    expect(tx.attendance.updateMany).not.toHaveBeenCalled();
  });
});
