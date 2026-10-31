// src/seed/testSeed/medications.ts
//
// Prescriptions that a pharmacist can actually dispense and a nurse can actually chart.
//
// Each dispensed line consumes real FEFO batch stock through the shared ledger and
// records the same evidence the live dispensing transaction writes (batch number,
// expiry, unit cost and the `sale` StockTransaction). Inpatient prescriptions then
// materialise their medication administration record with the app's own schedule
// parser, so the dose grid in the MAR matches what the workflow would have produced.
import { Prisma } from '@prisma/client';
import { NursingService } from '../../modules/nursing/NursingService.js';
import type { GeneratedMedication } from '../bulkGenerator.js';
import type { Lookups } from './lookups.js';
import type { EncounterIndex } from './encounters.js';
import type { StockLedger } from './stockLedger.js';
import { hashOf, money, prisma, writeMany, type SeedStats } from './shared.js';

let medCounter = 0;
const nextMedicationId = () => `seedmed-${(++medCounter).toString().padStart(7, '0')}`;
let doseCounter = 0;
const nextDoseId = () => `seeddose-${(++doseCounter).toString().padStart(8, '0')}`;

const PHARMACY_DEPARTMENT = 'Pharmacy';

const marService = new NursingService(prisma);

/** Doses that were due before the chart closed, split into given, late and missed. */
interface DoseOutcome {
  status: 'scheduled' | 'due' | 'late' | 'administered' | 'missed' | 'discontinued';
  administeredAt?: Date;
  varianceReason?: string;
}

const outcomeFor = (
  scheduledAt: Date,
  position: number,
  given: number,
  intervalHours: number,
  now: number,
  chartClosed: boolean,
  salt: string,
): DoseOutcome => {
  if (position < given) {
    // A dose given after its window is recorded late, the way the ward records it.
    const lateWindowMs = intervalHours * 3600_000 * 0.5;
    const driftMs = (hashOf(salt) % Math.max(1, Math.floor(lateWindowMs * 1.6)));
    const administeredAt = new Date(scheduledAt.getTime() + driftMs);
    return administeredAt.getTime() > scheduledAt.getTime() + lateWindowMs
      ? { status: 'late', administeredAt, varianceReason: 'Given after the scheduled window during a busy shift.' }
      : { status: 'administered', administeredAt };
  }
  if (scheduledAt.getTime() > now) return { status: 'scheduled' };
  if (!chartClosed) return { status: 'due' };
  return { status: 'missed', varianceReason: 'Course ended with the remaining doses unscheduled by the ward.' };
};

export const seedMedications = async (
  lookups: Lookups,
  ledger: StockLedger,
  encounters: Map<string, EncounterIndex>,
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const medRows: Prisma.MedicationCreateManyInput[] = [];
  const doseRows: Prisma.MedicationDoseCreateManyInput[] = [];
  const now = Date.now();
  let dispensedCount = 0;
  let shortCount = 0;

  for (const encounter of encounters.values()) {
    const closedEncounter = encounter.plan.status !== 'pending' && encounter.plan.status !== 'admitted';

    encounter.medPlans.forEach((med: GeneratedMedication, position) => {
      const stock = lookups.stockForDrugGroup(med.drugGroup, `${encounter.attendanceId}:${position}`);
      if (!stock) return;
      const id = nextMedicationId();
      const wantsDispensing = med.status === 'dispensed' || med.status === 'administered';
      const dispenser = med.dispenser ?? { role: 'pharmacist' as const, salt: hashOf(id) % 97 };
      const departmentId = lookups.actorDepartmentId(dispenser)
        ?? lookups.departmentIdByName.get(PHARMACY_DEPARTMENT)
        ?? null;

      const row: Prisma.MedicationCreateManyInput & { id: string } = {
        id,
        attendanceId: encounter.attendanceId,
        stockItemId: stock.id,
        serviceCatalogId: lookups.serviceByStockItem.get(stock.id)?.id ?? null,
        name: stock.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        quantity: med.quantity,
        route: med.route,
        instructions: med.instructions,
        status: med.status,
        prescribedAt: med.prescribedAt,
        prescribedById: lookups.actorId(med.prescriber),
      };

      if (wantsDispensing && departmentId) {
        const result = ledger.consume(stock.id, med.quantity, {
          departmentId,
          transactionType: 'sale',
          reference: `Encounter ${encounter.attendanceId}`,
          notes: 'Dispensed using FEFO batch allocation',
          performedBy: lookups.actorId(dispenser),
          transactionDate: med.dispensedAt ?? med.prescribedAt,
        });
        if (result.ok) {
          dispensedCount++;
          // Exactly one allocation is what lets the dispensing screen name a single batch.
          const single = result.allocations.length === 1 ? result.allocations[0] : null;
          row.dispensedAt = med.dispensedAt ?? med.prescribedAt;
          row.dispensedById = lookups.actorId(dispenser);
          row.dispensedBatchNumber = single?.batchNumber;
          row.dispensedExpiryDate = single?.expiryDate;
          row.dispensedUnitCost = single ? money(parseFloat(single.costPrice)) : money(stock.costPrice);
          row.notes = result.allocations.length > 1
            ? `Dispensed across ${result.allocations.length} batches against the nearest expiry dates.`
            : undefined;
        } else {
          // No stock, no dispensing evidence: the prescription stays as it was written.
          shortCount++;
          row.status = 'prescribed';
          row.notes = `Not dispensed: only ${result.available} units on the shelf against ${med.quantity} requested.`;
        }
      } else if (wantsDispensing) {
        shortCount++;
        row.status = 'prescribed';
      }

      // ── MAR chart for an inpatient course ───────────────
      const charted = row.status !== 'prescribed' && med.isInpatient;
      if (charted) {
        const schedule = marService.parseSchedule(med.frequency, med.duration, med.prescribedAt);
        const given = Math.min(med.dosesAdministered, schedule.requiredDoses);
        const snapshot: Array<Record<string, unknown>> = [];
        for (let i = 0; i < schedule.requiredDoses; i++) {
          const scheduledAt = new Date(schedule.firstDoseAt.getTime() + i * schedule.intervalHours * 3_600_000);
          const outcome = outcomeFor(scheduledAt, i, given, schedule.intervalHours, now, closedEncounter, `${id}:${i}`);
          const administeredByNurse = outcome.status === 'administered' || outcome.status === 'late';
          doseRows.push({
            id: nextDoseId(),
            medicationId: id,
            doseNumber: i + 1,
            scheduledAt,
            status: outcome.status,
            dose: med.dosage,
            route: med.route,
            administeredAt: outcome.administeredAt,
            administeredById: administeredByNurse ? lookups.actorId(med.nurse ?? dispenser) : undefined,
            varianceReason: outcome.varianceReason,
            notes: administeredByNurse ? 'Patient tolerated the dose; no reaction observed.' : undefined,
          });
          if (administeredByNurse && outcome.administeredAt) {
            snapshot.push({
              doseNumber: i + 1,
              administeredAt: outcome.administeredAt,
              administeredBy: lookups.actorName(med.nurse ?? dispenser),
              scheduledAt,
              late: outcome.status === 'late',
            });
          }
        }
        const last = snapshot[snapshot.length - 1];
        if (snapshot.length) {
          row.administeredDoses = snapshot as Prisma.InputJsonValue;
          row.administeredAt = last.administeredAt as Date;
          row.administeredById = lookups.actorId(med.nurse ?? dispenser);
          row.status = 'administered';
        } else {
          // Nothing due yet on a chart that has only scheduled doses ahead of it.
          row.status = 'dispensed';
          row.administeredDoses = [] as Prisma.InputJsonValue;
        }
      } else if (row.status === 'administered') {
        // An outpatient course that the generator marked administered has no ward chart;
        // the first dose is taken in the clinic and recorded on the prescription itself.
        row.administeredAt = med.administeredAt ?? med.dispensedAt ?? med.prescribedAt;
        row.administeredById = lookups.actorId(med.nurse ?? med.prescriber);
        row.administeredDoses = [{ doseNumber: 1, administeredAt: row.administeredAt, administeredBy: lookups.actorName(med.nurse ?? med.prescriber) }] as Prisma.InputJsonValue;
      }

      medRows.push(row);
      encounter.medIds[position] = id;
    });
  }

  await writeMany('medications', (part) => prisma.medication.createMany({ data: part }), medRows, stats, planned);
  await writeMany('MAR doses', (part) => prisma.medicationDose.createMany({ data: part }), doseRows, stats, planned);
  console.log(`✅ ${dispensedCount} prescriptions dispensed against stock${shortCount ? `, ${shortCount} left un-dispensed for want of stock` : ''}`);
};
