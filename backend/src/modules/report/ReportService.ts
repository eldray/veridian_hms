// modules/report/ReportService.ts
import { cacheReadMethods } from '../../utils/ttlCache';
import { PrismaClient, BillStatus } from '@prisma/client';
import { ReportFilters } from './ReportTypes';
import { parseReportRange, toNum, money } from '../../utils/reportDates';

// Bills that count as billed / collected money. Drafts were never issued and cancelled bills were voided.
const COUNTED_BILL_STATUSES: BillStatus[] = [BillStatus.pending, BillStatus.partial, BillStatus.paid];

export class ReportService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    // Reports over big date ranges take seconds; share one result per range for 60 s
    cacheReadMethods(this, ['getDemographicReport','getFinancialReport','getInsuranceClaimsReport','getClinicalReport','getAttendanceReport','getRevenueReport','getNhisExpiryReport','getNhisClaimsWithExpiry'], 60000);
  }

  private calculateAge(dateOfBirth: Date, asOfDate: Date = new Date()): number {
    const birthDate = new Date(dateOfBirth);
    const targetDate = new Date(asOfDate);
    let age = targetDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = targetDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }

  private ageGroup(age: number): string {
    if (age < 1)  return '<1 year';
    if (age < 5)  return '1-4 years';
    if (age < 10) return '5-9 years';
    if (age < 15) return '10-14 years';
    if (age < 18) return '15-17 years';
    if (age < 20) return '18-19 years';
    if (age < 35) return '20-34 years';
    if (age < 50) return '35-49 years';
    if (age < 60) return '50-59 years';
    if (age < 70) return '60-69 years';
    return '70+ years';
  }

  /** Header block printed on every report. Missing settings show as "Not set" (never an invented code). */
  private async getFacilityInfo() {
    const hospital = await this.prisma.hospital.findFirst();
    return {
      name: hospital?.name || 'Facility name not set',
      nhisFacilityCode: hospital?.nhisFacilityCode || 'Not set',
      facilityType: hospital?.nhisFacilityType || 'Not set',
      district: hospital?.ghsDistrictCode || 'Not set',
      ghfCode: hospital?.ghaHFCode || 'Not set',
    };
  }

  private periodOf(startDate?: string, endDate?: string) {
    return {
      startDate: startDate || 'Beginning',
      endDate: endDate || 'Now',
      generated: new Date().toISOString().split('T')[0],
    };
  }

  // ==================== DEMOGRAPHIC REPORT ====================

  async getDemographicReport(filters: ReportFilters) {
    const { startDate, endDate } = filters;
    const range = parseReportRange(startDate, endDate);
    const attendanceWhere: any = range ? { dateTime: range } : {};

    // One row per PATIENT who attended in the period (not one row per visit), and the visit
    // counts are computed by the database.
    const [patients, totalAttendances, attendanceModes, newPatients] = await Promise.all([
      this.prisma.patient.findMany({
        where: { Attendance: { some: attendanceWhere } },
        select: { gender: true, dateOfBirth: true, paymentMode: true },
      }),
      this.prisma.attendance.count({ where: attendanceWhere }),
      this.prisma.attendance.groupBy({ by: ['paymentMode'], where: attendanceWhere, _count: { _all: true } }),
      this.prisma.patient.count({ where: range ? { registeredAt: range } : {} }),
    ]);

    // Age is measured at the end of the period (or today when the period reaches into the future)
    const now = new Date();
    const ageAsOf = range?.lte && range.lte < now ? range.lte : now;

    const genderDistribution = {
      male: patients.filter(p => p.gender === 'male').length,
      female: patients.filter(p => p.gender === 'female').length,
      other: patients.filter(p => p.gender === 'other').length,
    };

    const ageGroups: Record<string, number> = {
      '<1 year': 0, '1-4 years': 0, '5-9 years': 0, '10-14 years': 0,
      '15-17 years': 0, '18-19 years': 0, '20-34 years': 0, '35-49 years': 0,
      '50-59 years': 0, '60-69 years': 0, '70+ years': 0,
    };
    for (const patient of patients) {
      ageGroups[this.ageGroup(this.calculateAge(patient.dateOfBirth, ageAsOf))]++;
    }

    const paymentModeDistribution = {
      cash: patients.filter(p => p.paymentMode === 'cash').length,
      nhis: patients.filter(p => p.paymentMode === 'nhis').length,
      private_insurance: patients.filter(p => p.paymentMode === 'private_insurance').length,
      corporate: patients.filter(p => p.paymentMode === 'corporate').length,
    };

    const byPaymentMode: Record<string, number> = {};
    for (const row of attendanceModes) byPaymentMode[row.paymentMode || 'unknown'] = row._count._all;

    return {
      reportType: 'DEMOGRAPHIC ANALYSIS REPORT' as const,
      facility: await this.getFacilityInfo(),
      period: this.periodOf(startDate, endDate),
      patientDemographics: {
        totalPatients: patients.length,
        genderDistribution,
        ageDistribution: ageGroups,
        paymentModeDistribution,
      },
      attendancePatterns: {
        totalAttendances,
        visitsPerPatient: patients.length > 0 ? Math.round((totalAttendances / patients.length) * 10) / 10 : 0,
        newPatients,
        byPaymentMode,
      },
      generatedAt: new Date(),
    };
  }

  // ==================== FINANCIAL REPORT ====================
  // Billed vs collected vs outstanding. Everything is summed by the database; Prisma returns money as
  // Decimal objects, so every value goes through toNum()/money() (adding Decimals with + builds a string).
  async getFinancialReport(filters: ReportFilters) {
    const { startDate, endDate, paymentMode, corporateAccountId } = filters;
    const range = parseReportRange(startDate, endDate);

    const where: any = {
      status: { in: COUNTED_BILL_STATUSES },
      // Private insurance and corporate are claim liabilities, not operational bills.
      paymentMode: paymentMode
        ? { equals: paymentMode, notIn: ['private_insurance', 'corporate'] }
        : { notIn: ['private_insurance', 'corporate'] },
    };
    if (range) where.billDate = range;
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;

    const sums = { totalAmount: true, paidAmount: true, balance: true, insuranceCovered: true, waiverAmount: true } as const;

    const [totals, byMode, byStatus, daily] = await Promise.all([
      this.prisma.bill.aggregate({ where, _sum: sums, _count: { _all: true } }),
      this.prisma.bill.groupBy({ by: ['paymentMode'], where, _sum: sums, _count: { _all: true } }),
      this.prisma.bill.groupBy({ by: ['status'], where, _sum: sums, _count: { _all: true } }),
      // two narrow columns only, for the day-by-day trend
      this.prisma.bill.findMany({ where, select: { billDate: true, totalAmount: true, paidAmount: true } }),
    ]);

    const revenueByPaymentMode = byMode
      .map(row => {
        const billed = money(row._sum.totalAmount);
        const paid = money(row._sum.paidAmount);
        const count = row._count._all;
        return {
          paymentMode: row.paymentMode as string,
          billCount: count,
          totalBilled: billed,
          totalRevenue: paid,                       // collected
          outstanding: money(row._sum.balance),
          averageBill: count > 0 ? money(billed / count) : 0,
        };
      })
      .sort((a, b) => b.totalBilled - a.totalBilled);

    const dayMap = new Map<string, { date: string; bills: number; billed: number; paid: number }>();
    for (const bill of daily) {
      const day = bill.billDate.toISOString().split('T')[0];
      const entry = dayMap.get(day) || { date: day, bills: 0, billed: 0, paid: 0 };
      entry.bills += 1;
      entry.billed += toNum(bill.totalAmount);
      entry.paid += toNum(bill.paidAmount);
      dayMap.set(day, entry);
    }
    const dailyTrend = Array.from(dayMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ ...d, billed: money(d.billed), paid: money(d.paid) }));

    const byPaymentMode: Record<string, { count: number; amount: number }> = {};
    for (const row of revenueByPaymentMode) byPaymentMode[row.paymentMode] = { count: row.billCount, amount: row.totalRevenue };

    return {
      reportType: 'FINANCIAL SUMMARY' as const,
      facility: await this.getFacilityInfo(),
      reportPeriod: { startDate: startDate || 'Beginning', endDate: endDate || 'Now' },
      period: this.periodOf(startDate, endDate),
      summary: {
        totalRevenue: money(totals._sum.totalAmount),       // total billed (kept under this name for the screen)
        totalPaid: money(totals._sum.paidAmount),
        outstandingBalance: money(totals._sum.balance),
        insuranceCovered: money(totals._sum.insuranceCovered),
        waivers: money(totals._sum.waiverAmount),
        totalBills: totals._count._all,
        collectionRate: money(toNum(totals._sum.totalAmount)) > 0
          ? Math.round((toNum(totals._sum.paidAmount) / toNum(totals._sum.totalAmount)) * 1000) / 10
          : 0,
        note: 'Draft and cancelled bills are not counted. Private-insurance and corporate liabilities are reported under Claims, not operational Bills.',
      },
      revenueByPaymentMode,
      byPaymentMode,
      byStatus: byStatus.map(row => ({
        status: row.status as string,
        billCount: row._count._all,
        totalBilled: money(row._sum.totalAmount),
        totalPaid: money(row._sum.paidAmount),
        outstanding: money(row._sum.balance),
      })),
      dailyTrend,
      reportGenerated: new Date(),
    };
  }

  // ==================== OPD/IPD PATIENT BILLING REGISTER ====================
  async getPatientBillingRegister(filters: ReportFilters) {
    const { startDate, endDate, attendanceCategory, paymentMode } = filters;
    const range = parseReportRange(startDate, endDate);
    const where: any = {
      patientId: { not: null },
      encounterCategory: attendanceCategory === 'opd' || attendanceCategory === 'ipd'
        ? attendanceCategory : { in: ['opd', 'ipd'] },
      status: { not: 'cancelled' },
    };
    if (range) where.dateTime = range;
    if (paymentMode) where.paymentMode = paymentMode;

    const attendances = await this.prisma.attendance.findMany({
      where,
      orderBy: [{ dateTime: 'desc' }, { attendanceNumber: 'desc' }],
      take: 10000,
      include: {
        Patient: { select: {
          surname: true, otherNames: true, dateOfBirth: true, folderNumber: true,
          gender: true, phoneNumber: true, contact: true, nhisNumber: true,
        } },
        Admission: { select: { admissionDate: true, dischargeDate: true } },
        InsuranceProvider: { select: { name: true } },
        CorporateAccount: { select: { companyName: true } },
        User_Attendance_createdByIdToUser: { select: { username: true, fullName: true } },
        Bill: { include: { BillLineItem: { where: { isVoided: false }, select: {
          serviceType: true, lineTotal: true,
        } } } },
      },
    });

    const rows = attendances.map(attendance => {
      const patient = attendance.Patient!;
      const bill = attendance.Bill;
      const lineItems = bill?.BillLineItem || [];
      const drugs = money(lineItems.filter(item => item.serviceType === 'medication')
        .reduce((sum, item) => sum + toNum(item.lineTotal), 0));
      const services = money(lineItems.filter(item => item.serviceType !== 'medication')
        .reduce((sum, item) => sum + toNum(item.lineTotal), 0));
      const age = this.calculateAge(patient.dateOfBirth, attendance.dateTime);
      const status = attendance.status === 'completed' || attendance.status === 'discharged'
        ? 'Complete' : attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1);
      return {
        attendanceId: attendance.id,
        attendanceNumber: attendance.attendanceNumber,
        beginDate: attendance.dateTime,
        beginTime: attendance.dateTime,
        endDate: attendance.encounterCategory === 'ipd'
          ? (attendance.Admission?.dischargeDate || null) : attendance.dateTime,
        encounterCategory: attendance.encounterCategory.toUpperCase(),
        name: `${patient.surname} ${patient.otherNames || ''}`.trim(),
        age,
        cardNo: patient.nhisNumber || attendance.nhisCCC || '—',
        folderNo: patient.folderNumber,
        gender: patient.gender,
        phoneNo: patient.phoneNumber || patient.contact || '',
        mode: attendance.paymentMode.toUpperCase(),
        patientBalance: money(attendance.outstandingBalance),
        patientBill: money(bill?.patientPayable ?? 0),
        accreditorBill: money(bill?.insuranceCovered ?? 0),
        drugs,
        services,
        total: money(bill?.totalAmount ?? attendance.totalBill),
        status,
        accreditor: attendance.InsuranceProvider?.name
          || attendance.CorporateAccount?.companyName
          || (attendance.paymentMode === 'cash' ? 'Self Pay' : attendance.paymentMode.toUpperCase()),
        createdBy: attendance.User_Attendance_createdByIdToUser?.username
          || attendance.User_Attendance_createdByIdToUser?.fullName || '',
        createdOn: attendance.createdAt,
        billStatus: bill?.status || null,
      };
    });

    const total = rows.reduce((sum, row) => sum + row.total, 0);
    return {
      reportType: 'OPD/IPD PATIENT BILLING REGISTER' as const,
      period: this.periodOf(startDate, endDate),
      summary: {
        totalAttendances: rows.length,
        opd: rows.filter(row => row.encounterCategory === 'OPD').length,
        ipd: rows.filter(row => row.encounterCategory === 'IPD').length,
        totalBilled: money(total),
        totalPatientBalance: money(rows.reduce((sum, row) => sum + row.patientBalance, 0)),
        totalPatientBill: money(rows.reduce((sum, row) => sum + row.patientBill, 0)),
        totalAccreditorBill: money(rows.reduce((sum, row) => sum + row.accreditorBill, 0)),
      },
      entries: rows,
      generatedAt: new Date(),
    };
  }

  // ==================== USER ACTIVITY / PATIENTS SEEN BY STAFF ====================
  // Count each patient attendance once per staff member, even when the same staff member
  // records several services for that attendance. Attribution follows the recorded actor
  // for each workflow, not audit-log events or the attendance registrar alone.
  async getPatientsSeenByStaffReport(filters: ReportFilters) {
    const { startDate, endDate } = filters;
    const range = parseReportRange(startDate, endDate);
    const patientAttendance = {
      Attendance: { patientId: { not: null }, status: { not: 'cancelled' } },
    };
    const activityRange = (field: string) => range ? { [field]: range } : { [field]: { not: null } };

    const [
      attendances, labTests, medications, ancVisits, postnatalRecords,
      renderedServices, scans, procedures,
    ] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { patientId: { not: null }, status: { not: 'cancelled' }, ...(range ? { dateTime: range } : {}) },
        select: { id: true, createdById: true, providerId: true },
      }),
      this.prisma.labTest.findMany({
        where: { performedById: { not: null }, completedAt: activityRange('completedAt'), ...patientAttendance },
        select: { attendanceId: true, performedById: true },
      }),
      this.prisma.medication.findMany({
        where: { dispensedById: { not: null }, dispensedAt: activityRange('dispensedAt'), ...patientAttendance },
        select: { attendanceId: true, dispensedById: true },
      }),
      this.prisma.aNCVisit.findMany({
        where: { visitDate: activityRange('visitDate'), ...patientAttendance },
        select: { attendanceId: true, recordedById: true },
      }),
      this.prisma.postnatalRecord.findMany({
        where: { examinationDate: activityRange('examinationDate'), ...patientAttendance },
        select: { attendanceId: true, createdById: true },
      }),
      this.prisma.serviceRendered.findMany({
        where: { date: activityRange('date'), ...patientAttendance },
        select: { attendanceId: true, performedById: true },
      }),
      this.prisma.scan.findMany({
        where: { performedById: { not: null }, completedAt: activityRange('completedAt'), ...patientAttendance },
        select: { attendanceId: true, performedById: true },
      }),
      this.prisma.procedure.findMany({
        where: { performedById: { not: null }, performedAt: activityRange('performedAt'), ...patientAttendance },
        select: { attendanceId: true, performedById: true },
      }),
    ]);

    const attendanceByUser = new Map<string, Set<string>>();
    const add = (userId: string | null | undefined, attendanceId: string) => {
      if (!userId) return;
      const ids = attendanceByUser.get(userId) || new Set<string>();
      ids.add(attendanceId);
      attendanceByUser.set(userId, ids);
    };

    for (const attendance of attendances) {
      add(attendance.createdById, attendance.id);
      add(attendance.providerId, attendance.id);
    }
    for (const row of labTests) add(row.performedById, row.attendanceId);
    for (const row of medications) add(row.dispensedById, row.attendanceId);
    for (const row of ancVisits) add(row.recordedById, row.attendanceId);
    for (const row of postnatalRecords) add(row.createdById, row.attendanceId);
    for (const row of renderedServices) add(row.performedById, row.attendanceId);
    for (const row of scans) add(row.performedById, row.attendanceId);
    for (const row of procedures) add(row.performedById, row.attendanceId);

    const userIds = Array.from(attendanceByUser.keys());
    const users = userIds.length ? await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true, username: true, fullName: true,
        department: { select: { name: true } },
        staffProfile: { select: { department: { select: { name: true } } } },
      },
    }) : [];
    const userById = new Map(users.map(user => [user.id, user]));
    const entries = users.map(user => ({
      department: (user.department?.name || user.staffProfile?.department?.name || 'UNASSIGNED').toUpperCase(),
      username: (user.username || user.fullName || 'UNKNOWN').toUpperCase(),
      patientsSeen: attendanceByUser.get(user.id)?.size || 0,
      userId: user.id,
    })).sort((a, b) => a.department.localeCompare(b.department) || a.username.localeCompare(b.username));

    const departmentTotals = Array.from(entries.reduce((map, row) => {
      map.set(row.department, (map.get(row.department) || 0) + row.patientsSeen);
      return map;
    }, new Map<string, number>()).entries())
      .map(([department, patientsSeen]) => ({ department, patientsSeen }))
      .sort((a, b) => a.department.localeCompare(b.department));

    return {
      reportType: 'USER ACTIVITY / PATIENTS SEEN BY STAFF' as const,
      period: this.periodOf(startDate, endDate),
      summary: {
        totalStaff: entries.length,
        totalPatientStaffAttendances: entries.reduce((sum, row) => sum + row.patientsSeen, 0),
        departments: departmentTotals.length,
      },
      departmentTotals,
      entries,
      methodology: 'A patient attendance is counted once per staff member when that staff member is recorded as the attendance registrar or clinician, or as the performer/recorder of a completed laboratory test, dispensed medication, ANC/postnatal visit, rendered service, scan or procedure. Repeat activities by the same staff member on the same attendance count once. The same attendance may count for more than one staff member.',
      generatedAt: new Date(),
    };
  }

  // ==================== INSURANCE CLAIMS REPORT ====================
  async getInsuranceClaimsReport(filters: ReportFilters) {
    const { startDate, endDate, insuranceProviderId, status, corporateAccountId } = filters;
    const range = parseReportRange(startDate, endDate);

    const where: any = {};
    if (range) where.Attendance = { dateTime: range };
    if (insuranceProviderId) where.insuranceProviderId = insuranceProviderId;
    if (status) where.status = status;
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;

    const sums = { totalClaimAmount: true } as const;

    const [totals, corporateCount, byStatus, byProvider, recent] = await Promise.all([
      this.prisma.insuranceClaim.aggregate({ where, _sum: sums, _count: { _all: true } }),
      this.prisma.insuranceClaim.count({ where: { ...where, corporateAccountId: corporateAccountId || { not: null } } }),
      this.prisma.insuranceClaim.groupBy({ by: ['status'], where, _sum: sums, _count: { _all: true } }),
      this.prisma.insuranceClaim.groupBy({ by: ['insuranceProviderId'], where, _sum: sums, _count: { _all: true } }),
      // the list behind the numbers: newest 500 only (a year of claims is far too many rows for one response)
      this.prisma.insuranceClaim.findMany({
        where,
        select: {
          id: true, status: true, finalizedAt: true, createdAt: true, totalClaimAmount: true, corporateAccountId: true,
          InsuranceProvider: { select: { name: true, type: true } },
          Patient: { select: { surname: true, otherNames: true, folderNumber: true } },
          Attendance: { select: { attendanceNumber: true, dateTime: true } },
          CorporateAccount: { select: { companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);

    const providers = await this.prisma.insuranceProvider.findMany({
      where: { id: { in: byProvider.map(p => p.insuranceProviderId) } },
      select: { id: true, name: true, type: true },
    });
    const providerById = new Map(providers.map(p => [p.id, p]));

    const totalClaimAmount = money(totals._sum.totalClaimAmount);
    const totalPaidAmount = money(0); // Payment amounts are not stored on InsuranceClaim in the current schema.

    return {
      reportType: 'Insurance Claims Analysis' as const,
      facility: await this.getFacilityInfo(),
      period: { startDate, endDate, generated: new Date().toISOString().split('T')[0] },
      summary: {
        totalClaims: totals._count._all,
        corporateClaims: corporateCount,
        regularClaims: totals._count._all - corporateCount,
        totalClaimAmount,
        totalApprovedAmount: money(byStatus.find(row => row.status === 'finalized')?._sum.totalClaimAmount),
        totalRejectedAmount: money(0), // Rejected is not a supported ClaimStatus in the current schema.
        totalPaidAmount,
        outstandingAmount: money(totalClaimAmount - totalPaidAmount),
      },
      byStatus: byStatus
        .map(row => ({
          status: row.status as string,
          claimCount: row._count._all,
          claimAmount: money(row._sum.totalClaimAmount),
          approvedAmount: row.status === 'finalized' ? money(row._sum.totalClaimAmount) : money(0),
          paidAmount: money(0),
        }))
        .sort((a, b) => b.claimAmount - a.claimAmount),
      byProvider: byProvider
        .map(row => ({
          provider: providerById.get(row.insuranceProviderId)?.name || 'Unknown',
          type: providerById.get(row.insuranceProviderId)?.type || '',
          claimCount: row._count._all,
          claimAmount: money(row._sum.totalClaimAmount),
          paidAmount: money(0),
          outstanding: money(row._sum.totalClaimAmount),
        }))
        .sort((a, b) => b.claimAmount - a.claimAmount),
      claimsReport: recent.map(c => ({
        ...c,
        totalClaimAmount: money(c.totalClaimAmount),
        approvedAmount: c.status === 'finalized' ? money(c.totalClaimAmount) : money(0),
        rejectedAmount: money(0),
        paidAmount: money(0),
      })),
      claimsShown: recent.length,
      generatedAt: new Date(),
    };
  }

  // ==================== CLINICAL REPORT ====================
  async getClinicalReport(filters: ReportFilters) {
    const { startDate, endDate } = filters;
    const range = parseReportRange(startDate, endDate);

    // Only the columns the report needs (the old query loaded whole visits with every relation)
    const rows = await this.prisma.attendanceDiagnosis.findMany({
      where: range ? { Attendance: { dateTime: range } } : {},
      select: {
        Diagnosis: { select: { name: true, icdCode: true, morbidityGroup: true } },
        Attendance: {
          select: {
            dateTime: true,
            Patient: { select: { dateOfBirth: true, gender: true, paymentMode: true } },
          },
        },
      },
    });

    interface Acc {
      diagnosis: string; icdCode: string | null; morbidityGroup: any;
      totalCases: number; ageSum: number; ageCount: number;
      male: number; female: number; other: number;
      paymentModes: Record<string, number>;
    }
    const byDiagnosis = new Map<string, Acc>();

    for (const row of rows) {
      const diagnosis = row.Diagnosis;
      if (!diagnosis) continue;
      const key = `${diagnosis.name}-${diagnosis.icdCode}`;
      let acc = byDiagnosis.get(key);
      if (!acc) {
        acc = {
          diagnosis: diagnosis.name, icdCode: diagnosis.icdCode, morbidityGroup: diagnosis.morbidityGroup,
          totalCases: 0, ageSum: 0, ageCount: 0, male: 0, female: 0, other: 0, paymentModes: {},
        };
        byDiagnosis.set(key, acc);
      }
      acc.totalCases += 1;
      const patient = row.Attendance?.Patient;
      if (patient) {
        acc.ageSum += this.calculateAge(patient.dateOfBirth, row.Attendance.dateTime);
        acc.ageCount += 1;
        if (patient.gender === 'male') acc.male++;
        else if (patient.gender === 'female') acc.female++;
        else acc.other++;
        if (patient.paymentMode) acc.paymentModes[patient.paymentMode] = (acc.paymentModes[patient.paymentMode] || 0) + 1;
      }
    }

    const reportData = Array.from(byDiagnosis.values())
      .map(acc => ({
        diagnosis: acc.diagnosis,
        icdCode: acc.icdCode,
        morbidityGroup: acc.morbidityGroup,
        totalCases: acc.totalCases,
        averageAge: acc.ageCount > 0 ? Math.round((acc.ageSum / acc.ageCount) * 10) / 10 : 0,
        genderDistribution: { male: acc.male, female: acc.female, other: acc.other },
        paymentModeBreakdown: acc.paymentModes,
      }))
      .sort((a, b) => b.totalCases - a.totalCases); // most common first

    return {
      reportType: 'Clinical Statistics' as const,
      facility: await this.getFacilityInfo(),
      period: { startDate, endDate, generated: new Date().toISOString().split('T')[0] },
      summary: {
        totalDiagnoses: rows.length,
        distinctDiagnoses: reportData.length,
      },
      clinicalReport: reportData,
      generatedAt: new Date(),
    };
  }

  // ==================== ATTENDANCE REPORT ====================
  async getAttendanceReport(filters: ReportFilters) {
    const { startDate, endDate, attendanceType, paymentMode, corporateAccountId } = filters;
    const range = parseReportRange(startDate, endDate);

    const where: any = {};
    if (range) where.dateTime = range;
    if (attendanceType) where.attendanceType = attendanceType;
    if (paymentMode) where.paymentMode = paymentMode;
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;

    // The database counts; nothing is loaded row by row
    const [totalAttendances, byType, byMode, patientGroups] = await Promise.all([
      this.prisma.attendance.count({ where }),
      this.prisma.attendance.groupBy({ by: ['attendanceType'], where, _count: { _all: true } }),
      this.prisma.attendance.groupBy({ by: ['paymentMode'], where, _count: { _all: true } }),
      this.prisma.attendance.groupBy({ by: ['patientId'], where }),
    ]);

    const uniquePatients = patientGroups.length;
    const typeBreakdown: Record<string, number> = {};
    for (const row of byType) typeBreakdown[row.attendanceType as string] = row._count._all;
    const paymentBreakdown: Record<string, number> = {};
    for (const row of byMode) paymentBreakdown[row.paymentMode as string] = row._count._all;

    const corporateAttendances = paymentBreakdown['corporate'] || 0;

    return {
      reportType: 'ATTENDANCE REPORT' as const,
      facility: await this.getFacilityInfo(),
      period: this.periodOf(startDate, endDate),
      summary: {
        totalAttendances,
        uniquePatients,
        averageVisitsPerPatient: totalAttendances / Math.max(1, uniquePatients),
        corporateShare: totalAttendances > 0 ? (corporateAttendances / totalAttendances) * 100 : 0,
      },
      attendancePatterns: { byType: typeBreakdown, byPaymentMode: paymentBreakdown },
      generatedAt: new Date(),
    };
  }

  // ==================== REVENUE REPORT ====================
  // Money actually COLLECTED in the period (paid and part-paid bills). The old report only counted
  // fully paid bills, so every part payment was missing from "revenue".
  async getRevenueReport(filters: ReportFilters) {
    const { startDate, endDate, paymentMode, corporateAccountId } = filters;
    const range = parseReportRange(startDate, endDate);

    const where: any = {
      status: { in: [BillStatus.paid, BillStatus.partial] },
      paidAmount: { gt: 0 },
      // Claims-only payer records must never be counted as cash/operational revenue.
      paymentMode: paymentMode
        ? { equals: paymentMode, notIn: ['private_insurance', 'corporate'] }
        : { notIn: ['private_insurance', 'corporate'] },
    };
    if (range) where.billDate = range;
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;

    const [totals, byMode] = await Promise.all([
      this.prisma.bill.aggregate({ where, _sum: { paidAmount: true }, _count: { _all: true } }),
      this.prisma.bill.groupBy({ by: ['paymentMode'], where, _sum: { paidAmount: true }, _count: { _all: true } }),
    ]);

    const totalRevenue = money(totals._sum.paidAmount);
    const totalBills = totals._count._all;

    const revenueByPaymentMode = byMode
      .map(row => {
        const revenue = money(row._sum.paidAmount);
        const count = row._count._all;
        return {
          paymentMode: row.paymentMode as string,
          totalRevenue: revenue,
          billCount: count,
          averageBill: count > 0 ? money(revenue / count) : 0,
          sharePercent: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const corporateRevenue = revenueByPaymentMode.find(m => m.paymentMode === 'corporate')?.totalRevenue || 0;

    return {
      reportType: 'REVENUE ANALYSIS REPORT' as const,
      facility: await this.getFacilityInfo(),
      period: this.periodOf(startDate, endDate),
      summary: {
        totalRevenue,
        totalBills,
        averageBillAmount: totalBills > 0 ? money(totalRevenue / totalBills) : 0,
        corporateRevenue,
        corporateShare: totalRevenue > 0 ? (corporateRevenue / totalRevenue) * 100 : 0,
        note: 'Collected amounts on paid and part-paid operational bills; private-insurance and corporate claims are excluded.',
      },
      revenueByPaymentMode,
      generatedAt: new Date(),
    };
  }

  // ==================== NHIS EXPIRY REPORT ====================
  async getNhisExpiryReport(filters: ReportFilters) {
    const { startDate, endDate, daysThreshold = 30 } = filters;

    const today = new Date();
    const expiryCutoff = new Date();
    expiryCutoff.setDate(today.getDate() + Number(daysThreshold));

    const where: any = {
      nhisNumber: { not: null },
      nhisActive: true,
    };

    const range = startDate && endDate ? parseReportRange(startDate, endDate) : undefined;
    where.nhisExpiryDate = range ?? { gte: today, lte: expiryCutoff };

    const patients = await this.prisma.patient.findMany({
      where,
      select: {
        id: true,
        folderNumber: true,
        surname: true,
        otherNames: true,
        contact: true,
        phoneNumber: true,
        nhisNumber: true,
        nhisExpiryDate: true,
        nhisActive: true,
        insuranceProviderId: true,
        createdAt: true,
      },
      orderBy: { nhisExpiryDate: 'asc' },
    });

    const patientsWithExpiry = patients.map(patient => {
      const daysUntilExpiry = patient.nhisExpiryDate
        ? Math.ceil((patient.nhisExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const expiryStatus =
        daysUntilExpiry === null ? 'UNKNOWN'
        : daysUntilExpiry <= 0   ? 'EXPIRED'
        : daysUntilExpiry <= 7   ? 'CRITICAL'
        : daysUntilExpiry <= 30  ? 'WARNING'
        : 'HEALTHY';

      return {
        ...patient,
        fullName: `${patient.surname} ${patient.otherNames || ''}`.trim(),
        daysUntilExpiry,
        expiryStatus,
      };
    });

    const summary = {
      totalNHISPatients: patientsWithExpiry.length,
      expired: patientsWithExpiry.filter(p => p.expiryStatus === 'EXPIRED').length,
      critical: patientsWithExpiry.filter(p => p.expiryStatus === 'CRITICAL').length,
      warning: patientsWithExpiry.filter(p => p.expiryStatus === 'WARNING').length,
      healthy: patientsWithExpiry.filter(p => p.expiryStatus === 'HEALTHY').length,
      noExpiryDate: patientsWithExpiry.filter(p => !p.nhisExpiryDate).length,
    };

    return {
      reportType: 'NHIS MEMBERSHIP EXPIRY REPORT' as const,
      facility: await this.getFacilityInfo(),
      period: {
        startDate: startDate || today.toISOString().split('T')[0],
        endDate: endDate || expiryCutoff.toISOString().split('T')[0],
        generated: new Date().toISOString().split('T')[0],
      },
      summary,
      patients: patientsWithExpiry,
      generatedAt: new Date(),
    };
  }

  // ==================== NHIS CLAIMS WITH EXPIRY ====================
  async getNhisClaimsWithExpiry(filters: ReportFilters) {
    const { startDate, endDate, expiryStatus } = filters;

    const where: any = {
      InsuranceProvider: { is: { type: 'nhis' } },
    };

    const range = startDate && endDate ? parseReportRange(startDate, endDate) : undefined;
    if (range) where.Attendance = { dateTime: range };

    const claims = await this.prisma.insuranceClaim.findMany({
      where,
      include: {
        Patient: {
          select: {
            id: true, surname: true, otherNames: true, folderNumber: true,
            nhisNumber: true, nhisExpiryDate: true, nhisActive: true,
          },
        },
        InsuranceProvider: { select: { name: true } },
        Bill: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const today = new Date();
    const claimsWithExpiry = claims.map(claim => {
      const expiryDate = claim.Patient?.nhisExpiryDate;
      const daysUntilExpiry = expiryDate
        ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const nhisExpiryStatus =
        !expiryDate            ? 'UNKNOWN'
        : daysUntilExpiry! <= 0  ? 'EXPIRED'
        : daysUntilExpiry! <= 7  ? 'CRITICAL'
        : daysUntilExpiry! <= 30 ? 'WARNING'
        : 'ACTIVE';

      return {
        ...claim,
        patientName: claim.Patient
          ? `${claim.Patient.surname} ${claim.Patient.otherNames || ''}`.trim()
          : 'Unknown',
        nhisNumber: claim.Patient?.nhisNumber,
        nhisExpiryDate: expiryDate,
        nhisExpiryStatus,
        daysUntilExpiry,
      };
    });

    const filtered = expiryStatus
      ? claimsWithExpiry.filter(c => c.nhisExpiryStatus === expiryStatus)
      : claimsWithExpiry;

    const byExpiryStatus = {
      ACTIVE:   claimsWithExpiry.filter(c => c.nhisExpiryStatus === 'ACTIVE').length,
      WARNING:  claimsWithExpiry.filter(c => c.nhisExpiryStatus === 'WARNING').length,
      CRITICAL: claimsWithExpiry.filter(c => c.nhisExpiryStatus === 'CRITICAL').length,
      EXPIRED:  claimsWithExpiry.filter(c => c.nhisExpiryStatus === 'EXPIRED').length,
      UNKNOWN:  claimsWithExpiry.filter(c => c.nhisExpiryStatus === 'UNKNOWN').length,
    };

    return {
      reportType: 'NHIS CLAIMS WITH EXPIRY STATUS' as const,
      facility: await this.getFacilityInfo(),
      period: { startDate, endDate, generated: new Date().toISOString().split('T')[0] },
      summary: {
        totalClaims: filtered.length,
        // Decimal amounts: add as numbers (a plain + on Decimals concatenates text)
        totalClaimAmount: money(filtered.reduce((sum, c) => sum + toNum(c.totalClaimAmount), 0)),
        byExpiryStatus,
      },
      claims: filtered,
      generatedAt: new Date(),
    };
  }

  // Report files are produced by ReportController.exportReport (CSV / Excel / PDF).
}
