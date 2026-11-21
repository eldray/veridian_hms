import { describe, expect, it } from 'vitest';
import { isValidNhisMemberNumber, normalizeNhisMemberNumber } from '../src/utils/nhisMembership';

describe('NHIS membership number validation', () => {
  it('accepts 8-digit member numbers and 10-digit HINs', () => {
    expect(isValidNhisMemberNumber('12345678')).toBe(true);
    expect(isValidNhisMemberNumber('0012345678')).toBe(true);
  });

  it('normalizes spaces and hyphens before validation', () => {
    expect(normalizeNhisMemberNumber(' 1234-5678 ')).toBe('12345678');
    expect(isValidNhisMemberNumber('1234-5678')).toBe(true);
  });

  it('rejects missing, malformed and non-numeric values', () => {
    for (const value of ['', null, undefined, '123456', '123456789', '1234567A']) {
      expect(isValidNhisMemberNumber(value)).toBe(false);
    }
  });
});
