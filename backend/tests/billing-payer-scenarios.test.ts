import { describe, expect, it, vi } from 'vitest';
import { calculateNHISMedicineAllocation, isPayerCovered, resolveMedicationUnitPrice, resolveUnitPrice } from '../src/utils/pricing';
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
    // Missing NHIS tariff is not a valid tariff; the UI must flag it instead of showing cash or 0.00.
    expect(isPayerCovered({ cashPrice: 100, nhisPrice: null }, 'nhis', { isNHISCovered: true })).toBe(false);
  });

  it('uses the private-insurance tariff unless the service is explicitly exempted', () => {
    expect(resolveUnitPrice(configuredPrices, 'private_insurance', { isPrivateInsuranceExempted: false })).toBe(80);
    expect(resolveUnitPrice(configuredPrices, 'private_insurance', { isPrivateInsuranceExempted: true })).toBe(100);
    expect(resolveUnitPrice({ cashPrice: 100, insurancePrice: null }, 'private_insurance')).toBe(100);
  });

  it('uses the cash selling price for private and corporate medicines, but keeps the NHIS tariff', () => {
    const medicinePrices = { cashPrice: 42.5, nhisPrice: 18.75, insurancePrice: 31, corporatePrice: 27 };
    expect(resolveMedicationUnitPrice(medicinePrices, 'private_insurance')).toBe(42.5);
    expect(resolveMedicationUnitPrice(medicinePrices, 'corporate', { corporateDiscountPercent: 15 })).toBe(42.5);
    expect(resolveMedicationUnitPrice(medicinePrices, 'nhis', { isNHISCovered: true })).toBe(18.75);
    expect(resolveMedicationUnitPrice(medicinePrices, 'nhis', { isNHISCovered: false })).toBe(42.5);
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
      { lineTotal: 65, patientPayableAmount: 0, insuranceCoveredAmount: 65, sourceKey: null },
    ];
    const billUpdate = vi.fn().mockImplementation(async ({ data }: any) => ({ id: 'bill-payer-test', ...data }));
    const tx: any = {
      attendance: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'attendance-1', paymentMode: 'nhis', patientId: 'patient-1',
        }),
      },
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
    expect(persistedAmounts.insuranceCovered).toBe(65);
    expect(persistedAmounts.patientPayable).toBe(100);
    expect(persistedAmounts.balance).toBe(100);
  });
});


describe('NHIS medicine payer allocation rules', () => {
  it('makes an uncovered medicine fully patient-payable at cash price', () => {
    expect(calculateNHISMedicineAllocation({
      cashPrice: 120,
      nhisTariff: 75,
      covered: false,
    })).toEqual({
      cashPrice: 120,
      nhisCoveredAmount: 0,
      patientPayableAmount: 120,
      copaymentAmount: 0,
    });
  });

  it('allocates the full covered NHIS tariff to the insurer without a patient contribution', () => {
    expect(calculateNHISMedicineAllocation({
      cashPrice: 120,
      nhisTariff: 75,
      covered: true,
    })).toEqual({
      cashPrice: 120,
      nhisCoveredAmount: 75,
      patientPayableAmount: 0,
      copaymentAmount: 0,
    });
  });

  it('rejects fixed and cash-price-difference contributions for covered medicines', () => {
    expect(() => calculateNHISMedicineAllocation({
      cashPrice: 120, nhisTariff: 75, covered: true,
      copaymentMode: 'fixed_amount', copaymentAmount: 10,
    })).toThrow(/NHIA does not permit a co-payment/i);
    expect(() => calculateNHISMedicineAllocation({
      cashPrice: 120, nhisTariff: 75, covered: true, copaymentMode: 'cash_price_difference',
    })).toThrow(/NHIA does not permit a co-payment/i);
  });

  it('fails closed when a covered medicine has no positive NHIS tariff', () => {
    expect(() => calculateNHISMedicineAllocation({
      cashPrice: 120,
      nhisTariff: 0,
      covered: true,
    })).toThrow(/positive configured NHIS tariff/i);
  });
});
