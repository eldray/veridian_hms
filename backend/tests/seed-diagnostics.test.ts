import { describe, expect, it } from 'vitest';
import { hasSeededLabResult } from '../src/seed/testSeed/diagnostics';

describe('demo laboratory result completion', () => {
  it('does not treat an empty result template as completed work', () => {
    expect(hasSeededLabResult([])).toBe(false);
    expect(hasSeededLabResult([{ value: '' }, { value: null }])).toBe(false);
  });

  it('accepts numeric zero and non-empty text as recorded results', () => {
    expect(hasSeededLabResult([{ value: 0 }])).toBe(true);
    expect(hasSeededLabResult([{ value: 'Negative' }])).toBe(true);
  });
});
