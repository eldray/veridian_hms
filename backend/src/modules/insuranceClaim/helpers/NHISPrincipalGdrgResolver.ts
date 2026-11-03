import { ValidationError } from '../../../utils/errors';

/**
 * Which G-DRG is the principal one for this encounter.
 *
 * Rule source: the August 2026 batch this facility submitted (2,097 claims) plus the NHIS Tariffs
 * Operation Manual as recorded in NHIS_claims_chatbot_prompt.md. The submitted file is unambiguous
 * about the four case types:
 *
 *   OPD  1,757 claims — principal is always an outpatient code: OPDC06A 950, OPDC06C 709,
 *        OPDC02A 32 (antenatal), ZOOM02/05/07 66 (day procedures and observation).
 *   IPD    340 claims — principal is always a clinical family: MEDI 194, PAED 120, OBGY 21,
 *        ASUR 5. Not one OPD or ZOOM code appears, and each sends two dates (the stay endpoints).
 *
 * So the case type is decided first, then the diagnosis's own links are narrowed to the codes that
 * case type can bill. A diagnosis linked to both MEDI31A and OPDC06A is not a coin flip.
 */

export type NHISCaseType = 'anc' | 'opd' | 'zoom' | 'ipd';

/** The tariff shape this resolver needs; a Prisma GDRGTariff row satisfies it. */
export type ResolverTariff = {
  id: string;
  gdrgCode: string;
  mdc: string;
  nhiaTariff: unknown;
  minAgeYears: number | null;
  maxAgeYears: number | null;
  applicableLevels: number[] | null;
  isZoomCode: boolean | null;
  isAntenatal: boolean | null;
  description?: string | null;
  nhisServiceCode?: string | null;
};

export type ResolverLink = {
  tariff: ResolverTariff;
  /** GDRGTariffDiagnosis.isPrimary / GDRGTariffProcedure.isPrimary — the editor's own ranking. */
  isPrimary: boolean;
  origin: 'diagnosis' | 'procedure';
  /** What the link points at, for the error message when nothing can be billed. */
  label?: string;
};

export type ResolverInput = {
  caseType: NHISCaseType;
  age: number;
  /** The facility's NHIS level (1 tertiary ... 10 CHPS), or null when the record does not say. */
  facilityLevel: number | null;
  links: ResolverLink[];
  /**
   * Standalone codes the case can fall back to when no link fits: the general OPD code for an
   * outpatient visit, the detention code for an observation stay, the antenatal code for ANC/PNC.
   */
  fallbacks: ResolverTariff[];
  /** An operation or delivery was performed, so its own G-DRG outranks the diagnosis's one. */
  isSurgicalCase?: boolean;
};

export type ResolvedPrincipalGdrg = {
  tariff: ResolverTariff;
  caseType: NHISCaseType;
  origin: 'diagnosis' | 'procedure' | 'fallback';
  reason: string;
};

const OPD_SCHEME_FAMILY = 'OPDC';
const DAY_CASE_FAMILY = 'ZOOM';

/**
 * The general codes a case falls back to when nothing linked to the diagnosis fits it: the general
 * OPD consultation, the detention-for-observation day case, and the bundled antenatal/postnatal code.
 */
export const NHIS_FALLBACK_GDRG_CODES = ['OPDC02A', 'OPDC06A', 'OPDC06C', 'ZOOM02A', 'ZOOM02C'];

/** The NHIS facility level the tariff schedule's applicableLevels column counts in. */
export function facilityLevelFromType(nhisFacilityType: unknown): number | null {
  switch (String(nhisFacilityType ?? '').trim()) {
    case 'Tertiary': return 1;
    case 'Secondary': return 2;
    case 'Primary': return 3;
    case 'Health_Center': return 4;
    case 'Maternity_Home': return 5;
    case 'Clinic': return 6;
    case 'CHPS': return 10;
    default: return null;
  }
}

/**
 * The encounter's case type, which is what decides the principal G-DRG family.
 *
 * A bed decides the case before the visit's label does. A day case and a detention stay bill a ZOOM
 * code and go out as OPD; any other admission — and a surgical or delivery attendance, which is an
 * admission in all but name — bills its clinical family. Only a pregnancy or postnatal visit that was
 * never admitted bills the bundled antenatal OPD code: an admitted pregnancy is an obstetric
 * inpatient case (OBGY), so reading the label first would price it as OPDC02A on an IPD header.
 */
export function nhisCaseType(input: {
  attendanceType?: string | null;
  encounterCategory?: string | null;
  admissionType?: string | null;
  hasAdmission?: boolean;
}): NHISCaseType {
  if (input.encounterCategory === 'daycase' || input.admissionType === 'detention_observation') return 'zoom';
  if (input.hasAdmission || input.attendanceType === 'surgery' || input.attendanceType === 'delivery') return 'ipd';
  if (input.attendanceType === 'antenatal' || input.attendanceType === 'postnatal') return 'anc';
  return 'opd';
}

const familyOf = (code: unknown): string =>
  /^[A-Z]+/.exec(String(code ?? '').trim().toUpperCase())?.[0] ?? '';

const amountOf = (value: unknown): number => {
  const n = Number(String(value ?? '').trim());
  return Number.isFinite(n) ? n : 0;
};

function ageMatches(tariff: ResolverTariff, age: number): boolean {
  const min = tariff.minAgeYears;
  const max = tariff.maxAgeYears;
  if (min != null && age < min) return false;
  if (max != null && age > max) return false;
  return true;
}

function levelMatches(tariff: ResolverTariff, facilityLevel: number | null): boolean {
  const levels = tariff.applicableLevels;
  if (!levels || levels.length === 0) return true;
  if (facilityLevel == null) return true;
  return levels.includes(facilityLevel);
}

/** Whether this case type may bill this code at all. */
function caseMatches(tariff: ResolverTariff, caseType: NHISCaseType): boolean {
  const family = familyOf(tariff.gdrgCode);
  const isDayCase = tariff.isZoomCode === true || family === DAY_CASE_FAMILY;
  switch (caseType) {
    case 'anc':
      return family === OPD_SCHEME_FAMILY && tariff.isAntenatal === true;
    case 'opd':
      return family === OPD_SCHEME_FAMILY && tariff.isAntenatal !== true;
    case 'zoom':
      return isDayCase;
    case 'ipd':
      return family !== OPD_SCHEME_FAMILY && !isDayCase;
  }
}

const CASE_LABELS: Record<NHISCaseType, string> = {
  anc: 'an antenatal or postnatal visit',
  opd: 'an outpatient visit',
  zoom: 'a day case or an observation stay',
  ipd: 'an inpatient admission',
};

const CASE_RULE_HINTS: Record<NHISCaseType, string> = {
  anc: 'Only the OPDC antenatal/postnatal code can bill it.',
  opd: 'Only an OPDC outpatient code can bill it — an outpatient visit is never billed under MEDI, PAED, OBGY or a surgical family.',
  zoom: 'Only a ZOOM day-procedure code can bill it.',
  ipd: 'Only a clinical family code (MEDI, PAED, OBGY, ASUR, PSUR, ORTH, ENTH, OPHT, DENT, RSUR) can bill it — never OPDC or ZOOM.',
};

function billable(tariff: ResolverTariff, input: ResolverInput): boolean {
  return caseMatches(tariff, input.caseType) &&
    ageMatches(tariff, input.age) &&
    levelMatches(tariff, input.facilityLevel) &&
    amountOf(tariff.nhiaTariff) > 0;
}

/**
 * Whether this code belongs to this case type, at this age, at this facility — the same test the
 * principal is chosen with, so a supporting line can name the G-DRG of its own diagnosis instead of
 * repeating the principal one on every row. A price is not required: supporting lines carry no money.
 */
export function gdrgBillsCase(
  tariff: ResolverTariff,
  context: { caseType: NHISCaseType; age: number; facilityLevel: number | null }
): boolean {
  return caseMatches(tariff, context.caseType) &&
    ageMatches(tariff, context.age) &&
    levelMatches(tariff, context.facilityLevel);
}

/**
 * Outpatient and day-case codes carry a general fallback (OPDC06, ZOOM02) that is less specific
 * than a condition's own code, so it loses when the diagnosis also links a specific one.
 */
function score(link: ResolverLink, input: ResolverInput): number {
  let score = link.isPrimary ? 100 : 0;
  if (link.origin === 'procedure' && (input.isSurgicalCase || input.caseType === 'zoom')) score += 60;
  if (link.origin === 'diagnosis' && input.caseType === 'ipd') score += 10;
  const code = link.tariff.gdrgCode.toUpperCase();
  if (code.startsWith(`${OPD_SCHEME_FAMILY}06`) || code.startsWith(`${DAY_CASE_FAMILY}02`)) score -= 25;
  return score;
}

const describe = (tariff: ResolverTariff): string =>
  `${tariff.gdrgCode}${tariff.description ? ` (${tariff.description})` : ''}`;

/**
 * Picks the principal G-DRG, or explains precisely why the encounter cannot be claimed.
 *
 * The candidate set is every G-DRG linked to the primary diagnosis together with every G-DRG
 * linked to a completed procedure. Each is filtered by case type, by the age band as at the
 * service date (so a child is moved to the PAED family, not onto an invented "MEDI28C"), by the
 * facility level, and by the tariff being priced. What is left is ranked on the isPrimary flag
 * the G-DRG editor stores on each link.
 */
export function resolvePrincipalGdrg(input: ResolverInput): ResolvedPrincipalGdrg {
  const { caseType, links, fallbacks, age, facilityLevel } = input;

  const usable = links.filter((link) => billable(link.tariff, input));
  if (usable.length) {
    const best = usable.reduce((a, b) => (score(b, input) > score(a, input) ? b : a));
    return {
      tariff: best.tariff,
      caseType,
      origin: best.origin,
      reason: `${best.tariff.gdrgCode} bills ${CASE_LABELS[caseType]} aged ${age}${
        facilityLevel != null ? ` at facility level ${facilityLevel}` : ''
      } as the ${best.origin === 'procedure' ? 'procedure' : 'diagnosis'}'s primary G-DRG.`,
    };
  }

  const fallback = fallbacks
    .filter((tariff) => billable(tariff, { ...input, links: [] }))
    .sort((a, b) => a.gdrgCode.localeCompare(b.gdrgCode))[0];

  if (fallback) {
    return {
      tariff: fallback,
      caseType,
      origin: 'fallback',
      reason: `No linked G-DRG bills ${CASE_LABELS[caseType]} at this age and facility level, so the visit falls back to ${fallback.gdrgCode}.`,
    };
  }

  const seen = Array.from(new Set(links.map((link) => link.tariff)));
  const detail = seen.length
    ? `The codes linked to it are ${seen.map(describe).join(', ')}, and none of them bills ${CASE_LABELS[caseType]} for a patient aged ${age}${facilityLevel != null ? ` at facility level ${facilityLevel}` : ''} with a priced tariff.`
    : 'No G-DRG is linked to it at all.';
  throw new ValidationError(
    `This claim needs a principal G-DRG, and ${detail} ${CASE_RULE_HINTS[caseType]} ` +
    `Link the right G-DRG to the diagnosis or to the procedure in G-DRG settings.`,
  );
}
