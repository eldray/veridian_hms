// Canonical patient-name resolver.
// Handles both full Prisma objects (surname/otherNames) and normalized
// objects (name/fullName), and never throws on null/partial data.
export function getPatientName(patient: any): string {
  if (!patient) return 'Unknown Patient';
  return (
    patient.name ||
    patient.fullName ||
    `${patient.surname || ''} ${patient.otherNames || ''}`.trim() ||
    'Unknown Patient'
  );
}
