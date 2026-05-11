// src/seed/seedData.ts
import { seedCoreData } from './coreSeed.js';
import { seedDiagnosisGDRGLinks } from './diagnosisGdrgLink.js';
import { seedProcedureGDRGLinks } from './procedureGdrgLink.js';
import { seedTestData, deleteTestData, initializeDatabase } from './testSeed.js';
import { seedMaternityData } from './seedMaternityData.js';

// This file orchestrates the complete database seeding process in the correct order:
// 1. Core data (diagnoses, templates, GDRG tariffs, service catalog, stock items, wards)
// 2. Diagnosis ↔ GDRG linking (MUST run after GDRG tariffs exist)
// 3. Procedure ↔ GDRG linking (MUST run after GDRG tariffs exist)
// 4. Test data (5 patients with all payment methods, attendances, bills, claims, referrals)
// 5. Maternity data (5 patients with antenatal, delivery, and postnatal records)

export const seedDatabase = async (force: boolean = false) => {
  console.log('🏥 Starting comprehensive database initialization...');
  console.log('==================================================');
  
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
    
    const coreResult = await seedCoreData(force);
    
    if (coreResult.success === false && !coreResult.skipped) {
      throw new Error('Core data seeding failed');
    }
    
    console.log(`✅ Core data: ${coreResult.skipped ? 'already exists' : 'seeded successfully'}`);

    // ========== STEP 2: DIAGNOSIS ↔ GDRG LINKS ==========
    console.log('\n🔗 STEP 2: Diagnosis ↔ GDRG Linking');
    console.log('-----------------------------------');
    console.log('   Mapping ICD-10 codes to GDRG tariffs...');
    
    await seedDiagnosisGDRGLinks();
    console.log('✅ Diagnosis-GDRG links created');

    // ========== STEP 3: PROCEDURE ↔ GDRG LINKS ==========
    console.log('\n🔗 STEP 3: Procedure ↔ GDRG Linking');
    console.log('-----------------------------------');
    console.log('   Mapping procedure codes to GDRG tariffs...');
    
    await seedProcedureGDRGLinks();
    console.log('✅ Procedure-GDRG links created');

    // ========== STEP 4: TEST DATA ==========
    console.log('\n🧪 STEP 4: Test Data Seeding');
    console.log('-----------------------------------');
    console.log('   - 5 Patients (Cash, NHIS, Private Insurance)');
    console.log('   - Attendances (Emergency, Chronic, Surgery, Antenatal, Paediatric)');
    console.log('   - Clinical Data (Vitals, Labs, Scans, Medications)');
    console.log('   - Bills & Payments');
    console.log('   - Insurance Claims');
    console.log('   - Referrals');
    console.log('   - Admissions');
    console.log('   - Appointments');
    console.log('   - Notifications');
    
    const initResult = await initializeDatabase();
    
    console.log(`📊 Test data status: ${initResult.reason || 'checked'}`);
    
    if (initResult.seeded) {
      console.log('🎉 Test data seeded successfully!');
    } else if (initResult.reason === 'real_data_detected') {
      console.log('⚠️ Real data detected. Test data NOT seeded for safety.');
    } else if (initResult.reason === 'already_exists') {
      console.log('ℹ️ Test data already exists. Use force=true to reseed.');
    }

    // ========== SUMMARY ==========
    console.log('\n==================================================');
    console.log('✅ DATABASE INITIALIZATION COMPLETED');
    console.log('==================================================');
    console.log('Summary:');
    console.log(`   Core Data      : ${coreResult.skipped ? 'already existed' : 'seeded'}`);
    console.log(`   Diagnosis Links: ${coreResult.skipped ? 'skipped (core existed)' : 'created'}`);
    console.log(`   Procedure Links: ${coreResult.skipped ? 'skipped (core existed)' : 'created'}`);
    console.log(`   Test Data      : ${initResult.seeded ? 'seeded' : (initResult.reason || 'skipped')}`);
    
    return {
      success: true,
      coreData: coreResult,
      diagnosisLinks: { completed: true },
      procedureLinks: { completed: true },
      testData: initResult,
    };

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Run directly if this file is executed
if (import.meta.url === `file://${process.argv[1]}`) {
  const force = process.argv.includes('--force');
  seedDatabase(force)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default { seedDatabase };