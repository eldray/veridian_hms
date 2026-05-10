/**
 * seed_procedure_gdrg_links.ts
 *
 * Links every ProcedureTemplate to its GDRGTariff following the
 * NHIA Tariffs Operation Manual 2022 rules.
 *
 * MATCHING LOGIC:
 * ─────────────────────────────────────────────────────────────
 * 1. The GDRG code is embedded in the procedureCode (e.g. ASUR01A, DENT04C).
 *    For procedures whose code is exactly a GDRG code, we create a direct link.
 *
 * 2. For ZOOM cross-MDC codes (ZOOM01-13) we link both the zoom GDRG and the
 *    relevant specialty GDRG where the procedure also belongs.
 *
 * 3. isPrimary = true on the SINGLE most-specific GDRG for auto-resolution.
 *    For procedures with only one GDRG the isPrimary is always true.
 *
 * 4. Custom/laparoscopic procedures (source: "CUSTOM") are mapped to the
 *    closest NHIA equivalent.
 *
 * HOW TO RUN:
 *   npx ts-node seed_procedure_gdrg_links.ts
 *
 * PREREQUISITES: All ProcedureTemplate and GDRGTariff rows must exist in DB.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// TYPE
// ─────────────────────────────────────────────────────────────────────────────
interface ProcedureGDRGMapping {
  procedureCode: string;    // must match ProcedureTemplate.procedureCode exactly
  gdrgCodes: string[];      // all applicable GDRG codes
  isPrimaryGdrg: string;    // single best GDRG for auto-resolution
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER MAPPING TABLE
//
// Most NHIA procedures have procedureCodes that ARE the GDRG code, so the
// mapping is direct. We still make it explicit so:
//   (a) the runner can verify both sides exist
//   (b) we can attach additional GDRG codes where a procedure spans two MDCs
//       (e.g. a ZOOM procedure that is also billable under ASUR or ORTH)
// ─────────────────────────────────────────────────────────────────────────────
const MAPPINGS: ProcedureGDRGMapping[] = [

  // ══════════════════════════════════════════════════════════════
  // ADULT SURGERY (ASUR) — adults ≥12
  // ══════════════════════════════════════════════════════════════
  { procedureCode: 'ASUR01A', gdrgCodes: ['ASUR01A'],             isPrimaryGdrg: 'ASUR01A' },
  { procedureCode: 'ASUR02A', gdrgCodes: ['ASUR02A'],             isPrimaryGdrg: 'ASUR02A' },
  { procedureCode: 'ASUR03A', gdrgCodes: ['ASUR03A'],             isPrimaryGdrg: 'ASUR03A' },
  { procedureCode: 'ASUR04A', gdrgCodes: ['ASUR04A'],             isPrimaryGdrg: 'ASUR04A' },
  { procedureCode: 'ASUR05A', gdrgCodes: ['ASUR05A'],             isPrimaryGdrg: 'ASUR05A' },
  { procedureCode: 'ASUR06A', gdrgCodes: ['ASUR06A'],             isPrimaryGdrg: 'ASUR06A' },
  { procedureCode: 'ASUR07A', gdrgCodes: ['ASUR07A'],             isPrimaryGdrg: 'ASUR07A' },
  {
    procedureCode: 'ASUR08A',
    gdrgCodes: ['ASUR08A', 'ASUR10A', 'ASUR11A'],
    isPrimaryGdrg: 'ASUR08A',
    notes: 'Laparotomy for peritonitis; also used for bowel resection context'
  },
  { procedureCode: 'ASUR09A', gdrgCodes: ['ASUR09A', 'ZOOM01A'], isPrimaryGdrg: 'ASUR09A' },
  { procedureCode: 'ASUR10A', gdrgCodes: ['ASUR10A'],             isPrimaryGdrg: 'ASUR10A' },
  { procedureCode: 'ASUR11A', gdrgCodes: ['ASUR11A'],             isPrimaryGdrg: 'ASUR11A' },
  { procedureCode: 'ASUR12A', gdrgCodes: ['ASUR12A'],             isPrimaryGdrg: 'ASUR12A' },
  { procedureCode: 'ASUR13A', gdrgCodes: ['ASUR13A'],             isPrimaryGdrg: 'ASUR13A' },
  { procedureCode: 'ASUR14A', gdrgCodes: ['ASUR14A'],             isPrimaryGdrg: 'ASUR14A' },
  {
    procedureCode: 'ASUR15A',
    gdrgCodes: ['ASUR15A'],
    isPrimaryGdrg: 'ASUR15A',
    notes: 'Haemorrhoids, fissures, fistula-in-ano'
  },
  { procedureCode: 'ASUR16A', gdrgCodes: ['ASUR16A'],             isPrimaryGdrg: 'ASUR16A' },
  { procedureCode: 'ASUR17A', gdrgCodes: ['ASUR17A'],             isPrimaryGdrg: 'ASUR17A' },
  { procedureCode: 'ASUR18A', gdrgCodes: ['ASUR18A'],             isPrimaryGdrg: 'ASUR18A' },
  {
    procedureCode: 'ASUR19A',
    gdrgCodes: ['ASUR19A', 'ASUR20A'],
    isPrimaryGdrg: 'ASUR19A',
    notes: 'Internal hernia; external hernia is ASUR20A'
  },
  { procedureCode: 'ASUR20A', gdrgCodes: ['ASUR20A'],             isPrimaryGdrg: 'ASUR20A' },
  { procedureCode: 'ASUR21A', gdrgCodes: ['ASUR21A', 'ASUR28A'], isPrimaryGdrg: 'ASUR21A' },
  { procedureCode: 'ASUR22A', gdrgCodes: ['ASUR22A'],             isPrimaryGdrg: 'ASUR22A' },
  {
    procedureCode: 'ASUR23A',
    gdrgCodes: ['ASUR23A'],
    isPrimaryGdrg: 'ASUR23A',
    notes: 'Mastectomy — also relevant for MEDI39A (chemo) context'
  },
  { procedureCode: 'ASUR24A', gdrgCodes: ['ASUR24A'],             isPrimaryGdrg: 'ASUR24A' },
  { procedureCode: 'ASUR25A', gdrgCodes: ['ASUR25A'],             isPrimaryGdrg: 'ASUR25A' },
  { procedureCode: 'ASUR27A', gdrgCodes: ['ASUR27A', 'ZOOM06A'], isPrimaryGdrg: 'ASUR27A' },
  { procedureCode: 'ASUR28A', gdrgCodes: ['ASUR28A'],             isPrimaryGdrg: 'ASUR28A' },
  { procedureCode: 'ASUR29A', gdrgCodes: ['ASUR29A'],             isPrimaryGdrg: 'ASUR29A' },
  {
    procedureCode: 'ASUR30A',
    gdrgCodes: ['ASUR30A'],
    isPrimaryGdrg: 'ASUR30A',
    notes: 'General excision biopsy — also maps to RSURO7A in reconstructive context'
  },
  {
    procedureCode: 'ASUR31A',
    gdrgCodes: ['ASUR31A', 'ZOOM07A'],
    isPrimaryGdrg: 'ASUR31A',
    notes: 'I&D debridement — ZOOM07A for minor wound dressing only'
  },
  { procedureCode: 'ASUR32A', gdrgCodes: ['ASUR32A'],             isPrimaryGdrg: 'ASUR32A' },
  { procedureCode: 'ASUR33A', gdrgCodes: ['ASUR33A'],             isPrimaryGdrg: 'ASUR33A' },
  { procedureCode: 'ASUR34A', gdrgCodes: ['ASUR34A'],             isPrimaryGdrg: 'ASUR34A' },
  {
    procedureCode: 'ASUR35A',
    gdrgCodes: ['ASUR35A', 'ORTH25A'],
    isPrimaryGdrg: 'ASUR35A',
    notes: 'Digit removal — ORTH25A used when in orthopaedic context'
  },
  {
    procedureCode: 'ASUR36A',
    gdrgCodes: ['ASUR36A', 'ORTH26A'],
    isPrimaryGdrg: 'ASUR36A',
    notes: 'Hand/foot amputation — ORTH26A for orthopaedic context'
  },
  {
    procedureCode: 'ASUR37A',
    gdrgCodes: ['ASUR37A', 'ORTH27A'],
    isPrimaryGdrg: 'ASUR37A',
    notes: 'Major limb amputation — ORTH27A for orthopaedic context'
  },

  // ══════════════════════════════════════════════════════════════
  // DENTAL (DENT) — A = adult ≥12, C = child <12
  // ══════════════════════════════════════════════════════════════
  { procedureCode: 'DENT01A', gdrgCodes: ['DENT01A', 'OPDC03A'], isPrimaryGdrg: 'DENT01A' },
  { procedureCode: 'DENT01C', gdrgCodes: ['DENT01C', 'OPDC03C'], isPrimaryGdrg: 'DENT01C' },
  { procedureCode: 'DENT02A', gdrgCodes: ['DENT02A', 'OPDC03A'], isPrimaryGdrg: 'DENT02A' },
  { procedureCode: 'DENT03A', gdrgCodes: ['DENT03A', 'OPDC03A'], isPrimaryGdrg: 'DENT03A' },
  { procedureCode: 'DENT03C', gdrgCodes: ['DENT03C', 'OPDC03C'], isPrimaryGdrg: 'DENT03C' },
  { procedureCode: 'DENT04A', gdrgCodes: ['DENT04A', 'OPDC03A'], isPrimaryGdrg: 'DENT04A' },
  { procedureCode: 'DENT04C', gdrgCodes: ['DENT04C', 'OPDC03C'], isPrimaryGdrg: 'DENT04C' },
  { procedureCode: 'DENT05A', gdrgCodes: ['DENT05A', 'OPDC03A'], isPrimaryGdrg: 'DENT05A' },
  { procedureCode: 'DENT05C', gdrgCodes: ['DENT05C', 'OPDC03C'], isPrimaryGdrg: 'DENT05C' },
  { procedureCode: 'DENT06A', gdrgCodes: ['DENT06A', 'OPDC03A'], isPrimaryGdrg: 'DENT06A' },
  { procedureCode: 'DENT06C', gdrgCodes: ['DENT06C', 'OPDC03C'], isPrimaryGdrg: 'DENT06C' },
  { procedureCode: 'DENT07A', gdrgCodes: ['DENT07A', 'OPDC03A'], isPrimaryGdrg: 'DENT07A' },
  { procedureCode: 'DENT07C', gdrgCodes: ['DENT07C', 'OPDC03C'], isPrimaryGdrg: 'DENT07C' },
  { procedureCode: 'DENT08A', gdrgCodes: ['DENT08A', 'OPDC03A'], isPrimaryGdrg: 'DENT08A' },
  { procedureCode: 'DENT08C', gdrgCodes: ['DENT08C', 'OPDC03C'], isPrimaryGdrg: 'DENT08C' },
  { procedureCode: 'DENT09A', gdrgCodes: ['DENT09A'],             isPrimaryGdrg: 'DENT09A' },
  { procedureCode: 'DENT09C', gdrgCodes: ['DENT09C'],             isPrimaryGdrg: 'DENT09C' },
  { procedureCode: 'DENT10A', gdrgCodes: ['DENT10A', 'OPDC03A'], isPrimaryGdrg: 'DENT10A' },
  { procedureCode: 'DENT10C', gdrgCodes: ['DENT10C', 'OPDC03C'], isPrimaryGdrg: 'DENT10C' },
  { procedureCode: 'DENT11A', gdrgCodes: ['DENT11A'],             isPrimaryGdrg: 'DENT11A' },
  { procedureCode: 'DENT11C', gdrgCodes: ['DENT11C'],             isPrimaryGdrg: 'DENT11C' },
  { procedureCode: 'DENT12A', gdrgCodes: ['DENT12A'],             isPrimaryGdrg: 'DENT12A' },
  { procedureCode: 'DENT12C', gdrgCodes: ['DENT12C'],             isPrimaryGdrg: 'DENT12C' },
  { procedureCode: 'DENT13A', gdrgCodes: ['DENT13A'],             isPrimaryGdrg: 'DENT13A' },
  { procedureCode: 'DENT13C', gdrgCodes: ['DENT13C'],             isPrimaryGdrg: 'DENT13C' },
  { procedureCode: 'DENT14A', gdrgCodes: ['DENT14A', 'ENTH09A'], isPrimaryGdrg: 'DENT14A' },
  { procedureCode: 'DENT14C', gdrgCodes: ['DENT14C', 'ENTH09C'], isPrimaryGdrg: 'DENT14C' },
  { procedureCode: 'DENT15A', gdrgCodes: ['DENT15A', 'ZOOM07A'], isPrimaryGdrg: 'DENT15A' },
  { procedureCode: 'DENT15C', gdrgCodes: ['DENT15C', 'ZOOM07C'], isPrimaryGdrg: 'DENT15C' },
  { procedureCode: 'DENT16A', gdrgCodes: ['DENT16A', 'ZOOM05A'], isPrimaryGdrg: 'DENT16A' },
  { procedureCode: 'DENT16C', gdrgCodes: ['DENT16C', 'ZOOM05C'], isPrimaryGdrg: 'DENT16C' },
  { procedureCode: 'DENT17A', gdrgCodes: ['DENT17A'],             isPrimaryGdrg: 'DENT17A' },
  { procedureCode: 'DENT17C', gdrgCodes: ['DENT17C'],             isPrimaryGdrg: 'DENT17C' },
  { procedureCode: 'DENT18A', gdrgCodes: ['DENT18A'],             isPrimaryGdrg: 'DENT18A' },
  { procedureCode: 'DENT18C', gdrgCodes: ['DENT18C'],             isPrimaryGdrg: 'DENT18C' },
  { procedureCode: 'DENT19A', gdrgCodes: ['DENT19A'],             isPrimaryGdrg: 'DENT19A' },
  { procedureCode: 'DENT19C', gdrgCodes: ['DENT19C'],             isPrimaryGdrg: 'DENT19C' },
  { procedureCode: 'DENT20A', gdrgCodes: ['DENT20A'],             isPrimaryGdrg: 'DENT20A' },
  { procedureCode: 'DENT20C', gdrgCodes: ['DENT20C'],             isPrimaryGdrg: 'DENT20C' },
  { procedureCode: 'DENT21A', gdrgCodes: ['DENT21A'],             isPrimaryGdrg: 'DENT21A' },
  { procedureCode: 'DENT21C', gdrgCodes: ['DENT21C'],             isPrimaryGdrg: 'DENT21C' },
  { procedureCode: 'DENT22A', gdrgCodes: ['DENT22A'],             isPrimaryGdrg: 'DENT22A' },
  { procedureCode: 'DENT22C', gdrgCodes: ['DENT22C'],             isPrimaryGdrg: 'DENT22C' },
  { procedureCode: 'DENT23A', gdrgCodes: ['DENT23A'],             isPrimaryGdrg: 'DENT23A' },
  { procedureCode: 'DENT23C', gdrgCodes: ['DENT23C'],             isPrimaryGdrg: 'DENT23C' },
  { procedureCode: 'DENT24A', gdrgCodes: ['DENT24A', 'OPDC03A'], isPrimaryGdrg: 'DENT24A' },
  { procedureCode: 'DENT24C', gdrgCodes: ['DENT24C', 'OPDC03C'], isPrimaryGdrg: 'DENT24C' },

  // ══════════════════════════════════════════════════════════════
  // EAR, NOSE & THROAT (ENTH)
  // ══════════════════════════════════════════════════════════════
  { procedureCode: 'ENTH01A', gdrgCodes: ['ENTH01A', 'OPDC04A'], isPrimaryGdrg: 'ENTH01A' },
  { procedureCode: 'ENTH01C', gdrgCodes: ['ENTH01C', 'OPDC04C'], isPrimaryGdrg: 'ENTH01C' },
  { procedureCode: 'ENTH02A', gdrgCodes: ['ENTH02A', 'OPDC04A'], isPrimaryGdrg: 'ENTH02A' },
  { procedureCode: 'ENTH02C', gdrgCodes: ['ENTH02C', 'OPDC04C'], isPrimaryGdrg: 'ENTH02C' },
  { procedureCode: 'ENTH05A', gdrgCodes: ['ENTH05A'],             isPrimaryGdrg: 'ENTH05A' },
  { procedureCode: 'ENTH05C', gdrgCodes: ['ENTH05C'],             isPrimaryGdrg: 'ENTH05C' },
  { procedureCode: 'ENTH06A', gdrgCodes: ['ENTH06A'],             isPrimaryGdrg: 'ENTH06A' },
  { procedureCode: 'ENTH06C', gdrgCodes: ['ENTH06C'],             isPrimaryGdrg: 'ENTH06C' },
  { procedureCode: 'ENTH07A', gdrgCodes: ['ENTH07A', 'ENTH24A'], isPrimaryGdrg: 'ENTH07A', notes: 'Sinus surgery; ENTH24A if endoscopic approach' },
  { procedureCode: 'ENTH07C', gdrgCodes: ['ENTH07C', 'ENTH24C'], isPrimaryGdrg: 'ENTH07C' },
  { procedureCode: 'ENTH08A', gdrgCodes: ['ENTH08A'],             isPrimaryGdrg: 'ENTH08A' },
  { procedureCode: 'ENTH08C', gdrgCodes: ['ENTH08C'],             isPrimaryGdrg: 'ENTH08C' },
  { procedureCode: 'ENTH09A', gdrgCodes: ['ENTH09A'],             isPrimaryGdrg: 'ENTH09A' },
  { procedureCode: 'ENTH09C', gdrgCodes: ['ENTH09C'],             isPrimaryGdrg: 'ENTH09C' },
  { procedureCode: 'ENTH10A', gdrgCodes: ['ENTH10A'],             isPrimaryGdrg: 'ENTH10A' },
  { procedureCode: 'ENTH10C', gdrgCodes: ['ENTH10C'],             isPrimaryGdrg: 'ENTH10C' },
  { procedureCode: 'ENTH12A', gdrgCodes: ['ENTH12A'],             isPrimaryGdrg: 'ENTH12A' },
  { procedureCode: 'ENTH12C', gdrgCodes: ['ENTH12C'],             isPrimaryGdrg: 'ENTH12C' },
  { procedureCode: 'ENTH13A', gdrgCodes: ['ENTH13A'],             isPrimaryGdrg: 'ENTH13A' },
  { procedureCode: 'ENTH13C', gdrgCodes: ['ENTH13C'],             isPrimaryGdrg: 'ENTH13C' },
  { procedureCode: 'ENTH14A', gdrgCodes: ['ENTH14A', 'OPDC04A'], isPrimaryGdrg: 'ENTH14A' },
  { procedureCode: 'ENTH14C', gdrgCodes: ['ENTH14C', 'OPDC04C'], isPrimaryGdrg: 'ENTH14C' },
  { procedureCode: 'ENTH15A', gdrgCodes: ['ENTH15A'],             isPrimaryGdrg: 'ENTH15A' },
  { procedureCode: 'ENTH15C', gdrgCodes: ['ENTH15C'],             isPrimaryGdrg: 'ENTH15C' },
  { procedureCode: 'ENTH16A', gdrgCodes: ['ENTH16A'],             isPrimaryGdrg: 'ENTH16A' },
  { procedureCode: 'ENTH16C', gdrgCodes: ['ENTH16C'],             isPrimaryGdrg: 'ENTH16C' },
  { procedureCode: 'ENTH17A', gdrgCodes: ['ENTH17A'],             isPrimaryGdrg: 'ENTH17A' },
  { procedureCode: 'ENTH17C', gdrgCodes: ['ENTH17C'],             isPrimaryGdrg: 'ENTH17C' },
  { procedureCode: 'ENTH18A', gdrgCodes: ['ENTH18A'],             isPrimaryGdrg: 'ENTH18A' },
  { procedureCode: 'ENTH18C', gdrgCodes: ['ENTH18C'],             isPrimaryGdrg: 'ENTH18C' },
  { procedureCode: 'ENTH19A', gdrgCodes: ['ENTH19A', 'ASUR05A'], isPrimaryGdrg: 'ENTH19A' },
  { procedureCode: 'ENTH19C', gdrgCodes: ['ENTH19C'],             isPrimaryGdrg: 'ENTH19C' },
  { procedureCode: 'ENTH20A', gdrgCodes: ['ENTH20A', 'OPDC04A'], isPrimaryGdrg: 'ENTH20A' },
  { procedureCode: 'ENTH20C', gdrgCodes: ['ENTH20C', 'OPDC04C'], isPrimaryGdrg: 'ENTH20C' },
  { procedureCode: 'ENTH21A', gdrgCodes: ['ENTH21A', 'OPDC04A'], isPrimaryGdrg: 'ENTH21A' },
  { procedureCode: 'ENTH21C', gdrgCodes: ['ENTH21C', 'OPDC04C'], isPrimaryGdrg: 'ENTH21C' },
  { procedureCode: 'ENTH22A', gdrgCodes: ['ENTH22A', 'OPDC04A'], isPrimaryGdrg: 'ENTH22A' },
  { procedureCode: 'ENTH22C', gdrgCodes: ['ENTH22C', 'OPDC04C'], isPrimaryGdrg: 'ENTH22C' },
  { procedureCode: 'ENTH23A', gdrgCodes: ['ENTH23A', 'OPDC04A'], isPrimaryGdrg: 'ENTH23A' },
  { procedureCode: 'ENTH23C', gdrgCodes: ['ENTH23C', 'OPDC04C'], isPrimaryGdrg: 'ENTH23C' },
  { procedureCode: 'ENTH24A', gdrgCodes: ['ENTH24A'],             isPrimaryGdrg: 'ENTH24A' },
  { procedureCode: 'ENTH24C', gdrgCodes: ['ENTH24C'],             isPrimaryGdrg: 'ENTH24C' },

  // ══════════════════════════════════════════════════════════════
  // OBSTETRICS & GYNAECOLOGY (OBGY)
  // ══════════════════════════════════════════════════════════════
  { procedureCode: 'OBGY01A', gdrgCodes: ['OBGY01A'],             isPrimaryGdrg: 'OBGY01A' },
  { procedureCode: 'OBGY02A', gdrgCodes: ['OBGY02A', 'ZOOM01A'], isPrimaryGdrg: 'OBGY02A' },
  { procedureCode: 'OBGY03A', gdrgCodes: ['OBGY03A', 'ZOOM01A'], isPrimaryGdrg: 'OBGY03A' },
  { procedureCode: 'OBGY04A', gdrgCodes: ['OBGY04A'],             isPrimaryGdrg: 'OBGY04A' },
  { procedureCode: 'OBGY05A', gdrgCodes: ['OBGY05A'],             isPrimaryGdrg: 'OBGY05A' },
  { procedureCode: 'OBGY06A', gdrgCodes: ['OBGY06A'],             isPrimaryGdrg: 'OBGY06A', notes: 'MVA — also OBGY07A if suction curettage' },
  { procedureCode: 'OBGY07A', gdrgCodes: ['OBGY07A'],             isPrimaryGdrg: 'OBGY07A' },
  { procedureCode: 'OBGY08A', gdrgCodes: ['OBGY08A'],             isPrimaryGdrg: 'OBGY08A' },
  { procedureCode: 'OBGY09A', gdrgCodes: ['OBGY09A'],             isPrimaryGdrg: 'OBGY09A' },
  { procedureCode: 'OBGY10A', gdrgCodes: ['OBGY10A'],             isPrimaryGdrg: 'OBGY10A' },
  { procedureCode: 'OBGY11A', gdrgCodes: ['OBGY11A'],             isPrimaryGdrg: 'OBGY11A' },
  { procedureCode: 'OBGY12A', gdrgCodes: ['OBGY12A'],             isPrimaryGdrg: 'OBGY12A' },
  { procedureCode: 'OBGY13A', gdrgCodes: ['OBGY13A'],             isPrimaryGdrg: 'OBGY13A' },
  { procedureCode: 'OBGY14A', gdrgCodes: ['OBGY14A', 'OBGY20A'], isPrimaryGdrg: 'OBGY14A', notes: 'Vaginal hyst; OBGY20A if abdominal approach chosen' },
  { procedureCode: 'OBGY15A', gdrgCodes: ['OBGY15A'],             isPrimaryGdrg: 'OBGY15A' },
  { procedureCode: 'OBGY16A', gdrgCodes: ['OBGY16A'],             isPrimaryGdrg: 'OBGY16A' },
  { procedureCode: 'OBGY17A', gdrgCodes: ['OBGY17A'],             isPrimaryGdrg: 'OBGY17A' },
  { procedureCode: 'OBGY18A', gdrgCodes: ['OBGY18A'],             isPrimaryGdrg: 'OBGY18A' },
  { procedureCode: 'OBGY19A', gdrgCodes: ['OBGY19A'],             isPrimaryGdrg: 'OBGY19A' },
  { procedureCode: 'OBGY20A', gdrgCodes: ['OBGY20A'],             isPrimaryGdrg: 'OBGY20A' },
  { procedureCode: 'OBGY21A', gdrgCodes: ['OBGY21A'],             isPrimaryGdrg: 'OBGY21A' },
  { procedureCode: 'OBGY22A', gdrgCodes: ['OBGY22A'],             isPrimaryGdrg: 'OBGY22A' },
  { procedureCode: 'OBGY23A', gdrgCodes: ['OBGY23A', 'OPDC08A'], isPrimaryGdrg: 'OBGY23A' },
  { procedureCode: 'OBGY24A', gdrgCodes: ['OBGY24A'],             isPrimaryGdrg: 'OBGY24A' },
  { procedureCode: 'OBGY25A', gdrgCodes: ['OBGY25A'],             isPrimaryGdrg: 'OBGY25A' },
  { procedureCode: 'OBGY26A', gdrgCodes: ['OBGY26A', 'ZOOM01A'], isPrimaryGdrg: 'OBGY26A' },
  { procedureCode: 'OBGY27A', gdrgCodes: ['OBGY27A'],             isPrimaryGdrg: 'OBGY27A' },
  { procedureCode: 'OBGY28A', gdrgCodes: ['OBGY28A'],             isPrimaryGdrg: 'OBGY28A' },
  {
    procedureCode: 'OBGY29A',
    gdrgCodes: ['OBGY29A'],
    isPrimaryGdrg: 'OBGY29A',
    notes: 'Instrumental delivery (forceps + vacuum merged under OBGY29 per 2012 manual)'
  },
  { procedureCode: 'OBGY30A', gdrgCodes: ['OBGY30A'],             isPrimaryGdrg: 'OBGY30A' },
  { procedureCode: 'OBGY31A', gdrgCodes: ['OBGY31A'],             isPrimaryGdrg: 'OBGY31A' },
  {
    procedureCode: 'OBGY32A',
    gdrgCodes: ['OBGY32A'],
    isPrimaryGdrg: 'OBGY32A',
    notes: 'Caesarean section'
  },
  {
    procedureCode: 'OBGY34A',
    gdrgCodes: ['OBGY34A'],
    isPrimaryGdrg: 'OBGY34A',
    notes: 'SVD with/without episiotomy (merged from OBGY33+34 per 2012 manual)'
  },
  { procedureCode: 'OBGY35A', gdrgCodes: ['OBGY35A'],             isPrimaryGdrg: 'OBGY35A' },
  { procedureCode: 'OBGY36A', gdrgCodes: ['OBGY36A'],             isPrimaryGdrg: 'OBGY36A' },
  { procedureCode: 'OBGY38A', gdrgCodes: ['OBGY38A'],             isPrimaryGdrg: 'OBGY38A' },
  { procedureCode: 'OBGY39A', gdrgCodes: ['OBGY39A'],             isPrimaryGdrg: 'OBGY39A' },
  { procedureCode: 'OBGY40A', gdrgCodes: ['OBGY40A'],             isPrimaryGdrg: 'OBGY40A' },

  // ══════════════════════════════════════════════════════════════
  // OPHTHALMOLOGY (OPHT)
  // ══════════════════════════════════════════════════════════════
  { procedureCode: 'OPHT01A', gdrgCodes: ['OPHT01A'],             isPrimaryGdrg: 'OPHT01A' },
  { procedureCode: 'OPHT01C', gdrgCodes: ['OPHT01C'],             isPrimaryGdrg: 'OPHT01C' },
  { procedureCode: 'OPHT02A', gdrgCodes: ['OPHT02A'],             isPrimaryGdrg: 'OPHT02A' },
  { procedureCode: 'OPHT02C', gdrgCodes: ['OPHT02C'],             isPrimaryGdrg: 'OPHT02C' },
  { procedureCode: 'OPHT03A', gdrgCodes: ['OPHT03A', 'OPDC05A'], isPrimaryGdrg: 'OPHT03A' },
  { procedureCode: 'OPHT03C', gdrgCodes: ['OPHT03C', 'OPDC05C'], isPrimaryGdrg: 'OPHT03C' },
  { procedureCode: 'OPHT04A', gdrgCodes: ['OPHT04A'],             isPrimaryGdrg: 'OPHT04A' },
  { procedureCode: 'OPHT04C', gdrgCodes: ['OPHT04C'],             isPrimaryGdrg: 'OPHT04C' },
  { procedureCode: 'OPHT05A', gdrgCodes: ['OPHT05A'],             isPrimaryGdrg: 'OPHT05A' },
  { procedureCode: 'OPHT05C', gdrgCodes: ['OPHT05C'],             isPrimaryGdrg: 'OPHT05C' },
  { procedureCode: 'OPHT06A', gdrgCodes: ['OPHT06A', 'OPDC05A'], isPrimaryGdrg: 'OPHT06A' },
  { procedureCode: 'OPHT06C', gdrgCodes: ['OPHT06C', 'OPDC05C'], isPrimaryGdrg: 'OPHT06C' },
  { procedureCode: 'OPHT07A', gdrgCodes: ['OPHT07A'],             isPrimaryGdrg: 'OPHT07A' },
  { procedureCode: 'OPHT07C', gdrgCodes: ['OPHT07C'],             isPrimaryGdrg: 'OPHT07C' },
  { procedureCode: 'OPHT08A', gdrgCodes: ['OPHT08A'],             isPrimaryGdrg: 'OPHT08A' },
  { procedureCode: 'OPHT08C', gdrgCodes: ['OPHT08C'],             isPrimaryGdrg: 'OPHT08C' },
  { procedureCode: 'OPHT09A', gdrgCodes: ['OPHT09A'],             isPrimaryGdrg: 'OPHT09A' },
  { procedureCode: 'OPHT09C', gdrgCodes: ['OPHT09C'],             isPrimaryGdrg: 'OPHT09C' },
  {
    procedureCode: 'OPHT10A',
    gdrgCodes: ['OPHT10A', 'OPHT18A'],
    isPrimaryGdrg: 'OPHT10A',
    notes: 'Without IOL = OPHT10A; with IOL implant = OPHT18A'
  },
  { procedureCode: 'OPHT10C', gdrgCodes: ['OPHT10C'],             isPrimaryGdrg: 'OPHT10C' },
  {
    procedureCode: 'OPHT18A',
    gdrgCodes: ['OPHT18A'],
    isPrimaryGdrg: 'OPHT18A',
    notes: 'Cataract with IOL — introduced 2012'
  },

  // ══════════════════════════════════════════════════════════════
  // ORTHOPAEDICS (ORTH)
  // ══════════════════════════════════════════════════════════════
  { procedureCode: 'ORTH01A', gdrgCodes: ['ORTH01A', 'ZOOM05A'], isPrimaryGdrg: 'ORTH01A' },
  { procedureCode: 'ORTH01C', gdrgCodes: ['ORTH01C', 'ZOOM05C'], isPrimaryGdrg: 'ORTH01C' },
  { procedureCode: 'ORTH02A', gdrgCodes: ['ORTH02A'],             isPrimaryGdrg: 'ORTH02A' },
  { procedureCode: 'ORTH02C', gdrgCodes: ['ORTH02C'],             isPrimaryGdrg: 'ORTH02C' },
  { procedureCode: 'ORTH03A', gdrgCodes: ['ORTH03A'],             isPrimaryGdrg: 'ORTH03A' },
  { procedureCode: 'ORTH03C', gdrgCodes: ['ORTH03C'],             isPrimaryGdrg: 'ORTH03C' },
  { procedureCode: 'ORTH04A', gdrgCodes: ['ORTH04A'],             isPrimaryGdrg: 'ORTH04A' },
  { procedureCode: 'ORTH04C', gdrgCodes: ['ORTH04C'],             isPrimaryGdrg: 'ORTH04C' },
  { procedureCode: 'ORTH05A', gdrgCodes: ['ORTH05A', 'ZOOM07A'], isPrimaryGdrg: 'ORTH05A' },
  { procedureCode: 'ORTH05C', gdrgCodes: ['ORTH05C', 'ZOOM07C'], isPrimaryGdrg: 'ORTH05C' },
  { procedureCode: 'ORTH07A', gdrgCodes: ['ORTH07A'],             isPrimaryGdrg: 'ORTH07A' },
  { procedureCode: 'ORTH07C', gdrgCodes: ['ORTH07C'],             isPrimaryGdrg: 'ORTH07C' },
  { procedureCode: 'ORTH08A', gdrgCodes: ['ORTH08A'],             isPrimaryGdrg: 'ORTH08A' },
  { procedureCode: 'ORTH08C', gdrgCodes: ['ORTH08C'],             isPrimaryGdrg: 'ORTH08C' },
  { procedureCode: 'ORTH09A', gdrgCodes: ['ORTH09A'],             isPrimaryGdrg: 'ORTH09A' },
  { procedureCode: 'ORTH09C', gdrgCodes: ['ORTH09C'],             isPrimaryGdrg: 'ORTH09C' },
  { procedureCode: 'ORTH10A', gdrgCodes: ['ORTH10A'],             isPrimaryGdrg: 'ORTH10A' },
  { procedureCode: 'ORTH10C', gdrgCodes: ['ORTH10C'],             isPrimaryGdrg: 'ORTH10C' },
  { procedureCode: 'ORTH11A', gdrgCodes: ['ORTH11A', 'ZOOM07A'], isPrimaryGdrg: 'ORTH11A' },
  { procedureCode: 'ORTH11C', gdrgCodes: ['ORTH11C', 'ZOOM07C'], isPrimaryGdrg: 'ORTH11C' },
  { procedureCode: 'ORTH12A', gdrgCodes: ['ORTH12A'],             isPrimaryGdrg: 'ORTH12A' },
  { procedureCode: 'ORTH12C', gdrgCodes: ['ORTH12C'],             isPrimaryGdrg: 'ORTH12C' },
  { procedureCode: 'ORTH14A', gdrgCodes: ['ORTH14A'],             isPrimaryGdrg: 'ORTH14A' },
  { procedureCode: 'ORTH14C', gdrgCodes: ['ORTH14C'],             isPrimaryGdrg: 'ORTH14C' },
  { procedureCode: 'ORTH15A', gdrgCodes: ['ORTH15A'],             isPrimaryGdrg: 'ORTH15A' },
  { procedureCode: 'ORTH15C', gdrgCodes: ['ORTH15C'],             isPrimaryGdrg: 'ORTH15C' },
  { procedureCode: 'ORTH16A', gdrgCodes: ['ORTH16A'],             isPrimaryGdrg: 'ORTH16A' },
  { procedureCode: 'ORTH16C', gdrgCodes: ['ORTH16C'],             isPrimaryGdrg: 'ORTH16C' },
  {
    procedureCode: 'ORTH17A',
    gdrgCodes: ['ORTH17A', 'ORTH12A'],
    isPrimaryGdrg: 'ORTH17A',
    notes: 'ORIF — ORTH12A if internal fixation alone without open reduction'
  },
  { procedureCode: 'ORTH17C', gdrgCodes: ['ORTH17C', 'ORTH12C'], isPrimaryGdrg: 'ORTH17C' },
  { procedureCode: 'ORTH18A', gdrgCodes: ['ORTH18A'],             isPrimaryGdrg: 'ORTH18A' },
  { procedureCode: 'ORTH18C', gdrgCodes: ['ORTH18C'],             isPrimaryGdrg: 'ORTH18C' },
  { procedureCode: 'ORTH19A', gdrgCodes: ['ORTH19A'],             isPrimaryGdrg: 'ORTH19A' },
  { procedureCode: 'ORTH19C', gdrgCodes: ['ORTH19C'],             isPrimaryGdrg: 'ORTH19C' },
  { procedureCode: 'ORTH20A', gdrgCodes: ['ORTH20A'],             isPrimaryGdrg: 'ORTH20A' },
  { procedureCode: 'ORTH20C', gdrgCodes: ['ORTH20C'],             isPrimaryGdrg: 'ORTH20C' },
  { procedureCode: 'ORTH22A', gdrgCodes: ['ORTH22A'],             isPrimaryGdrg: 'ORTH22A' },
  { procedureCode: 'ORTH22C', gdrgCodes: ['ORTH22C'],             isPrimaryGdrg: 'ORTH22C' },
  { procedureCode: 'ORTH23A', gdrgCodes: ['ORTH23A'],             isPrimaryGdrg: 'ORTH23A' },
  { procedureCode: 'ORTH23C', gdrgCodes: ['ORTH23C'],             isPrimaryGdrg: 'ORTH23C' },
  {
    procedureCode: 'ORTH24A',
    gdrgCodes: ['ORTH24A'],
    isPrimaryGdrg: 'ORTH24A',
    notes: 'Conservative head/spinal injury management — introduced 2012'
  },
  { procedureCode: 'ORTH24C', gdrgCodes: ['ORTH24C'],             isPrimaryGdrg: 'ORTH24C' },
  { procedureCode: 'ORTH25A', gdrgCodes: ['ORTH25A', 'ASUR35A'], isPrimaryGdrg: 'ORTH25A' },
  { procedureCode: 'ORTH25C', gdrgCodes: ['ORTH25C'],             isPrimaryGdrg: 'ORTH25C' },
  { procedureCode: 'ORTH26A', gdrgCodes: ['ORTH26A', 'ASUR36A'], isPrimaryGdrg: 'ORTH26A' },
  { procedureCode: 'ORTH26C', gdrgCodes: ['ORTH26C'],             isPrimaryGdrg: 'ORTH26C' },
  { procedureCode: 'ORTH27A', gdrgCodes: ['ORTH27A', 'ASUR37A'], isPrimaryGdrg: 'ORTH27A' },
  { procedureCode: 'ORTH27C', gdrgCodes: ['ORTH27C'],             isPrimaryGdrg: 'ORTH27C' },

  // ══════════════════════════════════════════════════════════════
  // PAEDIATRIC SURGERY (PSUR) — children <12
  // ══════════════════════════════════════════════════════════════
  { procedureCode: 'PSUR01C', gdrgCodes: ['PSUR01C'],             isPrimaryGdrg: 'PSUR01C' },
  { procedureCode: 'PSUR02C', gdrgCodes: ['PSUR02C'],             isPrimaryGdrg: 'PSUR02C' },
  { procedureCode: 'PSUR03C', gdrgCodes: ['PSUR03C'],             isPrimaryGdrg: 'PSUR03C' },
  { procedureCode: 'PSUR04C', gdrgCodes: ['PSUR04C'],             isPrimaryGdrg: 'PSUR04C' },
  { procedureCode: 'PSUR05C', gdrgCodes: ['PSUR05C'],             isPrimaryGdrg: 'PSUR05C' },
  { procedureCode: 'PSUR06C', gdrgCodes: ['PSUR06C'],             isPrimaryGdrg: 'PSUR06C' },
  { procedureCode: 'PSUR07C', gdrgCodes: ['PSUR07C'],             isPrimaryGdrg: 'PSUR07C' },
  { procedureCode: 'PSUR08C', gdrgCodes: ['PSUR08C'],             isPrimaryGdrg: 'PSUR08C' },
  { procedureCode: 'PSUR09C', gdrgCodes: ['PSUR09C'],             isPrimaryGdrg: 'PSUR09C' },
  { procedureCode: 'PSUR10C', gdrgCodes: ['PSUR10C'],             isPrimaryGdrg: 'PSUR10C' },
  { procedureCode: 'PSUR11C', gdrgCodes: ['PSUR11C'],             isPrimaryGdrg: 'PSUR11C' },
  { procedureCode: 'PSUR12C', gdrgCodes: ['PSUR12C'],             isPrimaryGdrg: 'PSUR12C' },
  { procedureCode: 'PSUR14C', gdrgCodes: ['PSUR14C'],             isPrimaryGdrg: 'PSUR14C' },
  { procedureCode: 'PSUR15C', gdrgCodes: ['PSUR15C'],             isPrimaryGdrg: 'PSUR15C' },
  { procedureCode: 'PSUR16C', gdrgCodes: ['PSUR16C'],             isPrimaryGdrg: 'PSUR16C' },
  { procedureCode: 'PSUR17C', gdrgCodes: ['PSUR17C'],             isPrimaryGdrg: 'PSUR17C' },
  { procedureCode: 'PSUR18C', gdrgCodes: ['PSUR18C'],             isPrimaryGdrg: 'PSUR18C' },
  { procedureCode: 'PSUR19C', gdrgCodes: ['PSUR19C'],             isPrimaryGdrg: 'PSUR19C' },
  { procedureCode: 'PSUR20C', gdrgCodes: ['PSUR20C'],             isPrimaryGdrg: 'PSUR20C' },
  { procedureCode: 'PSUR21C', gdrgCodes: ['PSUR21C'],             isPrimaryGdrg: 'PSUR21C' },
  { procedureCode: 'PSUR23C', gdrgCodes: ['PSUR23C'],             isPrimaryGdrg: 'PSUR23C' },
  { procedureCode: 'PSUR24C', gdrgCodes: ['PSUR24C'],             isPrimaryGdrg: 'PSUR24C' },
  { procedureCode: 'PSUR25C', gdrgCodes: ['PSUR25C'],             isPrimaryGdrg: 'PSUR25C' },
  { procedureCode: 'PSUR27C', gdrgCodes: ['PSUR27C'],             isPrimaryGdrg: 'PSUR27C' },
  { procedureCode: 'PSUR28C', gdrgCodes: ['PSUR28C'],             isPrimaryGdrg: 'PSUR28C' },

  // ══════════════════════════════════════════════════════════════
  // RECONSTRUCTIVE SURGERY (RSUR)
  // Note: manual uses RSURO (letter O not zero) in some codes
  // ══════════════════════════════════════════════════════════════
  { procedureCode: 'RSURO1A', gdrgCodes: ['RSURO1A'],             isPrimaryGdrg: 'RSURO1A' },
  { procedureCode: 'RSURO1C', gdrgCodes: ['RSURO1C'],             isPrimaryGdrg: 'RSURO1C' },
  { procedureCode: 'RSURO2A', gdrgCodes: ['RSURO2A'],             isPrimaryGdrg: 'RSURO2A' },
  { procedureCode: 'RSURO2C', gdrgCodes: ['RSURO2C'],             isPrimaryGdrg: 'RSURO2C' },
  {
    procedureCode: 'RSURO3A',
    gdrgCodes: ['RSURO3A', 'ZOOM05A'],
    isPrimaryGdrg: 'RSURO3A',
    notes: 'Excisional debridement + dressing; ZOOM05A for simple dressing change only'
  },
  { procedureCode: 'RSURO3C', gdrgCodes: ['RSURO3C', 'ZOOM05C'], isPrimaryGdrg: 'RSURO3C' },
  { procedureCode: 'RSURO4A', gdrgCodes: ['RSURO4A', 'ZOOM07A'], isPrimaryGdrg: 'RSURO4A' },
  { procedureCode: 'RSURO4C', gdrgCodes: ['RSURO4C', 'ZOOM07C'], isPrimaryGdrg: 'RSURO4C' },
  { procedureCode: 'RSURO5A', gdrgCodes: ['RSURO5A'],             isPrimaryGdrg: 'RSURO5A' },
  { procedureCode: 'RSURO5C', gdrgCodes: ['RSURO5C'],             isPrimaryGdrg: 'RSURO5C' },
  { procedureCode: 'RSURO6A', gdrgCodes: ['RSURO6A'],             isPrimaryGdrg: 'RSURO6A' },
  { procedureCode: 'RSURO6C', gdrgCodes: ['RSURO6C'],             isPrimaryGdrg: 'RSURO6C' },
  { procedureCode: 'RSURO7A', gdrgCodes: ['RSURO7A', 'ASUR30A'], isPrimaryGdrg: 'RSURO7A' },
  { procedureCode: 'RSURO7C', gdrgCodes: ['RSURO7C'],             isPrimaryGdrg: 'RSURO7C' },
  { procedureCode: 'RSURO8A', gdrgCodes: ['RSURO8A'],             isPrimaryGdrg: 'RSURO8A' },
  { procedureCode: 'RSURO8C', gdrgCodes: ['RSURO8C'],             isPrimaryGdrg: 'RSURO8C' },
  { procedureCode: 'RSURO9A', gdrgCodes: ['RSURO9A'],             isPrimaryGdrg: 'RSURO9A' },
  { procedureCode: 'RSURO9C', gdrgCodes: ['RSURO9C'],             isPrimaryGdrg: 'RSURO9C' },
  { procedureCode: 'RSUR10A', gdrgCodes: ['RSUR10A'],             isPrimaryGdrg: 'RSUR10A' },
  { procedureCode: 'RSUR10C', gdrgCodes: ['RSUR10C'],             isPrimaryGdrg: 'RSUR10C' },
  { procedureCode: 'RSUR11A', gdrgCodes: ['RSUR11A'],             isPrimaryGdrg: 'RSUR11A' },
  { procedureCode: 'RSUR11C', gdrgCodes: ['RSUR11C'],             isPrimaryGdrg: 'RSUR11C' },
  { procedureCode: 'RSUR12A', gdrgCodes: ['RSUR12A'],             isPrimaryGdrg: 'RSUR12A' },
  { procedureCode: 'RSUR12C', gdrgCodes: ['RSUR12C'],             isPrimaryGdrg: 'RSUR12C' },
  { procedureCode: 'RSUR13A', gdrgCodes: ['RSUR13A'],             isPrimaryGdrg: 'RSUR13A' },
  { procedureCode: 'RSUR13C', gdrgCodes: ['RSUR13C'],             isPrimaryGdrg: 'RSUR13C' },
  { procedureCode: 'RSUR14A', gdrgCodes: ['RSUR14A'],             isPrimaryGdrg: 'RSUR14A' },
  { procedureCode: 'RSUR14C', gdrgCodes: ['RSUR14C'],             isPrimaryGdrg: 'RSUR14C' },
  { procedureCode: 'RSUR15A', gdrgCodes: ['RSUR15A', 'ZOOM07A'], isPrimaryGdrg: 'RSUR15A' },
  { procedureCode: 'RSUR15C', gdrgCodes: ['RSUR15C', 'ZOOM07C'], isPrimaryGdrg: 'RSUR15C' },

  // ══════════════════════════════════════════════════════════════
  // ZOOM — Cross-MDC codes (apply across specialties)
  // ══════════════════════════════════════════════════════════════
  {
    procedureCode: 'ZOOM01A',
    gdrgCodes: ['ZOOM01A'],
    isPrimaryGdrg: 'ZOOM01A',
    notes: 'Rigid & flexible endoscopy — billable alongside specialist GDRG'
  },
  { procedureCode: 'ZOOM01C', gdrgCodes: ['ZOOM01C'],             isPrimaryGdrg: 'ZOOM01C' },
  { procedureCode: 'ZOOM02A', gdrgCodes: ['ZOOM02A'],             isPrimaryGdrg: 'ZOOM02A' },
  { procedureCode: 'ZOOM02C', gdrgCodes: ['ZOOM02C'],             isPrimaryGdrg: 'ZOOM02C' },
  { procedureCode: 'ZOOM03A', gdrgCodes: ['ZOOM03A'],             isPrimaryGdrg: 'ZOOM03A' },
  { procedureCode: 'ZOOM03C', gdrgCodes: ['ZOOM03C'],             isPrimaryGdrg: 'ZOOM03C' },
  { procedureCode: 'ZOOM04A', gdrgCodes: ['ZOOM04A'],             isPrimaryGdrg: 'ZOOM04A' },
  { procedureCode: 'ZOOM04C', gdrgCodes: ['ZOOM04C'],             isPrimaryGdrg: 'ZOOM04C' },
  { procedureCode: 'ZOOM05A', gdrgCodes: ['ZOOM05A'],             isPrimaryGdrg: 'ZOOM05A' },
  { procedureCode: 'ZOOM05C', gdrgCodes: ['ZOOM05C'],             isPrimaryGdrg: 'ZOOM05C' },
  {
    procedureCode: 'ZOOM06A',
    gdrgCodes: ['ZOOM06A', 'ASUR27A'],
    isPrimaryGdrg: 'ZOOM06A',
    notes: 'Elective circumcision = ZOOM06A; emergency = ASUR27A'
  },
  { procedureCode: 'ZOOM06C', gdrgCodes: ['ZOOM06C'],             isPrimaryGdrg: 'ZOOM06C' },
  { procedureCode: 'ZOOM07A', gdrgCodes: ['ZOOM07A'],             isPrimaryGdrg: 'ZOOM07A' },
  { procedureCode: 'ZOOM07C', gdrgCodes: ['ZOOM07C'],             isPrimaryGdrg: 'ZOOM07C' },
  {
    procedureCode: 'ZOOM08A',
    gdrgCodes: ['ZOOM08A'],
    isPrimaryGdrg: 'ZOOM08A',
    notes: 'Tubal ligation — family planning'
  },
  { procedureCode: 'ZOOM09A', gdrgCodes: ['ZOOM09A'],             isPrimaryGdrg: 'ZOOM09A' },
  { procedureCode: 'ZOOM10A', gdrgCodes: ['ZOOM10A'],             isPrimaryGdrg: 'ZOOM10A' },
  { procedureCode: 'ZOOM11A', gdrgCodes: ['ZOOM11A'],             isPrimaryGdrg: 'ZOOM11A' },
  { procedureCode: 'ZOOM12A', gdrgCodes: ['ZOOM12A'],             isPrimaryGdrg: 'ZOOM12A' },
  { procedureCode: 'ZOOM13A', gdrgCodes: ['ZOOM13A'],             isPrimaryGdrg: 'ZOOM13A' },

  // ══════════════════════════════════════════════════════════════
  // CUSTOM / LAPAROSCOPIC PROCEDURES
  // Mapped to nearest NHIA equivalent per Annex C matching rules.
  // tariffGhC = null means tariff must be negotiated/confirmed with NHIA.
  // ══════════════════════════════════════════════════════════════
  {
    procedureCode: 'surg01L',
    gdrgCodes: ['ASUR08A', 'PSUR12C', 'ZOOM01A'],
    isPrimaryGdrg: 'ASUR08A',
    notes: 'Laparoscopic appendectomy → ASUR08A (adult peritonitis/laparotomy) or PSUR12C (child appendicectomy). ZOOM01A for endoscopy component.'
  },
  {
    procedureCode: 'surg02L',
    gdrgCodes: ['ASUR20A', 'ASUR19A', 'ZOOM01A'],
    isPrimaryGdrg: 'ASUR20A',
    notes: 'Laparoscopic hernia repair → ASUR20A (external) or ASUR19A (internal). ZOOM01A for endoscopy.'
  },
  {
    procedureCode: 'surg12L',
    gdrgCodes: ['ASUR17A', 'ZOOM01A'],
    isPrimaryGdrg: 'ASUR17A',
    notes: 'Laparoscopic cholecystectomy → ASUR17A (biliary surgery). ZOOM01A for endoscopy component.'
  },
  {
    procedureCode: 'surg17L',
    gdrgCodes: ['ASUR30A', 'ZOOM01A'],
    isPrimaryGdrg: 'ASUR30A',
    notes: 'Diagnostic laparoscopy with biopsy → ASUR30A (excision biopsy) + ZOOM01A (endoscopy).'
  },
  {
    procedureCode: 'dent04M',
    gdrgCodes: ['DENT08A', 'DENT08C'],
    isPrimaryGdrg: 'DENT08A',
    notes: 'Multi-canal RCT → DENT08A base + modifier prefix per manual (e.g. 02DENT08A for 2 canals).'
  },
  {
    procedureCode: 'neuro01A',
    gdrgCodes: ['ASUR29A', 'MEDI30A'],
    isPrimaryGdrg: 'MEDI30A',
    notes: 'Lumbar puncture for meningitis → MEDI30A (systemic infection) is the primary admission GDRG. ASUR29A if neurosurgical context.'
  },
  {
    procedureCode: 'urol01A',
    gdrgCodes: ['ASUR21A', 'ASUR28A', 'ZOOM04A'],
    isPrimaryGdrg: 'ASUR28A',
    notes: 'Suprapubic catheter → ASUR28A (genitourinary surgery) or ASUR21A (urethra). ZOOM04A for catheter change follow-up.'
  },
];


// ─────────────────────────────────────────────────────────────────────────────
// SEED RUNNER
// ─────────────────────────────────────────────────────────────────────────────

async function seedProcedureGDRGLinks() {
  console.log('🔗 Starting ProcedureTemplate ↔ GDRGTariff link seeding...\n');
  console.log('ℹ️  NOTE: GDRGTariffProcedure.procedureId references ServiceCatalog.id');
  console.log('   Resolving via ServiceCatalog.procedureTemplateId → ProcedureTemplate.procedureCode\n');

  let created        = 0;
  let skipped        = 0;
  let procNotFound   = 0;
  let gdrgNotFound   = 0;
  let catalogNotFound = 0;
  const errors: string[] = [];

  // ── Step 1: Fetch all ProcedureTemplates keyed by procedureCode ─────────
  const allTemplates = await prisma.procedureTemplate.findMany({
    select: { id: true, procedureCode: true, name: true }
  });
  const templateMap = new Map(allTemplates.map(t => [t.procedureCode, t]));

  // ── Step 2: Fetch ServiceCatalog rows that link to a ProcedureTemplate ──
  // GDRGTariffProcedure.procedureId = ServiceCatalog.id (not ProcedureTemplate.id)
  // so we need the ServiceCatalog ID for each template.
  const allCatalogs = await prisma.serviceCatalog.findMany({
    where: { procedureTemplateId: { not: null } },
    select: { id: true, procedureTemplateId: true, name: true }
  });

  // Map: ProcedureTemplate.id → ServiceCatalog.id
  const templateIdToCatalogId = new Map(
    allCatalogs
      .filter(c => c.procedureTemplateId)
      .map(c => [c.procedureTemplateId!, c.id])
  );

  // ── Step 3: Build final map: procedureCode → ServiceCatalog.id ──────────
  // procedureCode → templateId → catalogId
  const procedureCodeToCatalogId = new Map<string, string>();
  for (const [code, template] of templateMap.entries()) {
    const catalogId = templateIdToCatalogId.get(template.id);
    if (catalogId) {
      procedureCodeToCatalogId.set(code, catalogId);
    }
  }

  // ── Step 4: GDRG Tariffs ─────────────────────────────────────────────────
  const allTariffs = await prisma.gDRGTariff.findMany({
    select: { id: true, gdrgCode: true, description: true }
  });
  const tariffMap = new Map(allTariffs.map(t => [t.gdrgCode, t]));

  console.log(`📋 Found:`);
  console.log(`   ${allTemplates.length} procedure templates`);
  console.log(`   ${allCatalogs.length} ServiceCatalog rows with procedureTemplateId`);
  console.log(`   ${procedureCodeToCatalogId.size} templates resolved to a ServiceCatalog ID`);
  console.log(`   ${allTariffs.length} GDRG tariffs\n`);

  // ── Warn about templates with no ServiceCatalog entry ───────────────────
  const mappedCodes = new Set(MAPPINGS.map(m => m.procedureCode));
  const unmappedTemplates = allTemplates.filter(
    t => mappedCodes.has(t.procedureCode) && !procedureCodeToCatalogId.has(t.procedureCode)
  );
  if (unmappedTemplates.length > 0) {
    console.log(`⚠️  ${unmappedTemplates.length} mapped procedure(s) have NO ServiceCatalog entry — they will be skipped:`);
    unmappedTemplates.forEach(t => console.log(`   - ${t.procedureCode}: ${t.name}`));
    console.log('   → Create a ServiceCatalog row with procedureTemplateId set for each of these.\n');
    skipped += unmappedTemplates.length;
  }

  // ── Main loop ─────────────────────────────────────────────────────────────
  for (const mapping of MAPPINGS) {
    // 1. Does the ProcedureTemplate exist?
    const template = templateMap.get(mapping.procedureCode);
    if (!template) {
      procNotFound++;
      errors.push(`⚠️  ProcedureTemplate not found: ${mapping.procedureCode}`);
      continue;
    }

    // 2. Is there a ServiceCatalog row pointing to this template?
    const serviceCatalogId = procedureCodeToCatalogId.get(mapping.procedureCode);
    if (!serviceCatalogId) {
      catalogNotFound++;
      // Already reported above — just count it, don't flood the error list
      continue;
    }

    for (const gdrgCode of mapping.gdrgCodes) {
      const tariff = tariffMap.get(gdrgCode);
      if (!tariff) {
        gdrgNotFound++;
        errors.push(`⚠️  GDRG tariff not found: ${gdrgCode} (for procedure ${mapping.procedureCode})`);
        continue;
      }

      const isPrimary = gdrgCode === mapping.isPrimaryGdrg;

      try {
        // procedureId here = ServiceCatalog.id — that's what the FK expects
        await prisma.gDRGTariffProcedure.upsert({
          where: {
            gdrgTariffId_procedureId: {
              gdrgTariffId: tariff.id,
              procedureId:  serviceCatalogId,
            }
          },
          update: {
            isPrimary,
            mappedCode: mapping.procedureCode,
          },
          create: {
            gdrgTariffId: tariff.id,
            procedureId:  serviceCatalogId,
            isPrimary,
            mappedCode:   mapping.procedureCode,
          }
        });
        created++;
      } catch (err: any) {
        errors.push(`❌ DB error for ${mapping.procedureCode} → ${gdrgCode}: ${err.message}`);
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log('✅  SEED COMPLETE');
  console.log(`    Links created/updated      : ${created}`);
  console.log(`    Templates not in DB        : ${procNotFound}`);
  console.log(`    No ServiceCatalog entry    : ${catalogNotFound}`);
  console.log(`    GDRGs not in DB            : ${gdrgNotFound}`);
  console.log(`    Templates w/o mapping      : ${skipped}`);
  console.log(`    Mappings processed         : ${MAPPINGS.length}`);
  console.log('════════════════════════════════════════════\n');
  console.log('💡 TIP: "No ServiceCatalog entry" means the ProcedureTemplate exists');
  console.log('   but has no ServiceCatalog row with procedureTemplateId pointing to it.');
  console.log('   Run your ServiceCatalog seed first, then re-run this script.\n');

  if (errors.length > 0) {
    console.log('⚠️  Warnings / Errors:');
    errors.forEach(e => console.log('   ' + e));
  }

  await prisma.$disconnect();
}

seedProcedureGDRGLinks().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
// At the very bottom of procedureGdrgLink.ts

// ✅ Export the function so it can be imported
export { seedProcedureGDRGLinks };

// Then call it (only when file is run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  seedProcedureGDRGLinks().catch(async (e) => {
    console.error('Fatal error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
}