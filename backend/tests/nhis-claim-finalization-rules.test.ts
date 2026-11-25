import { describe, expect, it, vi } from 'vitest';
import { InsuranceClaimService } from '../src/modules/insuranceClaim/InsuranceClaimService';

/**
 * The guard that stops a draft the payer would query. These are the three contradictions the
 * August batch showed the generator producing — an open outcome, an outpatient claim reporting a
 * clinical specialty, and a principal that no line of the claim carries.
 */
describe('NHIS claim finalization rules', () => {
  function setup(claim: Record<string, unknown>) {
    const prisma: any = {
      insuranceClaim: {
        findUnique: vi.fn().mockResolvedValue(claim),
        update: vi.fn().mockResolvedValue({ ...claim, status: 'finalized' }),
      },
    };
    return { service: new InsuranceClaimService(prisma), prisma };
  }

  const nhisDraft = (overrides: Record<string, unknown> = {}) => ({
    id: 'claim-1',
    claimNumber: 'NHIS-1001',
    status: 'draft',
    InsuranceProvider: { type: 'nhis' },
    typeOfService: 'OPD',
    mdcCode: 'OPDC',
    serviceOutcome: 'DISC',
    principalGDRG: 'OPDC06A',
    items: [{ itemCategory: 'gdrg', code: 'OPDC06A', gdrgTariff: { gdrgCode: 'OPDC06A' } }],
    ...overrides,
  });

  it('finalizes an NHIS draft whose header the payer accepts', async () => {
    const { service, prisma } = setup(nhisDraft());
    await service.finalizeClaim('claim-1', 'user-1');
    expect(prisma.insuranceClaim.update).toHaveBeenCalled();
  });

  it('refuses an encounter that is still open', async () => {
    const { service, prisma } = setup(nhisDraft({ serviceOutcome: 'CONT' }));
    await expect(service.finalizeClaim('claim-1', 'user-1')).rejects.toThrow(/closed service outcome/i);
    expect(prisma.insuranceClaim.update).not.toHaveBeenCalled();
  });

  it('refuses an outpatient claim that reports a clinical specialty', async () => {
    const { service, prisma } = setup(nhisDraft({ mdcCode: 'MEDI' }));
    await expect(service.finalizeClaim('claim-1', 'user-1')).rejects.toThrow(/OPDC/);
    expect(prisma.insuranceClaim.update).not.toHaveBeenCalled();
  });

  it('refuses an admission that reports the outpatient scheme', async () => {
    const { service, prisma } = setup(nhisDraft({
      typeOfService: 'IPD',
      mdcCode: 'OPDC',
      principalGDRG: 'MEDI31A',
      items: [{ itemCategory: 'gdrg', code: 'MEDI31A', gdrgTariff: { gdrgCode: 'MEDI31A' } }],
    }));
    await expect(service.finalizeClaim('claim-1', 'user-1')).rejects.toThrow(/outpatient scheme/i);
    expect(prisma.insuranceClaim.update).not.toHaveBeenCalled();
  });

  it('refuses a principal G-DRG the claim carries no line for', async () => {
    const { service, prisma } = setup(nhisDraft({
      typeOfService: 'IPD',
      mdcCode: 'MEDI',
      principalGDRG: 'PAED36C',
      items: [{ itemCategory: 'gdrg', code: 'MEDI31A', gdrgTariff: { gdrgCode: 'MEDI31A' } }],
    }));
    await expect(service.finalizeClaim('claim-1', 'user-1')).rejects.toThrow(/not one of the G-DRG codes this claim carries/i);
    expect(prisma.insuranceClaim.update).not.toHaveBeenCalled();
  });

  it('leaves a private claim to its own rules', async () => {
    const { service, prisma } = setup(nhisDraft({
      InsuranceProvider: { type: 'private' },
      serviceOutcome: 'CONT',
      mdcCode: null,
      principalGDRG: null,
    }));
    await service.finalizeClaim('claim-1', 'user-1');
    expect(prisma.insuranceClaim.update).toHaveBeenCalled();
  });

  it('applies the same rules when the status is set through updateClaimStatus', async () => {
    const { service, prisma } = setup(nhisDraft({ serviceOutcome: 'CONT' }));
    await expect(service.updateClaimStatus('claim-1', 'finalized', undefined, 'user-1')).rejects.toThrow(/closed service outcome/i);
    expect(prisma.insuranceClaim.update).not.toHaveBeenCalled();
  });
});
