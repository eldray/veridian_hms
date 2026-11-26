import { describe, expect, it } from 'vitest';
import { COUNTS, generateAttendances, generatePatients, makeNhisNumber, setSeed } from '../src/seed/bulkGenerator';
import { nhisCCCFor, nhisSeedCCCFields } from '../src/seed/testSeed/encounters';

describe('NHIS demo attendance identity', () => {
  it('generates valid synthetic member numbers for seeded NHIS patients', () => {
    setSeed(12345);
    for (let index = 0; index < 100; index += 1) {
      const memberNumber = makeNhisNumber(index);
      expect(memberNumber).toMatch(/^(?:[1-9]\d{7}|00[1-9]\d{7})$/);
    }
  });

  it('creates a five-digit deterministic CCC for the seeded attendance', () => {
    expect(nhisCCCFor('ATT-000123')).toBe('10123');
    expect(nhisCCCFor('ATT-000123')).toBe(nhisCCCFor('ATT-000123'));
    expect(nhisCCCFor('ATT-000124')).not.toBe(nhisCCCFor('ATT-000123'));
  });

  it('populates both CCC fields and their validity metadata on NHIS demo attendances', () => {
    const visitDate = new Date('2026-10-12T09:30:00.000Z');
    const fields = nhisSeedCCCFields('ATT-000123', visitDate);
    expect(fields.nhisCCC).toBe('10123');
    expect(fields.nhisCCCCode).toBe('10123');
    expect(fields.nhisCCCGeneratedAt).toEqual(visitDate);
    expect(fields.nhisCCCValidUntil).toEqual(new Date('2026-11-11T09:30:00.000Z'));
  });
});
