import { describe, expect, it, vi } from 'vitest';
import { isPayerCovered, resolveUnitPrice } from '../src/utils/pricing';
import { BillingRepository } from '../src/modules/billing/BillingRepository';

describe('visit billing payer scenarios', () => {
  const configuredPrices = { cashPrice: 100, nhisPrice: 65, insurancePrice: 80 };

  it('charges the configured cash-and-carry price', () => {
    expect(resolveUnitPrice(configuredPrices, 'cash')).toBe(100);
    expect(isPayerCovered(configuredPrices, 'cash')).toBe(false);
  });

  it('uses the NHIS tariff only for a service marked as NHIS-covered', () => {
    expect(resolveUnitPrice(configuredPrices, 'nhis', { isNHISCovered: true })).toBe(65);
    expect(resolveUnitPrice(configuredPrices, 'nhis', { isNHISCovered: false })).toBe(100);
    expect(resolveUnitPrice({ cashPrice: 100, nhisPrice: null }, 'nhis', { isNHISCovered: true })).toBe(100);
  });

  it('uses the private-insurance tariff unless the service is explicitly exempted', () => {
    expect(resolveUnitPrice(configuredPrices, 'private_insurance', { isPrivateInsuranceExempted: false })).toBe(80);
    expect(resolveUnitPrice(configuredPrices, 'private_insurance', { isPrivateInsuranceExempted: true })).toBe(100);
    expect(resolveUnitPrice({ cashPrice: 100, insurancePrice: null }, 'private_insurance')).toBe(100);
  });

  it('does not mark an uncovered payer line as insurer-covered', () => {
    expect(isPayerCovered({ cashPrice: 100, nhisPrice: 65 }, 'nhis', { isNHISCovered: false })).toBe(false);
    expect(isPayerCovered({ cashPrice: 100, insurancePrice: 80 }, 'private_insurance', { isPrivateInsuranceExempted: true })).toBe(false);
  });
});


describe('payer liability aggregation', () => {
  it('does not apply provider coverage to an uncovered NHIS cash-priced service', async () => {
    const provider = { id: 'nhis-provider', isActive: true, type: 'nhis', coveragePercentage: 80 };
    const lines = [
      { lineTotal: 100, patientPayableAmount: 100, insuranceCoveredAmount: 0, sourceKey: null },
      { lineTotal: 65, patientPayableAmount: 13, insuranceCoveredAmount: 52, sourceKey: null },
    ];
    const billUpdate = vi.fn().mockImplementation(async ({ data }: any) => ({ id: 'bill-payer-test', ...data }));
    const tx: any = {
      insuranceProvider: { findUnique: vi.fn().mockResolvedValue(provider) },
      bill: {
        create: vi.fn().mockResolvedValue({ id: 'bill-payer-test' }),
        update: billUpdate,
      },
      billLineItem: {
        create: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue(lines),
      },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new BillingRepository(prisma);

    await repository.create({
      patientId: 'patient-1',
      attendanceId: 'attendance-1',
      paymentMode: 'nhis',
      insuranceProviderId: 'nhis-provider',
      billNumber: 'BILL-PAYER-TEST',
    }, lines as any);

    const persistedAmounts = billUpdate.mock.calls[0][0].data;
    expect(persistedAmounts.totalAmount).toBe(165);
    expect(persistedAmounts.insuranceCovered).toBe(52);
    expect(persistedAmounts.patientPayable).toBe(113);
    expect(persistedAmounts.balance).toBe(113);
  });
});
