// src/seed/testSeed/constants.ts
// Kept free of database imports so tests can read it.

/**
 * How far back the demo tariff history reaches (see backfillHistoricalPricing in billing.ts).
 * coreSeed writes every tariff effective today, so a visit dated before this window has no price row active on
 * its date and cannot be billed (NHIS medicine lines throw "No valid active cash price ..."). It has to cover
 * the OLDEST generated visit, not just "a year": antenatal bookings are dated weeks before a due date that can
 * itself be a year ago, which reached about 459 days. tests/seed-pricing-window.test.ts keeps the two in step.
 */
export const PRICING_HISTORY_DAYS = 600;
