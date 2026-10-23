// src/seed/bulkGenerator.ts
// Pure in-memory generators — no file I/O, no Prisma.
// Deterministic via setSeed().

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
        admin: 'super_admin',
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
}

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

    out.push({
      folderNumber: `${1001 + i}`,
      surname,
      otherNames: firstName,
      gender,
      dateOfBirth: dob,
      contact: `+23324${intBetween(1000000, 9999999)}`,
      address: pick(ADDRESSES),
      paymentMode,
      nhisNumber: paymentMode === 'nhis' ? `NHIS-${intBetween(100000, 999999)}` : null,
      nhisActive: paymentMode === 'nhis',
      nhisExpiryDate: paymentMode === 'nhis' ? daysFromNow(intBetween(30, 365)) : null,
      phoneNumber: `+23324${intBetween(1000000, 9999999)}`,
      insuranceDetails: paymentMode === 'nhis' ? { memberId: `NHIS-${intBetween(100000, 999999)}` } : {},
      registeredAt: daysAgo(intBetween(0, 730)),
    });
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// REFERENCE POOLS — REAL DHIMS CODES
// ═══════════════════════════════════════════════════════════

// Real LabTestTemplate.investigationCode values from your lab-templates JSON
const LAB_CODES = [
  'INVE51D','INVE09D','INVE46D','INVE46F','INVE83D','INVE01D','INVE99D',
  'INVE92D','INVE04E','INVE38E','INVE149','INVE69D','INVE68D','INVE27D',
  'INVE63D','INVE64D','INVE105','INVE133','INVE98D','INVE19E','INVE20E',
  'INVE62D','INVE74D','INVE112','INVE21D','INVE24D','INVE75D','INVE17D',
  'INVE16E','INVE59D','INVE58D','INVE24E','INVE25E','INVE21E','INVE22E',
  'INVE94D','INVE57D','INVE141','INVE97D','INVE154','INVE36E','INVE37E',
  'INVE16D','INVE34E','INVE65D','INVE113','INVE42D','INVE95D','INVE06D',
  'INVE15D','INVE146','INVE29E','INVE29D','INVE30D','INVE04D','INVE85D',
  'INVE91D','INVE11E','INVE23E','INVE43D','INVE93D','INVE25D','INVE05D',
  'INVE45B','INVE137','INVE08E','INVE126','INVE05E','INVE109','INVE107',
  'INVE14E','INVE09E','INVE26E','INVE26D','INVE136','INVE53D','INVE110',
  'INVE150','INVE96D','INVE120','INVE07D','INVE41D','INVE142','INVE135',
  'INVE33S','INVE34S','INVE35S','INVE55M','INVE56M','INVE27M','INVE53M',
  'INVE54M','INVE51M','INVE52M','INVE44B','INVE40B','INVE28D','INVE31D',
  'INVE103','INVE76D','INVE54D','INVE66D','INVE79D','INVE17E','INVE18E',
  'INVE152','INVE23D','INVE22D','INVE36D','INVE86D','INVE67D','INVE71D',
  'INVE87D','INVE45D','INVE44D','INVE56D','INVE18D','INVE104','INVE114',
  'INVE100','INVE101A','INVE101','INVE37D','INVE38D','INVE48D','INVE77D',
  'INVE01E',
];

// Real ScanTemplate.scanCode values from your scan-templates JSON
const SCAN_CODES = [
  'scan01x','scan02u','scan03u','scan04u','scan05u','scan06x','scan07x',
  'scan08x','scan09x','scan10x','scan11x','scan12x','scan13x','scan14x',
  'scan15m','scan16u','scan17u','scan18x','scan19x','scan20f','scan21x',
  'scan22x','scan23c','scan24c','scan25c','scan26x','scan27u','scan28u',
  'scan29u','scan30x','scan31c','scan32c','scan33c','scan34c','scan35m',
  'scan36m','scan37m','scan38m','scan39o','scan40n','scan41x','scan42n',
  'scan43x','scan44x','scan45f','scan46u','scan47u','scan48x','scan49x',
  'scan50c','scan51c','scan52x','scan53x','scan54x','scan55x','scan56u',
  'scan57u','scan58e','scan59u','scan60u','scan61u','scan62c','scan63f',
  'scan64f','scan65m','scan66m','scan67m','scan68f','scan69b','scan70n',
];

// ICD-10 codes for diagnoses (kept small so they reliably exist in core seed)
const ICD_CODES = ['B54','I10','J45.909','K40.90','E11','A09','J06.9','N39.0','R50.9','O80','Z34.00','O80.0'];

// Medication names — display only; no FK to ServiceCatalog in generator output
const MED_NAMES = [
  'Paracetamol 500mg','Artesunate 50mg','Amlodipine 5mg','Amoxicillin 500mg',
  'Metformin 500mg','Ibuprofen 400mg','Cetirizine 10mg','Omeprazole 20mg',
];

// ═══════════════════════════════════════════════════════════
// ATTENDANCES + ALL SUB-ENTITIES
// ═══════════════════════════════════════════════════════════
export interface GeneratedBundle {
  attendances: any[];
  vitals: any[];
  labs: any[];
  scans: any[];
  medications: any[];
  diagnosesLinked: any[];
  services: any[];
  bills: any[];
  payments: any[];
  claims: any[];
  referrals: any[];
  admissions: any[];
  antenatalBookings: any[];
  ancVisits: any[];
  deliveryRecords: any[];
  newbornRecords: any[];
  postnatalRecords: any[];
}

export const generateAttendances = (patients: GeneratedPatient[]): GeneratedBundle => {
  const b: GeneratedBundle = {
    attendances: [], vitals: [], labs: [], scans: [], medications: [],
    diagnosesLinked: [], services: [], bills: [], payments: [], claims: [],
    referrals: [], admissions: [], antenatalBookings: [], ancVisits: [],
    deliveryRecords: [], newbornRecords: [], postnatalRecords: [],
  };

  let attCounter = 5000;
  let billCounter = 5000;

  for (let i = 0; i < COUNTS.attendances; i++) {
    const patient = pick(patients);
    const attendanceKey = `att-${i + 1}`;
    const attendanceNumber = `${++attCounter}`;
    const roll = rand();
    const attendanceType =
      roll < 0.50 ? 'general_consultation' :
      roll < 0.65 ? 'emergency_acute' :
      roll < 0.80 ? 'chronic_followup' :
      roll < 0.88 ? 'antenatal' :
      roll < 0.93 ? 'postnatal' :
      roll < 0.96 ? 'specialist_consultation' :
      roll < 0.99 ? 'surgery' : 'delivery';

    const daysBack = intBetween(0, 365);
    const dateTime = daysAgo(daysBack);
    const status = daysBack < 1 ? pick(['pending','completed','admitted']) : 'completed';
    const isIpd = attendanceType === 'surgery' || attendanceType === 'delivery';

    b.attendances.push({
      key: attendanceKey,
      attendanceNumber,
      patientFolderNumber: patient.folderNumber,
      attendanceType,
      paymentMode: patient.paymentMode,
      dateTime,
      status,
      encounterCategory: isIpd ? 'ipd' : 'opd',
      visitCategory: attendanceType === 'emergency_acute' ? 'emergency' : attendanceType === 'specialist_consultation' ? 'specialist' : 'general',
      serviceCategory: isIpd ? 'ipd' : 'opd',
      complaints: 'Routine visit',
      medicalNotes: 'Patient reviewed. See diagnosis.',
    });

    // ── VITALS
    if (chance(COUNTS.vitalsPerAttendance)) {
      b.vitals.push({
        attendanceKey,
        patientFolderNumber: patient.folderNumber,
        temperature: +between(36.0, 39.5).toFixed(1),
        pulse: intBetween(60, 110),
        respiration: intBetween(12, 28),
        spo2: intBetween(92, 100),
        weight: +between(5, 95).toFixed(1),
        height: +between(60, 185).toFixed(1),
        bloodPressure: `${intBetween(100, 160)}/${intBetween(60, 100)}`,
        recordedAt: dateTime,
      });
    }

    // ── DIAGNOSIS
    if (chance(COUNTS.diagnosisPerAttendance)) {
      b.diagnosesLinked.push({
        attendanceKey,
        icdCode: pick(ICD_CODES),
        diagnosisType: 'primary',
        presentOnAdmission: chance(0.6) ? 'Y' : 'N',
        date: dateTime,
      });
    }

    // ── LABS
    const labCount = rand() < (COUNTS.labTestsPerAttendance % 1) ? Math.ceil(COUNTS.labTestsPerAttendance) : Math.floor(COUNTS.labTestsPerAttendance);
    for (let j = 0; j < labCount; j++) {
      b.labs.push({
        attendanceKey,
        testCode: pick(LAB_CODES),
        status: chance(0.85) ? 'completed' : 'requested',
        result: { value: +between(0, 100).toFixed(2), unit: 'varies' },
        requestedAt: dateTime,
        completedAt: chance(0.85) ? dateTime : null,
        priority: chance(0.2) ? 'urgent' : 'routine',
      });
    }

    // ── SCANS
    if (chance(COUNTS.scansPerAttendance)) {
      b.scans.push({
        attendanceKey,
        scanCode: pick(SCAN_CODES),
        status: chance(0.8) ? 'completed' : 'requested',
        description: 'Scan performed',
        bodyPart: pick(['chest','abdomen','head','extremities']),
        requestedAt: dateTime,
        completedAt: chance(0.8) ? dateTime : null,
        priority: chance(0.15) ? 'urgent' : 'routine',
      });
    }

    // ── MEDICATIONS
    const medCount = Math.round(COUNTS.medicationsPerAttendance);
    for (let j = 0; j < medCount; j++) {
      b.medications.push({
        attendanceKey,
        name: pick(MED_NAMES),
        dosage: pick(['1 tablet','2 tablets','5ml']),
        frequency: pick(['Once daily','BD','TDS','QID','PRN']),
        duration: pick(['3 days','5 days','7 days','30 days']),
        quantity: intBetween(3, 30),
        route: pick(['oral','IV','IM','SC']),
        status: pick(['prescribed','dispensed','administered']),
        prescribedAt: dateTime,
      });
    }

    // ── SERVICES
    if (chance(COUNTS.servicesPerAttendance)) {
      b.services.push({
        attendanceKey,
        serviceCode: attendanceType === 'specialist_consultation' ? 'CONS-SPEC' : 'CONS-GEN',
        quantity: 1,
        date: dateTime,
      });
    }

    // ── BILLS / PAYMENTS / CLAIMS
    if (chance(COUNTS.billPerAttendance)) {
      const subtotal = +between(50, 2000).toFixed(2);
      const billNumber = `BILL-${++billCounter}`;
      const isNHIS = patient.paymentMode === 'nhis';
      const insuranceCovered = isNHIS || patient.paymentMode === 'private_insurance' ? subtotal * 0.8 : 0;
      const patientPayable = +(subtotal - insuranceCovered).toFixed(2);
      const paid = +(chance(0.6) ? patientPayable : between(0, patientPayable)).toFixed(2);

      b.bills.push({
        billNumber,
        attendanceKey,
        patientFolderNumber: patient.folderNumber,
        subtotal, discount: 0, waiverAmount: 0, taxAmount: 0,
        totalAmount: subtotal,
        insuranceCovered: +insuranceCovered.toFixed(2),
        patientPayable: +patientPayable.toFixed(2),
        paidAmount: paid,
        balance: +(patientPayable - paid).toFixed(2),
        status: paid >= patientPayable ? 'paid' : paid > 0 ? 'partial' : 'pending',
        paymentMode: patient.paymentMode,
        billDate: dateTime,
        lineItems: [
          { description: 'Consultation', serviceType: 'consultation', quantity: 1, unitPrice: +between(50, 150).toFixed(2), pricingBasis: patient.paymentMode },
          { description: 'Lab Test',     serviceType: 'lab_test',     quantity: 1, unitPrice: +between(30, 200).toFixed(2), pricingBasis: patient.paymentMode },
        ],
      });

      if (paid > 0) {
        b.payments.push({
          billNumber,
          amount: paid,
          paymentMethod: patient.paymentMode === 'cash' ? 'cash' : pick(['mobile_money','card','bank_transfer']),
          reference: `RCP-${intBetween(100000, 999999)}`,
          transactionDate: dateTime,
        });
      }

      if (isNHIS && chance(COUNTS.claimsPerNHISAttendance)) {
        b.claims.push({
          claimNumber: `NHIS-${attendanceNumber}`,
          billNumber,
          attendanceKey,
          patientFolderNumber: patient.folderNumber,
          totalClaimAmount: subtotal,
          // InsuranceClaim.status currently shares ClaimStatus with bills (draft/finalized).
          // Do not generate values the Prisma enum cannot persist.
          status: pick(['draft', 'finalized']),
          diagnosisCodes: ['B54'],
          submissionDate: dateTime,
        });
      }
    }

    // ── REFERRALS
    if (chance(COUNTS.referralsPerAttendance)) {
      b.referrals.push({
        referralNumber: `REF-${intBetween(100000, 999999)}`,
        attendanceKey,
        patientFolderNumber: patient.folderNumber,
        referralType: 'outgoing',
        referralReason: pick(['Needs specialist review','Requires further imaging','Referred for surgery','Referred for physiotherapy']),
        urgency: pick(['routine','urgent']),
        referralDate: dateTime,
        status: pick(['pending','accepted','completed']),
      });
    }

    // ── ADMISSIONS
    if (isIpd && chance(COUNTS.admissionsPerAttendance)) {
      b.admissions.push({
        admissionNumber: `ADM-${attendanceNumber}`,
        attendanceKey,
        admissionType: pick(['elective','emergency']),
        admissionSource: pick(['home','opd','emergency','referral']),
        admissionDate: dateTime,
        dischargeStatus: chance(0.7) ? 'home' : null,
        dischargeDate: chance(0.7) ? daysAgo(Math.max(0, daysBack - intBetween(1, 5))) : null,
      });
    }

    // ── MATERNITY LINKS
    if (attendanceType === 'antenatal' && patient.gender === 'female') {
      const bookingDate = dateTime;
      const lmpDate = new Date(bookingDate);
      lmpDate.setDate(lmpDate.getDate() - intBetween(30, 200));
      const eddDate = new Date(lmpDate);
      eddDate.setDate(eddDate.getDate() + 280);

      const booking = {
        bookingKey: `anc-${attendanceKey}`,
        attendanceKey,
        patientFolderNumber: patient.folderNumber,
        bookingDate,
        lmp: lmpDate,
        edd: eddDate,
        gravida: intBetween(1, 5),
        para: intBetween(0, 4),
        gestationalAgeWeeks: intBetween(8, 36),
        riskLevel: pick(['low','low','low','medium','high']),
        bloodGroup: pick(['O+','A+','B+','AB+','O-']),
        hivStatus: chance(0.05) ? 'Positive' : 'Negative',
        hbLevel: +between(8, 14).toFixed(1),
        isActive: true,
      };
      b.antenatalBookings.push(booking);

      const visitCount = intBetween(1, 6);
      for (let v = 1; v <= visitCount; v++) {
        b.ancVisits.push({
          bookingKey: booking.bookingKey,
          visitNumber: v,
          visitDate: daysAgo(Math.max(0, daysBack - v * 21)),
          gestationalAgeWeeks: Math.min(40, booking.gestationalAgeWeeks + v * 4),
          weight: +between(55, 95).toFixed(1),
          bloodPressure: `${intBetween(100, 150)}/${intBetween(60, 95)}`,
          fundalHeight: Math.round((booking.gestationalAgeWeeks + v * 4) * 0.9),
          fetalHeartRate: intBetween(120, 160),
        });
      }
    }

    if (attendanceType === 'delivery' && patient.gender === 'female') {
      const deliveryDate = dateTime;
      const deliveryKey = `del-${attendanceKey}`;
      const isTwins = chance(0.05);
      const isCS = chance(0.25);
      const deliveryType = isCS ? 'caesarean_section' : isTwins ? 'multiple' : 'spontaneous_vertex';
      const outcome = chance(0.95) ? 'live_birth' : 'stillbirth_fresh';

      b.deliveryRecords.push({
        deliveryKey,
        attendanceKey,
        patientFolderNumber: patient.folderNumber,
        deliveryDate,
        deliveryType,
        deliveryOutcome: outcome,
        placeOfDelivery: 'private_hospital',
        attendant: 'Midwife on duty',
        gestationWeeks: intBetween(36, 42),
        birthWeight: isTwins ? 2400 : intBetween(2500, 4000),
        apgarScore1min: intBetween(6, 9),
        apgarScore5min: intBetween(8, 10),
        maternalOutcome: 'alive',
        complications: isTwins ? ['Preterm labour'] : [],
        malePartnerPresentANC: false,
        malePartnerPresentDelivery: false,
        malePartnerPresentPNC: false,
        maternalDeathsAudited: false,
      });

      const babies = isTwins ? 2 : 1;
      for (let n = 1; n <= babies; n++) {
        b.newbornRecords.push({
          deliveryKey,
          order: n,
          birthWeight: isTwins ? intBetween(2000, 2800) : intBetween(2500, 4000),
          gender: chance(0.5) ? 'male' : 'female',
          apgarScore1min: intBetween(6, 9),
          apgarScore5min: intBetween(8, 10),
          outcome: outcome === 'live_birth' ? 'alive' : 'dead_within_24hrs',
          anomalies: [],
          breastfeedingWithin30Min: true,
          eyeProphylaxisGiven: true,
          cordCareMethod: 'dry_cord',
        });
      }
    }

    if (attendanceType === 'postnatal' && patient.gender === 'female') {
      b.postnatalRecords.push({
        attendanceKey,
        patientFolderNumber: patient.folderNumber,
        examinationDate: dateTime,
        dayNumber: pick([1, 3, 7, 14, 42]),
        maternalCondition: 'good',
        maternalComplications: [],
        maternalDangerSigns: [],
        babyDangerSigns: [],
        breastfeedingStatus: 'exclusive',
        babyCondition: 'good',
        lochia: 'normal',
        perinealCondition: 'intact',
        latching: 'good',
        jaundice: chance(0.1),
        cordCondition: 'dry',
        bcgGiven: true,
        opv0Given: true,
        hepB0Given: true,
        familyPlanningDiscussed: chance(0.5),
        malePartnerPresentPNC: chance(0.3),
      });
    }
  }

  return b;
};

// ═══════════════════════════════════════════════════════════
// APPOINTMENTS
// ═══════════════════════════════════════════════════════════
export const generateAppointments = (patients: GeneratedPatient[]) => {
  const out: any[] = [];
  for (let i = 0; i < COUNTS.appointments; i++) {
    const patient = pick(patients);
    const daysOffset = intBetween(-180, 30);
    const scheduledAt = daysOffset >= 0 ? daysFromNow(daysOffset) : daysAgo(-daysOffset);
    out.push({
      appointmentNumber: `APT-${10000 + i}`,
      patientFolderNumber: patient.folderNumber,
      title: pick(['Follow-up','Consultation','Vaccination','Antenatal Visit','Review']),
      scheduledAt,
      duration: pick([15, 20, 30, 45]),
      status: daysOffset < 0 ? pick(['completed','no_show']) : pick(['scheduled','confirmed']),
      type: pick(['consultation','follow_up','antenatal','postnatal','vaccination','lab_test']),
    });
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// FAMILY PLANNING
// ═══════════════════════════════════════════════════════════
export const generateFamilyPlanning = (patients: GeneratedPatient[]) => {
  const out: any[] = [];
  for (let i = 0; i < COUNTS.familyPlanning; i++) {
    const patient = pick(patients);
    out.push({
      patientFolderNumber: patient.folderNumber,
      serviceDate: daysAgo(intBetween(0, 365)),
      method: pick(['pill_coc','injectable_dmpa','implant_implanon','iud_copper','condom_male','female_sterilization']),
      methodCategory: pick(['modern_short_acting','modern_long_acting','permanent']),
      isNewAcceptor: chance(0.4),
      counsellingGiven: true,
      informedConsent: true,
      cypFactor: +between(0.1, 3.0).toFixed(2),
    });
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════
export const generateNotifications = (usernames: string[]) => {
  const out: any[] = [];
  const target = usernames.length ? pick(usernames) : 'admin';
  for (let i = 0; i < COUNTS.notifications; i++) {
    out.push({
      targetUsername: target,
      title: pick(['Lab Results Available','New Claim Ready','Appointment Reminder','Low Stock Alert','Payment Received']),
      message: pick(['Please review the latest results.','A new claim is ready for submission.','Reminder for tomorrow.','Stock is below reorder level.','Payment received successfully.']),
      type: pick(['clinical','billing','appointment','system','info']),
      priority: pick(['low','medium','high']),
      isRead: chance(0.3),
      createdAt: daysAgo(intBetween(0, 90)),
    });
  }
  return out;
};