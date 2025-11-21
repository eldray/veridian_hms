// src/seed/seedData.ts
import { seedCoreData } from './coreSeed';
import { seedTestData, initializeDatabase } from './testSeed';

export const seedDatabase = async () => {
  console.log('🏥 Starting comprehensive database initialization...');
  
  try {
    // ✅ SAFE: Check and seed core data only if needed (uses upsert, won't delete patient data)
    console.log('📚 Step 1: Configuring core data (diagnoses, templates, etc.)...');
    const coreResult = await seedCoreData(false); // force=false for safety
    
    if (coreResult.skipped) {
      console.log('✅ Core data already configured, proceeding...');
    } else if (coreResult.success) {
      console.log('✅ Core data configured successfully');
    }

    // ✅ SAFE: Initialize test data only if needed (checks for existing data)
    console.log('📚 Step 2: Checking test data status...');
    const initializationResult = await initializeDatabase();
    
    console.log('📊 Database initialization result:', {
      initialized: initializationResult.initialized,
      seeded: initializationResult.seeded,
      reason: initializationResult.reason
    });

    if (initializationResult.seeded) {
      console.log('🎉 Test data seeded successfully!');
    } else {
      console.log(`ℹ️  Test data status: ${initializationResult.reason}`);
    }

    console.log('✅ Database initialization completed successfully!');
    
    return {
      success: true,
      coreData: coreResult,
      testData: initializationResult
    };

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};