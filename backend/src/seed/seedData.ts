// src/seed/seedData.ts
import { seedCoreData } from './coreSeed.js';
import { seedDiagnosisGDRGLinks } from './diagnosisGdrgLink.js';
import { seedProcedureGDRGLinks } from './procedureGdrgLink.js';
import { seedTestData, deleteTestData, initializeDatabase } from './testSeed.js';
import { seedMaternityData } from './seedMaternityData.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seeding status tracking
interface SeedingStatus {
  coreData: boolean;
  diagnosisLinks: boolean;
  procedureLinks: boolean;
  testData: boolean;
  maternityData: boolean;
  lastRun: string;
}

const SEED_STATUS_FILE = '.seed_status.json';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATUS_PATH = path.join(__dirname, SEED_STATUS_FILE);

// Load or create seeding status
const loadSeedingStatus = (): SeedingStatus => {
  if (fs.existsSync(STATUS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(STATUS_PATH, 'utf-8'));
    } catch {
      return getDefaultStatus();
    }
  }
  return getDefaultStatus();
};

const getDefaultStatus = (): SeedingStatus => ({
  coreData: false,
  diagnosisLinks: false,
  procedureLinks: false,
  testData: false,
  maternityData: false,
  lastRun: new Date().toISOString()
});

const saveSeedingStatus = (status: SeedingStatus) => {
  status.lastRun = new Date().toISOString();
  fs.writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2));
};

// Helper to handle errors and continue seeding with retry logic
const safeSeed = async (
  name: string, 
  seedFn: () => Promise<any>, 
  force: boolean,
  stepKey: keyof SeedingStatus,
  status: SeedingStatus
): Promise<{ success: boolean; error?: string; data?: any }> => {
  console.log(`\n📚 STEP: ${name}`);
  console.log('-----------------------------------');
  
  // Skip if already seeded and not forcing
  if (status[stepKey] && !force) {
    console.log(`ℹ️ ${name} already seeded successfully. Use --force to reseed.`);
    return { success: true, data: { skipped: true, message: 'Already seeded' } };
  }
  
  try {
    const result = await seedFn();
    console.log(`✅ ${name}: successful`);
    // Update status on success
    status[stepKey] = true;
    saveSeedingStatus(status);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`❌ ${name} failed:`, error.message);
    // Mark as failed in status
    status[stepKey] = false;
    saveSeedingStatus(status);
    
    if (force) {
      console.log(`⚠️ Continuing despite error in ${name} (force mode enabled)...`);
      return { success: false, error: error.message };
    }
    throw error;
  }
};

// Check if data actually exists in database (more reliable than status file)
const checkCoreDataExists = async (): Promise<boolean> => {
  const diagnosisCount = await prisma.diagnosis.count();
  const serviceCount = await prisma.serviceCatalog.count();
  return diagnosisCount > 0 && serviceCount > 0;
};

const checkTestDataExists = async (): Promise<boolean> => {
  const patientCount = await prisma.patient.count({
    where: { folderNumber: { startsWith: 'PAT-TEST-' } }
  });
  return patientCount >= 5;
};

const checkMaternityDataExists = async (): Promise<boolean> => {
  const maternityCount = await prisma.antenatalBooking.count({
    where: {
      patient: {
        folderNumber: { in: ['PAT-TEST-006', 'PAT-TEST-007', 'PAT-TEST-008', 'PAT-TEST-009', 'PAT-TEST-010'] }
      }
    }
  });
  return maternityCount >= 5;
};

export const seedDatabase = async (force: boolean = false) => {
  console.log('🏥 Starting comprehensive database initialization...');
  console.log('==================================================');
  console.log(`🔧 Force mode: ${force ? 'ENABLED (will reseed all)' : 'DISABLED (will skip existing)'}`);
  
  // Load seeding status
  let status = loadSeedingStatus();
  
  // Override status with actual database checks if force is false
  if (!force) {
    const coreExists = await checkCoreDataExists();
    const testExists = await checkTestDataExists();
    const maternityExists = await checkMaternityDataExists();
    
    status.coreData = coreExists;
    status.testData = testExists;
    status.maternityData = maternityExists;
    saveSeedingStatus(status);
  }
  
  const results = {
    coreData: null as any,
    diagnosisLinks: null as any,
    procedureLinks: null as any,
    testData: null as any,
    maternityData: null as any,
    errors: [] as string[]
  };
  
  try {
    // ========== STEP 1: CORE DATA ==========
    console.log('\n📚 STEP 1: Core Data Seeding');
    console.log('-----------------------------------');
    console.log('   - Diagnoses');
    console.log('   - GDRG Tariffs');
    console.log('   - Lab/Scan/Procedure Templates');
    console.log('   - Service Catalog');
    console.log('   - Stock Items');
    console.log('   - Wards & Beds');
    
    const coreResult = await safeSeed('Core Data', () => seedCoreData(force), force, 'coreData', status);
    results.coreData = coreResult;
    
    // If core data failed and not in force mode, stop
    if (!coreResult.success && !force) {
      throw new Error('Core data seeding failed. Use --force to continue anyway.');
    }

    // ========== STEP 2: DIAGNOSIS ↔ GDRG LINKS ==========
    console.log('\n🔗 STEP 2: Diagnosis ↔ GDRG Linking');
    console.log('-----------------------------------');
    console.log('   Mapping ICD-10 codes to GDRG tariffs...');
    
    const diagResult = await safeSeed('Diagnosis-GDRG Links', seedDiagnosisGDRGLinks, force, 'diagnosisLinks', status);
    results.diagnosisLinks = diagResult;
    if (!diagResult.success) results.errors.push('Diagnosis-GDRG links: failed');

    // ========== STEP 3: PROCEDURE ↔ GDRG LINKS ==========
    console.log('\n🔗 STEP 3: Procedure ↔ GDRG Linking');
    console.log('-----------------------------------');
    console.log('   Mapping procedure codes to GDRG tariffs...');
    
    const procResult = await safeSeed('Procedure-GDRG Links', seedProcedureGDRGLinks, force, 'procedureLinks', status);
    results.procedureLinks = procResult;
    if (!procResult.success) results.errors.push('Procedure-GDRG links: failed');

    // ========== STEP 4: TEST DATA ==========
    console.log('\n🧪 STEP 4: Test Data Seeding');
    console.log('-----------------------------------');
    console.log('   - Patients (Cash, NHIS, Private Insurance)');
    console.log('   - Attendances (completed, pending today, admitted, detained, discharged)');
    console.log('   - Clinical Data (Vitals, Labs, Scans, Medications)');
    console.log('   - Bills & Payments');
    console.log('   - Insurance Claims');
    console.log('   - Referrals');
    console.log('   - Admissions');
    console.log('   - Appointments');
    console.log('   - Notifications');
    
    // Check if test data needs to be reseeded
    const needsTestReseed = force || !status.testData || results.coreData.success === false;
    
    if (needsTestReseed) {
      // Delete existing test data if force or if core data was just seeded
      if (force || results.coreData.success === true) {
        console.log('🗑️ Cleaning existing test data before reseed...');
        await deleteTestData(true).catch(() => {});
      }
      
      const testResult = await safeSeed('Test Data', () => seedTestData(force), force, 'testData', status);
      results.testData = testResult;
      if (!testResult.success) results.errors.push(`Test data: ${testResult.error || 'failed'}`);
    } else {
      console.log('ℹ️ Test data already seeded. Use --force to reseed.');
      results.testData = { success: true, data: { skipped: true, message: 'Already seeded' } };
    }

    // ========== STEP 5: MATERNITY DATA ==========
    console.log('\n🤰 STEP 5: Maternity Data Seeding');
    console.log('-----------------------------------');
    console.log('   - Antenatal bookings');
    console.log('   - ANC visits');
    console.log('   - Delivery records');
    console.log('   - Newborn records');
    console.log('   - Postnatal visits');
    
    // Check if maternity data needs to be reseeded
    const needsMaternityReseed = force || !status.maternityData || results.testData.success === true;
    
    if (needsMaternityReseed) {
      const maternityResult = await safeSeed('Maternity Data', () => seedMaternityData(force), force, 'maternityData', status);
      results.maternityData = maternityResult;
      if (!maternityResult.success) results.errors.push(`Maternity data: ${maternityResult.error || 'failed'}`);
    } else {
      console.log('ℹ️ Maternity data already seeded. Use --force to reseed.');
      results.maternityData = { success: true, data: { skipped: true, message: 'Already seeded' } };
    }

    // ========== SUMMARY ==========
    console.log('\n==================================================');
    if (results.errors.length > 0) {
      console.log('⚠️ DATABASE INITIALIZATION COMPLETED WITH ERRORS');
      console.log('==================================================');
      console.log('Errors encountered:');
      results.errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
      console.log('\n💡 To fix errors and retry, run: npm run seed -- --force');
    } else {
      console.log('✅ DATABASE INITIALIZATION COMPLETED SUCCESSFULLY');
      console.log('==================================================');
    }
    
    console.log('\nSummary:');
    console.log(`   Core Data         : ${results.coreData?.success ? '✅ seeded' : (results.coreData?.data?.skipped ? '⏭️ already existed' : '❌ failed')}`);
    console.log(`   Diagnosis Links   : ${results.diagnosisLinks?.success ? '✅ created' : (results.diagnosisLinks?.data?.skipped ? '⏭️ already done' : '❌ failed')}`);
    console.log(`   Procedure Links   : ${results.procedureLinks?.success ? '✅ created' : (results.procedureLinks?.data?.skipped ? '⏭️ already done' : '❌ failed')}`);
    console.log(`   Test Data         : ${results.testData?.success ? '✅ seeded' : (results.testData?.data?.skipped ? '⏭️ already exists' : '❌ failed')}`);
    console.log(`   Maternity Data    : ${results.maternityData?.success ? '✅ seeded' : (results.maternityData?.data?.skipped ? '⏭️ already exists' : '❌ failed')}`);
    
    // Save final status
    saveSeedingStatus(status);
    
    return {
      success: results.errors.length === 0,
      partial: results.errors.length > 0,
      errors: results.errors,
      results,
      status: {
        coreData: status.coreData,
        diagnosisLinks: status.diagnosisLinks,
        procedureLinks: status.procedureLinks,
        testData: status.testData,
        maternityData: status.maternityData
      }
    };

  } catch (error: any) {
    console.error('❌ Database initialization failed catastrophically:', error);
    return {
      success: false,
      partial: false,
      errors: [`Catastrophic failure: ${error.message}`],
      results,
    };
  } finally {
    await prisma.$disconnect();
  }
};

// Run directly if this file is executed
if (import.meta.url === `file://${process.argv[1]}`) {
  const force = process.argv.includes('--force');
  const reset = process.argv.includes('--reset');
  
  if (reset) {
    console.log('🗑️ Resetting seeding status...');
    if (fs.existsSync(STATUS_PATH)) {
      fs.unlinkSync(STATUS_PATH);
    }
    console.log('✅ Status reset. Run without --reset to seed.');
    process.exit(0);
  }
  
  seedDatabase(force)
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 Seeding completed successfully!');
        process.exit(0);
      } else if (result.partial) {
        console.log('\n⚠️ Seeding completed partially with errors');
        console.log('\n💡 To retry failed steps, run: npm run seed -- --force');
        process.exit(1);
      } else {
        console.error('\n❌ Seeding failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default { seedDatabase };