import { describe, expect, it } from 'vitest';
import { calculateNHISMedicineAllocation } from '../src/utils/pricing';

describe('NHIS medicine co-payment allocation', () => {
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

  it('charges only the cash-price difference when that policy is explicitly selected', () => {
    expect(calculateNHISMedicineAllocation({
      cashPrice: 30, nhisTariff: 20, covered: true, copaymentMode: 'cash_price_difference',
    })).toEqual({ cashPrice: 30, nhisCoveredAmount: 20, patientPayableAmount: 10, copaymentAmount: 10 });
  });

  it('applies fixed and percentage co-payments against the configured NHIS tariff', () => {
    expect(calculateNHISMedicineAllocation({
      cashPrice: 30, nhisTariff: 20, covered: true, copaymentMode: 'fixed_amount', copaymentAmount: 5,
    })).toMatchObject({ nhisCoveredAmount: 15, patientPayableAmount: 5 });
    expect(calculateNHISMedicineAllocation({
      cashPrice: 30, nhisTariff: 20, covered: true, copaymentMode: 'percentage', copaymentPercentage: 25,
    })).toMatchObject({ nhisCoveredAmount: 15, patientPayableAmount: 5 });
  });

  it('does not let an NHIS tariff exceed the cash price', () => {
    expect(calculateNHISMedicineAllocation({
      cashPrice: 12, nhisTariff: 20, covered: true, copaymentMode: 'cash_price_difference',
    })).toMatchObject({ nhisCoveredAmount: 12, patientPayableAmount: 0 });
  });

  it('rejects incomplete co-payment configuration instead of silently guessing', () => {
    expect(() => calculateNHISMedicineAllocation({
      cashPrice: 30, nhisTariff: 20, covered: true, copaymentMode: 'fixed_amount',
    })).toThrow(/requires a configured/);
  });
});
