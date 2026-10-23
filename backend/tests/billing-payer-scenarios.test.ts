import { describe, expect, it } from 'vitest';
import { isPayerCovered, resolveUnitPrice } from '../src/utils/pricing';

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
