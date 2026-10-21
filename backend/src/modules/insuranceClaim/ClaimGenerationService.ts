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
        where: { status: { in: ['dispensed', 'administered'] } },
        include: { StockItem: true, ServiceCatalog: { include: { pricing: { where: { isActive: true }, orderBy: { effectiveDate: 'desc' }, take: 1 } } } },
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
    item: Omit<Prisma.InsuranceClaimItemCreateWithoutClaimInput, 'itemNumber'>,
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
    push(
      {
        labTest: { connect: { id: lab.id } },
        serviceCatalog: lab.serviceCatalogId ? { connect: { id: lab.serviceCatalogId } } : undefined,
        itemCategory: 'investigation',
        itemType: 'N',
        code: lab.LabTestTemplate?.investigationCode ?? lab.ServiceCatalog?.code ?? '',
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
    push(
      {
        scan: { connect: { id: scan.id } },
        serviceCatalog: scan.serviceCatalogId ? { connect: { id: scan.serviceCatalogId } } : undefined,
        itemCategory: 'investigation',
        itemType: 'N',
        code: scan.ScanTemplate?.investigationCode ?? scan.ServiceCatalog?.code ?? '',
        description: scan.ScanTemplate?.name ?? scan.ServiceCatalog?.name ?? '',
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
    push(
      {
        procedure: { connect: { id: proc.id } },
        serviceCatalog: proc.serviceCatalogId ? { connect: { id: proc.serviceCatalogId } } : undefined,
        itemCategory: 'procedure',
        itemType: 'N',
        code: proc.ProcedureTemplate?.procedureCode ?? proc.ServiceCatalog?.code ?? '',
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
  for (const med of att.Medication) {
    const code = med.StockItem?.drugCode ?? med.ServiceCatalog?.code ?? '';
    push(
      {
        medication: { connect: { id: med.id } },
        serviceCatalog: med.serviceCatalogId ? { connect: { id: med.serviceCatalogId } } : undefined,
        itemCategory: 'medicine',
        itemType: 'N',
        code,
        description: med.name ?? med.StockItem?.name ?? '',
        quantity: med.quantity ?? 1,
        serviceDate: med.dispensedAt ?? med.prescribedAt,
        prescriptionText: formatPrescription({
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
        }),
        clinician: primaryPhysicianLicense,
        prescriberNo: primaryPhysicianLicense,
      },
      extractNHISPrice(med.ServiceCatalog).times(med.quantity ?? 1),
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
      code: line.serviceCatalog?.code ?? '',
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
  if (!pricing) return new Prisma.Decimal(0);
  return new Prisma.Decimal((pricing.nhisPrice ?? 0).toString());
}