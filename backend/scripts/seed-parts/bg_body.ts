
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

