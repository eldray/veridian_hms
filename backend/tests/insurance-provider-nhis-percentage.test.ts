import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InsuranceType } from '@prisma/client';

const repositoryMock = {
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
};

vi.mock('../src/modules/insuranceProvider/InsuranceProviderRepository', () => ({
  InsuranceProviderRepository: vi.fn().mockImplementation(() => repositoryMock),
}));

import { InsuranceProviderService } from '../src/modules/insuranceProvider/InsuranceProviderService';

describe('InsuranceProviderService NHIS percentage policy', () => {
  let service: InsuranceProviderService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InsuranceProviderService({} as any);
    repositoryMock.create.mockImplementation(async (data) => data);
    repositoryMock.update.mockImplementation(async (_id, data) => data);
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
    repositoryMock.findById.mockResolvedValue({ id: 'nhis-1', type: InsuranceType.nhis });

    const result = await service.updateProvider('nhis-1', { coveragePercentage: 35 });

    expect(result.coveragePercentage).toBe(100);
    expect(repositoryMock.update).toHaveBeenCalledWith('nhis-1', expect.objectContaining({ coveragePercentage: 100 }));
  });
});
