import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type NHISMedicineReference = {
  drugCode: string;
  name: string;
  unitPrice: number;
  sellingPrice: number;
  insurancePrice: number;
  isNHISCovered?: boolean;
  prescribingLevel?: string | null;
  prescribingLevelSource?: string | null;
  nhisRequiresAuth?: boolean | null;
  sourceVersion?: string;
  effectiveFrom?: string;
};

const medicines = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/data/nhismedicines.json'), 'utf8'),
) as NHISMedicineReference[];

const validPrescribingLevels = new Set(['A', 'M', 'B1', 'B2', 'C', 'D', 'SM']);

// Formulations still stocked but no longer on the NHIS list. They are cash items: an invented NHIS
// tariff on a retired code produces a claim NHIA will reject, so coverage and price stay off.
const retiredCodes = [
  'BENDROTA2', 'CETIRICA1', 'CHLORHMW1', 'DICLOFTA1', 'FLUTICGA1',
  'PHENYTCA1', 'SALBUTTA1', 'SALBUTTA2', 'TETRACEO1',
];

const official = medicines.filter((m) => !retiredCodes.includes(m.drugCode));
const retired = medicines.filter((m) => retiredCodes.includes(m.drugCode));

describe('NHIS 2025 medicine reference metadata', () => {
  it('retains all 551 medicine records with unique normalized codes', () => {
    expect(official).toHaveLength(551);
    const codes = medicines.map((medicine) => medicine.drugCode);
    expect(codes.every((code) => code === code.trim() && code.length > 0)).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('has a source-verified prescribing level for every 2025 formulation', () => {
    for (const medicine of official) {
      expect(medicine.prescribingLevel).toBeTruthy();
      expect(validPrescribingLevels.has(medicine.prescribingLevel!)).toBe(true);
      expect(medicine.prescribingLevelSource).toBe('WHO-hosted NHIA NHIS Medicines List 2025, Section 10');
      expect(medicine).toHaveProperty('nhisRequiresAuth', null);
      expect(medicine.sourceVersion).toBe('NHIS Medicines List 2025 Version 1.0');
      expect(medicine.effectiveFrom).toBe('2025-03-01');
    }
  });

  it('prices every 2025 formulation at the published NHIA tariff, with cash marked up from it', () => {
    for (const medicine of official) {
      // insurancePrice equals unitPrice on the published list; that value is the tariff.
      expect(medicine.insurancePrice).toBe(medicine.unitPrice);
      expect(medicine.sellingPrice).toBeCloseTo(medicine.unitPrice * 1.2, 2);
    }
  });

  it('includes prescribing levels verified against the 2025 list for known medicine codes', () => {
    const byCode = new Map(medicines.map((medicine) => [medicine.drugCode, medicine]));
    expect(byCode.get('ACETAZIN1')?.prescribingLevel).toBe('C');
    expect(byCode.get('ACETYLIN1')?.prescribingLevel).toBe('B1');
    expect(byCode.get('AMIODATA1')?.prescribingLevel).toBe('SM');
    expect(byCode.get('ARTLUMTA1')?.prescribingLevel).toBe('A');
    expect(byCode.get('ENOSODIN2')?.prescribingLevel).toBe('B2');
    expect(byCode.get('MICONAVP1')?.prescribingLevel).toBe('A');
    expect(byCode.get('SOOANAOI1')?.prescribingLevel).toBe('M');
  });
});

describe('Retired formulations kept as cash-only stock', () => {
  it('carries the nine retired codes and no NHIS coverage or tariff for them', () => {
    expect(retired).toHaveLength(retiredCodes.length);
    for (const medicine of retired) {
      expect(medicine.isNHISCovered).toBe(false);
      expect(medicine.insurancePrice).toBe(0);
      expect(medicine.unitPrice).toBeGreaterThan(0);
      expect(medicine.sourceVersion).toContain('retired before the 2025 list');
      expect(medicine.prescribingLevel === undefined || validPrescribingLevels.has(medicine.prescribingLevel)).toBe(true);
    }
  });

  it('does not reuse a code that the 2025 list already carries', () => {
    const officialCodes = new Set(official.map((medicine) => medicine.drugCode));
    for (const medicine of retired) {
      expect(officialCodes.has(medicine.drugCode)).toBe(false);
    }
  });
});
