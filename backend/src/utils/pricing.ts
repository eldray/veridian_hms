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


/**
 * Calculates an NHIS medicine line allocation from an explicit payer-rule policy.
 * The reference JSON does not establish co-payment terms; those must be configured on
 * StockItemPayerRule. All amounts are rounded to two decimal places.
 */
export type NHISCopaymentMode = 'none' | 'fixed_amount' | 'percentage' | 'cash_price_difference';

export interface NHISMedicineAllocation {
  cashPrice: number;
  nhisCoveredAmount: number;
  patientPayableAmount: number;
  copaymentAmount: number;
}

const money = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const calculateNHISMedicineAllocation = (input: {
  cashPrice: number;
  nhisTariff: number;
  covered: boolean;
  copaymentMode?: string | null;
  copaymentAmount?: number | null;
  copaymentPercentage?: number | null;
}): NHISMedicineAllocation => {
  const cashPrice = money(Math.max(0, Number.isFinite(input.cashPrice) ? input.cashPrice : 0));
  const tariff = money(Math.max(0, Number.isFinite(input.nhisTariff) ? input.nhisTariff : 0));

  // Unknown or uncovered medicines are patient-payable at the cash price and are not claimable.
  if (!input.covered) {
    return { cashPrice, nhisCoveredAmount: 0, patientPayableAmount: cashPrice, copaymentAmount: 0 };
  }

  if (tariff <= 0) {
    throw new Error('A covered NHIS medicine must have a positive configured NHIS tariff.');
  }

  const mode = input.copaymentMode ?? 'none';
  let copayment = 0;
  switch (mode) {
    case 'none':
      copayment = 0;
      break;
    case 'fixed_amount':
      if (input.copaymentAmount == null || !Number.isFinite(input.copaymentAmount) || input.copaymentAmount < 0) {
        throw new Error('Fixed NHIS co-payment requires a configured non-negative amount.');
      }
      copayment = input.copaymentAmount;
      break;
    case 'percentage':
      if (input.copaymentPercentage == null || !Number.isFinite(input.copaymentPercentage) || input.copaymentPercentage < 0 || input.copaymentPercentage > 100) {
        throw new Error('Percentage NHIS co-payment requires a configured percentage from 0 to 100.');
      }
      copayment = money(tariff * input.copaymentPercentage / 100);
      break;
    case 'cash_price_difference':
      // This is permitted only when a hospital has explicitly selected this policy.
      copayment = Math.max(0, cashPrice - tariff);
      break;
    default:
      throw new Error(`Unsupported NHIS co-payment mode: ${mode}`);
  }

  copayment = money(Math.min(cashPrice, tariff, Math.max(0, copayment)));
  const nhisCoveredAmount = money(Math.max(0, tariff - copayment));
  return {
    cashPrice,
    nhisCoveredAmount,
    patientPayableAmount: money(copayment),
    copaymentAmount: money(copayment),
  };
};
