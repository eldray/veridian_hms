import { PrismaClient, BillStatus } from '@prisma/client';
import { ValidationError } from '../../utils/errors';
import { BaseService } from '../../shared/base/BaseService';
import { BillingRepository } from './BillingRepository';
import { CreateBillDTO, AddPaymentDTO, UpdateBillStatusDTO, BillFilters, RefundPaymentDTO } from './BillingTypes';
import { getCounterService } from '../../services/CounterService';
import { calculateNHISMedicineAllocation, isPayerCovered, resolveConfiguredNHISTariff } from '../../utils/pricing';
import { approvedServicesCoverPrescription } from '../encounter/NHISPreAuthorisation';
import { computeLineTax, loadTaxConfiguration, mergeTaxBreakdowns, type TaxBreakdown } from '../../utils/tax';

type CollectionPatient = { surname: string; otherNames: string; folderNumber: string } | null;
type CollectionClient = { name: string } | null;

/**
 * The collections report is money-first, so it must print whoever actually paid.
 * Registered patients are identified by folder number; a counter walk-in has no folder,
 * so the line is labelled as such rather than left blank.
 */
function collectCustomerLabel(patient: CollectionPatient, client: CollectionClient) {
  if (patient) {
    return {
      name: `${patient.surname} ${patient.otherNames}`.trim() || 'Patient',
      reference: patient.folderNumber,
      kind: 'patient' as const,
    };
  }
  return {
    name: client?.name || 'Walk-in customer',
    reference: null,
    kind: 'walk_in' as const,
  };
}

/** A payment as the repository hands it back, narrowed to what the report reads. */
type CollectionRow = {
  id: string;
  transactionDate: Date;
  amount: unknown;
  paymentMethod: string;
  reference: string | null;
  notes: string | null;
  isVoided: boolean;
  voidedAt: Date | null;
  voidReason: string | null;
  /** True for a refund row; both reversals and refunds reduce the cashbook. */
  isRefund?: boolean;
  sourceType?: 'premier_claim_patient_payment';
  claimNumber?: string;
  attendanceNumber?: string | null;
  providerName?: string | null;
  User: { id: string; fullName: string; username: string } | null;
  Bill: {
    id: string;
    billNumber: string;
    Patient: CollectionPatient;
    CounterClient: CollectionClient;
    BillLineItem: {
      id: string;
      description: string;
      quantity: number;
      lineTotal: unknown;
      patientPayableAmount: unknown;
      serviceType: string;
      serviceCatalog: {
        serviceCategory: string;
        subType: string | null;
        StockItem: { isMedication: boolean; category: string } | null;
      } | null;
      wardChargeRecord: { ward: { wardName: string } } | null;
    }[];
  };
};

/**
 * Stock cards that are not a drug: the shelf sells these, but the money behind them is not
 * medicine, and the legacy cashbook has always shown them on their own lines.
 */
const CONSUMABLE_STOCK_CATEGORIES = new Set(['consumable', 'medical_supply', 'diagnostic']);

/**
 * The groups the cashbook is kept in, taken straight off the service catalog: a charged line
 * belongs to a group by its `ServiceType`, and to one line inside that group by the catalog
 * card's `subType` (or the ward that billed a bed day). The labels are the words the printed
 * receipt and the bill screen already use, so a cashier reading both is not learning a second
 * vocabulary.
 *
 * There is no Deposits group, because nothing here can produce one: no service catalog code is
 * a deposit, and no payment has ever been taken against a bill with no charged lines.
 */
const COLLECTION_GROUPS: { key: string; label: string; always: boolean }[] = [
  { key: 'consultation', label: 'Consultation', always: true },
  { key: 'procedures', label: 'Procedures', always: true },
  { key: 'laboratory', label: 'Laboratory Tests', always: true },
  { key: 'scans', label: 'Scans & Imaging', always: true },
  { key: 'accommodation', label: 'Ward & Accommodation', always: true },
  { key: 'drugs', label: 'Drugs', always: true },
  { key: 'consumables', label: 'Consumables', always: true },
  { key: 'claims', label: 'Premier Patient Collections', always: false },
  // Only ever a landing place for money that cannot be typed; shown when it has taken any.
  { key: 'other', label: 'Other Services', always: false },
];

const COLLECTION_GROUP_BY_SERVICE_TYPE: Record<string, string> = {
  consultation: 'consultation',
  procedure: 'procedures',
  lab_test: 'laboratory',
  scan: 'scans',
  ward: 'accommodation',
};

/** Catalog sub-types whose readable name is not the value stored on the card. */
const COLLECTION_ROW_LABELS: Record<string, string> = {
  ct_scan: 'CT Scan',
  dental_xray: 'Dental X-ray',
  xray: 'X-ray',
  mri: 'MRI',
  bone_densitometry: 'Bone Densitometry',
  nuclear_medicine: 'Nuclear Medicine',
  icu: 'ICU',
  ent: 'ENT',
  medical_supply: 'Medical Supplies',
};

const humanRowLabel = (raw: string) => COLLECTION_ROW_LABELS[raw.toLowerCase()]
  || raw
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');

const rowSlug = (raw: string) => raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'unsorted';

/** Which group, and which line inside it, a charged line's share of a payment belongs to. */
function collectionPlacement(
  line: CollectionRow['Bill']['BillLineItem'][number],
): { group: string; row: string; label: string } {
  const stock = line.serviceCatalog?.StockItem;
  if (line.serviceType === 'claim_patient_payment') {
    return { group: 'claims', row: 'premier_patient_share', label: 'Premier patient share' };
  }
  if (line.serviceType === 'medication') {
    if (!stock) return { group: 'drugs', row: 'unsorted', label: 'Not on a stock card' };
    const isConsumable = CONSUMABLE_STOCK_CATEGORIES.has((stock.category || '').toLowerCase()) || !stock.isMedication;
    const subType = line.serviceCatalog?.subType || stock.category;
    return {
      group: isConsumable ? 'consumables' : 'drugs',
      row: rowSlug(subType),
      label: subType ? humanRowLabel(subType) : 'Unsorted pharmacy line',
    };
  }
  const group = COLLECTION_GROUP_BY_SERVICE_TYPE[line.serviceType] || 'other';
  // A bed day is billed by the ward, not by a catalog card, so the ward name is the line.
  if (line.serviceType === 'ward') {
    const wardName = line.wardChargeRecord?.ward?.wardName;
    return { group, row: wardName ? rowSlug(wardName) : 'unsorted', label: wardName || 'Ward accommodation' };
  }
  const subType = line.serviceCatalog?.subType;
  return {
    group,
    row: subType ? rowSlug(subType) : 'unsorted',
    label: subType ? humanRowLabel(subType) : 'Not on a catalog card',
  };
}

/** Whole cents, because adding Prisma Decimals with `+` concatenates them as text. */
const toCents = (value: unknown) => Math.round(Number(value) * 100);

/**
 * One payment, with its amount split across the bill's charged lines.
 *
 * The split is proportional to what the patient actually owed on each line, falling back to
 * the line total when nothing was recorded as payable. Cents are distributed largest-remainder
 * so the shares add back to the payment exactly — a rounding drift here is what makes a
 * cashbook and its breakdown disagree.
 */
function allocateCollection(payment: CollectionRow) {
  const lineItems = payment.Bill.BillLineItem;
  const payableAmounts = lineItems.map((item) => Number(item.patientPayableAmount));
  const payableTotal = payableAmounts.reduce((sum, amount) => sum + amount, 0);
  const lineTotals = lineItems.map((item) => Number(item.lineTotal));
  const allocationBasis = payableTotal > 0 ? payableAmounts : lineTotals;
  const allocationTotal = allocationBasis.reduce((sum, amount) => sum + amount, 0);
  const paymentCents = toCents(payment.amount);
  const itemAmounts = allocationTotal > 0
    ? allocationBasis.map((amount) => Math.floor(paymentCents * amount / allocationTotal))
    : [];
  const remainingCents = allocationTotal > 0
    ? paymentCents - itemAmounts.reduce((sum, amount) => sum + amount, 0)
    : 0;
  const remainderOrder = allocationTotal > 0
    ? allocationBasis
        .map((amount, index) => ({
          index,
          remainder: paymentCents * amount / allocationTotal - itemAmounts[index]
        }))
        .sort((a, b) => b.remainder - a.remainder)
    : [];
  for (let index = 0; index < remainingCents; index += 1) {
    itemAmounts[remainderOrder[index].index] += 1;
  }

  const items = allocationTotal > 0
    ? lineItems.map((item, index) => {
        const placement = collectionPlacement(item);
        return {
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          serviceCategory: item.serviceCatalog?.serviceCategory || 'other',
          serviceType: item.serviceType,
          breakdownRow: `${placement.group}:${placement.row}`,
          breakdownLabel: placement.label,
          amount: itemAmounts[index] / 100,
        };
      })
    : [{
        id: payment.id,
        description: 'Uncategorized collection',
        quantity: 1,
        serviceCategory: 'other',
        serviceType: 'miscellaneous',
        breakdownRow: 'other:unallocated',
        breakdownLabel: 'Payment not tied to a charged line',
        amount: paymentCents / 100,
      }];

  return {
    id: payment.id,
    sourceType: payment.sourceType,
    claimNumber: payment.claimNumber,
    attendanceNumber: payment.attendanceNumber,
    providerName: payment.providerName,
    transactionDate: payment.transactionDate,
    amount: Number(payment.amount),
    paymentMethod: payment.paymentMethod,
    reference: payment.reference,
    notes: payment.notes,
    isVoided: payment.isVoided,
    voidedAt: payment.voidedAt,
    voidReason: payment.voidReason,
    isRefund: payment.isRefund === true,
    collector: payment.User,
    bill: {
      id: payment.Bill.id,
      billNumber: payment.Bill.billNumber,
      // One field for whoever handed over the money. A counter ticket has no Patient
      // row, so the report must not assume the payer is in the patient register.
      customer: collectCustomerLabel(payment.Bill.Patient, payment.Bill.CounterClient),
    },
    items,
  };
}

/** Sums of whole cents, returned in currency units. */
const sumAmounts = (values: number[]) => Math.round(values.reduce((sum, value) => sum + toCents(value), 0)) / 100;

export class BillingService extends BaseService {
  private repository: BillingRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('BillingService'); // ✅ Extends BaseService
    this.prisma = prisma;
    this.repository = new BillingRepository(prisma);
  }

  async getBills(filters: BillFilters) {
    this.logInfo('Fetching bills', { filters });
    return this.repository.findAll(filters);
  }

  async getBillById(id: string) {
    this.logDebug('Fetching bill by ID', { id });
    const bill = await this.repository.findById(id);
    if (!bill) throw new Error('Bill not found');
    return bill;
  }

  async createBill(data: CreateBillDTO, userId: string) {
    this.logInfo('Creating new bill', { patientId: data.patientId, paymentMode: data.paymentMode });

    if (data.paymentMode === 'private_insurance' || data.paymentMode === 'corporate') {
      throw new ValidationError('Private Insurance and Corporate visits are Claims-only. Generate the claim from Insurance Claims; do not create a bill.');
    }

    const attendance = await this.prisma.attendance.findUnique({
      where: { id: data.attendanceId },
      select: { id: true, patientId: true, dateTime: true, paymentMode: true },
    });
    if (!attendance) throw new Error(`Attendance not found: ${data.attendanceId}`);
    if (attendance.paymentMode === 'private_insurance' || attendance.paymentMode === 'corporate') {
      throw new ValidationError('Private Insurance and Corporate attendances are Claims-only. Generate the claim from Insurance Claims; do not create a bill.');
    }
    if (attendance.paymentMode !== data.paymentMode) {
      throw new ValidationError('The selected payment mode does not match the attendance payment mode.');
    }
    if (attendance.patientId !== data.patientId) {
      throw new Error('The selected attendance does not belong to this patient.');
    }
    // Payer rules and tariffs are evaluated on the date care was delivered, not
    // the day someone happens to generate the bill or submit the claim.
    const serviceDate = attendance.dateTime;
    const taxConfig = await loadTaxConfiguration(this.prisma);

    let totalAmount = 0;
    let patientPayableTotal = 0;
    const lineTaxes: TaxBreakdown[] = [];
    const itemsWithPrices = [];

    for (const item of data.items) {
      // ✅ FIXED: Fetch actual service details instead of hardcoding 'consultation'
      const service = await this.prisma.serviceCatalog.findUnique({
        where: { id: item.serviceId },
        select: {
          name: true, code: true, serviceType: true, stockItemId: true,
          isNHISCovered: true, isPrivateInsuranceExempted: true,
          pricing: {
            where: {
              isActive: true,
              effectiveDate: { lte: serviceDate },
              OR: [{ expiryDate: null }, { expiryDate: { gt: serviceDate } }]
            },
            take: 1,
            orderBy: { effectiveDate: 'desc' }
          }
        }
      });

      if (!service) throw new Error(`Service catalog item not found for ID: ${item.serviceId}`);

      let price = await this.repository.getServicePrice(item.serviceId, data.paymentMode, data.corporateAccountId, serviceDate);
      let lineTotal = item.quantity * price;
      let insuranceCoveredAmount = 0;
      let patientPayableAmount = lineTotal;
      let sourceKey: string | undefined;

      // Only allocate insurer coverage when the service has an applicable payer tariff
      // and is configured as covered. A cash fallback must remain fully patient-payable.
      if (data.paymentMode === 'nhis' || String(data.paymentMode) === 'private_insurance') {
        const provider = data.insuranceProviderId
          ? await this.prisma.insuranceProvider.findUnique({ where: { id: data.insuranceProviderId }, select: { coveragePercentage: true } })
          : null;
        const pricingRow = service.pricing?.[0];
        const payerCovered = !!pricingRow && isPayerCovered(pricingRow, data.paymentMode, {
          isNHISCovered: service.isNHISCovered,
          isPrivateInsuranceExempted: service.isPrivateInsuranceExempted
        });
        if (payerCovered && provider) {
          // NHIS-covered benefits are paid at the applicable tariff without patient co-payment.
          // Keep provider coverage percentages for private insurance only.
          const coverageRate = data.paymentMode === 'nhis'
            ? 1
            : Math.min(100, Math.max(0, Number(provider.coveragePercentage) || 0)) / 100;
          insuranceCoveredAmount = Math.round(lineTotal * coverageRate * 100) / 100;
          patientPayableAmount = Math.round((lineTotal - insuranceCoveredAmount) * 100) / 100;
        }
      }

      // Medicine-specific NHIS rules override the generic service-level price only when
      // this service is linked to a stock item. Missing/unverified rules default to cash.
      if (data.paymentMode === 'nhis' && service.stockItemId) {
        const detail = await this.prisma.serviceCatalog.findUnique({
          where: { id: item.serviceId },
          include: {
            pricing: { where: { isActive: true, effectiveDate: { lte: serviceDate }, OR: [{ expiryDate: null }, { expiryDate: { gt: serviceDate } }] }, take: 1, orderBy: { effectiveDate: 'desc' } },
            StockItem: { include: { payerRules: { where: { insuranceProviderId: data.insuranceProviderId ?? '' }, take: 1 } } }
          }
        });
        const currentPrice = detail?.pricing?.[0];
        if (!currentPrice) throw new Error(`No active cash/NHIS pricing is configured for medicine: ${service.name} on ${serviceDate.toISOString().slice(0, 10)}`);
        const cashPrice = Number(currentPrice.cashPrice);
        if (!Number.isFinite(cashPrice) || cashPrice <= 0) {
          throw new Error(`No valid active cash price is configured for medicine: ${service.name} on ${serviceDate.toISOString().slice(0, 10)}`);
        }
        const rule = detail?.StockItem?.payerRules?.[0];
        const configuredNHISTariff = resolveConfiguredNHISTariff(rule?.tariffPrice, currentPrice.nhisPrice);
        const inEffectiveWindow = !!rule && (!rule.effectiveFrom || rule.effectiveFrom <= serviceDate) && (!rule.effectiveTo || rule.effectiveTo >= serviceDate);
        const validPrescribingLevels = ['A', 'M', 'B1', 'B2', 'C', 'D', 'SM'];
        // Billing must fail closed just like prescribing and claims: an NHIS rule is not
        // claim-ready until coverage, prescribing level and authorisation requirement are explicit.
        const policyConfigured = !!rule &&
          rule.isCovered === true &&
          rule.authorizationRequired != null &&
          validPrescribingLevels.includes(String(rule.prescribingLevel ?? '').trim().toUpperCase()) &&
          configuredNHISTariff !== null;

        // Do not allocate a medicine to NHIS when its rule requires pre-authorisation
        // but no current approval explicitly covers this stock item/service and quantity.
        let hasRequiredAuthorization = rule?.authorizationRequired !== true;
        if (rule?.authorizationRequired === true && data.insuranceProviderId) {
          const approvals = await this.prisma.preAuthorisationRequest.findMany({
            where: {
              attendanceId: attendance.id,
              patientId: data.patientId,
              insuranceProviderId: data.insuranceProviderId,
              status: { in: ['approved', 'partially_approved'] },
              authNumber: { not: null },
              authExpiry: { gt: serviceDate },
            },
            select: { authNumber: true, approvedServices: true },
          });
          hasRequiredAuthorization = approvals.some((approval) =>
            Boolean(approval.authNumber) && approvedServicesCoverPrescription(approval.approvedServices, {
              stockItemId: service.stockItemId!,
              serviceCatalogId: item.serviceId,
            }, Number(item.quantity)),
          );
        }

        const covered = policyConfigured && inEffectiveWindow && hasRequiredAuthorization;
        const allocation = calculateNHISMedicineAllocation({
          cashPrice,
          nhisTariff: configuredNHISTariff ?? 0,
          covered,
          copaymentMode: rule?.copaymentMode,
          copaymentAmount: rule?.copaymentAmount == null ? null : Number(rule.copaymentAmount),
          copaymentPercentage: rule?.copaymentPercentage ?? null
        });
        insuranceCoveredAmount = allocation.nhisCoveredAmount * item.quantity;
        patientPayableAmount = allocation.patientPayableAmount * item.quantity;
        lineTotal = (allocation.nhisCoveredAmount + allocation.patientPayableAmount) * item.quantity;
        price = item.quantity > 0 ? lineTotal / item.quantity : 0;
        sourceKey = 'nhis-medicine-payer-rule';
      }

      const pricingRow = service.pricing?.[0];
      const lineTax = computeLineTax(
        patientPayableAmount,
        { isTaxable: pricingRow?.isTaxable === true, overrideRate: pricingRow?.vatRate ?? 0 },
        taxConfig,
        String(data.paymentMode),
      );

      totalAmount += lineTotal;
      patientPayableTotal += patientPayableAmount;
      if (lineTax.total > 0) lineTaxes.push(lineTax);

      itemsWithPrices.push({
        serviceCatalogId: item.serviceId,
        sourceKey,
        quantity: item.quantity,
        unitPrice: price,
        pricingBasis: data.paymentMode,
        vatRate: lineTax.effectiveRate,
        vatAmount: lineTax.total,
        taxBreakdown: lineTax.total > 0 ? lineTax : undefined,
        lineTotal: lineTotal,
        insuranceCoveredAmount,
        patientPayableAmount,
        discount: 0,
        description: `${service.name} (${service.code})`,
        serviceType: service.serviceType
      });
    }
    
    const taxAmount = Math.round(lineTaxes.reduce((sum, line) => sum + line.total, 0) * 100) / 100;
    const grossTotal = Math.round((totalAmount + taxAmount) * 100) / 100;
    const patientPayable = Math.round((patientPayableTotal + taxAmount) * 100) / 100;
    const taxBreakdown = mergeTaxBreakdowns(lineTaxes, String(data.paymentMode));

    const billData = {
      patientId: data.patientId,
      attendanceId: data.attendanceId,
      paymentMode: data.paymentMode,
      billNumber: getCounterService().nextBillNumber(), // ✅ FIXED: Uses CounterService
      subtotal: totalAmount,
      taxAmount,
      taxBreakdown: taxBreakdown ?? undefined,
      totalAmount: grossTotal,
      insuranceCovered: 0,
      patientPayable,
      paidAmount: 0,
      balance: patientPayable,
      // A zero patient balance is settled by payer coverage, not a cash collection.
      // paidAmount deliberately remains zero unless a Payment row is actually recorded.
      status: patientPayable <= 0 ? 'paid' as any : 'pending' as any,
      createdById: userId,
      billDate: new Date(),
      insuranceProviderId: data.insuranceProviderId,
      corporateAccountId: data.corporateAccountId
    };

    return this.repository.create(billData, itemsWithPrices);
  }

  async addPaymentToBill(id: string, data: AddPaymentDTO, userId: string) {
    // This is the public/manual payment path. Provider-backed MoMo must only be
    // posted by addConfirmedMomoPayment after the provider reports SUCCESSFUL.
    if (data.paymentMethod === 'mobile_money' || (data as any).internalMomoIntentId) {
      throw Object.assign(new Error('Mobile Money payments must be confirmed through the MTN MoMo workflow.'), { statusCode: 409 });
    }
    return this.recordPaymentToBill(id, data, userId);
  }

  /**
   * Internal-only entry point used after MTN confirms a collection.
   * It requires the exact pending intent ID; ordinary payment routes cannot
   * bypass the pending-intent guard by choosing mobile_money as their method.
   */
  async addConfirmedMomoPayment(id: string, data: AddPaymentDTO, userId: string, momoIntentId: string) {
    if (!momoIntentId || data.paymentMethod !== 'mobile_money' || !data.idempotencyKey) {
      throw new Error('A verified Mobile Money intent and idempotency key are required.');
    }
    return this.recordPaymentToBill(id, data, userId, momoIntentId);
  }

  /**
   * Give money back against a payment that was actually recorded on this bill.
   * Amounts and the payment relationship are validated under the bill lock in the
   * repository; the permission gate is on the route (finance only).
   */
  async refundPayment(billId: string, data: RefundPaymentDTO, userId: string) {
    this.logInfo('Refunding bill payment', { billId, paymentId: data.paymentId, amount: data.amount });
    if (!data.paymentId) {
      throw Object.assign(new Error('Select the payment being refunded.'), { statusCode: 400 });
    }
    return this.repository.createRefund(billId, data, userId);
  }

  private async recordPaymentToBill(id: string, data: AddPaymentDTO, userId: string, momoIntentId?: string) {
    this.logInfo('Adding payment to bill', { billId: id, amount: data.amount });
    const bill = await this.repository.findById(id);
    if (!bill) throw new Error('Bill not found');
    if (!momoIntentId) {
      // Pending MoMo and idempotency checks run together under the bill lock in the repository.
      // Keeping this check here would reject a legitimate retry before the existing payment is found.
    }
    // A retry may arrive after the first request fully paid the bill. Let the
    // repository resolve an existing idempotency key before stale-balance checks.
    if (!data.idempotencyKey) {
      if (bill.status === 'paid') throw new Error('Cannot add payment to a fully paid bill');
      const balance = Number(bill.balance);
      if (data.amount > balance) throw new Error(`Payment amount (${data.amount}) exceeds bill balance (${balance})`);
    }

    return this.repository.addPayment(id, { ...data, userId, ...(momoIntentId ? { internalMomoIntentId: momoIntentId } : {}) });
  }

  async updateBillStatus(id: string, data: UpdateBillStatusDTO, userId: string) {
    this.logInfo('Updating bill status', { billId: id, status: data.status });
    const bill = await this.repository.findById(id);
    if (!bill) throw new Error('Bill not found');

    // Payment-derived statuses must never be set manually: doing so can mark an
    // outstanding bill as paid/partial without a corresponding payment record.
    if (data.status === 'paid' || data.status === 'partial') {
      throw Object.assign(
        new Error('Cannot set a bill to paid or partial directly. Record the payment so status and balance are calculated together.'),
        { statusCode: 409 },
      );
    }

    const hasPaymentHistory = (Number(bill.paidAmount) || 0) > 0 || (bill.Payment?.length ?? 0) > 0;
    // Once money has been recorded, do not let a status toggle erase the financial
    // state by moving a paid/partial bill back to draft or pending, or cancelling it.
    if (hasPaymentHistory && data.status !== bill.status) {
      throw Object.assign(
        new Error('Cannot change the status of a bill with recorded payments. Use the approved adjustment/refund workflow to preserve the payment audit trail.'),
        { statusCode: 409 },
      );
    }

    return this.repository.updateStatus(id, data.status, userId);
  }

  async getStatistics(period: string) {
    this.logInfo('Fetching billing statistics', { period });
    return this.repository.getStatistics(period);
  }

  /**
   * The cashbook for a period: what was taken, what was reversed, who took it, and which
   * services the money bought.
   *
   * `payments` stays the money actually banked (voided rows excluded) so every existing
   * consumer of this endpoint keeps the same totals. `reversals` carries the voided ones,
   * and `groups`/`cashiers` are computed from both so the grids on the screen always tie to
   * the same figure.
   */
  async getCollections(dateFrom: Date, dateTo: Date) {
    this.logInfo('Fetching payment collections', { dateFrom, dateTo });
    const [rows, refundRows, claimPaymentRows] = await Promise.all([
      this.repository.findCollections(dateFrom, dateTo),
      this.repository.findRefunds(dateFrom, dateTo),
      this.repository.findPremierClaimPatientCollections(dateFrom, dateTo),
    ]);
    // A refund reverses the collection it came from, so it is fed through the same
    // allocator as a voided payment. Unlike a void, the original payment row stays
    // in `payments`; the refund appears only in `reversals`.
    const refundRowsAsReversals = refundRows.map((refund) => ({
      id: refund.id,
      transactionDate: refund.refundedAt,
      amount: refund.amount,
      paymentMethod: refund.refundMethod,
      reference: refund.refundNumber,
      notes: refund.reason,
      isVoided: true,
      voidedAt: refund.refundedAt,
      voidReason: refund.reason,
      isRefund: true,
      User: refund.processedBy,
      Bill: refund.bill,
    } as unknown as CollectionRow));
    // Premier patient shares are real collections, but deliberately have no Bill or Payment.
    // Give the cashbook a claim-labelled line so totals reconcile without duplicate bills.
    const claimRowsAsCollections = claimPaymentRows.map((payment: any) => ({
      id: payment.id,
      transactionDate: payment.transactionDate,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      reference: payment.receiptNumber,
      notes: payment.notes,
      isVoided: false,
      voidedAt: null,
      voidReason: null,
      sourceType: 'premier_claim_patient_payment' as const,
      claimNumber: payment.claim.claimNumber,
      attendanceNumber: payment.claim.Attendance?.attendanceNumber ?? null,
      providerName: payment.claim.InsuranceProvider?.name ?? null,
      User: payment.receivedBy,
      Bill: {
        id: payment.claim.id,
        billNumber: payment.claim.claimNumber,
        Patient: payment.patient,
        CounterClient: null,
        BillLineItem: [{
          id: payment.id,
          description: 'Premier claim patient share',
          quantity: 1,
          lineTotal: payment.amount,
          patientPayableAmount: payment.amount,
          serviceType: 'claim_patient_payment',
          serviceCatalog: { serviceCategory: 'insurance', subType: 'premier_patient_share', StockItem: null },
          wardChargeRecord: null,
        }],
      },
    } as unknown as CollectionRow));
    const allocated = [...rows, ...claimRowsAsCollections, ...refundRowsAsReversals].map(allocateCollection);

    const payments = allocated.filter((payment) => !payment.isVoided);
    const reversals = allocated.filter((payment) => payment.isVoided);

    const reversalCentsByRow = new Map<string, number>();
    for (const reversal of reversals) {
      for (const item of reversal.items) {
        reversalCentsByRow.set(item.breakdownRow, (reversalCentsByRow.get(item.breakdownRow) || 0) + toCents(item.amount));
      }
    }

    const collectionsCentsByRow = new Map<string, number>();
    type CashierRow = {
      id: string; name: string; username: string;
      receipts: number; collections: number; reversals: number; cash: number;
    };
    const cashiers = new Map<string, CashierRow>();
    const cashierOf = (collector: CollectionRow['User']): CashierRow => {
      const id = collector?.id || 'unknown';
      const existing = cashiers.get(id);
      if (existing) return existing;
      const created: CashierRow = {
        id,
        name: collector?.fullName || collector?.username || 'Unknown user',
        username: collector?.username || '',
        receipts: 0,
        collections: 0,
        reversals: 0,
        cash: 0,
      };
      cashiers.set(id, created);
      return created;
    };
    for (const payment of payments) {
      for (const item of payment.items) {
        collectionsCentsByRow.set(item.breakdownRow, (collectionsCentsByRow.get(item.breakdownRow) || 0) + toCents(item.amount));
      }
      const cashier = cashierOf(payment.collector);
      cashier.receipts += 1;
      cashier.collections += toCents(payment.amount);
      // "Cash at hand" means physical money only; mobile money, card, bank transfer and
      // cheque land elsewhere in the till, so counting them here would overstate the drawer.
      if (payment.paymentMethod === 'cash') cashier.cash += toCents(payment.amount);
    }
    for (const reversal of reversals) {
      const cashier = cashierOf(reversal.collector);
      cashier.reversals += toCents(reversal.amount);
      if (reversal.paymentMethod === 'cash') cashier.cash -= toCents(reversal.amount);
    }

    // The rows are whatever the period actually charged, so their names come off the lines
    // rather than from a fixed chart — a ward or a lab discipline added next month appears here
    // without this report being edited to make room for it.
    const rowLabels = new Map<string, string>();
    for (const payment of allocated) {
      for (const item of payment.items) rowLabels.set(item.breakdownRow, item.breakdownLabel);
    }

    type BreakdownLine = { key: string; label: string; collections: number; reversals: number; balance: number };
    const linesByGroup = new Map<string, BreakdownLine[]>();
    for (const rowKey of new Set([...collectionsCentsByRow.keys(), ...reversalCentsByRow.keys()])) {
      const groupKey = rowKey.split(':')[0];
      const collections = collectionsCentsByRow.get(rowKey) || 0;
      const rowReversals = reversalCentsByRow.get(rowKey) || 0;
      const lines = linesByGroup.get(groupKey) || [];
      lines.push({
        key: rowKey,
        label: rowLabels.get(rowKey) || humanRowLabel(rowKey.split(':')[1] || 'Other'),
        collections: collections / 100,
        reversals: rowReversals / 100,
        balance: (collections - rowReversals) / 100,
      });
      linesByGroup.set(groupKey, lines);
    }

    const groups = COLLECTION_GROUPS
      .filter((group) => group.always || (linesByGroup.get(group.key)?.length ?? 0) > 0)
      .map((group) => {
        const lines = (linesByGroup.get(group.key) || [])
          .sort((a, b) => b.balance - a.balance || a.label.localeCompare(b.label));
        return {
          key: group.key,
          label: group.label,
          lines,
          subtotal: {
            collections: lines.reduce((sum, line) => sum + toCents(line.collections), 0) / 100,
            reversals: lines.reduce((sum, line) => sum + toCents(line.reversals), 0) / 100,
            balance: lines.reduce((sum, line) => sum + toCents(line.balance), 0) / 100,
          },
        };
      });

    const totalCollections = sumAmounts(payments.map((payment) => payment.amount));
    const totalReversals = sumAmounts(reversals.map((reversal) => reversal.amount));

    return {
      totalAmount: totalCollections,
      paymentCount: payments.length,
      payments,
      totalReversals,
      reversalCount: reversals.length,
      reversals,
      netCollected: Math.round((totalCollections - totalReversals) * 100) / 100,
      cashAtHand: sumAmounts(
        payments.filter((payment) => payment.paymentMethod === 'cash').map((payment) => payment.amount)
      ) - sumAmounts(
        reversals.filter((reversal) => reversal.paymentMethod === 'cash').map((reversal) => reversal.amount)
      ),
      groups,
      cashiers: [...cashiers.values()]
        .map((cashier) => ({
          id: cashier.id,
          name: cashier.name,
          username: cashier.username,
          receipts: cashier.receipts,
          collections: cashier.collections / 100,
          reversals: cashier.reversals / 100,
          balance: (cashier.collections - cashier.reversals) / 100,
          cashAtHand: cashier.cash / 100,
        }))
        .sort((a, b) => b.collections - a.collections),
    };
  }

  /**
   * Tax summary for a period: what was taxed, what was exempt, and how much of
   * each levy was charged. This is the filing view — it reads the component trail
   * stored on every bill rather than applying today's rates to old invoices.
   */
  async getTaxSummary(dateFrom: Date, dateTo: Date) {
    this.logInfo('Building tax summary', { dateFrom, dateTo });
    const num = (value: unknown) => {
      const parsed = Number(value ?? 0);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const bills = await this.prisma.bill.findMany({
      where: { billDate: { gte: dateFrom, lte: dateTo }, status: { not: 'cancelled' } },
      select: {
        id: true, billNumber: true, billDate: true, paymentMode: true, status: true,
        subtotal: true, taxAmount: true, totalAmount: true, taxBreakdown: true,
      },
      orderBy: { billDate: 'asc' },
    });

    const byComponent = new Map<string, { code: string; name: string; rate: number; amount: number }>();
    const byPayer = new Map<string, { paymentMode: string; invoiceCount: number; taxableSales: number; exemptSales: number; taxCollected: number }>();
    const byDay = new Map<string, { date: string; invoiceCount: number; taxableSales: number; exemptSales: number; taxCollected: number }>();

    let taxableSales = 0;
    let exemptSales = 0;
    let taxCollected = 0;
    let grossSales = 0;
    let invoicesWithTax = 0;

    for (const bill of bills) {
      const subtotal = num(bill.subtotal);
      const tax = num(bill.taxAmount);
      const breakdown: any = bill.taxBreakdown;
      // Bills raised before this feature have no component trail; their whole
      // subtotal is treated as taxable when a tax amount was recorded.
      const base = breakdown && Number.isFinite(Number(breakdown.base))
        ? num(breakdown.base)
        : (tax > 0 ? subtotal : 0);
      const exempt = Math.max(0, subtotal - base);

      taxableSales += base;
      exemptSales += exempt;
      taxCollected += tax;
      grossSales += num(bill.totalAmount);
      if (tax > 0) invoicesWithTax += 1;

      const components = Array.isArray(breakdown?.components) ? breakdown.components : [];
      if (components.length > 0) {
        for (const component of components) {
          const key = String(component.code || component.name || 'TAX');
          const existing = byComponent.get(key);
          if (existing) existing.amount += num(component.amount);
          else byComponent.set(key, {
            code: key,
            name: String(component.name || key),
            rate: num(component.rate),
            amount: num(component.amount),
          });
        }
      } else if (tax > 0) {
        const existing = byComponent.get('TAX');
        if (existing) existing.amount += tax;
        else byComponent.set('TAX', { code: 'TAX', name: 'Tax', rate: 0, amount: tax });
      }

      const payerKey = String(bill.paymentMode);
      const payer = byPayer.get(payerKey) || { paymentMode: payerKey, invoiceCount: 0, taxableSales: 0, exemptSales: 0, taxCollected: 0 };
      payer.invoiceCount += 1;
      payer.taxableSales += base;
      payer.exemptSales += exempt;
      payer.taxCollected += tax;
      byPayer.set(payerKey, payer);

      const day = new Date(bill.billDate).toISOString().slice(0, 10);
      const row = byDay.get(day) || { date: day, invoiceCount: 0, taxableSales: 0, exemptSales: 0, taxCollected: 0 };
      row.invoiceCount += 1;
      row.taxableSales += base;
      row.exemptSales += exempt;
      row.taxCollected += tax;
      byDay.set(day, row);
    }

    const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

    return {
      period: { start: dateFrom, end: dateTo },
      summary: {
        invoiceCount: bills.length,
        invoicesWithTax,
        grossSales: round(grossSales),
        taxableSales: round(taxableSales),
        exemptSales: round(exemptSales),
        taxCollected: round(taxCollected),
      },
      byComponent: Array.from(byComponent.values())
        .map((row) => ({ ...row, amount: round(row.amount) }))
        .sort((a, b) => a.code.localeCompare(b.code)),
      byPayer: Array.from(byPayer.values())
        .map((row) => ({
          ...row,
          taxableSales: round(row.taxableSales),
          exemptSales: round(row.exemptSales),
          taxCollected: round(row.taxCollected),
        }))
        .sort((a, b) => b.taxCollected - a.taxCollected),
      daily: Array.from(byDay.values())
        .map((row) => ({
          ...row,
          taxableSales: round(row.taxableSales),
          exemptSales: round(row.exemptSales),
          taxCollected: round(row.taxCollected),
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /**
   * The revenue-lines report: one row per charged line in the window, priced as it was
   * billed, with the bill and whoever it was raised for. Money-first reporting cannot assume
   * the payer is a registered patient, because a counter ticket is not one.
   *
   * `limit` is a guard rail, not a silent cap: the response says whether it was reached so
   * the screen can widen the window instead of under-reporting.
   */
  async getRevenueLines(
    dateFrom: Date,
    dateTo: Date,
    options: { paymentMode?: string; billStatus?: string; serviceType?: string; search?: string; limit?: number } = {},
  ) {
    this.logInfo('Fetching revenue lines', { dateFrom, dateTo, ...options });
    const limit = Math.min(Math.max(Math.round(options.limit || 2000), 1), 5000);
    const rows = await this.repository.findRevenueLines({
      dateFrom,
      dateTo,
      paymentMode: options.paymentMode,
      billStatus: options.billStatus,
      serviceType: options.serviceType,
      search: options.search,
      limit,
    });

    // Prisma hands back Decimals; adding them with + concatenates text, so every money value
    // becomes a number here and the totals are computed in whole cents.
    const cents = (value: any) => Math.round(Number(value) * 100);
    const lines = rows.map(line => ({
      id: line.id,
      chargedAt: line.createdAt,
      description: line.description,
      serviceType: line.serviceType,
      serviceCategory: line.serviceCatalog?.serviceCategory || 'other',
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
      discount: Number(line.discount),
      vatAmount: Number(line.vatAmount),
      lineTotal: Number(line.lineTotal),
      insuranceCovered: Number(line.insuranceCoveredAmount),
      patientPayable: Number(line.patientPayableAmount),
      pricingBasis: line.pricingBasis,
      bill: {
        id: line.bill.id,
        billNumber: line.bill.billNumber,
        billDate: line.bill.billDate,
        status: line.bill.status,
        paymentMode: line.bill.paymentMode,
        customer: collectCustomerLabel(line.bill.Patient, line.bill.CounterClient),
      },
    }));

    const sumOf = (pick: (line: typeof lines[number]) => number) =>
      lines.reduce((total, line) => total + cents(pick(line)), 0) / 100;

    return {
      totalLines: lines.length,
      totalAmount: sumOf(line => line.lineTotal),
      patientPayableAmount: sumOf(line => line.patientPayable),
      insuranceCoveredAmount: sumOf(line => line.insuranceCovered),
      lines,
      limit,
      // True when the window holds more lines than the guard rail, so the screen can say so
      // rather than presenting a short total as the whole picture.
      capped: rows.length >= limit,
    };
  }

  async getLineItems(billId: string) {
    this.logDebug('Fetching line items for bill', { billId });
    const bill = await this.repository.findById(billId);
    if (!bill) throw new Error('Bill not found');
    return this.repository.getLineItems(billId);
  }

  async voidLineItem(lineItemId: string, userId: string, reason: string) {
    this.logInfo('Voiding bill line item', { lineItemId, reason });
    return this.repository.voidLineItem(lineItemId, userId, reason);
  }

  async applyWaiver(billId: string, waiverId: string, userId?: string) {
    this.logInfo('Applying waiver to bill', { billId, waiverId });
    const bill = await this.repository.findById(billId);
    if (!bill) throw new Error('Bill not found');
    return this.repository.applyWaiver(billId, waiverId, userId);
  }
}