// src/seed/coreSeed.ts - REARRANGED FOR PROPER ORDER
import {
  PrismaClient,
  ServiceType,
  ServiceCategory,
  NHISCoverageType,
  UserRole,
  Seniority,
  Gender,
  InsuranceType,
  EmploymentType,
  GDRGMDC,
  EncounterCategory,
  AttendanceType,
} from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { upsertRbac } from './rbac.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const readJSON = (fileName: string) => {
  // SEED_DATA_DIR lets the packaged desktop app point at the data files it ships next to the bundle
  const dataDir = process.env.SEED_DATA_DIR || path.join(__dirname, '..', 'data');
  const filePath = path.join(dataDir, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ File not found: ${filePath}`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

// Facility-only medicines use a readable NHIS-style code: eight name letters
// followed by a two-digit sequence, e.g. PARACETA01.
const generateFacilityDrugCode = (item: any, usedCodes: Set<string>): string => {
  const base = String(item.name ?? 'MEDICINE').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'MEDICINE';
  for (let sequence = 1; sequence <= 99; sequence++) {
    const code = `${base}${String(sequence).padStart(2, '0')}`;
    if (!usedCodes.has(code)) {
      usedCodes.add(code);
      return code;
    }
  }
  throw new Error(`Could not generate a unique medicine code for ${item.name}; enter a code manually.`);
};


// ─────────────────────────────────────────────────────────────
// Enum normalizers (protects against JSON casing drift)
// ─────────────────────────────────────────────────────────────
const GDRG_MDC_VALUES = new Set([
  'ASUR','DENT','ENTH','INVE','MEDI','OBGY','OPDC','OPHT',
  'ORTH','PAED','PSUR','RSUR','ZOOM',
]);
const normalizeMdc = (v: any): GDRGMDC => {
  const s = String(v ?? 'MEDI').toUpperCase();
  return (GDRG_MDC_VALUES.has(s) ? s : 'MEDI') as GDRGMDC;
};

const ENCOUNTER_CATEGORY_VALUES = new Set(['opd', 'ipd', 'daycase']);
const normalizeEncounterCategory = (v: any): EncounterCategory | null => {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).toLowerCase();
  return (ENCOUNTER_CATEGORY_VALUES.has(s) ? s : null) as EncounterCategory | null;
};

const ATTENDANCE_TYPE_VALUES = new Set([
  'emergency_acute','antenatal','postnatal','chronic_followup',
  'specialist_consultation','delivery','surgery','general_consultation',
]);
const normalizeAttendanceTypes = (v: any): AttendanceType[] => {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => String(x).toLowerCase())
    .filter((x) => ATTENDANCE_TYPE_VALUES.has(x)) as AttendanceType[];
};

const normalizeGender = (v: any): Gender => {
  const s = String(v ?? 'male').toLowerCase();
  if (s === 'female') return Gender.female;
  if (s === 'other') return Gender.other;
  return Gender.male;
};

// ─────────────────────────────────────────────────────────────
// Schema defaults helper
// ─────────────────────────────────────────────────────────────
const addSchemaDefaults = (data: any, type: string) => {
  const baseDefaults = { createdAt: new Date(), updatedAt: new Date() };

  switch (type) {
    case 'labTestTemplate': {
      const labCategoryMap: Record<string, string> = {
        pathology: 'pathology', hematology: 'hematology',
        biochemistry: 'biochemistry', microbiology: 'microbiology',
        serology: 'serology', immunology: 'immunology',
        molecular: 'molecular', neurology: 'neurology',
        pulmonology: 'pulmonology', cardiology: 'cardiology',
        gastroenterology: 'gastroenterology',
      };
      const specimenTypeMap: Record<string, string> = {
        marrow: 'tissue', 'bone marrow': 'tissue', 'bone-marrow': 'tissue',
      };
      const mappedSpecimenType = specimenTypeMap[data.specimenType] || data.specimenType || 'blood';
      const mappedCategory = labCategoryMap[data.category] || 'hematology';
      return {
        ...baseDefaults,
        name: data.name || 'Unknown Lab Test',
        investigationCode: data.investigationCode,
        category: mappedCategory,
        subCategory: data.subCategory || null,
        description: data.description || '',
        specimenType: mappedSpecimenType as any,
        resultTemplate: data.resultTemplate || null,
        normalRangeTemplate: data.normalRangeTemplate || null,
        isNHISCovered: data.isNHISCovered ?? true,
        isPrivateInsExempted: data.isPrivateInsExempted ?? false,
        nhisRequiresAuth: false,
        privateInsRequiresAuth: false,
        isActive: true,
      };
    }

    case 'scanTemplate': {
      return {
        ...baseDefaults,
        name: data.name || 'Unknown Scan',
        scanCode: data.scanCode,
        investigationCode: data.investigationCode,
        description: data.description || 'Imaging study',
        category: data.category || 'xray',
        bodyPart: data.bodyPart || 'other',
        scanType: data.scanType || null,
        preparationInstructions: data.preparationInstructions || 'No special preparation needed',
        duration: data.duration ?? 30,
        contrastRequired: data.contrastRequired ?? false,
        isNHISCovered: data.isNHISCovered ?? true,
        isPrivateInsExempted: data.isPrivateInsExempted ?? false,
        nhisRequiresAuth: data.nhisRequiresAuth ?? false,
        privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
        vatRate: data.vatRate ?? 0,
        isTaxable: data.isTaxable ?? true,
        isActive: true,
        resultTemplate: data.resultTemplate || [],
      };
    }

    case 'procedureTemplate': {
      const categoryMap: Record<string, string> = {
        'General Surgery': 'surgical', 'Thoracic Surgery': 'surgical',
        'Vascular Surgery': 'surgical', Neurosurgery: 'surgical',
        'Paediatric Surgery': 'pediatric', Gynaecology: 'obstetric',
        Obstetrics: 'obstetric', Orthopaedics: 'orthopedic',
        'Reconstructive Surgery': 'surgical', 'Plastic Surgery': 'surgical',
        Urology: 'urology', ENT: 'ent', Dental: 'dental',
        Ophthalmology: 'ophthalmic', Neurology: 'neurology',
        Dermatology: 'dermatology', Endoscopy: 'diagnostic',
        'Laparoscopic Surgery': 'laparoscopic', Laparoscopic: 'laparoscopic',
        Laparotomy: 'laparotomy', 'Interventional Radiology': 'diagnostic',
        'Family Planning': 'therapeutic', 'Nursing Procedure': 'therapeutic',
        Emergency: 'emergency', Observation: 'therapeutic',
        Administrative: 'therapeutic', Diagnostic: 'diagnostic',
      };
      const mappedCategory = categoryMap[data.category] || 'therapeutic';
      return {
        ...baseDefaults,
        name: data.name || 'Unknown Procedure',
        procedureCode: data.procedureCode,
        description: data.description || '',
        category: mappedCategory,
        department: data.department || 'general',
        duration: data.duration ?? 60,
        isNHISCovered: data.isNHISCovered ?? true,
        isPrivateInsExempted: data.isPrivateInsExempted ?? false,
        nhisRequiresAuth: data.nhisRequiresAuth ?? false,
        privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
        vatRate: data.vatRate ?? 0,
        isTaxable: data.isTaxable ?? true,
        tariffCode: data.tariffCode || `PROC-${data.procedureCode}`,
        isActive: true,
      };
    }

    case 'diagnosis':
      return {
        ...baseDefaults,
        name: data.name || 'Unknown Diagnosis',
        icdCode: data.icdCode,
        description: data.description || null,
        isActive: true,
        requiresAuthorization: data.requiresAuthorization ?? false,
        tariffCode: data.tariffCode || `DIAG-${data.icdCode}`,
        isChronic: data.isChronic ?? false,
        isNHISCovered: data.isNHISCovered ?? true,
        morbidityGroup: data.morbidityGroup || 'all_other_diseases',
      };

    case 'stockItem':
      return {
        ...baseDefaults,
        name: data.name?.trim() || 'Unknown Item',
        drugCode: data.drugCode,
        category: data.category || 'medication',
        description: data.description || '',
        strength: data.strength || 'N/A',
        unitOfMeasure: data.unitOfMeasure || 'units',
        reorderLevel: Math.max(0, data.reorderLevel ?? 50),
        currentStock: Math.max(0, data.currentStock ?? 100),
        costPrice: Math.max(0, data.costPrice ?? data.unitPrice ?? 0),
        supplier: data.supplier || null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        batchNumber: data.batchNumber || null,
        isMedication: data.isMedication ?? true,
        isNHISCovered: data.isNHISCovered === true,
        isPrivateInsExempted: data.isPrivateInsExempted ?? false,
        nhisRequiresAuth: data.nhisRequiresAuth ?? false,
        privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
        vatRate: data.vatRate ?? 0,
        isTaxable: data.isTaxable ?? true,
        tariffCode: data.tariffCode || data.drugCode,
        isActive: true,
      };

    case 'serviceCatalog':
      return {
        ...baseDefaults,
        name: data.name,
        code: data.code,
        description: data.description || null,
        serviceType: data.serviceType,
        serviceCategory: data.serviceCategory || ServiceCategory.opd,
        subType: data.subType || null,
        nhisServiceCode: data.nhisServiceCode || null,
        isNHISCovered: data.isNHISCovered ?? true,
        nhisCoverageType: data.nhisCoverageType || NHISCoverageType.full,
        nhisRequiresAuth: data.nhisRequiresAuth ?? false,
        privateInsRequiresAuth: data.privateInsRequiresAuth ?? false,
        isPrivateInsuranceExempted: data.isPrivateInsuranceExempted ?? false,
        isPending: false, // ✅ seeded services are live
        isActive: data.isActive ?? true,
        requiresClinicalNotes: data.requiresClinicalNotes ?? false,
        unit: data.unit || 'Each',
        metadata: data.metadata || null,
        tariffCode: data.tariffCode || null,
        diagnosisId: data.diagnosisId || null,
        labTestTemplateId: data.labTestTemplateId || null,
        procedureTemplateId: data.procedureTemplateId || null,
        stockItemId: data.stockItemId || null,
        wardId: data.wardId || null,
        scanTemplateId: data.scanTemplateId || null,
        consultationTypeId: data.consultationTypeId || null,
        createdById: data.createdById || null,
        gdrgTariffId: data.gdrgTariffId || null,
      };

    case 'ward':
      return {
        ...baseDefaults,
        wardName: data.wardName,
        wardType: data.wardType || 'general',
        totalBeds: data.totalBeds ?? 10,
        occupiedBeds: data.occupiedBeds ?? 0,
        isNHISCovered: data.isNHISCovered ?? true,
        nhisRequiresAuth: data.nhisRequiresAuth ?? false,
        isPrivateInsExempted: data.isPrivateInsExempted ?? false,
        isPending: false,
        requiresAuthorization: data.requiresAuthorization ?? false,
        vatRate: data.vatRate ?? 0,
        isTaxable: data.isTaxable ?? false,
        tariffCode: data.tariffCode || `WARD-${data.wardName?.replace(/\s+/g, '_').toUpperCase()}`,
        dailyCashRate: data.dailyCashRate ?? data.cashPrice ?? data.cashDailyRate ?? 0,
        dailyNHISRate: data.dailyNHISRate ?? data.nhisPrice ?? data.nhisDailyRate ?? 0,
        dailyInsuranceRate:
          data.dailyInsuranceRate ?? data.insurancePrice ?? data.insuranceDailyRate ?? 0,
        dailyCorporateRate:
          data.dailyCorporateRate ?? data.corporatePrice ?? data.corporateDailyRate ?? 0,
      };

    default:
      return { ...data, ...baseDefaults };
  }
};

// ─────────────────────────────────────────────────────────────
// Pricing — single active row per service; overwrite when re-seeded.
// Private and corporate rates use the facility cash selling price; NHIS stays separate.
// ─────────────────────────────────────────────────────────────
const createServicePricing = async (
  serviceCatalogId: string,
  pricing: {
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    corporatePrice?: number;
  },
) => {
  try {
    const existingActive = await prisma.servicePricing.findFirst({
      where: { serviceCatalogId, isActive: true, expiryDate: null },
      orderBy: { effectiveDate: 'desc' },
    });

    const payload = {
      cashPrice: pricing.cashPrice ?? 0,
      nhisPrice: pricing.nhisPrice ?? 0,
      // Store the actual facility cash amount for private and corporate payers.
      insurancePrice: pricing.cashPrice ?? 0,
      corporatePrice: pricing.cashPrice ?? 0,
      vatRate: 0,
      isTaxable: false,
      isActive: true,
    };

    if (existingActive) {
      await prisma.servicePricing.update({
        where: { id: existingActive.id },
        data: { ...payload, updatedAt: new Date() },
      });
    } else {
      await prisma.servicePricing.create({
        data: { serviceCatalogId, ...payload, effectiveDate: new Date() },
      });
    }
  } catch (error: any) {
    throw new Error(`Service pricing for catalogue ${serviceCatalogId} failed: ${error.message}`);
  }
};

// ─────────────────────────────────────────────────────────────
// JobGrade + SalaryStep catalogue
// ─────────────────────────────────────────────────────────────
type JobGradeSeed = {
  name: string;
  code: string;
  level: number;
  baseSalary: number;
  description: string;
  steps: { stepNumber: number; amount: number; yearsRequired: number }[];
};

const JOB_GRADE_CATALOGUE: JobGradeSeed[] = [
  {
    name: 'Support Staff',
    code: 'SUP-04',
    level: 1,
    baseSalary: 1200,
    description: 'Orderlies, cleaners, porters, security',
    steps: [
      { stepNumber: 1, amount: 1200, yearsRequired: 0 },
      { stepNumber: 2, amount: 1300, yearsRequired: 2 },
      { stepNumber: 3, amount: 1400, yearsRequired: 4 },
      { stepNumber: 4, amount: 1500, yearsRequired: 6 },
      { stepNumber: 5, amount: 1600, yearsRequired: 8 },
    ],
  },
  {
    name: 'Health Assistant',
    code: 'HO-06',
    level: 2,
    baseSalary: 2000,
    description: 'Health assistants and auxiliary nursing staff',
    steps: [
      { stepNumber: 1, amount: 2000, yearsRequired: 0 },
      { stepNumber: 2, amount: 2200, yearsRequired: 2 },
      { stepNumber: 3, amount: 2400, yearsRequired: 4 },
      { stepNumber: 4, amount: 2600, yearsRequired: 6 },
      { stepNumber: 5, amount: 2800, yearsRequired: 8 },
    ],
  },
  {
    name: 'Nursing Officer',
    code: 'NO-07',
    level: 3,
    baseSalary: 3200,
    description: 'Registered nurses and midwives',
    steps: [
      { stepNumber: 1, amount: 3200, yearsRequired: 0 },
      { stepNumber: 2, amount: 3500, yearsRequired: 2 },
      { stepNumber: 3, amount: 3800, yearsRequired: 4 },
      { stepNumber: 4, amount: 4100, yearsRequired: 6 },
      { stepNumber: 5, amount: 4400, yearsRequired: 8 },
    ],
  },
  {
    name: 'Medical Officer',
    code: 'MO-08',
    level: 4,
    baseSalary: 5000,
    description: 'Medical doctors and specialists',
    steps: [
      { stepNumber: 1, amount: 5000, yearsRequired: 0 },
      { stepNumber: 2, amount: 5500, yearsRequired: 2 },
      { stepNumber: 3, amount: 6000, yearsRequired: 4 },
      { stepNumber: 4, amount: 6500, yearsRequired: 6 },
      { stepNumber: 5, amount: 7000, yearsRequired: 8 },
    ],
  },
  {
    name: 'Administrative Officer',
    code: 'AD-09',
    level: 5,
    baseSalary: 4000,
    description: 'Admin, HR, accounts, records officers',
    steps: [
      { stepNumber: 1, amount: 4000, yearsRequired: 0 },
      { stepNumber: 2, amount: 4400, yearsRequired: 2 },
      { stepNumber: 3, amount: 4800, yearsRequired: 4 },
      { stepNumber: 4, amount: 5200, yearsRequired: 6 },
      { stepNumber: 5, amount: 5600, yearsRequired: 8 },
    ],
  },
];

const seedJobGradesAndSteps = async () => {
  console.log('💰 Seeding job grades and salary steps...');
  for (const grade of JOB_GRADE_CATALOGUE) {
    const createdGrade = await prisma.jobGrade.upsert({
      where: { code: grade.code },
      create: {
        name: grade.name,
        code: grade.code,
        level: grade.level,
        baseSalary: grade.baseSalary,
        description: grade.description,
        isActive: true,
      },
      update: {
        name: grade.name,
        level: grade.level,
        baseSalary: grade.baseSalary,
        description: grade.description,
        isActive: true,
      },
    });

    for (const step of grade.steps) {
      await prisma.salaryStep.upsert({
        where: { gradeId_stepNumber: { gradeId: createdGrade.id, stepNumber: step.stepNumber } },
        create: {
          gradeId: createdGrade.id,
          stepNumber: step.stepNumber,
          amount: step.amount,
          yearsRequired: step.yearsRequired,
        },
        update: {
          amount: step.amount,
          yearsRequired: step.yearsRequired,
        },
      });
    }
  }
  console.log(`✅ ${JOB_GRADE_CATALOGUE.length} job grades with salary steps configured`);
};

// ─────────────────────────────────────────────────────────────
// Core data check
// ─────────────────────────────────────────────────────────────
const hasCoreData = async (): Promise<boolean> => {
  console.log('🔍 Checking if core data exists...');
  try {
    const counts = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.diagnosis.count().catch(() => 0),
      prisma.serviceCatalog.count().catch(() => 0),
      prisma.stockItem.count().catch(() => 0),
      prisma.department.count().catch(() => 0),
      prisma.insuranceProvider.count().catch(() => 0),
      prisma.servicePricing.count().catch(() => 0),
      prisma.procedureTemplate.count().catch(() => 0),
      prisma.labTestTemplate.count().catch(() => 0),
      prisma.scanTemplate.count().catch(() => 0),
      prisma.jobGrade.count().catch(() => 0),
    ]);

    const [
      userCount, diagnosisCount, serviceCatalogCount, stockItemCount,
      departmentCount, insuranceProviderCount, servicePricingCount,
      procedureTemplateCount, labTestTemplateCount, scanTemplateCount, jobGradeCount,
    ] = counts;

    const hasData =
      userCount > 0 &&
      diagnosisCount > 0 &&
      serviceCatalogCount > 0 &&
      stockItemCount > 0 &&
      departmentCount > 0 &&
      insuranceProviderCount > 0 &&
      procedureTemplateCount > 0 &&
      labTestTemplateCount > 0 &&
      scanTemplateCount > 0 &&
      jobGradeCount > 0;

    console.log('📊 Core data check:', {
      users: userCount,
      diagnoses: diagnosisCount,
      serviceCatalog: serviceCatalogCount,
      servicePricing: servicePricingCount,
      stockItems: stockItemCount,
      departments: departmentCount,
      insuranceProviders: insuranceProviderCount,
      procedureTemplates: procedureTemplateCount,
      labTestTemplates: labTestTemplateCount,
      scanTemplates: scanTemplateCount,
      jobGrades: jobGradeCount,
      hasCoreData: hasData,
    });

    return hasData;
  } catch (error) {
    console.error('❌ Error checking core data:', error);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────
// Safe reference-data reconciliation for an already populated database.
// This deliberately does not create demo users, patients, visits, or overwrite
// existing diagnosis catalogue entries edited by the facility.
// ─────────────────────────────────────────────────────────────
export const seedDiagnosisReferenceData = async () => {
  const diagnosesData = readJSON('diagnoses.json');
  if (!Array.isArray(diagnosesData)) {
    throw new Error('Diagnosis reference data is missing or invalid (expected diagnoses.json array)');
  }

  let createdOrVerified = 0;
  const failures: Array<{ icdCode: string; error: string }> = [];
  for (const diagnosis of diagnosesData) {
    if (!diagnosis?.icdCode || !diagnosis?.name) continue;
    try {
      const data = addSchemaDefaults(diagnosis, 'diagnosis');
      // Insert missing ICD-10 entries without replacing local edits to existing rows.
      await prisma.diagnosis.upsert({
        where: { icdCode: diagnosis.icdCode },
        create: data,
        update: {},
      });
      createdOrVerified++;
    } catch (error: any) {
      failures.push({ icdCode: String(diagnosis.icdCode), error: error?.message || 'Unknown error' });
    }
  }

  if (failures.length) {
    console.error(`Diagnosis reference reconciliation: ${failures.length} entries failed`, failures.slice(0, 10));
    throw new Error(`Diagnosis reference reconciliation failed for ${failures.length} of ${diagnosesData.length} entries; inspect seed logs for ICD-10 details`);
  }

  console.log(`Diagnosis reference catalogue reconciled: ${createdOrVerified} ICD-10 entries verified/inserted`);
  return { success: true, count: createdOrVerified };
};

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
// Seed profiles
//   'development' (default, used by `npm run seed`): the full reference set PLUS the sample content the
//                 demo dataset leans on - well-known logins, a fake hospital record, sample corporate
//                 accounts, and opening stock of 100 units per item.
//   'production'  (used by the installed desktop app's first-run bootstrap): reference data only. No
//                 default passwords, no fake hospital details, no sample corporate accounts or
//                 employees, no invented wards/beds, and NO opening stock - the catalogue is loaded but
//                 every item starts at zero until the facility receives real stock.
export type SeedProfile = 'development' | 'production';
export interface SeedCoreOptions {
  profile?: SeedProfile;
  /** Required for the production profile: the password the first administrator accounts are created with. */
  adminPassword?: string;
}

export const seedCoreData = async (force: boolean = false, options: SeedCoreOptions = {}) => {
  // The packaged desktop app (ELECTRON=true) can only ever run the production profile, whatever a caller asks for.
  const profile: SeedProfile = process.env.ELECTRON === 'true' || process.env.NODE_ENV === 'production' ? 'production' : (options.profile ?? 'development');
  const isProdProfile = profile === 'production';
  console.log(`🏥 Starting core data seeding (profile: ${profile})...`);

  try {
    const seedFailures: string[] = [];
    if (isProdProfile) {
      // Only needed while an administrator account still has to be created; a re-run that finds both
      // accounts never touches their passwords.
      const existingAdmins = await prisma.user.count({ where: { username: { in: ['superadmin', 'admin'] } } });
      if (existingAdmins < 2 && (!options.adminPassword || options.adminPassword.length < 8)) {
        throw new Error('The production seed profile needs adminPassword (at least 8 characters); it never creates default passwords');
      }
    }

    if (process.env.NODE_ENV === 'production' && !force) {
      console.log('🚨 PRODUCTION SAFETY: Core data seeding disabled in production');
      return { success: false, message: 'Disabled in production', productionSafety: true };
    }

    const coreDataExists = await hasCoreData();
    console.log(coreDataExists ? '🔄 Existing core data detected; reconciling every reference catalogue idempotently.' : '🔧 Proceeding with initial core data seeding...');

    // ── STEP 1: Administrator accounts ────────────────────────
    // super_admin outranks admin: it is the only role holding `users.manage`, so it is the
    // only account that can manage users and roles. The production profile creates both accounts
    // directly with the password chosen during setup, so a default password never exists in an
    // installed database - not even briefly, and not if a later seed step fails. `update:
    // { isActive: true }` keeps re-seeding from overwriting a password an operator already changed.
    const superAdminUser = await prisma.user.upsert({
      where: { username: 'superadmin' },
      create: {
        username: 'superadmin',
        password: hashPassword(isProdProfile ? (options.adminPassword ?? '') : 'superadmin123'),
        fullName: 'Super Administrator',
        role: UserRole.super_admin,
        seniority: Seniority.PRINCIPAL,
        email: 'superadmin@hospital.com',
        phone: '+233244111110',
        licenseNumber: 'SUPERADMIN-001',
        isActive: true,
      },
      update: { isActive: true },
    });
    console.log('✅ Super admin user created/verified');

    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      create: {
        username: 'admin',
        password: hashPassword(isProdProfile ? (options.adminPassword ?? '') : 'admin123'),
        fullName: 'System Administrator',
        role: UserRole.admin,
        seniority: Seniority.PRINCIPAL,
        email: 'admin@hospital.com',
        phone: '+233244111111',
        licenseNumber: 'ADMIN-001',
        isActive: true,
      },
      update: { isActive: true },
    });
    console.log('✅ Admin user created/verified');
    const adminId = adminUser.id;

    // ── STEP 1b: RBAC catalogue ───────────────────────────────
    // Seed the complete facility role/permission catalogue and synchronize every
    // existing account's RBAC relation from its canonical User.role value. Platform
    // controls remain separately reserved for super_admin.
    await upsertRbac(prisma, {
      [superAdminUser.username]: 'super_admin',
      [adminUser.username]: 'admin',
    });
    console.log('✅ RBAC roles and permissions configured');

    // ── STEP 2: Hospital ──────────────────────────────────────
    if (isProdProfile) {
      // A neutral, clearly-unconfigured record (the same 'PENDING' code SettingsService uses) that the
      // administrator completes in Settings. No invented address, bank account or NHIS accreditation.
      if (!(await prisma.hospital.findFirst())) {
        await prisma.hospital.create({
          data: {
            name: 'Hospital name not set',
            address: '',
            phone: '',
            email: '',
            nhisFacilityCode: 'PENDING',
            isActive: true,
          },
        });
      }
      console.log('✅ Hospital placeholder created (complete it in Settings)');
    } else {
      await prisma.hospital.upsert({
        where: { nhisFacilityCode: 'GH001' },
        create: {
          name: 'General Hospital',
          address: '123 Medical Center Drive, Accra',
          phone: '+233-24-123-4567',
          email: 'info@generalhospital.gov.gh',
          nhisFacilityCode: 'GH001',
          nhisFacilityType: 'Secondary',
          nhisAccreditationNumber: 'NHIS/ACC/2024/001',
          nhisAccreditationDate: new Date('2024-01-15'),
          nhisAccreditationExpiry: new Date('2025-01-14'),
          bankName: 'Ghana Commercial Bank',
          bankAccountNumber: '1234567890',
          bankBranch: 'Accra Central',
          nhisContactPerson: 'Dr. Kwame Mensah',
          nhisContactPhone: '+233-24-765-4321',
          nhisContactEmail: 'nhis@generalhospital.gov.gh',
          isActive: true,
        },
        update: {},
      });
      console.log('✅ Hospital configured');
    }

    // ── STEP 3: Departments ───────────────────────────────────
    const departmentsData = readJSON('departments.json');
    const defaultDepartments = [
      { name: 'Medical', description: 'Internal Medicine Department', color: '#3B82F6', icon: 'stethoscope' },
      { name: 'Surgery', description: 'Surgical Department', color: '#EF4444', icon: 'scissors' },
      { name: 'Pediatrics', description: "Children's Health", color: '#10B981', icon: 'baby' },
      { name: 'Obstetrics & Gynecology', description: "Women's Health", color: '#EC4899', icon: 'heart' },
      { name: 'Radiology', description: 'Medical Imaging', color: '#8B5CF6', icon: 'scan' },
      { name: 'Laboratory', description: 'Diagnostic Laboratory', color: '#F59E0B', icon: 'flask' },
      { name: 'Pharmacy', description: 'Medication Dispensing', color: '#06B6D4', icon: 'pill' },
      { name: 'Emergency', description: 'Emergency Medicine', color: '#EF4444', icon: 'alert-triangle' },
      { name: 'Main Store', description: 'Central medical store / warehouse', color: '#64748B', icon: 'warehouse', isStore: true },
    ];
    const departments = Array.isArray(departmentsData) ? departmentsData : defaultDepartments;
    for (const dept of departments) {
      await prisma.department.upsert({
        where: { name: dept.name },
        create: {
          name: dept.name,
          description: dept.description || '',
          color: dept.color || '#3B82F6',
          icon: dept.icon || 'default',
          isActive: true,
          isStore: dept.isStore ?? false,
        },
        update: { isStore: dept.isStore ?? false },
      });
    }
    console.log(`✅ ${departments.length} departments configured`);

    // System administrators are facility-wide members, not tied to one primary department.
    // Reconcile on every intentional seed so departments added later are included too.
    const activeDepartmentIds = (await prisma.department.findMany({ where: { isActive: true }, select: { id: true } })).map((department) => ({ id: department.id }));
    await Promise.all([
      prisma.user.update({ where: { id: superAdminUser.id }, data: { departments: { set: activeDepartmentIds } } }),
      prisma.user.update({ where: { id: adminUser.id }, data: { departments: { set: activeDepartmentIds } } }),
    ]);
    console.log(`✅ System administrators assigned to all ${activeDepartmentIds.length} active departments`);

    // ── STEP 4: Insurance providers ───────────────────────────
    const providersData = readJSON('insuranceProviders.json');
    const defaultProviders = [
      { name: 'National Health Insurance Scheme', type: InsuranceType.nhis, coveragePercentage: 100, contactInfo: { phone: '+233302111111', email: 'info@nhis.gov.gh' } },
      { name: 'Acacia Health Insurance', type: InsuranceType.private, coveragePercentage: 80, contactInfo: { phone: '+233302222222', email: 'info@acacia.com' } },
      { name: 'Metropolitan Insurance', type: InsuranceType.private, coveragePercentage: 75, contactInfo: { phone: '+233302333333', email: 'info@metro.com' } },
    ];
    const providers = Array.isArray(providersData) ? providersData : defaultProviders;
    for (const p of providers) {
      await prisma.insuranceProvider.upsert({
        where: { name: p.name },
        create: {
          name: p.name,
          type: p.type || InsuranceType.private,
          coveragePercentage: p.type === InsuranceType.nhis ? 100 : (p.coveragePercentage ?? 100),
          contactInfo: p.contactInfo || { phone: '+233000000000', email: 'info@provider.com' },
          isActive: true,
          claimSubmissionMethod: 'portal',
        },
        update: p.type === InsuranceType.nhis ? { coveragePercentage: 100 } : {},
      });
    }
    console.log(`✅ ${providers.length} insurance providers configured`);

    // ── STEP 4.5: Corporate accounts ──────────────────────────
    // Sample companies and their employees are demo content: a real facility creates its own corporate
    // accounts. Never loaded by the production profile.
    const corporateAccountsData = isProdProfile ? null : readJSON('corporateAccounts.json');
    if (isProdProfile) {
      console.log('⏭️ Production profile: sample corporate accounts skipped');
    } else if (corporateAccountsData?.corporateAccounts) {
      console.log('🏢 Seeding corporate accounts and employees...');
      for (const corp of corporateAccountsData.corporateAccounts) {
        const insuranceProvider = await prisma.insuranceProvider.upsert({
          where: { name: corp.companyName },
          create: {
            name: corp.companyName,
            type: InsuranceType.corporate,
            coveragePercentage: corp.insuranceProvider.coveragePercentage,
            contactInfo: corp.insuranceProvider.contactInfo,
            isActive: true,
            claimSubmissionMethod: 'portal',
          },
          update: {},
        });

        const corporateAccount = await prisma.corporateAccount.upsert({
          where: { registrationNumber: corp.registrationNumber },
          create: {
            companyName: corp.companyName,
            registrationNumber: corp.registrationNumber,
            taxId: corp.taxId,
            contactPerson: corp.contactPerson,
            email: corp.email,
            phone: corp.phone,
            address: corp.address,
            creditLimit: corp.creditLimit,
            currentBalance: 0,
            paymentTerms: corp.paymentTerms,
            discountPercentage: corp.discountPercentage,
            isActive: true,
            insuranceProviderId: insuranceProvider.id,
          },
          update: {},
        });

        for (const emp of corp.employees) {
          await prisma.corporateEmployee.upsert({
            where: { accountId_employeeId: { accountId: corporateAccount.id, employeeId: emp.employeeId } },
            create: {
              employeeId: emp.employeeId,
              firstName: emp.firstName,
              lastName: emp.lastName,
              otherNames: emp.otherNames,
              dateOfBirth: new Date(emp.dateOfBirth),
              gender: normalizeGender(emp.gender),
              phone: emp.phone,
              email: emp.email,
              department: emp.department,
              position: emp.position,
              enrollmentDate: new Date(),
              isActive: true,
              accountId: corporateAccount.id,
            },
            update: {},
          });
        }
        console.log(`  ✅ Corporate account: ${corp.companyName} with ${corp.employees.length} employees`);
      }
      console.log(`✅ Corporate accounts seeded successfully`);
    } else {
      console.warn('⚠️ No corporateAccounts.json found, skipping corporate accounts');
    }

    // ── STEP 5: Diagnoses ─────────────────────────────────────
    const diagnosesData = readJSON('diagnoses.json');
    if (diagnosesData && Array.isArray(diagnosesData)) {
      let successful = 0;
      for (const d of diagnosesData) {
        if (!d.icdCode || !d.name) { seedFailures.push(`Diagnosis row missing icdCode/name: ${JSON.stringify(d)}`); continue; }
        try {
          const diagnosisData = addSchemaDefaults(d, 'diagnosis');
          await prisma.diagnosis.upsert({
            where: { icdCode: d.icdCode },
            create: diagnosisData,
            update: diagnosisData,
          });
          successful++;
        } catch (error: any) {
          seedFailures.push(`Diagnosis ${d.icdCode}: ${error.message}`);
          console.error(`❌ Diagnosis ${d.icdCode}:`, error.message);
        }
      }
      console.log(`✅ Diagnoses: ${successful}/${diagnosesData.length}`);
    }

    // ── STEP 6: Lab test templates ────────────────────────────
    const labTestsData = readJSON('labTests.json');
    const labTemplateMap = new Map();
    if (Array.isArray(labTestsData) && labTestsData.length > 0) {
      for (const test of labTestsData) {
        if (!test.investigationCode || !test.name) { seedFailures.push(`Lab template row missing investigationCode/name: ${JSON.stringify(test)}`); continue; }
        try {
          const labData = addSchemaDefaults(test, 'labTestTemplate');
          const template = await prisma.labTestTemplate.upsert({
            where: { investigationCode: test.investigationCode },
            create: labData,
            update: labData,
          });
          labTemplateMap.set(test.investigationCode, template);
        } catch (error: any) {
          seedFailures.push(`Lab template ${test.investigationCode || test.name}: ${error.message}`);
          console.error(`❌ Lab template ${test.investigationCode}:`, error.message);
        }
      }
      if (labTemplateMap.size !== labTestsData.length) seedFailures.push(`Lab templates seeded ${labTemplateMap.size}/${labTestsData.length}`);
      console.log(`✅ ${labTemplateMap.size}/${labTestsData.length} lab test templates configured`);
    } else seedFailures.push('labTests.json is missing or is not an array');

    // ── STEP 7: Scan templates ────────────────────────────────
    const scansData = readJSON('scans.json');
    const scanTemplateMap = new Map();
    if (Array.isArray(scansData) && scansData.length > 0) {
      for (const scan of scansData) {
        if (!scan.scanCode || !scan.name || !/^INVE[0-9]/i.test(String(scan.investigationCode || ''))) { seedFailures.push(`Scan template row missing scanCode/name/valid NHIS investigationCode: ${JSON.stringify({ name: scan.name, scanCode: scan.scanCode, investigationCode: scan.investigationCode })}`); continue; }
        try {
          const scanData = addSchemaDefaults(scan, 'scanTemplate');
          const template = await prisma.scanTemplate.upsert({
            where: { scanCode: scan.scanCode },
            create: scanData,
            update: scanData,
          });
          scanTemplateMap.set(scan.scanCode, template);
        } catch (error: any) {
          seedFailures.push(`Scan template ${scan.scanCode || scan.name}: ${error.message}`);
          console.error(`❌ Scan template ${scan.scanCode}:`, error.message);
        }
      }
      if (scanTemplateMap.size !== scansData.length) seedFailures.push(`Scan templates seeded ${scanTemplateMap.size}/${scansData.length}`);
      console.log(`✅ ${scanTemplateMap.size}/${scansData.length} scan templates configured`);
    } else seedFailures.push('scans.json is missing or is not an array');

    // ── STEP 8: Procedure templates ───────────────────────────
    const proceduresData = readJSON('procedures.json');
    const procedureTemplateMap = new Map();
    if (Array.isArray(proceduresData) && proceduresData.length > 0) {
      for (const proc of proceduresData) {
        if (!proc.procedureCode || !proc.name) { seedFailures.push(`Procedure template row missing procedureCode/name: ${JSON.stringify(proc)}`); continue; }
        try {
          const procData = addSchemaDefaults(proc, 'procedureTemplate');
          const template = await prisma.procedureTemplate.upsert({
            where: { procedureCode: proc.procedureCode },
            create: procData,
            update: procData,
          });
          procedureTemplateMap.set(proc.procedureCode, template);
        } catch (error: any) {
          seedFailures.push(`Procedure template ${proc.procedureCode || proc.name}: ${error.message}`);
          console.error(`❌ Procedure template ${proc.procedureCode}:`, error.message);
        }
      }
      if (procedureTemplateMap.size !== proceduresData.length) seedFailures.push(`Procedure templates seeded ${procedureTemplateMap.size}/${proceduresData.length}`);
      console.log(`✅ ${procedureTemplateMap.size}/${proceduresData.length} procedure templates configured`);
    } else seedFailures.push('procedures.json is missing or is not an array');

    // ── STEP 9: GDRG tariffs ──────────────────────────────────
    const gdrgData = readJSON('gdrgTariffs.json');
    if (Array.isArray(gdrgData?.gdrgTariffs) && gdrgData.gdrgTariffs.length > 0) {
      let successful = 0;
      let failed = 0;
      console.log(`📋 Found ${gdrgData.gdrgTariffs.length} GDRG tariffs to seed`);

      for (const tariff of gdrgData.gdrgTariffs) {
        try {
          if (!tariff.gdrgCode) {
            seedFailures.push(`GDRG tariff row missing gdrgCode: ${JSON.stringify(tariff)}`);
            console.warn(`⚠️ Invalid GDRG tariff: missing gdrgCode`);
            failed++;
            continue;
          }
          const mdc = normalizeMdc(tariff.mdc);
          const encounterCategory = normalizeEncounterCategory(tariff.encounterCategory);
          const attendanceTypes = normalizeAttendanceTypes(tariff.attendanceTypes);

          const payload = {
            mdc,
            description: tariff.description || 'No description',
            // The dataset stores the price as tariffGhC; the app column is nhiaTariff.
            nhiaTariff: parseFloat(tariff.nhiaTariff ?? tariff.tariffGhC) || 0,
            ageSplit: tariff.ageSplit || 'A',
            minAgeYears: tariff.minAgeYears == null ? null : Number.parseInt(String(tariff.minAgeYears), 10),
            // Zero is a valid upper bound for neonatal G-DRGs; do not treat it as missing.
            maxAgeYears: tariff.maxAgeYears == null ? null : Number.parseInt(String(tariff.maxAgeYears), 10),
            applicableLevels: tariff.applicableLevels || [1, 2, 3],
            nhisServiceCode: tariff.nhisServiceCode || null,
            isZoomCode: tariff.isZoomCode || false,
            allowsAddOn: tariff.allowsAddOn || false,
            encounterCategory,
            attendanceTypes,
            isAntenatal: tariff.isAntenatal || false,
            isSurgical: tariff.isSurgical || false,
            isDelivery: tariff.isDelivery || false,
            // This is the tariff schedule's validity, not the patient's NHIS membership expiry.
            // Defaulting to the import time made every historical service date unpriced.
            effectiveFrom: tariff.effectiveFrom
              ? new Date(tariff.effectiveFrom)
              : gdrgData.effectiveFrom
                ? new Date(gdrgData.effectiveFrom)
                : new Date(),
            effectiveTo: tariff.effectiveTo ? new Date(tariff.effectiveTo) : null,
            isActive: tariff.isActive ?? true,
            notes: tariff.notes || null,
          };

          await prisma.gDRGTariff.upsert({
            where: { gdrgCode: tariff.gdrgCode },
            create: { gdrgCode: tariff.gdrgCode, ...payload },
            update: { ...payload, updatedAt: new Date() },
          });
          successful++;
          if (successful % 50 === 0) {
            console.log(`📊 GDRG progress: ${successful}/${gdrgData.gdrgTariffs.length}`);
          }
        } catch (error: any) {
          failed++;
          seedFailures.push(`GDRG tariff ${tariff.gdrgCode || '(missing code)'}: ${error.message}`);
          console.error(`❌ GDRG Tariff ${tariff.gdrgCode}:`, error.message);
        }
      }
      if (failed || successful !== gdrgData.gdrgTariffs.length) seedFailures.push(`G-DRG tariffs seeded ${successful}/${gdrgData.gdrgTariffs.length}; ${failed} failed`);
      console.log(`✅ GDRG Tariffs: ${successful}/${gdrgData.gdrgTariffs.length} successful, ${failed} failed`);
    } else {
      seedFailures.push('gdrgTariffs.json is missing, empty, or has no gdrgTariffs array');
      console.log(`⚠️ No GDRG tariffs found. File: gdrgTariffs.json`);
    }

    // ── STEP 10: Consultation types ───────────────────────────
    const consultationTypes = [
      { name: 'General Outpatient Consultation', code: 'CONS-GEN', cashPrice: 100, nhisPrice: 0, insurancePrice: 120, isNHISCovered: false },
      { name: 'Specialist Consultation', code: 'CONS-SPEC', cashPrice: 200, nhisPrice: 50, insurancePrice: 150, isNHISCovered: true },
      { name: 'Emergency Consultation', code: 'CONS-EMERG', cashPrice: 150, nhisPrice: 30, insurancePrice: 180, isNHISCovered: true },
    ];
    const consultationTypeMap = new Map();
    for (const ct of consultationTypes) {
      const consultationType = await prisma.consultationType.upsert({
        where: { code: ct.code },
        create: {
          name: ct.name,
          code: ct.code,
          cashPrice: ct.cashPrice,
          nhisPrice: ct.nhisPrice,
          insurancePrice: ct.insurancePrice,
          isNHISCovered: ct.isNHISCovered,
          isPrivateInsExempted: false,
          isActive: true,
        },
        update: {},
      });
      consultationTypeMap.set(ct.code, consultationType);
    }
    console.log(`✅ ${consultationTypes.length} consultation types configured`);

    // ── STEP 11: Pricing config (JSON) ────────────────────────
    const pricingConfig = readJSON('servicePricing.json') || {
      labTests: {}, scans: {}, procedures: {}, consultations: {}, medications: {},
    };

    // ── STEP 12: Stock items ──────────────────────────────────
    const stockFiles = ['medications1.json', 'medications2.json', 'nhismedicines.json', 'consumables.json'];
    let totalStockProcessed = 0;
    const stockItemMap = new Map();
    // Identity matching ignores harmless punctuation/spacing differences in imported
    // names and strengths (e.g. "500mg" vs "500 mg") so an NHIS reference row can
    // re-key the existing local stock row instead of creating a second medicine.
    const normalizeIdentityPart = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const stockIdentityKey = (item: any, isMedication = item.isMedication !== false) => [
      normalizeIdentityPart(item.name),
      normalizeIdentityPart(item.strength || 'N/A'),
      normalizeIdentityPart(item.unitOfMeasure || 'units'),
      isMedication ? 'medication' : 'consumable',
    ].join('|');
    // NHIS may contain separately priced entries with the same generic identity.
    // Only map a local row automatically when there is exactly one official code.
    const nhisCodesByIdentity = new Map<string, Set<string>>();
    const nhisSourceItems = readJSON('nhismedicines.json');
    if (Array.isArray(nhisSourceItems)) {
      for (const reference of nhisSourceItems) {
        if (!reference?.name || !reference?.drugCode) continue;
        const identity = stockIdentityKey(reference, true);
        const codes = nhisCodesByIdentity.get(identity) ?? new Set<string>();
        codes.add(String(reference.drugCode).trim().toUpperCase());
        nhisCodesByIdentity.set(identity, codes);
      }
    }
    const stockIdentityMap = new Map<string, any[]>();
    // Patient prices per drugCode, taken from each item's own selling/insurance prices in the JSON files
    const stockPriceMap = new Map<string, { cashPrice: number; nhisPrice: number; insurancePrice: number; corporatePrice: number }>();
    // Keep NHIS reference rows separate from inventory pricing so payer rules can be reviewed independently.
    const nhisReferenceByDrugCode = new Map<string, any>();
    const usedDrugCodes = new Set<string>();
    const existingStockItems = await prisma.stockItem.findMany({
      select: { id: true, drugCode: true, name: true, strength: true, unitOfMeasure: true, isMedication: true },
    });
    for (const existing of existingStockItems) {
      if (existing.drugCode) usedDrugCodes.add(String(existing.drugCode).trim().toUpperCase());
      const identity = stockIdentityKey(existing, existing.isMedication);
      stockIdentityMap.set(identity, [...(stockIdentityMap.get(identity) ?? []), existing]);
    }
    for (const sourceFile of stockFiles) {
      const sourceItems = readJSON(sourceFile);
      if (Array.isArray(sourceItems)) for (const sourceItem of sourceItems) {
        if (sourceItem?.drugCode) usedDrugCodes.add(String(sourceItem.drugCode).trim().toUpperCase());
      }
    }

    for (const file of stockFiles) {
      const items = readJSON(file);
      if (!Array.isArray(items) || items.length === 0) {
        seedFailures.push(`${file} is missing, invalid, or empty`);
        console.error(`❌ ${file} is missing, invalid, or empty`);
        continue;
      }
      console.log(`📦 Processing ${file} with ${items.length} source rows`);

      for (const item of items) {
        try {
          const isMedication = item.isMedication ?? !file.includes('consumables');
          if (!item.name || (file === 'nhismedicines.json' && !item.drugCode)) throw new Error(file === 'nhismedicines.json' ? 'NHIS reference medicine is missing its official source drugCode; refusing to invent an NHIS code.' : 'Medicine/consumable is missing its name.');
          const identity = stockIdentityKey(item, isMedication);
          const candidates = stockIdentityMap.get(identity) ?? [];
          const nhisCodes = isMedication ? (nhisCodesByIdentity.get(identity) ?? new Set<string>()) : new Set<string>();
          const uniqueNhisCode = nhisCodes.size === 1 ? [...nhisCodes][0] : null;
          const isNhisSourceRow = file === 'nhismedicines.json';
          let existingByIdentity = isNhisSourceRow
            ? candidates.find((candidate) => candidate.drugCode === String(item.drugCode).trim().toUpperCase()) ?? null
            : candidates.find((candidate) => candidate.drugCode === String(item.drugCode || '').trim().toUpperCase()) ?? null;

          let canonicalDrugCode: string;
          if (isNhisSourceRow) {
            canonicalDrugCode = String(item.drugCode).trim().toUpperCase();
          } else if (uniqueNhisCode) {
            canonicalDrugCode = uniqueNhisCode;
            if (!existingByIdentity) {
              if (candidates.length === 1) existingByIdentity = candidates[0];
              else if (candidates.length > 1) throw new Error(`Multiple existing stock rows match this NHIS medicine identity; refusing an unsafe merge to ${canonicalDrugCode}.`);
            }
          } else {
            if (!existingByIdentity && candidates.length === 1) existingByIdentity = candidates[0];
            if (!existingByIdentity && candidates.length > 1) throw new Error('Multiple existing stock rows share this local medicine/consumable identity; refusing an unsafe merge.');
            canonicalDrugCode = String(existingByIdentity?.drugCode || item.drugCode || generateFacilityDrugCode(item, usedDrugCodes)).trim().toUpperCase();
          }
          usedDrugCodes.add(canonicalDrugCode);
          const canonicalItem = { ...item, drugCode: canonicalDrugCode };
          if (!item.drugCode) {
            console.warn(`⚠️ Generated facility-only catalogue code ${canonicalDrugCode} for ${item.name}; it is not an official NHIS code.`);
          }
          const stockData = addSchemaDefaults({
            ...canonicalItem,
            isMedication,
            isNHISCovered: file === 'nhismedicines.json' && Boolean(item.drugCode) && item.isNHISCovered !== false,
            tariffCode: canonicalDrugCode,
            // Production profile: the catalogue is loaded but nothing is in stock until real stock is received.
            currentStock: isProdProfile ? 0 : (item.currentStock ?? 100),
            reorderLevel: item.reorderLevel ?? 50,
            costPrice: item.costPrice ?? item.unitPrice ?? 0,
          }, 'stockItem');

          // Re-running the seed must never zero (or reset) quantities the facility has since received.
          const { currentStock: _seedStock, ...stockUpdate } = stockData as any;
          // The NHIS reference row owns the canonical code. If the same medicine
          // already exists in a local medication file, re-key that same stock row
          // instead of creating a duplicate product with a second code.
          if (!existingByIdentity) {
            const codeOwner = await prisma.stockItem.findUnique({
              where: { drugCode: canonicalDrugCode },
              select: { id: true, drugCode: true, name: true, strength: true, unitOfMeasure: true, isMedication: true },
            });
            if (codeOwner) {
              if (stockIdentityKey(codeOwner, codeOwner.isMedication) !== identity) {
                throw new Error(`Catalogue code ${canonicalDrugCode} is already assigned to a different product (${codeOwner.name}).`);
              }
              existingByIdentity = codeOwner;
            }
          }

          let stockItem: any;
          if (existingByIdentity && existingByIdentity.drugCode !== canonicalDrugCode) {
            const codeOwner = await prisma.stockItem.findUnique({ where: { drugCode: canonicalDrugCode }, select: { id: true } });
            if (codeOwner && codeOwner.id !== existingByIdentity.id) {
              throw new Error(`Canonical code ${canonicalDrugCode} is already assigned to a different stock item.`);
            }
            stockItemMap.delete(existingByIdentity.drugCode);
            stockItem = await prisma.stockItem.update({ where: { id: existingByIdentity.id }, data: stockUpdate });
          } else {
            stockItem = await prisma.stockItem.upsert({
              where: { drugCode: canonicalDrugCode },
              create: stockData,
              update: stockUpdate,
            });
          }
          stockItemMap.set(canonicalDrugCode, stockItem);
          const remainingCandidates = (stockIdentityMap.get(identity) ?? []).filter((candidate) => candidate.id !== stockItem.id);
          stockIdentityMap.set(identity, [...remainingCandidates, {
            id: stockItem.id,
            drugCode: stockItem.drugCode,
            name: stockItem.name,
            strength: stockItem.strength,
            unitOfMeasure: stockItem.unitOfMeasure,
            isMedication: stockItem.isMedication,
          }]);
          if (file === 'nhismedicines.json') {
            nhisReferenceByDrugCode.set(canonicalDrugCode, canonicalItem);
          }

          // Only the current NHIS Medicines List supplies NHIS medicine tariffs.
          // Private and corporate medication billing use the hospital cash selling price.
          const unit = Number(item.unitPrice ?? 0);
          const sell = Number(item.sellingPrice ?? 0);
          const isNhiaTariff = file === 'nhismedicines.json' && item.isNHISCovered !== false && unit > 0;
          const cashPrice = sell > 0 ? sell : Math.round(unit * 1.2 * 100) / 100;
          stockPriceMap.set(canonicalDrugCode, {
            cashPrice,
            insurancePrice: cashPrice,
            corporatePrice: cashPrice,
            nhisPrice: isNhiaTariff ? unit : 0,
          });
          totalStockProcessed++;

          if (totalStockProcessed % 50 === 0) {
            console.log(`📊 Processed ${totalStockProcessed} stock items so far...`);
          }
        } catch (error: any) {
          seedFailures.push(`Stock item ${item.drugCode || item.name || '(unnamed)'} in ${file}: ${error.message}`);
          console.error(`❌ Stock item ${item.drugCode || item.name}:`, error.message);
        }
      }
      console.log(`✅ Completed ${file} - ${items.length} source rows visited`);
    }
    const expectedStockRows = stockFiles.reduce((sum, file) => { const data = readJSON(file); return sum + (Array.isArray(data) ? data.length : 0); }, 0);
    if (totalStockProcessed !== expectedStockRows) seedFailures.push(`Stock catalogue seeded ${totalStockProcessed}/${expectedStockRows} rows`);
    console.log(`✅ TOTAL: ${totalStockProcessed}/${expectedStockRows} stock items configured`);
    // Seed the standard immunization catalogue and link each schedule vaccine to
    // the matching medicine/stock product. Dose timing is configured by the facility;
    // this seed deliberately does not invent clinical intervals.
    const standardVaccines = [
      { code: 'BCG', name: 'BCG Vaccine', stockCode: 'BCG-VACCINE', diseaseTargets: ['Tuberculosis'] },
      { code: 'OPV', name: 'Oral Polio Vaccine (OPV)', stockCode: 'OPV-VACCINE', diseaseTargets: ['Poliomyelitis'] },
      { code: 'IPV', name: 'Inactivated Polio Vaccine (IPV)', stockCode: 'IPV-VACCINE', diseaseTargets: ['Poliomyelitis'] },
      { code: 'PENTA', name: 'Pentavalent Vaccine', stockCode: 'PENTA-VACCINE', diseaseTargets: ['Diphtheria', 'Tetanus', 'Pertussis', 'Hepatitis B', 'Haemophilus influenzae type b'] },
      { code: 'PCV', name: 'Pneumococcal Conjugate Vaccine (PCV)', stockCode: 'PCV-VACCINE', diseaseTargets: ['Pneumococcal disease'] },
      { code: 'ROTA', name: 'Rotavirus Vaccine', stockCode: 'ROTA-VACCINE', diseaseTargets: ['Rotavirus gastroenteritis'] },
      { code: 'MR', name: 'Measles-Rubella Vaccine (MR)', stockCode: 'MR-VACCINE', diseaseTargets: ['Measles', 'Rubella'] },
      { code: 'YF', name: 'Yellow Fever Vaccine', stockCode: 'YF-VACCINE', diseaseTargets: ['Yellow fever'] },
    ];
    for (const item of standardVaccines) {
      const stockItem = stockItemMap.get(item.stockCode);
      if (!stockItem) {
        seedFailures.push(`Vaccine ${item.code}: required stock item ${item.stockCode} was not seeded`);
        console.error(`❌ Vaccine ${item.code}: required stock item ${item.stockCode} was not seeded`);
        continue;
      }
      await prisma.vaccine.upsert({
        where: { code: item.code },
        create: {
          code: item.code, name: item.name, diseaseTargets: item.diseaseTargets,
          stockItemId: stockItem.id,
        },
        update: { stockItemId: stockItem.id },
      });
    }
    const vaccineCount = await prisma.vaccine.count({ where: { code: { in: standardVaccines.map(v => v.code) } } });
    if (vaccineCount !== standardVaccines.length) seedFailures.push(`Vaccine catalogue linked ${vaccineCount}/${standardVaccines.length} entries`);
    console.log(`💉 ${vaccineCount}/${standardVaccines.length} standard immunization catalogue entries linked to vaccine stock products`);


    // ── STEP 12a: Payer-specific NHIS medicine rules ──────────
    // The 2025 NHIS JSON includes source-verified prescribing levels where available.
    // Authorization requirements remain unknown because the published list does not specify
    // medicine-by-medicine prior authorization. Null levels remain unknown, not permission.
    // Re-running the seed updates source/tariff metadata but preserves manually configured rules
    // whenever the reference does not explicitly supply a verified value.
    const nhisProvider = await prisma.insuranceProvider.findFirst({
      where: { type: InsuranceType.nhis, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true },
    });

    if (!nhisProvider) {
      seedFailures.push('No active NHIS insurance provider found; NHIS medicine payer rules could not be seeded.');
      console.warn('⚠️ No active NHIS insurance provider found; NHIS medicine payer rules could not be seeded.');
    } else {
      let nhisRulesSeeded = 0;
      const allowedPrescribingLevels = new Set(['A', 'M', 'B1', 'B2', 'C', 'D', 'SM']);
      for (const [drugCode, reference] of nhisReferenceByDrugCode) {
        const stockItem = stockItemMap.get(drugCode);
        if (!stockItem) { seedFailures.push(`NHIS medicine rule ${drugCode}: corresponding stock item was not seeded`); continue; }

        // A row can opt out with "isNHISCovered": false - used for formulations that are stocked here
        // but no longer appear on the current NHIS list, so they must bill as cash, never as a claim.
        const covered = reference.isNHISCovered !== false;
        const rawTariff = Number(reference.insurancePrice ?? reference.unitPrice ?? 0);
        const tariffPrice = covered && Number.isFinite(rawTariff) && rawTariff > 0 ? rawTariff : null;
        const suppliedAuth = typeof reference.nhisRequiresAuth === 'boolean'
          ? reference.nhisRequiresAuth
          : undefined;
        const rawEffectiveFrom = typeof reference.effectiveFrom === 'string' ? new Date(reference.effectiveFrom) : null;
        const effectiveFrom = rawEffectiveFrom && Number.isFinite(rawEffectiveFrom.getTime()) ? rawEffectiveFrom : undefined;
        const rawLevel = typeof reference.prescribingLevel === 'string' ? reference.prescribingLevel.trim().toUpperCase() : '';
        // A retired row still carries its old prescribing level in the JSON for review, but an uncovered
        // rule must not advertise one - it would read as current NHIS policy for a code NHIA no longer funds.
        const suppliedLevel = covered && allowedPrescribingLevels.has(rawLevel) ? rawLevel : undefined;
        if (covered && rawLevel && !suppliedLevel) {
          console.warn(`⚠️ Ignoring invalid NHIS prescribing level "${rawLevel}" for ${drugCode}; expected A, M, B1, B2, C, D, or SM.`);
        }

        await prisma.stockItemPayerRule.upsert({
          where: {
            stockItemId_insuranceProviderId: {
              stockItemId: stockItem.id,
              insuranceProviderId: nhisProvider.id,
            },
          },
          create: {
            stockItemId: stockItem.id,
            insuranceProviderId: nhisProvider.id,
            isCovered: covered,
            authorizationRequired: suppliedAuth ?? null,
            prescribingLevel: suppliedLevel ?? null,
            tariffPrice,
            sourceFile: 'backend/src/data/nhismedicines.json',
            sourceVersion: typeof reference.sourceVersion === 'string' ? reference.sourceVersion : null,
            effectiveFrom: effectiveFrom ?? null,
          },
          update: {
            isCovered: covered,
            ...(suppliedAuth !== undefined ? { authorizationRequired: suppliedAuth } : {}),
            // Coverage off also clears the level, so a retired code cannot keep an old one on re-seed.
            ...(covered
              ? (suppliedLevel !== undefined ? { prescribingLevel: suppliedLevel } : {})
              : { prescribingLevel: null }),
            // Coverage off means no tariff to quote: clear it instead of leaving an old claim price.
            ...(covered ? (tariffPrice !== null ? { tariffPrice } : {}) : { tariffPrice: null }),
            sourceFile: 'backend/src/data/nhismedicines.json',
            ...(typeof reference.sourceVersion === 'string' ? { sourceVersion: reference.sourceVersion } : {}),
            ...(effectiveFrom ? { effectiveFrom } : {}),
          },
        });
        nhisRulesSeeded++;
      }
      if (nhisRulesSeeded !== nhisReferenceByDrugCode.size) seedFailures.push(`NHIS medicine payer rules seeded ${nhisRulesSeeded}/${nhisReferenceByDrugCode.size}`);
      console.log(`✅ ${nhisRulesSeeded}/${nhisReferenceByDrugCode.size} NHIS medicine payer rules configured; unknown authorization/prescribing rules remain unset`);
    }

    // ── STEP 12b: Opening stock, placed by DEPARTMENT ─────────
    // Default: every item is split between the Pharmacy (dispensing stock) and the Main Store (warehouse).
    // Per-item override in the JSON data files:
    //   "department": "Laboratory"                              -> all stock goes to that department
    //   "stockLocations": [{ "department": "Pharmacy", "quantity": 30 }, { "department": "Main Store", "quantity": 70 }]
    // The department quantities always add up to the item's currentStock.
    const DEFAULT_STOCK_SPLIT = [
      // Put most default medicine stock at the dispensing point; retain a warehouse reserve.
      { department: 'Pharmacy', share: 0.8 },
      { department: 'Main Store', share: 0.2 },
    ];
    const deptByName = new Map<string, any>();
    const getDept = async (name: string) => {
      if (!deptByName.has(name)) {
        deptByName.set(name, await prisma.department.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } }));
      }
      return deptByName.get(name);
    };

    const missing = [];
    for (const d of DEFAULT_STOCK_SPLIT) if (!(await getDept(d.department))) missing.push(d.department);
    if (missing.length) {
      seedFailures.push(`Required stock-placement departments missing: ${missing.join(', ')}`);
      console.warn(`⚠️ Departments not found for default stock placement: ${missing.join(', ')}`);
    }

    const sourceByDrugCode = new Map<string, any>();
    for (const file of stockFiles) {
      const items = readJSON(file);
      if (Array.isArray(items)) for (const it of items) if (it?.drugCode) sourceByDrugCode.set(it.drugCode, it);
    }

    const openingExpiry = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);
    let placedCount = 0;
    const perDepartment: Record<string, number> = {};

    if (isProdProfile) console.log('⏭️ Production profile: no opening stock batches or balances are created');
    for (const [drugCode, stockItem] of stockItemMap) {
      // Production: never place opening stock, whatever quantity a re-run finds on the item.
      if (isProdProfile) break;
      const total = stockItem.currentStock ?? 0;
      if (total <= 0) continue;
      const source = sourceByDrugCode.get(drugCode) || {};

      // Work out [{ dept, quantity }] for this item
      let plan: Array<{ dept: any; quantity: number }> = [];
      if (Array.isArray(source.stockLocations) && source.stockLocations.length > 0) {
        for (const loc of source.stockLocations) {
          const dept = await getDept(loc.department);
          if (!dept) { seedFailures.push(`${drugCode}: stock location department "${loc.department}" does not exist`); continue; }
          plan.push({ dept, quantity: Math.max(0, Math.floor(loc.quantity ?? 0)) });
        }
      } else if (source.department) {
        const dept = await getDept(source.department);
        if (dept) plan.push({ dept, quantity: total });
        else console.warn(`⚠️ ${drugCode}: department "${source.department}" not found, using default split`);
      }
      if (plan.length === 0) {
        const targets = [];
        for (const d of DEFAULT_STOCK_SPLIT) {
          const dept = await getDept(d.department);
          if (dept) targets.push({ dept, share: d.share });
        }
        let allocated = 0;
        plan = targets.map((t, i) => {
          const quantity = i === targets.length - 1 ? total - allocated : Math.floor(total * t.share);
          allocated += quantity;
          return { dept: t.dept, quantity };
        });
      }
      const plannedQuantity = plan.reduce((sum, row) => sum + row.quantity, 0);
      if (total > 0 && plannedQuantity !== total) seedFailures.push(`${drugCode}: opening stock placement allocated ${plannedQuantity}/${total} units`);
      if (total > 0 && plan.length === 0) seedFailures.push(`${drugCode}: no valid department available for opening stock`);

      for (const { dept, quantity } of plan) {
        if (quantity <= 0) continue;
        try {
          const existingOpeningBatch = await prisma.stockBatch.findFirst({
            where: { stockItemId: stockItem.id, batchNumber: 'OPENING', departmentId: dept.id, wardId: null },
          });
          if (existingOpeningBatch) {
            await prisma.stockBatch.update({
              where: { id: existingOpeningBatch.id },
              data: { quantity, isActive: true, expiryDate: openingExpiry, costPrice: stockItem.costPrice },
            });
          } else {
            await prisma.stockBatch.create({
              data: {
                stockItemId: stockItem.id, batchNumber: 'OPENING', expiryDate: openingExpiry, quantity,
                costPrice: stockItem.costPrice, departmentId: dept.id, wardId: null, isActive: true,
              },
            });
          }

          const existingTxn = await prisma.stockTransaction.findFirst({
            where: { stockItemId: stockItem.id, reference: 'OPENING-BALANCE', departmentId: dept.id },
          });
          if (!existingTxn) {
            await prisma.stockTransaction.create({
              data: {
                stockItemId: stockItem.id, transactionType: 'purchase', quantity, balanceAfter: quantity,
                reference: 'OPENING-BALANCE', notes: `Opening stock balance (seed) - ${dept.name}`,
                performedBy: adminId, departmentId: dept.id,
              },
            });
          }
          perDepartment[dept.name] = (perDepartment[dept.name] || 0) + 1;
          placedCount++;
        } catch (error: any) {
          seedFailures.push(`Stock placement for ${stockItem.drugCode} in ${dept.name}: ${error.message}`);
          console.error(`❌ Stock placement for ${stockItem.drugCode} in ${dept.name}:`, error.message);
        }
      }
    }
    console.log(`✅ Placed opening stock: ${placedCount} batches (${Object.entries(perDepartment).map(([n, c]) => `${n}: ${c}`).join(', ')})`);

    // ── STEP 13: Service catalog ──────────────────────────────
    console.log('🔄 Creating unified service catalog with pricing...');
    const serviceCatalogEntries: any[] = [];

    // Use the supplied NHIA tariff schedules as the sole NHIS source of truth.
    // Facility cash prices remain independently configurable; private/corporate
    // prices are normalized to the facility cash selling price by createServicePricing.
    const tariffSource = readJSON('gdrgTariffs.json');
    const gdrgTariffByCode = new Map<string, any>(
      (tariffSource?.gdrgTariffs || []).map((row: any) => [String(row.gdrgCode || '').trim().toUpperCase(), row]),
    );
    const labTariffByCode = new Map<string, any>(
      (readJSON('labTests.json') || []).map((row: any) => [String(row.investigationCode || '').trim().toUpperCase(), row]),
    );
    const scanTariffByCode = new Map<string, any>(
      (readJSON('scans.json') || []).map((row: any) => [String(row.scanCode || '').trim().toUpperCase(), row]),
    );
    const positiveTariff = (value: unknown): number | null => {
      const amount = Number(value);
      return Number.isFinite(amount) && amount > 0 ? Math.round((amount + Number.EPSILON) * 100) / 100 : null;
    };

    for (const ct of consultationTypes) {
      const configured = pricingConfig.consultations?.[ct.code] || {};
      // The general OPD consultation uses OPDC06A in the facility's supplied G-DRG schedule.
      const consultationTariff = positiveTariff(gdrgTariffByCode.get('OPDC06A')?.tariffGhC);
      const pricing = {
        ...configured,
        cashPrice: configured.cashPrice ?? ct.cashPrice ?? consultationTariff ?? 0,
        nhisPrice: consultationTariff ?? positiveTariff(configured.nhisPrice) ?? 0,
      };
      serviceCatalogEntries.push({
        name: ct.name,
        code: ct.code,
        serviceType: ServiceType.consultation,
        serviceCategory: ServiceCategory.opd,
        subType: ct.code === 'CONS-GEN' ? 'general' : 'specialist',
        nhisServiceCode: ct.code,
        consultationTypeId: consultationTypeMap.get(ct.code)?.id,
        isActive: true,
        pricing,
      });
    }

    for (const [code, template] of labTemplateMap) {
      const configured = pricingConfig.labTests?.[code] || {};
      const officialTariff = positiveTariff(labTariffByCode.get(String(code).trim().toUpperCase())?.price);
      const pricing = {
        ...configured,
        cashPrice: configured.cashPrice ?? officialTariff ?? 0,
        nhisPrice: officialTariff ?? positiveTariff(configured.nhisPrice) ?? 0,
      };
      serviceCatalogEntries.push({
        name: template.name,
        code,
        serviceType: ServiceType.lab_test,
        serviceCategory: ServiceCategory.diagnostics,
        subType: template.category,
        nhisServiceCode: code,
        labTestTemplateId: template.id,
        isActive: true,
        pricing,
      });
    }

    for (const [code, template] of scanTemplateMap) {
      const configured = pricingConfig.scans?.[code] || {};
      const scanSource = scanTariffByCode.get(String(code).trim().toUpperCase());
      const officialTariff = positiveTariff(scanSource?.tariffGhC);
      const pricing = {
        ...configured,
        cashPrice: configured.cashPrice ?? officialTariff ?? 0,
        nhisPrice: officialTariff ?? positiveTariff(configured.nhisPrice) ?? 0,
      };
      serviceCatalogEntries.push({
        name: template.name,
        code: `SCAN-${code}`,
        serviceType: ServiceType.scan,
        serviceCategory: ServiceCategory.diagnostics,
        subType: template.category,
        nhisServiceCode: (template as any).investigationCode || null,
        scanTemplateId: template.id,
        isActive: true,
        pricing,
        metadata: {
          bodyPart: (template as any).bodyPart || null,
          scanType: (template as any).scanType || null,
          preparationInstructions: (template as any).preparationInstructions || null,
          duration: (template as any).duration ?? null,
          contrastRequired: (template as any).contrastRequired ?? false,
          resultTemplate: (template as any).resultTemplate || [],
        },
      });
    }

    for (const [code, template] of procedureTemplateMap) {
      const configured = pricingConfig.procedures?.[code] || {};
      const officialTariff = positiveTariff(gdrgTariffByCode.get(String(code).trim().toUpperCase())?.tariffGhC);
      const pricing = {
        ...configured,
        cashPrice: configured.cashPrice ?? officialTariff ?? 0,
        // Procedure NHIS prices come from the matching G-DRG, never the old local estimate.
        nhisPrice: officialTariff ?? positiveTariff(configured.nhisPrice) ?? 0,
      };
      serviceCatalogEntries.push({
        name: template.name,
        code: `PROC-${code}`,
        serviceType: ServiceType.procedure,
        serviceCategory: ServiceCategory.ipd,
        subType: template.category,
        nhisServiceCode: code,
        procedureTemplateId: template.id,
        isActive: true,
        pricing,
      });
    }

    for (const [drugCode, stockItem] of stockItemMap) {
      // An explicit entry in servicePricing.json wins; otherwise use the item's own prices from its JSON file.
      // Last resort (no prices at all): cost + 20%. All of these are placeholders until real price lists are loaded.
      const costBased = Math.round(Number(stockItem.costPrice ?? 0) * 1.2 * 100) / 100;
      const referencePricing = stockPriceMap.get(drugCode) || {
        cashPrice: costBased, nhisPrice: 0, insurancePrice: costBased, corporatePrice: costBased,
      };
      const configuredPricing = pricingConfig.medications?.[drugCode] || {};
      const sourcePricing = { ...referencePricing, ...configuredPricing };
      // Medication pricing has one hospital selling price for cash, private and corporate.
      // NHIS always retains the official tariff from the 2025 NHIS list, not a stale override.
      const medicationCashPrice = Number(sourcePricing.cashPrice ?? costBased);
      const pricing = {
        ...sourcePricing,
        nhisPrice: Number(referencePricing.nhisPrice ?? 0),
        insurancePrice: medicationCashPrice,
        corporatePrice: medicationCashPrice,
      };
      serviceCatalogEntries.push({
        name: stockItem.name,
        code: drugCode,
        serviceType: ServiceType.medication,
        serviceCategory: ServiceCategory.pharmacy,
        subType: stockItem.category || 'medication',
        nhisServiceCode: null,
        isNHISCovered: stockItem.isNHISCovered === true,
        stockItemId: stockItem.id,
        isActive: true,
        pricing,
        metadata: { pricingSource: 'seed-placeholder' }, // replace with real price lists, then drop this flag
      });
    }

    let serviceCatalogCreated = 0;
    for (const service of serviceCatalogEntries) {
      try {
        const catalogData = addSchemaDefaults({
          name: service.name,
          code: service.code,
          serviceType: service.serviceType,
          serviceCategory: service.serviceCategory,
          subType: service.subType,
          nhisServiceCode: service.nhisServiceCode,
          isNHISCovered: (service.serviceType === ServiceType.medication ? service.isNHISCovered === true : Boolean(service.nhisServiceCode)) && (service.pricing?.nhisPrice ?? 0) > 0,
          nhisCoverageType: NHISCoverageType.full,
          nhisRequiresAuth: service.serviceType === ServiceType.procedure,
          privateInsRequiresAuth: service.serviceType === ServiceType.procedure,
          requiresClinicalNotes: service.serviceType === ServiceType.consultation,
          metadata: service.metadata || null,
          unit: service.serviceType === 'ward' ? 'Day' : 'Each',
          createdById: adminId,
          consultationTypeId: service.consultationTypeId || null,
          labTestTemplateId: service.labTestTemplateId || null,
          scanTemplateId: service.scanTemplateId || null,
          procedureTemplateId: service.procedureTemplateId || null,
          stockItemId: service.stockItemId || null,
          isActive: service.isActive ?? true,
        }, 'serviceCatalog');

        // Reuse the existing medicine catalogue row by stockItemId when its
        // canonical code changes; do not create a second service entry.
        const existingCatalog = service.stockItemId
          ? await prisma.serviceCatalog.findFirst({ where: { stockItemId: service.stockItemId }, orderBy: { createdAt: 'asc' } })
          : null;
        const catalog = existingCatalog
          ? await prisma.serviceCatalog.update({ where: { id: existingCatalog.id }, data: catalogData })
          : await prisma.serviceCatalog.upsert({
              where: { code: service.code },
              create: catalogData,
              update: catalogData,
            });
        if (service.pricing) {
          await createServicePricing(catalog.id, service.pricing);
        }
        serviceCatalogCreated++;
      } catch (error: any) {
        seedFailures.push(`Service catalog ${service.code}: ${error.message}`);
        console.error(`❌ Service catalog ${service.code}:`, error.message);
      }
    }
    if (serviceCatalogCreated !== serviceCatalogEntries.length) seedFailures.push(`Service catalogue seeded ${serviceCatalogCreated}/${serviceCatalogEntries.length} entries`);
    console.log(`✅ ${serviceCatalogCreated}/${serviceCatalogEntries.length} service catalog entries with pricing configured`);

    // ── STEP 14: Wards & Beds ─────────────────────────────────
    const wardsData = readJSON('wards.json');
    const existingWardCount = await prisma.ward.count();

    if (isProdProfile) {
      // Ward names, bed counts and daily rates are facility-specific. They are created by the administrator
      // (Wards screen) instead of being invented here.
      console.log('⏭️ Production profile: default wards and beds skipped');
    } else if (existingWardCount === 0) {
      const defaultWards = [
        { wardName: 'General Ward A', wardType: 'general', totalBeds: 20, dailyCashRate: 100, dailyNHISRate: 50, dailyInsuranceRate: 80 },
        { wardName: 'Maternity Ward', wardType: 'maternity', totalBeds: 12, dailyCashRate: 120, dailyNHISRate: 60, dailyInsuranceRate: 100 },
        { wardName: 'ICU', wardType: 'icu', totalBeds: 6, dailyCashRate: 500, dailyNHISRate: 300, dailyInsuranceRate: 450 },
        { wardName: 'Pediatric Ward', wardType: 'pediatric', totalBeds: 15, dailyCashRate: 80, dailyNHISRate: 40, dailyInsuranceRate: 70 },
        { wardName: 'Surgical Ward', wardType: 'surgical', totalBeds: 18, dailyCashRate: 150, dailyNHISRate: 80, dailyInsuranceRate: 130 },
      ];
      const wardsToCreate = Array.isArray(wardsData) ? wardsData : defaultWards;

      for (const ward of wardsToCreate) {
        try {
          const wardData = addSchemaDefaults(ward, 'ward');
          const createdWard = await prisma.ward.create({ data: wardData });

          const beds = Array.from({ length: ward.totalBeds || 10 }, (_, i) => ({
            wardId: createdWard.id,
            bedNumber: `${ward.wardName.substring(0, 3).toUpperCase()}-${(i + 1).toString().padStart(2, '0')}`,
            isOccupied: false,
          }));
          await prisma.bed.createMany({ data: beds });

          const serviceCode = `WARD-${ward.wardName.replace(/\s+/g, '_').toUpperCase()}`;
          const pricing = {
            cashPrice: ward.dailyCashRate ?? ward.cashPrice ?? ward.cashDailyRate ?? 100,
            nhisPrice: ward.dailyNHISRate ?? ward.nhisPrice ?? ward.nhisDailyRate ?? 50,
            insurancePrice: ward.dailyInsuranceRate ?? ward.insurancePrice ?? ward.insuranceDailyRate ?? 80,
            corporatePrice: ward.dailyCorporateRate ?? ward.corporatePrice ?? ward.corporateDailyRate ?? 0,
          };

          const serviceCatalogData = addSchemaDefaults({
            name: `${ward.wardName} - Daily Rate`,
            code: serviceCode,
            serviceType: ServiceType.ward,
            serviceCategory: ServiceCategory.ipd,
            subType: ward.wardType,
            wardId: createdWard.id,
            unit: 'Day',
            metadata: { wardType: ward.wardType, totalBeds: ward.totalBeds },
            createdById: adminId,
            isActive: true,
          }, 'serviceCatalog');

          const catalog = await prisma.serviceCatalog.upsert({
            where: { code: serviceCode },
            create: serviceCatalogData,
            update: serviceCatalogData,
          });
          await createServicePricing(catalog.id, pricing);
          console.log(`✅ Created ward: ${ward.wardName} with ${ward.totalBeds} beds`);
        } catch (error: any) {
          console.error(`❌ Error creating ward ${ward.wardName}:`, error.message);
        }
      }
      console.log(`✅ ${wardsToCreate.length} wards with beds and pricing created`);
    } else {
      console.log('ℹ️ Wards already exist, skipping ward creation');
    }

    // ── STEP 15: Job grades + salary steps ────────────────────
    await seedJobGradesAndSteps();

    if (seedFailures.length) {
      const summary = `Core data seeding incomplete: ${seedFailures.length} item(s) failed or were invalid. First failures:\n- ${seedFailures.slice(0, 40).join('\n- ')}${seedFailures.length > 40 ? `\n- ...and ${seedFailures.length - 40} more` : ''}`;
      console.error(`❌ ${summary}`);
      throw new Error(summary);
    }
    console.log('🎉 Core data seeding completed successfully; all required catalogue rows were processed.');
    return { success: true, message: 'Core data seeded successfully', counts: { stockItems: totalStockProcessed, labTemplates: labTemplateMap.size, scanTemplates: scanTemplateMap.size, procedureTemplates: procedureTemplateMap.size, serviceCatalog: serviceCatalogCreated } };
  } catch (error: any) {
    console.error('❌ Core data seeding failed:', error);
    throw error;
  }
};

// Integration tests and the main seed runner can close this module's Prisma client cleanly.
export const disconnectCoreSeedPrisma = () => prisma.$disconnect();
