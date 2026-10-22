import { describe, expect, it, vi } from 'vitest';
import { EncounterRepository } from '../src/modules/encounter/EncounterRepository';

describe('clinical order concurrent-update guards', () => {
  it('does not overwrite a laboratory order changed by another request', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      labTest: {
        findUnique: vi.fn().mockResolvedValue({ id: 'lab-1', status: 'requested' }),
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
      scan: {
        findUnique: vi.fn().mockResolvedValue({ id: 'scan-1', status: 'requested' }),
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
      procedure: {
        findUnique: vi.fn().mockResolvedValue({ id: 'procedure-1', status: 'scheduled' }),
        updateMany,
      },
    };
    const repository = new EncounterRepository(prisma);

    await expect(repository.updateProcedureStatus('procedure-1', 'completed', { outcome: 'Recorded' }, 'staff-1'))
      .rejects.toThrow(/procedure status changed/i);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'procedure-1', status: 'scheduled' },
      data: expect.objectContaining({ status: 'completed', outcome: 'Recorded' }),
    });
  });
});
