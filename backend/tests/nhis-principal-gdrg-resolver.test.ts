import { describe, expect, it } from 'vitest';
import { MAPPINGS as diagnosisGdrgMappings } from '../src/seed/diagnosisGdrgLink';
import { MAPPINGS as procedureGdrgMappings } from '../src/seed/procedureGdrgMappings';
import { resolveUniqueProcedureCatalogLinks } from '../src/seed/procedureGdrgLink';
import tariffData from '../src/data/gdrgTariffs.json';
import diagnosesCatalogue from '../src/data/diagnoses.json';
import {
  facilityLevelFromType,
  nhisCaseType,
  resolvePrincipalGdrg,
  type ResolverLink,
  type ResolverTariff,
} from '../src/modules/insuranceClaim/helpers/NHISPrincipalGdrgResolver';

const tariffDataByCode = new Map(tariffData.gdrgTariffs.map((entry) => [entry.gdrgCode, entry]));

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
  isSurgical: tariffDataByCode.get(gdrgCode)?.isSurgical ?? false,
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

  it('lets a performed inpatient operation outrank a primary diagnosis even when the attendance label is not surgery', () => {
    const resolved = resolvePrincipalGdrg({
      caseType: 'ipd',
      age: 45,
      facilityLevel: 2,
      isSurgicalCase: false,
      links: [
        row('MEDI31A', true),
        { ...row('ASUR03A', false, 'procedure'), tariff: tariff('ASUR03A', { isSurgical: true }) },
      ],
      fallbacks: OPDC06,
    });
    expect(resolved.tariff.gdrgCode).toBe('ASUR03A');
    expect(resolved.origin).toBe('procedure');
  });

  it('does not select a surgical G-DRG from a diagnosis link unless the procedure was performed', () => {
    expect(() => resolvePrincipalGdrg({
      caseType: 'ipd',
      age: 45,
      facilityLevel: 2,
      links: [{
        ...row('ASUR01A', true, 'diagnosis'),
        tariff: tariff('ASUR01A', { isSurgical: true }),
      }],
      fallbacks: [],
    })).toThrow(/needs a principal G-DRG/);
  });

  it('keeps non-surgical conservative-management tariffs eligible from diagnosis links', () => {
    const resolved = resolvePrincipalGdrg({
      caseType: 'ipd',
      age: 45,
      facilityLevel: 2,
      links: [{
        ...row('ASUR34A', true, 'diagnosis'),
        tariff: tariff('ASUR34A', { isSurgical: false }),
      }],
      fallbacks: [],
    });
    expect(resolved.tariff.gdrgCode).toBe('ASUR34A');
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

  it('bills OPD dressing and minor suturing through their ZOOM procedure tariffs', () => {
    const dressing = resolvePrincipalGdrg({
      caseType: 'opd',
      age: 34,
      facilityLevel: 2,
      links: [row('OPDC06A', true), row('ZOOM05A', true, 'procedure')],
      fallbacks: OPDC06,
    });
    expect(dressing.tariff.gdrgCode).toBe('ZOOM05A');
    expect(dressing.origin).toBe('procedure');

    const suturing = resolvePrincipalGdrg({
      caseType: 'opd',
      age: 34,
      facilityLevel: 2,
      links: [row('OPDC06A', true), row('ZOOM07A', true, 'procedure')],
      fallbacks: OPDC06,
    });
    expect(suturing.tariff.gdrgCode).toBe('ZOOM07A');
    expect(suturing.origin).toBe('procedure');
  });

  it('bills an OPD family-planning tubal-ligation procedure under its ZOOM tariff', () => {
    const resolved = resolvePrincipalGdrg({
      caseType: 'opd',
      age: 30,
      facilityLevel: 2,
      links: [row('OPDC06A', true), row('ZOOM08A', true, 'procedure')],
      fallbacks: OPDC06,
    });
    expect(resolved.tariff.gdrgCode).toBe('ZOOM08A');
    expect(resolved.origin).toBe('procedure');
  });

  it('does not let diagnosis-only ZOOM links replace the ordinary OPDC attendance tariff', () => {
    const resolved = resolvePrincipalGdrg({
      caseType: 'opd',
      age: 34,
      facilityLevel: 2,
      links: [row('ZOOM05A', true), row('OPDC06A')],
      fallbacks: OPDC06,
    });
    expect(resolved.tariff.gdrgCode).toBe('OPDC06A');
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

  it('does not allow a level-restricted tariff when the facility level is unknown', () => {
    const restricted = row('ASUR02A', true);
    restricted.tariff = tariff('ASUR02A', { applicableLevels: [1, 2] });
    expect(() => resolvePrincipalGdrg({
      caseType: 'ipd',
      age: 33,
      facilityLevel: null,
      links: [restricted],
      fallbacks: [],
    })).toThrow(/facility NHIS level is not configured or could not be determined/i);
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

  it('prioritizes a performed surgical procedure even when its link is not primary', () => {
    const resolved = resolvePrincipalGdrg({
      caseType: 'ipd',
      age: 45,
      facilityLevel: 2,
      isSurgicalCase: true,
      links: [row('MEDI31A', true), row('ASUR01A', false, 'procedure')],
      fallbacks: OPDC06,
    });
    expect(resolved.tariff.gdrgCode).toBe('ASUR01A');
    expect(resolved.origin).toBe('procedure');
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


describe('NHIS diagnosis/procedure G-DRG mapping integrity', () => {
  const tariffCodes = new Set(tariffData.gdrgTariffs.map((entry) => entry.gdrgCode));

  it('keeps every mapped diagnosis G-DRG in the facility tariff dataset and its primary in its mapping', () => {
    for (const mapping of diagnosisGdrgMappings) {
      expect(mapping.gdrgCodes.length, `ICD ${mapping.icdCode} has no G-DRG links`).toBeGreaterThan(0);
      expect(mapping.gdrgCodes, `ICD ${mapping.icdCode} primary is not one of its links`).toContain(mapping.isPrimaryGdrg);
      for (const code of mapping.gdrgCodes) {
        expect(tariffCodes.has(code), `ICD ${mapping.icdCode} links missing tariff ${code}`).toBe(true);
      }
    }
  });

  it('keeps every mapped procedure G-DRG in the facility tariff dataset and its primary in its mapping', () => {
    for (const mapping of procedureGdrgMappings) {
      expect(mapping.gdrgCodes.length, `Procedure ${mapping.procedureCode} has no G-DRG links`).toBeGreaterThan(0);
      expect(mapping.gdrgCodes, `Procedure ${mapping.procedureCode} primary is not one of its links`).toContain(mapping.isPrimaryGdrg);
      for (const code of mapping.gdrgCodes) {
        expect(tariffCodes.has(code), `Procedure ${mapping.procedureCode} links missing tariff ${code}`).toBe(true);
      }
    }
  });


  it('covers every diagnosis catalogue code with a G-DRG mapping and has no obsolete mapping keys', () => {
    const mappedCodes = new Set(diagnosisGdrgMappings.map((mapping) => mapping.icdCode));
    // R99 (brought in dead) is intentionally excluded from claim-driving G-DRG diagnosis mapping.
    const nonClaimDiagnosisCodes = new Set(['R99']);
    const catalogueCodes = new Set(diagnosesCatalogue.map((diagnosis) => diagnosis.icdCode));
    const unmapped = diagnosesCatalogue.map((diagnosis) => diagnosis.icdCode)
      .filter((code) => !mappedCodes.has(code) && !nonClaimDiagnosisCodes.has(code));
    const obsolete = diagnosisGdrgMappings.map((mapping) => mapping.icdCode).filter((code) => !catalogueCodes.has(code));
    expect(unmapped, 'Diagnosis catalogue codes missing G-DRG links').toEqual([]);
    expect(obsolete, 'Mappings for diagnosis codes absent from catalogue').toEqual([]);
  });

  it('keeps provisional diagnosis links out of automatic tariff seeding until Annex C verification', () => {
    const provisional = diagnosisGdrgMappings.filter((mapping) => mapping.status === 'provisional');
    expect(provisional.length).toBeGreaterThan(0);
    expect(provisional.every((mapping) => Boolean(mapping.notes))).toBe(true);
  });

  it('keeps a tariff-review queue without treating catalogue gaps as absent NHIA G-DRGs', () => {
    // A diagnosis absent from our direct ICD mapping may still be included in a
    // broader NHIA G-DRG group. Annex C must be checked before declaring it uncovered.
    const reviewCodes = [
      'A20.9', 'A21.9', 'A22.9', 'A23.9', 'A38.9', 'B06.9', 'B27.9', 'A66.9',
      'H33.2', 'H00.1', 'J30.9', 'J91.8', 'J93.1', 'J96.9', 'K21.9', 'K21.0',
      'K29.00', 'K29.50', 'Z86.19', 'Z86.11', 'Z79.01', 'R99',
    ];
    const catalogueCodes = new Set(diagnosesCatalogue.map((diagnosis) => diagnosis.icdCode));
    for (const code of reviewCodes) expect(catalogueCodes.has(code), `Review ICD ${code} exists in catalogue`).toBe(true);
  });

  it('keeps NHIA thoracostomy/chest tube G-DRGs linked for adult and paediatric procedure codes', () => {
    expect(procedureGdrgMappings.find((mapping) => mapping.procedureCode === 'ASUR03A')?.gdrgCodes).toContain('ASUR03A');
    expect(procedureGdrgMappings.find((mapping) => mapping.procedureCode === 'PSUR34C')?.gdrgCodes).toContain('PSUR34C');
    expect(tariffCodes.has('ASUR03A')).toBe(true);
    expect(tariffCodes.has('PSUR34C')).toBe(true);
  });

  it('does not contain duplicate diagnosis or procedure mapping keys', () => {
    const diagnosisCodes = diagnosisGdrgMappings.map((mapping) => mapping.icdCode);
    const procedureCodes = procedureGdrgMappings.map((mapping) => mapping.procedureCode);
    expect(new Set(diagnosisCodes).size).toBe(diagnosisCodes.length);
    expect(new Set(procedureCodes).size).toBe(procedureCodes.length);
  });

  it('maps J90 to the Annex C thoracostomy groups and requires the completed procedure', () => {
    const mapping = diagnosisGdrgMappings.find((entry) => entry.icdCode === 'J90');
    expect(mapping?.status).toBe('verified');
    expect(mapping?.gdrgCodes).toEqual(['ASUR03A', 'PSUR34C']);

    const diagnosisLinks = (mapping?.gdrgCodes ?? []).map((code) => row(code, true, 'diagnosis'));
    expect(() => resolvePrincipalGdrg({
      caseType: 'ipd',
      age: 34,
      facilityLevel: 2,
      links: diagnosisLinks,
      fallbacks: [],
    })).toThrow(/needs a principal G-DRG/);

    const adult = resolvePrincipalGdrg({
      caseType: 'ipd',
      age: 34,
      facilityLevel: 2,
      links: [...diagnosisLinks, row('ASUR03A', false, 'procedure')],
      fallbacks: [],
    });
    expect(adult.tariff.gdrgCode).toBe('ASUR03A');
    expect(adult.origin).toBe('procedure');

    const child = resolvePrincipalGdrg({
      caseType: 'ipd',
      age: 8,
      facilityLevel: 2,
      links: [...diagnosisLinks, row('PSUR34C', false, 'procedure')],
      fallbacks: [],
    });
    expect(child.tariff.gdrgCode).toBe('PSUR34C');
    expect(child.origin).toBe('procedure');
  });

  it('keeps the Annex C-confirmed diagnosis mappings exact and marked verified', () => {
    const byIcd = new Map(diagnosisGdrgMappings.map((mapping) => [mapping.icdCode, mapping]));
    const expected: Record<string, string[]> = {
      'A04.7': ['MEDI23A', 'PAED31C', 'OPDC06A', 'OPDC06C'],
      'A66.9': ['PAED43C'],
      'E88.9': ['PAED07C'],
      'K52.9': ['MEDI26A', 'OPDC06A', 'OPDC06C'],
      'I49.9': ['MEDI07A', 'OPDC06A', 'OPDC06C'],
      'K30': ['MEDI26A', 'OPDC06A', 'OPDC06C'],
      'K62.5': ['MEDI25A', 'OPDC06A', 'OPDC06C'],
      'K70.10': ['MEDI24A', 'OPDC06A', 'OPDC06C'],
      'J90': ['ASUR03A', 'PSUR34C'],
      'L23.9': ['MEDI31A', 'PAED26C', 'OPDC06A', 'OPDC06C'],
      'L30.9': ['MEDI18A', 'PAED26C', 'OPDC06A', 'OPDC06C'],
      'M25.50': ['MEDI30A', 'PAED38C', 'OPDC06A', 'OPDC06C'],
      'M25.60': ['MEDI30A', 'PAED38C', 'OPDC06A', 'OPDC06C'],
      'M25.40': ['MEDI30A', 'PAED38C', 'OPDC06A', 'OPDC06C'],
      'R10.84': ['MEDI26A', 'PAED34C', 'OPDC06A', 'OPDC06C'],
      'S00.90XA': ['ORTH24A', 'ORTH24C', 'OPDC06A', 'OPDC06C'],
      'D57.00': ['MEDI16A', 'PAED24C'],
      'D57.01': ['MEDI16A', 'PAED24C'],
      'N72': ['OBGY09A', 'OPDC08A'],
      'N95.1': ['OBGY09A', 'OPDC08A'],
      'O12.1': ['OBGY09A', 'OPDC02A'],
      'O13.9': ['OBGY09A', 'OPDC02A'],
      'O24.419': ['OBGY09A', 'OPDC02A'],
      'O30.003': ['OBGY09A', 'OPDC02A'],
    };
    for (const [icdCode, codes] of Object.entries(expected)) {
      const mapping = byIcd.get(icdCode);
      expect(mapping, `Missing verified mapping for ${icdCode}`).toBeDefined();
      expect(mapping?.status, `${icdCode} verification status`).toBe('verified');
      expect(mapping?.gdrgCodes, `${icdCode} Annex C links`).toEqual(codes);
    }
  });

});
