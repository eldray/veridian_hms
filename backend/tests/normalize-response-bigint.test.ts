import { describe, expect, it } from 'vitest';
import { normalizeResponse } from '../src/utils/normalizeResponse';

describe('normalizeResponse BigInt serialization', () => {
  it('converts BigInt values to exact decimal strings in nested response data', () => {
    const normalized = normalizeResponse({
      id: 12n,
      chainSequence: 900719925474099312345n,
      nested: [{ value: 9223372036854775807n }],
    });

    expect(normalized).toEqual({
      id: '12',
      chainSequence: '900719925474099312345',
      nested: [{ value: '9223372036854775807' }],
    });
    expect(() => JSON.stringify(normalized)).not.toThrow();
  });

  it('leaves ordinary numbers unchanged', () => {
    expect(normalizeResponse({ total: 42, amount: 12.5 })).toEqual({
      total: 42,
      amount: 12.5,
    });
  });
});
