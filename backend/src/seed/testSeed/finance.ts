// src/seed/testSeed/finance.ts
//
// The two documents that sit either side of care: the estimate a patient or a
// corporate account is quoted before treatment, and the purchase invoice that puts
// stock into a store.
//
// An estimate is never converted into a bill in this codebase - real bills are
// assembled from what was actually rendered - so a quote stands on its own and the
// generator's CONVERTED roll is recorded as APPROVED rather than as a link that
// nothing in the application would ever follow.
import { Prisma } from '@prisma/client';
import type { GeneratedEstimate, GeneratedBillLinePlan, GeneratedPurchaseInvoice } from '../bulkGenerator.js';
import { ENUMS, type Lookups, type ServiceRow } from './lookups.js';
import type { EncounterIndex } from './encounters.js';
import { type StockLedger } from './stockLedger.js';
import { corporateEnrolmentFor } from './patients.js';
import { hashOf, money, prisma, startOfToday, writeMany, type SeedStats } from './shared.js';

export interface EstimateLine {
  serviceCatalogId: string | null;
  /** The stock item behind a medicine or consumable line, so an authorisation can name it. */
  stockItemId: string | null;
  description: string;
  serviceType: typeof ENUMS.serviceType[keyof typeof ENUMS.serviceType];
  quantity: number;
  unitPrice: number;
}

/**
 * Resolve one planned bill line against rows the writers actually created for this
 * visit. The index is the position inside the per-attendance source array
 * (labs[0], medications[1], the ward day number), so it only matches when the writer
 * kept that position - which is what EncounterIndex records.
 */
export const resolveEstimateLine = (
  lookups: Lookups,
  encounter: EncounterIndex,
  line: GeneratedBillLinePlan,
): EstimateLine | null => {
  const paymentMode = encounter.plan.paymentMode;
  const discount = paymentMode === 'corporate' && encounter.plan.folderNumber
    ? corporateEnrolmentFor(lookups, encounter.plan.folderNumber)?.discountPercentage ?? 0
    : 0;
  const asType = (value: string) => ENUMS.serviceType[value as keyof typeof ENUMS.serviceType] ?? ENUMS.serviceType.miscellaneous;

  const fromService = (service: ServiceRow | null | undefined, fallbackName: string, quantity: number): EstimateLine | null => {
    if (!service) return null;
    const unitPrice = money(lookups.priceOf(service, paymentMode, discount));
    if (unitPrice <= 0) return null;
    return {
      serviceCatalogId: service.id,
      stockItemId: service.stockItemId ?? null,
      description: `${service.name} (${service.code})`,
      serviceType: asType(service.serviceType),
      quantity: Math.max(1, quantity),
      unitPrice,
    };
  };

  switch (line.kind) {
    case 'consultation':
      return fromService(
        encounter.consultationCode ? lookups.serviceByCode.get(encounter.consultationCode) ?? null : null,
        'Consultation',
        1,
      );
    case 'lab': {
      const plan = encounter.labPlans[line.index];
      return plan ? fromService(lookups.serviceByLabTemplate.get(plan.testCode), 'Laboratory test', line.quantity) : null;
    }
    case 'scan': {
      const plan = encounter.scanPlans[line.index];
      return plan ? fromService(lookups.serviceByScanTemplate.get(plan.scanCode), 'Imaging study', line.quantity) : null;
    }
    case 'procedure': {
      const plan = encounter.procPlans[line.index];
      return plan ? fromService(lookups.serviceByProcedureTemplate.get(plan.procedureCode), 'Procedure', line.quantity) : null;
    }
    case 'medication': {
      const plan = encounter.medPlans[line.index];
      if (!plan) return null;
      const stock = lookups.stockForDrugGroup(plan.drugGroup, plan.attendanceKey);
      const service = stock ? lookups.serviceByStockItem.get(stock.id) ?? null : null;
      return fromService(service, plan.nameFallback, Math.max(1, plan.quantity));
    }
    case 'ward': {
      const ward = encounter.wardId ? lookups.wardById.get(encounter.wardId) : null;
      if (!ward) return null;
      const unitPrice = money(lookups.wardDailyRate(ward, paymentMode, discount));
      if (unitPrice <= 0) return null;
      return {
        serviceCatalogId: lookups.wardServiceFor(ward)?.id ?? null,
        stockItemId: null,
        description: `${ward.wardName} - bed charge per day`,
        serviceType: ENUMS.serviceType.ward,
        quantity: Math.max(1, line.quantity),
        unitPrice,
      };
    }
    case 'consumable': {
      const stock = lookups.stockSlot(line.index);
      const service = stock ? lookups.serviceByStockItem.get(stock.id) ?? null : null;
      return service
        ? fromService(service, stock?.name ?? 'Consumable', line.quantity)
        : stock
          ? {
            serviceCatalogId: null,
            stockItemId: stock.id,
            description: stock.name,
            serviceType: ENUMS.serviceType.miscellaneous,
            quantity: Math.max(1, line.quantity),
            unitPrice: money(stock.costPrice * 1.2),
          }
          : null;
    }
    default:
      return null;
  }
};

let estimateCounter = 0;
const nextEstimateId = () => `seedest-${(++estimateCounter).toString().padStart(6, '0')}`;

/**
 * Proforma invoices, one per planned visit quote. Prices come from the same tariff
 * resolution the rest of the money in this seed uses, so an estimate and the bill that
 * later follows it cannot disagree about what a service costs.
 */
export const seedEstimates = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  estimates: GeneratedEstimate[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const headers: Prisma.ProformaInvoiceCreateManyInput[] = [];
  const lines: Prisma.ProformaInvoiceItemCreateManyInput[] = [];
  let skippedNoLines = 0;

  for (const plan of estimates) {
    const encounter = plan.attendanceKey ? encounters.get(plan.attendanceKey) : null;
    if (!encounter) continue;
    const patientId = encounter.patientId;
    // An estimate already raised for this visit would collide with the unique link,
    // and a walk-in ticket has no proforma header of its own to hang a quote on.
    if (!patientId) continue;

    const resolved = plan.items
      .map((line) => resolveEstimateLine(lookups, encounter, line))
      .filter((line): line is EstimateLine => line !== null);
    if (!resolved.length) { skippedNoLines++; continue; }

    const id = nextEstimateId();
    const subtotal = money(resolved.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
    const paymentMode = encounter.plan.paymentMode;
    const basis = ENUMS.paymentMode[paymentMode as keyof typeof ENUMS.paymentMode] ?? ENUMS.paymentMode.cash;
    const payerCovers = basis !== ENUMS.paymentMode.cash;
    const status = plan.status === 'CONVERTED' ? ENUMS.proformaStatus.APPROVED
      : ENUMS.proformaStatus[plan.status as keyof typeof ENUMS.proformaStatus] ?? ENUMS.proformaStatus.DRAFT;

    headers.push({
      id,
      referenceNumber: plan.referenceNumber,
      patientId,
      attendanceId: encounter.attendanceId,
      admissionId: encounter.admissionId,
      corporateAccountId: basis === ENUMS.paymentMode.corporate && encounter.plan.folderNumber
        ? corporateEnrolmentFor(lookups, encounter.plan.folderNumber)?.accountId ?? null
        : null,
      status,
      subtotal,
      discount: 0,
      taxAmount: 0,
      totalAmount: subtotal,
      validityDays: plan.validityDays,
      expiresAt: plan.expiresAt,
      notes: plan.notes,
      termsAndConditions: plan.termsAndConditions,
      createdById: lookups.actorId(plan.createdBy),
      approvedById: status === ENUMS.proformaStatus.APPROVED || status === ENUMS.proformaStatus.REJECTED
        ? lookups.actorId(plan.approvedBy)
        : null,
      approvedAt: status === ENUMS.proformaStatus.APPROVED || status === ENUMS.proformaStatus.REJECTED
        ? plan.approvedAt
        : null,
      convertedToBillId: null,
      createdAt: plan.createdAt,
      updatedAt: plan.approvedAt ?? plan.createdAt,
    });

    resolved.forEach((line, itemNumber) => {
      const totalPrice = money(line.unitPrice * line.quantity);
      lines.push({
        id: `${id}-${itemNumber + 1}`,
        proformaInvoiceId: id,
        serviceCatalogId: line.serviceCatalogId,
        description: line.description,
        serviceType: line.serviceType,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        pricingBasis: basis,
        vatRate: 0,
        vatAmount: 0,
        totalPrice,
        isInsuranceCovered: payerCovers,
        insuranceCoverage: payerCovers ? totalPrice : 0,
        patientResponsibility: payerCovers ? 0 : totalPrice,
      });
    });
  }

  await writeMany('estimates', (part) => prisma.proformaInvoice.createMany({ data: part, skipDuplicates: true }), headers, stats, planned);
  await writeMany('estimate lines', (part) => prisma.proformaInvoiceItem.createMany({ data: part }), lines, stats, planned);
  console.log(`✅ ${headers.length} estimates${skippedNoLines ? ` (${skippedNoLines} had no priceable line)` : ''}`);
};

let invoiceCounter = 0;
const nextInvoiceId = () => `seedpinv-${(++invoiceCounter).toString().padStart(6, '0')}`;

/**
 * Purchase invoices put stock into a named location. The receipts go through the same
 * ledger the dispensing used, so a batch bought here is available to dispense there and
 * the location balance, the hospital aggregate and the transaction history stay in step.
 *
 * The receiving location decides the shape of the receipt: an item that is already
 * batch-tracked must arrive as a dated lot, and one that is not must arrive unbatched.
 */
export const seedPurchaseInvoices = async (
  lookups: Lookups,
  ledger: StockLedger,
  invoices: GeneratedPurchaseInvoice[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const headers: Prisma.InvoiceCreateManyInput[] = [];
  const items: Prisma.InvoiceItemCreateManyInput[] = [];
  let batchedLines = 0;
  let unbatchedLines = 0;

  // A lot number already present at the receiving location joins that batch, the way the
  // live purchase workflow increments it, instead of colliding with its unique key.
  for (const plan of invoices) {
    const ward = plan.receivedAtWardName ? lookups.wardByName.get(plan.receivedAtWardName) : null;
    const departmentId = ward
      ? null
      : lookups.departmentIdByName.get(plan.receivedAtDepartmentName ?? '')
        ?? lookups.departmentIdByName.get('Pharmacy')
        ?? null;
    const wardId = ward?.id ?? null;
    if (!departmentId && !wardId) continue;

    const id = nextInvoiceId();
    let total = 0;
    const lineRows: Prisma.InvoiceItemCreateManyInput[] = [];
    const seenStockItems = new Set<string>();

    for (const line of plan.items) {
      const stock = lookups.stockSlot(line.stockItemSlot);
      if (!stock || seenStockItems.has(stock.id)) continue;
      seenStockItems.add(stock.id);

      // The seeded cost is the price the invoice pays, so the item, the lot and the
      // receipt all report the same figure - the same invariant the live workflow keeps.
      const unitCost = money(stock.costPrice > 0 ? stock.costPrice : line.unitCost);
      const quantity = Math.max(1, line.quantity);
      total += unitCost * quantity;

      const isBatchTracked = ledger.hasBatchStock(stock.id);
      const expiry = isBatchTracked
        ? (line.expiryDate && line.expiryDate.getTime() >= startOfToday().getTime()
          ? line.expiryDate
          : new Date(Date.now() + 540 * 86_400_000))
        : null;
      const batchNumber = isBatchTracked
        ? (line.batchNumber ?? `LOT-${hashOf(`${plan.invoiceNumber}${stock.id}`).toString(36).toUpperCase()}`)
        : null;

      lineRows.push({
        id: `${id}-${lineRows.length + 1}`,
        invoiceId: id,
        stockItemId: stock.id,
        quantity,
        unitCost,
        batchNumber,
        expiryDate: expiry,
      });

      ledger.receive({
        stockItemId: stock.id,
        quantity,
        batchNumber,
        expiryDate: expiry,
        costPrice: unitCost,
        departmentId,
        wardId,
        receivedDate: plan.invoiceDate,
        reference: plan.invoiceNumber,
        notes: `Purchased from ${plan.supplierName}.`,
        performedBy: lookups.actorId(plan.createdBy),
        transactionType: 'purchase',
        transactionDate: plan.invoiceDate,
        invoiceId: id,
        existingBatchId: batchNumber ? ledger.batchIdAtLocation(stock.id, batchNumber, departmentId, wardId) : null,
      });
      if (isBatchTracked) batchedLines++; else unbatchedLines++;
    }

    if (!lineRows.length) continue;
    items.push(...lineRows);
    headers.push({
      id,
      invoiceNumber: plan.invoiceNumber,
      supplierName: plan.supplierName,
      invoiceDate: plan.invoiceDate,
      totalAmount: money(total),
      notes: plan.notes,
      createdById: lookups.actorId(plan.createdBy),
      receivedAtDepartmentId: departmentId,
      receivedAtWardId: wardId,
      corporateAccountId: null,
      createdAt: plan.invoiceDate,
      updatedAt: plan.invoiceDate,
    });
  }

  await writeMany('purchase invoices', (part) => prisma.invoice.createMany({ data: part, skipDuplicates: true }), headers, stats, planned);
  await writeMany('purchase invoice lines', (part) => prisma.invoiceItem.createMany({ data: part }), items, stats, planned);
  console.log(`✅ ${headers.length} purchase invoices, ${batchedLines} batched and ${unbatchedLines} unbatched lines received`);
};
