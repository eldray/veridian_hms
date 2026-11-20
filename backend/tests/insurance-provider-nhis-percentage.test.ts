import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InsuranceType } from '@prisma/client';
import { InsuranceProviderRepository } from '../src/modules/insuranceProvider/InsuranceProviderRepository';
import { InsuranceProviderService } from '../src/modules/insuranceProvider/InsuranceProviderService';

describe('InsuranceProviderService NHIS percentage policy', () => {
  let service: InsuranceProviderService;
  let createSpy: ReturnType<typeof vi.spyOn>;
  let findByIdSpy: ReturnType<typeof vi.spyOn>;
  let updateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new InsuranceProviderService({} as any);
    createSpy = vi.spyOn(InsuranceProviderRepository.prototype, 'create').mockImplementation(async (data: any) => data);
    findByIdSpy = vi.spyOn(InsuranceProviderRepository.prototype, 'findById').mockResolvedValue({ id: 'nhis-1', type: InsuranceType.nhis } as any);
    updateSpy = vi.spyOn(InsuranceProviderRepository.prototype, 'update').mockImplementation(async (_id: string, data: any) => data);
  });

  it('stores NHIS providers at the fixed compatibility value, regardless of submitted percentage', async () => {
    const result = await service.createProvider({
      name: 'NHIS',
      type: InsuranceType.nhis,
      coveragePercentage: 50,
    });
    expect(result.coveragePercentage).toBe(100);
  });

  it('preserves percentage settings for private insurers', async () => {
    const result = await service.createProvider({
      name: 'Private insurer',
      type: InsuranceType.private,
      coveragePercentage: 75,
    });
    expect(result.coveragePercentage).toBe(75);
  });

  it('prevents an NHIS provider update from reintroducing a percentage', async () => {
    const result = await service.updateProvider('nhis-1', { coveragePercentage: 35 });
    expect(result.coveragePercentage).toBe(100);
    expect(findByIdSpy).toHaveBeenCalledWith('nhis-1');
    expect(updateSpy).toHaveBeenCalledWith('nhis-1', expect.objectContaining({ coveragePercentage: 100 }));
  });
});
