import { describe, expect, it, vi } from 'vitest';
import { InsuranceClaimService } from '../src/modules/insuranceClaim/InsuranceClaimService';

/**
 * The two places a claim's money is decided after the tariff table or the medicine list moves:
 * saving the lines of a draft, and finalizing it. Both were refusing or silently under-pricing —
 * the medicine list imported from NHIS carries no authorisation column at all, and the G-DRG tariff
 * is edited in place without rewriting the drafts that were priced from the old figure.
 */
describe('NHIS claim medicine pricing', () => {
  const policyDate = new Date('2026-10-24T10:00:00.000Z');

  function setupDraft(opts: { authorizationRequired: boolean | null } = { authorizationRequired: null }) {
    const claim = {
      id: 'claim-1',
      billId: null,
      insuranceProviderId: 'nhis-1',
      corporateAccountId: null,
      status: 'draft',
      metadata: {},
      totalClaimAmount: 28.7,
      InsuranceProvider: { id: 'nhis-1', type: 'nhis' },
      Attendance: {
        id: 'attendance-1',
        patientId: 'patient-1',
        dateTime: policyDate,
        Admission: null,
        Medication: [{
          id: 'med-1',
          name: 'Amoxicillin 500mg capsules',
          quantity: 30,
          serviceCatalogId: 'service-1',
          StockItem: { id: 'stock-1', drugCode: 'NHIS-MED-1', name: 'Amoxicillin 500mg' },
          ServiceCatalog: { id: 'service-1', code: 'NHIS-MED-1' },
        }],
      },
    };
    const prisma: any = {
      insuranceClaim: {
        findUnique: vi.fn()
          .mockResolvedValueOnce(claim)
          .mockResolvedValueOnce({ ...claim, items: [] }),
        update: vi.fn().mockResolvedValue(claim),
      },
      serviceCatalog: {
        findMany: vi.fn().mockResolvedValue([{ id: 'service-1' }]),
        findFirst: vi.fn().mockResolvedValue({
          code: 'NHIS-MED-1',
          StockItem: {
            id: 'stock-1',
            payerRules: [{
              isCovered: true,
              authorizationRequired: opts.authorizationRequired,
              prescribingLevel: 'A',
              effectiveFrom: new Date('2026-01-01'),
              effectiveTo: null,
              tariffPrice: null,
              copaymentMode: null,
              copaymentAmount: null,
              copaymentPercentage: null,
            }],
          },
          pricing: [{ cashPrice: 12.5, nhisPrice: 5 }],
        }),
      },
      diagnosis: { findMany: vi.fn().mockResolvedValue([]) },
      gDRGTariff: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue({ id: 'tariff-1', nhiaTariff: 28.7, nhisServiceCode: 'OPDC-06' }),
      },
      preAuthorisationRequest: { findMany: vi.fn().mockResolvedValue([]) },
      insuranceClaimItem: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const tx: any = {
      insuranceClaimItem: prisma.insuranceClaimItem,
      insuranceClaim: { update: prisma.insuranceClaim.update },
    };
    prisma.$transaction = vi.fn(async (callback: any) => callback(tx));
    return { service: new InsuranceClaimService(prisma), prisma, tx };
  }

  const draftLines = () => [
    { itemCategory: 'gdrg', code: 'OPDC06A', description: 'G-DRG OPDC06A', quantity: 1 },
    { itemCategory: 'medicine', code: 'NHIS-MED-1', description: 'Amoxicillin 500mg capsules', quantity: 30 },
  ];

  it('prices a covered medicine whose payer rule does not state an authorisation requirement', async () => {
    const { service, tx } = setupDraft({ authorizationRequired: null });

    await service.replaceClaimItems('claim-1', draftLines(), 'user-1');

    const saved = tx.insuranceClaimItem.createMany.mock.calls[0][0].data;
    const medicine = saved.find((row: any) => row.itemCategory === 'medicine');
    expect(medicine.unitPrice).toBe(5);
    expect(medicine.lineTotal).toBe(150);
    expect(tx.insuranceClaim.update.mock.calls[0][0].data.totalClaimAmount).toBe(178.7);
  });

  it('still refuses a medicine whose payer rule explicitly requires prior authorisation', async () => {
    const { service, tx } = setupDraft({ authorizationRequired: true });

    await expect(service.replaceClaimItems('claim-1', draftLines(), 'user-1'))
      .rejects.toThrow(/prior authorisation|authorisation/i);
    expect(tx.insuranceClaimItem.createMany).not.toHaveBeenCalled();
  });

  it('keeps a medicine the NHIS list marks not covered off the claim', async () => {
    const { service, prisma, tx } = setupDraft();
    prisma.serviceCatalog.findFirst = vi.fn().mockResolvedValue({
      code: 'NHIS-MED-1',
      StockItem: { id: 'stock-1', payerRules: [{ isCovered: false, authorizationRequired: null, prescribingLevel: 'A', effectiveFrom: null, effectiveTo: null }] },
      pricing: [{ cashPrice: 12.5, nhisPrice: 5 }],
    });

    await expect(service.replaceClaimItems('claim-1', draftLines(), 'user-1'))
      .rejects.toThrow(/is on the NHIS list but marked not covered/);
    expect(tx.insuranceClaimItem.createMany).not.toHaveBeenCalled();
  });

  /**
   * The formulary also holds older items with no payer rule at all - a Metoclopramide injection
   * the NHIS list never carried. Saying "configure its coverage" for those sent the user looking
   * for a setting that has nothing to do with the medicine; the answer is to take the line off.
   */
  it('names a medicine with no NHIS payer rule as one the scheme does not pay for', async () => {
    const { service, prisma, tx } = setupDraft();
    prisma.serviceCatalog.findFirst = vi.fn().mockResolvedValue({
      code: 'METOCLO-INJ-10',
      StockItem: { id: 'stock-9', payerRules: [] },
      pricing: [{ cashPrice: 2.5, nhisPrice: 0 }],
    });

    await expect(service.replaceClaimItems('claim-1', [
      { itemCategory: 'gdrg', code: 'OPDC06A', description: 'G-DRG OPDC06A', quantity: 1 },
      { itemCategory: 'medicine', code: 'METOCLO-INJ-10', description: 'Metoclopramide Injection 10mg/2ml', quantity: 1 },
    ], 'user-1'))
      .rejects.toThrow(/has no NHIS payer rule, so it is not on the medicine list this scheme pays/);
    expect(tx.insuranceClaimItem.createMany).not.toHaveBeenCalled();
  });
});

describe('NHIS claim finalization re-prices the G-DRG to the current tariff', () => {
  const draft = (items: any[], overrides: Record<string, unknown> = {}) => ({
    id: 'claim-1',
    claimNumber: 'NHIS-1001',
    status: 'draft',
    insuranceProviderId: 'nhis-1',
    totalClaimAmount: 30,
    createdAt: new Date('2026-10-24T10:00:00.000Z'),
    InsuranceProvider: { type: 'nhis' },
    typeOfService: 'OPD',
    mdcCode: 'OPDC',
    serviceOutcome: 'DISC',
    principalGDRG: 'OPDC06A',
    Attendance: { dateTime: new Date('2026-10-24T10:00:00.000Z'), Admission: null },
    items,
    ...overrides,
  });

  function setupFinalize(claim: any, tariff: any) {
    const lineUpdates: any[] = [];
    const claimUpdates: any[] = [];
    const prisma: any = {
      insuranceClaim: {
        findUnique: vi.fn().mockResolvedValue(claim),
        update: vi.fn(async (args: any) => {
          claimUpdates.push(args);
          return { ...claim, status: args.data.status ?? claim.status };
        }),
      },
      insuranceClaimItem: {
        update: vi.fn(async (args: any) => {
          lineUpdates.push(args);
          return args;
        }),
      },
      gDRGTariff: { findFirst: vi.fn().mockResolvedValue(tariff) },
    };
    prisma.$transaction = vi.fn(async (operations: any[]) => Promise.all(operations));
    return { service: new InsuranceClaimService(prisma), prisma, lineUpdates, claimUpdates };
  }

  const pricedLines = () => [
    { id: 'line-gdrg', itemCategory: 'gdrg', code: 'OPDC06A', lineTotal: 24 },
    { id: 'line-med', itemCategory: 'medicine', code: 'NHIS-MED-1', lineTotal: 6 },
  ];

  /** The re-price writes the claim header total before the status flip, so find it by field. */
  const totalWrites = (claimUpdates: any[]) =>
    claimUpdates.filter((args: any) => args.data.totalClaimAmount !== undefined);

  it('rewrites the G-DRG line and the claim total from the tariff now in force', async () => {
    const { service, prisma, lineUpdates, claimUpdates } = setupFinalize(draft(pricedLines()), { id: 'tariff-2', nhiaTariff: 28.7 });

    await service.finalizeClaim('claim-1', 'user-1');

    expect(lineUpdates).toEqual([{
      where: { id: 'line-gdrg' },
      data: { unitPrice: 28.7, lineTotal: 28.7, gdrgTariffId: 'tariff-2' },
    }]);
    expect(totalWrites(claimUpdates).map((args: any) => args.data.totalClaimAmount)).toEqual([34.7]);
    expect(prisma.insuranceClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'finalized' }) }),
    );
  });

  it('prices through updateClaimStatus too, so both finalize routes agree', async () => {
    const { service, claimUpdates } = setupFinalize(draft(pricedLines()), { id: 'tariff-2', nhiaTariff: 28.7 });

    await service.updateClaimStatus('claim-1', 'finalized', undefined, 'user-1');

    expect(totalWrites(claimUpdates).map((args: any) => args.data.totalClaimAmount)).toEqual([34.7]);
  });

  it('writes nothing when the draft already carries the tariff in force', async () => {
    const { service, prisma, lineUpdates, claimUpdates } = setupFinalize(
      draft([
        { id: 'line-gdrg', itemCategory: 'gdrg', code: 'OPDC06A', lineTotal: 28.7 },
        { id: 'line-med', itemCategory: 'medicine', code: 'NHIS-MED-1', lineTotal: 6 },
      ], { totalClaimAmount: 34.7 }),
      { id: 'tariff-1', nhiaTariff: 28.7 },
    );

    await service.finalizeClaim('claim-1', 'user-1');

    expect(lineUpdates).toHaveLength(0);
    expect(totalWrites(claimUpdates)).toHaveLength(0);
    expect(prisma.insuranceClaimItem.update).not.toHaveBeenCalled();
  });

  it('leaves a claim whose code no longer has a tariff row in force at the price it carries', async () => {
    const { service, prisma, lineUpdates, claimUpdates } = setupFinalize(draft(pricedLines()), null);

    await service.finalizeClaim('claim-1', 'user-1');

    expect(lineUpdates).toHaveLength(0);
    expect(totalWrites(claimUpdates)).toHaveLength(0);
    expect(prisma.insuranceClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'finalized' }) }),
    );
  });

  it('does not re-price a private claim', async () => {
    const { service, prisma, lineUpdates, claimUpdates } = setupFinalize(
      draft(pricedLines(), { InsuranceProvider: { type: 'private' }, mdcCode: null, principalGDRG: null, serviceOutcome: null }),
      { id: 'tariff-2', nhiaTariff: 28.7 },
    );

    await service.finalizeClaim('claim-1', 'user-1');

    expect(prisma.gDRGTariff.findFirst).not.toHaveBeenCalled();
    expect(lineUpdates).toHaveLength(0);
    expect(totalWrites(claimUpdates)).toHaveLength(0);
  });

  it('reads the tariff as at the service date, not the day the claim is submitted', async () => {
    const { service, prisma } = setupFinalize(draft(pricedLines()), { id: 'tariff-1', nhiaTariff: 24 });

    await service.finalizeClaim('claim-1', 'user-1');

    expect(prisma.gDRGTariff.findFirst.mock.calls[0][0].where).toMatchObject({
      gdrgCode: 'OPDC06A',
      isActive: true,
      effectiveFrom: { lte: new Date('2026-10-24T10:00:00.000Z') },
    });
  });
});
