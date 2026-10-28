import { afterEach, describe, expect, it, vi } from 'vitest';
import { bcryptRounds, refreshTokenExpiresAt, refreshTokenLifetime } from '../src/utils/tokenConfig';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('refresh token lifetime', () => {
  it('defaults to seven days', () => {
    expect(refreshTokenLifetime()).toBe('7d');
    expect(refreshTokenExpiresAt(0).getTime()).toBe(SEVEN_DAYS_MS);
  });

  it('honours a configured duration', () => {
    vi.stubEnv('JWT_REFRESH_EXPIRY', '12h');

    expect(refreshTokenLifetime()).toBe('12h');
    expect(refreshTokenExpiresAt(0).getTime()).toBe(12 * 60 * 60 * 1000);
  });

  it('falls back for malformed durations', () => {
    vi.stubEnv('JWT_REFRESH_EXPIRY', 'forever');

    expect(refreshTokenLifetime()).toBe('7d');
    expect(refreshTokenExpiresAt(0).getTime()).toBe(SEVEN_DAYS_MS);
  });
});

describe('bcrypt cost factor', () => {
  it('defaults to 12', () => {
    expect(bcryptRounds()).toBe(12);
  });

  it('accepts a value inside the supported range', () => {
    vi.stubEnv('BCRYPT_ROUNDS', '11');
    expect(bcryptRounds()).toBe(11);
  });

  it('ignores values outside the supported range', () => {
    vi.stubEnv('BCRYPT_ROUNDS', '4');
    expect(bcryptRounds()).toBe(12);

    vi.stubEnv('BCRYPT_ROUNDS', '18');
    expect(bcryptRounds()).toBe(12);
  });
});
