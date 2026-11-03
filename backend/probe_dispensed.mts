// Scratch read-only probe: is there any dispensed medicine in this database at all? Deleted after use.
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const byStatus = await prisma.medication.groupBy({ by: ['status'], _count: { _all: true } });
console.log('medication status counts:', JSON.stringify(byStatus));

const dispensed = await prisma.medication.findMany({
  where: { status: 'dispensed' },
  take: 5,
  select: {
    id: true, name: true, quantity: true, dispensedAt: true, stockItemId: true,
    Attendance: { select: { id: true, insuranceProviderId: true, InsuranceProvider: { select: { name: true } },
                            insuranceClaim: { select: { id: true, claimNumber: true, status: true } } } },
  },
});
console.log('sample dispensed:', JSON.stringify(dispensed, null, 1));

await prisma.$disconnect();
