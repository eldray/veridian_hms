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
  // Why a plan was not written. They are different problems, so they are counted apart.
  const skipped = { noInsuredVisit: 0, noPricedService: 0 };

  for (const plan of preAuths) {
    const encounter = encounters.get(plan.attendanceKey);
    const payer = encounter ? payerByAttendance.get(encounter.attendanceId) : undefined;
    const patientId = payer?.patientId ?? encounter?.patientId ?? null;
    const insuranceProviderId = payer?.insuranceProviderId ?? null;
    if (!encounter || !patientId || !insuranceProviderId) { skipped.noInsuredVisit++; continue; }

    const requested = plan.serviceKinds
      .map((kind) => resolveEstimateLine(lookups, encounter, { kind: kind.kind, index: kind.index, quantity: 1 } as GeneratedBillLinePlan))
      .filter((line): line is NonNullable<typeof line> => line !== null);
    if (!requested.length) { skipped.noPricedService++; continue; }

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
  const why = [
    skipped.noInsuredVisit ? `${skipped.noInsuredVisit} visit has no patient or insurer` : '',
    skipped.noPricedService ? `${skipped.noPricedService} no requested line could be priced` : '',
  ].filter(Boolean).join(', ');
  console.log(`✅ ${rows.length}/${preAuths.length} pre-authorisations${why ? ` (skipped: ${why})` : ''}`);
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
 * What the payer answered the submitted period, written the way the tracking endpoints
 * write it: one submission, an adjudication, then the remittances that arrived. Amounts
 * are fractions of the batch because a batch is worth whatever its claims add up to, and
 * that is only known once they are priced.
 */
const batchTrackingRows = (
  batchId: string,
  totalAmount: number,
  plan: GeneratedClaimBatch,
  lookups: Lookups,
): Prisma.ClaimBatchTrackingEventCreateManyInput[] => {
  const response = plan.payerResponse;
  if (!response) return [];
  const recordedById = lookups.actorId(response.recorder);
  const rows: Prisma.ClaimBatchTrackingEventCreateManyInput[] = [{
    batchId,
    eventType: 'submission',
    status: null,
    submissionDate: response.submittedAt,
    payerReference: response.payerReference,
    amount: null,
    paymentReference: null,
    paymentMethod: null,
    notes: 'Batch file transmitted to the payer for the period.',
    recordedById,
    createdAt: response.submittedAt,
  }];
  if (response.adjudication) {
    rows.push({
      batchId,
      eventType: 'adjudication',
      status: response.adjudication.status,
      submissionDate: null,
      payerReference: response.payerReference,
      amount: null,
      paymentReference: null,
      paymentMethod: null,
      notes: response.adjudication.notes,
      recordedById,
      createdAt: response.adjudication.at,
    });
  }
  for (const payment of response.payments) {
    rows.push({
      batchId,
      eventType: 'payment',
      status: null,
      submissionDate: null,
      payerReference: response.payerReference,
      amount: money(totalAmount * payment.fraction),
      paymentReference: payment.reference,
      paymentMethod: payment.method,
      notes: 'Remittance received against the submitted period.',
      recordedById,
      createdAt: payment.at,
    });
  }
  return rows;
};

/**
 * The G-DRG family an NHIS claim is filed under — the MDC of its principal G-DRG line. Null when
 * the claim has no package code at all, which is a claim the payer cannot be billed for.
 */
const nhisFamilyOf = (claim?: {
  items?: Array<{ itemCategory: string; gdrgTariff: { mdc: string } | null } | null>;
} | null): string | null =>
  claim?.items?.find((item) => item?.itemCategory === 'gdrg')?.gdrgTariff?.mdc ?? null;

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
  const refusals: string[] = [];
  let rejected = 0;
  let notFinalizable = 0;
  let uncodedClaims = 0;

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
          // The generator's narrative is only the payer's reply; the service's own note
          // records the CCC and the tariff, which is what the claim form prints.
          notes: plan.notes ? `${claim.notes ?? ''} ${plan.notes}`.trim() : claim.notes,
        },
      });

      // A period is only ever submitted after the app has accepted it, so the demo finalizes through
      // the same guard the Finalize button runs. A claim that fails it - a line whose G-DRG family
      // contradicts the type of service - stays a draft instead of being stamped finalized behind the
      // endpoints' back, and is reported so the gap gets fixed at the source.
      let finalizedAsOf: Date | null = null;
      if (plan.status === 'finalized' && plan.finalizedAt) {
        const finalizerId = plan.finalizedBy ? lookups.actorId(plan.finalizedBy) : createdById;
        try {
          await service.finalizeClaim(claim.id, finalizerId);
          finalizedAsOf = plan.finalizedAt;
          await prisma.insuranceClaim.update({
            where: { id: claim.id },
            data: { finalizedAt: plan.finalizedAt, finalizedById: finalizerId, updatedAt: plan.finalizedAt },
          });
        } catch (error) {
          notFinalizable++;
          if (refusals.length < 5) refusals.push((error instanceof Error ? error.message : String(error)).slice(0, 110));
        }
      }
      if (!finalizedAsOf) {
        await prisma.insuranceClaim.update({ where: { id: claim.id }, data: { updatedAt: plan.createdAt } });
      }
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
    select: {
      id: true,
      totalClaimAmount: true,
      insuranceProviderId: true,
      corporateAccountId: true,
      status: true,
      items: { select: { itemCategory: true, gdrgTariff: { select: { mdc: true } } } },
    },
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
  const batchEventRows: Prisma.ClaimBatchTrackingEventCreateManyInput[] = [];
  const batchLink: Array<{ batchId: string; claimIds: string[] }> = [];
  for (const plan of claimBatches) {
    const claimIds = (claimsByBatch.get(plan.key) ?? []).filter((id) => claimById.get(id)?.status === ENUMS.claimStatus.finalized);
    if (!claimIds.length) continue;

    // One batch is one payer's claim for one period — the app refuses to merge two insurers into a
    // single submission — and NHIS splits that further: the payer adjudicates one G-DRG family at a
    // time, so a month of NHIS claims becomes a batch per family.
    const perFilingGroup = new Map<string, string[]>();
    let heldBackUncoded = 0;
    for (const id of claimIds) {
      const claim = claimById.get(id);
      const family = plan.insuranceType === ENUMS.insuranceType.nhis ? nhisFamilyOf(claim) : 'ALL';
      // A claim with no G-DRG line has no package to be paid under. The app holds it back for
      // coding, so the demo leaves it unbatched too rather than filing a batch that would bounce.
      if (!family) { heldBackUncoded++; continue; }
      const key = `${claim?.insuranceProviderId ?? 'none'}|${claim?.corporateAccountId ?? 'none'}|${family}`;
      const list = perFilingGroup.get(key) ?? [];
      list.push(id);
      perFilingGroup.set(key, list);
    }
    uncodedClaims += heldBackUncoded;
    const payerParts = [...perFilingGroup.entries()];

    for (const [payerKey, partClaimIds] of payerParts) {
      const [providerId, accountId, family] = payerKey.split('|');
      const totalAmount = money(partClaimIds.reduce((sum, id) => sum + toNumber(claimById.get(id)?.totalClaimAmount), 0));
      const id = `seedcb-${(batchRows.length + 1).toString().padStart(4, '0')}`;
      batchRows.push({
        id,
        batchNumber: payerParts.length > 1 ? `${plan.batchNumber}-${batchRows.length + 1}` : plan.batchNumber,
        insuranceType: ENUMS.insuranceType[plan.insuranceType as keyof typeof ENUMS.insuranceType] ?? ENUMS.insuranceType.nhis,
        insuranceProviderId: providerId === 'none' ? null : providerId,
        // A batch belongs to one payer; for a corporate batch that is the contracted employer, and
        // the claims carry the same account.
        corporateAccountId: accountId === 'none' ? null : accountId,
        claimFamily: family,
        periodYear: plan.periodYear,
        periodMonth: plan.periodMonth,
        totalClaims: partClaimIds.length,
        totalAmount,
        status: ENUMS.batchStatus[plan.status as keyof typeof ENUMS.batchStatus] ?? ENUMS.batchStatus.generated,
        generatedAt: plan.generatedAt,
        finalizedAt: plan.finalizedAt,
        finalizedById: plan.finalizedBy ? lookups.actorId(plan.finalizedBy) : null,
        description: family === 'ALL' ? plan.description : `${plan.description} — ${family} claims`,
        createdById: lookups.actorId(plan.createdBy),
        createdAt: plan.generatedAt,
      });
      batchEventRows.push(...batchTrackingRows(id, totalAmount, plan, lookups));
      batchLink.push({ batchId: id, claimIds: partClaimIds });
    }
  }

  await writeMany('claim batches', (part) => prisma.claimBatch.createMany({ data: part }), batchRows, stats, planned);
  await writeMany(
    'batch tracking events',
    (part) => prisma.claimBatchTrackingEvent.createMany({ data: part, skipDuplicates: true }),
    batchEventRows,
    stats,
    planned,
  );
  for (const link of batchLink) {
    await prisma.insuranceClaim.updateMany({ where: { id: { in: link.claimIds } }, data: { batchId: link.batchId } });
  }

  const settledBatches = new Set(batchEventRows.filter((row) => row.eventType === 'payment').map((row) => row.batchId)).size;
  console.log(`✅ ${claimIdByKey.size}/${claims.length} claims generated, ${batchRows.length} batches, ${batchEventRows.length} payer events (${settledBatches} batches with a remittance)`);
  if (uncodedClaims) console.log(`   ${uncodedClaims} NHIS claims carry no G-DRG code and were left unbatched for coding`);
  if (notFinalizable) console.log(`   ${notFinalizable} claims the app refuses to finalize stayed drafts - ${refusals.join(' | ')}`);
  if (rejected) console.log(`   ${rejected} claim plans could not be generated - ${notes.join(' | ') || 'no bill or no covered line'}`);
};
