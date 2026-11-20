import { describe, expect, it } from 'vitest';
import procedures from '../src/data/procedures.json';
import tariffData from '../src/data/gdrgTariffs.json';
import { MAPPINGS } from '../src/seed/procedureGdrgMappings';
import labTests from '../src/data/labTests.json';
import scans from '../src/data/scans.json';
import medications1 from '../src/data/medications1.json';
import medications2 from '../src/data/medications2.json';
import nhisMedicines from '../src/data/nhismedicines.json';
import consumables from '../src/data/consumables.json';

const procedureByCode = new Map(procedures.map((procedure) => [procedure.procedureCode, procedure]));
const tariffByCode = new Map(tariffData.gdrgTariffs.map((tariff) => [tariff.gdrgCode, tariff]));
const mappingByCode = new Map(MAPPINGS.map((mapping) => [mapping.procedureCode, mapping]));

describe('NHIS procedure catalogue coverage', () => {
  it('has a G-DRG mapping and matching tariff for every procedure template', () => {
    for (const procedure of procedures) {
      const mapping = mappingByCode.get(procedure.procedureCode);
      expect(mapping, `missing G-DRG mapping for ${procedure.procedureCode}`).toBeDefined();
      expect(mapping?.gdrgCodes).toContain(mapping?.isPrimaryGdrg);
      for (const gdrgCode of mapping?.gdrgCodes ?? []) {
        expect(tariffByCode.has(gdrgCode), `missing tariff ${gdrgCode} mapped from ${procedure.procedureCode}`).toBe(true);
      }
    }
  });

  it('includes dressing, minor suturing and all six ZOOM family-planning services', () => {
    const required = [
      'ZOOM05A', 'ZOOM05C', 'ZOOM07A', 'ZOOM07C',
      'ZOOM08A', 'ZOOM09A', 'ZOOM10A', 'ZOOM11A', 'ZOOM12A', 'ZOOM13A',
    ];
    for (const code of required) {
      expect(procedureByCode.has(code), `missing procedure template ${code}`).toBe(true);
      expect(tariffByCode.has(code), `missing G-DRG tariff ${code}`).toBe(true);
      expect(mappingByCode.get(code)?.gdrgCodes).toContain(code);
    }
  });

  it('includes the reconstructive suturing, ophthalmic and paediatric surgery procedures', () => {
    const required = [
      'RSUR01A', 'RSUR01C', 'RSUR03A', 'RSUR03C', 'RSUR04A', 'RSUR04C', 'RSUR15A', 'RSUR15C',
      'OPHT11A', 'OPHT11C', 'OPHT12A', 'OPHT12C', 'OPHT13A', 'OPHT13C',
      'OPHT14A', 'OPHT14C', 'OPHT15A', 'OPHT15C', 'OPHT16A', 'OPHT16C', 'OPHT17A',
      'PSUR26C', 'PSUR29C', 'PSUR30C', 'PSUR31C', 'PSUR32C', 'PSUR33C',
      'PSUR34C', 'PSUR35C', 'PSUR36C', 'PSUR37C', 'PSUR38C', 'PSUR39C',
    ];
    for (const code of required) {
      expect(procedureByCode.has(code), `missing procedure template ${code}`).toBe(true);
      expect(tariffByCode.has(code), `missing G-DRG tariff ${code}`).toBe(true);
      expect(mappingByCode.get(code)?.gdrgCodes).toContain(code);
    }
  });

  it('uses the canonical zero-padded RSUR codes instead of letter-O aliases', () => {
    expect(procedures.some((procedure) => procedure.procedureCode.includes('RSURO'))).toBe(false);
    expect(tariffData.gdrgTariffs.some((tariff) => tariff.gdrgCode.includes('RSURO'))).toBe(false);
    expect(MAPPINGS.some((mapping) => mapping.procedureCode.includes('RSURO'))).toBe(false);
  });
  it('has a verified NHIS investigation code on every lab and scan template', () => {
    for (const lab of labTests) {
      expect(lab.investigationCode, `missing NHIS code for lab ${lab.name}`).toMatch(/^INVE\d+[A-Z]$/);
    }
    for (const scan of scans) {
      expect(scan.investigationCode, `missing NHIS code for scan ${scan.name}`).toMatch(/^INVE\d+[A-Z]$/);
    }
  });

  it('gives every stocked medicine and consumable a single source code', () => {
    const stockRows = [...medications1, ...medications2, ...nhisMedicines, ...consumables];
    const byCode = new Map<string, any[]>();
    for (const item of stockRows) {
      expect(item.name, 'stock row has no name').toBeTruthy();
      expect(item.drugCode, `stock row has no code: ${item.name}`).toBeTruthy();
      const code = String(item.drugCode).trim().toUpperCase();
      byCode.set(code, [...(byCode.get(code) ?? []), item]);
    }
    for (const [code, rows] of byCode) {
      const identities = new Set(rows.map((item) => [
        String(item.name).trim().toLowerCase(),
        String(item.strength ?? 'N/A').trim().toLowerCase(),
        String(item.unitOfMeasure ?? 'units').trim().toLowerCase(),
      ].join('|')));
      expect(identities.size, `drug code ${code} is assigned to different products`).toBe(1);
    }
  });

});
