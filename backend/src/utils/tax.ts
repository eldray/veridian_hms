/**
 * Tax engine for patient billing and estimates.
 *
 * The facility's tax regime lives in one row (`tax_configuration`) and is stored
 * as components — VAT, NHIL, GETFund, COVID-19 levy — so a return can be filed
 * per levy instead of as a single opaque percentage.
 *
 * Ghana's standard treatment is applied in this order:
 *   NHIL 2.5% + GETFund 2.5% + COVID-19 1% on the taxable value, then VAT 15%
 *   on the value plus those levies. That is 21.9% effective, not 15%.
 *
 * Healthcare is exempt unless a service/pricing row opts in (`isTaxable`), and
 * only payer modes enabled in the configuration are taxed. Both defaults keep
 * a hospital from silently taxing exempt care after an upgrade.
 */

import { PrismaClient } from '@prisma/client';

export interface TaxComponent {
  code: string;
  name: string;
  rate: number;
  /** Compound components (VAT) are charged on the value plus the levies before them. */
  compound?: boolean;
  order?: number;
  active?: boolean;
  // Prisma's Json inputs require an index signature on the object type.
  [key: string]: any;
}

export interface TaxConfigurationShape {
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
  [key: string]: any;
}

export interface TaxBreakdown {
  /** Taxable value the tax was computed on. */
  base: number;
  /** Sum of every component. */
  total: number;
  /** Total as a percentage of `base` (21.9 for the Ghana preset). */
  effectiveRate: number;
  payerMode: string;
  components: TaxComponentAmount[];
  [key: string]: any;
}

export const GHANA_TAX_COMPONENTS: TaxComponent[] = [
  { code: 'NHIL', name: 'NHIL', rate: 2.5, compound: false, order: 1, active: true },
  { code: 'GETFUND', name: 'GETFund', rate: 2.5, compound: false, order: 2, active: true },
  { code: 'COVID', name: 'COVID-19 Levy', rate: 1, compound: false, order: 3, active: true },
  { code: 'VAT', name: 'VAT', rate: 15, compound: true, order: 4, active: true },
];

export const DEFAULT_TAX_CONFIGURATION: TaxConfigurationShape = {
  isEnabled: false,
  defaultExempt: true,
  taxId: null,
  payerModes: ['cash'],
  components: GHANA_TAX_COMPONENTS,
};

export const PAYER_MODES = ['cash', 'nhis', 'private_insurance', 'corporate'] as const;

const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

const toNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

/** Validates component rows coming from Settings before they reach the engine. */
export function normaliseComponents(input: unknown): TaxComponent[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw: any, index: number) => {
      const code = String(raw?.code ?? '').trim().toUpperCase().slice(0, 20);
      const name = String(raw?.name ?? code).trim().slice(0, 60);
      const rate = Math.min(100, Math.max(0, toNumber(raw?.rate)));
      if (!code || !Number.isFinite(rate)) return null;
      return {
        code,
        name: name || code,
        rate,
        compound: raw?.compound === true,
        order: Number.isFinite(Number(raw?.order)) ? Number(raw.order) : index + 1,
        active: raw?.active !== false,
      } as TaxComponent;
    })
    .filter((component): component is TaxComponent => component !== null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function normaliseTaxConfiguration(row: any): TaxConfigurationShape {
  if (!row) return { ...DEFAULT_TAX_CONFIGURATION, components: [...GHANA_TAX_COMPONENTS] };
  const payerModes = Array.isArray(row.payerModes)
    ? row.payerModes.map((mode: unknown) => String(mode)).filter((mode: string) => (PAYER_MODES as readonly string[]).includes(mode))
    : DEFAULT_TAX_CONFIGURATION.payerModes;
  const components = normaliseComponents(row.components);
  return {
    isEnabled: row.isEnabled === true,
    defaultExempt: row.defaultExempt !== false,
    taxId: row.taxId ?? null,
    payerModes: payerModes.length > 0 ? payerModes : ['cash'],
    components: components.length > 0 ? components : [...GHANA_TAX_COMPONENTS],
  };
}

export function isTaxablePayer(config: TaxConfigurationShape, payerMode: string): boolean {
  return config.isEnabled && config.payerModes.includes(String(payerMode));
}

export function emptyTaxBreakdown(payerMode: string = 'cash'): TaxBreakdown {
  return { base: 0, total: 0, effectiveRate: 0, payerMode, components: [] };
}

/**
 * Computes every tax component for a taxable value.
 *
 * Non-compound components are charged on `base`; compound components are charged
 * on `base` plus every non-compound amount computed before them, which is how
 * Ghana applies VAT on top of NHIL/GETFund/COVID.
 */
export function computeTaxBreakdown(
  taxableValue: number,
  components: TaxComponent[],
  payerMode: string = 'cash',
): TaxBreakdown {
  const base = money(Math.max(0, toNumber(taxableValue)));
  if (base <= 0) return emptyTaxBreakdown(payerMode);

  const active = normaliseComponents(components).filter((component) => component.active !== false && component.rate > 0);
  if (active.length === 0) return emptyTaxBreakdown(payerMode);

  let levyBase = base;
  const rows: TaxComponentAmount[] = [];
  for (const component of active) {
    const chargeBase = component.compound ? levyBase : base;
    const amount = money(chargeBase * (component.rate / 100));
    rows.push({ code: component.code, name: component.name, rate: component.rate, amount });
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

/**
 * A line's tax. `isTaxable` must be explicitly true (exempt by default), and an
 * item-level rate overrides the facility components for legacy VAT-only setups.
 */
export function computeLineTax(
  taxableValue: number,
  item: { isTaxable?: boolean | null; overrideRate?: number | null },
  config: TaxConfigurationShape,
  payerMode: string = 'cash',
): TaxBreakdown {
  if (!isTaxablePayer(config, payerMode) || item?.isTaxable !== true) {
    return emptyTaxBreakdown(payerMode);
  }

  const overrideRate = Math.max(0, toNumber(item?.overrideRate));
  if (overrideRate > 0) {
    return computeTaxBreakdown(taxableValue, [
      { code: 'VAT', name: 'VAT', rate: overrideRate, compound: false, order: 1, active: true },
    ], payerMode);
  }

  return computeTaxBreakdown(taxableValue, config.components, payerMode);
}

/** Adds per-line breakdowns into the invoice-level trail stored on a bill/estimate. */
export function mergeTaxBreakdowns(
  breakdowns: Array<TaxBreakdown | null | undefined>,
  payerMode: string = 'cash',
): TaxBreakdown | null {
  const rows = breakdowns.filter((row): row is TaxBreakdown => !!row && toNumber(row.total) > 0);
  if (rows.length === 0) return null;

  const byCode = new Map<string, TaxComponentAmount>();
  let base = 0;
  let total = 0;
  for (const row of rows) {
    base = money(base + toNumber(row.base));
    total = money(total + toNumber(row.total));
    for (const component of Array.isArray(row.components) ? row.components : []) {
      const existing = byCode.get(component.code);
      if (existing) existing.amount = money(existing.amount + toNumber(component.amount));
      else byCode.set(component.code, { ...component, amount: money(toNumber(component.amount)) });
    }
  }

  return {
    base,
    total,
    effectiveRate: base > 0 ? money((total / base) * 100) : 0,
    payerMode: rows[0]?.payerMode || payerMode,
    components: Array.from(byCode.values()),
  };
}

// ── Configuration loading ─────────────────────────────────────────────────────
// Billing loops compute a line at a time, so the row is cached briefly instead of
// being fetched per line. Settings writes invalidate it immediately.

let cached: { value: TaxConfigurationShape; at: number } | null = null;
const CACHE_TTL_MS = 10_000;

export function invalidateTaxConfigurationCache(): void {
  cached = null;
}

export async function loadTaxConfiguration(prisma: PrismaClient): Promise<TaxConfigurationShape> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  let row: any = null;
  try {
    row = await (prisma as any).taxConfiguration?.findUnique({ where: { id: 'default' } });
  } catch {
    // The table may not exist on an installation that has not migrated yet.
    row = null;
  }

  const value = normaliseTaxConfiguration(row);
  cached = { value, at: Date.now() };
  return value;
}

/** Serialisable shape returned to the frontend (estimate previews use it too). */
export function publicTaxConfiguration(config: TaxConfigurationShape) {
  return {
    isEnabled: config.isEnabled,
    defaultExempt: config.defaultExempt,
    taxId: config.taxId,
    payerModes: config.payerModes,
    components: config.components.map(({ code, name, rate, compound, order, active }) => ({
      code, name, rate, compound: compound === true, order: order ?? 0, active: active !== false,
    })),
  };
}
