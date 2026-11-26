import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { GDRGService } from '../src/modules/gdrg/GDRGService';

describe('GDRGService.lookupByAge', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses the attendance date for tariff validity and the patient age split', async () => {
    const prisma = {
      patient: {
        findUnique: vi.fn().mockResolvedValue({
          dateOfBirth: new Date('2012-07-01T00:00:00.000Z'),
          folderNumber: 'F-100',
        }),
      },
    } as unknown as PrismaClient;
    const service = new GDRGService(prisma);
    const findFirstTariff = vi.spyOn((service as any).gdrgRepository, 'findFirstTariff')
      .mockResolvedValue(null);

    const result = await service.lookupByAge('PAED01C', 'patient-1', '2024-06-30T00:00:00.000Z');

    const where = findFirstTariff.mock.calls[0][0];
    expect(where.effectiveFrom.lte).toEqual(new Date('2024-06-30T00:00:00.000Z'));
    expect(where.OR[1].effectiveTo.gte).toEqual(new Date('2024-06-30T00:00:00.000Z'));
    expect(where.AND[0].OR[1].minAgeYears.lte).toBe(11);
    expect(where.AND[1].OR[1].maxAgeYears.gte).toBe(11);
    expect(result.ageSplit).toBe('C');
    expect(result.patient.ageInYears).toBe(11);
  });

  it('rejects an invalid attendance date instead of silently using the current tariff schedule', async () => {
    const prisma = {
      patient: { findUnique: vi.fn() },
    } as unknown as PrismaClient;
    const service = new GDRGService(prisma);
    const findFirstTariff = vi.spyOn((service as any).gdrgRepository, 'findFirstTariff');

    await expect(service.lookupByAge('MEDI01A', undefined, 'not-a-date'))
      .rejects.toThrow('Invalid attendance date for GDRG tariff lookup');
    expect(findFirstTariff).not.toHaveBeenCalled();
  });

  it('respects an explicitly supplied age of zero', async () => {
    const prisma = { patient: { findUnique: vi.fn() } } as unknown as PrismaClient;
    const service = new GDRGService(prisma);
    const findFirstTariff = vi.spyOn((service as any).gdrgRepository, 'findFirstTariff')
      .mockResolvedValue(null);

    const result = await service.lookupByAge('PAED01C', undefined, '2024-01-01T00:00:00.000Z', 0);

    expect(findFirstTariff.mock.calls[0][0].AND[0].OR[1].minAgeYears.lte).toBe(0);
    expect(result.ageSplit).toBe('C');
  });
});
