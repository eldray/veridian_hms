// backend/src/scripts/backfillStaffProfiles.ts
// One-off: ensure every User has a matching StaffProfile row.
// Safe to re-run — skips users that already have one.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const generateEmployeeId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `GHS-${year}-`;

  const last = await prisma.staffProfile.findFirst({
    where: { employeeId: { startsWith: prefix } },
    orderBy: { employeeId: 'desc' },
    select: { employeeId: true },
  });

  const lastNumber = last ? parseInt(last.employeeId.slice(prefix.length), 10) : 0;
  const nextNumber = (isNaN(lastNumber) ? 0 : lastNumber) + 1;
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

async function main() {
  console.log('🔎 Finding users without a StaffProfile…');

  const usersWithoutProfile = await prisma.user.findMany({
    where: { staffProfile: null },
    select: {
      id: true,
      username: true,
      fullName: true,
      departmentId: true,
      createdAt: true,
    },
  });

  console.log(`   Found ${usersWithoutProfile.length} users to backfill.`);

  let created = 0;
  for (const u of usersWithoutProfile) {
    try {
      const employeeId = await generateEmployeeId();
      await prisma.staffProfile.create({
        data: {
          userId: u.id,
          employeeId,
          dateJoined: u.createdAt ?? new Date(),
          employmentType: 'PERMANENT',
          departmentId: u.departmentId ?? null,
        },
      });
      created++;
      console.log(`   ✅ ${u.username} → ${employeeId}`);
    } catch (err: any) {
      console.error(`   ❌ ${u.username}: ${err.message}`);
    }
  }

  console.log(`\n🎉 Backfilled ${created} staff profiles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());