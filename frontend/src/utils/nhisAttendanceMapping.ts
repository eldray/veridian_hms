// Maps an HMS attendance to the NHIS claim form's "Type of Attendance" and "Type of Service",
// and holds the payer's code rules the claim form has to obey.
//
// Keep in sync with backend/src/utils/nhisAttendanceMapping.ts — the server re-checks every rule
// below when a draft is finalised, so the form is only there to stop the desk typing a claim the
// payer would query.
//
//  Attendance type            -> Type of Attendance        | Type of Service
//  antenatal                  -> ANC  (Ante-natal)         | OPD
//  postnatal                  -> PNC  (Post-natal)         | OPD
//  chronic_followup           -> CFU  (Chronic Follow-up)  | OPD
//  emergency_acute            -> EAE  (Emergency/Acute)    | OPD
//  general_consultation       -> EAE  (Emergency/Acute)    | OPD
//  specialist_consultation    -> EAE  (Emergency/Acute)    | OPD
//  surgery                    -> EAE  (Emergency/Acute)    | IPD
//  delivery                   -> EAE  (Emergency/Acute)    | IPD
//  any type, if admitted      -> (as above)                | IPD

export type NHISAttendanceCode = 'CFU' | 'EAE' | 'ANC' | 'PNC';
export type NHISServiceType = 'OPD' | 'IPD';

export const NHIS_ATTENDANCE_OPTIONS: { value: NHISAttendanceCode; label: string }[] = [
  { value: 'CFU', label: 'Chronic Follow-up' },
  { value: 'EAE', label: 'Emergency/Acute Episode' },
  { value: 'ANC', label: 'Ante-natal' },
  { value: 'PNC', label: 'Post-natal' },
];

export function mapAttendanceToNHIS(
  attendanceType: string | null | undefined,
  hasAdmission: boolean
): { typeOfAttendance: NHISAttendanceCode; typeOfService: NHISServiceType } {
  let typeOfAttendance: NHISAttendanceCode;
  switch (attendanceType) {
    case 'antenatal': typeOfAttendance = 'ANC'; break;
    case 'postnatal': typeOfAttendance = 'PNC'; break;
    case 'chronic_followup': typeOfAttendance = 'CFU'; break;
    default: typeOfAttendance = 'EAE'; // emergency_acute, consultations, surgery, delivery
  }
  const inpatientByNature = attendanceType === 'surgery' || attendanceType === 'delivery';
  return { typeOfAttendance, typeOfService: hasAdmission || inpatientByNature ? 'IPD' : 'OPD' };
}

// Legacy claims stored GEN / CHR / DEL / SUR / NICU. Normalise to the four codes the form offers.
export function normalizeNHISAttendanceCode(code: string | null | undefined): NHISAttendanceCode | null {
  switch (code) {
    case 'CFU': case 'EAE': case 'ANC': case 'PNC': return code;
    case 'GEN': case 'CHR': return 'CFU';
    case 'DEL': case 'SUR': case 'NICU': return 'EAE';
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Type of service, specialties and service outcome
//
// Rule source: the August 2026 batch this facility actually submitted. All 1,757 OPD claims
// reported OPDC and nothing else; all 340 IPD claims reported a clinical family (MEDI, PAED,
// OBGY, ASUR) with no OPD scheme among them.
// ─────────────────────────────────────────────────────────────────────────────

/** The specialties the claim form accepts in <specialtiesAttended>. */
export const NHIS_SPECIALTIES = ['ASUR', 'DENT', 'ENTH', 'MEDI', 'OBGY', 'OPDC', 'OPHT', 'ORTH', 'PAED', 'PSUR', 'RSUR'] as const;

/** OPDC is the outpatient scheme a visit is billed under, not a specialty an admission attends. */
export const OPD_SCHEME_SPECIALTY = 'OPDC';

/** The service outcomes the payer accepts. */
export const NHIS_SERVICE_OUTCOMES = ['DISC', 'DIED', 'TFOT', 'ABSC'] as const;

export const NHIS_SERVICE_OUTCOME_LABELS: Record<string, string> = {
  DISC: 'Discharged',
  DIED: 'Died',
  TFOT: 'Transferred Out',
  ABSC: 'Absconded',
};

/**
 * The outcome a claim reports, in the payer's own codes.
 *
 * Older drafts stored this app's encounter words (CONT, and the DTH/REF/ABS an earlier generator
 * emitted), which CLAIM-it rejects; an unrecognised code falls back to Discharged so the desk sees
 * a selectable option instead of a form with nothing ticked.
 */
export function normalizeNHISOutcomeCode(code: string | null | undefined): string {
  switch (String(code ?? '').trim().toUpperCase()) {
    case 'DIED': return 'DIED';
    case 'DTH': return 'DIED';
    case 'TFOT': case 'REF': case 'TRFO': return 'TFOT';
    case 'ABSC': case 'ABS': return 'ABSC';
    default: return 'DISC';
  }
}

/** The clinical letters a G-DRG begins with, or '' when the code is not a recognised family. */
export function gdrgSpecialty(code: unknown): string {
  const prefix = /^[A-Z]+/.exec(String(code ?? '').trim().toUpperCase())?.[0] ?? '';
  return (NHIS_SPECIALTIES as readonly string[]).includes(prefix) ? prefix : '';
}

/**
 * The specialties a claim reports, given how it was seen.
 *
 * An outpatient visit reports the OPD scheme whatever the clinical family of its codes is. An
 * admission reports the clinical families its codes name, and never OPDC.
 */
export function nhisSpecialtiesFor(
  typeOfService: string | null | undefined,
  gdrgCodes: Iterable<unknown>
): string[] {
  if ((typeOfService || 'OPD') === 'OPD') return [OPD_SCHEME_SPECIALTY];
  return Array.from(new Set(
    Array.from(gdrgCodes)
      .map(gdrgSpecialty)
      .filter((specialty) => specialty && specialty !== OPD_SCHEME_SPECIALTY)
  ));
}

/**
 * Why the specialties and the type of service disagree, in words a desk member can act on,
 * or null when the pair is billable. Same rule the server re-checks before it finalises.
 */
export function findSpecialtyServiceMismatch(
  typeOfService: string | null | undefined,
  specialties: Iterable<unknown>
): string | null {
  const service = typeOfService || 'OPD';
  const reported = Array.from(new Set(
    Array.from(specialties).map((s) => String(s ?? '').trim().toUpperCase()).filter(Boolean)
  ));
  if (service === 'OPD') {
    const clinical = reported.filter((s) => s !== OPD_SCHEME_SPECIALTY);
    if (!reported.includes(OPD_SCHEME_SPECIALTY)) {
      return 'An outpatient claim is billed under the OPDC outpatient scheme; select OPDC as the specialty.';
    }
    if (clinical.length) {
      return `An outpatient claim reports OPDC only — remove ${clinical.join(', ')} or make the encounter an inpatient admission.`;
    }
    return null;
  }
  if (reported.includes(OPD_SCHEME_SPECIALTY)) {
    return 'OPDC is the outpatient scheme. An inpatient claim must report the clinical specialty that attended it (ASUR, MEDI, OBGY, PAED, ...).';
  }
  if (!reported.length) {
    return 'An inpatient claim must report at least one clinical specialty, for example the family of its principal G-DRG.';
  }
  return null;
}

/**
 * Whether the desk marked this claim unbundled — its services billed one by one instead of inside
 * the G-DRG bundle. There is no column for it, so the draft's metadata carries it.
 */
export function isNHISClaimUnbundled(claim: any): boolean {
  const metadata: any = claim?.metadata ?? {};
  return metadata.isUnbundled === true || metadata.claimStyle === 'unbundled';
}
