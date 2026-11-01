import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const b = await p.antenatalBooking.findMany({
  where: { attendance: { Scan: { some: {} } } },
  take: 5,
  select: { id: true, attendanceId: true, edd: true, riskLevel: true,
    attendance: { select: { attendanceNumber: true, status: true, Patient: { select: { id: true, surname: true, otherNames: true } }, _count: { select: { Scan: true } } } } },
});
for (const x of b) console.log('ATT=' + x.attendanceId, x.attendance.attendanceNumber, x.attendance.status, x.attendance.Patient.surname, x.attendance.Patient.otherNames, 'PID=' + x.attendance.Patient.id, 'scans=' + x.attendance._count.Scan, 'edd=' + x.edd, 'risk=' + x.riskLevel);
await p.$disconnect();
