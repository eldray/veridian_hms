import { AttendanceStatus, DischargeStatus } from '@prisma/client';

/**
 * Maps an attendance state to the NHIS ServiceOutcome code.
 *
 * completed  → DISC
 * discharged → DISC (or DTH if dischargeStatus = 'expired')
 * referred   → REF
 * absconded  → ABS
 *
 * Ineligible states (pending, admitted, cancelled) throw.
 */
export function mapAttendanceToServiceOutcome(
  status: AttendanceStatus,
  dischargeStatus: DischargeStatus | null,
): 'DISC' | 'DTH' | 'REF' | 'ABS' {
  switch (status) {
    case 'completed':
      return 'DISC';
    case 'discharged':
      return dischargeStatus === 'expired' ? 'DTH' : 'DISC';
    case 'referred':
      return 'REF';
    case 'absconded':
      return 'ABS';
    case 'pending':
    case 'admitted':
    case 'cancelled':
      throw new Error(
        `Attendance status "${status}" is not eligible for claim generation`,
      );
    default:
      throw new Error(`Unknown attendance status: ${status}`);
  }
}

/**
 * Maps Attendance.encounterCategory → NHIS typeOfService.
 * `daycase` (Zoom GDRG) is billed as OPD.
 */
export function mapEncounterCategoryToTypeOfService(
  encounterCategory: 'opd' | 'ipd' | 'daycase',
): 'OPD' | 'IPD' {
  switch (encounterCategory) {
    case 'opd':
    case 'daycase':
      return 'OPD';
    case 'ipd':
      return 'IPD';
    default:
      throw new Error(`Unknown encounter category: ${encounterCategory}`);
  }
}

/**
 * Maps Attendance.attendanceType → NHIS typeOfAttendance.
 */
export function mapAttendanceTypeToTypeOfAttendance(
  attendanceType:
    | 'emergency_acute'
    | 'antenatal'
    | 'postnatal'
    | 'chronic_followup'
    | 'specialist_consultation'
    | 'delivery'
    | 'surgery'
    | 'general_consultation',
): string {
  switch (attendanceType) {
    case 'emergency_acute':
    case 'general_consultation':
    case 'specialist_consultation':
      return 'EAE';
    case 'antenatal':
      return 'ANC';
    case 'postnatal':
      return 'postnatal';
    case 'chronic_followup':
      return 'chronic_followup';
    case 'delivery':
      return 'DEL';
    case 'surgery':
      return 'SUR';
    default:
      return 'EAE';
  }
}

/**
 * Builds the list of service dates for a claim.
 * - OPD:  single date (attendance.dateTime)
 * - IPD:  every date from admission.admissionDate to admission.dischargeDate
 */
export function buildDatesOfService(
  attendanceDate: Date,
  admission: { admissionDate: Date; dischargeDate: Date | null } | null,
): string[] {
  if (!admission) {
    return [toIsoDate(attendanceDate)];
  }
  const start = startOfDay(admission.admissionDate);
  const end = startOfDay(admission.dischargeDate ?? new Date());
  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}