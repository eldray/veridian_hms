import { describe, expect, it, vi } from 'vitest';
import { EncounterRepository } from '../src/modules/encounter/EncounterRepository';

describe('theatre incision and closure time validation', () => {
  it.each([
    ['incisionTime', '27:61'],
    ['incisionTime', '9:30'],
    ['closureTime', '12:00:00'],
    ['closureTime', '24:00'],
  ])('rejects invalid %s value %s', async (field, value) => {
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'nurse-1', isActive: true }) },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'admitted' }) },
      procedure: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ id: 'procedure-1', status: 'in_progress', attendanceId: 'attendance-1' })
          .mockResolvedValue({ id: 'procedure-1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new EncounterRepository(prisma);
    await expect(repository.updateProcedureStatus('procedure-1', 'in_progress', {
      clinicalRecord: { [field]: value },
    }, 'nurse-1')).rejects.toThrow(/valid time in HH:MM format/i);
    expect(prisma.procedure.updateMany).not.toHaveBeenCalled();
  });
});

describe('theatre completion outcome validation', () => {
  it('rejects completing a procedure without a documented outcome', async () => {
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'nurse-1', isActive: true }) },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'admitted' }) },
      procedure: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ id: 'procedure-1', status: 'in_progress', attendanceId: 'attendance-1' })
          .mockResolvedValue({ id: 'procedure-1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const repository = new EncounterRepository(prisma);
    await expect(repository.updateProcedureStatus('procedure-1', 'completed', {
      clinicalRecord: {
        identityConfirmed: true,
        procedureAndSiteConfirmed: true,
        consentConfirmed: true,
        allergyStatusReviewed: true,
        preOpAssessmentCompleted: true,
        instrumentCountsStatus: 'correct',
        postOpDestination: 'Recovery',
        postOpPlan: 'Monitor observations and pain',
        handoverNotes: 'Handover completed to recovery nurse',
      },
    }, 'nurse-1')).rejects.toThrow(/procedure outcome/i);
    expect(prisma.procedure.updateMany).not.toHaveBeenCalled();
  });

});
