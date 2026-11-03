import { describe, expect, it } from 'vitest';
import {
  facilityLevelFromType,
  nhisCaseType,
  resolvePrincipalGdrg,
  type ResolverLink,
  type ResolverTariff,
} from '../src/modules/insuranceClaim/helpers/NHISPrincipalGdrgResolver';

const tariff = (
  gdrgCode: string,
  overrides: Partial<ResolverTariff> = {}
): ResolverTariff => ({
  id: gdrgCode,
  gdrgCode,
  mdc: gdrgCode.slice(0, 4),
  nhiaTariff: '100.00',
  minAgeYears: gdrgCode.endsWith('A') ? 12 : null,
  maxAgeYears: gdrgCode.endsWith('C') ? 11 : null,
  applicableLevels: [1, 2, 3, 4, 5, 6, 10],
  isZoomCode: gdrgCode.startsWith('ZOOM'),
  isAntenatal: gdrgCode === 'OPDC02A',
  ...overrides,
});

const row = (code: string, isPrimary = false, origin: ResolverLink['origin'] = 'diagnosis'): ResolverLink => ({
  tariff: tariff(code),
  isPrimary,
  origin,
});

const OPDC06 = [tariff('OPDC06A'), tariff('OPDC06C')];

describe('NHIS principal G-DRG resolver', () => {
  it('bills an outpatient malaria visit under the OPD scheme, not the diagnosis inpatient code', () => {
    const resolved = resolvePrincipalGdrg({
      caseType: 'opd',
      age: 34,
      facilityLevel: 2,
      links: [row('MEDI28A', true), row('PAED36C'), row('OPDC06A'), row('OPDC06C')],
      fallbacks: OPDC06,
    });
    expect(resolved.tariff.gdrgCode).toBe('OPDC06A');
    expect(resolved.origin).toBe('diagnosis');
  });

  it('moves a child to the paediatric family instead of keeping the adult code', () => {
    const resolved = resolvePrincipalGdrg({
      caseType: 'ipd',
      age: 5,
      facilityLevel: 2,
      links: [row('MEDI28A', true), row('PAED36C')],
      fallbacks: OPDC06,
    });
    expect(resolved.tariff.gdrgCode).toBe('PAED36C');
  });

  it('keeps the diagnosis code for an admitted adult', () => {
    const resolved = resolvePrincipalGdrg({
      caseType: 'ipd',
      age: 40,
      facilityLevel: 2,
      links: [row('MEDI31A', true), row('PAED39C'), row('OPDC06A')],
      fallbacks: OPDC06,
    });
    expect(resolved.tariff.gdrgCode).toBe('MEDI31A');
  });

  it('bills an operation under the procedure own G-DRG', () => {
    const resolved = resolvePrincipalGdrg({
      caseType: 'ipd',
      age: 45,
      facilityLevel: 2,
      isSurgicalCase: true,
      links: [row('MEDI31A', true), row('ASUR01A', true, 'procedure')],
      fallbacks: OPDC06,
    });
    expect(resolved.tariff.gdrgCode).toBe('ASUR01A');
    expect(resolved.origin).toBe('procedure');
  });

  it('bills a day case dressing under its ZOOM code and an observation stay under detention', () => {
    const dayCase = resolvePrincipalGdrg({
      caseType: 'zoom',
      age: 9,
      facilityLevel: 2,
      links: [row('ASUR31A'), row('ZOOM07C', true, 'procedure'), row('ZOOM07A')],
      fallbacks: OPDC06,
    });
    expect(dayCase.tariff.gdrgCode).toBe('ZOOM07C');

    const observation = resolvePrincipalGdrg({
      caseType: 'zoom',
      age: 30,
      facilityLevel: 2,
      links: [row('MEDI31A', true)],
      fallbacks: [...OPDC06, tariff('ZOOM02A'), tariff('ZOOM02C')],
    });
    expect(observation.tariff.gdrgCode).toBe('ZOOM02A');
    expect(observation.origin).toBe('fallback');
  });

  it('bills an antenatal visit under the bundled antenatal code', () => {
    const resolved = resolvePrincipalGdrg({
      caseType: 'anc',
      age: 27,
      facilityLevel: 2,
      links: [row('MEDI32A', true), row('OPDC02A')],
      fallbacks: [...OPDC06, tariff('OPDC02A')],
    });
    expect(resolved.tariff.gdrgCode).toBe('OPDC02A');
  });

  it('refuses a code the facility level cannot bill', () => {
    const links = [row('ASUR02A', true), row('OPDC06A')];
    // ASUR02A is only priced at levels 1 and 2.
    links[0].tariff = tariff('ASUR02A', { applicableLevels: [1, 2] });
    expect(() => resolvePrincipalGdrg({
      caseType: 'ipd',
      age: 33,
      facilityLevel: 4,
      links,
      fallbacks: OPDC06,
    })).toThrow(/ASUR02A.*facility level 4/is);
  });

  it('explains what is missing when no code can bill the case', () => {
    expect(() => resolvePrincipalGdrg({
      caseType: 'ipd',
      age: 33,
      facilityLevel: 2,
      links: [row('OPDC06A', true)],
      fallbacks: OPDC06,
    })).toThrow(/Only a clinical family code/);
  });

  it('maps the facility record onto the tariff schedule levels', () => {
    expect(facilityLevelFromType('Secondary')).toBe(2);
    expect(facilityLevelFromType('Health_Center')).toBe(4);
    expect(facilityLevelFromType('CHPS')).toBe(10);
    expect(facilityLevelFromType(null)).toBeNull();
  });

  it('reads the case type from the encounter, not from the diagnosis', () => {
    expect(nhisCaseType({ attendanceType: 'general_consultation', encounterCategory: 'opd' })).toBe('opd');
    expect(nhisCaseType({ attendanceType: 'antenatal', encounterCategory: 'opd' })).toBe('anc');
    expect(nhisCaseType({ attendanceType: 'emergency_acute', encounterCategory: 'daycase' })).toBe('zoom');
    expect(nhisCaseType({
      attendanceType: 'emergency_acute',
      encounterCategory: 'ipd',
      admissionType: 'detention_observation',
      hasAdmission: true,
    })).toBe('zoom');
    expect(nhisCaseType({ attendanceType: 'delivery', encounterCategory: 'ipd', hasAdmission: true })).toBe('ipd');
  });

  /**
   * A pregnancy that was admitted is an obstetric inpatient case, whatever the desk labelled the
   * visit; reading the label first priced it as the bundled antenatal OPD code on an IPD header.
   */
  it('lets the bed decide before the visit label', () => {
    expect(nhisCaseType({ attendanceType: 'antenatal', encounterCategory: 'ipd', hasAdmission: true })).toBe('ipd');
    expect(nhisCaseType({ attendanceType: 'postnatal', encounterCategory: 'ipd', admissionType: 'emergency', hasAdmission: true })).toBe('ipd');
    expect(nhisCaseType({ attendanceType: 'antenatal', encounterCategory: 'daycase', hasAdmission: true })).toBe('zoom');
    expect(nhisCaseType({ attendanceType: 'postnatal', encounterCategory: 'opd' })).toBe('anc');
  });
});
