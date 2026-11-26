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

  it('treats the existing "once" selector as once daily for the full course', () => {
    expect(parse('once').requiredDoses).toBe(5);
  });

  it('creates exactly one MAR row for STAT regardless of the entered course duration', () => {
    expect(parse('STAT').requiredDoses).toBe(1);
  });

  it('does not create automatic MAR rows for PRN prescriptions', () => {
    expect(parse('PRN').requiredDoses).toBe(0);
  });

  it('treats a 24-hour duration as 24 hours, not 24 days', () => {
    expect(svc.parseSchedule('BD', '24 hours', new Date('2026-01-01T08:00:00Z')).requiredDoses).toBe(2);
  });

  it('still rejects nonsense and out-of-range counts', () => {
    expect(() => parse('whenever')).toThrow(/Unsupported medication frequency/);
    expect(() => parse('seven times daily')).toThrow();
    expect(() => parse('12 times a day')).toThrow(/between 1 and 6/);
  });
});
