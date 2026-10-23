import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type NHISMedicineReference = {
  drugCode: string;
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

describe('NHIS 2025 medicine reference metadata', () => {
  it('retains all 551 medicine records with unique normalized codes', () => {
    expect(medicines).toHaveLength(551);
    const codes = medicines.map((medicine) => medicine.drugCode);
    expect(codes.every((code) => code === code.trim() && code.length > 0)).toBe(true);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('has a source-verified prescribing level for every 2025 formulation', () => {
    for (const medicine of medicines) {
      expect(medicine.prescribingLevel).toBeTruthy();
      expect(validPrescribingLevels.has(medicine.prescribingLevel!)).toBe(true);
      expect(medicine.prescribingLevelSource).toBe('WHO-hosted NHIA NHIS Medicines List 2025, Section 10');
      expect(medicine).toHaveProperty('nhisRequiresAuth', null);
      expect(medicine.sourceVersion).toBe('NHIS Medicines List 2025 Version 1.0');
      expect(medicine.effectiveFrom).toBe('2025-03-01');
    }
  });

  it('includes prescribing levels verified against the 2025 list for known medicine codes', () => {
    const byCode = new Map(medicines.map((medicine) => [medicine.drugCode, medicine]));
    expect(byCode.get('ACETAZIN1')?.prescribingLevel).toBe('C');
    expect(byCode.get('ACETYLIN1')?.prescribingLevel).toBe('B1');
    expect(byCode.get('AMIODATA1')?.prescribingLevel).toBe('SM');
    expect(byCode.get('ARTLUMTA1')?.prescribingLevel).toBe('A');
  });
});
