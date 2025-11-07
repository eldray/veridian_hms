import seedCoreData from './seedCoreData.js';
import seedMedicalData from './seedMedicalData.js';

const seedData = async () => {
  try {
    console.log('🚀 Starting comprehensive database seeding...');

    // Seed core data first (users, patients, etc.)
    await seedCoreData();

    // Seed medical data (diagnoses, lab tests, procedures, etc.)
    await seedMedicalData();

    console.log('🎉 All database seeding completed successfully!');
    
  } catch (error) {
    console.error('💥 Error during database seeding:', error);
    throw error;
  }
};

export default seedData;
