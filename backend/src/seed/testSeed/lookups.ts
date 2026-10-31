// src/seed/testSeed/lookups.ts
//
// Everything the demo writer needs from the reference data installed by coreSeed,
// resolved once and cached. The generator only ever names things by code, drug
// group or ward type; this module turns those names into real row ids and drops
// any reference that does not exist in this database. The writer never invents a
// name, a price or an id of its own.
import {
  AntenatalRisk,
  AppointmentStatus,
  AppointmentType,
  AttendanceStatus,
  AttendanceType,
  AuditAction,
  BatchStatus,
  BillStatus,
  ClaimItemCategory,
  ClaimStatus,
  CommunicationStatus,
  CommunicationType,
  ConsentStatus,
  ConsentType,
  CordCareMethod,
  DeliveryOutcome,
  DeliveryType,
  DocumentType,
  DoseStatus,
  EligibilityCheckMethod,
  EligibilityStatus,
  EncounterCategory,
  FPMethod,
  FPMethodCategory,
  Gender,
  GHSReportType,
  GraValidationStatus,
  InsuranceType,
  LabTestStatus,
  LeaveStatus,
  LeaveType,
  MalariaCommodityType,
  MaternalOutcome,
  MedicationStatus,
  NewbornOutcome,
  NotificationPriority,
  NotificationType,
  NursingNoteType,
  NursingTaskStatus,
  NursingTaskType,
  PaymentMethod,
  PaymentMode,
  PayslipLineItemType,
  PlaceOfDelivery,
  PreAuthStatus,
  Priority,
  ProcedureStatus,
  ProformaInvoiceStatus,
  ReferralStatus,
  ReferralType,
  RequisitionStatus,
  RequisitionUrgency,
  ScanPriority,
  ScanStatus,
  ServiceCategory,
  ServiceType,
  ShiftStatus,
  ShiftType,
  StockTransactionType,
  TaskPriority,
  TransferStatus,
  VisitCategory,
  WaiverStatus,
  WaiverType,
} from '@prisma/client';
import { DRUG_GROUPS } from '../clinicalContent.js';
import type { Actor, GeneratedUser } from '../bulkGenerator.js';
import { isPayerCovered, resolveUnitPrice, resolveWardDailyRate } from '../../utils/pricing.js';
import { hashOf, prisma, startOfToday, toNumber } from './shared.js';

export interface ServiceRow {
  id: string;
  code: string;
  name: string;
  serviceType: string;
  isNHISCovered: boolean;
  isPrivateInsuranceExempted: boolean;
  stockItemId: string | null;
  wardId: string | null;
  labTestTemplateId: string | null;
  scanTemplateId: string | null;
  procedureTemplateId: string | null;
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  corporatePrice: number;
}

export interface StockRow {
  id: string;
  name: string;
  category: string;
  drugCode: string;
  isMedication: boolean;
  currentStock: number;
  costPrice: number;
}

export interface BatchRow {
  id: string;
  stockItemId: string;
  batchNumber: string;
  expiryDate: Date;
  receivedDate: Date;
  quantity: number;
  costPrice: number;
  departmentId: string | null;
  wardId: string | null;
}

export interface WardRow {
  id: string;
  wardName: string;
  wardType: string;
  dailyCashRate: number;
  dailyNHISRate: number;
  dailyInsuranceRate: number;
  dailyCorporateRate: number;
  isNHISCovered: boolean;
  isPrivateInsExempted: boolean;
}

export interface BedRow {
  id: string;
  wardId: string;
  bedNumber: string;
}

export interface ProviderRow {
  id: string;
  name: string;
  type: string;
  coveragePercentage: number;
}

export interface CorporateAccountRow {
  id: string;
  companyName: string;
  insuranceProviderId: string | null;
  discountPercentage: number;
}

export interface CorporateEmployeeRow {
  id: string;
  accountId: string;
  fullName: string;
}

export interface BalanceRow {
  id: string;
  stockItemId: string;
  locationKey: string;
  departmentId: string | null;
  wardId: string | null;
  quantity: number;
}

export interface Lookups {
  /** Seeded users by username. */
  userByUsername: Map<string, { id: string; fullName: string; departmentId: string | null; role: string }>;
  /** The user id an Actor plan points at; falls back to the admin when a role pool is empty. */
  actorId: (actor: Actor | null | undefined) => string;
  actorName: (actor: Actor | null | undefined) => string;
  /** Department the resolved actor belongs to; stock is always moved in the actor's own location. */
  actorDepartmentId: (actor: Actor | null | undefined, fallbackRole?: string) => string | null;
  userIdsByRole: Map<string, string[]>;
  fallbackIds: {
    admin: string;
    doctor: string;
    nurse: string;
    midwife: string;
    labTech: string;
    sonographer: string;
    pharmacist: string;
    accounts: string;
    records: string;
    hr: string;
  };

  departmentIdByName: Map<string, string>;
  wardById: Map<string, WardRow>;
  wardByName: Map<string, WardRow>;
  /** Wards keyed by the wardType hint the generator uses ("general", "icu", ...). */
  wardsByType: Map<string, WardRow[]>;
  /** Free beds per ward, consumed as active admissions take them. */
  freeBedsByWard: Map<string, BedRow[]>;
  allBedsByWard: Map<string, BedRow[]>;

  serviceByCode: Map<string, ServiceRow>;
  serviceByLabTemplate: Map<string, ServiceRow>;
  serviceByScanTemplate: Map<string, ServiceRow>;
  serviceByProcedureTemplate: Map<string, ServiceRow>;
  serviceByStockItem: Map<string, ServiceRow>;
  consultationCodes: { general: string; specialist: string; emergency: string };

  labTemplateByCode: Map<string, { id: string; name: string; category: string; resultTemplate: any }>;
  scanTemplateByCode: Map<string, { id: string; name: string; category: string; bodyPart: string; scanType: string | null; description: string }>;
  procedureTemplateByCode: Map<string, { id: string; name: string; category: string; duration: number }>;
  diagnosisByIcd: Map<string, { id: string; name: string }>;

  medicationStock: StockRow[];
  consumableStock: StockRow[];
  stockSlot: (slot: number) => StockRow | null;
  /** Deterministic stock row for a generator drug group. */
  stockForDrugGroup: (group: string, salt: string) => StockRow | null;
  batchesByStockItem: Map<string, BatchRow[]>;
  /** Every department/ward balance row, so the ledger can start from the real quantity. */
  balances: BalanceRow[];

  insuranceProviderByType: Map<string, ProviderRow[]>;
  corporateAccounts: CorporateAccountRow[];
  corporateEmployeesByAccount: Map<string, CorporateEmployeeRow[]>;
  facility: { id: string; name: string; nhisFacilityCode: string } | null;
  /** The catalog entry a ward's daily charge bills through, when one was seeded. */
  wardServiceFor: (ward: WardRow) => ServiceRow | null;

  /** The unit price a payer mode pays for one unit of a catalog entry. */
  priceOf: (service: ServiceRow | null, paymentMode: string, corporateDiscountPercent?: number) => number;
  payerCovers: (service: ServiceRow | null, paymentMode: string) => boolean;
  /** The bed-day price a payer mode pays in this ward, from the ward's own rate columns. */
  wardDailyRate: (ward: WardRow, paymentMode: string, corporateDiscountPercent?: number) => number;
}

const ACTOR_ROLE_FOR_USER_ROLE: Record<string, string> = {
  super_admin: 'admin',
  admin: 'admin',
  hr_officer: 'hr_officer',
  doctor: 'doctor',
  nurse: 'nurse',
  midwife: 'midwife',
  records: 'records',
  lab_tech: 'lab_tech',
  pharmacist: 'pharmacist',
  accounts: 'accounts',
  sonographer: 'sonographer',
};

/**
 * Load every reference table the writer resolves against. This is one pass over
 * a few thousand rows; the demo seed then never queries reference data again.
 */
export const buildLookups = async (): Promise<Lookups> => {
  const [
    users, departments, wards, beds, services, labTemplates, scanTemplates,
    procedureTemplates, diagnoses, stockItems, batches, balanceRows, providers, corporateAccounts, corporateEmployees, facility,
  ] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, username: true, fullName: true, role: true, departmentId: true },
      orderBy: { username: 'asc' },
    }),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.ward.findMany({ where: { isActive: true }, select: { id: true, wardName: true, wardType: true, dailyCashRate: true, dailyNHISRate: true, dailyInsuranceRate: true, dailyCorporateRate: true, isNHISCovered: true, isPrivateInsExempted: true } }),
    prisma.bed.findMany({ select: { id: true, wardId: true, bedNumber: true }, orderBy: [{ wardId: 'asc' }, { bedNumber: 'asc' }] }),
    prisma.serviceCatalog.findMany({
      where: { isActive: true },
      select: {
        id: true, code: true, name: true, serviceType: true, isNHISCovered: true, isPrivateInsuranceExempted: true,
        stockItemId: true, wardId: true, labTestTemplateId: true, scanTemplateId: true, procedureTemplateId: true,
        pricing: { where: { isActive: true, expiryDate: null }, orderBy: { effectiveDate: 'desc' }, take: 1 },
      },
    }),
    prisma.labTestTemplate.findMany({ select: { id: true, investigationCode: true, name: true, category: true, resultTemplate: true } }),
    prisma.scanTemplate.findMany({ select: { id: true, scanCode: true, name: true, category: true, bodyPart: true, scanType: true, description: true } }),
    prisma.procedureTemplate.findMany({ select: { id: true, procedureCode: true, name: true, category: true, duration: true } }),
    prisma.diagnosis.findMany({ select: { id: true, icdCode: true, name: true } }),
    prisma.stockItem.findMany({
      select: { id: true, name: true, category: true, drugCode: true, isMedication: true, currentStock: true, costPrice: true },
      orderBy: { name: 'asc' },
    }),
    prisma.stockBatch.findMany({
      where: { isActive: true, quantity: { gt: 0 }, expiryDate: { gte: startOfToday() } },
      select: { id: true, stockItemId: true, batchNumber: true, expiryDate: true, receivedDate: true, quantity: true, costPrice: true, departmentId: true, wardId: true },
      orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
    }),
    prisma.stockItemDepartmentBalance.findMany({
      select: { id: true, stockItemId: true, locationKey: true, departmentId: true, wardId: true, quantity: true },
    }),
    prisma.insuranceProvider.findMany({ where: { isActive: true }, select: { id: true, name: true, type: true, coveragePercentage: true } }),
    prisma.corporateAccount.findMany({
      where: { isActive: true },
      select: { id: true, companyName: true, insuranceProviderId: true, discountPercentage: true },
      orderBy: { companyName: 'asc' },
    }),
    prisma.corporateEmployee.findMany({
      where: { isActive: true },
      select: { id: true, accountId: true, firstName: true, lastName: true, otherNames: true },
      orderBy: { employeeId: 'asc' },
    }),
    prisma.hospital.findFirst({ select: { id: true, name: true, nhisFacilityCode: true } }),
  ]);

  const userByUsername = new Map(users.map((u) => [u.username, { id: u.id, fullName: u.fullName, departmentId: u.departmentId, role: String(u.role) }]));

  // The generator names a role and a salt; the writer picks the salt-th user of
  // that role, so the same actor recurs consistently across a patient's record.
  const userIdsByRole = new Map<string, string[]>();
  for (const u of users) {
    const role = ACTOR_ROLE_FOR_USER_ROLE[String(u.role)] ?? String(u.role);
    const list = userIdsByRole.get(role) ?? [];
    list.push(u.id);
    userIdsByRole.set(role, list);
  }
  for (const list of userIdsByRole.values()) list.sort();

  const idFor = (role: string): string | null => {
    const pool = userIdsByRole.get(role);
    return pool?.length ? pool[0] : null;
  };
  const fallbackIds = {
    admin: idFor('admin') ?? users[0]?.id ?? '',
    doctor: idFor('doctor') ?? users[0]?.id ?? '',
    nurse: idFor('nurse') ?? idFor('midwife') ?? users[0]?.id ?? '',
    midwife: idFor('midwife') ?? idFor('nurse') ?? users[0]?.id ?? '',
    labTech: idFor('lab_tech') ?? idFor('doctor') ?? users[0]?.id ?? '',
    sonographer: idFor('sonographer') ?? idFor('lab_tech') ?? users[0]?.id ?? '',
    pharmacist: idFor('pharmacist') ?? users[0]?.id ?? '',
    accounts: idFor('accounts') ?? idFor('admin') ?? users[0]?.id ?? '',
    records: idFor('records') ?? idFor('admin') ?? users[0]?.id ?? '',
    hr: idFor('hr_officer') ?? idFor('admin') ?? users[0]?.id ?? '',
  };
  if (!fallbackIds.admin) throw new Error('No user rows found. Run the core seed before the demo seed.');

  const actorId = (actor: Actor | null | undefined): string => {
    if (!actor) return fallbackIds.admin;
    const pool = userIdsByRole.get(actor.role);
    if (!pool?.length) return fallbackIds[actor.role as keyof typeof fallbackIds] ?? fallbackIds.admin;
    return pool[Math.abs(actor.salt) % pool.length];
  };
  const actorName = (actor: Actor | null | undefined): string => {
    const id = actorId(actor);
    return users.find((u) => u.id === id)?.fullName ?? 'Staff';
  };

  const departmentIdById = new Map(users.map((u) => [u.id, u.departmentId]));
  const actorDepartmentId = (actor: Actor | null | undefined, fallbackRole = 'pharmacist'): string | null => {
    const id = actorId(actor);
    if (departmentIdById.get(id)) return departmentIdById.get(id)!;
    // A user with no department still has to dispense from somewhere real.
    const pool = userIdsByRole.get(fallbackRole) ?? [];
    for (const candidate of pool) {
      const dept = departmentIdById.get(candidate);
      if (dept) return dept;
    }
    return null;
  };

  const departmentIdByName = new Map(departments.map((d) => [d.name, d.id]));

  const wardRows: WardRow[] = wards.map((w) => ({
    id: w.id,
    wardName: w.wardName,
    wardType: String(w.wardType || 'general').toLowerCase(),
    dailyCashRate: toNumber(w.dailyCashRate),
    dailyNHISRate: toNumber(w.dailyNHISRate),
    dailyInsuranceRate: toNumber(w.dailyInsuranceRate),
    dailyCorporateRate: toNumber(w.dailyCorporateRate),
    isNHISCovered: w.isNHISCovered,
    isPrivateInsExempted: w.isPrivateInsExempted,
  }));
  const wardById = new Map(wardRows.map((w) => [w.id, w]));
  const wardByName = new Map(wardRows.map((w) => [w.wardName, w]));
  const wardsByType = new Map<string, WardRow[]>();
  for (const w of wardRows) {
    const list = wardsByType.get(w.wardType) ?? [];
    list.push(w);
    wardsByType.set(w.wardType, list);
  }

  const bedsByWard = new Map<string, BedRow[]>();
  for (const bed of beds) {
    const list = bedsByWard.get(bed.wardId) ?? [];
    list.push({ id: bed.id, wardId: bed.wardId, bedNumber: bed.bedNumber });
    bedsByWard.set(bed.wardId, list);
  }
  const occupied = await prisma.attendance.findMany({
    where: { bedId: { not: null }, status: { in: ['pending', 'admitted'] } },
    select: { bedId: true },
  });
  const takenBeds = new Set(occupied.map((o) => o.bedId));
  const freeBedsByWard = new Map<string, BedRow[]>();
  const allBedsByWard = new Map<string, BedRow[]>();
  for (const [wardId, list] of bedsByWard) {
    allBedsByWard.set(wardId, list);
    freeBedsByWard.set(wardId, list.filter((b) => !takenBeds.has(b.id)));
  }

  const toServiceRow = (s: any): ServiceRow => {
    const pricing = Array.isArray(s.pricing) ? s.pricing[0] : null;
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      serviceType: String(s.serviceType),
      isNHISCovered: s.isNHISCovered,
      isPrivateInsuranceExempted: s.isPrivateInsuranceExempted,
      stockItemId: s.stockItemId,
      wardId: s.wardId,
      labTestTemplateId: s.labTestTemplateId,
      scanTemplateId: s.scanTemplateId,
      procedureTemplateId: s.procedureTemplateId,
      cashPrice: toNumber(pricing?.cashPrice),
      nhisPrice: toNumber(pricing?.nhisPrice),
      insurancePrice: toNumber(pricing?.insurancePrice),
      corporatePrice: toNumber(pricing?.corporatePrice),
    };
  };
  const serviceByCode = new Map<string, ServiceRow>();
  const serviceByLabTemplate = new Map<string, ServiceRow>();
  const serviceByScanTemplate = new Map<string, ServiceRow>();
  const serviceByProcedureTemplate = new Map<string, ServiceRow>();
  const serviceByStockItem = new Map<string, ServiceRow>();
  for (const s of services.map(toServiceRow)) {
    serviceByCode.set(s.code, s);
    if (s.labTestTemplateId) serviceByLabTemplate.set(s.labTestTemplateId, s);
    if (s.scanTemplateId) serviceByScanTemplate.set(s.scanTemplateId, s);
    if (s.procedureTemplateId) serviceByProcedureTemplate.set(s.procedureTemplateId, s);
    if (s.stockItemId) serviceByStockItem.set(s.stockItemId, s);
  }

  const labTemplateByCode = new Map(labTemplates.map((t) => [
    t.investigationCode,
    { id: t.id, name: t.name, category: String(t.category), resultTemplate: t.resultTemplate },
  ]));
  const scanTemplateByCode = new Map(scanTemplates.map((t) => [
    t.scanCode,
    { id: t.id, name: t.name, category: String(t.category), bodyPart: String(t.bodyPart), scanType: t.scanType, description: t.description },
  ]));
  const procedureTemplateByCode = new Map(procedureTemplates.map((t) => [
    t.procedureCode,
    { id: t.id, name: t.name, category: String(t.category), duration: t.duration },
  ]));
  const diagnosisByIcd = new Map(diagnoses.map((d) => [d.icdCode, { id: d.id, name: d.name }]));

  const medicationStock = stockItems.filter((s) => s.isMedication).map((s) => ({
    id: s.id, name: s.name, category: s.category, drugCode: s.drugCode,
    isMedication: s.isMedication, currentStock: s.currentStock, costPrice: toNumber(s.costPrice),
  }));
  const consumableStock = stockItems.filter((s) => !s.isMedication).map((s) => ({
    id: s.id, name: s.name, category: s.category, drugCode: s.drugCode,
    isMedication: s.isMedication, currentStock: s.currentStock, costPrice: toNumber(s.costPrice),
  }));
  // Slot indices point into the full list ordered by name, exactly as the generator assumes.
  const allStock: StockRow[] = stockItems.map((s) => ({
    id: s.id, name: s.name, category: s.category, drugCode: s.drugCode,
    isMedication: s.isMedication, currentStock: s.currentStock, costPrice: toNumber(s.costPrice),
  }));
  const stockSlot = (slot: number): StockRow | null => allStock[slot] ?? null;

  const batchesByStockItem = new Map<string, BatchRow[]>();
  for (const b of batches) {
    const list = batchesByStockItem.get(b.stockItemId) ?? [];
    list.push({
      id: b.id, stockItemId: b.stockItemId, batchNumber: b.batchNumber, expiryDate: b.expiryDate,
      receivedDate: b.receivedDate, quantity: b.quantity, costPrice: toNumber(b.costPrice),
      departmentId: b.departmentId, wardId: b.wardId,
    });
    batchesByStockItem.set(b.stockItemId, list);
  }

  const stockForDrugGroup = (group: string, salt: string): StockRow | null => {
    if (!medicationStock.length) return null;
    const preset = DRUG_GROUPS[group];
    if (!preset || preset.nameStems.length === 0) {
      return medicationStock[hashOf(salt) % medicationStock.length];
    }
    const categoryWords = (preset.categories ?? []).map((c) => c.toLowerCase());
    const matches = medicationStock.filter((item) => {
      const name = item.name.toLowerCase();
      const category = item.category.toLowerCase();
      return preset.nameStems.some((stem) => name.includes(stem.toLowerCase()))
        || categoryWords.some((word) => category.includes(word));
    });
    const pool = matches.length ? matches : medicationStock;
    return pool[hashOf(salt) % pool.length];
  };

  const insuranceProviderByType = new Map<string, ProviderRow[]>();
  for (const p of providers) {
    const type = String(p.type).toLowerCase();
    const row: ProviderRow = { id: p.id, name: p.name, type, coveragePercentage: toNumber(p.coveragePercentage) };
    const list = insuranceProviderByType.get(type) ?? [];
    list.push(row);
    insuranceProviderByType.set(type, list);
  }
  for (const list of insuranceProviderByType.values()) list.sort((a, b) => a.name.localeCompare(b.name));

  const corporateAccountsRows: CorporateAccountRow[] = corporateAccounts.map((account) => ({
    id: account.id,
    companyName: account.companyName,
    insuranceProviderId: account.insuranceProviderId,
    discountPercentage: toNumber(account.discountPercentage),
  }));
  const corporateEmployeesByAccount = new Map<string, CorporateEmployeeRow[]>();
  for (const emp of corporateEmployees) {
    const list = corporateEmployeesByAccount.get(emp.accountId) ?? [];
    list.push({ id: emp.id, accountId: emp.accountId, fullName: [emp.firstName, emp.otherNames, emp.lastName].filter(Boolean).join(' ') });
    corporateEmployeesByAccount.set(emp.accountId, list);
  }

  const wardServiceFor = (ward: WardRow): ServiceRow | null =>
    serviceByCode.get(`WARD-${ward.wardName.replace(/\s+/g, '_').toUpperCase()}`) ?? null;

  return {
    userByUsername,
    actorId,
    actorName,
    actorDepartmentId,
    userIdsByRole,
    fallbackIds,
    departmentIdByName,
    wardById,
    wardByName,
    wardsByType,
    freeBedsByWard,
    allBedsByWard,
    serviceByCode,
    serviceByLabTemplate,
    serviceByScanTemplate,
    serviceByProcedureTemplate,
    serviceByStockItem,
    consultationCodes: { general: 'CONS-GEN', specialist: 'CONS-SPEC', emergency: 'CONS-EMERG' },
    labTemplateByCode,
    scanTemplateByCode,
    procedureTemplateByCode,
    diagnosisByIcd,
    medicationStock,
    consumableStock,
    stockSlot,
    stockForDrugGroup,
    batchesByStockItem,
    balances: balanceRows.map((b) => ({
      id: b.id, stockItemId: b.stockItemId, locationKey: b.locationKey,
      departmentId: b.departmentId, wardId: b.wardId, quantity: b.quantity,
    })),
    insuranceProviderByType,
    corporateAccounts: corporateAccountsRows,
    corporateEmployeesByAccount,
    facility: facility ? { id: facility.id, name: facility.name, nhisFacilityCode: facility.nhisFacilityCode } : null,
    priceOf: (service, paymentMode, corporateDiscountPercent = 0) => service
      ? resolveUnitPrice(
        { cashPrice: service.cashPrice, nhisPrice: service.nhisPrice, insurancePrice: service.insurancePrice, corporatePrice: service.corporatePrice },
        paymentMode as any,
        { isNHISCovered: service.isNHISCovered, isPrivateInsuranceExempted: service.isPrivateInsuranceExempted, corporateDiscountPercent },
      )
      : 0,
    payerCovers: (service, paymentMode) => !!service && isPayerCovered(
      { cashPrice: service.cashPrice, nhisPrice: service.nhisPrice, insurancePrice: service.insurancePrice, corporatePrice: service.corporatePrice },
      paymentMode as any,
      { isNHISCovered: service.isNHISCovered, isPrivateInsuranceExempted: service.isPrivateInsuranceExempted },
    ),
    wardDailyRate: (ward, paymentMode, corporateDiscountPercent = 0) =>
      resolveWardDailyRate(ward, paymentMode as any, { corporateDiscountPercent }),
    wardServiceFor,
  };
};

/** Enum casts the writer applies to generator strings; an unknown value becomes null, not a crash. */
export const ENUMS = {
  gender: Gender,
  paymentMode: PaymentMode,
  encounterCategory: EncounterCategory,
  serviceType: ServiceType,
  labStatus: LabTestStatus,
  scanStatus: ScanStatus,
  scanPriority: ScanPriority,
  priority: Priority,
  referralType: ReferralType,
  referralStatus: ReferralStatus,
  procedureStatus: ProcedureStatus,
  medicationStatus: MedicationStatus,
  doseStatus: DoseStatus,
  nursingNoteType: NursingNoteType,
  nursingTaskType: NursingTaskType,
  nursingTaskStatus: NursingTaskStatus,
  taskPriority: TaskPriority,
  shiftType: ShiftType,
  shiftStatus: ShiftStatus,
  leaveType: LeaveType,
  leaveStatus: LeaveStatus,
  documentType: DocumentType,
  payslipLineItemType: PayslipLineItemType,
  requisitionStatus: RequisitionStatus,
  requisitionUrgency: RequisitionUrgency,
  transferStatus: TransferStatus,
  waiverType: WaiverType,
  waiverStatus: WaiverStatus,
  eligibilityStatus: EligibilityStatus,
  eligibilityMethod: EligibilityCheckMethod,
  preAuthStatus: PreAuthStatus,
  proformaStatus: ProformaInvoiceStatus,
  insuranceType: InsuranceType,
  communicationType: CommunicationType,
  communicationStatus: CommunicationStatus,
  ghsReportType: GHSReportType,
  malariaCommodity: MalariaCommodityType,
  consentType: ConsentType,
  consentStatus: ConsentStatus,
  fpMethod: FPMethod,
  fpMethodCategory: FPMethodCategory,
  paymentMethod: PaymentMethod,
  stockTransactionType: StockTransactionType,
  billStatus: BillStatus,
  claimStatus: ClaimStatus,
  claimItemCategory: ClaimItemCategory,
  batchStatus: BatchStatus,
  graValidationStatus: GraValidationStatus,
  appointmentStatus: AppointmentStatus,
  appointmentType: AppointmentType,
  auditAction: AuditAction,
  notificationType: NotificationType,
  notificationPriority: NotificationPriority,
  attendanceType: AttendanceType,
  attendanceStatus: AttendanceStatus,
  serviceCategory: ServiceCategory,
  visitCategory: VisitCategory,
  antenatalRisk: AntenatalRisk,
  deliveryType: DeliveryType,
  deliveryOutcome: DeliveryOutcome,
  maternalOutcome: MaternalOutcome,
  newbornOutcome: NewbornOutcome,
  cordCareMethod: CordCareMethod,
  placeOfDelivery: PlaceOfDelivery,
};
