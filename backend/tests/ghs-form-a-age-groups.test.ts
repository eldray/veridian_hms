import { describe, expect, it } from 'vitest';
import { ageGroup, ageOn } from '../src/modules/ghsReport/formA';

describe('GHS Form A maternal age groups', () => {
  it('places exact age boundaries in the expected group', () => {
    expect(ageGroup('2012-10-23', '2026-10-23')).toBe('10-14');
    expect(ageGroup('2006-10-23', '2026-10-23')).toBe('20-24');
    expect(ageGroup('1991-10-23', '2026-10-23')).toBe('35+');
  });

  it('does not classify a child younger than 10 in the 10-14 band', () => {
    expect(ageGroup('2018-10-23', '2026-10-23')).toBeNull();
  });

  it('returns no age for missing or invalid dates', () => {
    expect(ageOn(null, '2026-10-23')).toBeNull();
    expect(ageOn('not-a-date', '2026-10-23')).toBeNull();
    expect(ageOn('2010-01-01', 'not-a-date')).toBeNull();
  });

  it('does not classify future dates of birth into 35+', () => {
    expect(ageOn('2030-01-01', '2026-10-23')).toBeNull();
    expect(ageGroup('2030-01-01', '2026-10-23')).toBeNull();
  });
});
