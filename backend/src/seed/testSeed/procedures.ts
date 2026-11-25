// src/seed/testSeed/procedures.ts
//
// Theatre activity: the operation, the anaesthetic, the intra-operative narrative and
// the structured peri-operative record the theatre list screen reads. Only a completed
// procedure carries the operative notes; a booked list is a list of what is still to come.
import { Prisma } from '@prisma/client';
import type { GeneratedProcedure } from '../bulkGenerator.js';
import type { Lookups } from './lookups.js';
import type { EncounterIndex } from './encounters.js';
import { money, notFuture, prisma, writeMany, type SeedStats } from './shared.js';

let procedureCounter = 0;
const nextProcedureId = () => `seedproc-${(++procedureCounter).toString().padStart(7, '0')}`;

export const seedProcedures = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const rows: Prisma.ProcedureCreateManyInput[] = [];

  for (const encounter of encounters.values()) {
    encounter.procPlans.forEach((proc: GeneratedProcedure, position) => {
      const template = lookups.procedureTemplateByCode.get(proc.procedureCode);
      if (!template) return;
      const id = nextProcedureId();
      const completed = proc.status === 'completed';
      const performedAt = completed ? notFuture(proc.performedAt) ?? proc.scheduledDate : null;
      const service = lookups.serviceByProcedureTemplate.get(template.id);
      const unitPrice = lookups.priceOf(service ?? null, encounter.plan.paymentMode);

      rows.push({
        id,
        attendanceId: encounter.attendanceId,
        templateId: template.id,
        serviceCatalogId: service?.id ?? null,
        status: proc.status,
        scheduledDate: proc.scheduledDate,
        performedAt: performedAt ?? undefined,
        performedById: completed || proc.status === 'in_progress' ? lookups.actorId(proc.surgeon) : undefined,
        assistantId: completed || proc.status === 'in_progress' ? lookups.actorId(proc.assistant ?? proc.surgeon) : undefined,
        notes: proc.notes ?? undefined,
        complications: proc.complications,
        outcome: completed ? proc.outcome : undefined,
        // What the patient is charged, priced the same way the bill will price it.
        cost: completed ? money(unitPrice) : undefined,
        duration: completed ? proc.durationMinutes : template.duration || undefined,
        bloodLoss: completed ? proc.bloodLossMl ?? undefined : undefined,
        anesthesiaNotes: completed ? proc.anesthesiaNotes ?? undefined : undefined,
        intraOperativeNotes: completed ? proc.intraOperativeNotes ?? undefined : undefined,
        postOperativeNotes: completed ? proc.postOperativeNotes ?? undefined : undefined,
        clinicalRecord: (completed ? proc.clinicalRecord : {
          theatre: (proc.clinicalRecord as any)?.theatre ?? null,
          checklist: 'Not yet started - procedure is on the theatre list.',
        }) as Prisma.InputJsonValue,
        createdById: lookups.actorId(proc.creator),
      });
      encounter.procIds[position] = id;
    });
  }

  await writeMany('procedures', (part) => prisma.procedure.createMany({ data: part }), rows, stats, planned);
};
