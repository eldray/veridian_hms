import { describe, expect, it, vi } from 'vitest';
import { FamilyPlanningRepository } from '../src/modules/familyPlanning/FamilyPlanningRepository';

function makeRepository(attendance: any = null) {
  const create = vi.fn().mockResolvedValue({ id: 'fp-1' });
  const prisma: any = {
    patient: { findUnique: vi.fn().mockResolvedValue({ id: 'patient-1' }) },
    attendance: { findUnique: vi.fn().mockResolvedValue(attendance) },
    familyPlanningService: {
      create, count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue({ method: 'injectable_dmpa', methodCategory: 'modern_short_acting' }),
      update: vi.fn().mockResolvedValue({ id: 'fp-1' }),
      groupBy: vi.fn().mockResolvedValue([]),
      findMany: vi.fn().mockResolvedValue([
        { patientId: 'p1', cypFactor: 1 }, { patientId: 'p1', cypFactor: 1 }, { patientId: 'p2', cypFactor: 0.5 },
      ]),
    },
  };
  return { repository: new FamilyPlanningRepository(prisma), prisma, create };
}

const validInput: any = {
  patientId: 'patient-1',
  attendanceId: 'attendance-1',
  providedById: 'staff-1',
  method: 'injectable_dmpa',
  methodCategory: 'modern_short_acting',
  serviceDate: '2026-10-22T12:00:00.000Z',
};

describe('family-planning encounter integrity', () => {

  it('counts unique clients separately from service visits in statistics', async () => {
    const { repository, prisma } = makeRepository(null);
    const stats = await repository.getFPStatistics(new Date('2026-10-01'), new Date('2026-10-31'));
    expect(stats.totalServices).toBe(0);
    expect(stats.currentUsers).toBe(2);
    expect(prisma.familyPlanningService.findMany).toHaveBeenCalledTimes(2);
  });

  it('rejects an attendance belonging to another patient', async () => {
    const { repository, create } = makeRepository({ id: 'attendance-1', patientId: 'patient-2', status: 'completed' });
    await expect(repository.createFPService(validInput)).rejects.toThrow(/must match the linked attendance/i);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects cancelled attendance records', async () => {
    const { repository, create } = makeRepository({ id: 'attendance-1', patientId: 'patient-1', status: 'cancelled' });
    await expect(repository.createFPService(validInput)).rejects.toThrow(/cancelled attendance/i);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a method/category mismatch instead of producing incorrect method-mix reports', async () => {
    const { repository, create } = makeRepository({ id: 'attendance-1', patientId: 'patient-1', status: 'completed' });
    await expect(repository.createFPService({ ...validInput, method: 'implant_jadelle' })).rejects.toThrow(/does not belong/i);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects contradictory postpartum and post-abortion classifications', async () => {
    const { repository, create } = makeRepository({ id: 'attendance-1', patientId: 'patient-1', status: 'completed' });
    await expect(repository.createFPService({ ...validInput, isPostpartum: true, isPostAbortion: true })).rejects.toThrow(/both postpartum and post-abortion/i);
    expect(create).not.toHaveBeenCalled();
  });


  it('rejects updates that change a method without a matching category', async () => {
    const { repository, prisma } = makeRepository({ id: 'attendance-1', patientId: 'patient-1', status: 'completed' });
    await expect(repository.update('fp-1', { method: 'implant_jadelle' as any }))
      .rejects.toThrow(/does not belong/i);
    expect(prisma.familyPlanningService.update).not.toHaveBeenCalled();
  });

  it('marks the first dated family-planning service as a new acceptor even if the UI checkbox is false', async () => {
    const { repository, create, prisma } = makeRepository({ id: 'attendance-1', patientId: 'patient-1', status: 'completed' });
    await repository.createFPService({ ...validInput, isNewAcceptor: false });
    expect(prisma.familyPlanningService.count).toHaveBeenCalledWith({
      where: {
        patientId: 'patient-1',
        serviceDate: { lte: new Date(validInput.serviceDate) },
        OR: [{ attendanceId: null }, { attendance: { is: { status: { not: 'cancelled' } } } }],
      },
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ patientId: 'patient-1', attendanceId: 'attendance-1', methodCategory: 'modern_short_acting', isNewAcceptor: true }),
    }));
  });

  it('marks an additional same-day or prior-history service as continuing, not a new acceptor', async () => {
    const { repository, create, prisma } = makeRepository({ id: 'attendance-1', patientId: 'patient-1', status: 'completed' });
    prisma.familyPlanningService.count.mockResolvedValue(1);
    await repository.createFPService({ ...validInput, isNewAcceptor: true });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ isNewAcceptor: false }),
    }));
  });
});
