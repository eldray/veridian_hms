/**
 * seed_diagnosis_gdrg_links.ts
 *
 * Matches every diagnosis in the diagnoses seed data to its correct GDRG(s)
 * following the NHIA Tariffs Operation Manual 2022 rules:
 *
 * MATCHING LOGIC (from Manual Sections 7.3–7.5 and Annex C):
 * ─────────────────────────────────────────────────────────────
 * 1. Age split: codes ending 'A' = adults (≥12 yrs), 'C' = children (<12 yrs).
 *    One GDRGTariffDiagnosis row is created per age group that applies.
 *    For most medical conditions BOTH rows are created (adult MEDI + child PAED).
 *
 * 2. MDC assignment by primary diagnosis category:
 *    • Surgical/procedural → ASUR (adult) / PSUR (child)
 *    • Medical conditions  → MEDI (adult) / PAED (child)
 *    • OB/GYN             → OBGY
 *    • Dental              → DENT
 *    • ENT                 → ENTH
 *    • Eye                 → OPHT
 *    • Orthopaedics/trauma → ORTH
 *    • Reconstructive      → RSUR
 *    • OPD consultation    → OPDC (general OPD is always the fallback)
 *
 * 3. isPrimary = true marks the SINGLE most common / clinically obvious GDRG
 *    for that diagnosis — used for auto-resolution tie-breaking in GDRGResolver.
 *
 * 4. For diagnoses that are BOTH OPD (OPDC) AND inpatient (MEDI/PAED), we link
 *    both so the resolver can pick based on encounterCategory.
 *
 * HOW TO RUN:
 *   npx ts-node seed_diagnosis_gdrg_links.ts
 * 
 *   npx ts-node src/seed/seed_diagnosis_gdrg_links.ts 
 * 
 *   OR compile and run with your existing seed runner.
 *
 * PREREQUISITES: All Diagnosis and GDRGTariff rows must already exist in the DB.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// TYPE: one mapping record
// ─────────────────────────────────────────────────────────────────────────────
interface DiagnosisGDRGMapping {
  icdCode: string;          // must match Diagnosis.icdCode exactly
  gdrgCodes: string[];      // all applicable GDRG codes from the tariff manual
  isPrimaryGdrg: string;    // the single best GDRG (auto-resolve tie-break)
  mappedIcdCode?: string;   // override if annex C lists a slightly different ICD
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER MAPPING TABLE
// Derived from NHIA Tariffs Manual 2022 Annex C, Sections 7–9, and the
// clinical grouping rules described in the manual.
//
// Convention for gdrgCodes arrays:
//   [adult GDRG, child GDRG, optional OPD code]
//   OPDC06A/OPDC06C = General OPD (always applicable as fallback)
// ─────────────────────────────────────────────────────────────────────────────
const MAPPINGS: DiagnosisGDRGMapping[] = [

  // ══════════════════════════════════════════════════════════════
  // SECTION 1: COMMUNICABLE — IMMUNIZABLE
  // ══════════════════════════════════════════════════════════════

  // AFP / Polio → MEDI12A (seizure/paralytic) adult; PAED20C child
  // OPD → OPDC06A/C
  { icdCode: 'A80.9',   gdrgCodes: ['MEDI12A','PAED20C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI12A' },

  // Meningitis → MEDI30A (systemic infections) adult; PAED38C child
  { icdCode: 'A39.0',   gdrgCodes: ['MEDI30A','PAED38C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI30A' },
  { icdCode: 'A39.4',   gdrgCodes: ['MEDI30A','PAED38C'], isPrimaryGdrg: 'MEDI30A' },
  { icdCode: 'G00.9',   gdrgCodes: ['MEDI30A','PAED38C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI30A' },
  { icdCode: 'G00.1',   gdrgCodes: ['MEDI30A','PAED38C'], isPrimaryGdrg: 'MEDI30A' },
  { icdCode: 'G00.2',   gdrgCodes: ['MEDI30A','PAED38C'], isPrimaryGdrg: 'MEDI30A' },
  { icdCode: 'G00.3',   gdrgCodes: ['MEDI30A','PAED38C'], isPrimaryGdrg: 'MEDI30A' },
  { icdCode: 'G03.9',   gdrgCodes: ['MEDI30A','PAED38C'], isPrimaryGdrg: 'MEDI30A' },
  { icdCode: 'A87.9',   gdrgCodes: ['MEDI30A','PAED38C'], isPrimaryGdrg: 'MEDI30A' },
  { icdCode: 'A17.0',   gdrgCodes: ['MEDI30A','PAED38C'], isPrimaryGdrg: 'MEDI30A' },

  // Neonatal tetanus → PAED07C (other neonatal diseases)
  { icdCode: 'A33',     gdrgCodes: ['PAED07C'], isPrimaryGdrg: 'PAED07C' },

  // Pertussis → MEDI31A (localised infections) adult; PAED39C child
  { icdCode: 'A37.0',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'A37.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI31A' },

  // Diphtheria → MEDI31A adult; PAED39C child
  { icdCode: 'A36.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI31A' },

  // Measles → MEDI31A adult; PAED39C child
  { icdCode: 'B05.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI31A' },

  // Yellow fever → MEDI30A adult; PAED38C child
  { icdCode: 'A95.9',   gdrgCodes: ['MEDI30A','PAED38C'], isPrimaryGdrg: 'MEDI30A' },

  // Tetanus → MEDI30A (systemic infections, as per manual section 4.1)
  { icdCode: 'A35',     gdrgCodes: ['MEDI30A','PAED38C'], isPrimaryGdrg: 'MEDI30A' },

  // Tuberculosis → MEDI31A adult; PAED39C child (per manual: pneumonia/TB = localised infection)
  { icdCode: 'A15.0',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'A15.1',   gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'A15.2',   gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'A15.3',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'A15.6',   gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'A16.2',   gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'A19.9',   gdrgCodes: ['MEDI30A','PAED38C'], isPrimaryGdrg: 'MEDI30A' },

  // ══════════════════════════════════════════════════════════════
  // SECTION 2: COMMUNICABLE — NON-IMMUNIZABLE
  // ══════════════════════════════════════════════════════════════

  // Malaria: per manual section 7.9 — MEDI28A adult, PAED36C child, OPDC06 OPD
  { icdCode: 'B50.8',   gdrgCodes: ['MEDI28A','PAED36C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI28A' },
  { icdCode: 'B51.9',   gdrgCodes: ['MEDI28A','PAED36C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI28A' },
  { icdCode: 'B52.9',   gdrgCodes: ['MEDI28A','PAED36C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI28A' },
  { icdCode: 'B54',     gdrgCodes: ['MEDI28A','PAED36C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI28A' },

  // Severe / cerebral malaria → MEDI41A adult; PAED46C child
  { icdCode: 'B50.0',   gdrgCodes: ['MEDI41A','PAED46C'], isPrimaryGdrg: 'MEDI41A' },

  // Typhoid / Paratyphoid → MEDI31A adult; PAED39C child
  { icdCode: 'A01.0',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'A01.1',   gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'A01.2',   gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'A01.3',   gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },

  // Cholera → MEDI23A (diarrhoea/vomiting) adult; PAED31C child
  { icdCode: 'A00.9',   gdrgCodes: ['MEDI23A','PAED31C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI23A' },

  // Diarrhoeal diseases → MEDI23A adult; PAED31C child
  { icdCode: 'A03.0',   gdrgCodes: ['MEDI23A','PAED31C'], isPrimaryGdrg: 'MEDI23A' },
  { icdCode: 'A03.1',   gdrgCodes: ['MEDI23A','PAED31C'], isPrimaryGdrg: 'MEDI23A' },
  { icdCode: 'A03.2',   gdrgCodes: ['MEDI23A','PAED31C'], isPrimaryGdrg: 'MEDI23A' },
  { icdCode: 'A03.3',   gdrgCodes: ['MEDI23A','PAED31C'], isPrimaryGdrg: 'MEDI23A' },
  { icdCode: 'A03.8',   gdrgCodes: ['MEDI23A','PAED31C'], isPrimaryGdrg: 'MEDI23A' },
  { icdCode: 'A03.9',   gdrgCodes: ['MEDI23A','PAED31C'], isPrimaryGdrg: 'MEDI23A' },
  { icdCode: 'A04.5',   gdrgCodes: ['MEDI23A','PAED31C'], isPrimaryGdrg: 'MEDI23A' },
  { icdCode: 'A06.0',   gdrgCodes: ['MEDI23A','PAED31C'], isPrimaryGdrg: 'MEDI23A' },
  { icdCode: 'A06.1',   gdrgCodes: ['MEDI23A','PAED31C'], isPrimaryGdrg: 'MEDI23A' },
  { icdCode: 'A06.4',   gdrgCodes: ['MEDI24A','PAED32C'], isPrimaryGdrg: 'MEDI24A', notes: 'Liver abscess → liver diseases' },
  { icdCode: 'A07.1',   gdrgCodes: ['MEDI23A','PAED31C'], isPrimaryGdrg: 'MEDI23A' },
  { icdCode: 'A07.2',   gdrgCodes: ['MEDI23A','PAED31C'], isPrimaryGdrg: 'MEDI23A' },
  { icdCode: 'A08.4',   gdrgCodes: ['MEDI23A','PAED31C'], isPrimaryGdrg: 'MEDI23A' },
  { icdCode: 'A09',     gdrgCodes: ['MEDI23A','PAED31C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI23A' },

  // Viral hepatitis → MEDI24A (liver diseases) adult; PAED32C child
  { icdCode: 'B15.9',   gdrgCodes: ['MEDI24A','PAED32C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI24A' },
  { icdCode: 'B16.9',   gdrgCodes: ['MEDI24A','PAED32C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI24A' },
  { icdCode: 'B18.1',   gdrgCodes: ['MEDI24A','PAED32C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI24A' },
  { icdCode: 'B18.2',   gdrgCodes: ['MEDI24A','PAED32C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI24A' },
  { icdCode: 'Z22.5',   gdrgCodes: ['MEDI24A','PAED32C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI24A' },

  // Schistosomiasis → MEDI31A localised; PAED39C
  { icdCode: 'B65.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI31A' },

  // Guinea worm → MEDI31A; PAED39C
  { icdCode: 'B72',     gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },

  // Onchocerciasis / filariasis → MEDI31A; PAED39C
  { icdCode: 'B73.0',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'B74.9',   gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },

  // Buruli ulcer → MEDI35A (ulcer of skin) adult; PAED43C child
  { icdCode: 'A31.1',   gdrgCodes: ['MEDI35A','PAED43C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI35A' },

  // Leprosy → MEDI31A; PAED39C
  { icdCode: 'A30.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI31A' },

  // HIV/AIDS → MEDI38A (retroviral / immunosuppression) adult; PAED45C child
  { icdCode: 'B24',     gdrgCodes: ['MEDI38A','PAED45C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI38A' },
  { icdCode: 'B20.0',   gdrgCodes: ['MEDI38A','PAED45C'], isPrimaryGdrg: 'MEDI38A' },
  { icdCode: 'Z21',     gdrgCodes: ['MEDI38A','PAED45C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI38A' },

  // Mumps → MEDI31A; PAED39C
  { icdCode: 'B26.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI31A' },

  // Intestinal worms → MEDI31A; PAED39C
  { icdCode: 'B76.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'B77.9',   gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'B79',     gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },

  // Chickenpox → MEDI31A; PAED39C
  { icdCode: 'B01.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI31A' },

  // URTI → MEDI31A (localised infections, per manual pneumonia/URTI rule); PAED39C
  { icdCode: 'J06.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A', notes: 'OPD is primary for simple URTI' },
  { icdCode: 'J00',     gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'J01.90',  gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'J32.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'J02.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'J02.0',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'J03.90',  gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'J04.0',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'J20.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },

  // Pneumonia → MEDI31A (per manual: pneumonia billed under localised infection); PAED39C
  { icdCode: 'J18.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'J18.1',   gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'J18.0',   gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'J13',     gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'J21.9',   gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'PAED39C', notes: 'Bronchiolitis mainly paediatric' },

  // Septicaemia → MEDI30A (systemic infections); PAED38C
  { icdCode: 'A40.9',   gdrgCodes: ['MEDI30A','PAED38C'], isPrimaryGdrg: 'MEDI30A' },
  { icdCode: 'A41.0',   gdrgCodes: ['MEDI30A','PAED38C'], isPrimaryGdrg: 'MEDI30A' },
  { icdCode: 'A41.9',   gdrgCodes: ['MEDI30A','PAED38C'], isPrimaryGdrg: 'MEDI30A' },

  // ══════════════════════════════════════════════════════════════
  // SECTION 3: NON-COMMUNICABLE
  // ══════════════════════════════════════════════════════════════

  // Malnutrition → MEDI05A adult; PAED05C child
  { icdCode: 'E43',     gdrgCodes: ['MEDI05A','PAED05C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI05A' },
  { icdCode: 'E44.0',   gdrgCodes: ['MEDI05A','PAED05C'], isPrimaryGdrg: 'MEDI05A' },
  { icdCode: 'E44.1',   gdrgCodes: ['MEDI05A','PAED05C'], isPrimaryGdrg: 'MEDI05A' },
  { icdCode: 'E46',     gdrgCodes: ['MEDI05A','PAED05C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI05A' },
  { icdCode: 'E64.0',   gdrgCodes: ['MEDI05A','PAED05C'], isPrimaryGdrg: 'MEDI05A' },

  // Obesity → MEDI04A (other endocrine); PAED04C
  { icdCode: 'E66.9',   gdrgCodes: ['MEDI04A','PAED04C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI04A' },
  { icdCode: 'E66.3',   gdrgCodes: ['MEDI04A','PAED04C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI04A' },
  { icdCode: 'E66.01',  gdrgCodes: ['MEDI04A','PAED04C'], isPrimaryGdrg: 'MEDI04A' },

  // Anaemia → MEDI06A adult; PAED06C child
  { icdCode: 'D50.9',   gdrgCodes: ['MEDI06A','PAED06C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI06A' },
  { icdCode: 'D51.9',   gdrgCodes: ['MEDI06A','PAED06C'], isPrimaryGdrg: 'MEDI06A' },
  { icdCode: 'D52.9',   gdrgCodes: ['MEDI06A','PAED06C'], isPrimaryGdrg: 'MEDI06A' },

  // Other nutritional diseases → MEDI04A (other endocrine/nutritional); PAED04C
  { icdCode: 'E01.8',   gdrgCodes: ['MEDI04A','PAED04C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI04A' },
  { icdCode: 'E02',     gdrgCodes: ['MEDI04A','PAED04C'], isPrimaryGdrg: 'MEDI04A' },
  { icdCode: 'E50.9',   gdrgCodes: ['MEDI04A','PAED04C'], isPrimaryGdrg: 'MEDI04A' },
  { icdCode: 'E55.9',   gdrgCodes: ['MEDI04A','PAED04C'], isPrimaryGdrg: 'MEDI04A' },
  { icdCode: 'E54',     gdrgCodes: ['MEDI04A','PAED04C'], isPrimaryGdrg: 'MEDI04A' },
  { icdCode: 'E52',     gdrgCodes: ['MEDI04A','PAED04C'], isPrimaryGdrg: 'MEDI04A' },

  // Hypertension → MEDI32A adult; PAED40C child
  { icdCode: 'I10',     gdrgCodes: ['MEDI32A','PAED40C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI32A' },
  { icdCode: 'I11.9',   gdrgCodes: ['MEDI32A','PAED40C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI32A' },
  { icdCode: 'I12.9',   gdrgCodes: ['MEDI32A','PAED40C'], isPrimaryGdrg: 'MEDI32A' },

  // Cardiac diseases → MEDI07A adult; PAED15C child
  { icdCode: 'I20.9',   gdrgCodes: ['MEDI07A','PAED15C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI07A' },
  { icdCode: 'I20.8',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'MEDI07A' },
  { icdCode: 'I20.0',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'MEDI07A' },
  { icdCode: 'I21.9',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'MEDI07A' },
  { icdCode: 'I21.0',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'MEDI07A' },
  { icdCode: 'I21.4',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'MEDI07A' },
  { icdCode: 'I25.9',   gdrgCodes: ['MEDI33A','PAED41C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI33A', notes: 'Ischaemic heart disease' },
  { icdCode: 'I50.9',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'MEDI07A' },
  { icdCode: 'I50.1',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'MEDI07A' },
  { icdCode: 'I48.91',  gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'MEDI07A' },
  { icdCode: 'I48.0',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'MEDI07A' },
  { icdCode: 'I48.2',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'MEDI07A' },
  { icdCode: 'I46.9',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'MEDI07A' },
  { icdCode: 'I42.9',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'MEDI07A' },
  { icdCode: 'I09.9',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'MEDI07A' },
  { icdCode: 'R07.9',   gdrgCodes: ['MEDI07A','PAED15C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  // Congenital heart disease
  { icdCode: 'Q24.9',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'PAED15C' },
  { icdCode: 'Q21.0',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'PAED15C' },
  { icdCode: 'Q21.1',   gdrgCodes: ['MEDI07A','PAED15C'], isPrimaryGdrg: 'PAED15C' },

  // Stroke → MEDI14A adult; PAED22C child
  { icdCode: 'I64',     gdrgCodes: ['MEDI14A','PAED22C'], isPrimaryGdrg: 'MEDI14A' },

  // Diabetes — simple → MEDI02A; PAED02C
  { icdCode: 'E10.9',   gdrgCodes: ['MEDI02A','PAED02C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI02A' },
  { icdCode: 'E11.9',   gdrgCodes: ['MEDI02A','PAED02C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI02A' },
  { icdCode: 'Z79.4',   gdrgCodes: ['MEDI02A','PAED02C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI02A' },
  { icdCode: 'Z79.84',  gdrgCodes: ['MEDI02A','PAED02C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI02A' },
  // Diabetes — complicated → MEDI03A; PAED03C
  { icdCode: 'E10.319', gdrgCodes: ['MEDI03A','PAED03C'], isPrimaryGdrg: 'MEDI03A' },
  { icdCode: 'E10.40',  gdrgCodes: ['MEDI03A','PAED03C'], isPrimaryGdrg: 'MEDI03A' },
  { icdCode: 'E10.621', gdrgCodes: ['MEDI03A','PAED03C'], isPrimaryGdrg: 'MEDI03A' },
  { icdCode: 'E10.10',  gdrgCodes: ['MEDI03A','PAED03C'], isPrimaryGdrg: 'MEDI03A' },
  { icdCode: 'E10.22',  gdrgCodes: ['MEDI03A','PAED03C'], isPrimaryGdrg: 'MEDI03A' },
  { icdCode: 'E11.319', gdrgCodes: ['MEDI03A','PAED03C'], isPrimaryGdrg: 'MEDI03A' },
  { icdCode: 'E11.40',  gdrgCodes: ['MEDI03A','PAED03C'], isPrimaryGdrg: 'MEDI03A' },
  { icdCode: 'E11.621', gdrgCodes: ['MEDI03A','PAED03C'], isPrimaryGdrg: 'MEDI03A' },
  { icdCode: 'E11.65',  gdrgCodes: ['MEDI03A','PAED03C'], isPrimaryGdrg: 'MEDI03A' },
  { icdCode: 'E11.10',  gdrgCodes: ['MEDI03A','PAED03C'], isPrimaryGdrg: 'MEDI03A' },
  { icdCode: 'E11.22',  gdrgCodes: ['MEDI03A','PAED03C'], isPrimaryGdrg: 'MEDI03A' },
  { icdCode: 'E11.69',  gdrgCodes: ['MEDI03A','PAED03C'], isPrimaryGdrg: 'MEDI03A' },

  // Rheumatism / arthritis → OPDC06A/C OPD; MEDI for admitted
  { icdCode: 'M06.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M05.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M19.90',  gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M17.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M16.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M10.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M1A.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },

  // Sickle cell disease → MEDI16A adult; PAED24C child
  { icdCode: 'D57.3',   gdrgCodes: ['MEDI16A','PAED24C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI16A' },

  // Asthma → MEDI22A (obstructive airway) adult; PAED30C child
  { icdCode: 'J45.909', gdrgCodes: ['MEDI22A','PAED30C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI22A' },
  { icdCode: 'J45.20',  gdrgCodes: ['MEDI22A','PAED30C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'J45.40',  gdrgCodes: ['MEDI22A','PAED30C'], isPrimaryGdrg: 'MEDI22A' },
  { icdCode: 'J45.50',  gdrgCodes: ['MEDI22A','PAED30C'], isPrimaryGdrg: 'MEDI22A' },
  { icdCode: 'J45.901', gdrgCodes: ['MEDI22A','PAED30C'], isPrimaryGdrg: 'MEDI22A' },

  // COPD → MEDI22A; PAED30C
  { icdCode: 'J44.9',   gdrgCodes: ['MEDI22A','PAED30C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI22A' },
  { icdCode: 'J44.1',   gdrgCodes: ['MEDI22A','PAED30C'], isPrimaryGdrg: 'MEDI22A' },
  { icdCode: 'J43.9',   gdrgCodes: ['MEDI22A','PAED30C'], isPrimaryGdrg: 'MEDI22A' },
  { icdCode: 'J42',     gdrgCodes: ['MEDI22A','PAED30C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI22A' },

  // Cancers
  // Breast → MEDI39A (chemo) or ASUR23A (mastectomy); OPD OPDC06A
  { icdCode: 'C50.919', gdrgCodes: ['ASUR23A','MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  // Cervical → MEDI39A / MEDI40A; OBGY39A (Wertheim's)
  { icdCode: 'C53.9',   gdrgCodes: ['OBGY39A','MEDI39A','MEDI40A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  // Lymphoma → MEDI39A; PAED47C/PAED51C
  { icdCode: 'C81.9',   gdrgCodes: ['MEDI39A','PAED51C','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C85.90',  gdrgCodes: ['MEDI39A','PAED47C','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C83.7',   gdrgCodes: ['PAED51C','MEDI39A'], isPrimaryGdrg: 'PAED51C' },
  // Prostate
  { icdCode: 'C61',     gdrgCodes: ['MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  // HCC / liver cancer
  { icdCode: 'C22.0',   gdrgCodes: ['MEDI24A','MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI24A' },
  { icdCode: 'C22.9',   gdrgCodes: ['MEDI24A','MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI24A' },
  // All other cancers → MEDI39A
  { icdCode: 'C00.9',   gdrgCodes: ['MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C02.9',   gdrgCodes: ['MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C06.9',   gdrgCodes: ['MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C15.9',   gdrgCodes: ['MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C16.9',   gdrgCodes: ['MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C18.9',   gdrgCodes: ['MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C20',     gdrgCodes: ['MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C25.9',   gdrgCodes: ['MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C32.9',   gdrgCodes: ['MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C34.90',  gdrgCodes: ['MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C56',     gdrgCodes: ['MEDI39A','OBGY20A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C67.9',   gdrgCodes: ['MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C64.9',   gdrgCodes: ['MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C43.9',   gdrgCodes: ['MEDI18A','MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI18A' },
  { icdCode: 'C44.9',   gdrgCodes: ['MEDI18A','MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI18A' },
  { icdCode: 'C73',     gdrgCodes: ['MEDI39A','ASUR01A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C91.00',  gdrgCodes: ['PAED49C','MEDI39A'], isPrimaryGdrg: 'PAED49C' },
  { icdCode: 'C92.00',  gdrgCodes: ['MEDI39A','PAED47C'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C91.10',  gdrgCodes: ['MEDI39A','PAED47C'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C92.10',  gdrgCodes: ['MEDI39A','PAED47C'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C90.0',   gdrgCodes: ['MEDI39A','OPDC06A'], isPrimaryGdrg: 'MEDI39A' },
  { icdCode: 'C69.2',   gdrgCodes: ['PAED52C','OPHT01A','OPDC06A'], isPrimaryGdrg: 'PAED52C' },
  { icdCode: 'C64',     gdrgCodes: ['PAED53C','MEDI39A'], isPrimaryGdrg: 'PAED53C' },
  { icdCode: 'D24.9',   gdrgCodes: ['ASUR23A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },

  // ══════════════════════════════════════════════════════════════
  // SECTION 4: MENTAL HEALTH
  // ══════════════════════════════════════════════════════════════
  // All psychiatric → MEDI30A (systemic) or OPDC06A. Manual groups most
  // psychiatric as MEDI30 (systemic illness) for inpatient admissions.
  { icdCode: 'F20.9',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'MEDI30A' },
  { icdCode: 'F25.9',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'MEDI30A' },
  { icdCode: 'F23.9',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'MEDI30A' },
  { icdCode: 'F22.0',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F31.3',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F31.2',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F31.9',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F32.9',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F33.9',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F41.1',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F41.0',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F41.9',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F42.9',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F43.10',  gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F43.0',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F43.22',  gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F43.21',  gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F44.9',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F48.9',   gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F10.20',  gdrgCodes: ['MEDI36A','OPDC06A'], isPrimaryGdrg: 'MEDI36A' },
  { icdCode: 'F10.239', gdrgCodes: ['MEDI36A','OPDC06A'], isPrimaryGdrg: 'MEDI36A' },
  { icdCode: 'F12.20',  gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F17.200', gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F11.20',  gdrgCodes: ['MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F84.0',   gdrgCodes: ['MEDI30A','PAED38C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'PAED38C' },
  { icdCode: 'F84.5',   gdrgCodes: ['MEDI30A','PAED38C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'PAED38C' },
  { icdCode: 'F90.9',   gdrgCodes: ['MEDI30A','PAED38C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'PAED38C' },
  { icdCode: 'F79',     gdrgCodes: ['MEDI30A','PAED38C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'PAED38C' },
  { icdCode: 'F91.3',   gdrgCodes: ['PAED38C','OPDC06C'], isPrimaryGdrg: 'OPDC06C' },
  { icdCode: 'F91.9',   gdrgCodes: ['PAED38C','OPDC06C'], isPrimaryGdrg: 'OPDC06C' },
  { icdCode: 'F81.9',   gdrgCodes: ['PAED38C','OPDC06C'], isPrimaryGdrg: 'OPDC06C' },
  { icdCode: 'F95.2',   gdrgCodes: ['MEDI30A','PAED38C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'Q90.9',   gdrgCodes: ['PAED38C','OPDC06C'], isPrimaryGdrg: 'PAED38C' },

  // Epilepsy → MEDI12A adult; PAED20C child
  { icdCode: 'G40.909', gdrgCodes: ['MEDI12A','PAED20C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI12A' },
  { icdCode: 'G40.3',   gdrgCodes: ['MEDI12A','PAED20C'], isPrimaryGdrg: 'MEDI12A' },
  { icdCode: 'G40.1',   gdrgCodes: ['MEDI12A','PAED20C'], isPrimaryGdrg: 'MEDI12A' },
  { icdCode: 'G40.901', gdrgCodes: ['MEDI12A','PAED20C'], isPrimaryGdrg: 'MEDI12A' },
  { icdCode: 'R56.00',  gdrgCodes: ['MEDI12A','PAED20C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'PAED20C' },

  // Cerebral palsy → MEDI11A (paralytic) adult; PAED19C child
  { icdCode: 'G80.9',   gdrgCodes: ['MEDI11A','PAED19C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'PAED19C' },
  { icdCode: 'G80.0',   gdrgCodes: ['MEDI11A','PAED19C'], isPrimaryGdrg: 'PAED19C' },
  { icdCode: 'G80.1',   gdrgCodes: ['MEDI11A','PAED19C'], isPrimaryGdrg: 'PAED19C' },

  // ══════════════════════════════════════════════════════════════
  // SECTION 5: SPECIALIZED CONDITIONS
  // ══════════════════════════════════════════════════════════════

  // Eye infections → OPDC05A/C OPD; OPHT procedures if surgical
  { icdCode: 'H10.9',   gdrgCodes: ['OPDC05A','OPDC05C','OPHT03A','OPHT03C'], isPrimaryGdrg: 'OPDC05A' },
  { icdCode: 'H10.1',   gdrgCodes: ['OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPDC05A' },
  { icdCode: 'H10.021', gdrgCodes: ['OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPDC05A' },
  { icdCode: 'B30.9',   gdrgCodes: ['OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPDC05A' },
  { icdCode: 'H00.019', gdrgCodes: ['OPHT12A','OPHT12C','OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPHT12A' },
  { icdCode: 'H16.0',   gdrgCodes: ['OPHT07A','OPHT07C','OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPHT07A' },
  { icdCode: 'H01.009', gdrgCodes: ['OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPDC05A' },

  // Cataract → OPHT10A/C; with IOL → OPHT18A
  { icdCode: 'H26.9',   gdrgCodes: ['OPHT10A','OPHT10C','OPHT18A','OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPHT10A' },
  { icdCode: 'H25.9',   gdrgCodes: ['OPHT10A','OPHT10C','OPHT18A','OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPHT10A' },

  // Glaucoma → OPHT09A/C OPD; OPDC05 for consultation
  { icdCode: 'H40.9',   gdrgCodes: ['OPHT09A','OPHT09C','OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPDC05A' },
  { icdCode: 'H40.11',  gdrgCodes: ['OPHT09A','OPHT09C','OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPDC05A' },
  { icdCode: 'H40.0',   gdrgCodes: ['OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPDC05A' },

  // Trachoma → OPDC05A/C; OPHT06A/C eyelid (for trichiasis surgery)
  { icdCode: 'A71.9',   gdrgCodes: ['OPHT06A','OPHT06C','OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPDC05A' },

  // Otitis media → OPDC04A/C ENT; ENTH14 if abscess/drainage needed
  { icdCode: 'H66.90',  gdrgCodes: ['OPDC04A','OPDC04C','ENTH14A','ENTH14C'], isPrimaryGdrg: 'OPDC04A' },
  { icdCode: 'H65.0',   gdrgCodes: ['OPDC04A','OPDC04C'], isPrimaryGdrg: 'OPDC04A' },
  { icdCode: 'H66.0',   gdrgCodes: ['OPDC04A','OPDC04C'], isPrimaryGdrg: 'OPDC04A' },
  { icdCode: 'H66.1',   gdrgCodes: ['OPDC04A','OPDC04C'], isPrimaryGdrg: 'OPDC04A' },
  { icdCode: 'H70.9',   gdrgCodes: ['ENTH05A','ENTH05C','OPDC04A','OPDC04C'], isPrimaryGdrg: 'ENTH05A' },

  // Other ear infections → OPDC04A/C; ENTH20 for OPD procedures
  { icdCode: 'H60.9',   gdrgCodes: ['OPDC04A','OPDC04C','ENTH20A','ENTH20C'], isPrimaryGdrg: 'OPDC04A' },
  { icdCode: 'H60.5',   gdrgCodes: ['OPDC04A','OPDC04C','ENTH20A','ENTH20C'], isPrimaryGdrg: 'OPDC04A' },
  { icdCode: 'H61.2',   gdrgCodes: ['ENTH20A','ENTH20C','OPDC04A','OPDC04C'], isPrimaryGdrg: 'ENTH20A' },

  // Dental caries → DENT03/04/05
  { icdCode: 'K02.9',   gdrgCodes: ['DENT03A','DENT03C','DENT04A','DENT04C','DENT05A','DENT05C','OPDC03A','OPDC03C'], isPrimaryGdrg: 'DENT04A' },

  // Dental swellings/abscess → DENT10A/C (I&D)
  { icdCode: 'K04.7',   gdrgCodes: ['DENT10A','DENT10C','OPDC03A','OPDC03C'], isPrimaryGdrg: 'DENT10A' },

  // Traumatic oral conditions → DENT15A/C (suturing)
  { icdCode: 'S09.90XA',gdrgCodes: ['DENT15A','DENT15C'], isPrimaryGdrg: 'DENT15A' },

  // Periodontal diseases → DENT06/07
  { icdCode: 'K05.6',   gdrgCodes: ['DENT06A','DENT06C','DENT07A','DENT07C','OPDC03A','OPDC03C'], isPrimaryGdrg: 'DENT06A' },
  { icdCode: 'K06.8',   gdrgCodes: ['DENT07A','DENT07C','OPDC03A','OPDC03C'], isPrimaryGdrg: 'OPDC03A' },

  // Other oral conditions
  { icdCode: 'B37.0',   gdrgCodes: ['OPDC03A','OPDC03C','DENT24A','DENT24C'], isPrimaryGdrg: 'OPDC03A' },
  { icdCode: 'K13.7',   gdrgCodes: ['DENT11A','DENT11C','OPDC03A','OPDC03C'], isPrimaryGdrg: 'OPDC03A' },

  // Cerebral palsy (already above in mental health)
  // Liver diseases → MEDI24A; PAED32C
  { icdCode: 'K74.60',  gdrgCodes: ['MEDI24A','PAED32C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI24A' },
  { icdCode: 'K70.9',   gdrgCodes: ['MEDI24A','PAED32C'], isPrimaryGdrg: 'MEDI24A' },
  { icdCode: 'K70.30',  gdrgCodes: ['MEDI24A','PAED32C'], isPrimaryGdrg: 'MEDI24A' },
  { icdCode: 'K76.0',   gdrgCodes: ['MEDI24A','PAED32C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'K76.9',   gdrgCodes: ['MEDI24A','PAED32C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI24A' },

  // UTI → MEDI31A (localised); PAED39C
  { icdCode: 'N39.0',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'N10',     gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'N30.00',  gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'R30.0',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },

  // Skin diseases → MEDI18A adult; PAED26C child
  { icdCode: 'L01.0',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'L02.91',  gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'L03.119', gdrgCodes: ['MEDI31A','PAED39C','MEDI18A','PAED26C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'L03.115', gdrgCodes: ['MEDI31A','PAED39C','MEDI18A','PAED26C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'L03.211', gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'L03.9',   gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'L20.9',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'L25.9',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'L40.9',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'L70.0',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'L50.9',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'L29.9',   gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'B35.4',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'B35.0',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'B35.3',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'B36.0',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'B86',     gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'B85.2',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'B37.9',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'B02.9',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'B02.32',  gdrgCodes: ['OPHT06A','OPHT06C','MEDI18A','PAED26C'], isPrimaryGdrg: 'OPHT06A' },
  { icdCode: 'B00.9',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'B07.0',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'B08.1',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'A46',     gdrgCodes: ['MEDI31A','PAED39C'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'D23.9',   gdrgCodes: ['ASUR30A','MEDI18A','OPDC06A'], isPrimaryGdrg: 'ASUR30A' },
  { icdCode: 'E70.3',   gdrgCodes: ['MEDI18A','PAED26C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },

  // Ulcer → MEDI35A adult; PAED43C child
  { icdCode: 'L89.90',  gdrgCodes: ['MEDI35A','PAED43C'], isPrimaryGdrg: 'MEDI35A' },
  { icdCode: 'L97.909', gdrgCodes: ['MEDI35A','PAED43C','OPDC06A'], isPrimaryGdrg: 'MEDI35A' },

  // Kidney diseases → MEDI19A (without RF) or MEDI20A (with RF); PAED27C/28C
  { icdCode: 'N00.9',   gdrgCodes: ['MEDI19A','PAED27C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI19A' },
  { icdCode: 'N18.1',   gdrgCodes: ['MEDI19A','PAED27C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'N18.2',   gdrgCodes: ['MEDI19A','PAED27C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'N18.3',   gdrgCodes: ['MEDI20A','PAED28C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI20A' },
  { icdCode: 'N18.4',   gdrgCodes: ['MEDI20A','PAED28C'], isPrimaryGdrg: 'MEDI20A' },
  { icdCode: 'N18.5',   gdrgCodes: ['MEDI21A','PAED29C'], isPrimaryGdrg: 'MEDI21A', notes: 'ESRD with dialysis' },
  { icdCode: 'N17.9',   gdrgCodes: ['MEDI20A','PAED28C'], isPrimaryGdrg: 'MEDI20A' },
  { icdCode: 'N04.9',   gdrgCodes: ['MEDI19A','PAED27C'], isPrimaryGdrg: 'MEDI19A' },

  // ══════════════════════════════════════════════════════════════
  // SECTION 6: OBSTETRICS & GYNAECOLOGY
  // ══════════════════════════════════════════════════════════════

  // Gynaecological conditions → OPDC08A / OBGY procedures
  { icdCode: 'N94.9',   gdrgCodes: ['OBGY09A','OPDC08A','OPDC06A'], isPrimaryGdrg: 'OPDC08A' },
  { icdCode: 'N83.20',  gdrgCodes: ['OBGY01A','OPDC08A'], isPrimaryGdrg: 'OBGY01A' },
  { icdCode: 'N92.0',   gdrgCodes: ['OBGY09A','OPDC08A','OPDC06A'], isPrimaryGdrg: 'OPDC08A' },
  { icdCode: 'N94.6',   gdrgCodes: ['OBGY09A','OPDC08A','OPDC06A'], isPrimaryGdrg: 'OPDC08A' },
  { icdCode: 'N80.9',   gdrgCodes: ['OBGY01A','OPDC08A'], isPrimaryGdrg: 'OBGY01A' },
  { icdCode: 'D25.9',   gdrgCodes: ['OBGY36A','OPDC08A'], isPrimaryGdrg: 'OBGY36A' },
  { icdCode: 'D26.0',   gdrgCodes: ['OBGY36A','OPDC08A'], isPrimaryGdrg: 'OBGY36A' },
  { icdCode: 'N73.9',   gdrgCodes: ['OBGY09A','MEDI31A'], isPrimaryGdrg: 'OBGY09A' },
  { icdCode: 'N97.9',   gdrgCodes: ['OPDC08A','OPDC06A'], isPrimaryGdrg: 'OPDC08A' },
  { icdCode: 'N87.0',   gdrgCodes: ['OBGY23A','OPDC08A'], isPrimaryGdrg: 'OBGY23A' },
  { icdCode: 'N87.1',   gdrgCodes: ['OBGY23A','OPDC08A'], isPrimaryGdrg: 'OBGY23A' },
  { icdCode: 'N87.2',   gdrgCodes: ['OBGY23A','OPDC08A'], isPrimaryGdrg: 'OBGY23A' },

  // Pregnancy complications
  { icdCode: 'O00.9',   gdrgCodes: ['OBGY01A'], isPrimaryGdrg: 'OBGY01A' },
  { icdCode: 'O20.9',   gdrgCodes: ['OBGY09A','OPDC02A'], isPrimaryGdrg: 'OBGY09A' },
  { icdCode: 'O20.0',   gdrgCodes: ['OBGY09A'], isPrimaryGdrg: 'OBGY09A' },
  { icdCode: 'O03.4',   gdrgCodes: ['OBGY06A','OBGY07A'], isPrimaryGdrg: 'OBGY06A' },
  { icdCode: 'O21.1',   gdrgCodes: ['OBGY09A'], isPrimaryGdrg: 'OBGY09A' },
  { icdCode: 'O98.61',  gdrgCodes: ['OBGY09A','MEDI28A'], isPrimaryGdrg: 'OBGY09A' },
  { icdCode: 'O14.90',  gdrgCodes: ['OBGY09A'], isPrimaryGdrg: 'OBGY09A' },
  { icdCode: 'O14.0',   gdrgCodes: ['OBGY09A'], isPrimaryGdrg: 'OBGY09A' },
  { icdCode: 'O14.1',   gdrgCodes: ['OBGY09A','OBGY40A'], isPrimaryGdrg: 'OBGY09A' },
  { icdCode: 'O15.9',   gdrgCodes: ['OBGY40A'], isPrimaryGdrg: 'OBGY40A' },
  { icdCode: 'O24.4',   gdrgCodes: ['OBGY09A','MEDI02A'], isPrimaryGdrg: 'OBGY09A' },
  { icdCode: 'O46.90',  gdrgCodes: ['OBGY09A'], isPrimaryGdrg: 'OBGY09A' },
  { icdCode: 'O44.00',  gdrgCodes: ['OBGY32A','OBGY09A'], isPrimaryGdrg: 'OBGY32A' },
  { icdCode: 'O45.9',   gdrgCodes: ['OBGY09A','OBGY32A'], isPrimaryGdrg: 'OBGY09A' },
  { icdCode: 'O42.90',  gdrgCodes: ['OBGY09A'], isPrimaryGdrg: 'OBGY09A' },
  { icdCode: 'O48.0',   gdrgCodes: ['OBGY09A'], isPrimaryGdrg: 'OBGY09A' },
  { icdCode: 'O66.9',   gdrgCodes: ['OBGY32A','OBGY29A'], isPrimaryGdrg: 'OBGY32A' },
  { icdCode: 'O68',     gdrgCodes: ['OBGY09A','OBGY32A'], isPrimaryGdrg: 'OBGY09A' },
  { icdCode: 'O80',     gdrgCodes: ['OBGY34A'], isPrimaryGdrg: 'OBGY34A' },
  { icdCode: 'O82',     gdrgCodes: ['OBGY32A'], isPrimaryGdrg: 'OBGY32A' },
  { icdCode: 'O81.0',   gdrgCodes: ['OBGY29A'], isPrimaryGdrg: 'OBGY29A' },
  { icdCode: 'O81.4',   gdrgCodes: ['OBGY29A'], isPrimaryGdrg: 'OBGY29A' },
  { icdCode: 'O72.1',   gdrgCodes: ['OBGY38A'], isPrimaryGdrg: 'OBGY38A' },
  { icdCode: 'O73.0',   gdrgCodes: ['OBGY08A'], isPrimaryGdrg: 'OBGY08A' },
  { icdCode: 'O86.0',   gdrgCodes: ['MEDI31A','OBGY09A'], isPrimaryGdrg: 'MEDI31A' },
  { icdCode: 'Z34.00',  gdrgCodes: ['OPDC02A'], isPrimaryGdrg: 'OPDC02A' },
  { icdCode: 'Z39.0',   gdrgCodes: ['OPDC02A'], isPrimaryGdrg: 'OPDC02A' },

  // Anaemia in pregnancy
  { icdCode: 'O99.011', gdrgCodes: ['OBGY09A','MEDI06A'], isPrimaryGdrg: 'OBGY09A' },

  // Postpartum depression (also in mental health)
  { icdCode: 'F53.0',   gdrgCodes: ['OBGY09A','MEDI30A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },

  // ══════════════════════════════════════════════════════════════
  // SECTION 7: REPRODUCTIVE TRACT
  // ══════════════════════════════════════════════════════════════

  { icdCode: 'A54.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'A51.0',   gdrgCodes: ['MEDI31A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'A51.3',   gdrgCodes: ['MEDI31A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'A60.9',   gdrgCodes: ['MEDI31A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'A56.0',   gdrgCodes: ['MEDI31A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'A59.0',   gdrgCodes: ['MEDI31A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'B37.3',   gdrgCodes: ['MEDI31A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'N34.2',   gdrgCodes: ['MEDI31A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'R36.9',   gdrgCodes: ['MEDI31A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'N89.8',   gdrgCodes: ['OBGY09A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'A63.0',   gdrgCodes: ['OBGY11A','OPDC06A'], isPrimaryGdrg: 'OBGY11A' },
  { icdCode: 'N40.0',   gdrgCodes: ['OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'N40.1',   gdrgCodes: ['ASUR28A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'N41.9',   gdrgCodes: ['MEDI31A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'N52.9',   gdrgCodes: ['OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'N50.819', gdrgCodes: ['OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'N43.3',   gdrgCodes: ['ASUR22A','OPDC06A'], isPrimaryGdrg: 'ASUR22A' },
  { icdCode: 'N46.9',   gdrgCodes: ['OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'Z31.41',  gdrgCodes: ['OPDC06A','OPDC08A'], isPrimaryGdrg: 'OPDC08A' },

  // ══════════════════════════════════════════════════════════════
  // SECTION 8: INJURIES
  // ══════════════════════════════════════════════════════════════

  // Road traffic → ORTH04/12/17 depending on fracture; MEDI for head
  { icdCode: 'V89.2XXA',gdrgCodes: ['ORTH04A','ORTH04C','MEDI08A','PAED16C'], isPrimaryGdrg: 'ORTH04A' },
  { icdCode: 'S06.9X0A',gdrgCodes: ['ORTH24A','ORTH24C','MEDI08A','PAED16C'], isPrimaryGdrg: 'ORTH24A' },
  { icdCode: 'S72.90XA',gdrgCodes: ['ORTH12A','ORTH12C','ORTH17A','ORTH17C'], isPrimaryGdrg: 'ORTH17A' },
  { icdCode: 'S82.90XA',gdrgCodes: ['ORTH12A','ORTH12C','ORTH17A','ORTH17C'], isPrimaryGdrg: 'ORTH17A' },

  // Home injuries
  { icdCode: 'S52.90XA',gdrgCodes: ['ORTH04A','ORTH04C','ORTH12A','ORTH12C'], isPrimaryGdrg: 'ORTH04A' },
  { icdCode: 'S42.009A',gdrgCodes: ['ORTH04A','ORTH04C'], isPrimaryGdrg: 'ORTH04A' },
  { icdCode: 'S93.409A',gdrgCodes: ['ORTH04A','ORTH04C','ORTH01A','ORTH01C'], isPrimaryGdrg: 'ORTH01A' },
  { icdCode: 'S63.509A',gdrgCodes: ['ORTH04A','ORTH04C','ORTH01A','ORTH01C'], isPrimaryGdrg: 'ORTH01A' },
  { icdCode: 'W18.30XA',gdrgCodes: ['ORTH04A','ORTH04C'], isPrimaryGdrg: 'ORTH04A' },
  { icdCode: 'S01.90XA',gdrgCodes: ['ASUR31A','PSUR06C','ZOOM07A','ZOOM07C'], isPrimaryGdrg: 'ZOOM07A' },
  { icdCode: 'S80.91XA',gdrgCodes: ['ZOOM07A','ZOOM07C'], isPrimaryGdrg: 'ZOOM07A' },
  { icdCode: 'T17.208A',gdrgCodes: ['ENTH13A','ENTH13C'], isPrimaryGdrg: 'ENTH13A' },
  { icdCode: 'T16.XXA', gdrgCodes: ['ENTH13A','ENTH13C'], isPrimaryGdrg: 'ENTH13A' },
  { icdCode: 'T15.90XA',gdrgCodes: ['OPHT03A','OPHT03C'], isPrimaryGdrg: 'OPHT03A' },

  // Occupational injuries
  { icdCode: 'S61.209A',gdrgCodes: ['ZOOM07A','ZOOM07C','ORTH05A','ORTH05C'], isPrimaryGdrg: 'ZOOM07A' },

  // Burns → RSUR procedures; PSUR26C/27C/28C for children
  { icdCode: 'T22.009A',gdrgCodes: ['RSURO3A','RSURO3C','PSUR26C','PSUR27C'], isPrimaryGdrg: 'RSURO3A' },
  { icdCode: 'T20.00XA',gdrgCodes: ['RSURO3A','RSURO3C','PSUR26C','PSUR27C'], isPrimaryGdrg: 'RSURO3A' },

  // Dog bite → MEDI37A (animal bites) adult; PAED44C child
  { icdCode: 'W54.0XXA',gdrgCodes: ['MEDI37A','PAED44C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI37A' },

  // Human bites
  { icdCode: 'W56.41XA',gdrgCodes: ['MEDI37A','PAED44C'], isPrimaryGdrg: 'MEDI37A' },

  // Snake bite → MEDI08A (poisoning/animal bites) adult; PAED16C child
  { icdCode: 'T63.001A',gdrgCodes: ['MEDI08A','PAED16C'], isPrimaryGdrg: 'MEDI08A' },

  // Other animal bites
  { icdCode: 'W53.81XA',gdrgCodes: ['MEDI37A','PAED44C'], isPrimaryGdrg: 'MEDI37A' },
  { icdCode: 'W55.89XA',gdrgCodes: ['MEDI37A','PAED44C'], isPrimaryGdrg: 'MEDI37A' },
  { icdCode: 'T63.2X1A',gdrgCodes: ['MEDI08A','PAED16C'], isPrimaryGdrg: 'MEDI08A' },

  // Poisoning/occupational
  { icdCode: 'T60.91XA',gdrgCodes: ['MEDI08A','PAED16C'], isPrimaryGdrg: 'MEDI08A' },
  { icdCode: 'T58.01XA',gdrgCodes: ['MEDI08A','PAED16C'], isPrimaryGdrg: 'MEDI08A' },
  { icdCode: 'T56.0X1A',gdrgCodes: ['MEDI08A','PAED16C'], isPrimaryGdrg: 'MEDI08A' },

  // Sexual abuse → PSUR29C/30C for children; ASUR31A adult
  { icdCode: 'T74.21XA',gdrgCodes: ['ASUR31A','PSUR29C','PSUR30C'], isPrimaryGdrg: 'ASUR31A' },

  // Domestic violence → ZOOM07A/C (dressing) or appropriate surgical
  { icdCode: 'Y08.XXXA',gdrgCodes: ['ZOOM07A','ZOOM07C','ASUR31A'], isPrimaryGdrg: 'ZOOM07A' },

  // PUO → MEDI31A; PAED39C
  { icdCode: 'R50.9',   gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'R50.82',  gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },

  // Brought in dead → no GDRG (R99 is excluded from tariff per manual)
  // { icdCode: 'R99', gdrgCodes: [], isPrimaryGdrg: '' }, // intentionally excluded

  // All other diseases (catch-all)
  { icdCode: 'Z03.89',  gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },

  // ══════════════════════════════════════════════════════════════
  // EXTRA: commonly seen conditions not in sections 1-8 above
  // ══════════════════════════════════════════════════════════════

  // Thyroid diseases → MEDI01A adult; PAED01C child; surgery ASUR01A
  { icdCode: 'E03.9',   gdrgCodes: ['MEDI01A','PAED01C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'E03.1',   gdrgCodes: ['MEDI01A','PAED01C'], isPrimaryGdrg: 'PAED01C' },
  { icdCode: 'E05.90',  gdrgCodes: ['MEDI01A','PAED01C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'E05.0',   gdrgCodes: ['MEDI01A','PAED01C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'E01.8',   gdrgCodes: ['MEDI01A','PAED01C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },

  // Pulmonary embolism → MEDI34A adult; PAED42C child
  { icdCode: 'I26.9',   gdrgCodes: ['MEDI34A','PAED42C'], isPrimaryGdrg: 'MEDI34A' },

  // Paralytic conditions → MEDI11A; PAED19C
  { icdCode: 'G82.20',  gdrgCodes: ['MEDI11A','PAED19C'], isPrimaryGdrg: 'MEDI11A' },
  { icdCode: 'G82.50',  gdrgCodes: ['MEDI11A','PAED19C'], isPrimaryGdrg: 'MEDI11A' },

  // Non-traumatic coma → MEDI10A; PAED18C
  { icdCode: 'R55',     gdrgCodes: ['MEDI13A','PAED21C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },

  // Shock → MEDI27A; PAED35C
  { icdCode: 'E86.9',   gdrgCodes: ['MEDI27A','PAED35C'], isPrimaryGdrg: 'MEDI27A' },

  // Appendicitis → ASUR (laparotomy) adult; PSUR12C child
  { icdCode: 'K35.80',  gdrgCodes: ['ASUR08A','PSUR12C'], isPrimaryGdrg: 'ASUR08A' },
  { icdCode: 'K35.2',   gdrgCodes: ['ASUR08A','PSUR12C'], isPrimaryGdrg: 'ASUR08A' },

  // Hernia → ASUR20A (external hernia repair) adult; PSUR07C/08C child
  { icdCode: 'K40.90',  gdrgCodes: ['ASUR20A','PSUR07C'], isPrimaryGdrg: 'ASUR20A' },
  { icdCode: 'K42.9',   gdrgCodes: ['ASUR20A','PSUR07C'], isPrimaryGdrg: 'ASUR20A' },
  { icdCode: 'K43.9',   gdrgCodes: ['ASUR19A','PSUR08C'], isPrimaryGdrg: 'ASUR19A' },

  // Haemorrhoids / anal fissure → ASUR15A
  { icdCode: 'K64.9',   gdrgCodes: ['ASUR15A'], isPrimaryGdrg: 'ASUR15A' },
  { icdCode: 'K60.0',   gdrgCodes: ['ASUR15A'], isPrimaryGdrg: 'ASUR15A' },

  // Cholecystitis / gallstones → ASUR17A (biliary surgery)
  { icdCode: 'K81.0',   gdrgCodes: ['ASUR17A','PSUR19C'], isPrimaryGdrg: 'ASUR17A' },
  { icdCode: 'K81.1',   gdrgCodes: ['ASUR17A','PSUR19C'], isPrimaryGdrg: 'ASUR17A' },
  { icdCode: 'K80.20',  gdrgCodes: ['ASUR17A'], isPrimaryGdrg: 'ASUR17A' },

  // Pancreatitis → ASUR18A adult; PSUR surgical child; MEDI for medical Mx
  { icdCode: 'K85.90',  gdrgCodes: ['ASUR18A','MEDI26A','PAED34C'], isPrimaryGdrg: 'MEDI26A' },
  { icdCode: 'K86.1',   gdrgCodes: ['MEDI26A','PAED34C','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },

  // GI bleeding → MEDI25A; PAED33C
  { icdCode: 'K64.9',   gdrgCodes: ['MEDI25A','PAED33C'], isPrimaryGdrg: 'MEDI25A' }, // duplicate with haemorrhoids — context decides
  { icdCode: 'K25.9',   gdrgCodes: ['MEDI25A','PAED33C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'K26.9',   gdrgCodes: ['MEDI25A','PAED33C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'K27.9',   gdrgCodes: ['MEDI25A','PAED33C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },

  // Non-specific abdominal → MEDI26A; PAED34C
  { icdCode: 'R10.9',   gdrgCodes: ['MEDI26A','PAED34C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'R10.13',  gdrgCodes: ['MEDI26A','PAED34C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'R10.11',  gdrgCodes: ['MEDI26A','PAED34C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'R10.2',   gdrgCodes: ['MEDI26A','PAED34C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },

  // Diarrhoea and vomiting symptoms → MEDI23A; PAED31C
  { icdCode: 'R11.2',   gdrgCodes: ['MEDI23A','PAED31C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'R19.7',   gdrgCodes: ['MEDI23A','PAED31C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },

  // Osteomyelitis → ORTH20A; ORTH20C
  { icdCode: 'M86.9',   gdrgCodes: ['ORTH20A','ORTH20C'], isPrimaryGdrg: 'ORTH20A' },
  { icdCode: 'M00.9',   gdrgCodes: ['ORTH15A','ORTH15C','MEDI31A'], isPrimaryGdrg: 'MEDI31A' },

  // Antenatal → OPDC02A
  { icdCode: 'Z34.00',  gdrgCodes: ['OPDC02A'], isPrimaryGdrg: 'OPDC02A' },

  // Neonatal conditions → PAED07-14C
  { icdCode: 'P36.9',   gdrgCodes: ['PAED14C'], isPrimaryGdrg: 'PAED14C' },
  { icdCode: 'P59.9',   gdrgCodes: ['PAED09C'], isPrimaryGdrg: 'PAED09C' },
  { icdCode: 'P59.8',   gdrgCodes: ['PAED08C'], isPrimaryGdrg: 'PAED08C' },
  { icdCode: 'P22.0',   gdrgCodes: ['PAED12C','PAED13C'], isPrimaryGdrg: 'PAED12C' },
  { icdCode: 'P21.9',   gdrgCodes: ['PAED11C'], isPrimaryGdrg: 'PAED11C' },
  { icdCode: 'P05.9',   gdrgCodes: ['PAED10C'], isPrimaryGdrg: 'PAED10C' },
  { icdCode: 'P07.30',  gdrgCodes: ['PAED10C'], isPrimaryGdrg: 'PAED10C' },
  { icdCode: 'P52.9',   gdrgCodes: ['PAED07C'], isPrimaryGdrg: 'PAED07C' },
  { icdCode: 'P39.8',   gdrgCodes: ['PAED07C'], isPrimaryGdrg: 'PAED07C' },

  // Cleft lip/palate → PSUR18C child; RSUR11A adult
  { icdCode: 'Q36.9',   gdrgCodes: ['RSUR11A','PSUR18C'], isPrimaryGdrg: 'PSUR18C' },
  { icdCode: 'Q35.9',   gdrgCodes: ['RSUR11A','PSUR18C'], isPrimaryGdrg: 'PSUR18C' },

  // Spina bifida / hydrocephalus → ASUR29A/PSUR32C (craniotomy/neurosurgery)
  { icdCode: 'Q05.9',   gdrgCodes: ['ASUR29A','PSUR32C'], isPrimaryGdrg: 'PSUR32C' },
  { icdCode: 'Q03.9',   gdrgCodes: ['ASUR29A','PSUR32C'], isPrimaryGdrg: 'PSUR32C' },

  // Various general OPD catch-all symptoms
  { icdCode: 'R51',     gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'R42',     gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'R53.83',  gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'R60.9',   gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'R06.02',  gdrgCodes: ['MEDI22A','PAED30C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'R05',     gdrgCodes: ['MEDI31A','PAED39C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'R31.9',   gdrgCodes: ['MEDI19A','PAED27C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'K59.00',  gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'R42',     gdrgCodes: ['MEDI13A','PAED21C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'Z00.00',  gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'Z23',     gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'Z20.9',   gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'Z22.9',   gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'T67.01XA',gdrgCodes: ['MEDI08A','PAED16C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'MEDI08A' },

  // Musculoskeletal / misc
  { icdCode: 'M54.5',   gdrgCodes: ['ORTH24A','ORTH24C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M54.2',   gdrgCodes: ['ORTH24A','ORTH24C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M54.3',   gdrgCodes: ['ORTH24A','ORTH24C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M51.9',   gdrgCodes: ['ORTH24A','ORTH24C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M51.16',  gdrgCodes: ['ORTH24A','ORTH24C'], isPrimaryGdrg: 'ORTH24A' },
  { icdCode: 'M81.0',   gdrgCodes: ['MEDI31A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M79.1',   gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M71.9',   gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M77.9',   gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'G56.00',  gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M32.9',   gdrgCodes: ['MEDI31A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'M34.9',   gdrgCodes: ['MEDI31A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },

  // Parkinson / Alzheimer / Dementia
  { icdCode: 'G20',     gdrgCodes: ['MEDI11A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'G30.9',   gdrgCodes: ['MEDI11A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'F03.90',  gdrgCodes: ['MEDI11A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },

  // Migraine / headache
  { icdCode: 'G43.909', gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'G43.109', gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'G44.209', gdrgCodes: ['OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },

  // Varicose veins / DVT
  { icdCode: 'I83.9',   gdrgCodes: ['ASUR25A'], isPrimaryGdrg: 'ASUR25A' },
  { icdCode: 'I80.209', gdrgCodes: ['MEDI34A','PAED42C','OPDC06A'], isPrimaryGdrg: 'MEDI34A' },

  // ENT procedures for tonsillitis etc.
  { icdCode: 'J03.90',  gdrgCodes: ['ENTH08A','ENTH08C','OPDC04A','OPDC04C'], isPrimaryGdrg: 'OPDC04A' },

  // Refractive error / eye OPD
  { icdCode: 'H52.7',   gdrgCodes: ['OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPDC05A' },
  { icdCode: 'H52.1',   gdrgCodes: ['OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPDC05A' },
  { icdCode: 'H52.4',   gdrgCodes: ['OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPDC05A' },

  // Albinism (skin/eye)
  { icdCode: 'E70.3',   gdrgCodes: ['MEDI18A','PAED26C','OPDC05A','OPDC05C'], isPrimaryGdrg: 'OPDC06A' },

  // Multiple sclerosis / GBS / Myasthenia
  { icdCode: 'G35',     gdrgCodes: ['MEDI11A','OPDC06A'], isPrimaryGdrg: 'MEDI11A' },
  { icdCode: 'G61.0',   gdrgCodes: ['MEDI11A','PAED19C'], isPrimaryGdrg: 'MEDI11A' },
  { icdCode: 'G70.0',   gdrgCodes: ['MEDI11A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'G51.0',   gdrgCodes: ['MEDI31A','OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'G50.0',   gdrgCodes: ['OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'G25.0',   gdrgCodes: ['OPDC06A'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'G04.9',   gdrgCodes: ['MEDI30A','PAED38C'], isPrimaryGdrg: 'MEDI30A' },

  // Intestinal obstruction → ASUR10/11 (bowel resection); PSUR child
  { icdCode: 'K56.609', gdrgCodes: ['ASUR10A','PSUR11C'], isPrimaryGdrg: 'ASUR10A' },

  // IBD / IBS / colitis → MEDI26A
  { icdCode: 'K51.90',  gdrgCodes: ['MEDI26A','PAED34C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'K50.90',  gdrgCodes: ['MEDI26A','PAED34C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'K58.9',   gdrgCodes: ['MEDI26A','PAED34C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },
  { icdCode: 'K58.0',   gdrgCodes: ['MEDI26A','PAED34C','OPDC06A','OPDC06C'], isPrimaryGdrg: 'OPDC06A' },

  // Systemic conditions (general)
  { icdCode: 'E87.8',   gdrgCodes: ['MEDI04A','PAED04C'], isPrimaryGdrg: 'MEDI04A' },
  { icdCode: 'E87.6',   gdrgCodes: ['MEDI04A','PAED04C'], isPrimaryGdrg: 'MEDI04A' },
  { icdCode: 'E87.5',   gdrgCodes: ['MEDI04A','PAED04C'], isPrimaryGdrg: 'MEDI04A' },
  { icdCode: 'E87.1',   gdrgCodes: ['MEDI04A','PAED04C'], isPrimaryGdrg: 'MEDI04A' },
  { icdCode: 'E87.0',   gdrgCodes: ['MEDI04A','PAED04C'], isPrimaryGdrg: 'MEDI04A' },

  // ENT without procedure
  { icdCode: 'H90.3',   gdrgCodes: ['OPDC04A','OPDC04C'], isPrimaryGdrg: 'OPDC04A' },
  { icdCode: 'H90.1',   gdrgCodes: ['OPDC04A','OPDC04C'], isPrimaryGdrg: 'OPDC04A' },
  { icdCode: 'H72.9',   gdrgCodes: ['ENTH05A','ENTH05C','OPDC04A','OPDC04C'], isPrimaryGdrg: 'OPDC04A' },
];


// ─────────────────────────────────────────────────────────────────────────────
// SEED RUNNER
// ─────────────────────────────────────────────────────────────────────────────

async function seedDiagnosisGDRGLinks() {
  console.log('🔗 Starting Diagnosis ↔ GDRG link seeding...\n');

  let created = 0;
  let skipped = 0;
  let diagnosisNotFound = 0;
  let gdrgNotFound = 0;
  const errors: string[] = [];

  // Pre-fetch all diagnoses and tariffs into Maps for O(1) lookup
  const allDiagnoses = await prisma.diagnosis.findMany({
    select: { id: true, icdCode: true, name: true }
  });
  const diagnosisMap = new Map(allDiagnoses.map(d => [d.icdCode, d]));

  const allTariffs = await prisma.gDRGTariff.findMany({
    select: { id: true, gdrgCode: true, description: true }
  });
  const tariffMap = new Map(allTariffs.map(t => [t.gdrgCode, t]));

  console.log(`📋 Found ${allDiagnoses.length} diagnoses and ${allTariffs.length} GDRG tariffs in DB\n`);

  for (const mapping of MAPPINGS) {
    const diagnosis = diagnosisMap.get(mapping.icdCode);
    if (!diagnosis) {
      diagnosisNotFound++;
      errors.push(`⚠️  Diagnosis not found: ICD ${mapping.icdCode}`);
      continue;
    }

    for (const gdrgCode of mapping.gdrgCodes) {
      const tariff = tariffMap.get(gdrgCode);
      if (!tariff) {
        gdrgNotFound++;
        errors.push(`⚠️  GDRG not found: ${gdrgCode} (for ICD ${mapping.icdCode})`);
        continue;
      }

      const isPrimary = gdrgCode === mapping.isPrimaryGdrg;

      try {
        await prisma.gDRGTariffDiagnosis.upsert({
          where: {
            gdrgTariffId_diagnosisId: {
              gdrgTariffId: tariff.id,
              diagnosisId:  diagnosis.id,
            }
          },
          update: {
            isPrimary,
            mappedIcdCode: mapping.mappedIcdCode ?? mapping.icdCode,
          },
          create: {
            gdrgTariffId:  tariff.id,
            diagnosisId:   diagnosis.id,
            isPrimary,
            mappedIcdCode: mapping.mappedIcdCode ?? mapping.icdCode,
          }
        });
        created++;
      } catch (err: any) {
        errors.push(`❌ DB error for ICD ${mapping.icdCode} → ${gdrgCode}: ${err.message}`);
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log('✅  SEED COMPLETE');
  console.log(`    Links created/updated : ${created}`);
  console.log(`    Diagnoses not found   : ${diagnosisNotFound}`);
  console.log(`    GDRGs not found       : ${gdrgNotFound}`);
  console.log(`    Mappings processed    : ${MAPPINGS.length}`);
  console.log('════════════════════════════════════════════\n');

  if (errors.length > 0) {
    console.log('⚠️  Warnings / Errors:');
    errors.forEach(e => console.log('   ' + e));
  }

  await prisma.$disconnect();
}

seedDiagnosisGDRGLinks().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});

// At the very bottom of diagnosisGdrgLink.ts, BEFORE the seedDiagnosisGDRGLinks() call

// ✅ Export the function so it can be imported
export { seedDiagnosisGDRGLinks };

// Then call it (only when file is run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDiagnosisGDRGLinks().catch(async (e) => {
    console.error('Fatal error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
}