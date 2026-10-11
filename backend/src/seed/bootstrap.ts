// src/seed/bootstrap.ts
// First-run bootstrap for installed (packaged) copies of the app.
//
// Why this exists: the normal seed refuses to run in production (coreSeed's "PRODUCTION SAFETY"
// guard) and the dev seed also creates fake test patients and well-known logins (doctor1/doctor123 ...).
// A freshly installed PC needs neither a locked-out empty database nor demo data. It needs the reference
// data (departments, tariffs, diagnoses, services, stock, wards ...) and ONE administrator.
//
// Safe to run repeatedly: it does nothing when users already exist.
// The administrator's password comes from INITIAL_ADMIN_PASSWORD (entered in the setup screen).

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { seedCoreData } from './coreSeed.js';
import { seedDiagnosisGDRGLinks } from './diagnosisGdrgLink.js';
import { seedProcedureGDRGLinks } from './procedureGdrgLink.js';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length < 8) {
    throw new Error('INITIAL_ADMIN_PASSWORD (at least 8 characters) is required for first-run setup');
  }

  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('BOOTSTRAP: users already exist, nothing to do');
    return;
  }

  console.log('BOOTSTRAP: seeding reference data (this takes a minute)...');
  // force=true only bypasses the production guard; we are on an empty database so nothing is overwritten
  const core = await seedCoreData(true);
  if (!core?.success) {
    throw new Error(`Core data seeding failed: ${(core as any)?.message || 'unknown error'}`);
  }

  await seedDiagnosisGDRGLinks();
  await seedProcedureGDRGLinks();

  // Replace the seed's well-known default password with the one chosen during setup
  const updated = await prisma.user.updateMany({
    where: { username: 'admin' },
    data: { password: bcrypt.hashSync(adminPassword, 10), isActive: true },
  });
  if (updated.count === 0) throw new Error('Administrator account was not created by the seed');

  console.log('BOOTSTRAP: done');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('BOOTSTRAP FAILED:', err?.message || err);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
