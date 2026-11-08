// src/seed/bootstrap.ts
// First-run bootstrap for installed (packaged) copies of the app.
//
// What a production install gets: the REFERENCE data (departments, tariffs, diagnoses, services, the
// drug/consumable catalogue at zero stock, RBAC roles ...) and ONE pair of administrator accounts created
// with the password chosen on the setup screen. What it never gets: demo patients, demo staff, the
// well-known logins (doctor1/doctor123 ...), sample corporate accounts, a fake hospital record, invented
// wards, or opening stock. That is enforced twice: this entry point only uses the 'production' seed
// profile, and the bundle for the installed app does not contain the demo seed at all (see
// backend/scripts/bundle.mjs).
//
// Safe to run repeatedly. It does nothing once users AND the reference data exist, and it completes a
// half-finished run (for example one interrupted mid-seed) instead of mistaking "users exist" for "done".
// The administrator password comes from INITIAL_ADMIN_PASSWORD; it is only needed while the administrator
// accounts have not been created yet.

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { seedCoreData } from './coreSeed.js';
import { seedDiagnosisGDRGLinks } from './diagnosisGdrgLink.js';
import { seedProcedureGDRGLinks } from './procedureGdrgLink.js';

const prisma = new PrismaClient();

// The seeded defaults that must never survive on an installed database.
const DEFAULT_PASSWORDS: Record<string, string> = { superadmin: 'superadmin123', admin: 'admin123' };

async function referenceDataComplete(): Promise<boolean> {
  const [diagnoses, services, stockItems, departments, tariffs] = await Promise.all([
    prisma.diagnosis.count(),
    prisma.serviceCatalog.count(),
    prisma.stockItem.count(),
    prisma.department.count(),
    prisma.gDRGTariff.count(),
  ]);
  return diagnoses > 0 && services > 0 && stockItems > 0 && departments > 0 && tariffs > 0;
}

async function assertNoDefaultPasswords() {
  const accounts = await prisma.user.findMany({
    where: { username: { in: Object.keys(DEFAULT_PASSWORDS) } },
    select: { username: true, password: true },
  });
  const insecure = accounts.filter((u) => bcrypt.compareSync(DEFAULT_PASSWORDS[u.username], u.password));
  if (insecure.length > 0) {
    throw new Error(
      `Account(s) ${insecure.map((u) => u.username).join(', ')} still use the default password. ` +
        'Refusing to finish setup on an insecure database.',
    );
  }
}

async function main() {
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || '';
  const existingUsers = await prisma.user.count();

  if (existingUsers > 0 && (await referenceDataComplete())) {
    await assertNoDefaultPasswords();
    console.log('BOOTSTRAP: users and reference data already exist, nothing to do');
    return;
  }

  if (existingUsers === 0 && adminPassword.length < 8) {
    throw new Error('INITIAL_ADMIN_PASSWORD (at least 8 characters) is required for first-run setup');
  }

  console.log('BOOTSTRAP: seeding reference data (this takes a minute)...');
  // force=true only bypasses the "core data already exists" skip so an interrupted run can finish.
  // Every write is an upsert, nothing existing is overwritten, and the production profile creates no
  // sample content.
  const core = await seedCoreData(true, { profile: 'production', adminPassword });
  if (!core?.success) {
    throw new Error(`Core data seeding failed: ${(core as any)?.message || 'unknown error'}`);
  }

  await seedDiagnosisGDRGLinks();
  await seedProcedureGDRGLinks();

  if (!(await referenceDataComplete())) {
    throw new Error('Reference data is incomplete after seeding (a data file may be missing from the installer)');
  }
  await assertNoDefaultPasswords();

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
