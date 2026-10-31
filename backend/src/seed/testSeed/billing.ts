// src/seed/testSeed/billing.ts
//
// Money. Every bill here is produced by the application's own BillRepository, because
// that is the only way the seeded invoice can agree with what the API would have
// calculated: the tariff in force on the day of care, the payer rules for that service,
// the NHIS medicine allocation, the ward charges that were still unbilled.
//
// Two things the repository cannot do for a demo run are done here afterwards:
// the tariff history has to exist for the past year, and the dates have to move back
// from "now" to the encounter they belong to.
import { Prisma } from '@prisma/client';
import { BillRepository } from '../../modules/bill/BillRepository.js';
import type { GeneratedBill, GeneratedWaiver } from '../bulkGenerator.js';
import { ENUMS, type Lookups } from './lookups.js';
import type { EncounterIndex } from './encounters.js';
import { hashOf, money, prisma, toNumber, writeMany, type SeedStats } from './shared.js';

/** The demo history is one year deep; this tariff is back-dated a little further. */
const PRICING_HISTORY_DAYS = 420;

let pricingCounter = 0;
const nextPricingId = () => `seedprice-${(++pricingCounter).toString().padStart(6, '0')}`;

/**
 * coreSeed writes one tariff per service, effective today, so a visit from six months
 * ago prices at nothing and the bill comes out empty. Add the same prices as a
 * historical revision that expires when the current one starts, leaving the two rows
 * end to end with no gap.
 */
export const backfillHistoricalPricing = async (stats: SeedStats, planned: SeedStats): Promise<number> => {
  const current = await prisma.servicePricing.findMany({ where: { isActive: true, expiryDate: null } });
  const alreadyBackdated = new Set(
    (await prisma.servicePricing.findMany({
      where: { id: { startsWith: 'seedprice-' } },
      select: { serviceCatalogId: true },
    })).map((row) => row.serviceCatalogId),
  );

  const from = new Date(Date.now() - PRICING_HISTORY_DAYS * 86_400_000);
  const rows: Prisma.ServicePricingCreateManyInput[] = [];
  for (const price of current) {
    if (alreadyBackdated.has(price.serviceCatalogId)) continue;
    if (price.effectiveDate.getTime() <= from.getTime()) continue;
    rows.push({
      id: nextPricingId(),
      serviceCatalogId: price.serviceCatalogId,
      cashPrice: price.cashPrice,
      nhisPrice: price.nhisPrice,
      insurancePrice: price.insurancePrice,
      corporatePrice: price.corporatePrice,
      vatRate: price.vatRate,
      isTaxable: price.isTaxable,
      isActive: true,
      effectiveDate: from,
      // The current revision takes over the moment this one ends, so a visit is
      // always priced by exactly one of the two.
      expiryDate: price.effectiveDate,
    });
  }

  await writeMany('tariff history', (part) => prisma.servicePricing.createMany({ data: part, skipDuplicates: true }), rows, stats, planned);
  console.log(`✅ ${rows.length} historical tariff revisions`);
  return rows.length;
};

export interface BillRecordRef {
  billId: string;
  billNumber: string;
  attendanceId: string;
  totalAmount: number;
  patientPayable: number;
  insuranceCovered: number;
  balance: number;
  paymentMode: string;
}

const recomputeAttendanceTotals = async (attendanceId: string): Promise<void> => {
  const totals = await prisma.bill.aggregate({
    where: { attendanceId, status: { not: 'cancelled' } },
    _sum: { totalAmount: true, paidAmount: true, balance: true },
  });
  await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      totalBill: money(toNumber(totals._sum.totalAmount)),
      paidAmount: money(toNumber(totals._sum.paidAmount)),
      outstandingBalance: money(toNumber(totals._sum.balance)),
    },
  });
};

const waiversByPlanNumber = (waivers: GeneratedWaiver[]): Map<string, GeneratedWaiver[]> => {
  const out = new Map<string, GeneratedWaiver[]>();
  for (const waiver of waivers) {
    const list = out.get(waiver.billNumber) ?? [];
    list.push(waiver);
    out.set(waiver.billNumber, list);
  }
  return out;
};

/**
 * One bill per attendance, generated from what was actually rendered, then paid,
 * waived or cancelled the way the ward clerk's screen would do it.
 *
 * Returns the bills keyed by the generator's own attendance key so claims and waivers
 * can be attached, and keyed by the generator's bill number so a waiver plan that only
 * knows that number still finds its row.
 */
export const seedBills = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  bills: GeneratedBill[],
  waivers: GeneratedWaiver[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<Map<string, BillRecordRef>> => {
  const repository = new BillRepository(prisma);
  const byAttendanceKey = new Map<string, BillRecordRef>();
  const waiverPlans = waiversByPlanNumber(waivers);
  const outcomes: Record<string, number> = {};
  const note = (reason: string) => { outcomes[reason] = (outcomes[reason] ?? 0) + 1; };

  planned['bills'] = (planned['bills'] ?? 0) + bills.length;

  for (const plan of bills) {
    const encounter = encounters.get(plan.attendanceKey);
    if (!encounter) { note('skipped: no encounter'); continue; }

    const createdById = lookups.actorId({ role: 'records', salt: hashOf(plan.billNumber) });
    let generated: any;
    try {
      generated = await repository.generateFromEncounter(encounter.attendanceId, createdById);
    } catch (error: any) {
      // A visit with nothing completed and nothing dispensed genuinely has no bill.
      note(/No billable items|legacy bill/i.test(String(error?.message)) ? 'skipped: nothing billable' : `rejected: ${String(error?.message).slice(0, 60)}`);
      continue;
    }
    if (!generated?.id) { note('skipped: nothing billable'); continue; }

    // ── Waivers first: they reduce the liability the payment is then made against ──
    let waiverAmount = 0;
    for (const waiverPlan of waiverPlans.get(plan.billNumber) ?? []) {
      const patientId = encounter.patientId;
      if (!patientId) { note('waiver skipped: counter bill'); continue; }
      const requested = money(toNumber(generated.patientPayable) * waiverPlan.fraction);
      const approved = waiverPlan.status === 'approved' ? requested : 0;
      const waiver = await prisma.patientWaiver.create({
        data: {
          patientId,
          billId: generated.id,
          waiverType: ENUMS.waiverType[waiverPlan.waiverType as keyof typeof ENUMS.waiverType] ?? ENUMS.waiverType.other,
          reason: waiverPlan.reason,
          amountRequested: requested,
          amountApproved: approved,
          status: ENUMS.waiverStatus[waiverPlan.status as keyof typeof ENUMS.waiverStatus] ?? ENUMS.waiverStatus.pending,
          requestedById: lookups.actorId(waiverPlan.requestedBy),
          approvedById: waiverPlan.approvedBy ? lookups.actorId(waiverPlan.approvedBy) : null,
          approvedAt: waiverPlan.approvedAt,
          rejectionReason: waiverPlan.rejectionReason,
          appliedAt: null,
          createdAt: waiverPlan.appliedAt,
          updatedAt: waiverPlan.approvedAt ?? waiverPlan.appliedAt,
        },
      });
      if (waiverPlan.status !== 'approved' || approved <= 0) continue;
      try {
        // The repository holds the bill row, checks the liability and writes back the
        // balance - the same guard the API applies before a waiver is honoured.
        generated = await repository.applyWaiver(generated.id, waiver.id);
        waiverAmount += approved;
        stats['waivers applied'] = (stats['waivers applied'] ?? 0) + 1;
      } catch (error: any) {
        note(`waiver not applied: ${String(error?.message).slice(0, 40)}`);
      }
    }

    // ── Payments against whatever the patient still owes ──
    const payableAfterWaiver = Math.max(0, money(toNumber(generated.patientPayable)));
    const targetBalance = Math.max(0, money(toNumber(generated.balance)));
    const payAmount = plan.status === 'cancelled' ? 0 : money(Math.min(targetBalance, payableAfterWaiver * plan.paymentFraction));
    let paidAmount = toNumber(generated.paidAmount);
    if (payAmount > 0) {
      try {
        const { payment } = await repository.addPayment(
          generated.id,
          {
            amount: payAmount,
            paymentMethod: ENUMS.paymentMethod[plan.paymentMethod as keyof typeof ENUMS.paymentMethod] ?? ENUMS.paymentMethod.cash,
            reference: plan.receiptReference,
            notes: plan.paymentMethod === 'cheque' ? 'Cheque received and receipted.' : undefined,
            idempotencyKey: `seed:${generated.billNumber}`,
          },
          lookups.actorId({ role: 'records', salt: hashOf(generated.billNumber) }),
        );
        paidAmount = money(paidAmount + payAmount);
        // The clerk records the collection on the day the bill was raised, not on the
        // day this run happened to execute.
        await prisma.payment.update({
          where: { id: payment.id },
          data: { transactionDate: plan.billDate, createdAt: plan.billDate, updatedAt: plan.billDate },
        });
        stats['payments'] = (stats['payments'] ?? 0) + 1;
        generated = await prisma.bill.findUnique({ where: { id: generated.id } });
      } catch (error: any) {
        note(`payment rejected: ${String(error?.message).slice(0, 40)}`);
      }
    }

    // ── Dates the repository cannot know ──
    const finalBalance = Math.max(0, money(payableAfterWaiver - paidAmount));
    const status = plan.status === 'cancelled'
      ? ENUMS.billStatus.cancelled
      : finalBalance <= 0 ? ENUMS.billStatus.paid : paidAmount > 0 ? ENUMS.billStatus.partial : ENUMS.billStatus.pending;
    if (plan.status === 'cancelled') {
      // Cancellation reverses a corporate credit, exactly as the status endpoint does.
      if (plan.paymentMode === 'corporate' && generated.corporateAccountId) {
        await prisma.corporateAccount.update({
          where: { id: generated.corporateAccountId },
          data: { currentBalance: { decrement: money(toNumber(generated.totalAmount)) } },
        });
      }
      paidAmount = 0;
    }

    await prisma.bill.update({
      where: { id: generated.id },
      data: {
        billDate: plan.billDate,
        dueDate: plan.dueDate,
        createdAt: plan.billDate,
        updatedAt: plan.billDate,
        waiverAmount: money(waiverAmount),
        // A cancelled visit is not a collection: the bill stands as evidence and the
        // money goes back to zero so it never appears in a revenue total.
        ...(plan.status === 'cancelled' ? { paidAmount: 0, balance: 0 } : { paidAmount: money(paidAmount), balance: finalBalance }),
        status,
        graValidationStatus: plan.graValidated ? ENUMS.graValidationStatus.validated : ENUMS.graValidationStatus.pending,
        graDeclarationCode: plan.graValidated ? `GRA-${generated.billNumber}` : null,
        graQrCodeData: plan.graValidated
          ? JSON.stringify({ invoiceId: generated.billNumber, totalAmount: toNumber(generated.totalAmount), billDate: plan.billDate.toISOString().slice(0, 10) })
          : null,
      },
    });
    // The lines carry their own creation stamp, which the void workflow reads.
    await prisma.billLineItem.updateMany({
      where: { billId: generated.id },
      data: { createdAt: plan.billDate },
    });

    encounter.billId = generated.id;
    encounter.billNumber = generated.billNumber;
    byAttendanceKey.set(plan.attendanceKey, {
      billId: generated.id,
      billNumber: generated.billNumber,
      attendanceId: encounter.attendanceId,
      totalAmount: money(toNumber(generated.totalAmount)),
      patientPayable: money(toNumber(generated.patientPayable)),
      insuranceCovered: money(toNumber(generated.insuranceCovered)),
      balance: plan.status === 'cancelled' ? 0 : finalBalance,
      paymentMode: plan.paymentMode,
    });
    stats['bills'] = (stats['bills'] ?? 0) + 1;

    await recomputeAttendanceTotals(encounter.attendanceId);
  }

  console.log(`✅ ${byAttendanceKey.size} bills generated from the encounters that had billable work`);
  for (const [reason, count] of Object.entries(outcomes)) {
    if (count >= 5 || !reason.startsWith('skipped')) console.log(`   ${reason}: ${count}`);
  }
  return byAttendanceKey;
};
