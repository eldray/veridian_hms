// src/seed/testSeed/claims.ts
//
// The payer paperwork: the prior authorisation a covered visit asks for, the
// eligibility enquiry that proved the membership, the claim the facility files
// against the bill, and the batch those claims are submitted in.
//
// Claims are produced by the application's own InsuranceClaimService. A seeded claim
// therefore carries the item lines, the G-DRG tariff and the insurer-covered amounts
// that the generate endpoint would have produced for the same visit, and the claims
// list, the print view and the NHIS batch XML all read the rows back coherently.
// What the service cannot know - that this visit happened in the past, that the claim
// was later finalised and part-paid - is corrected afterwards, the same way billing
// post-corrects the dates it inherited from "now".
import { Prisma } from '@prisma/client';
import { InsuranceClaimService } from '../../modules/insuranceClaim/InsuranceClaimService.js';
import type {
  GeneratedBillLinePlan, GeneratedClaim, GeneratedClaimBatch, GeneratedEligibilityCheck, GeneratedPreAuth,
} from '../bulkGenerator.js';
import { ENUMS, type Lookups } from './lookups.js';
import type { EncounterIndex } from './encounters.js';
import type { PatientRecords } from './patients.js';
import { resolveEstimateLine } from './finance.js';
import { chunk, hashOf, money, prisma, toNumber, writeMany, type SeedStats } from './shared.js';

/** The payer each encounter was actually billed under, read back from the row. */
interface EncounterPayer {
  insuranceProviderId: string | null;
  patientId: string | null;
}

const loadPayers = async (attendanceIds: string[]): Promise<Map<string, EncounterPayer>> => {
  const out = new Map<string, EncounterPayer>();
  for (const part of chunk(attendanceIds, 1000)) {
    const rows = await prisma.attendance.findMany({
      where: { id: { in: part } },
      select: { id: true, insuranceProviderId: true, patientId: true },
    });
    for (const row of rows) out.set(row.id, { insuranceProviderId: row.insuranceProviderId, patientId: row.patientId });
  }
  return out;
};

/**
 * Prior authorisation. A covered visit asks the payer before the service is given, and
 * the answer decides whether the medicine line is insurer-paid or patient-paid, so these
 * rows have to exist before billing runs.
 *
 * The approved payload must name the exact stock item and at least the quantity the
 * prescription uses - the application's matcher fails closed on anything vaguer, so a
 * loosely described approval would silently turn a covered visit into a cash one.
 */
export const seedPreAuthorisations = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  preAuths: GeneratedPreAuth[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const payerByAttendance = await loadPayers([...encounters.values()].map((e) => e.attendanceId));
  const rows: Prisma.PreAuthorisationRequestCreateManyInput[] = [];
  let unresolved = 0;

  for (const plan of preAuths) {
    const encounter = encounters.get(plan.attendanceKey);
    const payer = encounter ? payerByAttendance.get(encounter.attendanceId) : undefined;
    const patientId = payer?.patientId ?? encounter?.patientId ?? null;
    const insuranceProviderId = payer?.insuranceProviderId ?? null;
    if (!encounter || !patientId || !insuranceProviderId) { unresolved++; continue; }

    const requested = plan.serviceKinds
      .map((kind) => resolveEstimateLine(lookups, encounter, { kind: kind.kind, index: kind.index, quantity: 1 } as GeneratedBillLinePlan))
      .filter((line): line is NonNullable<typeof line> => line !== null);
    if (!requested.length) { unresolved++; continue; }

    const status = ENUMS.preAuthStatus[plan.status as keyof typeof ENUMS.preAuthStatus] ?? ENUMS.preAuthStatus.pending;
    const decided = status === ENUMS.preAuthStatus.approved || status === ENUMS.preAuthStatus.partially_approved;
    // A partial approval funds part of what was asked for - here, every line but the last.
    const approvedLines = status === ENUMS.preAuthStatus.approved
      ? requested
      : decided ? requested.slice(0, Math.max(1, requested.length - 1)) : [];
    const approvedAmount = money(approvedLines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));

    rows.push({
      referenceNumber: plan.referenceNumber,
      attendanceId: encounter.attendanceId,
      patientId,
      insuranceProviderId,
      requestedById: lookups.actorId(plan.requestedBy),
      requestedAt: plan.requestedAt,
      requestedServices: requested.map((line) => ({
        serviceCatalogId: line.serviceCatalogId,
        description: line.description,
        serviceType: line.serviceType,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })) as unknown as Prisma.InputJsonValue,
      estimatedTotalCost: money(requested.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)),
      clinicalJustification: plan.clinicalJustification,
      status,
      responseReceivedAt: plan.responseReceivedAt,
      approvedAmount: decided ? approvedAmount : null,
      approvedServices: decided
        ? (approvedLines.map((line) => ({
          serviceCatalogId: line.serviceCatalogId,
          stockItemId: line.stockItemId,
          description: line.description,
          quantity: line.quantity,
          approvedQuantity: line.quantity,
          unitPrice: line.unitPrice,
        })) as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
      rejectionReason: plan.rejectionReason,
      authNumber: plan.authNumber,
      authExpiry: plan.authExpiry,
      updatedById: plan.responseReceivedAt ? lookups.fallbackIds.accounts : null,
      createdAt: plan.requestedAt,
      updatedAt: plan.responseReceivedAt ?? plan.requestedAt,
    });
  }

  await writeMany('pre-authorisations', (part) => prisma.preAuthorisationRequest.createMany({ data: part, skipDuplicates: true }), rows, stats, planned);
  console.log(`✅ ${rows.length}/${preAuths.length} pre-authorisations${unresolved ? `, ${unresolved} without a covered service` : ''}`);
};

/**
 * The eligibility enquiry a front-desk officer runs before registering a member. The
 * application has no writer for this table - it is populated by the live NHIS gateway -
 * so the seed records the response payload the gateway would have stored.
 */
export const seedEligibilityChecks = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  patients: PatientRecords,
  checks: GeneratedEligibilityCheck[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const rows: Prisma.NHISEligibilityCheckCreateManyInput[] = [];
  const names = new Map<string, { surname: string; otherNames: string }>();
  for (const part of chunk([...patients.idByFolder.values()], 1000)) {
    const found = await prisma.patient.findMany({
      where: { id: { in: part } },
      select: { id: true, surname: true, otherNames: true },
    });
    for (const patient of found) names.set(patient.id, { surname: patient.surname, otherNames: patient.otherNames });
  }

  const facilityCode = lookups.facility?.nhisFacilityCode ?? null;
  for (const plan of checks) {
    const patientId = patients.idByFolder.get(plan.folderNumber);
    if (!patientId) continue;
    const attendanceId = plan.attendanceKey ? encounters.get(plan.attendanceKey)?.attendanceId ?? null : null;
    const active = plan.status === 'active';
    const name = names.get(patientId);
    rows.push({
      patientId,
      attendanceId,
      membershipId: plan.membershipId,
      checkMethod: ENUMS.eligibilityMethod[plan.checkMethod as keyof typeof ENUMS.eligibilityMethod] ?? ENUMS.eligibilityMethod.manual,
      checkTimestamp: plan.at,
      status: ENUMS.eligibilityStatus[plan.status as keyof typeof ENUMS.eligibilityStatus] ?? ENUMS.eligibilityStatus.not_found,
      memberName: name ? `${name.surname} ${name.otherNames}`.trim() : null,
      // The gateway only names a facility when the membership actually resolves to it.
      registeredFacilityCode: active ? facilityCode : null,
      ccCode: plan.ccCode,
      membershipExpiry: plan.membershipExpiry,
      responseReference: `NHIA-${plan.membershipId.slice(-8)}-${(hashOf(plan.membershipId) % 100000).toString().padStart(5, '0')}`,
      rawResponse: {
        policyNumber: plan.membershipId,
        status: plan.status,
        facilityCode: active ? facilityCode : null,
        checkedAt: plan.at.toISOString(),
      } as unknown as Prisma.InputJsonValue,
      checkedById: lookups.actorId(plan.checkedBy),
      createdAt: plan.at,
    });
  }

  await writeMany('eligibility checks', (part) => prisma.nHISEligibilityCheck.createMany({ data: part, skipDuplicates: true }), rows, stats, planned);
  console.log(`✅ ${rows.length}/${checks.length} NHIS eligibility checks`);
};

/**
 * Claims, one per covered and billed visit, then the batches the finalised ones are
 * submitted in.
 *
 * A claim the application would refuse is refused here too and reported as skipped:
 * an unmapped diagnosis, a medicine without a configured NHIS rule, a bill with no
 * insurer-covered line. Inventing those rows would put claim totals the endpoints
 * cannot reproduce into the demo.
 */
export const seedClaims = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  claims: GeneratedClaim[],
  claimBatches: GeneratedClaimBatch[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const service = new InsuranceClaimService(prisma);
  const payerByAttendance = await loadPayers([...encounters.values()].map((e) => e.attendanceId));
  const claimIdByKey = new Map<string, string>();
  const notes: string[] = [];
  let rejected = 0;

  for (const plan of claims) {
    const encounter = encounters.get(plan.attendanceKey);
    const patientId = encounter ? payerByAttendance.get(encounter.attendanceId)?.patientId : null;
    if (!encounter?.billId || !patientId) { rejected++; continue; }
    const createdById = lookups.actorId(plan.createdBy);

    try {
      const generated = plan.insuranceType === 'nhis'
        ? await service.generateNHISClaim(encounter.attendanceId, createdById)
        : plan.insuranceType === 'private'
          ? await service.generatePrivateInsuranceClaim(encounter.attendanceId, createdById)
          : await service.generateCorporateClaim(encounter.attendanceId, createdById);
      const claim = generated.claim;

      await prisma.insuranceClaim.update({
        where: { id: claim.id },
        data: {
          createdAt: plan.createdAt,
          updatedAt: plan.finalizedAt ?? plan.createdAt,
          ...(plan.status === 'finalized' && plan.finalizedAt
            ? {
              status: ENUMS.claimStatus.finalized,
              finalizedAt: plan.finalizedAt,
              finalizedById: plan.finalizedBy ? lookups.actorId(plan.finalizedBy) : createdById,
            }
            : {}),
          // The generator's narrative is only the payer's reply; the service's own note
          // records the CCC and the tariff, which is what the claim form prints.
          notes: plan.notes ? `${claim.notes ?? ''} ${plan.notes}`.trim() : claim.notes,
        },
      });
      claimIdByKey.set(plan.key, claim.id);

      const references = new Set<string>();
      const events: Prisma.InsuranceClaimTrackingEventCreateManyInput[] = [];
      for (const event of plan.trackingEvents) {
        // paymentReference is unique per claim, so a repeated remittance reference is
        // recorded once with the amounts of every instalment it covers.
        if (event.paymentReference && references.has(event.paymentReference)) continue;
        if (event.paymentReference) references.add(event.paymentReference);
        events.push({
          claimId: claim.id,
          eventType: event.eventType,
          status: event.status,
          submissionDate: event.at,
          payerReference: event.payerReference,
          amount: event.amount === null ? null : money(event.amount),
          paymentReference: event.paymentReference,
          paymentMethod: event.paymentMethod,
          notes: event.notes,
          recordedById: lookups.actorId(event.recorder),
          createdAt: event.at,
        });
      }
      if (events.length) await prisma.insuranceClaimTrackingEvent.createMany({ data: events });
    } catch (error) {
      rejected++;
      const message = error instanceof Error ? error.message : String(error);
      if (notes.length < 5) notes.push(message.slice(0, 90));
    }
  }

  planned.claims = (planned.claims ?? 0) + claims.length;
  stats.claims = (stats.claims ?? 0) + claimIdByKey.size;

  // ── Batches: the finalised claims grouped by payer and period ──
  const claimsById = await prisma.insuranceClaim.findMany({
    where: { id: { in: [...claimIdByKey.values()] } },
    select: { id: true, totalClaimAmount: true, insuranceProviderId: true, status: true },
  });
  const claimById = new Map(claimsById.map((claim) => [claim.id, claim]));
  const claimsByBatch = new Map<string, string[]>();
  for (const plan of claims) {
    const id = claimIdByKey.get(plan.key);
    if (!id || !plan.batchKey) continue;
    const list = claimsByBatch.get(plan.batchKey) ?? [];
    list.push(id);
    claimsByBatch.set(plan.batchKey, list);
  }

  const batchRows: Prisma.ClaimBatchCreateManyInput[] = [];
  const batchLink: Array<{ batchId: string; claimIds: string[] }> = [];
  for (const plan of claimBatches) {
    const claimIds = (claimsByBatch.get(plan.key) ?? []).filter((id) => claimById.get(id)?.status === ENUMS.claimStatus.finalized);
    if (!claimIds.length) continue;
    const totalAmount = money(claimIds.reduce((sum, id) => sum + toNumber(claimById.get(id)?.totalClaimAmount), 0));
    const providerIds = new Set(claimIds.map((id) => claimById.get(id)?.insuranceProviderId ?? null));
    const singleProvider = providerIds.size === 1 ? [...providerIds][0] : null;
    const id = `seedcb-${(batchRows.length + 1).toString().padStart(4, '0')}`;
    batchRows.push({
      id,
      batchNumber: plan.batchNumber,
      insuranceType: ENUMS.insuranceType[plan.insuranceType as keyof typeof ENUMS.insuranceType] ?? ENUMS.insuranceType.nhis,
      insuranceProviderId: singleProvider,
      // A batch groups a payer's claims for one period; the corporate account stays on
      // each claim, since a period batch can span several contracted employers.
      corporateAccountId: null,
      periodYear: plan.periodYear,
      periodMonth: plan.periodMonth,
      totalClaims: claimIds.length,
      totalAmount,
      status: ENUMS.batchStatus[plan.status as keyof typeof ENUMS.batchStatus] ?? ENUMS.batchStatus.generated,
      generatedAt: plan.generatedAt,
      finalizedAt: plan.finalizedAt,
      finalizedById: plan.finalizedBy ? lookups.actorId(plan.finalizedBy) : null,
      description: plan.description,
      createdById: lookups.actorId(plan.createdBy),
      createdAt: plan.generatedAt,
    });
    batchLink.push({ batchId: id, claimIds });
  }

  await writeMany('claim batches', (part) => prisma.claimBatch.createMany({ data: part }), batchRows, stats, planned);
  for (const link of batchLink) {
    await prisma.insuranceClaim.updateMany({ where: { id: { in: link.claimIds } }, data: { batchId: link.batchId } });
  }

  const eventCount = await prisma.insuranceClaimTrackingEvent.count();
  console.log(`✅ ${claimIdByKey.size}/${claims.length} claims generated, ${batchRows.length} batches, ${eventCount} tracking events`);
  if (rejected) console.log(`   ${rejected} claim plans could not be generated - ${notes.join(' | ') || 'no bill or no covered line'}`);
};
