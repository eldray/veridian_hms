/**
 * CLAIM-it accepts an 8-digit NHIS membership number or a 10-digit HIN.
 * Normalize presentation separators before validating; never invent a missing number.
 */
export const normalizeNhisMemberNumber = (value: unknown): string =>
  String(value ?? '').replace(/[\s-]/g, '').trim();

export const isValidNhisMemberNumber = (value: unknown): boolean =>
  /^(?:\d{8}|\d{10})$/.test(normalizeNhisMemberNumber(value));
