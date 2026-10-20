// backend/src/utils/pricing.ts
//
// ONE place that decides which price a patient is charged, given the payer type.
// Used by billing, bill generation and the service-catalog cost calculators so they can never disagree.
//
// Rules:
//   cash               -> cashPrice
//   nhis               -> nhisPrice, but if the service is not NHIS-covered (or has no NHIS price) the patient pays cashPrice
//   private_insurance  -> insurancePrice, but if the service is exempted (or has no insurance price) the patient pays cashPrice
//   corporate          -> corporatePrice; if it is 0, the corporate account's discount off cashPrice; otherwise cashPrice

export type PayerMode = 'cash' | 'nhis' | 'private_insurance' | 'corporate';

export interface PriceRow {
  cashPrice?: any;
  nhisPrice?: any;
  insurancePrice?: any;
  corporatePrice?: any;
}

export interface PriceOptions {
  /** ServiceCatalog.isNHISCovered. Only an explicit `false` makes the patient pay cash. */
  isNHISCovered?: boolean;
  /** ServiceCatalog.isPrivateInsuranceExempted. Only an explicit `true` makes the patient pay cash. */
  isPrivateInsuranceExempted?: boolean;
  /** CorporateAccount.discountPercentage (0-100), applied to cashPrice when there is no corporate price. */
  corporateDiscountPercent?: number;
}

/** Prisma Decimal / string / number / null -> number (0 when empty or invalid). */
export const toPriceNumber = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  const n = parseFloat(val.toString());
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** True when the payer (NHIS / private insurance) actually pays its own price for this service. */
export const isPayerCovered = (price: PriceRow, mode: PayerMode | string, opts: PriceOptions = {}): boolean => {
  if (mode === 'nhis') return opts.isNHISCovered !== false && toPriceNumber(price.nhisPrice) > 0;
  if (mode === 'private_insurance') return opts.isPrivateInsuranceExempted !== true && toPriceNumber(price.insurancePrice) > 0;
  if (mode === 'corporate') return true;
  return false;
};

export interface WardRateRow {
  dailyCashRate?: any;
  dailyNHISRate?: any;
  dailyInsuranceRate?: any;
  dailyCorporateRate?: any;
  isNHISCovered?: boolean;
  isPrivateInsExempted?: boolean;
}

/** The daily bed rate for a ward. Same rules as services: a missing or uncovered payer rate means the patient pays the cash rate. */
export const resolveWardDailyRate = (ward: WardRateRow, mode: PayerMode | string, opts: { corporateDiscountPercent?: number } = {}): number =>
  resolveUnitPrice(
    { cashPrice: ward.dailyCashRate, nhisPrice: ward.dailyNHISRate, insurancePrice: ward.dailyInsuranceRate, corporatePrice: ward.dailyCorporateRate },
    mode,
    { isNHISCovered: ward.isNHISCovered, isPrivateInsuranceExempted: ward.isPrivateInsExempted, corporateDiscountPercent: opts.corporateDiscountPercent }
  );

/** The unit price to charge for one unit of a service, following the rules above. */
export const resolveUnitPrice = (price: PriceRow, mode: PayerMode | string, opts: PriceOptions = {}): number => {
  const cash = toPriceNumber(price.cashPrice);

  switch (mode) {
    case 'nhis':
      return isPayerCovered(price, mode, opts) ? toPriceNumber(price.nhisPrice) : cash;

    case 'private_insurance':
      return isPayerCovered(price, mode, opts) ? toPriceNumber(price.insurancePrice) : cash;

    case 'corporate': {
      const corporate = toPriceNumber(price.corporatePrice);
      if (corporate > 0) return corporate;
      const discount = opts.corporateDiscountPercent ?? 0;
      return discount > 0 ? round2(cash * (1 - discount / 100)) : cash;
    }

    case 'cash':
    default:
      return cash;
  }
};
