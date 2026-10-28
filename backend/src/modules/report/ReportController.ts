// modules/report/ReportController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ReportService } from './ReportService';
import { reportToDocument, documentToCsv, documentToXlsx, documentToPdf } from '../../utils/reportExport';

// Names printed on exported files (match the report names on the Reports screen)
const REPORT_TITLES: Record<string, string> = {
  'opd-attendance': 'OPD Attendance', 'consulting-room-register': 'Consulting Room Register',
  'opd-morbidity': 'OPD Morbidity (Form A)', 'top-diagnoses': 'Top 10 Diagnoses',
  'form-a': 'Form A - Maternal Health', 'ipd': 'IPD & Mortality', 'malaria': 'Malaria Data',
  'idsr': 'IDSR Notifiable Diseases', 'family-planning': 'Family Planning',
  'demographic': 'Demographic Analysis', 'financial': 'Financial Summary', 'insurance': 'Insurance Claims',
  'attendance': 'Attendance Patterns', 'revenue': 'Revenue Analysis', 'lab': 'Laboratory Report',
  'scans': 'Radiology Report', 'procedures': 'Procedures Report', 'medications': 'Medications Report',
  'vitals': 'Vitals Report', 'nhis-expiry': 'NHIS Membership Expiry', 'nhis-claims': 'NHIS Claims Summary',
  'clinical': 'Clinical Statistics',
  // The reports the shared shell renders from config/reportRegistry.ts — the same names the
  // pills on the Reports screen carry, so an exported file matches what the officer saw.
  'collections': 'Payment Collections', 'revenue-lines': 'Revenue Lines', 'claims': 'Insurance Claims Detail',
};

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

      return res.json({ success: true, data: report });
    } catch (error) {
      console.error('Financial report error:', error);
      return res.status(500).json({ success: false, message: 'Error generating financial report' });
    }
  };

  // ==================== CLINICAL REPORT ====================
  getClinicalReport = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = this.parseDateFilters(req.query);

      const report = await this.service.getClinicalReport({ startDate, endDate });

      return res.json({ success: true, data: report });
    } catch (error) {
      console.error('Clinical report error:', error);
      return res.status(500).json({ success: false, message: 'Error generating clinical report' });
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

      return res.json({ success: true, data: report });
    } catch (error) {
      console.error('Revenue report error:', error);
      return res.status(500).json({ success: false, message: 'Error generating revenue report' });
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

      return res.json({ success: true, data: report });
    } catch (error) {
      console.error('Claims report error:', error);
      return res.status(500).json({ success: false, message: 'Error generating claims report' });
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

      return res.json({ success: true, data: report });
    } catch (error) {
      console.error('Attendance report error:', error);
      return res.status(500).json({ success: false, message: 'Error generating attendance report' });
    }
  };

  // ==================== DEMOGRAPHIC REPORT ====================
  getDemographicReport = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = this.parseDateFilters(req.query);

      // FIXED: was calling prisma directly with no filters — now delegates to service
      const report = await this.service.getDemographicReport({ startDate, endDate });

      return res.json({ success: true, data: report });
    } catch (error) {
      console.error('Demographic report error:', error);
      return res.status(500).json({ success: false, message: 'Error generating demographic report' });
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

      return res.json({
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
      return res.status(500).json({ success: false, message: 'Error generating NHIS expiry report' });
    }
  };

  // ==================== NHIS CLAIMS SUMMARY ====================
  getNhisClaimsSummary = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = this.parseDateFilters(req.query);
      const { expiryStatus } = req.query as any;

      // FIXED: delegates to service; service uses correct Prisma relation filter syntax
      const report = await this.service.getNhisClaimsWithExpiry({ startDate, endDate, expiryStatus });

      return res.json({ success: true, data: report });
    } catch (error) {
      console.error('NHIS claims summary error:', error);
      return res.status(500).json({ success: false, message: 'Error generating NHIS claims summary' });
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

      return res.json({ success: true, data: { expiringPatients: result, count: result.length, threshold } });
    } catch (error) {
      console.error('NHIS expiring soon error:', error);
      return res.status(500).json({ success: false, message: 'Error fetching expiring NHIS memberships' });
    }
  };

  // ==================== EXPORT REPORT ====================
  // The screen posts the report it is showing; the server turns it into a real file.
  //   format: csv (default) | excel (.xlsx) | pdf | json
  exportReport = async (req: Request, res: Response) => {
    try {
      const { reportType, format = 'csv', filters, data } = req.body || {};

      if (!reportType || !data || typeof data !== 'object') {
        return res.status(400).json({ success: false, message: 'Report type and data are required' });
      }

      const kind = String(format).toLowerCase();
      if (!['csv', 'excel', 'xlsx', 'pdf', 'json'].includes(kind)) {
        return res.status(400).json({ success: false, message: `Unsupported export format: ${format}` });
      }

      const title = REPORT_TITLES[String(reportType)] || String(reportType).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const doc = reportToDocument(data, title);
      // the screen's own title (e.g. "Top 10 Diagnoses") wins over the generic type name
      if (REPORT_TITLES[String(reportType)]) doc.meta.title = title;
      if (!doc.meta.period && (filters?.startDate || filters?.endDate)) {
        doc.meta.period = `${filters.startDate || 'Beginning'} to ${filters.endDate || 'Now'}`;
      }

      const safe = String(reportType).replace(/[^a-z0-9_-]+/gi, '_').slice(0, 40);
      const from = String(filters?.startDate || '').slice(0, 10);
      const to = String(filters?.endDate || '').slice(0, 10);
      const stamp = from && to ? `${from}_to_${to}` : new Date().toISOString().split('T')[0];
      const base = `${safe}_${stamp}`;

      if (kind === 'json') {
        return res.json({ success: true, data: doc, filename: `${base}.json` });
      }

      let buffer: Buffer;
      let contentType: string;
      let filename: string;
      if (kind === 'pdf') {
        buffer = await documentToPdf(doc);
        contentType = 'application/pdf';
        filename = `${base}.pdf`;
      } else if (kind === 'csv') {
        buffer = documentToCsv(doc);
        contentType = 'text/csv; charset=utf-8';
        filename = `${base}.csv`;
      } else {
        buffer = documentToXlsx(doc);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `${base}.xlsx`;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition'); // lets the browser read the file name
      res.setHeader('Content-Length', String(buffer.length));
      return res.send(buffer);
    } catch (error) {
      console.error('Export error:', error);
      return res.status(500).json({ success: false, message: 'Error exporting report' });
    }
  };
}