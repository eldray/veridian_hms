// src/seed/testSeed/operations.ts
//
// The screens that sit around the clinical record: the appointment desk, the
// family-planning room, the notification bell, the audit trail, the messaging log,
// the GHS returns archive and the malaria commodity card.
//
// Two of these tables are not written by hand anywhere else in the application, so
// the seed does not write them by hand either. The audit trail is hash-chained
// (appendAuditLog links every row to the one before it, and the verify endpoint
// reports the first row that does not match), and family planning derives the
// new-acceptor flag from the patient's dated history instead of trusting the form.
// Both go through their own service, so a seeded row is indistinguishable from one
// the app made.

import { Prisma, UserRole } from '@prisma/client';
import { FamilyPlanningService } from '../../modules/familyPlanning/FamilyPlanningService.js';
import { GHSReportService } from '../../modules/ghsReport/GHSReportService.js';
import { appendAuditLog } from '../../services/auditChain.js';
import type {
  Actor, GeneratedAuditLog, GeneratedCommunicationLog, GeneratedGhsSubmission,
  GeneratedMalariaStock, GeneratedNotification,
} from '../bulkGenerator.js';
import { ENUMS, type Lookups } from './lookups.js';
import type { EncounterIndex } from './encounters.js';
import type { PatientRecords } from './patients.js';
import { asCalendarDay, chunk, hashOf, money, pickEnum, prisma, writeMany, type SeedStats } from './shared.js';

/** One row of generateAppointments() - the function returns an inline shape. */
export interface GeneratedAppointmentPlan {
  appointmentNumber: string;
  folderNumber: string;
  title: string;
  scheduledAt: Date;
  duration: number;
  status: string;
  type: string;
  notes: string;
  createdBy: Actor;
  clinician: Actor;
}

/** One row of generateFamilyPlanning(), which is deliberately untyped in the generator. */
export interface GeneratedFamilyPlan {
  patientFolderNumber: string;
  serviceDate: Date;
  method: string;
  methodCategory: string;
  counsellingGiven: boolean;
  informedConsent: boolean;
  switchedFrom: string | null;
  reasonForSwitching: string | null;
  parity: number;
  notes: string;
}

/**
 * The encounters an operations row can point at.
 *
 * byFollowUp matches the exact timestamp the encounter carried into the appointment, so a
 * booked review and the clinical record that ordered it are the same visit. byServiceDay is
 * looser - a family-planning consult only has to land on a day the patient attended.
 */
const indexEncounters = (encounters: Map<string, EncounterIndex>) => {
  const byFollowUp = new Map<string, string>();
  const byServiceDay = new Map<string, string>();
  for (const encounter of encounters.values()) {
    if (!encounter.patientId || !encounter.plan.folderNumber) continue;
    const folder = encounter.plan.folderNumber;
    if (encounter.plan.followUpDate) {
      byFollowUp.set(`${folder}|${encounter.plan.followUpDate.getTime()}`, encounter.attendanceId);
    }
    if (encounter.plan.status !== 'cancelled') {
      const day = `${folder}|${asCalendarDay(encounter.plan.dateTime).getTime()}`;
      if (!byServiceDay.has(day)) byServiceDay.set(day, encounter.attendanceId);
    }
  }
  return { byFollowUp, byServiceDay };
};

/**
 * Appointments, including the ones that became the follow-up date on a real encounter.
 *
 * AttendanceId is unique on the table, so an encounter can back one booking only; the
 * claim set stops a second appointment from trying to reuse the same visit.
 */
export const seedAppointments = async (
  lookups: Lookups,
  patients: PatientRecords,
  encounters: Map<string, EncounterIndex>,
  appointments: GeneratedAppointmentPlan[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const { byFollowUp } = indexEncounters(encounters);
  const roleById = new Map<string, string>();
  for (const user of lookups.userByUsername.values()) roleById.set(user.id, user.role);

  const rows: Prisma.AppointmentCreateManyInput[] = [];
  const claimed = new Set<string>();

  for (const plan of appointments) {
    const patientId = patients.idByFolder.get(plan.folderNumber);
    if (!patientId) continue;
    const clinicianId = lookups.actorId(plan.clinician);
    const createdById = lookups.actorId(plan.createdBy);
    const followUpVisit = byFollowUp.get(`${plan.folderNumber}|${plan.scheduledAt.getTime()}`);
    const attendanceId = followUpVisit && !claimed.has(followUpVisit) ? followUpVisit : undefined;
    if (attendanceId) claimed.add(attendanceId);

    const status = pickEnum(ENUMS.appointmentStatus, plan.status) ?? ENUMS.appointmentStatus.scheduled;
    const type = pickEnum(ENUMS.appointmentType, plan.type) ?? ENUMS.appointmentType.other;
    // A patient who is in the room, was seen or went through the whole visit was checked in.
    const attended = status === ENUMS.appointmentStatus.checked_in
      || status === ENUMS.appointmentStatus.in_progress
      || status === ENUMS.appointmentStatus.completed;
    const bookedAt = new Date(Math.min(plan.scheduledAt.getTime() - 2 * 86_400_000, Date.now()));

    rows.push({
      appointmentNumber: `APT-${plan.appointmentNumber}`,
      patientId,
      clinicianId,
      clinicianRole: (roleById.get(clinicianId) ?? plan.clinician.role) as UserRole,
      departmentId: lookups.actorDepartmentId(plan.clinician) ?? undefined,
      title: plan.title,
      description: plan.notes,
      scheduledAt: plan.scheduledAt,
      duration: plan.duration,
      status,
      type,
      // Only a booking that moved past "scheduled" ever had a reminder sent for it.
      reminderSent: status !== ENUMS.appointmentStatus.scheduled,
      checkedIn: attended,
      checkedInAt: attended ? plan.scheduledAt : undefined,
      createdAt: bookedAt,
      updatedAt: attended ? plan.scheduledAt : bookedAt,
      createdBy: createdById,
      attendanceId,
    });
  }

  await writeMany('appointments', (part) => prisma.appointment.createMany({ data: part }), rows, stats, planned);
};

/** When the method asks to be reviewed again - sterilisation and long acting methods do not. */
const FP_REVIEW_DAYS: Record<string, number | null> = {
  pill_coc: 30, pill_pop: 30, injectable_dmpa: 90, injectable_net_en: 90,
  condom_male: 30, condom_female: 30, emergency_contraception: 28, lam: 180,
  implant_implanon: 365, implant_jadelle: 365, iud_copper: 365, iud_hormonal: 365,
  female_sterilization: null, male_sterilization: null,
  withdrawal: null, calendar: null, other_traditional: null,
};

/**
 * Family-planning consults, written through the application's own service.
 *
 * Rows are offered oldest first because the service decides who is a new acceptor by
 * counting the patient's earlier visits: inserting out of order would mark a patient new
 * twice. The couple-years-of-protection figure is left to the service too, so it matches
 * the method table the CYP statistic divides by rather than a random number.
 */
export const seedFamilyPlanning = async (
  lookups: Lookups,
  patients: PatientRecords,
  encounters: Map<string, EncounterIndex>,
  plans: GeneratedFamilyPlan[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const service = new FamilyPlanningService(prisma);
  const { byServiceDay } = indexEncounters(encounters);
  planned['family planning'] = (planned['family planning'] ?? 0) + plans.length;

  let written = 0;
  let rejected = 0;
  const ordered = [...plans].sort((a, b) => a.serviceDate.getTime() - b.serviceDate.getTime());

  for (const [index, plan] of ordered.entries()) {
    const patientId = patients.idByFolder.get(plan.patientFolderNumber);
    if (!patientId) continue;
    const method = pickEnum(ENUMS.fpMethod, plan.method);
    const methodCategory = pickEnum(ENUMS.fpMethodCategory, plan.methodCategory);
    if (!method || !methodCategory) continue;

    const reviewDays = FP_REVIEW_DAYS[plan.method] ?? null;
    const notes = [
      plan.notes,
      `Parity ${plan.parity}.`,
      plan.switchedFrom
        ? `Switched from ${plan.switchedFrom.replace(/_/g, ' ')}; ${plan.reasonForSwitching ?? 'method change discussed at the visit'}`
        : null,
    ].filter(Boolean).join(' ');

    try {
      await service.createFPService({
        patientId,
        attendanceId: byServiceDay.get(`${plan.patientFolderNumber}|${asCalendarDay(plan.serviceDate).getTime()}`),
        serviceDate: plan.serviceDate,
        method,
        methodCategory,
        counsellingGiven: plan.counsellingGiven,
        informedConsent: plan.informedConsent,
        medicalEligibilityCategory: 1 + (hashOf(`${plan.patientFolderNumber}-${index}`) % 2),
        nextFollowUpDate: reviewDays ? new Date(plan.serviceDate.getTime() + reviewDays * 86_400_000) : undefined,
        providedById: lookups.actorId({ role: 'midwife', salt: index } as Actor),
        notes,
      });
      written++;
    } catch {
      rejected++;
    }
  }

  stats['family planning'] = (stats['family planning'] ?? 0) + written;
  console.log(`✅ ${written}/${plans.length} family planning services${rejected ? ` (${rejected} rejected)` : ''}`);
};

/**
 * The notification bell. Each row goes to a user drawn from the roles that act on the
 * topic, so the pharmacy alerts land with the pharmacist and the billing alerts with accounts.
 */
export const seedNotifications = async (
  lookups: Lookups,
  notifications: GeneratedNotification[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const rows: Prisma.NotificationCreateManyInput[] = [];

  for (const plan of notifications) {
    const userId = lookups.actorId({ role: plan.recipientRole, salt: plan.recipientSalt });
    const senderId = lookups.actorId({ role: plan.senderRole, salt: plan.senderSalt });
    const type = pickEnum(ENUMS.notificationType, plan.type) ?? ENUMS.notificationType.info;
    const priority = pickEnum(ENUMS.notificationPriority, plan.priority) ?? ENUMS.notificationPriority.medium;
    rows.push({
      userId,
      senderId,
      title: plan.title,
      message: plan.message,
      type,
      priority,
      actionType: plan.actionType,
      actionUrl: plan.actionUrl,
      isRead: plan.isRead,
      readAt: plan.readAt ?? undefined,
      createdAt: plan.createdAt,
      updatedAt: plan.readAt ?? plan.createdAt,
    });
  }

  await writeMany('notifications', (part) => prisma.notification.createMany({ data: part }), rows, stats, planned);
};

/**
 * Where an audit entity type finds the rows it can point at.
 *
 * The trail is only evidence if the id it names still exists, so every row is attached to
 * a real row read back from the table the earlier writers filled. A type with no rows left
 * is dropped rather than given an invented id.
 */
const AUDIT_ID_QUERY: Record<string, () => Promise<Array<{ id: string }>>> = {
  Patient: () => prisma.patient.findMany({ select: { id: true }, take: 500 }),
  Attendance: () => prisma.attendance.findMany({ select: { id: true }, take: 500 }),
  Bill: () => prisma.bill.findMany({ select: { id: true }, take: 500 }),
  Payment: () => prisma.payment.findMany({ select: { id: true }, take: 500 }),
  LabTest: () => prisma.labTest.findMany({ select: { id: true }, take: 500 }),
  Scan: () => prisma.scan.findMany({ select: { id: true }, take: 500 }),
  Procedure: () => prisma.procedure.findMany({ select: { id: true }, take: 500 }),
  Medication: () => prisma.medication.findMany({ select: { id: true }, take: 500 }),
  Vitals: () => prisma.vitals.findMany({ select: { id: true }, take: 500 }),
  Admission: () => prisma.admission.findMany({ select: { id: true }, take: 500 }),
  InsuranceClaim: () => prisma.insuranceClaim.findMany({ select: { id: true }, take: 500 }),
  Appointment: () => prisma.appointment.findMany({ select: { id: true }, take: 500 }),
  Requisition: () => prisma.requisition.findMany({ select: { id: true }, take: 500 }),
  StockTransfer: () => prisma.stockTransfer.findMany({ select: { id: true }, take: 500 }),
  Invoice: () => prisma.invoice.findMany({ select: { id: true }, take: 500 }),
  ProformaInvoice: () => prisma.proformaInvoice.findMany({ select: { id: true }, take: 500 }),
  User: () => prisma.user.findMany({ select: { id: true }, take: 500 }),
};

/**
 * How many rows each audit entity type actually has, so the generator only writes a trail
 * entry against a table the earlier writers filled; a type with no rows is never chosen.
 */
export const auditEntityCounts = async (): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};
  await Promise.all(Object.entries(AUDIT_ID_QUERY).map(async ([entityType, query]) => {
    counts[entityType] = (await query()).length;
  }));
  return counts;
};

/**
 * The tamper-evident trail, appended one row at a time through the application's own
 * chain writer.
 *
 * Each row hashes the row before it, so a bulk insert would leave the verify endpoint
 * reporting the whole seed as tampered evidence. That costs one transaction per row, and
 * it is worth it: the trail is the one table whose integrity the application advertises.
 */
export const seedAuditLogs = async (
  lookups: Lookups,
  logs: GeneratedAuditLog[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  planned['audit logs'] = (planned['audit logs'] ?? 0) + logs.length;

  const pools = new Map<string, string[]>();
  await Promise.all(Object.entries(AUDIT_ID_QUERY).map(async ([entityType, query]) => {
    const rows = await query();
    if (rows.length) pools.set(entityType, rows.map((row) => row.id));
  }));

  let written = 0;
  let dropped = 0;
  let firstError = '';

  for (const plan of logs) {
    const ids = pools.get(plan.entityType);
    const action = pickEnum(ENUMS.auditAction, plan.action);
    if (!ids || !action) { dropped++; continue; }
    try {
      await appendAuditLog(prisma, {
        entityType: plan.entityType,
        entityId: ids[plan.entitySlot % ids.length],
        action,
        performedById: lookups.actorId(plan.performedBy),
        ipAddress: plan.ipAddress,
        userAgent: plan.userAgent,
        previousState: plan.previousState,
        newState: plan.newState,
        timestamp: plan.timestamp,
      });
      written++;
    } catch (error: any) {
      dropped++;
      firstError ||= error?.message ?? String(error);
    }
  }

  stats['audit logs'] = (stats['audit logs'] ?? 0) + written;
  console.log(`✅ ${written}/${logs.length} audit trail entries${firstError ? ` - first failure: ${firstError.slice(0, 120)}` : ''}`);
};

/** Channels the messaging screens look up by name, so the seed uses the same names. */
const CHANNELS: Array<{ name: string; provider: string; kind: 'phone' | 'email' }> = [
  { name: 'SMS Gateway', provider: 'Hubtel', kind: 'phone' },
  { name: 'WhatsApp Business', provider: 'Hubtel', kind: 'phone' },
  { name: 'Email SMTP', provider: 'Direct mail', kind: 'email' },
];

/** One template per message type; the body carries the variables the send form fills in. */
const TEMPLATE_COPY: Record<string, { subject: string; body: string; variables: string[] }> = {
  APPOINTMENT_REMINDER: {
    subject: 'Appointment reminder',
    body: 'Dear {{patient_name}}, this is a reminder of your appointment on {{appointment_date}} at {{appointment_time}}. Please arrive ten minutes early and bring your membership card.',
    variables: ['patient_name', 'appointment_date', 'appointment_time'],
  },
  APPOINTMENT_CONFIRMATION: {
    subject: 'Appointment confirmed',
    body: 'Dear {{patient_name}}, your appointment on {{appointment_date}} at {{appointment_time}} is confirmed. Reply STOP to opt out of reminders.',
    variables: ['patient_name', 'appointment_date', 'appointment_time'],
  },
  LAB_RESULT_READY: {
    subject: 'Laboratory result ready',
    body: 'Dear {{patient_name}}, the result of {{test_name}} requested on {{request_date}} is ready for review by your clinician.',
    variables: ['patient_name', 'test_name', 'request_date'],
  },
  PRESCRIPTION_READY: {
    subject: 'Prescription ready',
    body: 'Dear {{patient_name}}, your prescription is ready for collection at the pharmacy. Opening hours are 08:00 to 20:00 daily.',
    variables: ['patient_name'],
  },
  PAYMENT_REMINDER: {
    subject: 'Outstanding balance',
    body: 'Dear {{patient_name}}, our records show an outstanding balance of {{amount}} on bill {{bill_number}}. Please settle it at the billing desk to avoid a delay in your next visit.',
    variables: ['patient_name', 'amount', 'bill_number'],
  },
  BILL_NOTIFICATION: {
    subject: 'Bill issued',
    body: 'Dear {{patient_name}}, bill {{bill_number}} for {{amount}} has been raised for your visit on {{visit_date}}. The itemised statement is available at the billing desk.',
    variables: ['patient_name', 'bill_number', 'amount', 'visit_date'],
  },
  WELCOME_MESSAGE: {
    subject: 'Welcome',
    body: 'Welcome to {{facility_name}}, {{patient_name}}. Your folder number is {{folder_number}}. Keep it with you for every visit.',
    variables: ['facility_name', 'patient_name', 'folder_number'],
  },
  GENERAL_NOTIFICATION: {
    subject: 'Notice',
    body: 'Dear {{patient_name}}, {{message}}. Thank you for choosing {{facility_name}}.',
    variables: ['patient_name', 'message', 'facility_name'],
  },
};

const ensureChannel = async (name: string, provider: string): Promise<string> => {
  const existing = await prisma.communicationChannel.findFirst({ where: { name }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.communicationChannel.create({
    data: { name, provider, isActive: true, settings: {} },
    select: { id: true },
  });
  return created.id;
};

const ensureTemplate = async (channelId: string, templateType: string): Promise<string | null> => {
  const copy = TEMPLATE_COPY[templateType];
  if (!copy) return null;
  const name = `${templateType.replace(/_/g, ' ')} (default)`;
  const existing = await prisma.communicationTemplate.findFirst({ where: { channelId, name }, select: { id: true } });
  if (existing) return existing.id;
  const type = pickEnum(ENUMS.communicationType, templateType) ?? ENUMS.communicationType.GENERAL_NOTIFICATION;
  const created = await prisma.communicationTemplate.create({
    data: {
      channelId, name, type, subject: copy.subject, body: copy.body,
      variables: copy.variables as unknown as Prisma.InputJsonValue, isActive: true,
    },
    select: { id: true },
  });
  return created.id;
};

/**
 * The message log, on the channels the stats endpoint already looks for and to addresses
 * taken from real patient and staff records.
 *
 * The application has no email sender, so only the SMS and WhatsApp channels are counted by
 * name on the dashboard; the email channel exists so the history view can show what was sent
 * without inventing a recipient nobody has.
 */
export const seedCommunications = async (
  logs: GeneratedCommunicationLog[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  planned['communication logs'] = (planned['communication logs'] ?? 0) + logs.length;

  const channelIds = new Map<string, string>();
  const templateIds = new Map<string, string | null>();
  for (const channel of CHANNELS) channelIds.set(channel.name, await ensureChannel(channel.name, channel.provider));
  for (const [name, channelId] of channelIds) {
    for (const templateType of Object.keys(TEMPLATE_COPY)) {
      templateIds.set(`${name}|${templateType}`, await ensureTemplate(channelId, templateType));
    }
  }

  // Recipients are the numbers and addresses the records actually hold.
  const [phoneRows, emailRows] = await Promise.all([
    prisma.patient.findMany({ where: { phoneNumber: { not: null } }, select: { phoneNumber: true }, take: 2000 }),
    prisma.user.findMany({ where: { email: { not: null } }, select: { email: true }, take: 500 }),
  ]);
  const phones = phoneRows.map((row) => row.phoneNumber!).filter(Boolean);
  const emails = emailRows.map((row) => row.email!).filter(Boolean);

  const rows: Prisma.CommunicationLogCreateManyInput[] = [];
  for (const plan of logs) {
    const channelId = channelIds.get(plan.channelName);
    if (!channelId) continue;
    const pool = plan.recipientKind === 'email' ? emails : phones;
    if (!pool.length) continue;
    const status = pickEnum(ENUMS.communicationStatus, plan.status) ?? ENUMS.communicationStatus.PENDING;
    const lastTouch = plan.readAt ?? plan.deliveredAt ?? plan.failedAt ?? plan.sentAt ?? plan.createdAt;
    rows.push({
      channelId,
      templateId: templateIds.get(`${plan.channelName}|${plan.templateType}`) ?? undefined,
      recipient: pool[plan.recipientSeed % pool.length],
      message: plan.message,
      status,
      sentAt: plan.sentAt ?? undefined,
      deliveredAt: plan.deliveredAt ?? undefined,
      readAt: plan.readAt ?? undefined,
      failedAt: plan.failedAt ?? undefined,
      failureReason: plan.failureReason ?? undefined,
      metadata: { channelType: plan.channelType, templateType: plan.templateType } as unknown as Prisma.InputJsonValue,
      cost: money(plan.cost),
      providerMessageId: plan.providerMessageId ?? undefined,
      createdAt: plan.createdAt,
      updatedAt: lastTouch,
    });
  }

  await writeMany('communication logs', (part) => prisma.communicationLog.createMany({ data: part }), rows, stats, planned);
};

/**
 * The GHS return a monthly submission can be exported from.
 *
 * The payload comes from the same generator the "generate report" endpoint calls, so an
 * archived submission holds what the CSV export for that report type expects and agrees with
 * the clinical rows in its period. Only the report types the application actually archives are
 * written; the rest of the enum has no save path to imitate.
 */
const REPORT_BUILDERS: Record<string, (service: GHSReportService, start: Date, end: Date) => Promise<unknown>> = {
  opd_attendance: (service, start, end) => service.generateOPDReport(start, end),
  ipd_morbidity: (service, start, end) => service.generateIPDReport(start, end),
  form_a_morbidity: (service, start, end) => service.generateMorbidityReport(start, end),
  malaria_data: (service, start, end) => service.generateMalariaReport(start, end),
  form_a_complete: (service, start, end) => service.generateFormAReport(start, end),
  idsr: (service, start, end) => service.generateIDSRReport(start, end),
};

export const seedGhsSubmissions = async (
  lookups: Lookups,
  submissions: GeneratedGhsSubmission[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  planned['ghs submissions'] = (planned['ghs submissions'] ?? 0) + submissions.length;

  const service = new GHSReportService(prisma);
  let written = 0;
  let firstError = '';

  for (const plan of submissions) {
    const build = REPORT_BUILDERS[plan.reportType];
    if (!build) continue;
    const createdById = lookups.actorId(plan.createdBy);
    try {
      const data = await build(service, plan.periodStart, plan.periodEnd);
      const saved: any = await service.saveSubmission(plan.reportType, plan.periodStart, plan.periodEnd, data, createdById);
      // The dispatch side of a return is not something the generate endpoint records.
      await prisma.gHSReportSubmission.update({
        where: { id: saved.id },
        data: {
          reportingQuarter: plan.reportingQuarter ?? undefined,
          submittedToDHIMS2: plan.submittedToDHIMS2,
          dhims2Reference: plan.dhims2Reference ?? undefined,
          submittedAt: plan.submittedAt ?? undefined,
          createdAt: plan.createdAt,
          updatedAt: plan.submittedAt ?? plan.createdAt,
        },
      });
      written++;
    } catch (error: any) {
      firstError ||= error?.message ?? String(error);
    }
  }

  stats['ghs submissions'] = (stats['ghs submissions'] ?? 0) + written;
  console.log(`✅ ${written}/${submissions.length} GHS returns${firstError ? ` - first failure: ${firstError.slice(0, 120)}` : ''}`);
};

/**
 * The malaria commodity card, one row per commodity per month for this facility.
 *
 * The report generator reads these rows, so they are written before the malaria return.
 */
export const seedMalariaStock = async (
  lookups: Lookups,
  rows: GeneratedMalariaStock[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const facilityId = lookups.facility?.id;
  if (!facilityId) {
    console.warn('   ⚠️ no facility row exists, so the malaria commodity card has nothing to report against');
    planned['malaria stock'] = (planned['malaria stock'] ?? 0) + rows.length;
    return;
  }
  const out: Prisma.MalariaCommodityStockCreateManyInput[] = [];

  for (const plan of rows) {
    const commodityType = pickEnum(ENUMS.malariaCommodity, plan.commodityType);
    if (!commodityType) continue;
    const reportingMonth = asCalendarDay(plan.reportingMonth);
    out.push({
      commodityType,
      reportingMonth,
      openingStock: plan.openingStock,
      received: plan.received,
      dispensed: plan.dispensed,
      closingStock: plan.closingStock,
      stockOutDays: plan.stockOutDays,
      facilityId,
      createdAt: reportingMonth,
      updatedAt: reportingMonth,
    });
  }

  await writeMany('malaria stock', (part) => prisma.malariaCommodityStock.createMany({ data: part, skipDuplicates: true }), out, stats, planned);
};
