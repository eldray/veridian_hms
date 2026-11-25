// src/seed/testSeed/people.ts
//
// The workforce side of the hospital: the roster, the leave book and the payroll.
//
// Users and staff profiles are created before any of this, because every clinical row
// points at a user id. What lives here is everything a staff member looks at after
// logging in, and the money the hospital pays them.
import { Prisma } from '@prisma/client';
import type { GeneratedLeaveRequest, GeneratedPayroll, GeneratedShift, GeneratedStaffDocument } from '../bulkGenerator.js';
import { ENUMS, type Lookups } from './lookups.js';
import { asCalendarDay, hashOf, money, pickEnum, prisma, startOfToday, toNumber, writeMany, type SeedStats } from './shared.js';

interface StaffRef {
  staffId: string;
  userId: string;
  employeeId: string;
  /** The step this member is paid at, before any pro-rating. */
  monthlyBase: number;
}

let payrollCounter = 0;
const nextPayrollId = () => `seedpay-${(++payrollCounter).toString().padStart(6, '0')}`;

/**
 * Every staff profile, keyed by the username the generator used to name its actor.
 * A plan whose username did not land in the database is dropped rather than guessed at,
 * so no shift or payslip can be attached to the wrong person.
 */
const loadStaff = async (): Promise<Map<string, StaffRef>> => {
  const rows = await prisma.staffProfile.findMany({
    select: {
      id: true,
      employeeId: true,
      isActive: true,
      user: { select: { id: true, username: true } },
      salaryStep: { select: { amount: true } },
    },
  });
  const out = new Map<string, StaffRef>();
  for (const row of rows) {
    const username = row.user?.username;
    if (!username) continue;
    out.set(username, {
      staffId: row.id,
      userId: row.user.id,
      employeeId: row.employeeId,
      monthlyBase: toNumber(row.salaryStep?.amount),
    });
  }
  return out;
};

/** Only a line that can be attributed to a real, still-employed person is written. */
const staffFor = (staff: Map<string, StaffRef>, username: string): StaffRef | null => {
  const found = staff.get(username);
  return found?.staffId ? found : null;
};

export const seedShifts = async (
  lookups: Lookups,
  shifts: GeneratedShift[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const staff = await loadStaff();
  const rows: Prisma.ShiftCreateManyInput[] = [];
  const today = startOfToday();

  for (const plan of shifts) {
    const member = staffFor(staff, plan.username);
    if (!member) continue;
    const shiftDate = asCalendarDay(plan.shiftDate);
    const status = pickEnum(ENUMS.shiftStatus, plan.status) ?? ENUMS.shiftStatus.scheduled;
    // A past day cannot still be waiting to happen: a roster that ran out without a
    // mark-up reads as broken data on the attendance screen.
    const settled = shiftDate.getTime() < today.getTime();
    const finalStatus = settled
      ? (status === ENUMS.shiftStatus.proposed || status === ENUMS.shiftStatus.scheduled
        ? ENUMS.shiftStatus.completed
        : status)
      : status;

    rows.push({
      staffId: member.staffId,
      shiftDate,
      startTime: plan.startTime,
      endTime: plan.endTime,
      shiftType: pickEnum(ENUMS.shiftType, plan.shiftType) ?? ENUMS.shiftType.morning,
      status: finalStatus,
      notes: plan.notes || undefined,
      approvedById: finalStatus === ENUMS.shiftStatus.cancelled
        ? null
        : lookups.actorId(plan.approvedBy ?? { role: 'nurse', salt: hashOf(plan.username + plan.shiftDate.getTime()) }),
      approvedAt: finalStatus === ENUMS.shiftStatus.cancelled ? null : plan.approvedAt ?? plan.shiftDate,
      createdAt: plan.shiftDate,
      updatedAt: plan.shiftDate,
    });
  }

  await writeMany('shifts', (part) => prisma.shift.createMany({ data: part }), rows, stats, planned);
  console.log(`✅ ${rows.length} rostered shifts`);
};

export const seedLeaveRequests = async (
  lookups: Lookups,
  leaves: GeneratedLeaveRequest[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const staff = await loadStaff();
  const rows: Prisma.LeaveRequestCreateManyInput[] = [];

  for (const plan of leaves) {
    const member = staffFor(staff, plan.username);
    if (!member) continue;
    const status = pickEnum(ENUMS.leaveStatus, plan.status) ?? ENUMS.leaveStatus.pending;
    const decided = status === ENUMS.leaveStatus.approved || status === ENUMS.leaveStatus.rejected;

    rows.push({
      staffId: member.staffId,
      leaveType: pickEnum(ENUMS.leaveType, plan.leaveType) ?? ENUMS.leaveType.ANNUAL,
      startDate: asCalendarDay(plan.startDate),
      endDate: asCalendarDay(plan.endDate),
      totalDays: Math.max(1, plan.totalDays),
      reason: plan.reason,
      status,
      approvedById: decided ? lookups.actorId(plan.approvedBy) : null,
      approvedAt: status === ENUMS.leaveStatus.approved || status === ENUMS.leaveStatus.rejected
        ? plan.approvedAt ?? plan.requestedAt
        : null,
      rejectionReason: status === ENUMS.leaveStatus.rejected ? plan.rejectionReason ?? 'Cover could not be arranged for the dates.' : null,
      createdAt: plan.requestedAt,
      updatedAt: plan.approvedAt ?? plan.requestedAt,
    });
  }

  await writeMany('leave requests', (part) => prisma.leaveRequest.createMany({ data: part }), rows, stats, planned);
  console.log(`✅ ${rows.length} leave requests`);
};

/**
 * One payslip per member per month, priced from the salary step the staff profile
 * carries. The grouping is the same one the payroll service recomputes from:
 * the base_salary line is the salary, every other earning is an allowance, and net pay
 * is the two earning groups less the deductions.
 */
export const seedPayroll = async (
  payrolls: GeneratedPayroll[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const staff = await loadStaff();
  const records: Prisma.PayrollRecordCreateManyInput[] = [];
  const lines: Prisma.PayslipLineItemCreateManyInput[] = [];
  let unpaid = 0;

  for (const plan of payrolls) {
    const member = staffFor(staff, plan.username);
    if (!member || member.monthlyBase <= 0) continue;

    const id = nextPayrollId();
    let base = 0;
    let allowances = 0;
    let deductions = 0;

    plan.lines.forEach((line, position) => {
      const amount = money(member.monthlyBase * line.percentOfBase / 100);
      if (line.type === 'earning') {
        if (line.category === 'base_salary') base += amount;
        else allowances += amount;
      } else deductions += amount;
      lines.push({
        id: `${id}-${position + 1}`,
        payrollRecordId: id,
        type: line.type === 'earning' ? ENUMS.payslipLineItemType.earning : ENUMS.payslipLineItemType.deduction,
        category: line.category,
        description: line.description,
        amount,
        taxable: line.taxable,
        createdAt: plan.createdAt,
      });
    });

    if (base <= 0) continue;
    const net = Math.max(0, money(base + allowances - deductions));
    if (!plan.isPaid) unpaid++;
    records.push({
      id,
      staffId: member.staffId,
      month: plan.month,
      year: plan.year,
      baseSalary: money(base),
      allowances: money(allowances),
      deductions: money(deductions),
      netPay: net,
      isPaid: plan.isPaid,
      // A payslip is only issued once the month is paid, matching the payslip endpoint.
      payslipUrl: plan.isPaid
        ? `/uploads/payslips/${member.employeeId}-${plan.year}-${String(plan.month).padStart(2, '0')}.pdf`
        : null,
      paidAt: plan.paidAt,
      notes: plan.notes,
      createdAt: plan.createdAt,
      updatedAt: plan.paidAt ?? plan.createdAt,
    });
  }

  await writeMany('payroll records', (part) => prisma.payrollRecord.createMany({ data: part, skipDuplicates: true }), records, stats, planned);
  await writeMany('payslip lines', (part) => prisma.payslipLineItem.createMany({ data: part }), lines, stats, planned);
  console.log(`✅ ${records.length} payslips, ${unpaid} awaiting payment`);
};

export const seedStaffDocuments = async (
  lookups: Lookups,
  documents: GeneratedStaffDocument[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const staff = await loadStaff();
  const rows: Prisma.DocumentCreateManyInput[] = [];

  for (const plan of documents) {
    const member = staffFor(staff, plan.username);
    if (!member) continue;
    rows.push({
      staffId: member.staffId,
      type: pickEnum(ENUMS.documentType, plan.type) ?? ENUMS.documentType.OTHER,
      title: plan.title,
      fileUrl: plan.fileUrl,
      expiryDate: plan.expiryDate,
      isVerified: plan.isVerified,
      verifiedById: plan.isVerified ? lookups.actorId(plan.verifiedBy) : null,
      verifiedAt: plan.isVerified ? plan.verifiedAt : null,
      createdAt: plan.createdAt,
      updatedAt: plan.verifiedAt ?? plan.createdAt,
    });
  }

  await writeMany('staff documents', (part) => prisma.document.createMany({ data: part }), rows, stats, planned);
  console.log(`✅ ${rows.length} staff documents`);
};
