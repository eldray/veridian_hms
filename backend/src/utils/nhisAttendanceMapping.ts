// Maps an HMS attendance to the NHIS claim form's "Type of Attendance" and "Type of Service".
// Codes match ATTENDANCE_OPTIONS in components/claims/ClaimUI.tsx.
// Keep in sync with backend/src/utils/nhisAttendanceMapping.ts.
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
// Type of service, specialties and dates of service
//
// Rule source: the August 2026 batch this facility actually submitted (2,097 claims). Cross-
// tabulating type of service against the specialties reported gives one answer per side: all
// 1,757 OPD claims reported OPDC and nothing else, and all 340 IPD claims reported a clinical
// family (MEDI 194, PAED 120, OBGY 21, ASUR 5) with no OPD scheme among them. Dates follow the
// same file: 2,437 <date> elements over 2,097 claims is exactly one per visit and two per
// admission — the payer wants the stay's endpoints, not every calendar day it covered.
// ─────────────────────────────────────────────────────────────────────────────

/** The specialties the claim form accepts in <specialtiesAttended>. */
export const NHIS_SPECIALTIES = ['ASUR', 'DENT', 'ENTH', 'MEDI', 'OBGY', 'OPDC', 'OPHT', 'ORTH', 'PAED', 'PSUR', 'RSUR'] as const;

/** OPDC is the outpatient scheme a visit is billed under, not a specialty an admission attends. */
export const OPD_SCHEME_SPECIALTY = 'OPDC';

/** The service outcomes the form accepts; CONT/DTH/REF/ABS are this app's own encounter words. */
export const NHIS_SERVICE_OUTCOMES = ['DISC', 'DIED', 'TFOT', 'ABSC'] as const;

/** The clinical letters a G-DRG begins with, or '' when the code is not a recognised family. */
export function gdrgSpecialty(code: unknown): string {
  const prefix = /^[A-Z]+/.exec(String(code ?? '').trim().toUpperCase())?.[0] ?? '';
  return (NHIS_SPECIALTIES as readonly string[]).includes(prefix) ? prefix : '';
}

/**
 * The specialties a claim reports, given how it was seen.
 *
 * An outpatient visit reports the OPD scheme whatever the clinical family of its codes is — the
 * submitted file has OPD claims under MEDI, PAED, OBGY, ASUR and ZOOM and every one of them still
 * reported OPDC. An admission reports the clinical families its codes name, and never OPDC.
 */
export function nhisSpecialtiesFor(
  typeOfService: string | null | undefined,
  gdrgCodes: Iterable<unknown>
): string[] {
  if ((typeOfService || 'OPD') === 'OPD') return [OPD_SCHEME_SPECIALTY];
  const found = Array.from(new Set(
    Array.from(gdrgCodes)
      .map(gdrgSpecialty)
      .filter((specialty) => specialty && specialty !== OPD_SCHEME_SPECIALTY)
  ));
  return found;
}

/**
 * Why the specialties and the type of service disagree, in the words an editor can act on,
 * or null when the pair is billable.
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
 * The service outcome a closed encounter reports, or an error saying the encounter is still open.
 *
 * The payer accepts DISC, DIED, TFOT and ABSC. This app's own workflow words — pending, admitted,
 * cancelled — have no equivalent, and a claim carrying CONT is rejected outright, so an encounter
 * that is still being treated cannot be claimed at all.
 */
export function nhisServiceOutcome(
  attendanceStatus: string | null | undefined,
  dischargeStatus: string | null | undefined
): 'DISC' | 'DIED' | 'TFOT' | 'ABSC' {
  switch (attendanceStatus) {
    case 'completed':
      return 'DISC';
    case 'discharged':
      return dischargeStatus === 'expired' ? 'DIED' : 'DISC';
    case 'referred':
      return 'TFOT';
    case 'absconded':
      return 'ABSC';
    default:
      throw new Error(
        `An NHIS claim can only be generated for a closed encounter. This attendance is "${attendanceStatus ?? 'unknown'}"; ` +
        'complete, discharge, refer or mark it as absconded first.'
      );
  }
}

/**
 * Whether the desk marked this claim unbundled — its services billed one by one instead of inside
 * the G-DRG bundle, which is what OPDC11 is for. There is no column for it, so the draft's metadata
 * carries it; a claim that never says is bundled, because that is what this facility bills.
 */
export function isNHISClaimUnbundled(claim: any): boolean {
  const metadata: any = claim?.metadata ?? {};
  return metadata.isUnbundled === true || metadata.claimStyle === 'unbundled';
}

export const isoDay = (value: unknown): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

/**
 * The dates of service the claim form expects.
 *
 * An admission sends the day it began and the day it ended; a visit sends its own day. That is what
 * the submitted batch does — one date per outpatient claim, two per admission — and it holds for the
 * 66 day cases and observation stays too, which are billed as OPD even though a bed was held. Dates
 * the desk recorded on the draft win, because the form is where a repeat visit is entered.
 */
export function nhisDatesOfService(
  claim: any,
  attendance: any,
  admission: any,
  typeOfService?: string | null
): string[] {
  const recorded = Array.isArray(claim?.datesOfService)
    ? claim.datesOfService.map(isoDay).filter(Boolean)
    : [];
  if (recorded.length) return Array.from(new Set(recorded));
  if ((typeOfService ?? claim?.typeOfService) === 'IPD' && admission?.admissionDate) {
    const start = isoDay(admission.admissionDate);
    const end = isoDay(admission.dischargeDate) || isoDay(attendance?.dateTime ?? claim?.createdAt);
    return start ? Array.from(new Set(end && end !== start ? [start, end] : [start])) : [];
  }
  const single = isoDay(attendance?.dateTime ?? claim?.createdAt);
  return single ? [single] : [];
}