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