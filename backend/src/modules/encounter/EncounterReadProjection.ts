/**
 * Role-aware projection for encounter reads.
 *
 * Admins and clinical staff may read the complete encounter. Operational desks
 * receive only the patient/visit fields and the departmental result queue they
 * need; they never receive the clinical narrative, diagnoses, vitals, medication
 * orders, allergies, or unrelated diagnostic records.
 */
const CLINICAL_READ_ROLES = new Set(['admin', 'super_admin', 'doctor', 'nurse', 'midwife']);

const CLINICAL_FIELDS = [
  'complaints',
  'medicalNotes',
  'clinicalNotes',
  'historyPresentingComplaint',
  'reviewOfSystems',
  'physicalExamination',
  'physicalExamStructured',
  'assessment',
  'treatmentPlan',
  'clinicalOutcome',
  'allergyReviewStatus',
  'allergyReviewNotes',
  'allergyReviewedAt',
  'allergyReviewedById',
  'providerId',
  'finalizedAt',
  'finalizedById',
  'nhisCCC',
] as const;

export function projectEncounterForRole<T extends Record<string, any>>(record: T, role?: string): T {
  if (!record || CLINICAL_READ_ROLES.has(String(role || '').toLowerCase())) return record;

  const normalizedRole = String(role || '').toLowerCase();
  const projected: Record<string, any> = { ...record };

  for (const field of CLINICAL_FIELDS) delete projected[field];

  const patient = projected.Patient ?? projected.patient;
  if (patient && typeof patient === 'object') {
    const safePatient = { ...patient };
    delete safePatient.allergies;
    delete safePatient.medicalHistories;
    delete safePatient.surgicalHistories;
    delete safePatient.familyHistories;
    if (normalizedRole === 'lab_tech' || normalizedRole === 'sonographer') delete safePatient.contact;
    if (projected.Patient) projected.Patient = safePatient;
    else projected.patient = safePatient;
  }

  const counterClient = projected.CounterClient ?? projected.counterClient;
  if (counterClient && typeof counterClient === 'object' &&
      (normalizedRole === 'lab_tech' || normalizedRole === 'sonographer')) {
    const safeCounterClient = { ...counterClient };
    delete safeCounterClient.phone;
    if (projected.CounterClient) projected.CounterClient = safeCounterClient;
    else projected.counterClient = safeCounterClient;
  }

  for (const field of [
    'AttendanceDiagnosis', 'diagnoses', 'Vitals', 'vitals', 'Medication', 'medications',
    'Procedure', 'procedures', 'LabTest', 'labTests', 'Scan', 'scans',
    'ServiceRendered', 'serviceRendered', 'referral',
  ]) {
    delete projected[field];
  }

  if (normalizedRole === 'lab_tech') {
    if (Array.isArray(record.LabTest)) projected.LabTest = record.LabTest;
    if (Array.isArray(record.labTests)) projected.labTests = record.labTests;
  } else if (normalizedRole === 'sonographer') {
    if (Array.isArray(record.Scan)) projected.Scan = record.Scan;
    if (Array.isArray(record.scans)) projected.scans = record.scans;
  }

  return projected as T;
}
