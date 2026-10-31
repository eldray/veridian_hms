// src/seed/bulkGenerator.ts
// Pure in-memory generators — no file I/O, no Prisma.
// Deterministic via setSeed().

import {
  ALLERGY_REACTIONS,
  ALLERGY_SEVERITIES,
  ALLERGEN_SUBSTANCES,
  ANAESTHESIA_PLANS,
  AUDIT_DESCRIPTIONS,
  CLAIM_REJECTION_NOTES,
  COMMUNICATION_SUBJECTS,
  COMPLAINT_SCENARIOS,
  DIAGNOSTIC_RESULT_NARRATIVES,
  DRUG_GROUPS,
  ESTIMATE_NOTES,
  FALLBACK_DRUG_GROUP,
  FALLBACK_ICD_CODES,
  FALLBACK_LAB_CODES,
  FALLBACK_SCAN_CODES,
  FAMILY_CONDITIONS,
  FAMILY_RELATIONS,
  FREQUENCY_LABELS,
  GENERAL_SAFETY_NET,
  INTRAOPERATIVE_TEMPLATES,
  LEAVE_REASONS,
  MEDICAL_CONDITIONS,
  NEXT_OF_KIN,
  NOTIFICATION_TEMPLATES,
  NURSING_NOTE_TEMPLATES,
  NURSING_TASK_TEMPLATES,
  OBSERVATION_PHRASES,
  PAYROLL_DEDUCTIONS,
  PAYROLL_EARNINGS,
  POSTOPERATIVE_TEMPLATES,
  PROCEDURE_COMPLICATIONS,
  PROCEDURE_OUTCOMES,
  REQUISITION_PURPOSES,
  SCAN_REPORT_NARRATIVES,
  STAFF_BIOS,
  STAFF_DOCUMENT_TITLES,
  SURGICAL_HISTORY,
  SUPPLIERS,
  TARGET_ROLES_FOR_NOTIFICATION,
  WAIVER_REASONS,
  type ComplaintScenario,
} from './clinicalContent.js';


// ═══════════════════════════════════════════════════════════
// VOLUME KNOBS
// ═══════════════════════════════════════════════════════════
export const COUNTS = {
  departments: 12,
  users: 100,
  patients: 1000,
  attendances: 10000,
  vitalsPerAttendance: 0.95,
  diagnosisPerAttendance: 0.90,
  labTestsPerAttendance: 1.2,
  scansPerAttendance: 0.30,
  medicationsPerAttendance: 1.8,
  servicesPerAttendance: 1.0,
  billPerAttendance: 1.0,
  claimsPerNHISAttendance: 0.8,
  referralsPerAttendance: 0.05,
  admissionsPerAttendance: 0.08,
  appointments: 500,
  familyPlanning: 100,
  notifications: 200,
  /**
   * Complete pregnancy stories. Left to the random encounter picker a birth has no booking
   * and no postnatal check, so this many women are given the whole cycle instead.
   */
  maternityCases: 120,

  // ── Workflow depth (these were entirely absent before) ──────
  /** Probability a patient carries each kind of documented background. */
  allergyRate: 0.45,
  medicalHistoryRate: 0.55,
  surgicalHistoryRate: 0.25,
  familyHistoryRate: 0.35,
  consentRate: 0.40,
  /** Chance an IPD/procedure candidate attendance actually gets a theatre procedure row. */
  proceduresPerSurgicalAttendance: 0.85,
  /** Nursing documentation is written for inpatients only - an OPD visit has no ward chart. */
  nursingNotesPerAdmission: 3,
  nursingTasksPerAdmission: 4,
  /** Fraction of prescriptions that get real dispensing evidence against stock. */
  dispenseRateOutpatient: 0.7,
  dispenseRateInpatient: 0.9,
  estimates: 400,
  purchaseInvoices: 120,
  requisitions: 150,
  stockTransfers: 120,
  waivers: 80,
  preAuthorisations: 120,
  eligibilityChecks: 500,
  claimBatches: 10,
  auditLogs: 800,
  communicationLogs: 600,
  counterClients: 200,
  /** Duty roster spans this many days either side of the seed date. */
  shiftDaysPast: 45,
  shiftDaysFuture: 14,
  leaveRequests: 140,
  payrollMonths: 6,
};

// ═══════════════════════════════════════════════════════════
// DOCUMENT NUMBERING — must agree with services/CounterService.ts:
// every number is at least 5 digits and starts above 10000, and each family
// owns a block so a live counter resumes just after the seeded rows instead of
// jumping wherever a random 6-digit number happened to land.
// Bills, admissions and claims are derived from the visit number, exactly as the
// live repositories do (BillRepository.getBillNumberFromAttendance).
// ═══════════════════════════════════════════════════════════
export const NUMBER_WIDTH = 5;
export const padNumber = (value: number): string => String(value).padStart(NUMBER_WIDTH, '0');
export const FOLDER_NUMBER_BLOCK = 10000;                       // patients   10001..
export const VISIT_NUMBER_BLOCK = FOLDER_NUMBER_BLOCK + 10000;  // visits     20001..
export const RECEIPT_NUMBER_BLOCK = VISIT_NUMBER_BLOCK + 50000; // receipts   70001..
export const REFERRAL_NUMBER_BLOCK = RECEIPT_NUMBER_BLOCK + 10000; // referrals 80001..
export const APPOINTMENT_NUMBER_BLOCK = REFERRAL_NUMBER_BLOCK + 10000; // appts  90001..

/**
 * Every visit number the generator can reach, counted out: the registered-patient
 * encounters, the walk-in counter tickets and the three visits of each maternity case.
 * attendanceNumber is unique, so a writer that mints encounters of its own - the ANC
 * reviews - starts above this rather than guessing at a block boundary.
 */
export const VISIT_NUMBER_CEILING = VISIT_NUMBER_BLOCK + COUNTS.attendances + COUNTS.counterClients + COUNTS.maternityCases * 3;

// A GHSS membership number is either 8 digits, or the same 8 digits written in the
// 10-digit field as "00" + the number. A 10-digit number starting anywhere else is not a
// valid membership number, so the generator never makes one - and neither does the
// validator in PatientService or frontend/src/utils/nhisNumber.ts.
export const makeNhisNumber = (index: number): string => {
  let digits = String(intBetween(1, 9));
  while (digits.length < 8) digits += String(intBetween(0, 9));
  return index % 3 === 0 ? `00${digits}` : digits;
};

// ═══════════════════════════════════════════════════════════
// Deterministic RNG (mulberry32)
// ═══════════════════════════════════════════════════════════
let _seed = 0x9e3779b9;
export const setSeed = (s: number) => { _seed = s >>> 0; };
const rand = () => {
  _seed |= 0; _seed = (_seed + 0x6D2B79F5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rnd = (n: number) => Math.floor(rand() * n);
const pick = <T>(arr: T[]): T => arr[rnd(arr.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));
const chance = (p: number) => rand() < p;

const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(intBetween(7, 18), intBetween(0, 59), 0, 0);
  return d;
};
const daysFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(intBetween(7, 18), intBetween(0, 59), 0, 0);
  return d;
};

// ═══════════════════════════════════════════════════════════
// Name pools (Ghanaian)
// ═══════════════════════════════════════════════════════════
const MALE_FIRST = ['Kwame','Kofi','Yaw','Kwaku','Kojo','Kwabena','Kwesi','Nana','Fiifi','Ekow','Ato','Kobina','Kwadwo','Nii','Ebenezer','Emmanuel','Isaac','Samuel','Prince','Michael'];
const FEMALE_FIRST = ['Ama','Akosua','Abena','Adwoa','Afua','Yaa','Esi','Akua','Adjoa','Araba','Efua','Mawusi','Dzifa','Sena','Naa','Akos','Aba'];
const SURNAMES = ['Mensah','Osei','Boateng','Asante','Adjei','Owusu','Agyeman','Appiah','Frimpong','Darko','Antwi','Amoah','Ansah','Nyarko','Acheampong','Addo','Bediako','Bonsu','Danso','Gyasi','Opoku','Quaye','Sarpong','Tetteh','Yeboah','Baah','Aidoo','Amankwah','Asamoah','Dapaah','Adusei','Agyapong','Baffour','Donkor','Ofori'];
const ADDRESSES = ['Liberation Road, Accra','Independence Ave, Kumasi','Hospital Road, Takoradi','Beach Drive, Cape Coast','Market Street, Tema','Ring Road, Accra','Spintex Road, Accra','Airport Residential, Accra','Adum, Kumasi','Tema Community 1','East Legon, Accra','Dansoman, Accra','Madina, Accra','Kasoa, Central Region','Tamale Central','Ho Bankoe'];

// ═══════════════════════════════════════════════════════════
// DEPARTMENTS
// ═══════════════════════════════════════════════════════════
export interface GeneratedDepartment {
  name: string;
  description: string;
  color: string;
  icon: string;
  isStore: boolean;
}

export const generateDepartments = (): GeneratedDepartment[] => [
  { name: 'Administration',           description: 'Hospital administration',       color: '#6B7280', icon: 'shield',        isStore: false },
  { name: 'Human Resources',          description: 'HR and staff management',       color: '#8B5CF6', icon: 'users',         isStore: false },
  { name: 'Medical',                  description: 'General medical / OPD',         color: '#3B82F6', icon: 'stethoscope',   isStore: false },
  { name: 'Surgery',                  description: 'Surgical department',           color: '#EF4444', icon: 'scissors',      isStore: false },
  { name: 'Obstetrics & Gynecology',  description: 'Maternity and gynaecology',     color: '#EC4899', icon: 'baby',          isStore: false },
  { name: 'Pediatrics',               description: 'Child health',                  color: '#F59E0B', icon: 'baby',          isStore: false },
  { name: 'Emergency',                description: 'Emergency / casualty',          color: '#DC2626', icon: 'siren',         isStore: false },
  { name: 'Laboratory',               description: 'Diagnostics lab',               color: '#10B981', icon: 'flask',         isStore: false },
  { name: 'Radiology',                description: 'Imaging and scans',             color: '#06B6D4', icon: 'scan',          isStore: false },
  { name: 'Pharmacy',                 description: 'Dispensary',                    color: '#14B8A6', icon: 'pill',          isStore: true  },
  { name: 'Main Store',               description: 'Central supplies store',        color: '#84CC16', icon: 'box',           isStore: true  },
  { name: 'Accounts',                 description: 'Billing and finance',           color: '#F97316', icon: 'dollar-sign',   isStore: false },
];

// ═══════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════
export interface GeneratedUser {
  username: string;
  password: string;
  fullName: string;
  role: 'super_admin' | 'admin' | 'hr_officer' | 'doctor' | 'nurse' | 'midwife' | 'records' | 'lab_tech' | 'pharmacist' | 'accounts' | 'sonographer';
  email: string;
  phone: string;
  licenseNumber: string | null;
  specialization: string | null;
  roleName: string;
  departmentName: string | null;
  seniority: 'TRAINEE' | 'JUNIOR' | 'SENIOR' | 'PRINCIPAL';
  jobGradeCode: string;
  salaryStepNumber: number;
}

const ROLE_DISTRIBUTION: Array<{ role: GeneratedUser['role']; count: number; dept: string | null }> = [
  { role: 'super_admin', count: 1,  dept: null },
  { role: 'admin',       count: 2,  dept: 'Administration' },
  { role: 'hr_officer',  count: 2,  dept: 'Human Resources' },
  { role: 'doctor',      count: 15, dept: 'Medical' },
  { role: 'nurse',       count: 35, dept: 'Medical' },
  { role: 'midwife',     count: 10, dept: 'Obstetrics & Gynecology' },
  { role: 'lab_tech',    count: 5,  dept: 'Laboratory' },
  { role: 'sonographer', count: 3,  dept: 'Radiology' },
  { role: 'pharmacist',  count: 5,  dept: 'Pharmacy' },
  { role: 'accounts',    count: 5,  dept: 'Accounts' },
  { role: 'records',     count: 3,  dept: 'Medical' },
];

const SENIORITY_BY_ROLE: Record<GeneratedUser['role'], GeneratedUser['seniority'][]> = {
  super_admin: ['PRINCIPAL'],
  admin:       ['PRINCIPAL'],
  hr_officer:  ['SENIOR'],
  doctor:      ['SENIOR','SENIOR','PRINCIPAL','JUNIOR'],
  nurse:       ['JUNIOR','JUNIOR','SENIOR'],
  midwife:     ['SENIOR','SENIOR','PRINCIPAL'],
  lab_tech:    ['JUNIOR','SENIOR'],
  sonographer: ['JUNIOR','SENIOR'],
  pharmacist:  ['SENIOR','PRINCIPAL'],
  accounts:    ['SENIOR'],
  records:     ['SENIOR','JUNIOR'],
};

const JOB_GRADE_BY_ROLE: Record<GeneratedUser['role'], string> = {
  super_admin: 'AD-09',
  admin:       'AD-09',
  hr_officer:  'AD-09',
  doctor:      'MO-08',
  nurse:       'NO-07',
  midwife:     'NO-07',
  lab_tech:    'NO-07',
  sonographer: 'NO-07',
  pharmacist:  'NO-07',
  accounts:    'AD-09',
  records:     'AD-09',
};

const ROLE_DISPLAY: Record<GeneratedUser['role'], string> = {
  super_admin: 'Super Administrator',
  admin:       'Administrator',
  hr_officer:  'HR Officer',
  doctor:      'Dr.',
  nurse:       'Nurse',
  midwife:     'Midwife',
  records:     'Records Officer',
  lab_tech:    'Lab Tech',
  pharmacist:  'Pharmacist',
  accounts:    'Accountant',
  sonographer: 'Sonographer',
};

export const generateUsers = (): GeneratedUser[] => {
  const users: GeneratedUser[] = [];
  const usedUsernames = new Set<string>();
  const counters: Record<string, number> = {};

  const expand = [...ROLE_DISTRIBUTION];
  const totalSpecified = ROLE_DISTRIBUTION.reduce((a, r) => a + r.count, 0);
  const remainder = COUNTS.users - totalSpecified;
  if (remainder > 0) expand.push({ role: 'nurse', count: remainder, dept: 'Medical' });

  for (const spec of expand) {
    for (let i = 0; i < spec.count; i++) {
      counters[spec.role] = (counters[spec.role] || 0) + 1;
      const idx = counters[spec.role];

      let baseUsername: string;
      if (spec.role === 'super_admin') baseUsername = 'superadmin';
      else if (spec.role === 'admin') baseUsername = idx === 1 ? 'admin' : `admin${idx}`;
      else if (spec.role === 'hr_officer') baseUsername = idx === 1 ? 'hr1' : `hr${idx}`;
      else if (spec.role === 'doctor') baseUsername = `doctor${idx}`;
      else if (spec.role === 'nurse') baseUsername = `nurse${idx}`;
      else if (spec.role === 'midwife') baseUsername = `midwife${idx}`;
      else if (spec.role === 'lab_tech') baseUsername = `lab${idx}`;
      else if (spec.role === 'sonographer') baseUsername = `sonographer${idx}`;
      else if (spec.role === 'pharmacist') baseUsername = `pharma${idx}`;
      else if (spec.role === 'accounts') baseUsername = `accounts${idx}`;
      else if (spec.role === 'records') baseUsername = `records${idx}`;
      else baseUsername = `${spec.role}${idx}`;

      let username = baseUsername;
      let dedupe = 1;
      while (usedUsernames.has(username)) {
        username = `${baseUsername}_${++dedupe}`;
      }
      usedUsernames.add(username);

      const isFemale = ['midwife','nurse'].includes(spec.role) ? chance(0.85) : chance(0.4);
      const first = isFemale ? pick(FEMALE_FIRST) : pick(MALE_FIRST);
      const last = pick(SURNAMES);
      const prefix = ROLE_DISPLAY[spec.role];
      const fullName = spec.role === 'doctor'
        ? `Dr. ${first} ${last}`
        : `${prefix} ${first} ${last}`;

      const passwordMap: Record<string, string> = {
        super_admin: 'superadmin123',
        admin: 'admin123',
        hr_officer: 'hr123',
        doctor: 'doctor123',
        nurse: 'nurse123',
        midwife: 'midwife123',
        lab_tech: 'lab123',
        sonographer: 'scan123',
        pharmacist: 'pharma123',
        accounts: 'accounts123',
        records: 'records123',
      };
      const password = passwordMap[spec.role];

      const roleNameMap: Record<string, string> = {
        super_admin: 'super_admin',
        admin: 'admin',
        hr_officer: 'hr_officer',
        doctor: 'doctor',
        nurse: 'nurse',
        midwife: 'nurse',
        lab_tech: 'nurse',
        sonographer: 'nurse',
        pharmacist: 'nurse',
        accounts: 'hr_officer',
        records: 'hr_officer',
      };

      const seniorityPool = SENIORITY_BY_ROLE[spec.role];
      const seniority = pick(seniorityPool);

      users.push({
        username,
        password,
        fullName,
        role: spec.role,
        email: `${username}@hospital.com`,
        phone: `+233244${String(100000 + users.length).padStart(6, '0')}`,
        licenseNumber: ['doctor','nurse','midwife','lab_tech','pharmacist','sonographer'].includes(spec.role)
          ? `${spec.role.substring(0,2).toUpperCase()}-${intBetween(10000, 99999)}`
          : null,
        specialization: spec.role === 'doctor' ? pick(['General Medicine','Pediatrics','Obstetrics','Surgery','Internal Medicine']) : null,
        roleName: roleNameMap[spec.role],
        departmentName: spec.dept,
        seniority,
        jobGradeCode: JOB_GRADE_BY_ROLE[spec.role],
        salaryStepNumber: intBetween(1, 5),
      });
    }
  }

  return users;
};

// ═══════════════════════════════════════════════════════════
// PATIENTS
// ═══════════════════════════════════════════════════════════
export interface GeneratedAllergy {
  allergen: string;
  reaction: string;
  severity: string;
  notes: string;
}

export interface GeneratedHistory {
  /** medical -> PatientMedicalHistory, surgical -> PatientSurgicalHistory, family -> PatientFamilyHistory */
  kind: 'medical' | 'surgical' | 'family';
  condition: string;
  relation?: string;
  at: Date;
}

export interface GeneratedConsent {
  consentType: 'treatment' | 'data_sharing' | 'research' | 'nhis_claims' | 'billing';
  status: 'granted' | 'revoked' | 'expired';
  grantedAt: Date;
  revokedAt: Date | null;
  notes: string;
}

export interface GeneratedPatient {
  folderNumber: string;
  surname: string;
  otherNames: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: Date;
  contact: string;
  address: string;
  paymentMode: 'cash' | 'nhis' | 'private_insurance' | 'corporate';
  nhisNumber: string | null;
  nhisActive: boolean;
  nhisExpiryDate: Date | null;
  phoneNumber: string;
  insuranceDetails: any;
  registeredAt: Date;
  maritalStatus: string;
  residenceRegion: string;
  residenceDistrict: string;
  residenceCommunity: string;
  employer: string | null;
  allergies: GeneratedAllergy[];
  histories: GeneratedHistory[];
  consents: GeneratedConsent[];
}

const REGIONS = ['Greater Accra','Ashanti','Central','Western','Eastern','Volta','Northern','Bono','Upper East','Western North'];
const MARITAL_STATUS = ['single','married','divorced','widowed','separated'];
const EMPLOYERS = ['Self-employed','Ghana Education Service','Ghana Health Service','Private trader','Mining sector','Telecommunications','Unemployed','Tea seller','Cocoa farmer','Bank of Ghana'];

/**
 * Pick n distinct entries from a pool without replacement, so a patient is never given the
 * same allergy twice - the schema has no guard against duplicate allergen text on one patient.
 */
const pickDistinct = <T>(pool: T[], n: number): T[] => {
  const copy = [...pool];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(...copy.splice(rnd(copy.length), 1));
  return out;
};

export const generatePatients = (): GeneratedPatient[] => {
  const out: GeneratedPatient[] = [];
  for (let i = 0; i < COUNTS.patients; i++) {
    const gender: any = rand() < 0.48 ? 'male' : rand() < 0.96 ? 'female' : 'other';
    const firstName = gender === 'male' ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
    const surname = pick(SURNAMES);
    const age = intBetween(1, 85);
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);
    dob.setMonth(intBetween(0, 11));
    dob.setDate(intBetween(1, 28));

    const roll = rand();
    const paymentMode: any = roll < 0.40 ? 'cash' : roll < 0.85 ? 'nhis' : roll < 0.95 ? 'private_insurance' : 'corporate';
    const nhis = paymentMode === 'nhis' ? makeNhisNumber(i) : null;
    // A spread either side of today, not all in the future: /report/nhis-expiry and
    // /report/nhis-expiring-soon both read a window and were empty when every card was valid.
    const nhisExpiryDate = paymentMode === 'nhis' ? daysFromNow(intBetween(-240, 365)) : null;
    const region = pick(REGIONS);

    // Background records are generated alongside the patient so the history tabs, the allergy
    // safety review and the prescribing conflict check all have something real to read.
    const allergies: GeneratedAllergy[] = chance(COUNTS.allergyRate)
      ? pickDistinct(ALLERGEN_SUBSTANCES, intBetween(1, 3)).map((allergen) => ({
          allergen,
          reaction: pick(ALLERGY_REACTIONS),
          severity: pick(ALLERGY_SEVERITIES),
          notes: 'Documented at registration and confirmed with the patient at each attendance.',
        }))
      : [];

    const histories: GeneratedHistory[] = [
      ...(chance(COUNTS.medicalHistoryRate)
        ? pickDistinct(MEDICAL_CONDITIONS, intBetween(1, 3)).map((condition) => ({
            kind: 'medical' as const, condition, at: daysAgo(intBetween(180, 365 * 20)),
          }))
        : []),
      ...(chance(COUNTS.surgicalHistoryRate)
        ? pickDistinct(SURGICAL_HISTORY, intBetween(1, 2)).map((condition) => ({
            kind: 'surgical' as const, condition, at: daysAgo(intBetween(180, 365 * 15)),
          }))
        : []),
      ...(chance(COUNTS.familyHistoryRate)
        ? pickDistinct(FAMILY_CONDITIONS, intBetween(1, 2)).map((condition) => ({
            kind: 'family' as const, condition, relation: pick(FAMILY_RELATIONS), at: daysAgo(intBetween(180, 365 * 10)),
          }))
        : []),
    ];

    const consents: GeneratedConsent[] = chance(COUNTS.consentRate)
      ? pickDistinct(
          [
            { consentType: 'treatment' as const, notes: 'Consent to examination and treatment recorded at registration.' },
            { consentType: 'nhis_claims' as const, notes: 'Consent to verify the GHSS membership and submit claims.' },
            { consentType: 'data_sharing' as const, notes: 'Consent to share clinical data with the referring facility.' },
            { consentType: 'billing' as const, notes: 'Consent to be billed for services not covered by the insurer.' },
            { consentType: 'research' as const, notes: 'Consent to be approached about audit and research participation.' },
          ],
          intBetween(1, 3),
        ).map((c) => {
          const grantedAt = daysAgo(intBetween(30, 700));
          // A revoked consent still needs its earlier grant date; the UI distinguishes the two.
          const revoked = chance(0.12);
          return { ...c, status: revoked ? 'revoked' as const : 'granted' as const, grantedAt, revokedAt: revoked ? daysAgo(intBetween(1, 29)) : null };
        })
      : [];

    out.push({
      folderNumber: padNumber(FOLDER_NUMBER_BLOCK + 1 + i),
      surname,
      otherNames: firstName,
      gender,
      dateOfBirth: dob,
      contact: `+23324${intBetween(1000000, 9999999)}`,
      address: pick(ADDRESSES),
      paymentMode,
      nhisNumber: nhis,
      // nhisActive must agree with the expiry date, or an expired card reads as live on the
      // eligibility banner while the expiry report still lists it as lapsed.
      nhisExpiryDate,
      nhisActive: Boolean(nhisExpiryDate && nhisExpiryDate.getTime() > Date.now()),
      phoneNumber: `+23324${intBetween(1000000, 9999999)}`,
      insuranceDetails: paymentMode === 'nhis' ? { memberId: nhis } : {},
      registeredAt: daysAgo(intBetween(0, 730)),
      maritalStatus: age < 18 ? 'single' : pick(MARITAL_STATUS),
      residenceRegion: region,
      residenceDistrict: `${region} District`,
      residenceCommunity: pick(ADDRESSES).split(',')[0],
      employer: age < 16 ? null : pick(EMPLOYERS),
      allergies,
      histories,
      consents,
    });
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// ENCOUNTER PLANS — built from COMPLAINT_SCENARIOS
//
// The generator stays free of the database: it emits codes and
// therapeutic-group keys, never names it invented. testSeed.ts
// resolves every code against a real LabTestTemplate / ScanTemplate /
// ProcedureTemplate / Diagnosis / StockItem row and drops the plan
// when the reference data has no such row, so a link can never be
// left dangling and a drug name on a prescription is always a drug
// that is actually stocked.
// ═══════════════════════════════════════════════════════════

/** Roles that appear as the actor on a seeded row, matched to a seeded username by the writer. */
export type ActorRole =
  | 'doctor' | 'nurse' | 'midwife' | 'lab_tech' | 'sonographer'
  | 'pharmacist' | 'accounts' | 'records' | 'admin' | 'hr_officer';

/** Which seeded user performed an action. The salt rotates the choice inside the role pool. */
export interface Actor {
  role: ActorRole;
  salt: number;
}

const actor = (role: ActorRole, salt = iSalt()): Actor => ({ role, salt });
let _saltCounter = 0;
const iSalt = () => (_saltCounter++ % 97);

export interface GeneratedVitals {
  attendanceKey: string;
  folderNumber: string;
  temperature: number;
  pulse: number;
  respiration: number;
  spo2: number;
  systolic: number;
  diastolic: number;
  weight: number;
  height: number;
  bmi: number | null;
  muac: number | null;
  painScore: number;
  notes: string;
  recordedAt: Date;
  recorder: Actor;
}

export interface GeneratedDiagnosisLink {
  attendanceKey: string;
  icdCode: string;
  diagnosisType: 'primary' | 'additional' | 'provisional';
  presentOnAdmission: 'Y' | 'N' | 'U';
  date: Date;
}

export interface GeneratedLab {
  attendanceKey: string;
  testCode: string;
  status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
  requestedAt: Date;
  completedAt: Date | null;
  turnaroundMinutes: number | null;
  priority: 'routine' | 'urgent' | 'stat';
  /** 0..1 — how far the seed should push values outside the reference range. */
  abnormalBias: number;
  criticalValue: boolean;
  requester: Actor;
  performer: Actor | null;
  verifier: Actor | null;
  notes: string | null;
}

export interface GeneratedScan {
  attendanceKey: string;
  scanCode: string;
  status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
  indication: string;
  requestedAt: Date;
  completedAt: Date | null;
  turnaroundMinutes: number | null;
  priority: 'routine' | 'urgent';
  /** Index into SCAN_REPORT_NARRATIVES for the template category, chosen by the writer. */
  narrativeIndex: number;
  normal: boolean;
  requester: Actor;
  performer: Actor | null;
  verifier: Actor | null;
}

export interface GeneratedMedication {
  attendanceKey: string;
  drugGroup: string;
  nameFallback: string;
  dosage: string;
  frequency: string;
  dosesPerDay: number;
  durationDays: number;
  duration: string;
  quantity: number;
  route: string;
  instructions: string;
  status: 'prescribed' | 'dispensed' | 'administered' | 'cancelled';
  prescribedAt: Date;
  dispensedAt: Date | null;
  administeredAt: Date | null;
  isInpatient: boolean;
  /** Doses already given when the seed materialises the MAR chart. */
  dosesAdministered: number;
  prescriber: Actor;
  dispenser: Actor | null;
  nurse: Actor | null;
}

export interface GeneratedProcedure {
  attendanceKey: string;
  procedureCode: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: Date;
  performedAt: Date | null;
  notes: string | null;
  complications: string;
  outcome: string;
  durationMinutes: number;
  bloodLossMl: number | null;
  anesthesiaNotes: string | null;
  intraOperativeNotes: string | null;
  postOperativeNotes: string | null;
  clinicalRecord: Record<string, unknown>;
  surgeon: Actor | null;
  assistant: Actor | null;
  creator: Actor;
}

export interface GeneratedAdmission {
  key: string;
  attendanceKey: string;
  admissionNumber: string;
  folderNumber: string;
  admissionType: 'elective' | 'emergency' | 'transfer' | 'detention_observation';
  admissionSource: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency';
  admissionDate: Date;
  lengthOfStayDays: number;
  dischargeDate: Date | null;
  dischargeStatus: 'home' | 'transfer' | 'expired' | 'against_medical_advice' | null;
  isActive: boolean;
  /** Ward the writer should find a bed in. */
  wardHint: string;
  cancelled: boolean;
  primaryDiagnosisIcd: string | null;
}

export interface GeneratedNursingNote {
  attendanceKey: string;
  admissionKey: string;
  folderNumber: string;
  templateIndex: number;
  noteType: string;
  shift: 'morning' | 'afternoon' | 'night';
  isFlagged: boolean;
  at: Date;
  author: Actor;
}

export interface GeneratedNursingTask {
  attendanceKey: string;
  admissionKey: string;
  folderNumber: string;
  templateIndex: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  scheduledAt: Date;
  completedAt: Date | null;
  notes: string | null;
  author: Actor;
  completer: Actor | null;
}

export interface GeneratedWardCharge {
  attendanceKey: string;
  admissionKey: string;
  folderNumber: string;
  chargeDate: Date;
  wardHint: string;
}

export interface GeneratedBillLinePlan {
  /** What the writer must price: a service already created on this encounter. */
  kind: 'consultation' | 'lab' | 'scan' | 'procedure' | 'medication' | 'ward' | 'consumable';
  /** Index into the encounter array of that kind (labs[0], medications[2], ...). */
  index: number;
  quantity: number;
}

export interface GeneratedBill {
  billNumber: string;
  attendanceKey: string;
  admissionKey: string | null;
  folderNumber: string | null;
  counterClientKey: string | null;
  paymentMode: 'cash' | 'nhis' | 'private_insurance' | 'corporate';
  billDate: Date;
  dueDate: Date | null;
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'cancelled';
  /** Fraction of the patient share already paid; the writer computes the money. */
  paymentFraction: number;
  discountFraction: number;
  paymentMethod: 'cash' | 'mobile_money' | 'card' | 'bank_transfer' | 'cheque';
  receiptReference: string;
  graValidated: boolean;
}

export interface GeneratedClaimItemPlan {
  kind: 'diagnosis' | 'investigation' | 'medicine' | 'procedure' | 'service' | 'gdrg';
  index: number;
}

export interface GeneratedClaim {
  key: string;
  claimNumber: string;
  billNumber: string;
  attendanceKey: string;
  folderNumber: string | null;
  counterClientKey: string | null;
  status: 'draft' | 'finalized';
  createdAt: Date;
  finalizedAt: Date | null;
  insuranceType: 'nhis' | 'private' | 'corporate';
  typeOfService: string;
  typeOfAttendance: string;
  serviceOutcome: string;
  /** Rejection/tracking narrative for the tracking events below. */
  notes: string | null;
  createdBy: Actor;
  finalizedBy: Actor | null;
  trackingEvents: Array<{
    eventType: string;
    status: string | null;
    at: Date;
    amount: number | null;
    payerReference: string | null;
    paymentReference: string | null;
    paymentMethod: string | null;
    notes: string | null;
    recorder: Actor;
  }>;
  batchKey: string | null;
}

export interface GeneratedClaimBatch {
  key: string;
  batchNumber: string;
  insuranceType: 'nhis' | 'private' | 'corporate';
  periodYear: number;
  periodMonth: number;
  status: 'generated' | 'finalized';
  generatedAt: Date;
  finalizedAt: Date | null;
  description: string;
  createdBy: Actor;
  finalizedBy: Actor | null;
}

export interface GeneratedWaiver {
  billNumber: string;
  folderNumber: string;
  waiverType: 'indigent' | 'nhis_exempt' | 'staff_discount' | 'management_discretion' | 'other';
  reason: string;
  /** Fraction of the bill total the waiver covers. */
  fraction: number;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: Date;
  approvedAt: Date | null;
  rejectionReason: string | null;
  requestedBy: Actor;
  approvedBy: Actor | null;
}

export interface GeneratedPreAuth {
  referenceNumber: string;
  attendanceKey: string;
  folderNumber: string;
  insuranceType: 'nhis' | 'private' | 'corporate';
  status: 'pending' | 'approved' | 'partially_approved' | 'rejected' | 'cancelled' | 'expired';
  requestedAt: Date;
  responseReceivedAt: Date | null;
  /** Codes the request covers; the writer prices them from ServicePricing. */
  serviceKinds: Array<{ kind: 'consultation' | 'lab' | 'scan' | 'procedure' | 'medication'; index: number }>;
  clinicalJustification: string;
  authNumber: string | null;
  authExpiry: Date | null;
  rejectionReason: string | null;
  requestedBy: Actor;
}

export interface GeneratedEligibilityCheck {
  folderNumber: string;
  attendanceKey: string | null;
  membershipId: string;
  checkMethod: 'card_reader' | 'nhia_portal' | 'offline_list' | 'manual';
  status: 'active' | 'expired' | 'suspended' | 'not_found' | 'referred_facility_mismatch';
  at: Date;
  ccCode: string | null;
  membershipExpiry: Date | null;
  checkedBy: Actor;
}

export interface GeneratedEstimate {
  referenceNumber: string;
  folderNumber: string | null;
  counterClientKey: string | null;
  attendanceKey: string | null;
  admissionKey: string | null;
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'EXPIRED';
  createdAt: Date;
  expiresAt: Date;
  validityDays: number;
  notes: string;
  termsAndConditions: string;
  items: GeneratedBillLinePlan[];
  createdBy: Actor;
  approvedBy: Actor | null;
  approvedAt: Date | null;
}

export interface GeneratedReferral {
  referralNumber: string;
  attendanceKey: string;
  folderNumber: string;
  referralType: 'outgoing' | 'incoming';
  referralReason: string;
  referralNotes: string;
  urgency: 'routine' | 'urgent' | 'stat';
  referredToFacility: string | null;
  referredToDoctor: string | null;
  referredToDepartment: string | null;
  referredFromFacility: string | null;
  referredFromDoctor: string | null;
  referralDate: Date;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  outcomeNotes: string | null;
  completedAt: Date | null;
  structuredForm: Record<string, unknown>;
  createdBy: Actor;
}

export interface GeneratedCounterClient {
  key: string;
  name: string;
  ageYears: number;
  phone: string;
  createdAt: Date;
}

export interface GeneratedAttendance {
  key: string;
  attendanceNumber: string;
  folderNumber: string | null;
  counterClientKey: string | null;
  scenarioKey: string;
  attendanceType: string;
  paymentMode: 'cash' | 'nhis' | 'private_insurance' | 'corporate';
  dateTime: Date;
  status: 'pending' | 'admitted' | 'discharged' | 'completed' | 'referred' | 'absconded' | 'cancelled';
  encounterCategory: 'opd' | 'ipd' | 'daycase';
  visitCategory: 'general' | 'specialist' | 'emergency' | 'inpatient';
  serviceCategory: 'opd' | 'ipd' | 'diagnostics' | 'pharmacy' | 'other';
  patientClassification: 'NEW' | 'OLD';
  diagnosisClassification: 'NEW_DIAGNOSIS' | 'OLD_DIAGNOSIS';
  complaints: string;
  historyPresentingComplaint: string;
  reviewOfSystems: Record<string, string>;
  physicalExamination: string;
  physicalExamStructured: Record<string, unknown>;
  assessment: string;
  treatmentPlan: string;
  clinicalOutcome: 'improved' | 'stable' | 'unchanged' | 'deteriorated' | 'deceased';
  allergyReviewStatus: 'not_reviewed' | 'no_known_allergies' | 'allergies_present';
  allergyReviewNotes: string | null;
  allergyReviewedAt: Date | null;
  medicalNotes: string;
  clinicalNotes: Record<string, unknown>;
  followUpDate: Date | null;
  finalizedAt: Date | null;
  insuranceType: 'nhis' | 'private' | 'corporate' | null;
  provider: Actor;
  providerSpecialization: string;
  allergyReviewer: Actor | null;
  finalizer: Actor | null;
  referralToDepartment: string | null;
}

export interface GeneratedBundle {
  attendances: GeneratedAttendance[];
  vitals: GeneratedVitals[];
  diagnoses: GeneratedDiagnosisLink[];
  labs: GeneratedLab[];
  scans: GeneratedScan[];
  medications: GeneratedMedication[];
  procedures: GeneratedProcedure[];
  admissions: GeneratedAdmission[];
  nursingNotes: GeneratedNursingNote[];
  nursingTasks: GeneratedNursingTask[];
  wardCharges: GeneratedWardCharge[];
  bills: GeneratedBill[];
  claims: GeneratedClaim[];
  claimBatches: GeneratedClaimBatch[];
  waivers: GeneratedWaiver[];
  preAuthorisations: GeneratedPreAuth[];
  eligibilityChecks: GeneratedEligibilityCheck[];
  estimates: GeneratedEstimate[];
  referrals: GeneratedReferral[];
  counterClients: GeneratedCounterClient[];
  antenatalBookings: any[];
  ancVisits: any[];
  deliveryRecords: any[];
  newbornRecords: any[];
  postnatalRecords: any[];
}

// ═══════════════════════════════════════════════════════════
// Encounter date distribution
//
// Attendances used to be spread uniformly over a year, which left every
// "today", "this month" and "last 72 hours" screen empty. This skews the
// same volume towards the present so the live worklists have work on them.
// ═══════════════════════════════════════════════════════════
const attendanceDate = (): Date => {
  const r = rand();
  const daysBack =
    r < 0.04 ? 0 :
    r < 0.26 ? intBetween(1, 7) :
    r < 0.52 ? intBetween(8, 30) :
    r < 0.76 ? intBetween(31, 90) :
    r < 0.93 ? intBetween(91, 200) :
    intBetween(201, 365);
  // daysAgo() picks a working hour, and for today that hour can still be ahead of the
  // clock. An encounter in the future makes every downstream timestamp nonsense - a
  // result released before it was asked for, a discharge that has not happened - so the
  // last few hours of today are simply not available to a visit that started today.
  const at = daysAgo(daysBack);
  const latest = Date.now() - 60 * 60_000;
  return at.getTime() > latest ? new Date(latest - intBetween(0, 90) * 60_000) : at;
};

const addMinutes = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);
const addHours = (d: Date, hours: number) => new Date(d.getTime() + hours * 3_600_000);
const addDays = (d: Date, days: number) => {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
};

/** Encounters that are booked theatre lists rather than already-closed operations. */
const DAYCASE_SCENARIOS = new Set(['daycase_dressing', 'cataract', 'tonsil_surgery', 'soft_tissue_lump', 'family_planning']);

const ageAt = (dob: Date, at: Date = new Date()): number =>
  Math.max(0, Math.floor((at.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000)));

/**
 * A scenario only applies to a patient who could present with it: sex, the age window,
 * and (for the outpatient-only stories) not being already committed elsewhere.
 */
const scenarioFits = (s: (typeof COMPLAINT_SCENARIOS)[number], patient: GeneratedPatient): boolean => {
  const age = ageAt(patient.dateOfBirth);
  if (age < s.minAge || age > s.maxAge) return false;
  if (s.gender === 'female' && patient.gender !== 'female') return false;
  if (s.gender === 'male' && patient.gender !== 'male') return false;
  return true;
};

const scenariosFor = (patient: GeneratedPatient) => {
  const fits = COMPLAINT_SCENARIOS.filter((s) => scenarioFits(s, patient));
  return fits.length ? fits : COMPLAINT_SCENARIOS.filter((s) => s.key === 'walk_in_diagnostics');
};

// ═══════════════════════════════════════════════════════════
// VITALS — profile derived from the presenting diagnosis, so a
// malaria encounter runs warm and a hypertensive one runs high.
// ═══════════════════════════════════════════════════════════
type VitalsProfile =
  | 'routine' | 'febrile' | 'septic' | 'hypertensive' | 'cardiac'
  | 'respiratory' | 'metabolic' | 'surgical' | 'trauma' | 'obstetric' | 'paediatric' | 'neonatal';

const vitalsProfileFor = (scenario: (typeof COMPLAINT_SCENARIOS)[number], patient: GeneratedPatient, at: Date): VitalsProfile => {
  const age = ageAt(patient.dateOfBirth, at);
  if (age < 1) return 'neonatal';
  if (age < 5) return 'paediatric';
  if (/^O[0-9]|^Z3[49]|^Z03\.5|^N98/.test(scenario.icdCodes[0] ?? '')) return 'obstetric';
  if (scenario.key === 'cholera' || scenario.key === 'diabetic_ketoacidosis') return 'septic';
  if (/^A0|^B[0-5]|^J1[0-8]|^L0[0-3]|^N1[02]|^N39/.test(scenario.icdCodes[0] ?? '')) return 'febrile';
  if (/^I10|^I1[1-5]|^G89|^G47/.test(scenario.icdCodes[0] ?? '')) return 'hypertensive';
  if (/^I2[0-5]|^I4[6-8]|^I50/.test(scenario.icdCodes[0] ?? '')) return 'cardiac';
  if (/^J4|^J44|^J45|^J96/.test(scenario.icdCodes[0] ?? '')) return 'respiratory';
  if (/^E1[01]|^E147|^N18|^M10/.test(scenario.icdCodes[0] ?? '')) return 'metabolic';
  if (/^[KS]/.test(scenario.icdCodes[0] ?? '')) return scenario.icdCodes[0]!.startsWith('S') ? 'trauma' : 'surgical';
  if (/^[D-Z]/.test(scenario.icdCodes[0] ?? '')) return 'routine';
  return scenario.admitChance > 0.5 ? 'surgical' : 'routine';
};

/** Ranges per profile: [tempC, pulse, respiration, spo2, systolic, diastolic, pain]. */
const VITALS_RANGES: Record<VitalsProfile, [number, number, number, number, number, number, number]> = {
  routine:     [36.4, 76,  16, 98, 118, 74,  0],
  febrile:     [38.4, 102, 22, 96, 116, 74,  3],
  septic:      [39.2, 124, 28, 92, 92,  56,  5],
  hypertensive:[36.6, 80,  17, 98, 168, 98,  1],
  cardiac:     [36.7, 94,  22, 94, 152, 92,  4],
  respiratory: [37.3, 98,  30, 90, 124, 78,  2],
  metabolic:   [36.9, 88,  20, 97, 136, 84,  1],
  surgical:    [37.6, 96,  20, 96, 126, 78,  6],
  trauma:      [37.1, 108, 22, 95, 112, 68,  7],
  obstetric:   [37.0, 90,  19, 98, 122, 78,  3],
  paediatric:  [37.8, 116, 28, 97, 100, 64,  2],
  neonatal:    [37.2, 138, 42, 97, 72,  44,  1],
};

const buildVitals = (profile: VitalsProfile, patient: GeneratedPatient, at: Date, attendanceKey: string): GeneratedVitals => {
  const [t, p, r, s, sys, dia, pain] = VITALS_RANGES[profile];
  const jitter = (mid: number, spread: number) => mid + between(-spread, spread);
  const age = ageAt(patient.dateOfBirth, at);
  const temperature = +jitter(t, 0.4).toFixed(1);
  const systolic = Math.round(jitter(sys, sys * 0.06));
  const diastolic = Math.round(jitter(dia, dia * 0.08));
  const weight = age < 1 ? +between(2.5, 4.5).toFixed(1)
    : age < 5 ? +between(9, 18).toFixed(1)
    : age < 12 ? +between(18, 40).toFixed(1)
    : +(patient.gender === 'female' ? between(46, 88) : between(52, 104)).toFixed(1);
  const height = age < 1 ? +between(46, 54).toFixed(1)
    : age < 5 ? +between(70, 110).toFixed(1)
    : age < 12 ? +between(110, 150).toFixed(1)
    : +between(150, 186).toFixed(1);
  const bmi = weight > 0 && height > 50 ? +(weight / Math.pow(height / 100, 2)).toFixed(1) : null;
  return {
    attendanceKey,
    folderNumber: patient.folderNumber,
    temperature,
    pulse: Math.round(jitter(p, p * 0.07)),
    respiration: Math.max(8, Math.round(jitter(r, r * 0.12))),
    spo2: Math.min(100, Math.max(85, Math.round(jitter(s, 2)))),
    systolic,
    diastolic,
    weight,
    height,
    bmi,
    muac: age >= 6 && age < 60 ? +between(11.5, 23.5).toFixed(1) : null,
    painScore: Math.max(0, Math.min(10, Math.round(jitter(pain, 1)))),
    notes: profile === 'routine'
      ? 'Observations taken on arrival and tolerated well.'
      : `Observations on arrival consistent with the presentation; repeated on the reassessment and charted.`,
    recordedAt: at,
    recorder: actor(profile === 'neonatal' || profile === 'obstetric' ? 'midwife' : 'nurse'),
  };
};

// ═══════════════════════════════════════════════════════════
// NARRATIVE FILL-INS
//
// The scenario carries the story; these pools carry the connective
// tissue (system-by-system review, dispensing advice, observations)
// so no two encounters read identically even when they share a
// presentation.
// ═══════════════════════════════════════════════════════════

const ROS_SYSTEMS: Array<{ system: string; findings: string[] }> = [
  { system: 'general', findings: ['Feverish and unwell', 'Afebrile and comfortable at rest', 'Weak, tired and off food', 'Conscious, oriented and cooperative'] },
  { system: 'cardiovascular', findings: ['No chest pain, no palpitations, no ankle swelling', 'Exertional breathlessness and orthopnoea', 'Chest tightness on effort, relieved by rest', 'Palpitations reported with the fever'] },
  { system: 'respiratory', findings: ['Cough with sputum, no breathlessness at rest', 'Dry cough, no wheeze', 'Short of breath on mild exertion', 'No cough, no wheeze, no haemoptysis'] },
  { system: 'gastrointestinal', findings: ['Nausea with two episodes of vomiting', 'Loose stools, no blood in stool', 'Epigastric pain related to meals', 'No abdominal pain, bowel action normal'] },
  { system: 'genitourinary', findings: ['Burning micturition and frequency', 'No dysuria, urine clear', 'Reduced urine output over the last day', 'No urinary symptoms'] },
  { system: 'musculoskeletal', findings: ['Generalised body ache and joint pain', 'Pain over the injured limb, unable to bear weight', 'Lower back pain radiating down the leg', 'No joint swelling or stiffness'] },
  { system: 'neurological', findings: ['Headache with neck stiffness', 'No weakness, no sensory loss, no seizure', 'Dizzy on standing, no loss of consciousness', 'Blurred vision and difficulty concentrating'] },
  { system: 'skin', findings: ['Itchy rash over the trunk', 'Wound clean, no discharge', 'No rash, no ulcer', 'Scattered healing lesions in different stages'] },
  { system: 'haematologic', findings: ['No bleeding from gums or nose, no easy bruising', 'Passing dark urine, no bleeding', 'Easy bruising and prolonged bleeding from cuts', 'No bleeding tendency'] },
];

const ROUTE_ADVICE: Record<string, string> = {
  oral: 'Swallow the tablets whole with water after food unless told otherwise.',
  IV: 'The intravenous dose is given on the ward by nursing staff and recorded on the administration chart.',
  IM: 'The injection is given by nursing staff into the upper outer quadrant of the gluteal muscle.',
  SC: 'Inject subcutaneously into the abdomen, rotating the site with each dose.',
  Topical: 'Apply a thin layer to the affected area, wash the hands afterwards and do not cover the area tightly.',
  Inhalation: 'Shake the inhaler, exhale away from the mouthpiece and rinse the mouth after the steroid dose.',
  Nebulisation: 'Give by nebuliser through a face mask while the patient is sitting upright.',
};

const DISPENSING_ADVICE = [
  'Complete the full course even if you feel better after a day or two.',
  'Take with food to reduce stomach upset.',
  'Do not share this medicine with anyone else.',
  'Return if the symptoms come back after finishing the course.',
];

const CONSULT_ADVICE_POOL = [
  'Reviewed in the clinic, treated on the day and discharged home with a written instruction sheet.',
  'Assessed at triage, examined by the medical officer on duty and managed conservatively.',
  'Seen jointly with the consultant on the ward round; plan agreed with the patient and family.',
  'Discussed the findings, the expected course and the warning signs with the patient before discharge.',
];

const LAB_NOTES_POOL = [
  'Sample collected and received in good condition; result released after internal quality check.',
  'Processed on arrival; the requesting clinician was called with the result.',
  'Repeated once for a haemolysed specimen; the second sample was satisfactory.',
  'Result discussed verbally with the medical officer on duty before release.',
];

const SCAN_NOTES_POOL = [
  'Images obtained with the patient in the position described; no prior study available for comparison.',
  'Comparison made with the previous study held in the record.',
  'Findings dictated and transcribed the same session; verified by the reporting radiologist.',
  'Preliminary findings telephoned to the requesting clinician for immediate management.',
];

const MAR_VARIANCE_REASONS = [
  'Given fifteen minutes late on the round; no change in observations.',
  'Held for a low blood pressure reading and re-charted at the next scheduled dose.',
  'Refused by the patient at the time; offered again and taken after the next meal.',
];

const pickSomeDistinct = <T>(pool: T[], max: number, min = 1): T[] => {
  const n = Math.min(pool.length, Math.max(min, intBetween(min, max)));
  return pickDistinct(pool, n);
};

const randomOf = <T>(pool: T[], fallback: T): T => (pool.length ? pick(pool) : fallback);

/**
 * A seeded prescription must survive the live allergy conflict check, so the
 * generator never offers a therapeutic group whose stems collide with an
 * allergen recorded on that patient.
 */
const groupConflicts = (groupKey: string, allergies: GeneratedAllergy[]): boolean => {
  const preset = DRUG_GROUPS[groupKey];
  if (!preset) return false;
  const stems = (preset.nameStems || []).map((s) => s.toLowerCase());
  return allergies.some((a) => {
    const allergen = a.allergen.toLowerCase();
    return stems.some((stem) => allergen.includes(stem) || stem.includes(allergen));
  });
};

const usableDrugGroups = (scenario: ComplaintScenario, allergies: GeneratedAllergy[]): string[] => {
  const allowed = scenario.drugGroups.filter((g) => !groupConflicts(g, allergies));
  if (allowed.length) return allowed;
  const safeAlternatives = Object.keys(DRUG_GROUPS).filter(
    (g) => g !== 'general' && !groupConflicts(g, allergies),
  );
  return safeAlternatives.length ? [pick(safeAlternatives)] : ['general'];
};

/**
 * The body system a diagnosis belongs to, from the ICD-10 chapter letter. A review of
 * systems that does not cover the system the patient was actually diagnosed in reads as a
 * template, so the involved systems are always asked about.
 */
const SYSTEMS_FOR_ICD_LETTER: Record<string, string[]> = {
  A: ['general'], B: ['general'], C: ['general', 'haematologic'], D: ['general', 'haematologic'],
  E: ['general', 'gastrointestinal'], F: ['general', 'neurological'],
  G: ['neurological'], H: ['general', 'skin'], I: ['cardiovascular'], J: ['respiratory'],
  K: ['gastrointestinal', 'genitourinary'], L: ['skin', 'musculoskeletal'], M: ['musculoskeletal'],
  N: ['genitourinary'], O: ['general', 'genitourinary'], Q: ['general'], R: ['general'],
  S: ['musculoskeletal', 'skin'], T: ['general', 'skin'], Z: ['general'],
};

/**
 * Which body systems the recorded story actually touches. A review of systems that leaves the
 * system the patient was diagnosed in as "not assessed" reads as a template, so the involved
 * systems are read out of the complaint, the history and the examination text - the ICD chapter
 * only adds the system the coding implies, which the free text does not always spell out.
 */
const ROS_KEYWORDS: Array<{ system: string; pattern: RegExp }> = [
  { system: 'neurological', pattern: /headache|neck stiff|stiff neck|seizure|fit|confus|drows|unconscious|vertigo|gidd|weakness|numb|tingling|tremor|strok|kernig|brudzinski|photophobia|papilloedema|slurred/i },
  { system: 'respiratory', pattern: /cough|whee|breath|asthma|sputum|haemoptysis|pleur|chest pain|pneumonia|expectorat|cyanos|desatur/i },
  { system: 'cardiovascular', pattern: /palpitat|orthopnoea|ankle swoll|tightness|oedema|cardiac|angina|hypertens|murmur|syncope on exertion|junction/i },
  { system: 'gastrointestinal', pattern: /vomit|nausea|diarrhoe|diarrhea|abdomin|epigastr|dyspeps|hæatemesis|blood in stool|constip|inguinal|umbilic|appendic|periton|bowel/i },
  { system: 'genitourinary', pattern: /urina|urine|mictur|dysuri|frequen|loin|vaginal|pre-eclam|eclamps|prolaps|menstrual|testic|penile|urethra|cathet/i },
  { system: 'musculoskeletal', pattern: /joint|back ache|back pain|limb|fractur|injur|swelling over|sprain|deformity|unable to bear weight|muscle|bone|rachi/i },
  { system: 'skin', pattern: /rash|skin|wound|ulcer|itch|pruritu|cellulitis|lesion|petechi|purpura|swelling and redness|burn|scar|jaundice/i },
  { system: 'haematologic', pattern: /bleed|bruis|pale|pallor|anaemi|anemia|transfusion|sickle|petechial/i },
  { system: 'general', pattern: /fever|pyrex|weak|tired|off food|weight loss|night sweat|rigour|chill|malais|unwell|appetite|vomiting and fever/i },
];

const KNOWN_ROS_SYSTEMS = ROS_SYSTEMS.map((entry) => entry.system);

const involvedSystemsFor = (scenario: ComplaintScenario, profile: VitalsProfile): string[] => {
  const text = `${scenario.complaints} ${scenario.history} ${scenario.examination}`;
  const fromText = ROS_KEYWORDS.filter((k) => k.pattern.test(text)).map((k) => k.system);
  const first = (scenario.icdCodes[0] ?? '').charAt(0).toUpperCase();
  const fromCode = SYSTEMS_FOR_ICD_LETTER[first] ?? [];
  const fromProfile = profile === 'septic' || profile === 'febrile' ? ['general', 'haematologic']
    : profile === 'trauma' ? ['musculoskeletal', 'skin']
      : profile === 'respiratory' ? ['respiratory']
        : profile === 'cardiac' || profile === 'hypertensive' ? ['cardiovascular']
          : [];
  // Two to five systems is what a focused history actually covers; the list is ordered so
  // the story-driven systems survive the cap. Names the review does not carry are dropped
  // here rather than later, so the count of covered systems is what the caller asked for.
  return [...new Set([...fromText, ...fromProfile, ...fromCode])]
    .filter((system) => KNOWN_ROS_SYSTEMS.includes(system))
    .slice(0, 5);
};

const buildReviewOfSystems = (scenario: ComplaintScenario, profile: VitalsProfile) => {
  const involved = involvedSystemsFor(scenario, profile);
  const rest = ROS_SYSTEMS.filter((entry) => !involved.includes(entry.system));
  // Six systems covered and the rest recorded as not asked about is what a real focused
  // history looks like; asking about everything reads as a checklist. pickDistinct takes an
  // exact number, where pickSomeDistinct takes a range - the total has to be the total.
  const chosen = [
    ...ROS_SYSTEMS.filter((entry) => involved.includes(entry.system)),
    ...pickDistinct(rest, Math.max(1, Math.min(rest.length, 6 - involved.length))),
  ];
  const out: Record<string, string> = {};
  for (const entry of chosen) {
    out[entry.system] = pick(entry.findings);
  }
  // A system the clinician did not ask about is recorded as not assessed,
  // never as a negative finding; the review screen distinguishes the two.
  for (const entry of ROS_SYSTEMS) {
    if (!out[entry.system]) out[entry.system] = 'Not assessed at this attendance';
  }
  return out;
};

/**
 * The examination block is written from the same "involved systems" list as the review of
 * systems, so a meningitis record that reported neck rigidity in the free text does not then
 * go on to record a normal neurological examination in the structured part next to it.
 */
const EXAM_LINES: Record<string, { key: string; involved: string; negative: string }> = {
  cardiovascular: {
    key: 'cardiovascular',
    involved: 'Heart sounds S1 and S2 dual, JVP not elevated, no ankle oedema; the chest is painful on palpation over the precordium',
    negative: 'Heart sounds S1 and S2 dual, no murmur, JVP not elevated, no ankle oedema',
  },
  respiratory: {
    key: 'respiratory',
    involved: 'Chest resonant with reduced air entry over the affected zone, crepitations present, respiratory rate raised',
    negative: 'Chest clear, equal air entry bilaterally, no crepitation, no wheeze',
  },
  gastrointestinal: {
    key: 'abdomen',
    involved: 'Abdomen soft, tender over the relevant region, no guarding, bowel sounds present, no organomegaly felt',
    negative: 'Abdomen soft, non-tender, no organomegaly, bowel sounds normal',
  },
  genitourinary: {
    key: 'genitourinary',
    involved: 'Loins tender on percussion, suprapubic discomfort, external genitalia normal, no catheter in situ',
    negative: 'No loin tenderness, suprapubic region soft and non-tender, no genital abnormality',
  },
  neurological: {
    key: 'neurological',
    involved: 'Conscious but drowsy, neck rigid with a positive Kernig sign, no focal weakness, cranial nerves intact, fundi normal',
    negative: 'Conscious and oriented, cranial nerves intact, no focal neurology, neck supple, fundi normal',
  },
  musculoskeletal: {
    key: 'local',
    involved: 'Swelling, tenderness and deformity over the affected limb, painful on movement, distally neurovascularly intact',
    negative: 'Joints mobile and non-tender, no deformity, no swelling, distally intact',
  },
  skin: {
    key: 'skin',
    involved: 'Rash present in the described distribution, warm and blanching on pressure, no ulceration, cannula site clean',
    negative: 'Skin intact and warm, no rash, no ulcer, cannula sites clean and dry',
  },
};

const buildStructuredExam = (
  vitals: GeneratedVitals | null,
  scenario: ComplaintScenario,
  profile: VitalsProfile,
) => {
  const involved = involvedSystemsFor(scenario, profile);
  const examined: Record<string, string> = {};
  for (const [system, line] of Object.entries(EXAM_LINES)) {
    examined[line.key] = involved.includes(system) ? line.involved : line.negative;
  }
  examined.general = profile === 'septic'
    ? 'Drowsy, pale and peripherally shut down, capillary refill delayed'
    : 'Conscious, oriented, afebrile to well hydrated, no distress at rest';
  return {
    general: {
      consciousness: profile === 'septic' ? 'Drowsy but rousable' : 'Conscious and oriented',
      hydration: profile === 'septic' ? 'Dehydrated, skin pinch slow' : 'Adequate',
      pallor: profile === 'febrile' && chance(0.4) ? 'Mildly pale' : 'Not pale',
      jaundice: profile === 'metabolic' && chance(0.2) ? 'Icteric' : 'Not icteric',
      temperatureC: vitals?.temperature ?? null,
      pulse: vitals?.pulse ?? null,
      bloodPressure: vitals ? `${vitals.systolic}/${vitals.diastolic}` : null,
      respiratoryRate: vitals?.respiration ?? null,
      oxygenSaturation: vitals?.spo2 ?? null,
      painScore: vitals?.painScore ?? null,
    },
    examinedSystems: examined,
    // Named examinations that were offered and declined, or simply not indicated - the
    // clinical record shows these as not done rather than as negative findings.
    notExamined: ['Fundoscopy', 'Rectal examination'],
  };
};

// ═══════════════════════════════════════════════════════════
// COUNTERS for the families the live CounterService mints.
// Bills, admissions and claims are derived from the visit number, so they never
// get their own block. Receipts and claim batches share the receipt block because
// one counter mints both.
// ═══════════════════════════════════════════════════════════
/**
 * Estimate (PROFORMA) reference numbers are minted from the visit counter, so
 * CounterService reads ProformaInvoice.referenceNumber when it works out where that
 * counter resumes. Seeding them above the visit block would push every future visit
 * number past six digits; below it they are simply a number the counter never sees.
 */
export const ESTIMATE_NUMBER_BLOCK = FOLDER_NUMBER_BLOCK;
/** CounterService starts every independent sequence at 10000 and pads to five digits. */
const COUNTER_BASE = 10000;
export const REQUISITION_NUMBER_BLOCK = COUNTER_BASE;
export const TRANSFER_NUMBER_BLOCK = COUNTER_BASE;
export const PURCHASE_INVOICE_PREFIX = `PIN-${new Date().getFullYear()}-`;
export const WARD_TYPE_HINTS = ['general', 'maternity', 'icu', 'pediatric', 'surgical'] as const;

interface NumberCounters {
  attendance: number;
  receipt: number;
  referral: number;
  admission: number;
  estimate: number;
  preAuth: number;
  batch: number;
  requisition: number;
  transfer: number;
  purchaseInvoice: number;
}

// ═══════════════════════════════════════════════════════════
// SUB-ENTITY EMITTERS
// ═══════════════════════════════════════════════════════════

const wardTypeFor = (scenario: ComplaintScenario, patient: GeneratedPatient, profile: VitalsProfile): string => {
  const age = ageAt(patient.dateOfBirth);
  if (scenario.specialization === 'Obstetrics') return 'maternity';
  if (age < 12 || scenario.specialization === 'Pediatrics') return 'pediatric';
  if (profile === 'septic' || (scenario.admitChance >= 0.9 && scenario.losDays[1] >= 5)) return 'icu';
  if (scenario.specialization === 'Surgery' || profile === 'trauma' || profile === 'surgical') return 'surgical';
  return 'general';
};

const emitLabs = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  scenario: ComplaintScenario,
  profile: VitalsProfile,
  elapsedMinutes: number,
  isLive: boolean,
): number => {
  const codes = scenario.labCodes.length
    ? pickSomeDistinct(scenario.labCodes, Math.min(3, scenario.labCodes.length), 1).slice()
    : chance(COUNTS.labTestsPerAttendance)
      ? pickSomeDistinct(FALLBACK_LAB_CODES, 2, 1)
      : [];
  if (profile === 'septic' || profile === 'metabolic') { if (codes.length < 2) codes.push(FALLBACK_LAB_CODES[0]); }

  for (const testCode of codes) {
    const roll = rand();
    let status: GeneratedLab['status'];
    if (isLive) status = roll < 0.45 ? 'requested' : roll < 0.75 ? 'in_progress' : 'completed';
    else if (roll < 0.84) status = 'completed';
    else if (roll < 0.90) status = 'in_progress';
    else if (roll < 0.96) status = 'requested';
    else status = 'cancelled';

    const priority: GeneratedLab['priority'] =
      profile === 'septic' || profile === 'trauma' ? (chance(0.6) ? 'stat' : 'urgent')
      : att.visitCategory === 'emergency' ? (chance(0.4) ? 'urgent' : 'routine')
      : chance(0.18) ? 'urgent' : 'routine';

    const wantTurnaround = priority === 'stat' ? intBetween(20, 55)
      : priority === 'urgent' ? intBetween(45, 180)
      : intBetween(90, 720);
    // Never claim a result that has not happened yet: a same-day encounter can
    // only be completed inside the time that has actually elapsed.
    const canComplete = status === 'completed' && (wantTurnaround <= elapsedMinutes);
    const completedAt = canComplete ? addMinutes(att.dateTime, wantTurnaround) : null;

    b.labs.push({
      attendanceKey: att.key,
      testCode,
      status: canComplete ? 'completed' : status === 'completed' ? 'in_progress' : status,
      requestedAt: att.dateTime,
      completedAt,
      turnaroundMinutes: completedAt ? wantTurnaround : null,
      priority,
      abnormalBias: profile === 'routine' ? between(0.05, 0.4) : between(0.45, 0.95),
      criticalValue: completedAt !== null && chance(priority === 'stat' ? 0.18 : 0.06),
      requester: actor('doctor'),
      performer: completedAt || status === 'in_progress' ? actor('lab_tech') : null,
      verifier: completedAt ? actor(chance(0.85) ? 'lab_tech' : 'admin') : null,
      notes: completedAt ? pick(LAB_NOTES_POOL) : null,
    });
  }
  return b.labs.filter((l) => l.attendanceKey === att.key).length;
};

const emitScans = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  scenario: ComplaintScenario,
  elapsedMinutes: number,
  isLive: boolean,
): number => {
  if (!scenario.scanCodes.length) return 0;
  const codes = pickSomeDistinct(scenario.scanCodes, Math.min(2, scenario.scanCodes.length), 1);

  for (const scanCode of codes) {
    const roll = rand();
    let status: GeneratedScan['status'];
    if (isLive) status = roll < 0.5 ? 'requested' : roll < 0.8 ? 'in_progress' : 'completed';
    else if (roll < 0.82) status = 'completed';
    else if (roll < 0.88) status = 'in_progress';
    else if (roll < 0.96) status = 'requested';
    else status = 'cancelled';

    const priority: GeneratedScan['priority'] = att.visitCategory === 'emergency' && chance(0.5) ? 'urgent' : 'routine';
    const wantTurnaround = priority === 'urgent' ? intBetween(35, 150) : intBetween(120, 1440);
    const canComplete = status === 'completed' && (wantTurnaround <= elapsedMinutes);
    const completedAt = canComplete ? addMinutes(att.dateTime, wantTurnaround) : null;
    const normal = chance(0.45);

    b.scans.push({
      attendanceKey: att.key,
      scanCode,
      status: canComplete ? 'completed' : status === 'completed' ? 'in_progress' : status,
      indication: scenario.complaints,
      requestedAt: att.dateTime,
      completedAt,
      turnaroundMinutes: completedAt ? wantTurnaround : null,
      priority,
      narrativeIndex: rnd(20),
      normal,
      requester: actor('doctor'),
      performer: completedAt || status === 'in_progress' ? actor('sonographer') : null,
      verifier: completedAt ? actor(chance(0.8) ? 'sonographer' : 'doctor') : null,
    });
  }
  return b.scans.filter((s) => s.attendanceKey === att.key).length;
};

const emitMedications = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  scenario: ComplaintScenario,
  patient: GeneratedPatient | null,
  allergies: GeneratedAllergy[],
  isInpatient: boolean,
  losDays: number,
): number => {
  if (att.status === 'cancelled') return 0;
  const groups = usableDrugGroups(scenario, allergies);
  const count = isInpatient
    ? Math.min(groups.length, Math.max(2, intBetween(2, 4)))
    : Math.min(groups.length, Math.max(1, intBetween(1, groups.length)));

  const startAt = att.dateTime;
  const chosen = groups.slice(0, count);
  for (const groupKey of chosen) {
    const preset = DRUG_GROUPS[groupKey] || DRUG_GROUPS[COUNTS ? FALLBACK_DRUG_GROUP : 'general'];
    const frequencyMeta = FREQUENCY_LABELS.find((f) => f.label.toUpperCase() === preset.frequency.toUpperCase());
    const dosesPerDay = preset.dosesPerDay || frequencyMeta?.dosesPerDay || 1;
    const durationDays = isInpatient
      ? Math.max(1, Math.min(preset.durationDays[0] ?? 3, Math.max(1, losDays)))
      : randomOf(preset.durationDays, 5);
    const dosage = randomOf(preset.dosage, '1 tablet');
    const route = randomOf(preset.route, 'oral');
    const quantity = Math.max(1, dosesPerDay * durationDays);
    const instructions = [
      `${dosage} ${preset.frequency} by ${route.toLowerCase()} for ${durationDays} day(s).`,
      ROUTE_ADVICE[route] || ROUTE_ADVICE.oral,
      pick(DISPENSING_ADVICE),
    ].join(' ');

    // Dispensing evidence only exists when the pharmacy actually issued the item,
    // and only inpatient prescriptions go on the drug chart (MAR).
    const dispenseRate = isInpatient ? COUNTS.dispenseRateInpatient : COUNTS.dispenseRateOutpatient;
    const dispensed = chance(dispenseRate);
    const dispensedAt = dispensed ? addMinutes(startAt, intBetween(8, 90)) : null;
    const charted = isInpatient && dispensed;
    const totalDoses = Math.max(1, dosesPerDay * durationDays);
    const elapsedDays = Math.max(0, Math.min(durationDays, (Date.now() - startAt.getTime()) / 86_400_000));
    const dosesAdministered = charted
      ? Math.max(att.status === 'discharged' || att.status === 'completed' ? totalDoses : 0,
          Math.min(totalDoses, Math.round(elapsedDays * dosesPerDay)))
      : 0;

    b.medications.push({
      attendanceKey: att.key,
      drugGroup: groupKey,
      // Only used if the writer finds no stocked item in the group; it is never
      // presented as a real product unless the database actually holds it.
      nameFallback: 'Paracetamol 500mg',
      dosage,
      frequency: preset.frequency,
      dosesPerDay,
      durationDays,
      duration: `${durationDays} day${durationDays === 1 ? '' : 's'}`,
      quantity,
      route,
      instructions,
      // A cancelled encounter never reaches this function, so the chart states below are
      // the only ones a live prescription can be in.
      status: charted && dosesAdministered >= totalDoses ? 'administered'
        : dispensed ? 'dispensed'
        : 'prescribed',
      prescribedAt: startAt,
      dispensedAt,
      administeredAt: charted && dosesAdministered > 0 ? addMinutes(startAt, intBetween(10, 60)) : null,
      isInpatient: charted,
      dosesAdministered,
      prescriber: actor('doctor'),
      dispenser: dispensed ? actor('pharmacist') : null,
      nurse: charted ? actor(isInpatient && scenario.specialization === 'Obstetrics' ? 'midwife' : 'nurse') : null,
    });
  }
  return b.medications.filter((m) => m.attendanceKey === att.key).length;
};

const emitProcedures = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  scenario: ComplaintScenario,
  isInpatient: boolean,
  isLive: boolean,
): number => {
  if (!scenario.procedureCodes.length) return 0;
  const wantsProcedure = isInpatient || DAYCASE_SCENARIOS.has(scenario.key) || att.attendanceType === 'surgery';
  if (!wantsProcedure || !chance(COUNTS.proceduresPerSurgicalAttendance)) return 0;

  const codes = pickSomeDistinct(scenario.procedureCodes, 2, 1);
  for (const procedureCode of codes) {
    // A same-day emergency encounter is still on the theatre list; an old one is finished.
    const scheduledAt = isLive && att.status === 'pending'
      ? daysFromNow(intBetween(1, 4))
      : addMinutes(att.dateTime, intBetween(60, 720));
    const completed = !(isLive && att.status === 'pending') && chance(0.93);
    const inProgress = !completed && isLive;
    const performedAt = completed ? new Date(Math.min(Date.now(), addMinutes(scheduledAt, intBetween(45, 240)).getTime())) : null;

    b.procedures.push({
      attendanceKey: att.key,
      procedureCode,
      status: att.status === 'cancelled' ? 'cancelled' : completed ? 'completed' : inProgress ? 'in_progress' : 'scheduled',
      scheduledDate: scheduledAt,
      performedAt,
      notes: completed || inProgress ? pick(INTRAOPERATIVE_TEMPLATES) : 'Booked on the theatre list; pre-assessment clinic cleared the patient.',
      complications: pick(PROCEDURE_COMPLICATIONS),
      outcome: completed ? pick(PROCEDURE_OUTCOMES) : 'Pending',
      durationMinutes: intBetween(25, 210),
      bloodLossMl: completed ? intBetween(20, 600) : null,
      anesthesiaNotes: completed || inProgress ? pick(ANAESTHESIA_PLANS) : 'Anaesthetic pre-assessment pending; airway assessment not yet documented.',
      intraOperativeNotes: completed ? pick(INTRAOPERATIVE_TEMPLATES) : null,
      postOperativeNotes: completed ? pick(POSTOPERATIVE_TEMPLATES) : null,
      clinicalRecord: {
        form: 'theatre_and_anaesthesia_record',
        preAssessment: {
          asaGrade: pick(['I', 'II', 'II', 'III']),
          airway: pick(['Mallampati I', 'Mallampati II', 'Mallampati III']),
          fastingStatus: 'Confirmed with the patient before induction.',
          consent: 'Written informed consent for the procedure and anaesthesia held in the notes.',
        },
       WHO: {
          signIn: 'Patient identity, site and procedure confirmed with the patient awake.',
          timeOut: 'Team introduction, allergies, anticipated blood loss and imaging displayed before incision.',
          signOut: 'Instrument, sponge and needle counts declared complete; specimen labelled and handed over.',
        },
        anaesthesiaPlan: completed || inProgress ? pick(ANAESTHESIA_PLANS) : null,
        intraoperative: completed ? pick(INTRAOPERATIVE_TEMPLATES) : null,
        postoperative: completed ? pick(POSTOPERATIVE_TEMPLATES) : null,
        complications: pick(PROCEDURE_COMPLICATIONS),
        outcome: completed ? pick(PROCEDURE_OUTCOMES) : 'Pending',
        bloodLossMl: completed ? intBetween(20, 600) : null,
        handover: 'Patient handed over to the ward team with the operative findings, fluid balance and analgesic plan.',
      },
      surgeon: completed || inProgress ? actor('doctor') : null,
      assistant: completed ? actor('doctor') : null,
      creator: actor('records'),
    });
  }
  return b.procedures.filter((p) => p.attendanceKey === att.key).length;
};

const emitAdmission = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  scenario: ComplaintScenario,
  patient: GeneratedPatient,
  counters: NumberCounters,
  daysBack: number,
  wardHint: string,
): GeneratedAdmission | null => {
  const shouldAdmit = att.encounterCategory === 'ipd' || att.encounterCategory === 'daycase';
  if (!shouldAdmit) return null;

  const losDays = att.encounterCategory === 'daycase' ? 1 : intBetween(scenario.losDays[0], scenario.losDays[1]);
  // A stay that started within the last few days is still open; anything older has closed.
  // The writer caps genuinely active admissions to the beds it actually has free.
  const isActive = att.encounterCategory === 'ipd' && daysBack < losDays && att.status === 'admitted';
  const admissionDate = att.dateTime;
  const dischargeDate = isActive ? null : addDays(admissionDate, Math.max(1, losDays));
  const outcome = scenario.outcome;
  const dischargeStatus: GeneratedAdmission['dischargeStatus'] = isActive
    ? null
    : outcome === 'deceased' ? 'expired'
    : chance(0.05) ? 'against_medical_advice'
    : chance(0.12) ? 'transfer'
    : 'home';

  const admission: GeneratedAdmission = {
    key: `adm-${b.admissions.length + 1}`,
    attendanceKey: att.key,
    admissionNumber: att.attendanceNumber,
    folderNumber: patient.folderNumber,
    admissionType: scenario.admissionType,
    admissionSource: att.visitCategory === 'emergency'
      ? 'emergency'
      : scenario.admissionType === 'transfer' ? 'another_facility'
      : scenario.admissionType === 'elective' ? chance(0.5) ? 'referral' : 'opd'
      : chance(0.6) ? 'opd' : 'home',
    admissionDate,
    lengthOfStayDays: Math.max(1, losDays),
    dischargeDate,
    dischargeStatus,
    isActive,
    wardHint,
    cancelled: att.status === 'cancelled',
    primaryDiagnosisIcd: scenario.icdCodes[0] ?? null,
  };
  b.admissions.push(admission);

  const nursingAuthor = wardHint === 'maternity' ? 'midwife' : 'nurse';
  const noteCount = isActive || losDays > 0 ? COUNTS.nursingNotesPerAdmission : 0;
  const lastDay = isActive ? Math.max(0, Math.min(losDays, Math.floor((Date.now() - admissionDate.getTime()) / 86_400_000))) : losDays;
  for (let n = 0; n < noteCount; n++) {
    const dayOffset = lastDay > 0 ? Math.min(lastDay, Math.round(((n + 1) / noteCount) * lastDay)) : 0;
    const at = addMinutes(addDays(admissionDate, dayOffset), intBetween(0, 11 * 60));
    if (at.getTime() > Date.now()) continue;
    b.nursingNotes.push({
      attendanceKey: att.key,
      admissionKey: admission.key,
      folderNumber: patient.folderNumber,
      templateIndex: n === 0 ? 0 : n === noteCount - 1 && !isActive ? 4 : rnd(NURSING_NOTE_TEMPLATES.length),
      noteType: '',
      shift: intBetween(0, 2) === 0 ? 'morning' : intBetween(0, 2) === 1 ? 'afternoon' : 'night',
      isFlagged: false,
      at,
      author: actor(nursingAuthor as ActorRole),
    });
  }
  // Correct the note type from the template the index points at, so the writer
  // never has to guess which narrative it is filling in.
  for (const note of b.nursingNotes.filter((x) => x.admissionKey === admission.key && !x.noteType)) {
    const template = NURSING_NOTE_TEMPLATES[note.templateIndex];
    note.noteType = template?.type || 'general';
    note.isFlagged = Boolean(template?.flagged);
  }

  const taskCount = COUNTS.nursingTasksPerAdmission;
  for (let t = 0; t < taskCount; t++) {
    const scheduledAt = addMinutes(admissionDate, intBetween(30, Math.max(60, lastDay * 24 * 60)));
    const done = isActive ? chance(0.55) : chance(0.85);
    const overdue = !isActive && !done && chance(0.4);
    b.nursingTasks.push({
      attendanceKey: att.key,
      admissionKey: admission.key,
      folderNumber: patient.folderNumber,
      templateIndex: rnd(NURSING_TASK_TEMPLATES.length),
      status: done ? 'completed' : overdue ? 'skipped' : isActive ? (chance(0.3) ? 'in_progress' : 'pending') : 'pending',
      scheduledAt,
      completedAt: done ? addMinutes(scheduledAt, intBetween(5, 120)) : null,
      notes: done ? 'Completed as charted and handed over at the bedside.' : null,
      author: actor(nursingAuthor as ActorRole),
      completer: done ? actor(nursingAuthor as ActorRole) : null,
    });
  }

  // One bed charge per night actually occupied, never beyond today.
  const chargeDays = isActive ? Math.max(1, lastDay) : Math.max(1, losDays);
  for (let d = 0; d < chargeDays; d++) {
    const chargeDate = addDays(admissionDate, d);
    if (chargeDate.getTime() > Date.now()) break;
    b.wardCharges.push({
      attendanceKey: att.key,
      admissionKey: admission.key,
      folderNumber: patient.folderNumber,
      chargeDate,
      wardHint,
    });
  }
  void counters;
  return admission;
};

const emitBill = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  patient: GeneratedPatient | null,
  counterClientKey: string | null,
  made: { labs: number; scans: number; meds: number; procs: number; wardDays: number; consultation: boolean },
  admission: GeneratedAdmission | null,
  counters: NumberCounters,
): GeneratedBill => {
  const billNumber = `BILL-${att.attendanceNumber}`;
  const roll = rand();
  const settled = att.status === 'cancelled';
  const paymentFraction = settled
    ? 0
    : att.paymentMode === 'cash'
      ? roll < 0.62 ? 1 : roll < 0.85 ? between(0.2, 0.9) : 0
      : roll < 0.30 ? 1 : roll < 0.72 ? between(0.1, 0.8) : 0;

  const status: GeneratedBill['status'] = settled
    ? 'cancelled'
    : paymentFraction >= 1 ? 'paid'
    : paymentFraction > 0 ? 'partial'
    : att.status === 'pending' || att.status === 'admitted' ? 'draft'
    : 'pending';

  const bill: GeneratedBill = {
    billNumber,
    attendanceKey: att.key,
    admissionKey: admission ? admission.key : null,
    folderNumber: patient ? patient.folderNumber : null,
    counterClientKey,
    paymentMode: att.paymentMode,
    billDate: att.status === 'pending' ? att.dateTime : addMinutes(att.dateTime, intBetween(20, 240)),
    dueDate: att.paymentMode === 'cash' ? addDays(att.dateTime, intBetween(7, 60)) : null,
    status,
    paymentFraction,
    discountFraction: chance(0.12) ? between(0.05, 0.2) : 0,
    paymentMethod: att.paymentMode === 'cash'
      ? pick(['cash', 'cash', 'mobile_money', 'mobile_money', 'card', 'bank_transfer'])
      : pick(['bank_transfer', 'mobile_money', 'cheque']),
    receiptReference: paymentFraction > 0 ? `RCP-${padNumber(++counters.receipt)}` : '',
    graValidated: status === 'paid' && chance(0.7),
  };

  const lines: GeneratedBillLinePlan[] = [];
  if (made.consultation) lines.push({ kind: 'consultation', index: 0, quantity: 1 });
  for (let i = 0; i < made.labs; i++) lines.push({ kind: 'lab', index: i, quantity: 1 });
  for (let i = 0; i < made.scans; i++) lines.push({ kind: 'scan', index: i, quantity: 1 });
  for (let i = 0; i < made.procs; i++) lines.push({ kind: 'procedure', index: i, quantity: 1 });
  for (let i = 0; i < made.meds; i++) {
    const med = b.medications.filter((m) => m.attendanceKey === att.key)[i];
    if (med && med.status !== 'cancelled') lines.push({ kind: 'medication', index: i, quantity: 1 });
  }
  for (let i = 0; i < made.wardDays; i++) lines.push({ kind: 'ward', index: i, quantity: 1 });

  (bill as GeneratedBill & { lines: GeneratedBillLinePlan[] }).lines = lines;
  b.bills.push(bill);
  return bill;
};

const emitReferral = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  patient: GeneratedPatient,
  scenario: ComplaintScenario,
  counters: NumberCounters,
): void => {
  const outgoing = chance(0.7);
  const facility = randomOf(HOSPITALS, 'Korle Bu Teaching Hospital');
  const department = randomOf(REFERABLE_DEPARTMENTS, 'Surgery');
  b.referrals.push({
    referralNumber: `REF-${padNumber(++counters.referral)}`,
    attendanceKey: att.key,
    folderNumber: patient.folderNumber,
    referralType: outgoing ? 'outgoing' : 'incoming',
    referralReason: scenario.assessment,
    referralNotes: outgoing
      ? `Referred to ${facility} for ${pick(['specialist opinion', 'further investigation', 'definitive management', 'a service not available at this facility'])}.`
      : `Accepted from ${facility}; the referral letter and the investigations already done are attached to this record.`,
    urgency: att.visitCategory === 'emergency' ? 'urgent' : chance(0.3) ? 'urgent' : 'routine',
    referredToFacility: outgoing ? facility : HOSPITALS[0],
    referredToDoctor: outgoing ? `Dr ${randomOf(SURNAMES, 'Mensah')}` : null,
    referredToDepartment: outgoing ? department : null,
    referredFromFacility: outgoing ? null : facility,
    referredFromDoctor: outgoing ? null : `Dr ${randomOf(SURNAMES, 'Osei')}`,
    referralDate: att.dateTime,
    status: outgoing
      ? att.status === 'referred' ? (chance(0.5) ? 'pending' : 'accepted') : pick(['completed', 'accepted', 'pending'])
      : pick(['accepted', 'completed']),
    outcomeNotes: chance(0.5)
      ? 'Specialist opinion received and the patient returned for continued care at this facility.'
      : null,
    completedAt: null,
    structuredForm: {
      part1: {
        patientFolderNumber: patient.folderNumber,
        referringFacility: outgoing ? 'This facility' : facility,
        referringOfficer: `Dr ${randomOf(SURNAMES, 'Mensah')}`,
        reasonForReferral: scenario.assessment,
        provisionalDiagnosis: scenario.icdCodes[0] ?? null,
        treatmentGiven: scenario.treatmentPlan,
        patientCondition: scenario.outcome === 'deceased' ? 'Critical' : 'Stable',
      },
      part2: {
        dateReceived: att.dateTime.toISOString(),
        diagnosisOnAdmission: scenario.icdCodes[0] ?? null,
        treatmentGivenAtReceivingFacility: scenario.treatmentPlan,
        outcomeOfTreatment: scenario.outcome,
        remarks: 'Reply dispatched to the referring facility.',
      },
    },
    createdBy: actor(outgoing ? 'doctor' : 'records'),
  });
  const last = b.referrals[b.referrals.length - 1];
  if (last.status === 'completed') last.completedAt = addDays(att.dateTime, intBetween(1, 21));
};

const HOSPITALS = [
  'Korle Bu Teaching Hospital', 'Komfo Anokye Teaching Hospital', 'Takoradi Teaching Hospital',
  'Cape Coast Teaching Hospital', 'Tamale Teaching Hospital', 'Ga East Municipal Hospital',
  'Srikarda Memorial Hospital', 'Nkawkaw Government Hospital',
];
const REFERABLE_DEPARTMENTS = ['Surgery', 'Internal Medicine', 'Obstetrics & Gynaecology', 'Paediatrics', 'Orthopaedics', 'Neurosurgery', 'Cardiology', 'Ophthalmology', 'Dermatology'];

/**
 * Beds are finite and the writer can only assign an active admission a bed that
 * is genuinely free, so the number of encounters left open on the ward is capped.
 */
const MAX_ACTIVE_ADMISSIONS = 40;

/**
 * What the maternity cascade fixes about an encounter. Every field is optional: a visit
 * that merely happened to draw an obstetric scenario leaves them unset, and the generator
 * invents dates that are self-consistent for that one visit.
 */
interface MaternityPlan {
  /** The visit type, instead of drawing one from the scenario's list. */
  attendanceType?: string;
  /** Last menstrual period - every gestational age in the story is measured from it. */
  lmp?: Date;
  /** The birth this booking is heading to, so a review is never dated after it. */
  dueDate?: Date;
  /** Days since the birth, for the postnatal check. */
  puerperiumDay?: number;
}

const maternityContext = (
  b: GeneratedBundle,
  att: GeneratedAttendance,
  scenario: ComplaintScenario,
  patient: GeneratedPatient,
  obs: MaternityPlan = {},
): void => {
  const female = patient.gender === 'female';
  if (!female) return;

  const isBooking = att.attendanceType === 'antenatal' && scenario.key !== 'premature_rom';
  if (isBooking) {
    const bookingKey = `anc-${att.key}`;
    const lmpDate = obs.lmp ?? addDays(att.dateTime, -intBetween(30, 210));
    const eddDate = addDays(lmpDate, 280);
    const gestation = Math.min(40, Math.max(6, Math.floor((att.dateTime.getTime() - lmpDate.getTime()) / (7 * 86_400_000))));
    const riskLevel = scenario.key === 'anc_malaria_anaemia' ? 'high' : chance(0.15) ? 'medium' : 'low';
    const isActive = att.dateTime.getTime() > Date.now() - 240 * 86_400_000;
    b.antenatalBookings.push({
      bookingKey,
      attendanceKey: att.key,
      folderNumber: patient.folderNumber,
      bookingDate: att.dateTime,
      lmp: lmpDate,
      edd: eddDate,
      gravida: intBetween(1, 5),
      para: intBetween(0, 4),
      gestationalAgeWeeks: gestation,
      riskLevel,
      bloodGroup: pick(['O+', 'A+', 'B+', 'AB+', 'O-']),
      hivStatus: chance(0.04) ? 'Positive' : 'Negative',
      hbLevel: +between(scenario.key === 'anc_malaria_anaemia' ? 7 : 10, 14).toFixed(1),
      isActive,
    });
    // A booking is the first antenatal contact, so the routine reviews that follow it are
    // dated forward from it - and a review that has not happened yet is not written.
    // The count is drawn once: re-rolling it every step would make the length of the
    // follow-up a coin toss per visit instead of a plan for the pregnancy.
    const reviewCount = intBetween(1, 6);
    for (let v = 1; v <= reviewCount; v++) {
      const visitDate = addDays(att.dateTime, v * 28);
      if (visitDate.getTime() > Date.now()) break;
      // A review after the birth is not a review, so the cascade stops at the delivery it knows about.
      if (obs.dueDate && visitDate.getTime() > obs.dueDate.getTime() - 7 * 86_400_000) break;
      const visitGestation = Math.min(41, gestation + v * 4);
      b.ancVisits.push({
        bookingKey,
        visitNumber: v,
        visitDate,
        gestationalAgeWeeks: visitGestation,
        weight: +between(52, 96).toFixed(1),
        bloodPressure: `${intBetween(100, 152)}/${intBetween(60, 96)}`,
        // The symphysis-fundal height in centimetres tracks the gestational age from 20 weeks.
        fundalHeight: Math.max(6, visitGestation - 2),
        fetalHeartRate: intBetween(118, 160),
        riskLevel,
      });
    }
    return;
  }

  if (att.attendanceType === 'delivery') {
    const deliveryKey = `del-${att.key}`;
    const isTwins = chance(0.05);
    const caesarean = scenario.key === 'caesarean' || scenario.key === 'obstructed_labour' || chance(0.25);
    const outcome: string = scenario.outcome === 'deceased'
      ? 'stillbirth_fresh'
      : chance(0.96) ? 'live_birth' : 'stillbirth_fresh';
    const validOutcomes = ['live_birth', 'neonatal_death', 'stillbirth_fresh', 'stillbirth_macerated'];
    const deliveryOutcome = validOutcomes.includes(outcome) ? outcome : 'live_birth';
    const deliveryType = caesarean ? 'caesarean_section' : isTwins ? 'multiple' : 'spontaneous_vertex';
    // With a known last period the gestation is the arithmetic of the pregnancy, not a guess,
    // so the booking, the reviews and this birth all report the same baby.
    const gestationWeeks = obs.lmp
      ? Math.max(24, Math.min(42, Math.floor((att.dateTime.getTime() - obs.lmp.getTime()) / (7 * 86_400_000))))
      : Math.min(42, intBetween(scenario.key === 'premature_rom' ? 30 : 36, scenario.key === 'premature_rom' ? 36 : 42));

    b.deliveryRecords.push({
      deliveryKey,
      attendanceKey: att.key,
      folderNumber: patient.folderNumber,
      deliveryDate: att.dateTime,
      deliveryType,
      deliveryOutcome,
      placeOfDelivery: 'private_hospital',
      attendant: 'Midwife on duty',
      gestationWeeks,
      birthWeight: isTwins ? 2400 : intBetween(2500, 4000),
      apgarScore1min: deliveryOutcome === 'live_birth' ? intBetween(6, 9) : 0,
      apgarScore5min: deliveryOutcome === 'live_birth' ? intBetween(8, 10) : 0,
      maternalOutcome: scenario.outcome === 'deceased' ? 'dead_direct_cause' : 'alive',
      complications: scenario.key === 'postpartum_haemorrhage'
        ? ['Primary postpartum haemorrhage']
        : isTwins ? ['Preterm labour'] : [],
      malePartnerPresentANC: chance(0.45),
      malePartnerPresentDelivery: chance(0.3),
      malePartnerPresentPNC: chance(0.25),
      maternalDeathsAudited: scenario.outcome === 'deceased',
    });

    const babies = isTwins ? 2 : 1;
    for (let n = 1; n <= babies; n++) {
      b.newbornRecords.push({
        deliveryKey,
        order: n,
        birthWeight: isTwins ? intBetween(2000, 2800) : intBetween(2500, 4000),
        gender: chance(0.5) ? 'male' : 'female',
        apgarScore1min: deliveryOutcome === 'live_birth' ? intBetween(6, 9) : 0,
        apgarScore5min: deliveryOutcome === 'live_birth' ? intBetween(8, 10) : 0,
        // A stillbirth is reported as a stillbirth for the baby too; only a baby that was
        // born alive and then died is recorded as a neonatal death.
        outcome: deliveryOutcome === 'live_birth' ? 'alive'
          : deliveryOutcome === 'neonatal_death' ? 'dead_within_24hrs'
            : deliveryOutcome === 'stillbirth_macerated' ? 'stillbirth_macerated' : 'stillbirth_fresh',
        anomalies: [],
        breastfeedingWithin30Min: deliveryOutcome === 'live_birth',
        eyeProphylaxisGiven: true,
        cordCareMethod: 'dry_cord',
      });
    }
  }

  if (att.attendanceType === 'postnatal' && scenario.key === 'postnatal_review') {
    // The day number is the distance from the birth, so what the record reports is the
    // puerperium the register then links it to. A mother whose baby was delivered elsewhere
    // has no birth here to be dated from, and the visit says how long she has been followed.
    const attended = (b.deliveryRecords as Array<{ folderNumber: string; deliveryDate: Date }>)
      .filter((d) => d.folderNumber === patient.folderNumber && d.deliveryDate.getTime() <= att.dateTime.getTime())
      .sort((a, c) => c.deliveryDate.getTime() - a.deliveryDate.getTime())[0];
    const daysSinceBirth = attended
      ? Math.floor((att.dateTime.getTime() - attended.deliveryDate.getTime()) / 86_400_000)
      : null;
    b.postnatalRecords.push({
      attendanceKey: att.key,
      folderNumber: patient.folderNumber,
      examinationDate: att.dateTime,
      // The cascade dates the check from the birth, so the day number it reports is the real one.
      dayNumber: obs.puerperiumDay ?? (daysSinceBirth !== null && daysSinceBirth >= 1 ? daysSinceBirth : pick([1, 3, 7, 14, 42])),
      maternalCondition: scenario.outcome === 'improved' ? 'good' : 'fair',
      maternalComplications: [],
      maternalDangerSigns: chance(0.1) ? ['Fever'] : [],
      babyDangerSigns: chance(0.08) ? ['Poor feeding'] : [],
      breastfeedingStatus: pick(['exclusive', 'exclusive', 'mixed']),
      babyCondition: 'good',
      lochia: 'normal',
      perinealCondition: chance(0.2) ? 'granulation' : 'intact',
      latching: 'good',
      jaundice: chance(0.1),
      cordCondition: 'dry',
      bcgGiven: true,
      opv0Given: true,
      hepB0Given: true,
      familyPlanningDiscussed: chance(0.6),
      malePartnerPresentPNC: chance(0.35),
    });
  }
};

/**
 * One encounter, end to end: the story, the observations it was seen in, what
 * was ordered, what came back, what was prescribed, whether it was admitted,
 * what it was billed for and where it went afterwards.
 */
const emitEncounter = (
  b: GeneratedBundle,
  counters: NumberCounters,
  patient: GeneratedPatient | null,
  counterClientKey: string | null,
  scenario: ComplaintScenario,
  dateTime: Date,
  state: { activeAdmissions: number },
  obs: MaternityPlan = {},
): GeneratedAttendance => {
  const index = b.attendances.length + 1;
  const key = `att-${index}`;
  const attendanceNumber = padNumber(++counters.attendance);
  const daysBack = Math.max(0, Math.floor((Date.now() - dateTime.getTime()) / 86_400_000));
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - dateTime.getTime()) / 60_000));
  const paymentMode = patient ? patient.paymentMode : 'cash';
  const allergies = patient ? patient.allergies : [];
  const profile = vitalsProfileFor(scenario, patient || syntheticPatient(counterClientKey, scenario), dateTime);

  const attendanceType = obs.attendanceType ?? randomOf(scenario.types, 'general_consultation');
  const forcesAdmission = attendanceType === 'surgery' || attendanceType === 'delivery';
  // A counter ticket has no patient behind it, and a bed is issued to a patient, so a
  // walk-in can never be an admission or a daycase. Both worklists read patient-backed
  // encounters, and an ipd row without an admission strand the writer with no bed to bill.
  const admits = !!patient && (forcesAdmission || chance(scenario.admitChance));
  const daycaseCandidate = !admits && !!patient && DAYCASE_SCENARIOS.has(scenario.key) && scenario.procedureCodes.length > 0;
  const isDaycase = daycaseCandidate && chance(0.75);
  const encounterCategory: GeneratedAttendance['encounterCategory'] = admits ? 'ipd' : isDaycase ? 'daycase' : 'opd';

  const losGuess = encounterCategory === 'daycase' ? 1 : Math.max(1, intBetween(scenario.losDays[0], scenario.losDays[1]));
  const canStayOpen = encounterCategory === 'ipd' && daysBack < losGuess && state.activeAdmissions < MAX_ACTIVE_ADMISSIONS;

  let status: GeneratedAttendance['status'];
  if (chance(0.006)) status = 'cancelled';
  else if (encounterCategory === 'ipd') status = canStayOpen && chance(0.55) ? 'admitted' : chance(0.03) ? 'absconded' : 'discharged';
  else if (encounterCategory === 'daycase') status = daysBack === 0 && chance(0.4) ? 'pending' : 'completed';
  else if (scenario.key === 'detention') status = 'admitted';
  else if (daysBack === 0 && chance(0.4)) status = 'pending';
  else status = 'completed';
  if (status === 'admitted') state.activeAdmissions++;

  const visitCategory: GeneratedAttendance['visitCategory'] =
    attendanceType === 'emergency_acute' ? 'emergency'
    : attendanceType === 'specialist_consultation' ? 'specialist'
    : encounterCategory !== 'opd' ? 'inpatient'
    : 'general';
  const serviceCategory: GeneratedAttendance['serviceCategory'] =
    encounterCategory === 'opd'
      ? scenario.key === 'walk_in_diagnostics' ? 'diagnostics' : 'opd'
      : encounterCategory === 'daycase' ? 'opd' : 'ipd';

  const hasAllergies = allergies.length > 0;
  const allergyReviewStatus: GeneratedAttendance['allergyReviewStatus'] = hasAllergies
    ? 'allergies_present'
    : status === 'pending' && chance(0.35) ? 'not_reviewed' : 'no_known_allergies';

  const providerSpecialization = scenario.specialization;
  const att: GeneratedAttendance = {
    key,
    attendanceNumber,
    folderNumber: patient ? patient.folderNumber : null,
    counterClientKey,
    scenarioKey: scenario.key,
    attendanceType,
    paymentMode,
    dateTime,
    status,
    encounterCategory,
    visitCategory,
    serviceCategory,
    patientClassification: chance(0.35) ? 'NEW' : 'OLD',
    diagnosisClassification: chance(0.7) ? 'NEW_DIAGNOSIS' : 'OLD_DIAGNOSIS',
    complaints: scenario.complaints,
    historyPresentingComplaint: scenario.history,
    reviewOfSystems: {} as Record<string, string>,
    physicalExamination: scenario.examination,
    physicalExamStructured: {},
    assessment: scenario.assessment,
    treatmentPlan: `${scenario.treatmentPlan} ${pick(GENERAL_SAFETY_NET)}`,
    clinicalOutcome: status === 'pending' || status === 'admitted' ? 'stable' : scenario.outcome,
    allergyReviewStatus,
    allergyReviewNotes: hasAllergies
      ? `Allergy list reviewed with the patient: ${allergies.map((a) => a.allergen).join(', ')}. Conflicting drugs avoided on the prescription.`
      : allergyReviewStatus === 'no_known_allergies'
        ? 'Asked directly about drug, food and latex allergy; the patient denies any reaction and the list is empty.'
        : null,
    allergyReviewedAt: allergyReviewStatus === 'not_reviewed' ? null : dateTime,
    medicalNotes: `${scenario.assessment} ${scenario.advice} ${pick(CONSULT_ADVICE_POOL)}`,
    clinicalNotes: {
      scenarioKey: scenario.key,
      triage: { category: visitCategory, painScore: 0 },
      safetyNetAdvice: scenario.advice,
      documentation: { historyTakenBy: 'Clinician on duty', examination: 'Complete examination recorded in the structured fields' },
      followUpPlan: scenario.followUpDays,
    },
    followUpDate: null,
    finalizedAt: null,
    insuranceType: paymentMode === 'nhis' ? 'nhis'
      : paymentMode === 'private_insurance' ? 'private'
      : paymentMode === 'corporate' ? 'corporate' : null,
    provider: actor('doctor'),
    providerSpecialization,
    allergyReviewer: allergyReviewStatus === 'not_reviewed' ? null : actor('doctor'),
    finalizer: null,
    referralToDepartment: null,
  };

  const vitals = chance(COUNTS.vitalsPerAttendance)
    ? buildVitals(profile, patient || syntheticPatient(counterClientKey, scenario), dateTime, key)
    : null;
  if (vitals) b.vitals.push(vitals);
  att.reviewOfSystems = buildReviewOfSystems(scenario, profile);
  att.physicalExamStructured = buildStructuredExam(vitals, scenario, profile);
  if (vitals) (att.clinicalNotes as Record<string, unknown>).triage = {
    category: visitCategory,
    painScore: vitals.painScore,
    temperatureC: vitals.temperature,
    bloodPressure: `${vitals.systolic}/${vitals.diastolic}`,
    oxygenSaturation: vitals.spo2,
  };

  // ── DIAGNOSIS: a pending encounter is still a working diagnosis
  if (status !== 'cancelled' && status !== 'pending' && scenario.icdCodes.length) {
    const codes = pickSomeDistinct(scenario.icdCodes, 3, 1);
    codes.forEach((icdCode, i) => {
      b.diagnoses.push({
        attendanceKey: key,
        icdCode,
        diagnosisType: i === 0 ? 'primary' : 'additional',
        presentOnAdmission: encounterCategory === 'ipd' ? (chance(0.8) ? 'Y' : 'N') : 'U',
        date: addMinutes(dateTime, intBetween(15, 120)),
      });
    });
  } else if (status === 'pending' && scenario.icdCodes.length && chance(0.6)) {
    b.diagnoses.push({
      attendanceKey: key,
      icdCode: scenario.icdCodes[0],
      diagnosisType: 'provisional',
      presentOnAdmission: 'Y',
      date: addMinutes(dateTime, intBetween(10, 45)),
    });
  }

  const made = { labs: 0, scans: 0, meds: 0, procs: 0, wardDays: 0, consultation: status !== 'cancelled' };
  const isLive = daysBack === 0;
  made.labs = emitLabs(b, att, scenario, profile, elapsedMinutes, isLive);
  made.scans = emitScans(b, att, scenario, elapsedMinutes, isLive);
  made.procs = emitProcedures(b, att, scenario, encounterCategory !== 'opd', isLive);

  const wardHint = wardTypeFor(scenario, patient || syntheticPatient(counterClientKey, scenario), profile);
  const admission = (encounterCategory !== 'opd' && patient)
    ? emitAdmission(b, att, scenario, patient, counters, daysBack, wardHint)
    : null;
  made.wardDays = admission ? b.wardCharges.filter((w) => w.admissionKey === admission.key).length : 0;

  // Inpatient drugs are issued from the ward stock and charted, so they are written
  // after the admission exists and can be timed across the stay.
  made.meds = emitMedications(b, att, scenario, patient, allergies, encounterCategory !== 'opd', admission?.lengthOfStayDays ?? losGuess);

  // A settled encounter is signed off by the clinician who saw the patient. An absconded
  // admission is closed the same way - the record has to leave the open worklist - and a
  // referred one is closed by whoever wrote the referral letter.
  if (status === 'completed' || status === 'discharged' || status === 'absconded') {
    const offset = intBetween(25, 240);
    if (elapsedMinutes > offset) att.finalizedAt = addMinutes(dateTime, offset);
    att.finalizer = att.provider;
  }
  if (status === 'completed' || status === 'discharged') {
    if (chance(0.6)) att.followUpDate = addDays(dateTime, randomOf(scenario.followUpDays, 14));
  }

  b.attendances.push(att);
  emitBill(b, att, patient, counterClientKey, made, admission, counters);

  // ── CLAIM for an insured encounter that was billed
  const claimChance = paymentMode === 'nhis' ? COUNTS.claimsPerNHISAttendance
    : paymentMode === 'private_insurance' ? 0.6 : paymentMode === 'corporate' ? 0.4 : 0;
  if (att.insuranceType && patient && chance(claimChance) && status !== 'cancelled') {
    const finalized = chance(0.75);
    const createdAt = att.finalizedAt ? new Date(att.finalizedAt) : addMinutes(dateTime, intBetween(60, 1440));
    const claimKey = `clm-${b.claims.length + 1}`;
    const prefix = att.insuranceType === 'nhis' ? 'NHIS' : att.insuranceType === 'private' ? 'PRIV' : 'CORP';
    const claim: GeneratedClaim = {
      key: claimKey,
      claimNumber: `${prefix}-${attendanceNumber}`,
      billNumber: `BILL-${attendanceNumber}`,
      attendanceKey: key,
      folderNumber: patient.folderNumber,
      counterClientKey: null,
      status: finalized ? 'finalized' : 'draft',
      createdAt,
      finalizedAt: finalized ? addMinutes(createdAt, intBetween(30, 2880)) : null,
      insuranceType: att.insuranceType,
      typeOfService: encounterCategory === 'ipd' ? 'inpatient' : attendanceType === 'delivery' ? 'maternity' : 'outpatient',
      typeOfAttendance: attendanceType,
      serviceOutcome: att.clinicalOutcome,
      notes: finalized && chance(0.25) ? pick(CLAIM_REJECTION_NOTES) : null,
      createdBy: actor('accounts'),
      finalizedBy: finalized ? actor('accounts') : null,
      trackingEvents: [],
      batchKey: null,
    };
    if (finalized) {
      claim.trackingEvents.push({
        eventType: 'submitted', status: 'submitted', at: claim.finalizedAt!, amount: null,
        payerReference: `PAYREF-${attendanceNumber}`, paymentReference: null, paymentMethod: null,
        notes: 'Batch file handed to the payer for adjudication.', recorder: actor('accounts'),
      });
      const outcomeRoll = rand();
      if (outcomeRoll < 0.45) {
        claim.trackingEvents.push({
          eventType: 'paid', status: 'paid', at: addDays(claim.finalizedAt!, intBetween(20, 120)),
          amount: null, payerReference: null, paymentReference: `PMT-${attendanceNumber}`,
          paymentMethod: 'bank_transfer', notes: 'Adjudicated at the published tariff and settled.',
          recorder: actor('accounts'),
        });
      } else if (outcomeRoll < 0.65) {
        claim.trackingEvents.push({
          eventType: 'rejected', status: 'rejected', at: addDays(claim.finalizedAt!, intBetween(10, 60)),
          amount: null, payerReference: null, paymentReference: null, paymentMethod: null,
          notes: pick(CLAIM_REJECTION_NOTES), recorder: actor('accounts'),
        });
      } else if (outcomeRoll < 0.8) {
        claim.trackingEvents.push({
          eventType: 'partially_approved', status: 'partially approved', at: addDays(claim.finalizedAt!, intBetween(10, 60)),
          amount: null, payerReference: null, paymentReference: null, paymentMethod: null,
          notes: pick(CLAIM_REJECTION_NOTES), recorder: actor('accounts'),
        });
      } else {
        claim.trackingEvents.push({
          eventType: 'under_review', status: 'under review', at: addDays(claim.finalizedAt!, intBetween(2, 20)),
          amount: null, payerReference: null, paymentReference: null, paymentMethod: null,
          notes: 'Awaiting adjudication by the payer.', recorder: actor('accounts'),
        });
      }
    }
    b.claims.push(claim);
  }

  // ── REFERRAL
  if (chance(COUNTS.referralsPerAttendance) && patient) {
    emitReferral(b, att, patient, scenario, counters);
    if (att.status !== 'cancelled' && att.status !== 'pending' && rand() < 0.4) {
      att.status = 'referred';
      att.referralToDepartment = randomOf(REFERABLE_DEPARTMENTS, 'Surgery');
    }
  }

  if (patient) maternityContext(b, att, scenario, patient, obs);
  return att;
};

/** A walk-in has no registered patient; the emitters still need age and sex for vitals. */
const syntheticPatient = (counterClientKey: string | null, scenario: ComplaintScenario): GeneratedPatient => {
  const seedIndex = counterClientKey ? parseInt(counterClientKey.replace(/\D/g, ''), 10) || 1 : 1;
  const age = Math.max(scenario.minAge, Math.min(scenario.maxAge, 5 + (seedIndex * 7) % 80));
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - age);
  return {
    folderNumber: '',
    surname: 'Walk-in',
    otherNames: 'Client',
    gender: seedIndex % 2 === 0 ? 'male' : 'female',
    dateOfBirth: dob,
    contact: '', address: '', paymentMode: 'cash', nhisNumber: null, nhisActive: false,
    nhisExpiryDate: null, phoneNumber: '', insuranceDetails: {}, registeredAt: new Date(),
    maritalStatus: 'single', residenceRegion: '', residenceDistrict: '', residenceCommunity: '',
    employer: null, allergies: [], histories: [], consents: [],
  };
};

// ═══════════════════════════════════════════════════════════
// ATTENDANCES + EVERY SUB-ENTITY
// ═══════════════════════════════════════════════════════════
const sampleIndices = (total: number, count: number): number[] => {
  const chosen = new Set<number>();
  const target = Math.min(count, total);
  let guard = 0;
  while (chosen.size < target && guard++ < target * 20) chosen.add(rnd(total));
  return [...chosen];
};

const scenarioByKey = (key: string, fallback: ComplaintScenario): ComplaintScenario =>
  COMPLAINT_SCENARIOS.find((s) => s.key === key) || fallback;

export const generateAttendances = (patients: GeneratedPatient[]): GeneratedBundle => {
  const b: GeneratedBundle = {
    attendances: [], vitals: [], diagnoses: [], labs: [], scans: [], medications: [],
    procedures: [], admissions: [], nursingNotes: [], nursingTasks: [], wardCharges: [],
    bills: [], claims: [], claimBatches: [], waivers: [], preAuthorisations: [],
    eligibilityChecks: [], estimates: [], referrals: [], counterClients: [],
    antenatalBookings: [], ancVisits: [], deliveryRecords: [], newbornRecords: [], postnatalRecords: [],
  };

  const counters: NumberCounters = {
    attendance: VISIT_NUMBER_BLOCK,
    receipt: RECEIPT_NUMBER_BLOCK,
    referral: REFERRAL_NUMBER_BLOCK,
    admission: 0, estimate: 0, preAuth: 0, batch: 0,
    requisition: REQUISITION_NUMBER_BLOCK,
    transfer: REQUISITION_NUMBER_BLOCK,
    purchaseInvoice: REQUISITION_NUMBER_BLOCK,
  };
  const state = { activeAdmissions: 0 };
  const attendancesByFolder = new Map<string, string[]>();
  const billLinesByKey = new Map<string, GeneratedBillLinePlan[]>();

  const remember = (att: GeneratedAttendance): void => {
    if (!att.folderNumber) return;
    const list = attendancesByFolder.get(att.folderNumber) || [];
    if (list.length < 4) list.push(att.key);
    attendancesByFolder.set(att.folderNumber, list);
  };

  // ── Registered patients ──────────────────────────────────
  for (let i = 0; i < COUNTS.attendances; i++) {
    const patient = pick(patients);
    const scenario = pick(scenariosFor(patient));
    const att = emitEncounter(b, counters, patient, null, scenario, attendanceDate(), state);
    remember(att);
    const bill = b.bills[b.bills.length - 1];
    billLinesByKey.set(att.key, (bill as { lines?: GeneratedBillLinePlan[] }).lines || []);
  }

  // ── Walk-in counter clients ──────────────────────────────
  // Half of the counter tickets are clinical (a lab or a scan), the rest are a
  // pharmacy-only visit, so both the counter order screen and the dispensing
  // screen have real work on them.
  const diagnostics = scenarioByKey('walk_in_diagnostics', COMPLAINT_SCENARIOS[0]);
  for (let c = 0; c < COUNTS.counterClients; c++) {
    const key = `cc-${c + 1}`;
    const age = intBetween(3, 78);
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);
    b.counterClients.push({
      key,
      name: `${chance(0.5) ? pick(MALE_FIRST) : pick(FEMALE_FIRST)} ${pick(SURNAMES)}`,
      ageYears: age,
      phone: `+23324${intBetween(1000000, 9999999)}`,
      createdAt: daysAgo(intBetween(0, 200)),
    });
    const scenario = c % 2 === 0 ? diagnostics : scenarioByKey('daycase_dressing', diagnostics);
    emitEncounter(b, counters, null, key, scenario, attendanceDate(), state);
  }

  // ── Maternity cascade ────────────────────────────────────
  // A booking, the reviews after it, the birth and the six-week check are one pregnancy.
  // Left to the encounter picker they are four unrelated rows, so the register fills with
  // births that have no antenatal history and mothers who never came back. Here the whole
  // cycle is dated from one last menstrual period, which is what lets the writers join it:
  // the booking's expected date of delivery is the day the baby comes.
  const bookingScenarios = ['anc_booking', 'anc_followup', 'anc_malaria_anaemia']
    .map((key) => scenarioByKey(key, diagnostics));
  const labourScenarios = ['labour', 'caesarean', 'postpartum_haemorrhage', 'obstructed_labour']
    .map((key) => scenarioByKey(key, diagnostics));
  const sixWeekReview = scenarioByKey('postnatal_review', diagnostics);

  const mothers = pickDistinct(
    patients.filter((p) => p.gender === 'female' && ageAt(p.dateOfBirth) >= 15 && ageAt(p.dateOfBirth) <= 49),
    COUNTS.maternityCases,
  );

  for (const mother of mothers) {
    // A quarter of them are pregnancies still under care, so the active antenatal register
    // has real bookings on it rather than only pregnancies that have ended.
    const ongoing = chance(0.25);
    // The booking anchors everything: a completed case is booked far enough back that the
    // birth and its six-week check are both in the past by the time the dates are added up.
    const bookingDate = daysAgo(ongoing ? intBetween(21, 160) : intBetween(260, 460));
    const lmp = addDays(bookingDate, -intBetween(75, 130));
    const dueDate = addDays(lmp, 280);

    const booking = emitEncounter(
      b, counters, mother, null, pick(bookingScenarios), bookingDate, state,
      { attendanceType: 'antenatal', lmp, dueDate: ongoing ? undefined : dueDate },
    );
    remember(booking);
    if (ongoing) continue;

    const labour = emitEncounter(
      b, counters, mother, null, pick(labourScenarios), dueDate, state, { attendanceType: 'delivery', lmp },
    );
    remember(labour);
    const review = emitEncounter(
      b, counters, mother, null, sixWeekReview, addDays(dueDate, 42), state, { attendanceType: 'postnatal', puerperiumDay: 42 },
    );
    remember(review);
  }

  for (const bill of b.bills) billLinesByKey.set(bill.attendanceKey, (bill as { lines?: GeneratedBillLinePlan[] }).lines || []);

  // ── WAIVERS ──────────────────────────────────────────────
  const billableBills = b.bills.map((bill, i) => ({ bill, i })).filter((x) => x.bill.status !== 'cancelled');
  for (const i of sampleIndices(billableBills.length, COUNTS.waivers)) {
    const bill = billableBills[i].bill;
    if (!bill.folderNumber) continue;
    const roll = rand();
    const status: GeneratedWaiver['status'] = roll < 0.6 ? 'approved' : roll < 0.85 ? 'pending' : 'rejected';
    const appliedAt = addDays(bill.billDate, intBetween(0, 3));
    b.waivers.push({
      billNumber: bill.billNumber,
      folderNumber: bill.folderNumber,
      waiverType: status === 'approved' && chance(0.5) ? 'indigent' : pick(['indigent', 'nhis_exempt', 'staff_discount', 'management_discretion', 'other']),
      reason: pick(WAIVER_REASONS),
      fraction: status === 'approved' ? between(0.3, 1) : between(0.2, 0.9),
      status,
      appliedAt,
      approvedAt: status === 'approved' ? addDays(appliedAt, intBetween(0, 4)) : null,
      rejectionReason: status === 'rejected' ? 'Not covered by the waiver policy; the balance remains payable by the patient.' : null,
      requestedBy: actor('records'),
      approvedBy: status === 'approved' ? actor('admin') : null,
    });
  }

  // ── PRE-AUTHORISATION ────────────────────────────────────
  const insured = b.attendances.map((att, i) => ({ att, i })).filter((x) => x.att.insuranceType && x.att.status !== 'cancelled');
  for (const i of sampleIndices(insured.length, COUNTS.preAuthorisations)) {
    const att = insured[i].att;
    const lines = (billLinesByKey.get(att.key) || []).filter((l) => l.kind !== 'consultation');
    if (!lines.length) continue;
    const chosen = lines.slice(0, Math.min(lines.length, intBetween(1, 3)));
    const roll = rand();
    const status: GeneratedPreAuth['status'] =
      roll < 0.45 ? 'approved' : roll < 0.6 ? 'partially_approved' : roll < 0.75 ? 'pending' : roll < 0.88 ? 'rejected' : 'expired';
    const requestedAt = addMinutes(att.dateTime, -intBetween(0, 120));
    const responded = status !== 'pending';
    b.preAuthorisations.push({
      referenceNumber: `PRE-${att.attendanceNumber}`,
      attendanceKey: att.key,
      folderNumber: att.folderNumber!,
      insuranceType: att.insuranceType!,
      status,
      requestedAt,
      responseReceivedAt: responded ? addHours(requestedAt, intBetween(2, 72)) : null,
      serviceKinds: chosen.map((l) => ({ kind: l.kind as GeneratedPreAuth['serviceKinds'][number]['kind'], index: l.index })),
      clinicalJustification: `${att.assessment} The requested service is clinically indicated and is on the benefit package for this membership category.`,
      authNumber: status === 'approved' || status === 'partially_approved' ? `AUTH-${att.attendanceNumber}` : null,
      authExpiry: status === 'approved' || status === 'partially_approved' ? addDays(requestedAt, 30) : null,
      rejectionReason: status === 'rejected' ? 'Service is outside the membership benefit package for the recorded diagnosis.' : null,
      requestedBy: actor('records'),
    });
  }

  // ── ESTIMATES (proforma invoices) ────────────────────────
  const estimatable = b.attendances.map((att, i) => ({ att, i })).filter((x) => {
    const lines = billLinesByKey.get(x.att.key) || [];
    return lines.some((l) => l.kind === 'procedure' || l.kind === 'lab' || l.kind === 'scan') && !b.estimates.some((e) => e.attendanceKey === x.att.key);
  });
  for (const i of sampleIndices(estimatable.length, COUNTS.estimates)) {
    const att = estimatable[i].att;
    if (b.estimates.some((e) => e.attendanceKey === att.key)) continue;
    const lines = (billLinesByKey.get(att.key) || []);
    const items = lines.length > 4 ? pickSomeDistinct(lines, 4, 2) : lines.slice(0, 3);
    if (!items.length) continue;
    const createdAt = att.dateTime;
    const validityDays = pick([7, 14, 30]);
    const roll = rand();
    const status: GeneratedEstimate['status'] =
      roll < 0.18 ? 'DRAFT' : roll < 0.42 ? 'SENT' : roll < 0.72 ? 'APPROVED'
      : roll < 0.82 ? 'REJECTED' : roll < 0.94 ? 'EXPIRED' : 'CONVERTED';
    const approved = status === 'APPROVED' || status === 'CONVERTED';
    b.estimates.push({
      referenceNumber: `PRO-${att.attendanceNumber}`,
      folderNumber: att.folderNumber,
      counterClientKey: att.counterClientKey,
      attendanceKey: att.key,
      admissionKey: b.admissions.find((a) => a.attendanceKey === att.key)?.key ?? null,
      status,
      createdAt,
      expiresAt: addDays(createdAt, validityDays),
      validityDays,
      notes: pick(ESTIMATE_NOTES),
      termsAndConditions: 'Estimate only; it is not a bill and does not guarantee admission or a bed. Charges are finalised on the day of service at the tariff published in force at that date.',
      items: items.map((l) => ({ kind: l.kind, index: l.index, quantity: 1 })),
      createdBy: actor('records'),
      approvedBy: approved || status === 'REJECTED' ? actor('admin') : null,
      approvedAt: approved || status === 'REJECTED' ? addDays(createdAt, intBetween(1, 5)) : null,
    });
  }

  // ── NHIS ELIGIBILITY CHECKS ──────────────────────────────
  const members = patients.filter((p) => p.nhisNumber);
  for (let n = 0; n < COUNTS.eligibilityChecks && members.length; n++) {
    const patient = pick(members);
    const expired = Boolean(patient.nhisExpiryDate && patient.nhisExpiryDate.getTime() < Date.now());
    const roll = rand();
    const status: GeneratedEligibilityCheck['status'] = expired
      ? (roll < 0.85 ? 'expired' : 'not_found')
      : roll < 0.85 ? 'active' : roll < 0.92 ? 'suspended' : roll < 0.97 ? 'not_found' : 'referred_facility_mismatch';
    const atts = attendancesByFolder.get(patient.folderNumber) || [];
    b.eligibilityChecks.push({
      folderNumber: patient.folderNumber,
      attendanceKey: atts.length ? pick(atts) : null,
      membershipId: patient.nhisNumber!,
      checkMethod: pick(['card_reader', 'nhia_portal', 'manual', 'offline_list']),
      status,
      at: daysAgo(intBetween(0, 240)),
      ccCode: status === 'active' ? padNumber(intBetween(10000, 19999)) : null,
      membershipExpiry: patient.nhisExpiryDate,
      checkedBy: actor('records'),
    });
  }

  // ── CLAIM BATCHES ────────────────────────────────────────
  const finalized = b.claims.filter((c) => c.status === 'finalized' && c.finalizedAt);
  const groups = new Map<string, GeneratedClaim[]>();
  for (const claim of finalized) {
    const d = claim.finalizedAt!;
    const key = `${claim.insuranceType}-${d.getFullYear()}-${d.getMonth() + 1}`;
    const list = groups.get(key) || [];
    list.push(claim);
    groups.set(key, list);
  }
  const orderedGroups = [...groups.entries()].sort((a, z) => {
    const da = a[1][0].finalizedAt!.getTime();
    const db = z[1][0].finalizedAt!.getTime();
    return db - da;
  }).slice(0, COUNTS.claimBatches);

  for (const [groupKey, claims] of orderedGroups) {
    const [insuranceType, yearText, monthText] = groupKey.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const status: GeneratedClaimBatch['status'] = claims.length > 3 && chance(0.7) ? 'finalized' : 'generated';
    const generatedAt = new Date(year, month - 1, Math.min(28, 20));
    const batch: GeneratedClaimBatch = {
      key: `batch-${b.claimBatches.length + 1}`,
      batchNumber: `BATCH-${padNumber(++counters.receipt)}`,
      insuranceType: insuranceType as GeneratedClaimBatch['insuranceType'],
      periodYear: year,
      periodMonth: month,
      status,
      generatedAt,
      finalizedAt: status === 'finalized' ? addDays(generatedAt, intBetween(1, 6)) : null,
      description: `${insuranceType.toUpperCase()} claim batch for ${new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' })} ${year}, ${claims.length} claims.`,
      createdBy: actor('accounts'),
      finalizedBy: status === 'finalized' ? actor('admin') : null,
    };
    b.claimBatches.push(batch);
    for (const claim of claims) claim.batchKey = batch.key;
  }

  return b;
};

// ═══════════════════════════════════════════════════════════
// APPOINTMENTS
//
// Follow-up dates written on the encounter become real appointments, so the
// appointment list and the clinical record agree with each other.
// ═══════════════════════════════════════════════════════════
export const generateAppointments = (
  patients: GeneratedPatient[],
  bundle: GeneratedBundle,
) => {
  const byFolder = new Map(patients.map((p) => [p.folderNumber, p]));
  const out: Array<{
    appointmentNumber: string;
    folderNumber: string;
    title: string;
    scheduledAt: Date;
    duration: number;
    status: 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
    type: string;
    notes: string;
    createdBy: Actor;
    clinician: Actor;
  }> = [];
  let counter = APPOINTMENT_NUMBER_BLOCK;

  for (const att of bundle.attendances) {
    if (!att.folderNumber || !att.followUpDate || !byFolder.has(att.folderNumber)) continue;
    if (out.length >= COUNTS.appointments) break;
    const past = att.followUpDate.getTime() < Date.now();
    out.push({
      appointmentNumber: padNumber(++counter),
      folderNumber: att.folderNumber,
      title: `${att.scenarioKey.replace(/_/g, ' ')} review`,
      scheduledAt: att.followUpDate,
      duration: pick([15, 20, 30, 45]),
      status: past ? pick(['completed', 'completed', 'no_show', 'cancelled']) : chance(0.5) ? 'confirmed' : 'scheduled',
      type: att.attendanceType === 'antenatal' ? 'antenatal' : att.attendanceType === 'postnatal' ? 'postnatal' : 'follow_up',
      notes: 'Booked from the follow-up date recorded when the previous encounter was finalised.',
      createdBy: actor('records'),
      clinician: att.provider,
    });
  }

  // Top the list up with routine bookings so the calendar is not empty.
  while (out.length < COUNTS.appointments) {
    const patient = pick(patients);
    const daysOffset = intBetween(-120, 21);
    out.push({
      appointmentNumber: padNumber(++counter),
      folderNumber: patient.folderNumber,
      title: pick(['Follow-up review', 'Chronic clinic review', 'Routine consultation', 'Result review', 'Vaccination']),
      scheduledAt: daysOffset >= 0 ? daysFromNow(daysOffset) : daysAgo(-daysOffset),
      duration: pick([15, 20, 30]),
      status: daysOffset < 0 ? pick(['completed', 'completed', 'no_show']) : daysOffset === 0 ? 'checked_in' : 'scheduled',
      type: pick(['consultation', 'follow_up', 'vaccination', 'lab_test', 'scan']),
      notes: 'Booked at the front desk.',
      createdBy: actor('records'),
      clinician: actor('doctor'),
    });
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// FAMILY PLANNING
// ═══════════════════════════════════════════════════════════
export const generateFamilyPlanning = (patients: GeneratedPatient[]) => {
  const female = patients.filter((p) => p.gender === 'female');
  const pool = female.length ? female : patients;
  const out: any[] = [];
  for (let i = 0; i < COUNTS.familyPlanning; i++) {
    const patient = pick(pool);
    const method = pick([
      'pill_coc', 'pill_pop', 'injectable_dmpa', 'injectable_net_en', 'condom_male',
      'implant_implanon', 'implant_jadelle', 'iud_copper', 'iud_hormonal',
      'female_sterilization', 'lam', 'emergency_contraception',
    ]);
    const category =
      method === 'female_sterilization' ? 'permanent'
        : ['implant_implanon', 'implant_jadelle', 'iud_copper', 'iud_hormonal'].includes(method) ? 'modern_long_acting'
          : method === 'emergency_contraception' ? 'emergency'
            : method === 'lam' ? 'traditional'
              : 'modern_short_acting';
    out.push({
      patientFolderNumber: patient.folderNumber,
      serviceDate: daysAgo(intBetween(0, 365)),
      method,
      methodCategory: category,
      isNewAcceptor: chance(0.4),
      counsellingGiven: true,
      informedConsent: true,
      switchedFrom: chance(0.2) ? 'pill_coc' : null,
      reasonForSwitching: chance(0.2) ? 'Side effects on the previous method; changed after counselling.' : null,
      parity: intBetween(0, 5),
      cypFactor: +between(0.1, 3.0).toFixed(2),
      notes: 'Method provided after counselling on choice, side effects and return to fertility; next visit date explained.',
    });
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS
//
// The previous version sent every notification to one user with a title and
// message picked independently, so the inbox showed "Low Stock Alert" to a
// clinician and nothing at all to accounts. Each row now chooses a topic group,
// a recipient drawn from the roles that actually work on that topic, and a
// title/message pair that belongs together.
// ═══════════════════════════════════════════════════════════

/** Groups in NOTIFICATION_TEMPLATES. "pharmacy" has no matching NotificationType enum member. */
const NOTIFICATION_GROUP_KEYS = ['clinical', 'billing', 'appointment', 'pharmacy', 'system'] as const;
type NotificationGroup = (typeof NOTIFICATION_GROUP_KEYS)[number];

const NOTIFICATION_TYPE_FOR_GROUP: Record<NotificationGroup, string> = {
  clinical: 'clinical',
  billing: 'billing',
  appointment: 'appointment',
  // NotificationType has no pharmacy member; these are operational alerts, so they read as info.
  pharmacy: 'info',
  system: 'system',
};

const NOTIFICATION_PRIORITY_FOR_GROUP: Record<NotificationGroup, string[]> = {
  clinical: ['medium', 'high', 'urgent'],
  billing: ['low', 'medium', 'high'],
  appointment: ['low', 'medium'],
  pharmacy: ['medium', 'high'],
  system: ['low', 'medium'],
};

/** Where the bell takes the user when the row is clicked. Every value is a real dashboard route. */
const NOTIFICATION_ACTION_URL: Record<NotificationGroup, string> = {
  clinical: '/nursing',
  billing: '/billing',
  appointment: '/appointments',
  pharmacy: '/stock',
  system: '/reports',
};

export interface GeneratedNotification {
  recipientRole: ActorRole;
  recipientSalt: number;
  senderRole: ActorRole;
  senderSalt: number;
  type: string;
  priority: string;
  title: string;
  message: string;
  actionUrl: string;
  actionType: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export const generateNotifications = (): GeneratedNotification[] => {
  const out: GeneratedNotification[] = [];
  for (let i = 0; i < COUNTS.notifications; i++) {
    const group = pick([...NOTIFICATION_GROUP_KEYS]);
    const template = pick(NOTIFICATION_TEMPLATES[group]);
    // The recipient is drawn from the roles that act on this topic, and the salt keeps
    // rotating so the inbox of any one user is a sample rather than the whole feed.
    const recipientRole = pick(TARGET_ROLES_FOR_NOTIFICATION[group] ?? ['admin']) as ActorRole;
    const createdAt = daysAgo(intBetween(0, 90));
    const isRead = createdAt.getTime() < Date.now() - 24 * 60 * 60 * 1000 ? chance(0.55) : chance(0.15);
    out.push({
      recipientRole,
      recipientSalt: i,
      senderRole: 'admin',
      senderSalt: i,
      type: NOTIFICATION_TYPE_FOR_GROUP[group],
      priority: pick(NOTIFICATION_PRIORITY_FOR_GROUP[group]),
      title: template.title,
      message: template.message,
      actionUrl: NOTIFICATION_ACTION_URL[group],
      actionType: group,
      isRead,
      readAt: isRead ? new Date(createdAt.getTime() + intBetween(5, 720) * 60000) : null,
      createdAt,
    });
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// HR — ROSTER, LEAVE, PAYROLL, DOCUMENTS
//
// Everything here is keyed on a seeded username; testSeed.ts resolves it to the
// StaffProfile row (and rejects staff with no profile) before writing.
// ═══════════════════════════════════════════════════════════

/** Shifts only ever cover clinical and support staff - administrators do not take ward duty. */
const ROSTER_ROLES: ActorRole[] = ['doctor', 'nurse', 'midwife', 'lab_tech', 'sonographer', 'pharmacist', 'records'];

interface ShiftWindow {
  type: 'morning' | 'afternoon' | 'night' | 'on_call';
  startHour: number;
  endHour: number;
  /** End lands on the following calendar day (night, on-call). */
  crossesMidnight: boolean;
  label: string;
}

const SHIFT_WINDOWS: ShiftWindow[] = [
  { type: 'morning', startHour: 7, endHour: 15, crossesMidnight: false, label: 'Morning duty' },
  { type: 'afternoon', startHour: 15, endHour: 23, crossesMidnight: false, label: 'Afternoon duty' },
  { type: 'night', startHour: 23, endHour: 7, crossesMidnight: true, label: 'Night duty' },
  { type: 'on_call', startHour: 8, endHour: 8, crossesMidnight: true, label: '24-hour on-call' },
];

const atHour = (base: Date, hour: number): Date => {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, 0, 0, 0);
  return d;
};

/** Midnight-truncated calendar day, so the roster groups by date the way the UI does. */
const calendarDay = (base: Date, offsetDays: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export interface GeneratedShift {
  username: string;
  /** Index into the writer's per-day roster so a day never gives one staff two shifts. */
  shiftDate: Date;
  startTime: Date;
  endTime: Date;
  shiftType: string;
  status: string;
  notes: string;
  approvedBy: Actor | null;
  approvedAt: Date | null;
}

export const generateShifts = (users: GeneratedUser[]): GeneratedShift[] => {
  const rosterable = users.filter((u) => ROSTER_ROLES.includes(u.role as unknown as ActorRole));
  if (!rosterable.length) return [];
  const out: GeneratedShift[] = [];
  const today = new Date();

  for (let offset = -COUNTS.shiftDaysPast; offset <= COUNTS.shiftDaysFuture; offset++) {
    const day = calendarDay(today, offset);
    // Roughly two thirds of the rostered pool works any given day; the rest are off,
    // which is what makes the roster look like a roster and not an attendance register.
    const perDay = Math.max(1, Math.round(rosterable.length * between(0.5, 0.8)));
    const chosen = pickSomeDistinct(rosterable, perDay, perDay);
    for (const user of chosen) {
      const window = pick(SHIFT_WINDOWS);
      const start = atHour(day, window.startHour);
      const endRaw = atHour(day, window.endHour);
      const end = window.crossesMidnight ? new Date(endRaw.getTime() + 24 * 60 * 60 * 1000) : endRaw;
      const isFuture = offset > 0;
      const isToday = offset === 0;
      let status: string;
      if (isFuture) status = chance(0.85) ? 'scheduled' : 'proposed';
      else if (isToday) status = 'scheduled';
      else status = chance(0.9) ? 'completed' : chance(0.5) ? 'no_show' : 'cancelled';
      out.push({
        username: user.username,
        shiftDate: day,
        startTime: start,
        endTime: end,
        shiftType: window.type,
        status,
        notes: `${window.label} - ${user.departmentName ?? 'unassigned'} roster.`,
        approvedBy: status === 'proposed' ? null : actor('admin', offset + 50),
        approvedAt: status === 'proposed' ? null : new Date(day.getTime() - 24 * 60 * 60 * 1000),
      });
    }
  }
  return out;
};

const STAFF_SEX = new Map<string, boolean>();
/**
 * StaffProfile has no gender, but assigning maternity leave to a male-named officer is the
 * kind of thing that makes a demo database look wrong. The generated first names come from
 * gendered pools, so the name is enough to decide.
 */
const looksFemale = (fullName: string): boolean =>
  FEMALE_FIRST.some((first) => fullName.split(' ').includes(first));

const LEAVE_TYPE_WEIGHTS: Array<{ type: string; weight: number }> = [
  { type: 'ANNUAL', weight: 40 },
  { type: 'SICK', weight: 25 },
  { type: 'STUDY', weight: 10 },
  { type: 'COMPASSIONATE', weight: 7 },
  { type: 'MATERNITY', weight: 6 },
  { type: 'PATERNITY', weight: 5 },
  { type: 'EMERGENCY', weight: 4 },
  { type: 'UNPAID', weight: 3 },
];

const weightedLeaveType = (): string => {
  const total = LEAVE_TYPE_WEIGHTS.reduce((a, l) => a + l.weight, 0);
  let roll = rand() * total;
  for (const entry of LEAVE_TYPE_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return 'ANNUAL';
};

const LEAVE_DAYS_BY_TYPE: Record<string, [number, number]> = {
  ANNUAL: [5, 21],
  SICK: [1, 10],
  STUDY: [2, 14],
  COMPASSIONATE: [2, 7],
  MATERNITY: [56, 90],
  PATERNITY: [3, 10],
  EMERGENCY: [1, 3],
  UNPAID: [14, 90],
};

export interface GeneratedLeaveRequest {
  username: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: string;
  approvedBy: Actor | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  requestedAt: Date;
}

export const generateLeaveRequests = (users: GeneratedUser[]): GeneratedLeaveRequest[] => {
  const staff = users.filter((u) => u.role !== 'super_admin');
  const out: GeneratedLeaveRequest[] = [];
  for (let i = 0; i < COUNTS.leaveRequests; i++) {
    const user = pick(staff);
    let type = weightedLeaveType();
    if (type === 'MATERNITY' && !looksFemale(user.fullName)) type = 'PATERNITY';
    if (type === 'PATERNITY' && looksFemale(user.fullName)) type = 'ANNUAL';
    const [minDays, maxDays] = LEAVE_DAYS_BY_TYPE[type] ?? [1, 14];
    const totalDays = intBetween(minDays, maxDays);
    // A leave record whose window is entirely in the past is as useless as one that has not
    // been requested yet, so the spread covers approved history, live leave and future plans.
    const startOffset = intBetween(-180, 60);
    const startDate = calendarDay(new Date(), startOffset);
    const endDate = calendarDay(startDate, totalDays - 1);
    const roll = rand();
    let status: string;
    if (startOffset > 14) status = roll < 0.6 ? 'pending' : 'approved';
    else if (roll < 0.72) status = 'approved';
    else if (roll < 0.85) status = 'pending';
    else if (roll < 0.94) status = 'rejected';
    else status = 'cancelled';
    const requestedAt = new Date(startDate.getTime() - intBetween(7, 45) * 24 * 60 * 60 * 1000);
    out.push({
      username: user.username,
      leaveType: type,
      startDate,
      endDate,
      totalDays,
      reason: LEAVE_REASONS[type] ?? LEAVE_REASONS.ANNUAL,
      status,
      approvedBy: status === 'approved' ? actor('hr_officer', i) : null,
      approvedAt: status === 'approved' ? requestedAt : null,
      rejectionReason: status === 'rejected'
        ? 'Rejected - the unit cannot release this number of staff in the same period. Please re-apply for an alternative window.'
        : null,
      requestedAt,
    });
  }
  return out;
};

/**
 * Payslip lines are expressed as a percentage of basic salary so the writer can price them from
 * the staff member's real salary step. A flat GHS amount would make every payslip identical
 * whatever the grade, and net pay would not reconcile to the line items.
 *
 * The slug is what the live code reads back: UserRepository.recomputePayrollTotals() only
 * recognises the category "base_salary" as basic pay and counts every other earning as an
 * allowance, so the basic line has to carry exactly that category or the payslip totals disagree
 * with the PayrollRecord columns.
 */
const PAYROLL_SLUGS: Record<string, string> = {
  'Basic Salary': 'base_salary',
  'Housing Allowance': 'housing',
  'Transport Allowance': 'transport',
  'Duty Allowance': 'duty',
  'Risk Allowance': 'risk',
  Overtime: 'overtime',
  'Shift Allowance': 'shift',
  SSNFLT: 'ssnflt',
  SSNIT: 'ssnit',
  PAYE: 'paye',
  'Disease Contribution': 'nhis_premium',
  'Staff Welfare Fund': 'welfare',
  'Cooperative Subscription': 'coop',
  'Loan Repayment': 'loan',
  'Union Dues': 'union',
};

/** percent-of-base range per category, in the same order as PAYROLL_EARNINGS then PAYROLL_DEDUCTIONS. */
export const PAYROLL_RATE_PERCENT: Record<string, [number, number]> = {
  'Basic Salary': [100, 100],
  'Housing Allowance': [15, 25],
  'Transport Allowance': [8, 15],
  'Duty Allowance': [10, 20],
  'Risk Allowance': [3, 8],
  Overtime: [2, 12],
  'Shift Allowance': [4, 10],
  SSNFLT: [3.2, 3.6],
  SSNIT: [2.2, 2.4],
  PAYE: [5, 20],
  'Disease Contribution': [1, 3],
  'Staff Welfare Fund': [0.5, 2],
  'Cooperative Subscription': [1, 5],
  'Loan Repayment': [3, 15],
  'Union Dues': [0.5, 1.5],
};

/** Deductions the employer must operate, so every payslip carries them. */
const MANDATORY_DEDUCTION_NAMES = ['SSNFLT', 'SSNIT', 'PAYE', 'Disease Contribution'];

export interface PayrollLinePlan {
  type: 'earning' | 'deduction';
  /** Machine category the payroll service groups by. */
  category: string;
  description: string;
  percentOfBase: number;
  taxable: boolean;
}

export interface GeneratedPayroll {
  username: string;
  month: number;
  year: number;
  /** Calendar days in the month the staff member was on the payroll (leave reduces it). */
  workedDays: number;
  lines: PayrollLinePlan[];
  isPaid: boolean;
  paidAt: Date | null;
  notes: string;
  createdAt: Date;
}

export const generatePayroll = (users: GeneratedUser[]): GeneratedPayroll[] => {
  const staff = users.filter((u) => u.role !== 'super_admin');
  const out: GeneratedPayroll[] = [];
  const now = new Date();
  const planLine = (
    entry: { category: string; description: string; taxable: boolean },
    type: 'earning' | 'deduction',
  ): PayrollLinePlan => {
    const range = PAYROLL_RATE_PERCENT[entry.category] ?? [1, 5];
    return {
      type,
      category: PAYROLL_SLUGS[entry.category] ?? entry.category.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      description: entry.description,
      percentOfBase: +between(range[0], range[1]).toFixed(2),
      taxable: entry.taxable,
    };
  };
  const basic = PAYROLL_EARNINGS.find((e) => e.category === 'Basic Salary') ?? PAYROLL_EARNINGS[0];
  const optionalEarnings = PAYROLL_EARNINGS.filter((e) => e.category !== 'Basic Salary');
  const optionalDeductions = PAYROLL_DEDUCTIONS.filter((d) => !MANDATORY_DEDUCTION_NAMES.includes(d.category));

  for (let back = COUNTS.payrollMonths; back >= 1; back--) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const year = anchor.getFullYear();
    const month = anchor.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (const user of staff) {
      // Deterministic per user and month, so the same person is not paid for 30 days every month.
      const absent = chance(0.18) ? intBetween(1, 6) : 0;
      const workedDays = Math.max(10, daysInMonth - absent);
      // Basic salary pro-rates on days worked; allowances and statutory lines do not.
      const lines: PayrollLinePlan[] = [
        { ...planLine(basic, 'earning'), percentOfBase: +((workedDays / daysInMonth) * 100).toFixed(2) },
        ...pickSomeDistinct(optionalEarnings, 4, 1).map((e) => planLine(e, 'earning')),
        ...PAYROLL_DEDUCTIONS.filter((d) => MANDATORY_DEDUCTION_NAMES.includes(d.category)).map((d) => planLine(d, 'deduction')),
        ...pickSomeDistinct(optionalDeductions, 2, 0).map((d) => planLine(d, 'deduction')),
      ];
      const isPaid = back > 1 || chance(0.5);
      const payDate = new Date(year, month, Math.min(daysInMonth, 28), 10, 0, 0);
      out.push({
        username: user.username,
        month,
        year,
        workedDays,
        lines,
        isPaid,
        paidAt: isPaid ? payDate : null,
        notes: absent
          ? `${absent} day(s) of approved or uncertified absence deducted from the month.`
          : 'Full month on the roll; no absence recorded.',
        createdAt: payDate,
      });
    }
  }
  return out;
};

export interface GeneratedStaffDocument {
  username: string;
  type: string;
  title: string;
  fileUrl: string;
  expiryDate: Date | null;
  isVerified: boolean;
  verifiedBy: Actor | null;
  verifiedAt: Date | null;
  createdAt: Date;
}

const DOC_ROLES = ['doctor', 'nurse', 'midwife', 'lab_tech', 'sonographer', 'pharmacist'];

export const generateStaffDocuments = (users: GeneratedUser[]): GeneratedStaffDocument[] => {
  const out: GeneratedStaffDocument[] = [];
  for (const user of users) {
    const isClinical = DOC_ROLES.includes(user.role);
    const documents = STAFF_DOCUMENT_TITLES.filter((d) =>
      d.type === 'LICENSE' ? isClinical : d.type === 'ID_CARD' ? true : chance(0.5),
    );
    for (const doc of documents.length ? documents : [STAFF_DOCUMENT_TITLES[3]]) {
      const needsExpiry = doc.type === 'LICENSE' || doc.type === 'ID_CARD';
      // Licence cards expire either side of today so the expiring-documents endpoint has rows
      // in every window: valid, due soon and already lapsed.
      const expiryDate = needsExpiry ? daysFromNow(intBetween(-120, 700)) : null;
      const isVerified = chance(0.8);
      out.push({
        username: user.username,
        type: doc.type,
        title: doc.title,
        fileUrl: `/uploads/documents/${user.username}-${doc.type.toLowerCase()}.pdf`,
        expiryDate,
        isVerified,
        verifiedBy: isVerified ? actor('hr_officer') : null,
        verifiedAt: isVerified ? daysAgo(intBetween(1, 300)) : null,
        createdAt: daysAgo(intBetween(1, 900)),
      });
    }
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// INVENTORY — REQUISITIONS, TRANSFERS, PURCHASES
//
// Stock rows are referenced by slot index into the array the writer already
// loaded (real StockItem ids ordered by name), so a seeded requisition can never
// name an item the store does not carry.
// ═══════════════════════════════════════════════════════════

/** [0..n-1] — used to draw stock-item slots without replacement. */
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

const STORE_DEPARTMENTS = ['Main Store', 'Pharmacy'];
const REQUESTING_DEPARTMENTS = ['Medical', 'Surgery', 'Obstetrics & Gynecology', 'Pediatrics', 'Emergency', 'Laboratory', 'Radiology', 'Pharmacy'];
const WARDS_FOR_REQUISITION = ['General Ward A', 'Maternity Ward', 'ICU', 'Pediatric Ward', 'Surgical Ward'];

export interface GeneratedRequisitionItem {
  stockItemSlot: number;
  quantityRequested: number;
  quantityApproved: number | null;
  quantityFulfilled: number;
  purpose: string;
}

export interface GeneratedRequisition {
  requisitionNumber: string;
  requestingDepartmentName: string;
  supplyingDepartmentName: string;
  requestingWardName: string | null;
  requestedBy: Actor;
  approvedBy: Actor | null;
  fulfilledBy: Actor | null;
  urgency: string;
  requiredDate: Date | null;
  purpose: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  fulfilledAt: Date | null;
  approvedAt: Date | null;
  items: GeneratedRequisitionItem[];
}

export const generateRequisitions = (stockItemCount: number): GeneratedRequisition[] => {
  const out: GeneratedRequisition[] = [];
  if (stockItemCount <= 0) return out;
  const slots = (count: number) => pickSomeDistinct(range(stockItemCount), count, 1);
  for (let i = 0; i < COUNTS.requisitions; i++) {
    const createdAt = daysAgo(intBetween(0, 240));
    const roll = rand();
    const status = roll < 0.45 ? 'fulfilled' : roll < 0.65 ? 'approved' : roll < 0.85 ? 'submitted' : roll < 0.95 ? 'draft' : 'cancelled';
    const isWardRequest = chance(0.35);
    const requestingDepartmentName = isWardRequest ? 'Medical' : pick(REQUESTING_DEPARTMENTS.filter((d) => d !== 'Main Store'));
    const supplyingDepartmentName = requestingDepartmentName === 'Pharmacy' ? 'Main Store' : pick(STORE_DEPARTMENTS);
    const urgency = roll < 0.1 ? 'emergency' : chance(0.3) ? 'urgent' : 'routine';
    const itemCount = intBetween(2, 6);
    const decided = ['approved', 'fulfilled'].includes(status);
    const items: GeneratedRequisitionItem[] = slots(itemCount).map((slot) => {
      const quantityRequested = intBetween(5, 200);
      const approved = !decided ? null : Math.max(1, Math.round(quantityRequested * between(0.6, 1)));
      const fulfilled = status === 'fulfilled' && approved != null
        ? Math.max(1, Math.round(approved * between(0.85, 1)))
        : 0;
      return {
        stockItemSlot: slot,
        quantityRequested,
        quantityApproved: approved,
        quantityFulfilled: fulfilled,
        purpose: pick(REQUISITION_PURPOSES),
      };
    });
    const approvedAt = decided ? new Date(createdAt.getTime() + intBetween(4, 48) * 3600000) : null;
    out.push({
      requisitionNumber: `REQ-${padNumber(REQUISITION_NUMBER_BLOCK + 1 + i)}`,
      requestingDepartmentName,
      supplyingDepartmentName,
      requestingWardName: isWardRequest ? pick(WARDS_FOR_REQUISITION) : null,
      requestedBy: actor(isWardRequest ? 'nurse' : 'pharmacist', i),
      approvedBy: decided ? actor('admin', i) : null,
      fulfilledBy: status === 'fulfilled' ? actor('records', i) : null,
      urgency,
      requiredDate: new Date(createdAt.getTime() + intBetween(1, 14) * 86400000),
      purpose: pick(REQUISITION_PURPOSES),
      status,
      notes: status === 'cancelled'
        ? 'Cancelled - the item was later found on hand after a physical count.'
        : null,
      createdAt,
      approvedAt,
      fulfilledAt: status === 'fulfilled' ? new Date(createdAt.getTime() + intBetween(2, 10) * 86400000) : null,
      items,
    });
  }
  return out;
};

export interface GeneratedTransferItem {
  stockItemSlot: number;
  quantityRequested: number;
  quantitySent: number;
  quantityReceived: number;
}

export interface GeneratedStockTransfer {
  transferNumber: string;
  originDepartmentName: string;
  destinationDepartmentName: string;
  status: string;
  requestedBy: Actor;
  approvedBy: Actor | null;
  dispatchedAt: Date | null;
  receivedAt: Date | null;
  notes: string;
  createdAt: Date;
  items: GeneratedTransferItem[];
}

export const generateStockTransfers = (stockItemCount: number): GeneratedStockTransfer[] => {
  const out: GeneratedStockTransfer[] = [];
  if (stockItemCount <= 0) return out;
  for (let i = 0; i < COUNTS.stockTransfers; i++) {
    const origin = pick(STORE_DEPARTMENTS);
    let destination = pick([...REQUESTING_DEPARTMENTS, ...STORE_DEPARTMENTS]);
    if (destination === origin) destination = origin === 'Main Store' ? 'Pharmacy' : 'Main Store';
    const createdAt = daysAgo(intBetween(0, 200));
    const roll = rand();
    const status = roll < 0.5 ? 'received' : roll < 0.7 ? 'dispatched' : roll < 0.85 ? 'approved' : roll < 0.95 ? 'requested' : 'cancelled';
    const progressed = ['dispatched', 'received'].includes(status);
    const items: GeneratedTransferItem[] = pickSomeDistinct(range(stockItemCount), intBetween(1, 5), 1).map((slot) => {
      const quantityRequested = intBetween(5, 100);
      const sent = status === 'requested' || status === 'cancelled' ? 0 : Math.max(1, Math.round(quantityRequested * between(0.7, 1)));
      return {
        stockItemSlot: slot,
        quantityRequested,
        quantitySent: sent,
        quantityReceived: status === 'received' ? sent : 0,
      };
    });
    out.push({
      transferNumber: `TRN-${padNumber(TRANSFER_NUMBER_BLOCK + 1 + i)}`,
      originDepartmentName: origin,
      destinationDepartmentName: destination,
      status,
      requestedBy: actor(origin === 'Pharmacy' ? 'pharmacist' : 'records', i),
      approvedBy: status === 'requested' || status === 'cancelled' ? null : actor('admin', i),
      dispatchedAt: progressed ? new Date(createdAt.getTime() + 86400000) : null,
      receivedAt: status === 'received' ? new Date(createdAt.getTime() + 2 * 86400000) : null,
      notes: status === 'cancelled'
        ? 'Cancelled at dispatch - the consignment was needed at the originating store instead.'
        : `Inter-departmental transfer from ${origin} to ${destination}.`,
      createdAt,
      items,
    });
  }
  return out;
};

export interface GeneratedPurchaseInvoiceItem {
  stockItemSlot: number;
  quantity: number;
  unitCost: number;
  batchNumber: string | null;
  expiryDate: Date | null;
}

export interface GeneratedPurchaseInvoice {
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: Date;
  notes: string;
  createdBy: Actor;
  receivedAtDepartmentName: string | null;
  receivedAtWardName: string | null;
  items: GeneratedPurchaseInvoiceItem[];
}

/**
 * Purchase invoice numbers are typed in by the officer who receives the goods - the live flow
 * has no counter for them - so the seed uses the same shape the staff already use.
 */
export const generatePurchaseInvoices = (stockItemCount: number): GeneratedPurchaseInvoice[] => {
  const out: GeneratedPurchaseInvoice[] = [];
  if (stockItemCount <= 0) return out;
  const year = new Date().getFullYear();
  for (let i = 0; i < COUNTS.purchaseInvoices; i++) {
    const supplier = pick(SUPPLIERS);
    const invoiceDate = daysAgo(intBetween(0, 400));
    const batchSerial = 1000 + i * 3 + intBetween(0, 2);
    const items: GeneratedPurchaseInvoiceItem[] = pickSomeDistinct(range(stockItemCount), intBetween(2, 8), 1).map((slot) => ({
      stockItemSlot: slot,
      quantity: intBetween(10, 500),
      unitCost: +between(4, 480).toFixed(2),
      batchNumber: chance(0.85) ? `B-${year}-${batchSerial}` : null,
      // Most batches are still usable; a handful are near or past expiry so the
      // expiring-stock and batch-hold endpoints are not reading an empty table.
      expiryDate: chance(0.75) ? daysFromNow(intBetween(-45, 900)) : null,
    }));
    const toWard = chance(0.15);
    out.push({
      invoiceNumber: `${PURCHASE_INVOICE_PREFIX}${padNumber(10000 + 1 + i)}`,
      supplierName: supplier,
      invoiceDate,
      notes: `Goods received and verified against the delivery note from ${supplier}.`,
      createdBy: actor('records', i),
      receivedAtDepartmentName: toWard ? null : pick([...STORE_DEPARTMENTS, 'Laboratory']),
      receivedAtWardName: toWard ? pick(WARDS_FOR_REQUISITION) : null,
      items,
    });
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// AUDIT LOG
//
// entityId is resolved by the writer from the rows it actually created, so an
// audit entry always points at something that exists. The generator names the
// entity type and the slot within the writer's array for that type.
// ═══════════════════════════════════════════════════════════

const AUDIT_ENTITY_TYPES = [
  'Patient', 'Attendance', 'Bill', 'Payment', 'LabTest', 'Scan', 'Procedure',
  'Medication', 'Vitals', 'Admission', 'InsuranceClaim', 'Appointment',
  'Requisition', 'StockTransfer', 'Invoice', 'ProformaInvoice', 'User',
];

const AUDIT_ACTION_FOR_ENTITY: Record<string, string[]> = {
  Patient: ['create', 'update'],
  Attendance: ['create', 'update', 'submit', 'void'],
  Bill: ['create', 'update', 'print'],
  Payment: ['create', 'void'],
  LabTest: ['update', 'submit'],
  Scan: ['update', 'submit'],
  Procedure: ['update', 'submit'],
  Medication: ['create', 'update', 'void'],
  Vitals: ['create', 'update'],
  Admission: ['create', 'update'],
  InsuranceClaim: ['create', 'submit', 'approve', 'reject'],
  Appointment: ['create', 'update'],
  Requisition: ['create', 'submit', 'approve'],
  StockTransfer: ['create', 'approve'],
  Invoice: ['create', 'approve'],
  ProformaInvoice: ['create', 'approve', 'reject'],
  User: ['login', 'logout', 'update'],
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Safari/17.5',
  'Mozilla/5.0 (Linux; Android 14) Chrome/127.0 Mobile',
];

const AUDIT_ROLES: ActorRole[] = ['doctor', 'nurse', 'records', 'accounts', 'pharmacist', 'admin', 'hr_officer', 'lab_tech'];

export interface GeneratedAuditLog {
  entityType: string;
  /** Slot inside the writer's id array for this entity type. */
  entitySlot: number;
  action: string;
  performedBy: Actor;
  ipAddress: string;
  userAgent: string;
  description: string;
  timestamp: Date;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown>;
}

export const generateAuditLogs = (entityCounts: Record<string, number>): GeneratedAuditLog[] => {
  const available = AUDIT_ENTITY_TYPES.filter((type) => (entityCounts[type] ?? 0) > 0);
  if (!available.length) return [];
  const out: GeneratedAuditLog[] = [];
  for (let i = 0; i < COUNTS.auditLogs; i++) {
    const entityType = pick(available);
    const action = pick(AUDIT_ACTION_FOR_ENTITY[entityType] ?? ['update']);
    const performedRole = pick(AUDIT_ROLES);
    const timestamp = daysAgo(intBetween(0, 120));
    const description = pick(AUDIT_DESCRIPTIONS);
    out.push({
      entityType,
      entitySlot: rnd(Math.max(1, entityCounts[entityType] ?? 1)),
      action,
      performedBy: actor(performedRole, i),
      ipAddress: `41.66.${intBetween(10, 250)}.${intBetween(2, 254)}`,
      userAgent: pick(USER_AGENTS),
      description,
      timestamp,
      previousState: action === 'create' ? null : { summary: `State before: ${description}` },
      newState: { summary: description, action },
    });
  }
  return out.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// ═══════════════════════════════════════════════════════════
// COMMUNICATION LOG
// ═══════════════════════════════════════════════════════════

const COMMUNICATION_TYPES = [
  'APPOINTMENT_REMINDER', 'APPOINTMENT_CONFIRMATION', 'LAB_RESULT_READY',
  'PRESCRIPTION_READY', 'PAYMENT_REMINDER', 'BILL_NOTIFICATION',
  'WELCOME_MESSAGE', 'GENERAL_NOTIFICATION',
];

export interface GeneratedCommunicationLog {
  channelName: string;
  channelType: string;
  templateType: string;
  subject: string;
  /** A phone number for SMS/WhatsApp, an address for email - matched to the channel by the writer. */
  recipientKind: 'phone' | 'email';
  recipientSeed: number;
  message: string;
  status: string;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  cost: number;
  providerMessageId: string | null;
  createdAt: Date;
}

export const generateCommunicationLogs = (): GeneratedCommunicationLog[] => {
  const out: GeneratedCommunicationLog[] = [];
  for (let i = 0; i < COUNTS.communicationLogs; i++) {
    const channelType = rand() < 0.6 ? 'SMS' : rand() < 0.7 ? 'WHATSAPP' : 'EMAIL';
    const templateType = pick(COMMUNICATION_TYPES);
    const subject = pick(COMMUNICATION_SUBJECTS);
    const createdAt = daysAgo(intBetween(0, 150));
    const roll = rand();
    const status = roll < 0.6 ? 'DELIVERED' : roll < 0.78 ? 'READ' : roll < 0.9 ? 'SENT' : roll < 0.96 ? 'PENDING' : 'FAILED';
    const sendable = status !== 'PENDING';
    out.push({
      // The names the messaging screens look up: the dashboard counts SMS and WhatsApp
      // channels by name, so a differently named channel reads as no traffic at all.
      channelName: channelType === 'SMS' ? 'SMS Gateway' : channelType === 'WHATSAPP' ? 'WhatsApp Business' : 'Email SMTP',
      channelType,
      templateType,
      subject,
      recipientKind: channelType === 'EMAIL' ? 'email' : 'phone',
      recipientSeed: i,
      message: `${subject}. Please refer to your appointment or visit record for the details, and contact the facility if anything on it is incorrect.`,
      status,
      sentAt: sendable ? new Date(createdAt.getTime() + intBetween(1, 30) * 60000) : null,
      deliveredAt: ['DELIVERED', 'READ'].includes(status) ? new Date(createdAt.getTime() + intBetween(31, 120) * 60000) : null,
      readAt: status === 'READ' ? new Date(createdAt.getTime() + intBetween(121, 1440) * 60000) : null,
      failedAt: status === 'FAILED' ? new Date(createdAt.getTime() + intBetween(1, 30) * 60000) : null,
      failureReason: status === 'FAILED' ? 'Rejected by the gateway: the subscriber number is not provisioned for messaging.' : null,
      cost: channelType === 'EMAIL' ? 0 : +between(0.02, 0.12).toFixed(3),
      providerMessageId: sendable ? `MSG-${padNumber(10000 + i)}` : null,
      createdAt,
    });
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// GHSS REPORTING — submissions, malaria commodity stock
// ═══════════════════════════════════════════════════════════

/**
 * Only the return types the application archives.
 *
 * GHSReportController saves a submission for these six and nothing else; opd_morbidity,
 * form_a_services and monthly_summary are enum members with no generator behind them, so a
 * seeded row of one of those would hold a payload no endpoint could ever have produced.
 */
const GHS_REPORT_TYPES = [
  'opd_attendance', 'ipd_morbidity', 'form_a_morbidity',
  'form_a_complete', 'malaria_data', 'idsr',
];

export interface GeneratedGhsSubmission {
  reportType: string;
  reportingYear: number;
  reportingMonth: number;
  reportingQuarter: number | null;
  periodStart: Date;
  periodEnd: Date;
  submittedToDHIMS2: boolean;
  dhims2Reference: string | null;
  submittedAt: Date | null;
  createdBy: Actor;
  createdAt: Date;
  /** Counts the writer fills from the real rows in the period, so a saved submission agrees with the data. */
  summaryKey: string;
}

export const generateGhsSubmissions = (): GeneratedGhsSubmission[] => {
  const out: GeneratedGhsSubmission[] = [];
  const now = new Date();
  for (let back = 12; back >= 1; back--) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const year = anchor.getFullYear();
    const month = anchor.getMonth() + 1;
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);
    for (const reportType of GHS_REPORT_TYPES) {
      if (chance(0.45)) continue;
      const quarter = Math.ceil(month / 3);
      const submitted = chance(0.8);
      out.push({
        reportType,
        reportingYear: year,
        reportingMonth: month,
        reportingQuarter: reportType.startsWith('form_a') ? quarter : null,
        periodStart,
        periodEnd,
        submittedToDHIMS2: submitted,
        dhims2Reference: submitted ? `DHIMS2-${year}${String(month).padStart(2, '0')}-${padNumber(10000 + out.length)}` : null,
        submittedAt: submitted ? new Date(periodEnd.getTime() + intBetween(1, 8) * 86400000) : null,
        createdBy: actor('records', out.length),
        createdAt: new Date(periodEnd.getTime() - intBetween(0, 5) * 86400000),
        summaryKey: `${reportType}-${year}-${month}`,
      });
    }
  }
  return out;
};

const MALARIA_COMMODITIES = [
  'asaq_below_1yr', 'asaq_1_5yrs', 'asaq_6_13yrs', 'asaq_14_plus',
  'al_0_3yrs', 'al_4_8yrs', 'al_9_13yrs', 'al_14_plus',
  'dhap_40_320mg', 'quinine_tablet', 'quinine_injection',
  'artesunate_injection_30mg', 'artesunate_injection_60mg', 'artesunate_injection_120mg',
  'arthemeter_injection_40mg', 'arthemeter_injection_80mg',
  'rectal_artesunate_50mg', 'rectal_artesunate_200mg',
  'rdt_kits', 'sp',
];

export interface GeneratedMalariaStock {
  commodityType: string;
  /** First day of the month it is reported for - the malaria endpoint filters on this window. */
  reportingMonth: Date;
  openingStock: number;
  received: number;
  dispensed: number;
  closingStock: number;
  stockOutDays: number;
  year: number;
  month: number;
}

/**
 * Stock is reported per commodity per month for one facility, so the writer resolves
 * facilityId itself. closingStock is arithmetic, not a random number: opening + received
 * - dispensed, floored at zero, with the shortfall recorded as stock-out days.
 */
export const generateMalariaStock = (): GeneratedMalariaStock[] => {
  const out: GeneratedMalariaStock[] = [];
  const now = new Date();
  for (let back = 6; back >= 1; back--) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const year = anchor.getFullYear();
    const month = anchor.getMonth() + 1;
    for (const commodityType of MALARIA_COMMODITIES) {
      if (chance(0.25)) continue;
      const openingStock = intBetween(200, 6000);
      const received = intBetween(0, 4000);
      const dispensed = intBetween(0, openingStock + received);
      const rawClosing = openingStock + received - dispensed;
      out.push({
        commodityType,
        reportingMonth: anchor,
        openingStock,
        received,
        dispensed: Math.min(dispensed, openingStock + received),
        closingStock: Math.max(0, rawClosing),
        stockOutDays: rawClosing <= 50 ? intBetween(1, 9) : 0,
        year,
        month,
      });
    }
  }
  return out;
};
