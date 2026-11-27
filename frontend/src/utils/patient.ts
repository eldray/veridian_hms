// Canonical patient identity resolver used throughout the application.
// Accepts a Patient, Attendance/Encounter, Bill, Claim, Admission, or walk-in
// record and tolerates Prisma relation casing plus API-normalized aliases.
export function getPatientName(source: any): string {
  if (source == null) return 'Unknown Patient';

  const candidates = [
    source.patient, source.Patient, source.patientDetails, source.patientRecord,
    source.counterClient, source.CounterClient, source.patientName,
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

  const folder = source.patient?.folderNumber ?? source.Patient?.folderNumber ?? source.folderNumber;
  return folder ? `Patient ${folder}` : 'Unknown Patient';
}
