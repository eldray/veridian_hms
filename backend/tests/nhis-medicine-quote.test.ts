import { describe, expect, it, vi } from 'vitest';
import { InsuranceClaimService } from '../src/modules/insuranceClaim/InsuranceClaimService';

/**
 * The claim form used to list every drug the encounter prescribed, priced at nothing, and then refuse
 * the save for each one the scheme does not pay. The payer quote is now the only medicine source, so
 * what the desk can pick is exactly what the payer will fund, at the amount it funds it at.
 */
const serviceDate = new Date('2026-10-24T10:00:00.000Z');

const dispensed = (stockItemId: string, name = `Medicine ${stockItemId}`, quantity = 2): any => ({
  id: `med-${stockItemId}`, name, status: 'dispensed', quantity, stockItemId,
});

const rule = (stockItemId: string, extra: Record<string, any> = {}): any => ({
  stockItemId,
  isCovered: true,
  authorizationRequired: null,
  prescribingLevel: 'A',
  effectiveFrom: new Date('2025-03-01'),
  effectiveTo: null,
  tariffPrice: 4,
  copaymentMode: 'none',
  copaymentAmount: null,
  copaymentPercentage: null,
  ...extra,
});

const catalog = (stockItemId: string, cashPrice = 6, nhisPrice = 5): any => ({
  id: `cat-${stockItemId}`,
  code: `MED-${stockItemId}`,
  stockItemId,
  pricing: [{ cashPrice, nhisPrice }],
});

/** Runs the quote against one claim whose attendance carries the given medicines. */
function quote(medicines: any[], rules: any[] = [], catalogs: any[] = []) {
  const claim = {
    insuranceProviderId: 'nhis-1',
    Attendance: {
      dateTime: serviceDate,
      insuranceProviderId: 'nhis-1',
      Admission: null,
      Medication: medicines.map((m) => ({
        dosage: '1 tablet',
        frequency: 'BD',
        duration: '5 days',
        dispensedAt: m.status === 'dispensed' ? serviceDate : null,
        serviceCatalogId: `cat-${m.stockItemId}`,
        StockItem: { id: m.stockItemId, drugCode: `CODE-${m.stockItemId}`, name: m.name, unitOfMeasure: 'tablet' },
        ...m,
      })),
    },
  };

  const prisma: any = {
    insuranceClaim: { findUnique: vi.fn().mockResolvedValue(claim) },
    stockItemPayerRule: { findMany: vi.fn().mockResolvedValue(rules) },
    serviceCatalog: { findMany: vi.fn().mockResolvedValue(catalogs) },
  };
  const service = new InsuranceClaimService(prisma);
  return { prisma, run: () => service.listNHISClaimableMedicines('claim-1') };
}

describe('the NHIS claim medicine quote', () => {
  it('prices a dispensed medicine the scheme covers at its NHIS share', async () => {
    const { prisma, run } = quote([dispensed('s1')], [rule('s1')], [catalog('s1')]);

    const result = await run();

    expect(result.medicines).toHaveLength(1);
    expect(result.medicines[0]).toMatchObject({
      code: 'CODE-s1',
      description: 'Medicine s1',
      quantity: 2,
      unitPrice: 4,
      lineTotal: 8,
      date: '2026-10-24',
      prescription: '1 tablet BD x 5 days',
    });
    expect(result.unclaimable).toEqual([]);
    // The quote is read against the claim's own payer, not a hard-coded NHIS id.
    expect(prisma.stockItemPayerRule.findMany.mock.calls[0][0].where.insuranceProviderId).toBe('nhis-1');
  });

  it('leaves out a dispensed medicine with no NHIS payer rule and says why', async () => {
    const { run } = quote([dispensed('s1', 'Magnesium Oxide Tablet, 400mg')], [], [catalog('s1')]);

    const result = await run();

    expect(result.medicines).toEqual([]);
    expect(result.unclaimable).toEqual([
      { code: 'CODE-s1', description: 'Magnesium Oxide Tablet, 400mg', reason: 'is not on the NHIS medicine list' },
    ]);
  });

  it('leaves out a medicine the scheme marks not covered', async () => {
    const { run } = quote([dispensed('s1')], [rule('s1', { isCovered: false })], [catalog('s1')]);

    const result = await run();

    expect(result.medicines).toEqual([]);
    expect(result.unclaimable[0].reason).toBe('is on the NHIS list but marked not covered');
  });

  it('leaves out a prescription the pharmacy never handed over', async () => {
    const { run } = quote(
      [{ id: 'med-s1', name: 'Amoxicillin Capsule 500mg', status: 'prescribed', quantity: 21, stockItemId: 's1' }],
      [rule('s1')],
      [catalog('s1')],
    );

    const result = await run();

    expect(result.medicines).toEqual([]);
    expect(result.unclaimable[0].reason).toBe('was prescribed, not dispensed to the patient');
  });

  it('leaves out a covered medicine with no active cash price to allocate against', async () => {
    const { run } = quote([dispensed('s1')], [rule('s1')], []);

    const result = await run();

    expect(result.medicines).toEqual([]);
    expect(result.unclaimable[0].reason).toBe('has no active cash price configured');
  });

  it('leaves out a covered medicine with no tariff anywhere, which is what makes a line price zero', async () => {
    const { run } = quote(
      [dispensed('s1')],
      [rule('s1', { tariffPrice: null })],
      [{ id: 'cat-s1', code: 'MED-s1', stockItemId: 's1', pricing: [{ cashPrice: 6, nhisPrice: 0 }] }],
    );

    const result = await run();

    expect(result.medicines).toEqual([]);
    expect(result.unclaimable[0].reason).toBe('has no NHIS tariff configured');
  });

  it('quotes the NHIS share after the configured co-payment, not the full tariff', async () => {
    const { run } = quote(
      [dispensed('s1', 'Paracetamol Tablet 500mg', 4)],
      [rule('s1', { tariffPrice: 8, copaymentMode: 'percentage', copaymentPercentage: 25 })],
      [catalog('s1', 10, 8)],
    );

    const result = await run();

    expect(result.medicines[0]).toMatchObject({ unitPrice: 6, lineTotal: 24 });
  });

  it('falls back to the active NHIS price when the payer rule carries no tariff', async () => {
    const { run } = quote([dispensed('s1')], [rule('s1', { tariffPrice: null })], [catalog('s1', 6, 5)]);

    const result = await run();

    expect(result.medicines[0]).toMatchObject({ unitPrice: 5, lineTotal: 10 });
  });

  it('refuses a rule whose prescribing level is missing, because the save would refuse it too', async () => {
    const { run } = quote([dispensed('s1')], [rule('s1', { prescribingLevel: null })], [catalog('s1')]);

    const result = await run();

    expect(result.medicines).toEqual([]);
    expect(result.unclaimable[0].reason).toBe('has no valid NHIS prescribing level configured');
  });

  it('refuses a rule that is not in force on the service date', async () => {
    const { run } = quote([dispensed('s1')], [rule('s1', { effectiveFrom: new Date('2027-01-01') })], [catalog('s1')]);

    const result = await run();

    expect(result.medicines).toEqual([]);
    expect(result.unclaimable[0].reason).toBe('its payer rule is not in force on the service date');
  });

  it('reports an admission priced from its admission date, the same day the claim header uses', async () => {
    const admissionDate = new Date('2026-10-20T08:00:00.000Z');
    const medicines = [dispensed('s1')];
    const claim = {
      insuranceProviderId: 'nhis-1',
      Attendance: {
        dateTime: serviceDate,
        insuranceProviderId: 'nhis-1',
        Admission: { admissionDate },
        Medication: medicines.map((m) => ({
          ...m, dosage: null, frequency: null, duration: null,
          dispensedAt: serviceDate, serviceCatalogId: 'cat-s1',
          StockItem: { id: 's1', drugCode: 'CODE-s1', name: m.name, unitOfMeasure: 'tablet' },
        })),
      },
    };
    const prisma: any = {
      insuranceClaim: { findUnique: vi.fn().mockResolvedValue(claim) },
      stockItemPayerRule: { findMany: vi.fn().mockResolvedValue([rule('s1')]) },
      serviceCatalog: { findMany: vi.fn().mockResolvedValue([catalog('s1')]) },
    };

    const result = await new InsuranceClaimService(prisma).listNHISClaimableMedicines('claim-1');

    expect(result.serviceDate).toBe('2026-10-20');
    expect(result.medicines[0].date).toBe('2026-10-24');
  });

  it('returns nothing for a claim with no medicines rather than throwing', async () => {
    const { run } = quote([]);

    const result = await run();

    expect(result).toEqual({ serviceDate: null, medicines: [], unclaimable: [] });
  });
});
