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
