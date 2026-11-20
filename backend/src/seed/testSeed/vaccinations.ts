// src/seed/testSeed/vaccinations.ts
//
// Demo vaccination encounters and administration records. These are deliberately part
// of the demo/test dataset only; the production bootstrap seeds the vaccine catalogue,
// never fabricated patient histories.
import { AttendanceStatus, AttendanceType } from '@prisma/client';
import type { GeneratedPatient } from '../bulkGenerator.js';
import type { PatientRecords } from './patients.js';
import { hashOf, prisma, writeMany, type SeedStats } from './shared.js';

export const seedVaccinationRecords = async (
  patients: PatientRecords,
  patientPlans: GeneratedPatient[],
  nurseId: string,
  stats: SeedStats,
  planned: SeedStats,
): Promise<number> => {
  const seededPatients = [...patients.idByFolder.entries()];
  if (!seededPatients.length) return 0;

  const [patientRows, vaccines] = await Promise.all([
    prisma.patient.findMany({
      where: { id: { in: seededPatients.map(([, id]) => id) } },
      select: { id: true, folderNumber: true, dateOfBirth: true, registeredAt: true, paymentMode: true },
    }),
    prisma.vaccine.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    }),
  ]);

  if (!vaccines.length) {
    throw new Error('Vaccination demo seed requires the standard Vaccine catalogue; no active vaccines were found.');
  }

  const planByFolder = new Map(patientPlans.map((p) => [p.folderNumber, p]));
  const now = new Date();
  const fiveYearsAgo = new Date(now);
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const eligible = patientRows
    .filter((patient) => patient.dateOfBirth >= fiveYearsAgo && patient.dateOfBirth <= now)
    .sort((a, b) => a.folderNumber.localeCompare(b.folderNumber));

  if (!eligible.length) {
    console.log('ℹ️ No seeded children under five were available for demo vaccination records.');
    return 0;
  }

  // Give each eligible child a dedicated immunization attendance. Stable visit numbers
  // make a partially completed seed safe to rerun without duplicating encounters.
  const attendanceNumbers = new Map<string, string>();
  const attendanceRows = eligible.map((patient, index) => {
    const number = String(900000 + index);
    attendanceNumbers.set(patient.id, number);
    const visitDate = new Date(Math.min(now.getTime(), Math.max(
      patient.dateOfBirth.getTime(),
      patient.registeredAt.getTime(),
    )));
    const plan = planByFolder.get(patient.folderNumber);
    return {
      attendanceNumber: number,
      patientId: patient.id,
      attendanceType: AttendanceType.immunization,
      dateTime: visitDate,
      paymentMode: (patient.paymentMode || plan?.paymentMode || 'cash') as any,
      status: AttendanceStatus.completed,
      encounterCategory: 'opd' as any,
      visitCategory: 'general' as any,
      complaints: 'Scheduled childhood immunization',
      assessment: 'Child presented for routine vaccination.',
      treatmentPlan: 'Vaccination recorded in the demonstration dataset.',
      clinicalOutcome: 'stable' as any,
      createdById: nurseId,
    };
  });

  await writeMany(
    'immunization attendances',
    (part) => prisma.attendance.createMany({ data: part, skipDuplicates: true }),
    attendanceRows,
    stats,
    planned,
  );

  const attendanceByNumber = new Map<string, { id: string; patientId: string; dateTime: Date }>();
  const numbers = attendanceRows.map((row) => row.attendanceNumber);
  for (let offset = 0; offset < numbers.length; offset += 500) {
    const found = await prisma.attendance.findMany({
      where: { attendanceNumber: { in: numbers.slice(offset, offset + 500) } },
      select: { id: true, patientId: true, attendanceNumber: true, dateTime: true },
    });
    for (const row of found) {
      if (row.patientId) attendanceByNumber.set(row.attendanceNumber, {
        id: row.id, patientId: row.patientId, dateTime: row.dateTime,
      });
    }
  }

  const records: any[] = [];
  for (const patient of eligible) {
    const number = attendanceNumbers.get(patient.id);
    const attendance = number ? attendanceByNumber.get(number) : null;
    if (!attendance) continue;

    // A stable patient-specific offset varies the number of recorded antigens without
    // fabricating future appointments, expiry dates, or clinical dose intervals.
    const start = hashOf(`vaccines-${patient.folderNumber}`) % vaccines.length;
    const count = Math.min(1 + (hashOf(`vaccine-count-${patient.folderNumber}`) % 3), vaccines.length);
    for (let index = 0; index < count; index++) {
      const vaccine = vaccines[(start + index) % vaccines.length];
      records.push({
        id: `seedimm-${patient.folderNumber}-${vaccine.code}`,
        patientId: patient.id,
        attendanceId: attendance.id,
        vaccineId: vaccine.id,
        doseNumber: 'Dose 1',
        administeredAt: attendance.dateTime,
        recordedById: nurseId,
        administeredById: nurseId,
        batchNumber: `DEMO-${vaccine.code}-BATCH`,
        notes: 'Demonstration seed record only. Verify against the child health record before clinical use.',
      });
    }
  }

  await writeMany(
    'vaccination administration records',
    (part) => prisma.immunizationRecord.createMany({ data: part, skipDuplicates: true }),
    records,
    stats,
    planned,
  );

  console.log(`💉 ${records.length} vaccination records across ${attendanceByNumber.size} dedicated immunization visits`);
  return records.length;
};
