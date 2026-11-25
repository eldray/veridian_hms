// ═══════════════════════════════════════════════════════════
// NOTIFICATIONS
//
// The previous version sent every notification to one user with a title and
// message picked independently, so the inbox showed "Low Stock Alert" to a
// clinician and nothing at all to accounts. Each row now chooses a topic group,
// a recipient drawn from the roles that actually work on that topic, and a
// title/message pair that belongs together.
// ═══════════════════════════════════════════════════════════

/** Groups in NOTIFICATION_TEMPLATES. "pharmacy" has no matching NotificationType enum member. */
const NOTIFICATION_GROUP_KEYS = ['clinical', 'billing', 'appointment', 'pharmacy', 'system'] as const;
type NotificationGroup = (typeof NOTIFICATION_GROUP_KEYS)[number];

const NOTIFICATION_TYPE_FOR_GROUP: Record<NotificationGroup, string> = {
  clinical: 'clinical',
  billing: 'billing',
  appointment: 'appointment',
  // NotificationType has no pharmacy member; these are operational alerts, so they read as info.
  pharmacy: 'info',
  system: 'system',
};

const NOTIFICATION_PRIORITY_FOR_GROUP: Record<NotificationGroup, string[]> = {
  clinical: ['medium', 'high', 'urgent'],
  billing: ['low', 'medium', 'high'],
  appointment: ['low', 'medium'],
  pharmacy: ['medium', 'high'],
  system: ['low', 'medium'],
};

/** Where the bell takes the user when the row is clicked. Every value is a real dashboard route. */
const NOTIFICATION_ACTION_URL: Record<NotificationGroup, string> = {
  clinical: '/nursing',
  billing: '/billing',
  appointment: '/appointments',
  pharmacy: '/stock',
  system: '/reports',
};

export interface GeneratedNotification {
  recipientRole: ActorRole;
  recipientSalt: number;
  senderRole: ActorRole;
  senderSalt: number;
  type: string;
  priority: string;
  title: string;
  message: string;
  actionUrl: string;
  actionType: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export const generateNotifications = (): GeneratedNotification[] => {
  const out: GeneratedNotification[] = [];
  for (let i = 0; i < COUNTS.notifications; i++) {
    const group = pick([...NOTIFICATION_GROUP_KEYS]);
    const template = pick(NOTIFICATION_TEMPLATES[group]);
    // The recipient is drawn from the roles that act on this topic, and the salt keeps
    // rotating so the inbox of any one user is a sample rather than the whole feed.
    const recipientRole = pick(TARGET_ROLES_FOR_NOTIFICATION[group] ?? ['admin']) as ActorRole;
    const createdAt = daysAgo(intBetween(0, 90));
    const isRead = createdAt.getTime() < Date.now() - 24 * 60 * 60 * 1000 ? chance(0.55) : chance(0.15);
    out.push({
      recipientRole,
      recipientSalt: i,
      senderRole: 'admin',
      senderSalt: i,
      type: NOTIFICATION_TYPE_FOR_GROUP[group],
      priority: pick(NOTIFICATION_PRIORITY_FOR_GROUP[group]),
      title: template.title,
      message: template.message,
      actionUrl: NOTIFICATION_ACTION_URL[group],
      actionType: group,
      isRead,
      readAt: isRead ? new Date(createdAt.getTime() + intBetween(5, 720) * 60000) : null,
      createdAt,
    });
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// HR — ROSTER, LEAVE, PAYROLL, DOCUMENTS
//
// Everything here is keyed on a seeded username; testSeed.ts resolves it to the
// StaffProfile row (and rejects staff with no profile) before writing.
// ═══════════════════════════════════════════════════════════

/** Shifts only ever cover clinical and support staff - administrators do not take ward duty. */
const ROSTER_ROLES: ActorRole[] = ['doctor', 'nurse', 'midwife', 'lab_tech', 'sonographer', 'pharmacist', 'records'];

interface ShiftWindow {
  type: 'morning' | 'afternoon' | 'night' | 'on_call';
  startHour: number;
  endHour: number;
  /** End lands on the following calendar day (night, on-call). */
  crossesMidnight: boolean;
  label: string;
}

const SHIFT_WINDOWS: ShiftWindow[] = [
  { type: 'morning', startHour: 7, endHour: 15, crossesMidnight: false, label: 'Morning duty' },
  { type: 'afternoon', startHour: 15, endHour: 23, crossesMidnight: false, label: 'Afternoon duty' },
  { type: 'night', startHour: 23, endHour: 7, crossesMidnight: true, label: 'Night duty' },
  { type: 'on_call', startHour: 8, endHour: 8, crossesMidnight: true, label: '24-hour on-call' },
];

const atHour = (base: Date, hour: number): Date => {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, 0, 0, 0);
  return d;
};

/** Midnight-truncated calendar day, so the roster groups by date the way the UI does. */
const calendarDay = (base: Date, offsetDays: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export interface GeneratedShift {
  username: string;
  /** Index into the writer's per-day roster so a day never gives one staff two shifts. */
  shiftDate: Date;
  startTime: Date;
  endTime: Date;
  shiftType: string;
  status: string;
  notes: string;
  approvedBy: Actor | null;
  approvedAt: Date | null;
}

export const generateShifts = (users: GeneratedUser[]): GeneratedShift[] => {
  const rosterable = users.filter((u) => ROSTER_ROLES.includes(u.role as unknown as ActorRole));
  if (!rosterable.length) return [];
  const out: GeneratedShift[] = [];
  const today = new Date();

  for (let offset = -COUNTS.shiftDaysPast; offset <= COUNTS.shiftDaysFuture; offset++) {
    const day = calendarDay(today, offset);
    // Roughly two thirds of the rostered pool works any given day; the rest are off,
    // which is what makes the roster look like a roster and not an attendance register.
    const perDay = Math.max(1, Math.round(rosterable.length * between(0.5, 0.8)));
    const chosen = pickSomeDistinct(rosterable, perDay, perDay);
    for (const user of chosen) {
      const window = pick(SHIFT_WINDOWS);
      const start = atHour(day, window.startHour);
      const endRaw = atHour(day, window.endHour);
      const end = window.crossesMidnight ? new Date(endRaw.getTime() + 24 * 60 * 60 * 1000) : endRaw;
      const isFuture = offset > 0;
      const isToday = offset === 0;
      let status: string;
      if (isFuture) status = chance(0.85) ? 'scheduled' : 'proposed';
      else if (isToday) status = 'scheduled';
      else status = chance(0.9) ? 'completed' : chance(0.5) ? 'no_show' : 'cancelled';
      out.push({
        username: user.username,
        shiftDate: day,
        startTime: start,
        endTime: end,
        shiftType: window.type,
        status,
        notes: `${window.label} - ${user.departmentName ?? 'unassigned'} roster.`,
        approvedBy: status === 'proposed' ? null : actor('admin', offset + 50),
        approvedAt: status === 'proposed' ? null : new Date(day.getTime() - 24 * 60 * 60 * 1000),
      });
    }
  }
  return out;
};

const STAFF_SEX = new Map<string, boolean>();
/**
 * StaffProfile has no gender, but assigning maternity leave to a male-named officer is the
 * kind of thing that makes a demo database look wrong. The generated first names come from
 * gendered pools, so the name is enough to decide.
 */
const looksFemale = (fullName: string): boolean =>
  FEMALE_FIRST.some((first) => fullName.split(' ').includes(first));

const LEAVE_TYPE_WEIGHTS: Array<{ type: string; weight: number }> = [
  { type: 'ANNUAL', weight: 40 },
  { type: 'SICK', weight: 25 },
  { type: 'STUDY', weight: 10 },
  { type: 'COMPASSIONATE', weight: 7 },
  { type: 'MATERNITY', weight: 6 },
  { type: 'PATERNITY', weight: 5 },
  { type: 'EMERGENCY', weight: 4 },
  { type: 'UNPAID', weight: 3 },
];

const weightedLeaveType = (): string => {
  const total = LEAVE_TYPE_WEIGHTS.reduce((a, l) => a + l.weight, 0);
  let roll = rand() * total;
  for (const entry of LEAVE_TYPE_WEIGHTS) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return 'ANNUAL';
};

const LEAVE_DAYS_BY_TYPE: Record<string, [number, number]> = {
  ANNUAL: [5, 21],
  SICK: [1, 10],
  STUDY: [2, 14],
  COMPASSIONATE: [2, 7],
  MATERNITY: [56, 90],
  PATERNITY: [3, 10],
  EMERGENCY: [1, 3],
  UNPAID: [14, 90],
};

export interface GeneratedLeaveRequest {
  username: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: string;
  approvedBy: Actor | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  requestedAt: Date;
}

export const generateLeaveRequests = (users: GeneratedUser[]): GeneratedLeaveRequest[] => {
  const staff = users.filter((u) => u.role !== 'super_admin');
  const out: GeneratedLeaveRequest[] = [];
  for (let i = 0; i < COUNTS.leaveRequests; i++) {
    const user = pick(staff);
    let type = weightedLeaveType();
    if (type === 'MATERNITY' && !looksFemale(user.fullName)) type = 'PATERNITY';
    if (type === 'PATERNITY' && looksFemale(user.fullName)) type = 'ANNUAL';
    const [minDays, maxDays] = LEAVE_DAYS_BY_TYPE[type] ?? [1, 14];
    const totalDays = intBetween(minDays, maxDays);
    // A leave record whose window is entirely in the past is as useless as one that has not
    // been requested yet, so the spread covers approved history, live leave and future plans.
    const startOffset = intBetween(-180, 60);
    const startDate = calendarDay(new Date(), startOffset);
    const endDate = calendarDay(startDate, totalDays - 1);
    const roll = rand();
    let status: string;
    if (startOffset > 14) status = roll < 0.6 ? 'pending' : 'approved';
    else if (roll < 0.72) status = 'approved';
    else if (roll < 0.85) status = 'pending';
    else if (roll < 0.94) status = 'rejected';
    else status = 'cancelled';
    const requestedAt = new Date(startDate.getTime() - intBetween(7, 45) * 24 * 60 * 60 * 1000);
    out.push({
      username: user.username,
      leaveType: type,
      startDate,
      endDate,
      totalDays,
      reason: LEAVE_REASONS[type] ?? LEAVE_REASONS.ANNUAL,
      status,
      approvedBy: status === 'approved' ? actor('hr_officer', i) : null,
      approvedAt: status === 'approved' ? requestedAt : null,
      rejectionReason: status === 'rejected'
        ? 'Rejected - the unit cannot release this number of staff in the same period. Please re-apply for an alternative window.'
        : null,
      requestedAt,
    });
  }
  return out;
};

/**
 * Payslip lines are expressed as a percentage of basic salary so the writer can price them from
 * the staff member's real salary step. A flat GHS amount would make every payslip identical
 * whatever the grade, and net pay would not reconcile to the line items.
 *
 * The slug is what the live code reads back: UserRepository.recomputePayrollTotals() only
 * recognises the category "base_salary" as basic pay and counts every other earning as an
 * allowance, so the basic line has to carry exactly that category or the payslip totals disagree
 * with the PayrollRecord columns.
 */
const PAYROLL_SLUGS: Record<string, string> = {
  'Basic Salary': 'base_salary',
  'Housing Allowance': 'housing',
  'Transport Allowance': 'transport',
  'Duty Allowance': 'duty',
  'Risk Allowance': 'risk',
  Overtime: 'overtime',
  'Shift Allowance': 'shift',
  SSNFLT: 'ssnflt',
  SSNIT: 'ssnit',
  PAYE: 'paye',
  'Disease Contribution': 'nhis_premium',
  'Staff Welfare Fund': 'welfare',
  'Cooperative Subscription': 'coop',
  'Loan Repayment': 'loan',
  'Union Dues': 'union',
};

/** percent-of-base range per category, in the same order as PAYROLL_EARNINGS then PAYROLL_DEDUCTIONS. */
export const PAYROLL_RATE_PERCENT: Record<string, [number, number]> = {
  'Basic Salary': [100, 100],
  'Housing Allowance': [15, 25],
  'Transport Allowance': [8, 15],
  'Duty Allowance': [10, 20],
  'Risk Allowance': [3, 8],
  Overtime: [2, 12],
  'Shift Allowance': [4, 10],
  SSNFLT: [3.2, 3.6],
  SSNIT: [2.2, 2.4],
  PAYE: [5, 20],
  'Disease Contribution': [1, 3],
  'Staff Welfare Fund': [0.5, 2],
  'Cooperative Subscription': [1, 5],
  'Loan Repayment': [3, 15],
  'Union Dues': [0.5, 1.5],
};

/** Deductions the employer must operate, so every payslip carries them. */
const MANDATORY_DEDUCTION_NAMES = ['SSNFLT', 'SSNIT', 'PAYE', 'Disease Contribution'];

export interface PayrollLinePlan {
  type: 'earning' | 'deduction';
  /** Machine category the payroll service groups by. */
  category: string;
  description: string;
  percentOfBase: number;
  taxable: boolean;
}

export interface GeneratedPayroll {
  username: string;
  month: number;
  year: number;
  /** Calendar days in the month the staff member was on the payroll (leave reduces it). */
  workedDays: number;
  lines: PayrollLinePlan[];
  isPaid: boolean;
  paidAt: Date | null;
  notes: string;
  createdAt: Date;
}

export const generatePayroll = (users: GeneratedUser[]): GeneratedPayroll[] => {
  const staff = users.filter((u) => u.role !== 'super_admin');
  const out: GeneratedPayroll[] = [];
  const now = new Date();
  const planLine = (
    entry: { category: string; description: string; taxable: boolean },
    type: 'earning' | 'deduction',
  ): PayrollLinePlan => {
    const range = PAYROLL_RATE_PERCENT[entry.category] ?? [1, 5];
    return {
      type,
      category: PAYROLL_SLUGS[entry.category] ?? entry.category.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      description: entry.description,
      percentOfBase: +between(range[0], range[1]).toFixed(2),
      taxable: entry.taxable,
    };
  };
  const basic = PAYROLL_EARNINGS.find((e) => e.category === 'Basic Salary') ?? PAYROLL_EARNINGS[0];
  const optionalEarnings = PAYROLL_EARNINGS.filter((e) => e.category !== 'Basic Salary');
  const optionalDeductions = PAYROLL_DEDUCTIONS.filter((d) => !MANDATORY_DEDUCTION_NAMES.includes(d.category));

  for (let back = COUNTS.payrollMonths; back >= 1; back--) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const year = anchor.getFullYear();
    const month = anchor.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (const user of staff) {
      // Deterministic per user and month, so the same person is not paid for 30 days every month.
      const absent = chance(0.18) ? intBetween(1, 6) : 0;
      const workedDays = Math.max(10, daysInMonth - absent);
      // Basic salary pro-rates on days worked; allowances and statutory lines do not.
      const lines: PayrollLinePlan[] = [
        { ...planLine(basic, 'earning'), percentOfBase: +((workedDays / daysInMonth) * 100).toFixed(2) },
        ...pickSomeDistinct(optionalEarnings, 4, 1).map((e) => planLine(e, 'earning')),
        ...PAYROLL_DEDUCTIONS.filter((d) => MANDATORY_DEDUCTION_NAMES.includes(d.category)).map((d) => planLine(d, 'deduction')),
        ...pickSomeDistinct(optionalDeductions, 2, 0).map((d) => planLine(d, 'deduction')),
      ];
      const isPaid = back > 1 || chance(0.5);
      const payDate = new Date(year, month, Math.min(daysInMonth, 28), 10, 0, 0);
      out.push({
        username: user.username,
        month,
        year,
        workedDays,
        lines,
        isPaid,
        paidAt: isPaid ? payDate : null,
        notes: absent
          ? `${absent} day(s) of approved or uncertified absence deducted from the month.`
          : 'Full month on the roll; no absence recorded.',
        createdAt: payDate,
      });
    }
  }
  return out;
};

export interface GeneratedStaffDocument {
  username: string;
  type: string;
  title: string;
  fileUrl: string;
  expiryDate: Date | null;
  isVerified: boolean;
  verifiedBy: Actor | null;
  verifiedAt: Date | null;
  createdAt: Date;
}

const DOC_ROLES = ['doctor', 'nurse', 'midwife', 'lab_tech', 'sonographer', 'pharmacist'];

export const generateStaffDocuments = (users: GeneratedUser[]): GeneratedStaffDocument[] => {
  const out: GeneratedStaffDocument[] = [];
  for (const user of users) {
    const isClinical = DOC_ROLES.includes(user.role);
    const documents = STAFF_DOCUMENT_TITLES.filter((d) =>
      d.type === 'LICENSE' ? isClinical : d.type === 'ID_CARD' ? true : chance(0.5),
    );
    for (const doc of documents.length ? documents : [STAFF_DOCUMENT_TITLES[3]]) {
      const needsExpiry = doc.type === 'LICENSE' || doc.type === 'ID_CARD';
      // Licence cards expire either side of today so the expiring-documents endpoint has rows
      // in every window: valid, due soon and already lapsed.
      const expiryDate = needsExpiry ? daysFromNow(intBetween(-120, 700)) : null;
      const isVerified = chance(0.8);
      out.push({
        username: user.username,
        type: doc.type,
        title: doc.title,
        fileUrl: `/uploads/documents/${user.username}-${doc.type.toLowerCase()}.pdf`,
        expiryDate,
        isVerified,
        verifiedBy: isVerified ? actor('hr_officer') : null,
        verifiedAt: isVerified ? daysAgo(intBetween(1, 300)) : null,
        createdAt: daysAgo(intBetween(1, 900)),
      });
    }
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// INVENTORY — REQUISITIONS, TRANSFERS, PURCHASES
//
// Stock rows are referenced by slot index into the array the writer already
// loaded (real StockItem ids ordered by name), so a seeded requisition can never
// name an item the store does not carry.
// ═══════════════════════════════════════════════════════════

/** [0..n-1] — used to draw stock-item slots without replacement. */
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

const STORE_DEPARTMENTS = ['Main Store', 'Pharmacy'];
const REQUESTING_DEPARTMENTS = ['Medical', 'Surgery', 'Obstetrics & Gynecology', 'Pediatrics', 'Emergency', 'Laboratory', 'Radiology', 'Pharmacy'];
const WARDS_FOR_REQUISITION = ['General Ward A', 'Maternity Ward', 'ICU', 'Pediatric Ward', 'Surgical Ward'];

export interface GeneratedRequisitionItem {
  stockItemSlot: number;
  quantityRequested: number;
  quantityApproved: number | null;
  quantityFulfilled: number;
  purpose: string;
}

export interface GeneratedRequisition {
  requisitionNumber: string;
  requestingDepartmentName: string;
  supplyingDepartmentName: string;
  requestingWardName: string | null;
  requestedBy: Actor;
  approvedBy: Actor | null;
  fulfilledBy: Actor | null;
  urgency: string;
  requiredDate: Date | null;
  purpose: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  fulfilledAt: Date | null;
  approvedAt: Date | null;
  items: GeneratedRequisitionItem[];
}

export const generateRequisitions = (stockItemCount: number): GeneratedRequisition[] => {
  const out: GeneratedRequisition[] = [];
  if (stockItemCount <= 0) return out;
  const slots = (count: number) => pickSomeDistinct(range(stockItemCount), count, 1);
  for (let i = 0; i < COUNTS.requisitions; i++) {
    const createdAt = daysAgo(intBetween(0, 240));
    const roll = rand();
    const status = roll < 0.45 ? 'fulfilled' : roll < 0.65 ? 'approved' : roll < 0.85 ? 'submitted' : roll < 0.95 ? 'draft' : 'cancelled';
    const isWardRequest = chance(0.35);
    const requestingDepartmentName = isWardRequest ? 'Medical' : pick(REQUESTING_DEPARTMENTS.filter((d) => d !== 'Main Store'));
    const supplyingDepartmentName = requestingDepartmentName === 'Pharmacy' ? 'Main Store' : pick(STORE_DEPARTMENTS);
    const urgency = roll < 0.1 ? 'emergency' : chance(0.3) ? 'urgent' : 'routine';
    const itemCount = intBetween(2, 6);
    const decided = ['approved', 'fulfilled'].includes(status);
    const items: GeneratedRequisitionItem[] = slots(itemCount).map((slot) => {
      const quantityRequested = intBetween(5, 200);
      const approved = !decided ? null : Math.max(1, Math.round(quantityRequested * between(0.6, 1)));
      const fulfilled = status === 'fulfilled' && approved != null
        ? Math.max(1, Math.round(approved * between(0.85, 1)))
        : 0;
      return {
        stockItemSlot: slot,
        quantityRequested,
        quantityApproved: approved,
        quantityFulfilled: fulfilled,
        purpose: pick(REQUISITION_PURPOSES),
      };
    });
    const approvedAt = decided ? new Date(createdAt.getTime() + intBetween(4, 48) * 3600000) : null;
    out.push({
      requisitionNumber: `REQ-${padNumber(REQUISITION_NUMBER_BLOCK + 1 + i)}`,
      requestingDepartmentName,
      supplyingDepartmentName,
      requestingWardName: isWardRequest ? pick(WARDS_FOR_REQUISITION) : null,
      requestedBy: actor(isWardRequest ? 'nurse' : 'pharmacist', i),
      approvedBy: decided ? actor('admin', i) : null,
      fulfilledBy: status === 'fulfilled' ? actor('records', i) : null,
      urgency,
      requiredDate: new Date(createdAt.getTime() + intBetween(1, 14) * 86400000),
      purpose: pick(REQUISITION_PURPOSES),
      status,
      notes: status === 'cancelled'
        ? 'Cancelled - the item was later found on hand after a physical count.'
        : null,
      createdAt,
      approvedAt,
      fulfilledAt: status === 'fulfilled' ? new Date(createdAt.getTime() + intBetween(2, 10) * 86400000) : null,
      items,
    });
  }
  return out;
};

export interface GeneratedTransferItem {
  stockItemSlot: number;
  quantityRequested: number;
  quantitySent: number;
  quantityReceived: number;
}

export interface GeneratedStockTransfer {
  transferNumber: string;
  originDepartmentName: string;
  destinationDepartmentName: string;
  status: string;
  requestedBy: Actor;
  approvedBy: Actor | null;
  dispatchedAt: Date | null;
  receivedAt: Date | null;
  notes: string;
  createdAt: Date;
  items: GeneratedTransferItem[];
}

export const generateStockTransfers = (stockItemCount: number): GeneratedStockTransfer[] => {
  const out: GeneratedStockTransfer[] = [];
  if (stockItemCount <= 0) return out;
  for (let i = 0; i < COUNTS.stockTransfers; i++) {
    const origin = pick(STORE_DEPARTMENTS);
    let destination = pick([...REQUESTING_DEPARTMENTS, ...STORE_DEPARTMENTS]);
    if (destination === origin) destination = origin === 'Main Store' ? 'Pharmacy' : 'Main Store';
    const createdAt = daysAgo(intBetween(0, 200));
    const roll = rand();
    const status = roll < 0.5 ? 'received' : roll < 0.7 ? 'dispatched' : roll < 0.85 ? 'approved' : roll < 0.95 ? 'requested' : 'cancelled';
    const progressed = ['dispatched', 'received'].includes(status);
    const items: GeneratedTransferItem[] = pickSomeDistinct(range(stockItemCount), intBetween(1, 5), 1).map((slot) => {
      const quantityRequested = intBetween(5, 100);
      const sent = status === 'requested' || status === 'cancelled' ? 0 : Math.max(1, Math.round(quantityRequested * between(0.7, 1)));
      return {
        stockItemSlot: slot,
        quantityRequested,
        quantitySent: sent,
        quantityReceived: status === 'received' ? sent : 0,
      };
    });
    out.push({
      transferNumber: `TRN-${padNumber(TRANSFER_NUMBER_BLOCK + 1 + i)}`,
      originDepartmentName: origin,
      destinationDepartmentName: destination,
      status,
      requestedBy: actor(origin === 'Pharmacy' ? 'pharmacist' : 'records', i),
      approvedBy: status === 'requested' || status === 'cancelled' ? null : actor('admin', i),
      dispatchedAt: progressed ? new Date(createdAt.getTime() + 86400000) : null,
      receivedAt: status === 'received' ? new Date(createdAt.getTime() + 2 * 86400000) : null,
      notes: status === 'cancelled'
        ? 'Cancelled at dispatch - the consignment was needed at the originating store instead.'
        : `Inter-departmental transfer from ${origin} to ${destination}.`,
      createdAt,
      items,
    });
  }
  return out;
};

export interface GeneratedPurchaseInvoiceItem {
  stockItemSlot: number;
  quantity: number;
  unitCost: number;
  batchNumber: string | null;
  expiryDate: Date | null;
}

export interface GeneratedPurchaseInvoice {
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: Date;
  notes: string;
  createdBy: Actor;
  receivedAtDepartmentName: string | null;
  receivedAtWardName: string | null;
  items: GeneratedPurchaseInvoiceItem[];
}

/**
 * Purchase invoice numbers are typed in by the officer who receives the goods - the live flow
 * has no counter for them - so the seed uses the same shape the staff already use.
 */
export const generatePurchaseInvoices = (stockItemCount: number): GeneratedPurchaseInvoice[] => {
  const out: GeneratedPurchaseInvoice[] = [];
  if (stockItemCount <= 0) return out;
  const year = new Date().getFullYear();
  for (let i = 0; i < COUNTS.purchaseInvoices; i++) {
    const supplier = pick(SUPPLIERS);
    const invoiceDate = daysAgo(intBetween(0, 400));
    const batchSerial = 1000 + i * 3 + intBetween(0, 2);
    const items: GeneratedPurchaseInvoiceItem[] = pickSomeDistinct(range(stockItemCount), intBetween(2, 8), 1).map((slot) => ({
      stockItemSlot: slot,
      quantity: intBetween(10, 500),
      unitCost: +between(4, 480).toFixed(2),
      batchNumber: chance(0.85) ? `B-${year}-${batchSerial}` : null,
      // Most batches are still usable; a handful are near or past expiry so the
      // expiring-stock and batch-hold endpoints are not reading an empty table.
      expiryDate: chance(0.75) ? daysFromNow(intBetween(-45, 900)) : null,
    }));
    const toWard = chance(0.15);
    out.push({
      invoiceNumber: `${PURCHASE_INVOICE_PREFIX}${padNumber(10000 + 1 + i)}`,
      supplierName: supplier,
      invoiceDate,
      notes: `Goods received and verified against the delivery note from ${supplier}.`,
      createdBy: actor('records', i),
      receivedAtDepartmentName: toWard ? null : pick([...STORE_DEPARTMENTS, 'Laboratory']),
      receivedAtWardName: toWard ? pick(WARDS_FOR_REQUISITION) : null,
      items,
    });
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// AUDIT LOG
//
// entityId is resolved by the writer from the rows it actually created, so an
// audit entry always points at something that exists. The generator names the
// entity type and the slot within the writer's array for that type.
// ═══════════════════════════════════════════════════════════

const AUDIT_ENTITY_TYPES = [
  'Patient', 'Attendance', 'Bill', 'Payment', 'LabTest', 'Scan', 'Procedure',
  'Medication', 'Vitals', 'Admission', 'InsuranceClaim', 'Appointment',
  'Requisition', 'StockTransfer', 'Invoice', 'ProformaInvoice', 'User',
];

const AUDIT_ACTION_FOR_ENTITY: Record<string, string[]> = {
  Patient: ['create', 'update'],
  Attendance: ['create', 'update', 'submit', 'void'],
  Bill: ['create', 'update', 'print'],
  Payment: ['create', 'void'],
  LabTest: ['update', 'submit'],
  Scan: ['update', 'submit'],
  Procedure: ['update', 'submit'],
  Medication: ['create', 'update', 'void'],
  Vitals: ['create', 'update'],
  Admission: ['create', 'update'],
  InsuranceClaim: ['create', 'submit', 'approve', 'reject'],
  Appointment: ['create', 'update'],
  Requisition: ['create', 'submit', 'approve'],
  StockTransfer: ['create', 'approve'],
  Invoice: ['create', 'approve'],
  ProformaInvoice: ['create', 'approve', 'reject'],
  User: ['login', 'logout', 'update'],
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Safari/17.5',
  'Mozilla/5.0 (Linux; Android 14) Chrome/127.0 Mobile',
];

const AUDIT_ROLES: ActorRole[] = ['doctor', 'nurse', 'records', 'accounts', 'pharmacist', 'admin', 'hr_officer', 'lab_tech'];

export interface GeneratedAuditLog {
  entityType: string;
  /** Slot inside the writer's id array for this entity type. */
  entitySlot: number;
  action: string;
  performedBy: Actor;
  ipAddress: string;
  userAgent: string;
  description: string;
  timestamp: Date;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown>;
}

export const generateAuditLogs = (entityCounts: Record<string, number>): GeneratedAuditLog[] => {
  const available = AUDIT_ENTITY_TYPES.filter((type) => (entityCounts[type] ?? 0) > 0);
  if (!available.length) return [];
  const out: GeneratedAuditLog[] = [];
  for (let i = 0; i < COUNTS.auditLogs; i++) {
    const entityType = pick(available);
    const action = pick(AUDIT_ACTION_FOR_ENTITY[entityType] ?? ['update']);
    const performedRole = pick(AUDIT_ROLES);
    const timestamp = daysAgo(intBetween(0, 120));
    const description = pick(AUDIT_DESCRIPTIONS);
    out.push({
      entityType,
      entitySlot: rnd(Math.max(1, entityCounts[entityType] ?? 1)),
      action,
      performedBy: actor(performedRole, i),
      ipAddress: `41.66.${intBetween(10, 250)}.${intBetween(2, 254)}`,
      userAgent: pick(USER_AGENTS),
      description,
      timestamp,
      previousState: action === 'create' ? null : { summary: `State before: ${description}` },
      newState: { summary: description, action },
    });
  }
  return out.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

// ═══════════════════════════════════════════════════════════
// COMMUNICATION LOG
// ═══════════════════════════════════════════════════════════

const COMMUNICATION_TYPES = [
  'APPOINTMENT_REMINDER', 'APPOINTMENT_CONFIRMATION', 'LAB_RESULT_READY',
  'PRESCRIPTION_READY', 'PAYMENT_REMINDER', 'BILL_NOTIFICATION',
  'WELCOME_MESSAGE', 'GENERAL_NOTIFICATION',
];

export interface GeneratedCommunicationLog {
  channelName: string;
  channelType: string;
  templateType: string;
  subject: string;
  /** A phone number for SMS/WhatsApp, an address for email - matched to the channel by the writer. */
  recipientKind: 'phone' | 'email';
  recipientSeed: number;
  message: string;
  status: string;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  cost: number;
  providerMessageId: string | null;
  createdAt: Date;
}

export const generateCommunicationLogs = (): GeneratedCommunicationLog[] => {
  const out: GeneratedCommunicationLog[] = [];
  for (let i = 0; i < COUNTS.communicationLogs; i++) {
    const channelType = rand() < 0.6 ? 'SMS' : rand() < 0.7 ? 'WHATSAPP' : 'EMAIL';
    const templateType = pick(COMMUNICATION_TYPES);
    const subject = pick(COMMUNICATION_SUBJECTS);
    const createdAt = daysAgo(intBetween(0, 150));
    const roll = rand();
    const status = roll < 0.6 ? 'DELIVERED' : roll < 0.78 ? 'READ' : roll < 0.9 ? 'SENT' : roll < 0.96 ? 'PENDING' : 'FAILED';
    const sendable = status !== 'PENDING';
    out.push({
      // The names the messaging screens look up: the dashboard counts SMS and WhatsApp
      // channels by name, so a differently named channel reads as no traffic at all.
      channelName: channelType === 'SMS' ? 'SMS Gateway' : channelType === 'WHATSAPP' ? 'WhatsApp Business' : 'Email SMTP',
      channelType,
      templateType,
      subject,
      recipientKind: channelType === 'EMAIL' ? 'email' : 'phone',
      recipientSeed: i,
      message: `${subject}. Please refer to your appointment or visit record for the details, and contact the facility if anything on it is incorrect.`,
      status,
      sentAt: sendable ? new Date(createdAt.getTime() + intBetween(1, 30) * 60000) : null,
      deliveredAt: ['DELIVERED', 'READ'].includes(status) ? new Date(createdAt.getTime() + intBetween(31, 120) * 60000) : null,
      readAt: status === 'READ' ? new Date(createdAt.getTime() + intBetween(121, 1440) * 60000) : null,
      failedAt: status === 'FAILED' ? new Date(createdAt.getTime() + intBetween(1, 30) * 60000) : null,
      failureReason: status === 'FAILED' ? 'Rejected by the gateway: the subscriber number is not provisioned for messaging.' : null,
      cost: channelType === 'EMAIL' ? 0 : +between(0.02, 0.12).toFixed(3),
      providerMessageId: sendable ? `MSG-${padNumber(10000 + i)}` : null,
      createdAt,
    });
  }
  return out;
};

// ═══════════════════════════════════════════════════════════
// GHSS REPORTING — submissions, malaria commodity stock
// ═══════════════════════════════════════════════════════════

/**
 * Only the return types the application archives.
 *
 * GHSReportController saves a submission for these six and nothing else; opd_morbidity,
 * form_a_services and monthly_summary are enum members with no generator behind them, so a
 * seeded row of one of those would hold a payload no endpoint could ever have produced.
 */
const GHS_REPORT_TYPES = [
  'opd_attendance', 'ipd_morbidity', 'form_a_morbidity',
  'form_a_complete', 'malaria_data', 'idsr',
];

export interface GeneratedGhsSubmission {
  reportType: string;
  reportingYear: number;
  reportingMonth: number;
  reportingQuarter: number | null;
  periodStart: Date;
  periodEnd: Date;
  submittedToDHIMS2: boolean;
  dhims2Reference: string | null;
  submittedAt: Date | null;
  createdBy: Actor;
  createdAt: Date;
  /** Counts the writer fills from the real rows in the period, so a saved submission agrees with the data. */
  summaryKey: string;
}

export const generateGhsSubmissions = (): GeneratedGhsSubmission[] => {
  const out: GeneratedGhsSubmission[] = [];
  const now = new Date();
  for (let back = 12; back >= 1; back--) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const year = anchor.getFullYear();
    const month = anchor.getMonth() + 1;
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);
    for (const reportType of GHS_REPORT_TYPES) {
      if (chance(0.45)) continue;
      const quarter = Math.ceil(month / 3);
      const submitted = chance(0.8);
      out.push({
        reportType,
        reportingYear: year,
        reportingMonth: month,
        reportingQuarter: reportType.startsWith('form_a') ? quarter : null,
        periodStart,
        periodEnd,
        submittedToDHIMS2: submitted,
        dhims2Reference: submitted ? `DHIMS2-${year}${String(month).padStart(2, '0')}-${padNumber(10000 + out.length)}` : null,
        submittedAt: submitted ? new Date(periodEnd.getTime() + intBetween(1, 8) * 86400000) : null,
        createdBy: actor('records', out.length),
        createdAt: new Date(periodEnd.getTime() - intBetween(0, 5) * 86400000),
        summaryKey: `${reportType}-${year}-${month}`,
      });
    }
  }
  return out;
};

const MALARIA_COMMODITIES = [
  'asaq_below_1yr', 'asaq_1_5yrs', 'asaq_6_13yrs', 'asaq_14_plus',
  'al_0_3yrs', 'al_4_8yrs', 'al_9_13yrs', 'al_14_plus',
  'dhap_40_320mg', 'quinine_tablet', 'quinine_injection',
  'artesunate_injection_30mg', 'artesunate_injection_60mg', 'artesunate_injection_120mg',
  'arthemeter_injection_40mg', 'arthemeter_injection_80mg',
  'rectal_artesunate_50mg', 'rectal_artesunate_200mg',
  'rdt_kits', 'sp',
];

export interface GeneratedMalariaStock {
  commodityType: string;
  /** First day of the month it is reported for - the malaria endpoint filters on this window. */
  reportingMonth: Date;
  openingStock: number;
  received: number;
  dispensed: number;
  closingStock: number;
  stockOutDays: number;
  year: number;
  month: number;
}

/**
 * Stock is reported per commodity per month for one facility, so the writer resolves
 * facilityId itself. closingStock is arithmetic, not a random number: opening + received
 * - dispensed, floored at zero, with the shortfall recorded as stock-out days.
 */
export const generateMalariaStock = (): GeneratedMalariaStock[] => {
  const out: GeneratedMalariaStock[] = [];
  const now = new Date();
  for (let back = 6; back >= 1; back--) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const year = anchor.getFullYear();
    const month = anchor.getMonth() + 1;
    for (const commodityType of MALARIA_COMMODITIES) {
      if (chance(0.25)) continue;
      const openingStock = intBetween(200, 6000);
      const received = intBetween(0, 4000);
      const dispensed = intBetween(0, openingStock + received);
      const rawClosing = openingStock + received - dispensed;
      out.push({
        commodityType,
        reportingMonth: anchor,
        openingStock,
        received,
        dispensed: Math.min(dispensed, openingStock + received),
        closingStock: Math.max(0, rawClosing),
        stockOutDays: rawClosing <= 50 ? intBetween(1, 9) : 0,
        year,
        month,
      });
    }
  }
  return out;
};
