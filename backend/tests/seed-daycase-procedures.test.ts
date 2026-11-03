import { describe, expect, it } from 'vitest';
import { COMPLAINT_SCENARIOS } from '../src/seed/clinicalContent';
import { billsAsNHISDayCase } from '../src/seed/procedureGdrgMappings';

/**
 * The generator opens a day case from the scenarios named in DAYCASE_SCENARIOS, and a day case is
 * billed as OPD under a ZOOM code. Three of those five scenarios are theatre work — an operation
 * alongside the day-procedure code it also links — so their claims went out as an outpatient visit
 * carrying an ENTH or OPHT or ASUR G-DRG, the pair the payer rejects. The gate now asks the mapping
 * table whether every procedure the scenario performs really bills as a day case.
 */
const scenario = (key: string) => {
  const found = COMPLAINT_SCENARIOS.find((entry) => entry.key === key);
  if (!found) throw new Error(`scenario ${key} is gone from the table`);
  return found;
};

describe('which seeded procedures may be billed as a day case', () => {
  it('accepts a scenario whose every procedure carries a ZOOM day-procedure code', () => {
    expect(billsAsNHISDayCase(scenario('daycase_dressing').procedureCodes)).toBe(true);
    expect(billsAsNHISDayCase(scenario('family_planning').procedureCodes)).toBe(true);
  });

  it('refuses a scenario whose work is an operation, even when it also links a ZOOM code', () => {
    expect(billsAsNHISDayCase(scenario('tonsil_surgery').procedureCodes)).toBe(false);
    expect(billsAsNHISDayCase(scenario('cataract').procedureCodes)).toBe(false);
    expect(billsAsNHISDayCase(scenario('soft_tissue_lump').procedureCodes)).toBe(false);
    expect(billsAsNHISDayCase(scenario('upper_bleed').procedureCodes)).toBe(false);
  });

  it('refuses a presentation that performs nothing', () => {
    expect(billsAsNHISDayCase([])).toBe(false);
    expect(billsAsNHISDayCase(scenario('malaria').procedureCodes)).toBe(false);
  });

  /**
   * A theatre procedure only bills under its own G-DRG when the case is an admission, so a scenario
   * that cannot be a day case must not be able to produce one - the encounter holds a bed instead.
   */
  it('keeps operative scenarios out of the day-case shape', () => {
    const operative = COMPLAINT_SCENARIOS.filter((entry) => entry.procedureCodes.length > 0 && !billsAsNHISDayCase(entry.procedureCodes));
    expect(operative.length).toBeGreaterThan(0);
    expect(operative.map((entry) => entry.key)).not.toContain('family_planning');
    expect(operative.every((entry) => entry.admitChance > 0)).toBe(true);
  });
});
