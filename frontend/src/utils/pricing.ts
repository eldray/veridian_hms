// frontend/src/utils/pricing.ts
//
// The client-side mirror of backend/src/utils/pricing.ts, for the screens that quote a price
// before a bill line exists (claim forms). Same payer rules, so the desk sees the amount the
// server will put on the line rather than a number invented in the browser.

export type PayerMode = 'cash' | 'private_insurance' | 'corporate';

const toNumber = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(String(val));
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** The catalog list returns one flattened pricing row; a claim detail include returns the newest active rows. */
export const pricingOf = (source: any): any => {
  const raw = source?.pricing;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
};

/** The unit price one unit of this catalog entry costs the given payer. */
export const payerUnitPrice = (
  catalog: any,
  mode: PayerMode,
  opts: { corporateDiscountPercent?: number } = {},
): number => {
  const pricing = pricingOf(catalog);
  if (!pricing) return 0;
  const cash = toNumber(pricing.cashPrice);

  switch (mode) {
    // An exempted service, or one with no insurance tariff, is patient-payable at the cash price.
    case 'private_insurance':
      return catalog?.isPrivateInsuranceExempted !== true && toNumber(pricing.insurancePrice) > 0
        ? toNumber(pricing.insurancePrice)
        : cash;

    case 'corporate': {
      const corporate = toNumber(pricing.corporatePrice);
      if (corporate > 0) return corporate;
      const discount = opts.corporateDiscountPercent ?? 0;
      return discount > 0 ? round2(cash * (1 - discount / 100)) : cash;
    }

    default:
      return cash;
  }
};

/**
 * A medicine is priced by the catalog entry linked to its stock item — the same link the bill
 * generator follows — so a picker that lists stock items still has to look the tariff up there.
 */
export const medicationCatalogByStockItemId = (catalogRows: any[]): Map<string, any> => {
  const map = new Map<string, any>();
  for (const row of catalogRows || []) {
    if (row?.stockItemId && row.serviceType === 'medication' && !map.has(row.stockItemId)) {
      map.set(row.stockItemId, row);
    }
  }
  return map;
};

/** An unpriced line is shown as needing a price, never as a tariff the hospital does not have. */
export const priceLabel = (unitPrice: number): string =>
  unitPrice > 0 ? `GHS ${unitPrice.toFixed(2)}` : 'no tariff configured';
