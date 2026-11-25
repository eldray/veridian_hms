// Every frequency the demo seed prescribes (seed/clinicalContent.ts) must be accepted by the MAR scheduler,
// otherwise the encounter write that materialises doses throws and seeding aborts.
import { describe, it, expect } from 'vitest';
import { NursingService } from '../src/modules/nursing/NursingService';

const svc = new NursingService({} as any);
const parse = (f: string) => svc.parseSchedule(f, '5 days', new Date('2026-01-01T08:00:00Z'));

describe('NursingService.parseFrequency', () => {
  it.each(['BD', 'OD', 'PRN', 'QID', 'Stat', 'TDS', 'every 12 hours', 'every 4 hours', 'every 8 hours', 'once daily'])(
    'accepts seed frequency "%s"', (f) => { expect(() => parse(f)).not.toThrow(); });

  it('accepts "five times daily" as 5 doses a day', () => {
    const s = parse('five times daily');
    expect(s.requiredDoses).toBe(25);
    expect(s.intervalHours).toBeCloseTo(4.8);
  });

  it.each([['5 times a day', 25], ['three times daily', 15], ['twice per day', 10], ['4x daily', 20]])(
    'accepts "%s"', (f, doses) => { expect(parse(f as string).requiredDoses).toBe(doses); });

  it('still rejects nonsense and out-of-range counts', () => {
    expect(() => parse('whenever')).toThrow(/Unsupported medication frequency/);
    expect(() => parse('seven times daily')).toThrow();
    expect(() => parse('12 times a day')).toThrow(/between 1 and 6/);
  });
});
