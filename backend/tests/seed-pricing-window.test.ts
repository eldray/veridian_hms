// The demo tariff history must reach back past the oldest visit the generator can create. Otherwise that visit has
// no price row active on its date, and billing rejects it (NHIS medicine lines throw "No valid active cash price").
// With the old 420-day window about 18 antenatal visits (the oldest 459 days back) fell outside it.
import { describe, it, expect } from 'vitest';
import { generatePatients, generateAttendances } from '../src/seed/bulkGenerator';
import { PRICING_HISTORY_DAYS } from '../src/seed/testSeed/constants';

const SAFETY_MARGIN_DAYS = 30;
const daysAgo = (d: Date) => Math.floor((Date.now() - d.getTime()) / 86_400_000);

describe('demo tariff history window', () => {
  it('reaches back past the oldest generated visit, with a safety margin', () => {
    const bundle: any = generateAttendances(generatePatients());
    const oldest = Math.max(...bundle.attendances.map((a: any) => daysAgo(a.dateTime)));
    expect(oldest).toBeGreaterThan(365);                                  // maternity really does reach past a year
    expect(PRICING_HISTORY_DAYS).toBeGreaterThanOrEqual(oldest + SAFETY_MARGIN_DAYS);
  }, 120_000);
});
