/**
 * Frontend mirror of the backend tax engine (`backend/src/utils/tax.ts`).
 *
 * Estimates preview their tax before they are saved, and the settings screen
 * needs to show what a set of components will come to. The arithmetic has to be
 * identical to the server's, so the same compounding order is implemented here:
 * NHIL/GETFund/COVID on the value, then VAT on the value plus those levies.
 */

export interface TaxComponent {
  code: string;
  name: string;
  rate: number;
  compound?: boolean;
  order?: number;
  active?: boolean;
}

export interface TaxConfiguration {
  isEnabled: boolean;
  defaultExempt: boolean;
  taxId: string | null;
  payerModes: string[];
  components: TaxComponent[];
}

export interface TaxComponentAmount {
  code: string;
  name: string;
  rate: number;
  amount: number;
}

export interface TaxBreakdown {
  base: number;
  total: number;
  effectiveRate: number;
  payerMode: string;
  components: TaxComponentAmount[];
}

export const DEFAULT_TAX_CONFIGURATION: TaxConfiguration = {
  isEnabled: false,
  defaultExempt: true,
  taxId: null,
  payerModes: ['cash'],
  components: [],
};

export const GHANA_TAX_COMPONENTS: TaxComponent[] = [
  { code: 'NHIL', name: 'NHIL', rate: 2.5, compound: false, order: 1, active: true },
  { code: 'GETFUND', name: 'GETFund', rate: 2.5, compound: false, order: 2, active: true },
  { code: 'COVID', name: 'COVID-19 Levy', rate: 1, compound: false, order: 3, active: true },
  { code: 'VAT', name: 'VAT', rate: 15, compound: true, order: 4, active: true },
];

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const n = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

export function activeComponents(components: TaxComponent[] | null | undefined): TaxComponent[] {
  return (Array.isArray(components) ? components : [])
    .filter((component) => component && component.active !== false && n(component.rate) > 0)
    .slice()
    .sort((a, b) => n(a.order) - n(b.order));
}

/** The effective percentage a bill would carry (21.9 for the Ghana preset). */
export function effectiveRate(components: TaxComponent[] | null | undefined): number {
  const active = activeComponents(components);
  if (active.length === 0) return 0;
  const breakdown = computeTaxBreakdown(100, active);
  return breakdown.effectiveRate;
}

export function computeTaxBreakdown(
  taxableValue: number,
  components: TaxComponent[],
  payerMode = 'cash',
): TaxBreakdown {
  const base = money(Math.max(0, n(taxableValue)));
  const active = activeComponents(components);
  if (base <= 0 || active.length === 0) {
    return { base, total: 0, effectiveRate: 0, payerMode, components: [] };
  }

  let levyBase = base;
  const rows: TaxComponentAmount[] = [];
  for (const component of active) {
    const chargeBase = component.compound ? levyBase : base;
    const amount = money(chargeBase * (n(component.rate) / 100));
    rows.push({ code: component.code, name: component.name || component.code, rate: n(component.rate), amount });
    if (!component.compound) levyBase = money(levyBase + amount);
  }

  const total = money(rows.reduce((sum, row) => sum + row.amount, 0));
  return {
    base,
    total,
    effectiveRate: base > 0 ? money((total / base) * 100) : 0,
    payerMode,
    components: rows,
  };
}

export function isTaxablePayer(config: TaxConfiguration | null | undefined, payerMode: string): boolean {
  return !!config?.isEnabled && (config.payerModes || []).includes(String(payerMode));
}

/**
 * A line's tax. `isTaxable` must be explicitly true (exempt by default); an
 * item-level rate replaces the facility components for legacy VAT-only setups.
 */
export function computeLineTax(
  taxableValue: number,
  item: { isTaxable?: boolean | null; overrideRate?: number | null },
  config: TaxConfiguration | null | undefined,
  payerMode = 'cash',
): TaxBreakdown {
  if (!isTaxablePayer(config, payerMode) || item?.isTaxable !== true) {
    return { base: 0, total: 0, effectiveRate: 0, payerMode, components: [] };
  }

  const overrideRate = Math.max(0, n(item?.overrideRate));
  if (overrideRate > 0) {
    return computeTaxBreakdown(taxableValue, [
      { code: 'VAT', name: 'VAT', rate: overrideRate, compound: false, order: 1, active: true },
    ], payerMode);
  }

  return computeTaxBreakdown(taxableValue, config?.components || [], payerMode);
}

export function mergeTaxBreakdowns(breakdowns: Array<TaxBreakdown | null | undefined>): TaxBreakdown | null {
  const rows = breakdowns.filter((row): row is TaxBreakdown => !!row && n(row.total) > 0);
  if (rows.length === 0) return null;

  const byCode = new Map<string, TaxComponentAmount>();
  let base = 0;
  let total = 0;
  for (const row of rows) {
    base = money(base + n(row.base));
    total = money(total + n(row.total));
    for (const component of row.components || []) {
      const existing = byCode.get(component.code);
      if (existing) existing.amount = money(existing.amount + n(component.amount));
      else byCode.set(component.code, { ...component, amount: n(component.amount) });
    }
  }

  return {
    base,
    total,
    effectiveRate: base > 0 ? money((total / base) * 100) : 0,
    payerMode: rows[0]?.payerMode || 'cash',
    components: Array.from(byCode.values()),
  };
}
