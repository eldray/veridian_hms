import { describe, expect, it } from 'vitest';
import { serializeScanResultForStorage } from '../src/modules/encounter/EncounterRepository';

describe('scan result persistence', () => {
  it('serializes template-driven result objects for the Prisma String column', () => {
    const result = {
      templateId: 'SCAN-scan02u',
      values: { clinical_history: 's', liver: 'normal', impression: 'No abnormality' },
    };

    expect(serializeScanResultForStorage(result)).toBe(JSON.stringify(result));
    expect(JSON.parse(serializeScanResultForStorage(result)!)).toEqual(result);
  });

  it('preserves legacy plain-text reports and nullable values', () => {
    expect(serializeScanResultForStorage('Free-text report')).toBe('Free-text report');
    expect(serializeScanResultForStorage(null)).toBeNull();
    expect(serializeScanResultForStorage(undefined)).toBeUndefined();
  });
});
