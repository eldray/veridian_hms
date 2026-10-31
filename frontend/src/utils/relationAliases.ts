// The API lowercases every Prisma relation key on the way out (Patient → patient,
// LabTestTemplate → labTestTemplate), while many screens were written against the
// Prisma names. Restore the original names as encounter payloads enter the store,
// keeping the camelCase copies so both spellings resolve. Mirrors the
// BILL_RELATION_ALIASES precedent in api/index.ts.
const RELATION_ALIASES: Record<string, string> = {
  Attendance: 'attendance',
  Patient: 'patient',
  CounterClient: 'counterClient',
  Scan: 'scan',
  ScanTemplate: 'scanTemplate',
  LabTest: 'labTest',
  LabTestTemplate: 'labTestTemplate',
  Procedure: 'procedure',
  ProcedureTemplate: 'procedureTemplate',
  Medication: 'medication',
  ServiceCatalog: 'serviceCatalog',
  Vitals: 'vitals',
  AttendanceDiagnosis: 'attendanceDiagnosis',
  Bed: 'bed',
  Ward: 'ward',
  Referral: 'referral',
  StockItem: 'stockItem',
  // Named user relations lose the capital U on the way out as well.
  User_LabTest_performedByIdToUser: 'user_LabTest_performedByIdToUser',
  User_LabTest_verifiedByIdToUser: 'user_LabTest_verifiedByIdToUser',
  User_Scan_performedByIdToUser: 'user_Scan_performedByIdToUser',
  User_Scan_verifiedByIdToUser: 'user_Scan_verifiedByIdToUser',
  User_Medication_prescribedByIdToUser: 'user_Medication_prescribedByIdToUser',
  User_Medication_dispensedByIdToUser: 'user_Medication_dispensedByIdToUser',
  User_Procedure_performedByIdToUser: 'user_Procedure_performedByIdToUser',
  User_Procedure_createdByIdToUser: 'user_Procedure_createdByIdToUser',
};

/** Add PascalCase aliases for camelCased relation keys, recursively. Mutates nothing. */
export function withRelationAliases<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => withRelationAliases(item)) as unknown as T;
  if (!value || typeof value !== 'object' || value instanceof Date) return value;

  const out: Record<string, any> = {};
  for (const [key, item] of Object.entries(value as Record<string, any>)) {
    out[key] = withRelationAliases(item);
  }
  for (const [relation, camel] of Object.entries(RELATION_ALIASES)) {
    if (out[relation] === undefined && out[camel] !== undefined) out[relation] = out[camel];
  }
  return out as T;
}
