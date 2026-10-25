import { describe, expect, it, vi } from 'vitest';
import { EncounterRepository } from '../src/modules/encounter/EncounterRepository';

describe('admission statistics', () => {
  it('aggregates admissions rather than returning encounter statistics', async () => {
    const prisma: any = {
      admission: {
        count: vi.fn()
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(4)
          .mockResolvedValueOnce(5),
        groupBy: vi.fn().mockResolvedValue([
          { admissionType: 'emergency', _count: { _all: 6 } },
          { admissionType: 'elective', _count: { _all: 4 } },
        ]),
        findMany: vi.fn().mockResolvedValue([
          { attendance: { Ward: { wardName: 'Medical' }, Bed: null } },
          { attendance: { Ward: { wardName: 'Medical' }, Bed: null } },
          { attendance: { Ward: null, Bed: { Ward: { wardName: 'Maternity' } } } },
          { attendance: { Ward: null, Bed: null } },
        ]),
      },
    };
    const repository = new EncounterRepository(prisma);

    await expect(repository.getAdmissionStatistics()).resolves.toEqual({
      total: 10,
      active: 4,
      discharged: 5,
      byWard: { Medical: 2, Maternity: 1, Unassigned: 1 },
      byType: { emergency: 6, elective: 4 },
    });
    expect(prisma.admission.count).toHaveBeenCalledTimes(3);
    expect(prisma.admission.groupBy).toHaveBeenCalledTimes(1);
    expect(prisma.admission.findMany).toHaveBeenCalledTimes(1);
  });
});
