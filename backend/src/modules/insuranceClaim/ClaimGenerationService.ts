import { Prisma, PrismaClient } from '@prisma/client';
import { ValidationError } from '../../utils/errors';
import {
  buildDatesOfService,
  mapAttendanceToServiceOutcome,
  mapAttendanceTypeToTypeOfAttendance,
  mapEncounterCategoryToTypeOfService,
} from './helpers/AttendanceOutcomeMapper';
import { formatPrescription } from './helpers/PrescriptionFormatter';

type Tx = Prisma.TransactionClient;
type ClaimItemDraft = Omit<Prisma.InsuranceClaimItemCreateWithoutClaimInput, 'itemNumber' | 'unitPrice' | 'lineTotal'>;

/**
 * Builds InsuranceClaimItem rows for a NHIS claim.
 * Returns the assembled items and the resolved principal GDRG.
 */
export async function buildNHISClaimItems(
  tx: Tx,
  attendanceId: string,
): Promise<{
  items: Prisma.InsuranceClaimItemCreateWithoutClaimInput[];
  principalGDRG: string | null;
  mdcCode: string | null;
  total: Prisma.Decimal;
}> {
  // ---- Fetch the attendance with everything we need ----
  const att = await tx.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      Patient: true,
      InsuranceProvider: true,
      Admission: true,
      AttendanceDiagnosis: {
        include: {
          Diagnosis: true,
          User: { select: { id: true, fullName: true, licenseNumber: true } },
        },
      },
      LabTest: {
        where: { status: 'completed' },
        include: { LabTestTemplate: true, ServiceCatalog: { include: { pricing: { where: { isActive: true }, orderBy: { effectiveDate: 'desc' }, take: 1 } } } },
      },
      Scan: {
        where: { status: 'completed' },
        include: { ScanTemplate: true, ServiceCatalog: { include: { pricing: { where: { isActive: true }, orderBy: { effectiveDate: 'desc' }, take: 1 } } } },
      },
      Procedure: {
        where: { status: 'completed' },
        include: { ProcedureTemplate: true, ServiceCatalog: { include: { pricing: { where: { isActive: true }, orderBy: { effectiveDate: 'desc' }, take: 1 } } } },
      },
      Medication: {
        // NHIS claims may include only medicines physically dispensed to the patient.
        // An administered dose (e.g. an injection given in the facility) is not a dispensed item.
        where: { status: 'dispensed' },
        include: {
          StockItem: { include: { payerRules: true } },
          ServiceCatalog: { include: { pricing: { where: { isActive: true }, orderBy: { effectiveDate: 'desc' }, take: 1 } } },
        },
      },
      ServiceRendered: {
        include: { ServiceCatalog: { include: { pricing: { where: { isActive: true }, orderBy: { effectiveDate: 'desc' }, take: 1 } } } },
      },
    },
  });

  if (!att) throw new ValidationError(`Attendance ${attendanceId} not found`);

  // ---- Resolve the primary diagnosis + principal GDRG ----
  const primaryDiagnoses = att.AttendanceDiagnosis.filter(
    (d) => d.diagnosisType === 'primary',
  );
  if (primaryDiagnoses.length !== 1) {
    throw new ValidationError(
      `Attendance must have exactly one primary diagnosis (found ${primaryDiagnoses.length})`,
    );
  }
  const primary = primaryDiagnoses[0];

  const primaryGdrgLink = await tx.gDRGTariffDiagnosis.findFirst({
    where: { diagnosisId: primary.diagnosisId },
    include: { gdrgTariff: true },
  });
  if (!primaryGdrgLink) {
    throw new ValidationError(
      `No GDRG tariff mapping for primary diagnosis ${primary.Diagnosis?.icdCode}`,
    );
  }
  const principalGDRG = primaryGdrgLink.gdrgTariff.gdrgCode;
  const mdcCode = primaryGdrgLink.gdrgTariff.mdc as string;
  const principalTariff = primaryGdrgLink.gdrgTariff;

  const primaryPhysicianLicense =
    primary.User?.licenseNumber ?? primary.User?.fullName ?? null;

  // ---- Build items ----
  const items: Prisma.InsuranceClaimItemCreateWithoutClaimInput[] = [];
  let seq = 0;
  let total = new Prisma.Decimal(0);

  const push = (
    item: ClaimItemDraft,
    amount: Prisma.Decimal | number,
  ) => {
    seq += 1;
    const lineTotal = new Prisma.Decimal(amount.toString());
    total = total.plus(lineTotal);
    items.push({
      ...item,
      itemNumber: seq,
      lineTotal,
      unitPrice: item.quantity && item.quantity > 0
        ? lineTotal.dividedBy(item.quantity)
        : lineTotal,
    });
  };

  // 1. Diagnoses
  for (const diag of att.AttendanceDiagnosis) {
    const diagGdrgLink =
      diag === primary
        ? primaryGdrgLink
        : await tx.gDRGTariffDiagnosis.findFirst({
            where: { diagnosisId: diag.diagnosisId },
            include: { gdrgTariff: true },
          });
    const gdrgCode = diagGdrgLink?.gdrgTariff.gdrgCode ?? principalGDRG;
    const gdrgTariffId = diagGdrgLink?.gdrgTariff.id ?? principalTariff.id;

    push(
      {
        diagnosis: { connect: { id: diag.diagnosisId } },
        gdrgTariff: { connect: { id: gdrgTariffId } },
        itemCategory: 'diagnosis',
        itemType: 'D',
        code: diag.Diagnosis?.icdCode ?? '',
        description: diag.Diagnosis?.name ?? '',
        quantity: 1,
        serviceDate: diag.date,
        clinician: primaryPhysicianLicense,
        prescriberNo: primaryPhysicianLicense,
      },
      // Diagnoses are priced 0 on their own — the GDRG line below carries the tariff
      0,
    );
  }

  // 2. Investigations (labs + scans)
  for (const lab of att.LabTest) {
    // NHIS investigation lines must carry the payer's INVE code, never the
    // facility's internal LAB-* service-catalog code.
    const investigationCode = String(
      lab.LabTestTemplate?.investigationCode ?? lab.ServiceCatalog?.nhisServiceCode ?? '',
    ).trim().toUpperCase();
    if (!/^INVE[0-9]/.test(investigationCode)) {
      throw new ValidationError(
        `Completed lab test "${lab.LabTestTemplate?.name ?? lab.id}" has no valid NHIS INVE investigation code.`,
      );
    }
    push(
      {
        labTest: { connect: { id: lab.id } },
        serviceCatalog: lab.serviceCatalogId ? { connect: { id: lab.serviceCatalogId } } : undefined,
        itemCategory: 'investigation',
        itemType: 'N',
        code: investigationCode,
        description: lab.LabTestTemplate?.name ?? lab.ServiceCatalog?.name ?? '',
        quantity: 1,
        serviceDate: lab.completedAt ?? lab.requestedAt,
        clinician: primaryPhysicianLicense,
        prescriberNo: primaryPhysicianLicense,
      },
      extractNHISPrice(lab.ServiceCatalog),
    );
  }
  for (const scan of att.Scan) {
    const investigationCode = String(
      scan.ScanTemplate?.investigationCode ?? scan.ServiceCatalog?.nhisServiceCode ?? '',
    ).trim().toUpperCase();
    if (!/^INVE[0-9]/.test(investigationCode)) {
      throw new ValidationError(
        `Completed scan "${scan.ScanTemplate?.name ?? scan.id}" has no valid NHIS INVE investigation code.`,
      );
    }
    push(
      {
        scan: { connect: { id: scan.id } },
        serviceCatalog: scan.serviceCatalogId ? { connect: { id: scan.serviceCatalogId } } : undefined,
        itemCategory: 'investigation',
        itemType: 'N',
        code: investigationCode,
        description: scan.ScanTemplate?.name ?? scan.ServiceCatalog?.name ?? 'Ultrasound',
        quantity: 1,
        serviceDate: scan.completedAt ?? scan.requestedAt,
        clinician: primaryPhysicianLicense,
        prescriberNo: primaryPhysicianLicense,
      },
      extractNHISPrice(scan.ServiceCatalog),
    );
  }

  // 3. Procedures
  for (const proc of att.Procedure) {
    const procedureCode = String(
      proc.ProcedureTemplate?.procedureCode ?? proc.ServiceCatalog?.nhisServiceCode ?? '',
    ).trim().toUpperCase();
    if (!procedureCode || /^PROC-/i.test(procedureCode)) {
      throw new ValidationError(
        `Completed procedure "${proc.ProcedureTemplate?.name ?? proc.id}" has no valid NHIS procedure tariff code.`,
      );
    }
    push(
      {
        procedure: { connect: { id: proc.id } },
        serviceCatalog: proc.serviceCatalogId ? { connect: { id: proc.serviceCatalogId } } : undefined,
        itemCategory: 'procedure',
        itemType: 'N',
        code: procedureCode,
        description: proc.ProcedureTemplate?.name ?? proc.ServiceCatalog?.name ?? '',
        quantity: 1,
        serviceDate: proc.performedAt ?? proc.scheduledDate ?? undefined,
        clinician: primaryPhysicianLicense,
        prescriberNo: primaryPhysicianLicense,
      },
      extractNHISPrice(proc.ServiceCatalog),
    );
  }

  // 4. Medications
  // Only a medicine explicitly listed as covered for this NHIS provider and
  // effective on the service date may enter the claim. Missing/unverified rules
  // are treated as not listed; patient-pay medicines stay off the NHIS XML.
  for (const med of att.Medication) {
    if (med.status !== 'dispensed' && med.status !== 'administered') continue;
    const dispensedQuantity = Number(med.dispensedQuantity ?? med.quantity ?? 0);
    if (!Number.isSafeInteger(dispensedQuantity) || dispensedQuantity <= 0) continue;
    const medicineServiceDate = med.dispensedAt ?? med.prescribedAt;
    const payerRule = med.StockItem?.payerRules?.find(
      (rule: any) => rule.insuranceProviderId === att.insuranceProviderId,
    );
    const ruleEffective = !!payerRule
      && payerRule.isCovered === true
      && (!payerRule.effectiveFrom || payerRule.effectiveFrom <= medicineServiceDate)
      && (!payerRule.effectiveTo || payerRule.effectiveTo >= medicineServiceDate);
    if (!med.StockItem || med.StockItem.isNHISCovered !== true || !med.StockItem.drugCode || !ruleEffective) {
      continue;
    }
    const code = med.StockItem.drugCode;
    push(
      {
        medication: { connect: { id: med.id } },
        serviceCatalog: med.serviceCatalogId ? { connect: { id: med.serviceCatalogId } } : undefined,
        itemCategory: 'medicine',
        itemType: 'N',
        code,
        description: med.name ?? med.StockItem?.name ?? '',
        quantity: dispensedQuantity,
        serviceDate: med.dispensedAt ?? med.prescribedAt,
        prescriptionText: formatPrescription({
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
        }),
        prescriptionSnapshot: {
          medicationId: med.id,
          name: med.name ?? med.StockItem?.name ?? null,
          stockItemId: med.stockItemId,
          medicineStrength: med.StockItem?.strength ?? null,
          doseAmount: med.doseAmount?.toString?.() ?? null,
          doseUnit: med.doseUnit ?? null,
          dosageText: med.dosage ?? null,
          frequencyCode: med.frequencyCode ?? null,
          frequencyText: med.frequency ?? null,
          frequencyIntervalHours: med.frequencyIntervalHours ?? null,
          durationValue: med.durationValue ?? null,
          durationUnit: med.durationUnit ?? null,
          durationText: med.duration ?? null,
          route: med.route ?? null,
          instructions: med.instructions ?? null,
          prnIndication: med.prnIndication ?? null,
          prnMaxDosesPerDay: med.prnMaxDosesPerDay ?? null,
          prnMinimumIntervalHours: med.prnMinimumIntervalHours ?? null,
          prescribedQuantity: med.quantity,
          quantityUnit: med.quantityUnit ?? med.StockItem?.unitOfMeasure ?? null,
          dispensedQuantity: med.dispensedQuantity ?? dispensedQuantity,
          dispensedAt: med.dispensedAt?.toISOString?.() ?? null,
          prescribedAt: med.prescribedAt?.toISOString?.() ?? null,
          prescribedById: med.prescribedById,
          prescriptionVersion: med.prescriptionVersion ?? 1,
        },
        prescriptionSnapshotAt: new Date(),
        prescriptionSnapshotVersion: med.prescriptionVersion ?? 1,
        clinician: primaryPhysicianLicense,
        prescriberNo: primaryPhysicianLicense,
      },
      extractNHISPrice(med.ServiceCatalog).times(dispensedQuantity),
    );
  }

  // 5. Services rendered (consultations, ward days etc.)
  for (const svc of att.ServiceRendered) {
    push(
      {
        serviceCatalog: { connect: { id: svc.serviceItemId } },
        itemCategory: 'service',
        itemType: 'A',
        code: svc.ServiceCatalog?.nhisServiceCode ?? svc.ServiceCatalog?.code ?? '',
        description: svc.ServiceCatalog?.name ?? '',
        quantity: svc.quantity ?? 1,
        serviceDate: svc.date,
        clinician: primaryPhysicianLicense,
        prescriberNo: primaryPhysicianLicense,
      },
      extractNHISPrice(svc.ServiceCatalog).times(svc.quantity ?? 1),
    );
  }

  // 6. GDRG line (the principal tariff line — carries the NHIS tariff value)
  push(
    {
      gdrgTariff: { connect: { id: principalTariff.id } },
      itemCategory: 'gdrg',
      itemType: 'G',
      code: principalGDRG,
      description: principalTariff.description,
      quantity: 1,
      serviceDate: att.dateTime,
      clinician: primaryPhysicianLicense,
      prescriberNo: primaryPhysicianLicense,
    },
    principalTariff.nhiaTariff,
  );

  return {
    items,
    principalGDRG,
    mdcCode,
    total,
  };
}

/**
 * Builds InsuranceClaimItem rows for a private / corporate claim.
 * Source of truth is the BillLineItem table (the itemised bill).
 */
export async function buildBillClaimItems(
  tx: Tx,
  attendanceId: string,
): Promise<{
  items: Prisma.InsuranceClaimItemCreateWithoutClaimInput[];
  total: Prisma.Decimal;
}> {
  const bill = await tx.bill.findFirst({
    where: { attendanceId },
    include: {
      BillLineItem: {
        where: { isVoided: false },
        include: { serviceCatalog: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!bill) throw new ValidationError('No bill found for this attendance');
  if (!bill.BillLineItem.length) {
    throw new ValidationError('Bill has no active line items');
  }

  const items: Prisma.InsuranceClaimItemCreateWithoutClaimInput[] = [];
  let total = new Prisma.Decimal(0);
  let seq = 0;

  for (const line of bill.BillLineItem) {
    seq += 1;
    total = total.plus(line.lineTotal);
    items.push({
      itemNumber: seq,
      billLineItem: { connect: { id: line.id } },
      serviceCatalog: line.serviceCatalogId ? { connect: { id: line.serviceCatalogId } } : undefined,
      itemCategory: mapBillServiceType(line.serviceType),
      itemType: null,
      code: line.serviceCatalog?.nhisServiceCode ?? line.serviceCatalog?.code ?? '',
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      serviceDate: line.createdAt,
    });
  }

  return { items, total };
}

function mapBillServiceType(
  serviceType: string,
): 'diagnosis' | 'investigation' | 'medicine' | 'procedure' | 'service' | 'gdrg' {
  switch (serviceType) {
    case 'consultation':
    case 'ward':
    case 'miscellaneous':
      return 'service';
    case 'lab_test':
    case 'scan':
      return 'investigation';
    case 'medication':
      return 'medicine';
    case 'procedure':
      return 'procedure';
    case 'diagnosis':
      return 'diagnosis';
    default:
      return 'service';
  }
}

function extractNHISPrice(
  serviceCatalog: any,
): Prisma.Decimal {
  const pricing = serviceCatalog?.pricing?.[0];
  // A configured tariff alone does not make a service claimable: the service
  // catalogue's explicit NHIS coverage flag must also allow it.
  if (!pricing || serviceCatalog?.isNHISCovered === false) {
    return new Prisma.Decimal(0);
  }
  const amount = Number(pricing.nhisPrice ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return new Prisma.Decimal(0);
  return new Prisma.Decimal(amount.toString());
}