import type { PrismaClient } from '@prisma/client';

/**
 * Automatically close only signed OPD attendances from earlier Ghana calendar days.
 * Ghana uses UTC year-round, so the local midnight boundary is represented by UTC midnight.
 * Unfinalised visits and encounters linked to any admission are deliberately left untouched.
 */
export async function runOpdAttendanceAutoCloseJob(prisma: PrismaClient, now = new Date()) {
  const ghanaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Accra',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const startOfTodayInGhana = new Date(`${ghanaDate}T00:00:00.000Z`);

  const result = await prisma.attendance.updateMany({
    where: {
      encounterCategory: 'opd',
      status: 'pending',
      finalizedAt: { not: null },
      dateTime: { lt: startOfTodayInGhana },
      Admission: { is: null },
    },
    data: {
      status: 'completed',
      autoClosedAt: now,
      bedId: null,
    },
  });

  console.log(
    `✅ OPD auto-closure finished: ${result.count} signed attendance(s) closed; unfinalised visits were left for review.`,
  );
  return { closed: result.count, cutoff: startOfTodayInGhana };
}
