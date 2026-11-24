import { describe, expect, it } from 'vitest';
import { isAccessTokenVersionCurrent } from '../src/middleware/authMiddleware';

describe('access token account version', () => {
  it('accepts a token minted for the current account version', () => {
    expect(isAccessTokenVersionCurrent(3, 3)).toBe(true);
  });

  it('rejects tokens minted before a password change or reset', () => {
    expect(isAccessTokenVersionCurrent(2, 3)).toBe(false);
  });

  it('rejects legacy tokens without a version claim', () => {
    expect(isAccessTokenVersionCurrent(undefined, 0)).toBe(false);
    expect(isAccessTokenVersionCurrent(null, 0)).toBe(false);
  });

  it('rejects malformed version claims', () => {
    expect(isAccessTokenVersionCurrent('3', 3)).toBe(false);
    expect(isAccessTokenVersionCurrent(NaN, 3)).toBe(false);
  });
});
