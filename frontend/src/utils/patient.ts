// Canonical patient identity resolver used throughout the application.
// Accepts a Patient, Attendance/Encounter, Bill, Claim, Admission, or walk-in
// record and tolerates Prisma relation casing plus API-normalized aliases.
export function getPatientName(source: any): string {
  if (source == null) return 'Unknown Patient';

  const candidates = [
    // A counter-client record may now be linked to a registered patient. Prefer
    // that registered identity over the walk-in display name when it exists.
    source.counterClient?.Patient, source.counterClient?.patient,
    source.CounterClient?.Patient, source.CounterClient?.patient,
    source.patient, source.Patient, (typeof source.patientId === 'object' ? source.patientId : null), source.patientDetails, source.patientRecord,
    source.data?.patient, source.data?.Patient, (typeof source.data?.patientId === 'object' ? source.data.patientId : null), source.data,
    source.patient?.data, source.Patient?.data,
    source.attendance?.patient, source.attendance?.Patient, (typeof source.attendance?.patientId === 'object' ? source.attendance.patientId : null),
    source.Attendance?.patient, source.Attendance?.Patient, (typeof source.Attendance?.patientId === 'object' ? source.Attendance.patientId : null),
    source.data?.attendance?.patient, source.data?.attendance?.Patient,
    source.data?.Attendance?.patient, source.data?.Attendance?.Patient,
    source.visit?.patient,
    source.counterClient, source.CounterClient, source.patientName,
    source.patientFullName, source.fullName, source.name, source,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (!candidate || typeof candidate !== 'object') continue;

    const direct = candidate.fullName ?? candidate.FullName ?? candidate.name ?? candidate.Name
      ?? candidate.patientName ?? candidate.displayName;
    if (typeof direct === 'string' && direct.trim()) return direct.trim();

    const first = candidate.firstName ?? candidate.FirstName ?? candidate.otherNames ?? candidate.OtherNames ?? candidate.givenName ?? '';
    const last = candidate.lastName ?? candidate.LastName ?? candidate.surname ?? candidate.Surname ?? candidate.familyName ?? '';
    const combined = [first, last].filter((part: any) => typeof part === 'string' && part.trim()).join(' ').trim();
    if (combined) return combined;
  }

  const folder = getPatientFolderNumber(source);
  return folder ? `Patient ${folder}` : 'Unknown Patient';
}


/** Resolve the patient folder number from a Patient or a related visit record. */
export function getPatientFolderNumber(source: any): string {
  if (source == null) return '';
  const candidates = [
    source,
    source.counterClient?.Patient, source.counterClient?.patient,
    source.CounterClient?.Patient, source.CounterClient?.patient,
    source.patient, source.Patient, (typeof source.patientId === 'object' ? source.patientId : null), source.patientDetails, source.patientRecord,
    source.data, source.data?.patient, source.data?.Patient, (typeof source.data?.patientId === 'object' ? source.data.patientId : null),
    source.patient?.data, source.Patient?.data,
    source.attendance?.patient, source.attendance?.Patient, source.attendance?.patientId,
    source.Attendance?.patient, source.Attendance?.Patient, source.Attendance?.patientId,
    source.attendance?.data?.patient, source.Attendance?.data?.Patient,
    source.data?.attendance?.patient, source.data?.attendance?.Patient,
    source.data?.Attendance?.patient, source.data?.Attendance?.Patient,
    source.encounter?.patient, source.encounter?.Patient,
    source.Encounter?.patient, source.Encounter?.Patient,
    source.visit?.patient, source.visit?.Patient,
    source.Visit?.patient, source.Visit?.Patient,
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const value = candidate.folderNumber ?? candidate.FolderNumber
      ?? candidate.patientFolderNumber ?? candidate.PatientFolderNumber
      ?? candidate.folderNo ?? candidate.FolderNo;
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return '';
}

/** Resolve the visit number from an Attendance/Encounter or a wrapper around one. */
export function getAttendanceNumber(source: any): string {
  if (source == null) return '';
  const candidates = [
    source,
    source.attendance, source.Attendance,
    source.encounter, source.Encounter,
    source.visit, source.data,
    source.data?.attendance, source.data?.Attendance,
    source.data?.encounter, source.data?.Encounter,
    source.visit?.attendance, source.visit?.Attendance,
    source.Visit?.attendance, source.Visit?.Attendance,
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const value = candidate.attendanceNumber ?? candidate.attendanceNo
      ?? candidate.visitNumber ?? candidate.VisitNumber
      ?? candidate.encounterNumber ?? candidate.EncounterNumber
      ?? candidate.AttendanceNumber ?? candidate.AttendanceNo;
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return '';
}
