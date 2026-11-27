// Canonical patient identity resolver used throughout the application.
// Accepts a Patient, Attendance/Encounter, Bill, Claim, Admission, or walk-in
// record and tolerates Prisma relation casing plus API-normalized aliases.
export function getPatientName(source: any): string {
  if (source == null) return 'Unknown Patient';

  const candidates = [
    source.patient, source.Patient, source.patientDetails, source.patientRecord,\n    source.counterClient?.Patient, source.counterClient?.patient,
    source.CounterClient?.Patient, source.CounterClient?.patient,
    source.data?.patient, source.data?.Patient, source.data,
    source.patient?.data, source.Patient?.data,
    source.attendance?.patient, source.Attendance?.patient,
    source.data?.attendance?.patient, source.data?.Attendance?.Patient,
    source.visit?.patient,
    source.counterClient?.Patient, source.counterClient?.patient,\n    source.CounterClient?.Patient, source.CounterClient?.patient,\n    source.counterClient, source.CounterClient, source.patientName,
    source.patientFullName, source.fullName, source.name, source,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (!candidate || typeof candidate !== 'object') continue;

    const direct = candidate.fullName ?? candidate.name ?? candidate.patientName ?? candidate.displayName;
    if (typeof direct === 'string' && direct.trim()) return direct.trim();

    const first = candidate.firstName ?? candidate.otherNames ?? candidate.givenName ?? '';
    const last = candidate.lastName ?? candidate.surname ?? candidate.familyName ?? '';
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
    source.patient, source.Patient, source.patientDetails, source.patientRecord,
    source.data, source.data?.patient, source.data?.Patient,
    source.patient?.data, source.Patient?.data,
    source.attendance?.patient, source.attendance?.Patient,
    source.Attendance?.patient, source.Attendance?.Patient,
    source.attendance?.data?.patient, source.Attendance?.data?.Patient,
    source.data?.attendance?.patient, source.data?.attendance?.Patient,
    source.data?.Attendance?.patient, source.data?.Attendance?.Patient,
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const value = candidate.folderNumber ?? candidate.patientFolderNumber ?? candidate.folderNo;
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
  ];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const value = candidate.attendanceNumber ?? candidate.attendanceNo
      ?? candidate.visitNumber ?? candidate.encounterNumber;
    if (value !== null && value !== undefined && String(value).trim()) return String(value).trim();
  }
  return '';
}
