import { describe, expect, it, vi } from 'vitest';
import { EncounterRepository } from '../src/modules/encounter/EncounterRepository';

describe('clinical order concurrent-update guards', () => {
  it('blocks laboratory result updates when the encounter is closed', async () => {
    const updateMany = vi.fn();
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'discharged' }) },
      labTest: { findUnique: vi.fn().mockResolvedValue({ id: 'lab-1', attendanceId: 'attendance-1', status: 'requested' }), updateMany },
    } as any);

    await expect(repository.updateLabTestStatus('lab-1', 'completed', { result: 'Positive' }, 'staff-1'))
      .rejects.toThrow(/closed encounter/i);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('blocks scan result updates when the encounter is closed', async () => {
    const updateMany = vi.fn();
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'discharged' }) },
      scan: { findUnique: vi.fn().mockResolvedValue({ id: 'scan-1', attendanceId: 'attendance-1', status: 'requested' }), updateMany },
    } as any);

    await expect(repository.updateScanStatus('scan-1', 'completed', { result: 'Report' }, 'staff-1'))
      .rejects.toThrow(/closed encounter/i);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('blocks procedure status updates when the encounter is closed', async () => {
    const updateMany = vi.fn();
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'discharged' }) },
      procedure: { findUnique: vi.fn().mockResolvedValue({ id: 'procedure-1', attendanceId: 'attendance-1', status: 'scheduled' }), updateMany },
    } as any);

    await expect(repository.updateProcedureStatus('procedure-1', 'completed', {
      outcome: 'Recorded',
      clinicalRecord: {
        identityConfirmed: true,
        procedureAndSiteConfirmed: true,
        consentConfirmed: true,
        consentStatus: 'consented',
        allergyStatusReviewed: true,
        preOpAssessmentCompleted: true,
        instrumentCountsStatus: 'correct',
        postOpDestination: 'Recovery room',
        postOpPlan: 'Monitor and escalate deterioration',
        handoverNotes: 'Recovery nurse received patient and post-operative plan',
      },
    }, 'staff-1'))
      .rejects.toThrow(/closed encounter/i);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not overwrite a laboratory order changed by another request', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'pending' }) },
      labTest: {
        findUnique: vi.fn().mockResolvedValue({ id: 'lab-1', attendanceId: 'attendance-1', status: 'requested' }),
        updateMany,
      },
    };
    const repository = new EncounterRepository(prisma);

    await expect(repository.updateLabTestStatus('lab-1', 'completed', { result: 'Positive' }, 'staff-1'))
      .rejects.toThrow(/laboratory order status changed/i);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'lab-1', status: 'requested' },
      data: expect.objectContaining({ status: 'completed', result: 'Positive' }),
    });
  });

  it('does not overwrite a scan changed by another request', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'pending' }) },
      scan: {
        findUnique: vi.fn().mockResolvedValue({ id: 'scan-1', attendanceId: 'attendance-1', status: 'requested' }),
        updateMany,
      },
    };
    const repository = new EncounterRepository(prisma);

    await expect(repository.updateScanStatus('scan-1', 'completed', { result: 'Report' }, 'staff-1'))
      .rejects.toThrow(/scan order status changed/i);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'scan-1', status: 'requested' },
      data: expect.objectContaining({ status: 'completed', result: 'Report' }),
    });
  });

  it('does not overwrite a procedure changed by another request', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'pending' }) },
      procedure: {
        findUnique: vi.fn().mockResolvedValue({ id: 'procedure-1', attendanceId: 'attendance-1', status: 'scheduled' }),
        updateMany,
      },
    };
    const repository = new EncounterRepository(prisma);

    await expect(repository.updateProcedureStatus('procedure-1', 'completed', {
      outcome: 'Recorded',
      clinicalRecord: {
        identityConfirmed: true,
        procedureAndSiteConfirmed: true,
        consentConfirmed: true,
        consentStatus: 'consented',
        allergyStatusReviewed: true,
        preOpAssessmentCompleted: true,
        instrumentCountsStatus: 'correct',
        postOpDestination: 'Recovery room',
        postOpPlan: 'Monitor and escalate deterioration',
        handoverNotes: 'Recovery nurse received patient and post-operative plan',
      },
    }, 'staff-1'))
      .rejects.toThrow(/procedure status changed/i);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'procedure-1', status: 'scheduled' },
      data: expect.objectContaining({ status: 'completed', outcome: 'Recorded' }),
    });
  });
});
