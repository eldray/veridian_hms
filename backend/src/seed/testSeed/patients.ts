// src/seed/testSeed/patients.ts
//
// Patients plus everything registered alongside them: allergies, the medical,
// surgical and family history tabs, consents and the corporate enrolment that
// makes the corporate payer mode real.
import { makeNhisNumber, type GeneratedPatient } from '../bulkGenerator.js';
import type { Lookups } from './lookups.js';
import { ENUMS } from './lookups.js';
import { asCalendarDay, hashOf, pickEnum, prisma, writeMany, type SeedStats } from './shared.js';
import { seedAvatarImages } from './avatars.js';

export interface PatientRowRef {
  id: string;
  insuranceProviderId: string | null;
  paymentMode: string;
  nhisNumber: string | null;
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
  // Only assign an insured payment mode when its real active provider/account exists.
  // The patient plans are also passed to the encounter generator, so reconcile them here
  // before either patients or visits are written.
  const hasProvider = (type: string) => (lookups.insuranceProviderByType.get(type) ?? []).length > 0;
  const hasCorporateAccount = lookups.corporateAccounts.length > 0;
  const payerFallbacks = { nhis: 0, private: 0, corporate: 0 };
  for (const patient of patients) {
    const unavailable =
      patient.paymentMode === 'nhis' && !hasProvider('nhis') ? 'nhis'
      : patient.paymentMode === 'private_insurance' && !hasProvider('private') ? 'private'
      : patient.paymentMode === 'corporate' && !hasCorporateAccount ? 'corporate'
      : null;
    if (!unavailable) continue;
    patient.paymentMode = 'cash';
    patient.nhisNumber = null;
    patient.nhisExpiryDate = null;
    patient.nhisActive = false;
    patient.insuranceDetails = {};
    payerFallbacks[unavailable] += 1;
  }
  const rows: any[] = [];
  const nhisNumberByFolder = new Map<string, string>();
  const avatarByFolder = await seedAvatarImages('patients', patients.map((patient) => patient.folderNumber));

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
    const nhisNumber = p.paymentMode === 'nhis' ? (p.nhisNumber || makeNhisNumber(index)) : null;
    if (nhisNumber) nhisNumberByFolder.set(p.folderNumber, nhisNumber);

    rows.push({
      // The id carries the folder number and the seed marker. The folder band alone cannot tell
      // a demo folder from a real one that the live counter happened to reach first, and a real
      // patient in that band would otherwise be read back below and adopted - every demo
      // encounter, bill and claim would then hang off a genuine person's folder.
      id: `seedpat-${p.folderNumber}`,
      folderNumber: p.folderNumber,
      imageUrl: avatarByFolder.get(p.folderNumber) ?? null,
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
      registeredAt: p.registeredAt,
      registeredBy: lookups.actorName({ role: 'records', salt: index }),
      insuranceProviderId: insuranceProviderId ?? undefined,
      // Demo NHIS members always carry a syntactically valid membership number. This is
      // synthetic test data, not a real member lookup or an NHIA-issued number.
      nhisNumber: nhisNumber ?? undefined,
      insuranceDetails: nhisNumber ? { ...(p.insuranceDetails ?? {}), memberId: nhisNumber } : (p.insuranceDetails ?? undefined),
      nhisActive: p.nhisActive,
      nhisExpiryDate: p.nhisExpiryDate ? asCalendarDay(p.nhisExpiryDate) : undefined,
      phoneNumber: p.phoneNumber,
    });
  });

  await writeMany('patients', (part) => prisma.patient.createMany({ data: part }), rows, stats, planned);

  // Reconcile NHIS identity on earlier demo rows too. A forced re-seed must not leave
  // an old synthetic NHIS patient without the membership number expected by its visits.
  for (const [folderNumber, nhisNumber] of nhisNumberByFolder) {
    await prisma.patient.updateMany({
      where: { id: `seedpat-${folderNumber}`, paymentMode: 'nhis' },
      data: { nhisNumber },
    });
  }

  // Read back by the marker, not the folder band: a folder the demo could not claim because a
  // real patient already holds it stays a real patient, and the encounters that wanted it are
  // dropped instead of being attached to the wrong person.
  const found = await prisma.patient.findMany({
    where: { id: { startsWith: 'seedpat-' } },
    select: { id: true, folderNumber: true, paymentMode: true, insuranceProviderId: true, nhisNumber: true },
  });
  const idByFolder = new Map<string, string>();
  const rowByFolder = new Map<string, PatientRowRef>();
  for (const patient of found) {
    idByFolder.set(patient.folderNumber, patient.id);
    rowByFolder.set(patient.folderNumber, {
      id: patient.id,
      insuranceProviderId: patient.insuranceProviderId,
      paymentMode: String(patient.paymentMode ?? 'cash'),
      nhisNumber: patient.nhisNumber ?? null,
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
  const payerFallbackTotal = payerFallbacks.nhis + payerFallbacks.private + payerFallbacks.corporate;
  if (payerFallbackTotal) {
    console.warn(`   ${payerFallbackTotal} patient payer modes changed to cash because configured provider/account IDs were unavailable (NHIS ${payerFallbacks.nhis}, private ${payerFallbacks.private}, corporate ${payerFallbacks.corporate}).`);
  }
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
