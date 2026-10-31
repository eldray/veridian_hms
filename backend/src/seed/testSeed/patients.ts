// src/seed/testSeed/patients.ts
//
// Patients plus everything registered alongside them: allergies, the medical,
// surgical and family history tabs, consents and the corporate enrolment that
// makes the corporate payer mode real.
import type { GeneratedPatient } from '../bulkGenerator.js';
import type { Lookups } from './lookups.js';
import { ENUMS } from './lookups.js';
import { asCalendarDay, hashOf, pickEnum, prisma, writeMany, type SeedStats } from './shared.js';

export interface PatientRowRef {
  id: string;
  insuranceProviderId: string | null;
  paymentMode: string;
}

export interface PatientRecords {
  /** folderNumber -> Patient.id */
  idByFolder: Map<string, string>;
  /** folderNumber -> the row as written, so later writers read the payer it actually landed on. */
  rowByFolder: Map<string, PatientRowRef>;
}

export const seedPatients = async (
  lookups: Lookups,
  patients: GeneratedPatient[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<PatientRecords> => {
  const rows: any[] = [];

  patients.forEach((p, index) => {
    let insuranceProviderId: string | null = null;
    if (p.paymentMode === 'nhis') {
      const pool = lookups.insuranceProviderByType.get('nhis') ?? [];
      insuranceProviderId = pool.length ? pool[hashOf(`nhis${p.folderNumber}`) % pool.length].id : null;
    } else if (p.paymentMode === 'private_insurance') {
      const pool = lookups.insuranceProviderByType.get('private') ?? [];
      insuranceProviderId = pool.length ? pool[hashOf(`priv${p.folderNumber}`) % pool.length].id : null;
    } else if (p.paymentMode === 'corporate') {
      const account = lookups.corporateAccounts[hashOf(`acct${p.folderNumber}`) % lookups.corporateAccounts.length];
      if (account?.insuranceProviderId) insuranceProviderId = account.insuranceProviderId;
    }
    const gender = pickEnum(ENUMS.gender, p.gender);
    if (!gender) return;
    const account = p.paymentMode === 'corporate'
      ? lookups.corporateAccounts[hashOf(`acct${p.folderNumber}`) % lookups.corporateAccounts.length]
      : null;


    rows.push({
      // The id carries the folder number and the seed marker. The folder band alone cannot tell
      // a demo folder from a real one that the live counter happened to reach first, and a real
      // patient in that band would otherwise be read back below and adopted - every demo
      // encounter, bill and claim would then hang off a genuine person's folder.
      id: `seedpat-${p.folderNumber}`,
      folderNumber: p.folderNumber,
      surname: p.surname,
      otherNames: p.otherNames,
      gender,
      maritalStatus: p.maritalStatus,
      dateOfBirth: asCalendarDay(p.dateOfBirth),
      contact: p.contact,
      address: p.address,
      residenceCommunity: p.residenceCommunity,
      residenceDistrict: p.residenceDistrict,
      residenceRegion: p.residenceRegion,
      paymentMode: p.paymentMode,
      // A corporate patient is enrolled through a real account, so the employer on the
      // folder names that account instead of the generator's generic occupation list.
      employer: account ? { name: account.companyName } : (p.employer ? { name: p.employer } : undefined),
      insuranceDetails: p.insuranceDetails ?? undefined,
      registeredAt: p.registeredAt,
      registeredBy: lookups.actorName({ role: 'records', salt: index }),
      insuranceProviderId: insuranceProviderId ?? undefined,
      nhisNumber: p.nhisNumber ?? undefined,
      nhisActive: p.nhisActive,
      nhisExpiryDate: p.nhisExpiryDate ? asCalendarDay(p.nhisExpiryDate) : undefined,
      phoneNumber: p.phoneNumber,
    });
  });

  await writeMany('patients', (part) => prisma.patient.createMany({ data: part }), rows, stats, planned);

  // Read back by the marker, not the folder band: a folder the demo could not claim because a
  // real patient already holds it stays a real patient, and the encounters that wanted it are
  // dropped instead of being attached to the wrong person.
  const found = await prisma.patient.findMany({
    where: { id: { startsWith: 'seedpat-' } },
    select: { id: true, folderNumber: true, paymentMode: true, insuranceProviderId: true },
  });
  const idByFolder = new Map<string, string>();
  const rowByFolder = new Map<string, PatientRowRef>();
  for (const patient of found) {
    idByFolder.set(patient.folderNumber, patient.id);
    rowByFolder.set(patient.folderNumber, {
      id: patient.id,
      insuranceProviderId: patient.insuranceProviderId,
      paymentMode: String(patient.paymentMode ?? 'cash'),
    });
  }

  // ── Background records ──────────────────────────────────
  const allergyRows: any[] = [];
  const medicalRows: any[] = [];
  const surgicalRows: any[] = [];
  const familyRows: any[] = [];
  const consentRows: any[] = [];

  for (const p of patients) {
    const patientId = idByFolder.get(p.folderNumber);
    if (!patientId) continue;

    for (const allergy of p.allergies) {
      allergyRows.push({ patientId, allergen: allergy.allergen, reaction: allergy.reaction, severity: allergy.severity, notes: allergy.notes });
    }
    for (const history of p.histories) {
      if (history.kind === 'medical') medicalRows.push({ patientId, condition: history.condition, diagnosedAt: history.at });
      else if (history.kind === 'surgical') surgicalRows.push({ patientId, procedure: history.condition, surgeryDate: history.at });
      else familyRows.push({ patientId, condition: history.condition, relation: history.relation ?? 'Family history' });
    }
    for (const consent of p.consents) {
      const consentType = pickEnum(ENUMS.consentType, consent.consentType);
      const status = pickEnum(ENUMS.consentStatus, consent.status);
      if (!consentType || !status) continue;
      consentRows.push({
        patientId, consentType, status, grantedAt: consent.grantedAt,
        revokedAt: consent.revokedAt ?? undefined, notes: consent.notes,
      });
    }
  }

  await writeMany('patient allergies', (part) => prisma.patientAllergy.createMany({ data: part }), allergyRows, stats, planned);
  await writeMany('medical histories', (part) => prisma.patientMedicalHistory.createMany({ data: part }), medicalRows, stats, planned);
  await writeMany('surgical histories', (part) => prisma.patientSurgicalHistory.createMany({ data: part }), surgicalRows, stats, planned);
  await writeMany('family histories', (part) => prisma.patientFamilyHistory.createMany({ data: part }), familyRows, stats, planned);
  await writeMany('consents', (part) => prisma.patientConsent.createMany({ data: part }), consentRows, stats, planned);

  console.log(`✅ ${idByFolder.size} patients (${allergyRows.length} allergies, ${consentRows.length} consents)`);
  return { idByFolder, rowByFolder };
};

/** Corporate enrolment for an attendance: the account and one of its employees. */
export const corporateEnrolmentFor = (lookups: Lookups, folderNumber: string) => {
  if (!lookups.corporateAccounts.length) return null;
  const account = lookups.corporateAccounts[hashOf(`acct${folderNumber}`) % lookups.corporateAccounts.length];
  const employees = lookups.corporateEmployeesByAccount.get(account.id) ?? [];
  const employee = employees.length ? employees[hashOf(`emp${folderNumber}`) % employees.length] : null;
  return { accountId: account.id, employeeId: employee?.id ?? null, discountPercentage: account.discountPercentage };
};
