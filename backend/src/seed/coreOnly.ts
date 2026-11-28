/**
 * Explicit core/reference-data-only seeder.
 *
 * This runner intentionally does not import or call testSeed/seedTestData.
 * It uses the production profile so it cannot create demo patients, demo staff,
 * sample bills/claims, fake facility details, invented wards/beds, or opening stock.
 *
 * If the two initial administrator accounts do not both exist, provide
 * INITIAL_ADMIN_PASSWORD (or SEED_ADMIN_PASSWORD) with at least 8 characters.
 */
import { PrismaClient } from '@prisma/client';
import { seedCoreData, disconnectCoreSeedPrisma } from './coreSeed.js';
import { seedDiagnosisGDRGLinks } from './diagnosisGdrgLink.js';
import { seedProcedureGDRGLinks } from './procedureGdrgLink.js';

const prisma = new PrismaClient();

async function main() {
  const adminPassword =
    process.env.INITIAL_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || undefined;

  console.log('Starting CORE-ONLY reference data seeding.');
  console.log('Demo/test data generation is not part of this command.');

  // force=true permits the explicit production-profile catalogue reconciliation.
  // The production profile prevents demo/sample facility data and default passwords.
  const core = await seedCoreData(true, {
    profile: 'production',
    adminPassword,
  });

  if (!core?.success) {
    throw new Error(core?.message || 'Core reference data seeding failed.');
  }

  await seedDiagnosisGDRGLinks();
  await seedProcedureGDRGLinks(prisma);

  console.log('CORE-ONLY seeding completed successfully.');
}

main()
  .catch((error: any) => {
    console.error('CORE-ONLY seeding failed:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.allSettled([prisma.$disconnect(), disconnectCoreSeedPrisma()]);
  });
