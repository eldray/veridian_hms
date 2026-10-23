import { describe, expect, it } from 'vitest';
import { isNewHMISDiagnosisCase } from '../src/modules/ghsReport/GHSReportService';

describe('HMIS diagnosis case classification', () => {
  it('honours an explicit new-case classification even if the diagnosis exists in history', () => {
    expect(isNewHMISDiagnosisCase('NEW_DIAGNOSIS', true)).toBe(true);
  });

  it('honours an explicit old-case classification even if this is the first record in the loaded period', () => {
    expect(isNewHMISDiagnosisCase('OLD_DIAGNOSIS', false)).toBe(false);
  });

  it('uses historical diagnosis presence for legacy records without a classification', () => {
    expect(isNewHMISDiagnosisCase(null, false)).toBe(true);
    expect(isNewHMISDiagnosisCase(undefined, true)).toBe(false);
  });
});

import { postnatalDayAfterDelivery } from '../src/modules/ghsReport/formA';

describe('GHS Form A postnatal timing', () => {
  it('uses calendar days rather than elapsed 24-hour blocks', () => {
    expect(postnatalDayAfterDelivery('2026-10-03T01:00:00.000Z', '2026-10-02T23:00:00.000Z')).toBe(1);
  });

  it('returns negative days for a postnatal record dated before delivery so reports can exclude it', () => {
    expect(postnatalDayAfterDelivery('2026-10-01T12:00:00.000Z', '2026-10-02T08:00:00.000Z')).toBe(-1);
  });

  it('uses a valid legacy day number only when there is no linked delivery date', () => {
    expect(postnatalDayAfterDelivery('2026-10-05', null, 3)).toBe(3);
    expect(postnatalDayAfterDelivery('2026-10-05', null, null)).toBeNull();
  });

  it('does not fabricate a day when dates are missing or invalid', () => {
    expect(postnatalDayAfterDelivery(null, '2026-10-02')).toBeNull();
    expect(postnatalDayAfterDelivery('not-a-date', '2026-10-02')).toBeNull();
  });
});
