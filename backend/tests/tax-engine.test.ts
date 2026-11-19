import { describe, expect, it } from 'vitest';
import {
  GHANA_TAX_COMPONENTS,
  computeLineTax,
  computeTaxBreakdown,
  mergeTaxBreakdowns,
  normaliseComponents,
  normaliseTaxConfiguration,
  type TaxConfigurationShape,
} from '../src/utils/tax';

const enabled = (overrides: Partial<TaxConfigurationShape> = {}): TaxConfigurationShape => ({
  isEnabled: true,
  defaultExempt: true,
  taxId: null,
  payerModes: ['cash'],
  components: GHANA_TAX_COMPONENTS,
  ...overrides,
});

describe('Ghana tax components', () => {
  it('charges NHIL, GETFund and COVID on the value, then VAT on value plus levies', () => {
    const breakdown = computeTaxBreakdown(100, GHANA_TAX_COMPONENTS);

    expect(breakdown.components).toEqual([
      { code: 'NHIL', name: 'NHIL', rate: 2.5, amount: 2.5 },
      { code: 'GETFUND', name: 'GETFund', rate: 2.5, amount: 2.5 },
      { code: 'COVID', name: 'COVID-19 Levy', rate: 1, amount: 1 },
      { code: 'VAT', name: 'VAT', rate: 15, amount: 15.9 },
    ]);
    expect(breakdown.total).toBe(21.9);
    expect(breakdown.effectiveRate).toBe(21.9);
  });

  it('rounds each levy to the cent rather than the invoice as a whole', () => {
    const breakdown = computeTaxBreakdown(19.99, GHANA_TAX_COMPONENTS);
    const sum = breakdown.components.reduce((total, row) => total + row.amount, 0);

    expect(breakdown.total).toBe(Math.round(sum * 100) / 100);
    expect(breakdown.components.every((row) => Number.isInteger(row.amount * 100))).toBe(true);
  });

  it('returns no tax for a zero or negative value', () => {
    expect(computeTaxBreakdown(0, GHANA_TAX_COMPONENTS).total).toBe(0);
    expect(computeTaxBreakdown(-10, GHANA_TAX_COMPONENTS).total).toBe(0);
  });
});

describe('line tax policy', () => {
  it('leaves a service exempt unless it is explicitly taxable', () => {
    const config = enabled();
    expect(computeLineTax(100, { isTaxable: false }, config, 'cash').total).toBe(0);
    expect(computeLineTax(100, {}, config, 'cash').total).toBe(0);
    expect(computeLineTax(100, { isTaxable: true }, config, 'cash').total).toBe(21.9);
  });

  it('does not tax a payer type that is not selected', () => {
    const config = enabled({ payerModes: ['cash'] });
    expect(computeLineTax(100, { isTaxable: true }, config, 'nhis').total).toBe(0);
    expect(computeLineTax(100, { isTaxable: true }, config, 'cash').total).toBe(21.9);
  });

  it('does nothing while the regime is disabled', () => {
    const config = enabled({ isEnabled: false });
    expect(computeLineTax(100, { isTaxable: true }, config, 'cash').total).toBe(0);
  });

  it('replaces the facility mix with a single-rate override for legacy VAT-only items', () => {
    const line = computeLineTax(100, { isTaxable: true, overrideRate: 15 }, enabled(), 'cash');
    expect(line.total).toBe(15);
    expect(line.components).toEqual([{ code: 'VAT', name: 'VAT', rate: 15, amount: 15 }]);
  });
});

describe('invoice trail', () => {
  it('merges line breakdowns into one per-component total', () => {
    const first = computeTaxBreakdown(100, GHANA_TAX_COMPONENTS);
    const second = computeTaxBreakdown(50, GHANA_TAX_COMPONENTS);
    const merged = mergeTaxBreakdowns([first, second], 'cash');

    expect(merged?.base).toBe(150);
    expect(merged?.total).toBe(32.85);
    expect(merged?.components.find((row) => row.code === 'VAT')?.amount).toBe(23.85);
  });

  it('returns null when nothing was taxed', () => {
    expect(mergeTaxBreakdowns([null, undefined])).toBeNull();
  });
});

describe('configuration normalisation', () => {
  it('drops malformed rows and keeps valid components ordered', () => {
    const rows = normaliseComponents([
      { code: 'vat', name: 'VAT', rate: '15', compound: true, order: 2 },
      { code: '', name: 'Broken', rate: 5 },
      { code: 'NHIL', name: 'NHIL', rate: 2.5, order: 1 },
    ]);

    expect(rows.map((row) => row.code)).toEqual(['NHIL', 'VAT']);
    expect(rows[1].rate).toBe(15);
    expect(rows[1].compound).toBe(true);
  });

  it('falls back to the Ghana preset and cash-only when the row is missing', () => {
    const config = normaliseTaxConfiguration(null);
    expect(config.isEnabled).toBe(false);
    expect(config.defaultExempt).toBe(true);
    expect(config.payerModes).toEqual(['cash']);
    expect(config.components.map((row) => row.code)).toEqual(['NHIL', 'GETFUND', 'COVID', 'VAT']);
  });

  it('ignores unknown payer modes', () => {
    const config = normaliseTaxConfiguration({ payerModes: ['cash', 'martian'], components: GHANA_TAX_COMPONENTS });
    expect(config.payerModes).toEqual(['cash']);
  });
});
