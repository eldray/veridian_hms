import { describe, expect, it } from 'vitest';
import { calculateNHISMedicineAllocation, resolveConfiguredNHISTariff } from '../src/utils/pricing';

describe('NHIS medicine co-payment allocation', () => {
  it('does not substitute the cash price when an NHIS tariff is missing or invalid', () => {
    expect(resolveConfiguredNHISTariff(null, null)).toBeNull();
    expect(resolveConfiguredNHISTariff(undefined, 0)).toBeNull();
    expect(resolveConfiguredNHISTariff(0, 18)).toBeNull();
    expect(resolveConfiguredNHISTariff(null, 18)).toBe(18);
    expect(resolveConfiguredNHISTariff(15, 18)).toBe(15);
  });

  it('charges the full cash price for uncovered or unverified medicines and excludes them from the claim', () => {
    expect(calculateNHISMedicineAllocation({ cashPrice: 30, nhisTariff: 20, covered: false })).toEqual({
      cashPrice: 30, nhisCoveredAmount: 0, patientPayableAmount: 30, copaymentAmount: 0,
    });
  });

  it('uses NHIS tariff with no patient co-payment by default', () => {
    expect(calculateNHISMedicineAllocation({ cashPrice: 30, nhisTariff: 20, covered: true })).toEqual({
      cashPrice: 30, nhisCoveredAmount: 20, patientPayableAmount: 0, copaymentAmount: 0,
    });
  });

  it('rejects a positive cash-price difference on a covered NHIS medicine', () => {
    expect(() => calculateNHISMedicineAllocation({
      cashPrice: 30, nhisTariff: 20, covered: true, copaymentMode: 'cash_price_difference',
    })).toThrow(/NHIA does not permit a co-payment/i);
  });

  it('rejects positive fixed and percentage contributions on covered NHIS medicines', () => {
    expect(() => calculateNHISMedicineAllocation({
      cashPrice: 30, nhisTariff: 20, covered: true, copaymentMode: 'fixed_amount', copaymentAmount: 5,
    })).toThrow(/NHIA does not permit a co-payment/i);
    expect(() => calculateNHISMedicineAllocation({
      cashPrice: 30, nhisTariff: 20, covered: true, copaymentMode: 'percentage', copaymentPercentage: 25,
    })).toThrow(/NHIA does not permit a co-payment/i);
  });

  it('does not let an NHIS tariff exceed the cash price', () => {
    expect(calculateNHISMedicineAllocation({
      cashPrice: 12, nhisTariff: 20, covered: true,
    })).toMatchObject({ nhisCoveredAmount: 12, patientPayableAmount: 0 });
  });

  it('rejects incomplete co-payment configuration instead of silently guessing', () => {
    expect(() => calculateNHISMedicineAllocation({
      cashPrice: 30, nhisTariff: 20, covered: true, copaymentMode: 'fixed_amount',
    })).toThrow(/requires a configured/);
  });
});
