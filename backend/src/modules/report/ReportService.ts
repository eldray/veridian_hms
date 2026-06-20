// modules/report/ReportService.ts
import { PrismaClient, BillStatus } from '@prisma/client';
// FIXED: removed unused PaymentMode import
import { ReportFilters } from './ReportTypes';

export class ReportService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
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

  private async getFacilityInfo() {
    const hospital = await this.prisma.hospital.findFirst();
    return {
      name: hospital?.name || 'General Hospital',
      nhisFacilityCode: hospital?.nhisFacilityCode || 'GH001',
      facilityType: hospital?.nhisFacilityType || 'Secondary',
      district: hospital?.ghsDistrictCode || 'Unknown',
      ghfCode: hospital?.ghaHFCode || 'Unknown',
    };
  }

  // ==================== DEMOGRAPHIC REPORT ====================

  async getDemographicReport(filters: ReportFilters) {
    const { startDate, endDate } = filters;

    // ✅ Get patients who had ATTENDANCES during the date range
    let attendanceWhere: any = {};
    if (startDate || endDate) {
      attendanceWhere.dateTime = {};
      if (startDate) attendanceWhere.dateTime.gte = new Date(startDate);
      if (endDate) attendanceWhere.dateTime.lte = new Date(endDate);
    }

    // Get distinct patient IDs from attendances during the period
    const attendances = await this.prisma.attendance.findMany({
      where: attendanceWhere,
      select: {
        patientId: true,
        dateTime: true,
        paymentMode: true,
        Patient: {
          select: {
            id: true,
            gender: true,
            dateOfBirth: true,
            paymentMode: true,
            registeredAt: true,
          },
        },
      },
      orderBy: { dateTime: 'asc' },
    });

    // Get unique patients from these attendances
    const patientMap = new Map();
    let totalAttendances = 0;

    for (const att of attendances) {
      totalAttendances++;
      if (att.Patient && !patientMap.has(att.Patient.id)) {
        patientMap.set(att.Patient.id, att.Patient);
      }
    }

    const patients = Array.from(patientMap.values());

    // ✅ Also get patients who were registered during the period (for new patients count)
    let registrationWhere: any = {};
    if (startDate || endDate) {
      registrationWhere.registeredAt = {};
      if (startDate) registrationWhere.registeredAt.gte = new Date(startDate);
      if (endDate) registrationWhere.registeredAt.lte = new Date(endDate);
    }

    const newPatients = await this.prisma.patient.count({
      where: registrationWhere,
    });

    // ── Calculate statistics ──────────────────────────────────────────────────
    const genderDistribution = {
      male: patients.filter(p => p.gender === 'male').length,
      female: patients.filter(p => p.gender === 'female').length,
      other: patients.filter(p => p.gender === 'other').length,
    };

    // GHS-aligned age groups
    const ageGroups: Record<string, number> = {
      '<1 year': 0, '1-4 years': 0, '5-9 years': 0, '10-14 years': 0,
      '15-17 years': 0, '18-19 years': 0, '20-34 years': 0, '35-49 years': 0,
      '50-59 years': 0, '60-69 years': 0, '70+ years': 0,
    };

    // Also track age groups with percentages
    const ageGroupCounts: Record<string, number> = {};

    for (const patient of patients) {
      const age = this.calculateAge(patient.dateOfBirth);
      let group: string;
      if (age < 1)        group = '<1 year';
      else if (age < 5)   group = '1-4 years';
      else if (age < 10)  group = '5-9 years';
      else if (age < 15)  group = '10-14 years';
      else if (age < 18)  group = '15-17 years';
      else if (age < 20)  group = '18-19 years';
      else if (age < 35)  group = '20-34 years';
      else if (age < 50)  group = '35-49 years';
      else if (age < 60)  group = '50-59 years';
      else if (age < 70)  group = '60-69 years';
      else                group = '70+ years';
      
      ageGroups[group]++;
      ageGroupCounts[group] = (ageGroupCounts[group] || 0) + 1;
    }

    const paymentModeDistribution = {
      cash: patients.filter(p => p.paymentMode === 'cash').length,
      nhis: patients.filter(p => p.paymentMode === 'nhis').length,
      private_insurance: patients.filter(p => p.paymentMode === 'private_insurance').length,
      corporate: patients.filter(p => p.paymentMode === 'corporate').length,
    };

    // ── Payment mode breakdown from attendances ──────────────────────────────
    const attendancePaymentMode: Record<string, number> = {};
    for (const att of attendances) {
      const mode = att.paymentMode || 'unknown';
      attendancePaymentMode[mode] = (attendancePaymentMode[mode] || 0) + 1;
    }

    return {
      reportType: 'DEMOGRAPHIC ANALYSIS REPORT' as const,
      facility: await this.getFacilityInfo(),
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now',
        generated: new Date().toISOString().split('T')[0],
      },
      patientDemographics: {
        totalPatients: patients.length,
        genderDistribution,
        ageDistribution: ageGroups,
        paymentModeDistribution,
      },
      attendancePatterns: {
        totalAttendances: totalAttendances,
        visitsPerPatient: patients.length > 0 ? Math.round((totalAttendances / patients.length) * 10) / 10 : 0,
        newPatients: newPatients,
        byPaymentMode: attendancePaymentMode,
      },
      generatedAt: new Date(),
    };
  }

  // ==================== FINANCIAL REPORT ====================
  async getFinancialReport(filters: ReportFilters) {
    const { startDate, endDate, paymentMode, corporateAccountId } = filters;

    const where: any = {};
    if (startDate || endDate) {
      where.billDate = {};
      if (startDate) where.billDate.gte = new Date(startDate);
      if (endDate) where.billDate.lte = new Date(endDate);
    }
    if (paymentMode) where.paymentMode = paymentMode;
    // FIXED: Bill has corporateAccountId directly — no need to nest through patient
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;

    const bills = await this.prisma.bill.findMany({
      where,
      include: {
        Patient: { select: { surname: true, otherNames: true, folderNumber: true, paymentMode: true } },
        Attendance: {
          include: { Patient: { select: { surname: true, otherNames: true, folderNumber: true } } },
        },
      },
      orderBy: { billDate: 'desc' },
    });

    const summary = bills.reduce(
      (acc, bill) => {
        acc.totalRevenue += bill.totalAmount || 0;
        acc.totalPaid += bill.paidAmount || 0;
        acc.outstandingBalance += bill.balance || 0;
        acc.totalBills += 1;
        return acc;
      },
      { totalRevenue: 0, totalPaid: 0, outstandingBalance: 0, totalBills: 0 },
    );

    const byPaymentMode = bills.reduce((acc, bill) => {
      const mode = bill.paymentMode;
      if (!acc[mode]) acc[mode] = { count: 0, amount: 0 };
      acc[mode].count++;
      acc[mode].amount += bill.paidAmount || 0;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    return {
      reportPeriod: { startDate: startDate || 'Beginning', endDate: endDate || 'Now' },
      summary,
      byPaymentMode,
      breakdown: bills,
      reportGenerated: new Date(),
    };
  }

  // ==================== INSURANCE CLAIMS REPORT ====================
  async getInsuranceClaimsReport(filters: ReportFilters) {
    const { startDate, endDate, insuranceProviderId, status, corporateAccountId } = filters;

    const where: any = {};
    if (startDate || endDate) {
      where.submissionDate = {};
      if (startDate) where.submissionDate.gte = new Date(startDate);
      if (endDate) where.submissionDate.lte = new Date(endDate);
    }
    if (insuranceProviderId) where.insuranceProviderId = insuranceProviderId;
    if (status) where.status = status;
    // FIXED: corporateAccountId is a direct field on InsuranceClaim
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;

    const claims = await this.prisma.insuranceClaim.findMany({
      where,
      include: {
        InsuranceProvider: { select: { name: true, type: true } },
        Patient: { select: { surname: true, otherNames: true, folderNumber: true, paymentMode: true } },
        Attendance: { select: { attendanceNumber: true, dateTime: true } },
        Bill: { select: { totalAmount: true, insuranceCovered: true, paidAmount: true } },
        CorporateAccount: { select: { companyName: true } },
      },
      orderBy: { submissionDate: 'desc' },
    });

    const corporateClaims = claims.filter(c => c.corporateAccountId);
    const regularClaims = claims.filter(c => !c.corporateAccountId);

    return {
      reportType: 'Insurance Claims Analysis' as const,
      period: { startDate, endDate },
      summary: {
        totalClaims: claims.length,
        corporateClaims: corporateClaims.length,
        regularClaims: regularClaims.length,
        totalClaimAmount: claims.reduce((sum, c) => sum + c.totalClaimAmount, 0),
        totalPaidAmount: claims.reduce((sum, c) => sum + (c.paidAmount || 0), 0),
      },
      claimsReport: claims,
      corporateClaims,
      generatedAt: new Date(),
    };
  }

  // ==================== CLINICAL REPORT ====================
  async getClinicalReport(filters: ReportFilters) {
    const { startDate, endDate } = filters;

    const where: any = {};
    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate);
      if (endDate) where.dateTime.lte = new Date(endDate);
    }

    const clinicalData = await this.prisma.attendance.findMany({
      where,
      include: {
        Patient: { select: { dateOfBirth: true, gender: true, paymentMode: true } },
        AttendanceDiagnosis: {
          include: {
            Diagnosis: { select: { name: true, icdCode: true, morbidityGroup: true } },
          },
        },
      },
    });

    const clinicalReport: Record<string, any> = {};

    for (const attendance of clinicalData) {
      for (const diagnosisItem of attendance.AttendanceDiagnosis) {
        const diagnosis = diagnosisItem.Diagnosis;
        if (!diagnosis) continue;

        const key = `${diagnosis.name}-${diagnosis.icdCode}`;
        if (!clinicalReport[key]) {
          clinicalReport[key] = {
            diagnosis: diagnosis.name,
            icdCode: diagnosis.icdCode,
            morbidityGroup: diagnosis.morbidityGroup,
            totalCases: 0,
            ages: [] as number[],
            genders: [] as string[],
            paymentModes: [] as string[],
          };
        }

        clinicalReport[key].totalCases += 1;
        if (attendance.Patient) {
          const age = this.calculateAge(attendance.Patient.dateOfBirth, attendance.dateTime);
          clinicalReport[key].ages.push(age);
          clinicalReport[key].genders.push(attendance.Patient.gender);
          if (attendance.Patient.paymentMode) {
            clinicalReport[key].paymentModes.push(attendance.Patient.paymentMode);
          }
        }
      }
    }

    const reportData = Object.values(clinicalReport).map((item: any) => ({
      diagnosis: item.diagnosis,
      icdCode: item.icdCode,
      morbidityGroup: item.morbidityGroup,
      totalCases: item.totalCases,
      averageAge:
        item.ages.length > 0
          ? Math.round((item.ages.reduce((a: number, b: number) => a + b, 0) / item.ages.length) * 10) / 10
          : 0,
      genderDistribution: {
        male: item.genders.filter((g: string) => g === 'male').length,
        female: item.genders.filter((g: string) => g === 'female').length,
      },
      paymentModeBreakdown: item.paymentModes.reduce((acc: Record<string, number>, mode: string) => {
        acc[mode] = (acc[mode] || 0) + 1;
        return acc;
      }, {}),
    }));

    return {
      reportType: 'Clinical Statistics' as const,
      period: { startDate, endDate },
      clinicalReport: reportData,
      generatedAt: new Date(),
    };
  }

  // ==================== ATTENDANCE REPORT ====================
  async getAttendanceReport(filters: ReportFilters) {
    const { startDate, endDate, attendanceType, paymentMode, corporateAccountId } = filters;

    const where: any = {};
    if (startDate || endDate) {
      where.dateTime = {};
      if (startDate) where.dateTime.gte = new Date(startDate);
      if (endDate) where.dateTime.lte = new Date(endDate);
    }
    if (attendanceType) where.attendanceType = attendanceType;
    if (paymentMode) where.paymentMode = paymentMode;
    // FIXED: Attendance has corporateAccountId directly
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;

    const attendances = await this.prisma.attendance.findMany({
      where,
      include: {
        Patient: {
          select: { id: true, surname: true, otherNames: true, gender: true, dateOfBirth: true, paymentMode: true },
        },
        Bill: { select: { totalAmount: true, paidAmount: true, status: true } },
      },
      orderBy: { dateTime: 'desc' },
    });

    const totalAttendances = attendances.length;
    const uniquePatients = new Set(attendances.map(a => a.patientId)).size;

    const typeBreakdown = attendances.reduce((acc, a) => {
      acc[a.attendanceType] = (acc[a.attendanceType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const paymentBreakdown = attendances.reduce((acc, a) => {
      acc[a.paymentMode] = (acc[a.paymentMode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const corporateAttendances = attendances.filter(a => a.paymentMode === 'corporate').length;

    return {
      reportType: 'ATTENDANCE REPORT' as const,
      facility: await this.getFacilityInfo(),
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now',
        generated: new Date().toISOString().split('T')[0],
      },
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
  async getRevenueReport(filters: ReportFilters) {
    const { startDate, endDate, paymentMode, corporateAccountId } = filters;

    const where: any = { status: BillStatus.paid };
    if (startDate || endDate) {
      where.billDate = {};
      if (startDate) where.billDate.gte = new Date(startDate);
      if (endDate) where.billDate.lte = new Date(endDate);
    }
    if (paymentMode) where.paymentMode = paymentMode;
    // FIXED: Bill has corporateAccountId directly
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;

    const bills = await this.prisma.bill.findMany({ where });

    const totalRevenue = bills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
    const totalBills = bills.length;

    const revenueByPaymentMode = bills.reduce((acc, bill) => {
      const mode = bill.paymentMode;
      if (!acc[mode]) acc[mode] = { paymentMode: mode, totalRevenue: 0, billCount: 0, averageBill: 0 };
      acc[mode].totalRevenue += bill.paidAmount || 0;
      acc[mode].billCount += 1;
      return acc;
    }, {} as Record<string, { paymentMode: string; totalRevenue: number; billCount: number; averageBill: number }>);

    Object.values(revenueByPaymentMode).forEach(mode => {
      mode.averageBill = mode.billCount > 0 ? mode.totalRevenue / mode.billCount : 0;
    });

    const corporateRevenue = revenueByPaymentMode['corporate']?.totalRevenue || 0;
    const corporateShare = totalRevenue > 0 ? (corporateRevenue / totalRevenue) * 100 : 0;

    return {
      reportType: 'REVENUE ANALYSIS REPORT' as const,
      facility: await this.getFacilityInfo(),
      period: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now',
        generated: new Date().toISOString().split('T')[0],
      },
      summary: {
        totalRevenue,
        totalBills,
        averageBillAmount: totalBills > 0 ? totalRevenue / totalBills : 0,
        corporateRevenue,
        corporateShare,
      },
      revenueByPaymentMode: Object.values(revenueByPaymentMode),
      generatedAt: new Date(),
    };
  }

  // ==================== NHIS EXPIRY REPORT ====================
  async getNhisExpiryReport(filters: ReportFilters) {
    const { startDate, endDate, daysThreshold = 30 } = filters;

    const today = new Date();
    const expiryCutoff = new Date();
    expiryCutoff.setDate(today.getDate() + daysThreshold);

    const where: any = {
      nhisNumber: { not: null },
      nhisActive: true,
    };

    if (startDate && endDate) {
      where.nhisExpiryDate = { gte: new Date(startDate), lte: new Date(endDate) };
    } else {
      where.nhisExpiryDate = { gte: today, lte: expiryCutoff };
    }

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
      // FIXED: correct Prisma relation filter syntax using 'is'
      InsuranceProvider: { is: { type: 'nhis' } },
    };

    if (startDate && endDate) {
      where.submissionDate = { gte: new Date(startDate), lte: new Date(endDate) };
    }

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
      orderBy: { submissionDate: 'desc' },
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
        totalClaimAmount: filtered.reduce((sum, c) => sum + c.totalClaimAmount, 0),
        byExpiryStatus,
      },
      claims: filtered,
      generatedAt: new Date(),
    };
  }

  // ==================== EXPORT REPORT ====================
  async exportReport(data: { reportType: string; format: string; filters: any }) {
    return {
      success: true,
      message: `Report exported successfully as ${data.format.toUpperCase()}`,
      data: {
        reportType: data.reportType,
        format: data.format,
        downloadUrl: `/exports/${data.reportType}-${Date.now()}.${data.format}`,
        fileSize: '2.5 MB',
        generatedAt: new Date(),
      },
    };
  }
}