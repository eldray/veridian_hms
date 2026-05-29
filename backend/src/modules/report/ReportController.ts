// modules/report/ReportController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ReportService } from './ReportService';

export class ReportController {
  private prisma: PrismaClient;
  private service: ReportService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    // FIXED: controller now delegates to the service instead of duplicating Prisma queries
    this.service = new ReportService(prisma);
  }

  // ── Helper: normalise date query params to startDate/endDate ─────────────────
  private parseDateFilters(query: any) {
    // Accept both conventions; startDate/endDate take priority
    const startDate = (query.startDate || query.dateFrom) as string | undefined;
    const endDate   = (query.endDate   || query.dateTo)   as string | undefined;
    return { startDate, endDate };
  }

  // ==================== FINANCIAL REPORT ====================
  getFinancialReport = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = this.parseDateFilters(req.query);
      const { paymentMode, corporateAccountId } = req.query as any;

      const report = await this.service.getFinancialReport({
        startDate, endDate, paymentMode, corporateAccountId,
      });

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Financial report error:', error);
      res.status(500).json({ success: false, message: 'Error generating financial report' });
    }
  };

  // ==================== CLINICAL REPORT ====================
  getClinicalReport = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = this.parseDateFilters(req.query);

      const report = await this.service.getClinicalReport({ startDate, endDate });

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Clinical report error:', error);
      res.status(500).json({ success: false, message: 'Error generating clinical report' });
    }
  };

  // ==================== REVENUE REPORT ====================
  getRevenueReport = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = this.parseDateFilters(req.query);
      const { paymentMode, corporateAccountId } = req.query as any;

      const report = await this.service.getRevenueReport({
        startDate, endDate, paymentMode, corporateAccountId,
      });

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Revenue report error:', error);
      res.status(500).json({ success: false, message: 'Error generating revenue report' });
    }
  };

  // ==================== INSURANCE CLAIMS REPORT ====================
  getInsuranceClaimsReport = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = this.parseDateFilters(req.query);
      const { status, insuranceProviderId, corporateAccountId } = req.query as any;

      const report = await this.service.getInsuranceClaimsReport({
        startDate, endDate, status, insuranceProviderId, corporateAccountId,
      });

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Claims report error:', error);
      res.status(500).json({ success: false, message: 'Error generating claims report' });
    }
  };

  // ==================== ATTENDANCE REPORT ====================
  getAttendanceReport = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = this.parseDateFilters(req.query);
      const { attendanceType, paymentMode, corporateAccountId } = req.query as any;

      const report = await this.service.getAttendanceReport({
        startDate, endDate, attendanceType, paymentMode, corporateAccountId,
      });

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Attendance report error:', error);
      res.status(500).json({ success: false, message: 'Error generating attendance report' });
    }
  };

  // ==================== DEMOGRAPHIC REPORT ====================
  getDemographicReport = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = this.parseDateFilters(req.query);

      // FIXED: was calling prisma directly with no filters — now delegates to service
      const report = await this.service.getDemographicReport({ startDate, endDate });

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Demographic report error:', error);
      res.status(500).json({ success: false, message: 'Error generating demographic report' });
    }
  };

  // ==================== NHIS EXPIRY REPORT ====================
  getNhisExpiryReport = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = this.parseDateFilters(req.query);
      const daysThreshold = parseInt(req.query.daysThreshold as string) || 30;

      // FIXED: delegates to service instead of running Prisma queries in controller
      const report = await this.service.getNhisExpiryReport({ startDate, endDate, daysThreshold });

      // Summary + month grouping for dashboard use
      const today = new Date();
      const patientsWithExpiry = report.patients as any[];
      const expiryByMonth = patientsWithExpiry
        .filter(p => p.nhisExpiryDate)
        .reduce((acc, p) => {
          const monthKey = new Date(p.nhisExpiryDate).toISOString().slice(0, 7);
          acc[monthKey] = (acc[monthKey] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      res.json({
        success: true,
        data: {
          ...report,
          expiryByMonth,
          filters: {
            daysThreshold,
            startDate: startDate || today.toISOString().split('T')[0],
            endDate: endDate,
          },
        },
      });
    } catch (error) {
      console.error('NHIS expiry report error:', error);
      res.status(500).json({ success: false, message: 'Error generating NHIS expiry report' });
    }
  };

  // ==================== NHIS CLAIMS SUMMARY ====================
  getNhisClaimsSummary = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = this.parseDateFilters(req.query);
      const { expiryStatus } = req.query as any;

      // FIXED: delegates to service; service uses correct Prisma relation filter syntax
      const report = await this.service.getNhisClaimsWithExpiry({ startDate, endDate, expiryStatus });

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('NHIS claims summary error:', error);
      res.status(500).json({ success: false, message: 'Error generating NHIS claims summary' });
    }
  };

  // ==================== NHIS EXPIRING SOON (dashboard widget) ====================
  getNhisExpiringSoon = async (req: Request, res: Response) => {
    try {
      const threshold = parseInt(req.query.days as string) || 30;

      const today = new Date();
      const expiryCutoff = new Date();
      expiryCutoff.setDate(today.getDate() + threshold);

      // FIXED: relation on Patient is 'Attendance' (capitalised) per schema
      const expiringPatients = await this.prisma.patient.findMany({
        where: {
          nhisNumber: { not: null },
          nhisActive: true,
          nhisExpiryDate: { gte: today, lte: expiryCutoff },
        },
        select: {
          id: true,
          folderNumber: true,
          surname: true,
          otherNames: true,
          contact: true,
          phoneNumber: true,
          nhisNumber: true,
          nhisExpiryDate: true,
          // FIXED: capitalised 'Attendance' matches schema relation name
          Attendance: {
            take: 1,
            orderBy: { dateTime: 'desc' },
            select: { dateTime: true },
          },
        },
        orderBy: { nhisExpiryDate: 'asc' },
        take: 20,
      });

      const result = expiringPatients.map(p => ({
        id: p.id,
        folderNumber: p.folderNumber,
        fullName: `${p.surname} ${p.otherNames || ''}`.trim(),
        contact: p.contact,
        phoneNumber: p.phoneNumber,
        nhisNumber: p.nhisNumber,
        nhisExpiryDate: p.nhisExpiryDate,
        lastVisit: p.Attendance?.[0]?.dateTime || null,
        daysUntilExpiry: p.nhisExpiryDate
          ? Math.ceil((p.nhisExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null,
      }));

      res.json({ success: true, data: { expiringPatients: result, count: result.length, threshold } });
    } catch (error) {
      console.error('NHIS expiring soon error:', error);
      res.status(500).json({ success: false, message: 'Error fetching expiring NHIS memberships' });
    }
  };

  // ==================== EXPORT REPORT ====================
  // FIXED: was GET with req.body — changed to POST in routes; body is now reliable
  exportReport = async (req: Request, res: Response) => {
    try {
      const { reportType, format, filters, data } = req.body;

      if (!reportType || !data) {
        return res.status(400).json({ success: false, message: 'Report type and data are required' });
      }

      let csvContent = '';
      let filename = `${reportType}_${new Date().toISOString().split('T')[0]}`;

      switch (reportType) {
        case 'financial':
          csvContent = this.convertFinancialToCSV(data);
          filename += '_financial.csv';
          break;
        case 'clinical':
          csvContent = this.convertClinicalToCSV(data);
          filename += '_clinical.csv';
          break;
        case 'revenue':
          csvContent = this.convertRevenueToCSV(data);
          filename += '_revenue.csv';
          break;
        case 'attendance':
          csvContent = this.convertAttendanceToCSV(data);
          filename += '_attendance.csv';
          break;
        default:
          csvContent = this.convertGenericToCSV(data);
          filename += '.csv';
      }

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        return res.send(csvContent);
      }

      res.json({ success: true, data: csvContent, filename });
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ success: false, message: 'Error exporting report' });
    }
  };

  // ── Private CSV helpers ───────────────────────────────────────────────────────

  private convertFinancialToCSV(data: any): string {
    const headers = ['Period', 'Revenue', 'Expenses', 'Net Income', 'Bills Count'];
    const rows = (data.monthlyRevenueTrend || []).map((item: any) => [
      item.period,
      item.totalRevenue || 0,
      item.totalExpenses || 0,
      (item.totalRevenue || 0) - (item.totalExpenses || 0),
      item.billCount || 0,
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private convertClinicalToCSV(data: any): string {
    const headers = ['Diagnosis', 'Total Cases', 'Male', 'Female', 'Average Age'];
    const rows = (data.clinicalReport || data.topDiagnoses || []).map((item: any) => [
      `"${item.diagnosis || item.diagnosisName || item.name || ''}"`,
      item.totalCases || 0,
      item.genderDistribution?.male || item.male || 0,
      item.genderDistribution?.female || item.female || 0,
      item.averageAge || 0,
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private convertRevenueToCSV(data: any): string {
    const headers = ['Date', 'Amount', 'Payment Method', 'Bill Number'];
    const rows = (data.dailyRevenue || []).map((item: any) => [
      item.date,
      item.amount || 0,
      item.paymentMethod || 'N/A',
      item.billNumber || 'N/A',
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private convertAttendanceToCSV(data: any): string {
    const headers = ['Date', 'Patient Name', 'Type', 'Payment Mode', 'Status'];
    const rows = (data.attendances || []).map((item: any) => [
      item.date,
      `"${item.patientName || ''}"`,
      item.attendanceType || 'N/A',
      item.paymentMode || 'N/A',
      item.status || 'N/A',
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private convertGenericToCSV(data: any): string {
    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      const rows = data.map(item =>
        headers.map(h => `"${JSON.stringify(item[h] || '').replace(/"/g, '""')}"`)
      );
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    return JSON.stringify(data, null, 2);
  }
}