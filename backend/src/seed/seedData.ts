// src/seed/seed.ts
import { seedCoreData } from './coreSeed';
import { seedTestData } from './testSeed';

export const seedDatabase = async () => {
  console.log('🏥 Starting comprehensive seeding...');
  
  try {
    // Always seed core data (JSON files + hospital settings)
    await seedCoreData();
    
    // Only seed test data in development or when explicitly enabled
    if (process.env.NODE_ENV === 'development' || process.env.SEED_TEST_DATA === 'true') {
      await seedTestData();
      console.log('🧪 Test data seeded (development mode)');
    } else {
      console.log('ℹ️  Test data skipped (production mode)');
    }
    
    console.log('✅ All seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
};