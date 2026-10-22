/**
 * Shared display formatting for monetary values.
 *
 * Configure VITE_CURRENCY and VITE_CURRENCY_LOCALE in the frontend environment.
 * Defaults target a Ghana-based deployment. This is display formatting only;
 * it does not convert values or alter the amount stored by the application.
 */
export const CURRENCY_CODE =
  (import.meta.env.VITE_CURRENCY || 'GHS').trim().toUpperCase();

const CURRENCY_LOCALE = (import.meta.env.VITE_CURRENCY_LOCALE || 'en-GH').trim();

const currencyFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: 'currency',
  currency: CURRENCY_CODE,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(
  amount: number | string | null | undefined,
): string {
  if (amount === null || amount === undefined || amount === '') {
    return currencyFormatter.format(0);
  }

  const numericAmount = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(numericAmount)) {
    return currencyFormatter.format(0);
  }

  return currencyFormatter.format(numericAmount);
}
