import { describe, expect, it, vi } from 'vitest';
import { ProcedureRepository } from '../src/modules/procedure/ProcedureRepository';

describe('procedure template update model mapping', () => {
  it('updates linked template fields separately and preserves unedited metadata', async () => {
    const catalogUpdate = vi.fn().mockResolvedValue({ id: 'service-1' });
    const templateUpdate = vi.fn().mockResolvedValue({ id: 'template-1' });
    const prisma: any = {
      serviceCatalog: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'service-1',
          procedureTemplateId: 'template-1',
          metadata: { anesthesiaType: 'spinal', requiresAssistant: true, outcome: 'completed' },
        }),
        update: catalogUpdate,
      },
      procedureTemplate: { update: templateUpdate },
    };
    const repository = new ProcedureRepository(prisma);

    await repository.updateTemplate('service-1', {
      name: 'Updated procedure',
      code: 'PROC-NEW',
      procedureCode: 'THEATRE-NEW',
      category: 'minor_surgery',
      department: 'Theatre',
      duration: 45,
      isPrivateInsuranceExempted: true,
      requiresAssistant: false,
      intraOperativeNotes: 'Updated operative note',
      cashPrice: 250,
    });

    expect(catalogUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'service-1' },
      data: expect.objectContaining({
        name: 'Updated procedure',
        code: 'PROC-NEW',
        subType: 'minor_surgery',
        metadata: {
          anesthesiaType: 'spinal',
          requiresAssistant: false,
          outcome: 'completed',
          intraOperativeNotes: 'Updated operative note',
        },
      }),
    }));
    const catalogData = catalogUpdate.mock.calls[0][0].data;
    expect(catalogData).not.toHaveProperty('procedureCode');
    expect(catalogData).not.toHaveProperty('department');
    expect(catalogData).not.toHaveProperty('duration');
    expect(catalogData).not.toHaveProperty('cashPrice');

    expect(templateUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'template-1' },
      data: expect.objectContaining({
        name: 'Updated procedure',
        procedureCode: 'THEATRE-NEW',
        category: 'minor_surgery',
        department: 'Theatre',
        duration: 45,
        isPrivateInsExempted: true,
      }),
    }));
  });

  it('does not attempt to update a missing linked procedure template', async () => {
    const catalogUpdate = vi.fn().mockResolvedValue({ id: 'service-1' });
    const templateUpdate = vi.fn();
    const prisma: any = {
      serviceCatalog: {
        findUnique: vi.fn().mockResolvedValue({ id: 'service-1', procedureTemplateId: null, metadata: null }),
        update: catalogUpdate,
      },
      procedureTemplate: { update: templateUpdate },
    };
    const repository = new ProcedureRepository(prisma);

    await repository.updateTemplate('service-1', { name: 'Renamed procedure' });

    expect(catalogUpdate).toHaveBeenCalled();
    expect(templateUpdate).not.toHaveBeenCalled();
  });
});
