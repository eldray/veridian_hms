// modules/ghsReport/GHSReportController.ts
import { Response, Request } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { AuthRequest } from '../../middleware/authMiddleware';
import { GHSReportService } from './GHSReportService';
import { PrismaClient } from '@prisma/client';

export class GHSReportController extends BaseController {
  private reportService: GHSReportService;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super();
    this.prisma = prisma;
    this.reportService = new GHSReportService(prisma);
  }

  // ==============================================
  // REPORT GENERATION METHODS
  // ==============================================

  generateOPDReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, year, month } = this.reportService.parseDateParams(req.query);
      const report = await this.reportService.generateOPDReport(startDate, endDate);
      const csv = GHSReportService.exportOPDToCSV(report);

      const saved = await this.prisma.gHSReportSubmission.create({
        data: {
          reportType: 'opd_attendance',
          reportingYear: year,
          reportingMonth: month,
          periodStart: startDate,
          periodEnd: endDate,
          data: report,
          createdById: req.user!.id
        }
      });

      this.ok(res, {
        data: report,
        csv,
        submissionId: saved.id
      }, 'OPD report generated successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  generateIPDReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, year, month } = this.reportService.parseDateParams(req.query);
      const report = await this.reportService.generateIPDReport(startDate, endDate);
      const csv = GHSReportService.exportIPDToCSV(report);

      const saved = await this.prisma.gHSReportSubmission.create({
        data: {
          reportType: 'ipd_morbidity',
          reportingYear: year,
          reportingMonth: month,
          periodStart: startDate,
          periodEnd: endDate,
          data: report,
          createdById: req.user!.id
        }
      });

      this.ok(res, {
        data: report,
        csv,
        submissionId: saved.id
      }, 'IPD report generated successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  generateMorbidityMortalityReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, year, month } = this.reportService.parseDateParams(req.query);
      const report = await this.reportService.generateMorbidityReport(startDate, endDate);
      const csv = GHSReportService.exportMorbidityToCSV(report);

      const saved = await this.prisma.gHSReportSubmission.create({
        data: {
          reportType: 'form_a_morbidity',
          reportingYear: year,
          reportingMonth: month,
          periodStart: startDate,
          periodEnd: endDate,
          data: report,
          createdById: req.user!.id
        }
      });

      this.ok(res, {
        data: report,
        csv,
        topDiagnoses: report.topDiagnoses,
        submissionId: saved.id
      }, 'Morbidity and mortality report generated successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  generateMalariaReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, year, month } = this.reportService.parseDateParams(req.query);
      const report = await this.reportService.generateMalariaReport(startDate, endDate);
      const csv = GHSReportService.exportMalariaToCSV(report);

      const saved = await this.prisma.gHSReportSubmission.create({
        data: {
          reportType: 'malaria_data',
          reportingYear: year,
          reportingMonth: month,
          periodStart: startDate,
          periodEnd: endDate,
          data: report,
          createdById: req.user!.id
        }
      });

      this.ok(res, {
        data: report,
        csv,
        submissionId: saved.id
      }, 'Malaria report generated successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  generateFormAReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, year, month } = this.reportService.parseDateParams(req.query);
      const report = await this.reportService.generateFormAReport(startDate, endDate);
      const csv = GHSReportService.exportFormAToCSV(report);

      const saved = await this.prisma.gHSReportSubmission.create({
        data: {
          reportType: 'form_a_complete',
          reportingYear: year,
          reportingMonth: month,
          periodStart: startDate,
          periodEnd: endDate,
          data: report,
          createdById: req.user!.id
        }
      });

      this.ok(res, {
        data: report,
        csv,
        submissionId: saved.id
      }, 'Form A report generated successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  generateIDSRReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, year, month } = this.reportService.parseDateParams(req.query);
      const report = await this.reportService.generateIDSRReport(startDate, endDate);

      const saved = await this.prisma.gHSReportSubmission.create({
        data: {
          reportType: 'idsr',
          reportingYear: year,
          reportingMonth: month,
          periodStart: startDate,
          periodEnd: endDate,
          data: report,
          createdById: req.user!.id
        }
      });

      this.ok(res, {
        data: report,
        submissionId: saved.id
      }, 'IDSR report generated successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  getTopDiagnoses = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, limit } = req.query;
      const topLimit = limit ? parseInt(limit as string) : 10;

      let start: Date, end: Date;
      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
      } else {
        const now = new Date();
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      }

      const topDiagnoses = await this.reportService.getTopDiagnoses(start, end, topLimit);
      this.ok(res, {
        data: topDiagnoses,
        period: { startDate: start, endDate: end }
      }, 'Top diagnoses retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // ==============================================
  // DELIVERY REPORT (Preserved from your original)
  // ==============================================

  generateDeliveryReport = async (req: AuthRequest, res: Response) => {
    try {
      const { dateFrom, dateTo, period, year, month } = req.query;
      
      let startDate: Date;
      let endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      // Date range logic
      if (dateFrom && dateTo) {
        startDate = new Date(dateFrom as string);
        endDate = new Date(dateTo as string);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === 'month' && year && month) {
        startDate = new Date(Number(year), Number(month) - 1, 1);
        endDate = new Date(Number(year), Number(month), 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === 'year' && year) {
        startDate = new Date(Number(year), 0, 1);
        endDate = new Date(Number(year), 11, 31);
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Default to current month
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
      }
      
      // Get all deliveries within date range
      const deliveries = await this.prisma.deliveryRecord.findMany({
        where: {
          deliveryDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true,
              age: true,
              address: true,
              nhisNumber: true
            }
          },
          attendance: {
            select: {
              id: true,
              attendanceNumber: true,
              paymentMode: true,
              nhisCCC: true
            }
          },
          antenatalBooking: {
            select: {
              id: true,
              gravida: true,
              para: true,
              bookingDate: true,
              lmp: true,
              edd: true
            }
          },
          createdBy: {
            select: {
              fullName: true,
              role: true
            }
          }
        },
        orderBy: {
          deliveryDate: 'desc'
        }
      });
      
      // Calculate statistics
      const totalDeliveries = deliveries.length;
      
      // Delivery type breakdown
      const deliveryTypeBreakdown = {
        spontaneous_vertex: deliveries.filter(d => d.deliveryType === 'spontaneous_vertex').length,
        assisted_breech: deliveries.filter(d => d.deliveryType === 'assisted_breech').length,
        vacuum: deliveries.filter(d => d.deliveryType === 'vacuum').length,
        forceps: deliveries.filter(d => d.deliveryType === 'forceps').length,
        caesarean_section: deliveries.filter(d => d.deliveryType === 'caesarean_section').length,
        multiple: deliveries.filter(d => d.deliveryType === 'multiple').length
      };
      
      // Delivery outcome breakdown
      const outcomeBreakdown = {
        live_birth: deliveries.filter(d => d.deliveryOutcome === 'live_birth').length,
        stillbirth_fresh: deliveries.filter(d => d.deliveryOutcome === 'stillbirth_fresh').length,
        stillbirth_macerated: deliveries.filter(d => d.deliveryOutcome === 'stillbirth_macerated').length,
        neonatal_death: deliveries.filter(d => d.deliveryOutcome === 'neonatal_death').length
      };
      
      // Place of delivery breakdown
      const placeBreakdown = {
        hospital: deliveries.filter(d => d.placeOfDelivery === 'hospital').length,
        health_centre: deliveries.filter(d => d.placeOfDelivery === 'health_centre').length,
        clinic: deliveries.filter(d => d.placeOfDelivery === 'clinic').length,
        home: deliveries.filter(d => d.placeOfDelivery === 'home').length,
        en_route: deliveries.filter(d => d.placeOfDelivery === 'en_route').length
      };
      
      // Maternal outcome breakdown
      const maternalOutcomeBreakdown = {
        alive: deliveries.filter(d => d.maternalOutcome === 'alive').length,
        dead_direct_cause: deliveries.filter(d => d.maternalOutcome === 'dead_direct_cause').length,
        dead_indirect_cause: deliveries.filter(d => d.maternalOutcome === 'dead_indirect_cause').length,
        dead_unknown: deliveries.filter(d => d.maternalOutcome === 'dead_unknown').length
      };
      
      // Payment mode breakdown
      const paymentModeBreakdown = {
        cash: deliveries.filter(d => d.attendance?.paymentMode === 'cash').length,
        nhis: deliveries.filter(d => d.attendance?.paymentMode === 'nhis').length,
        private_insurance: deliveries.filter(d => d.attendance?.paymentMode === 'private_insurance').length,
        corporate: deliveries.filter(d => d.attendance?.paymentMode === 'corporate').length
      };
      
      // Caesarean section rate
      const csRate = totalDeliveries > 0 
        ? (deliveryTypeBreakdown.caesarean_section / totalDeliveries) * 100 
        : 0;
      
      // Stillbirth rate
      const stillbirths = outcomeBreakdown.stillbirth_fresh + outcomeBreakdown.stillbirth_macerated;
      const stillbirthRate = totalDeliveries > 0 
        ? (stillbirths / totalDeliveries) * 1000 
        : 0;
      
      // Maternal mortality rate
      const maternalDeaths = maternalOutcomeBreakdown.dead_direct_cause + 
                            maternalOutcomeBreakdown.dead_indirect_cause +
                            maternalOutcomeBreakdown.dead_unknown;
      const maternalMortalityRate = totalDeliveries > 0 
        ? (maternalDeaths / totalDeliveries) * 100000 
        : 0;
      
      // Average birth weight
      const birthsWithWeight = deliveries.filter(d => d.birthWeight);
      const avgBirthWeight = birthsWithWeight.length > 0
        ? birthsWithWeight.reduce((sum, d) => sum + (d.birthWeight || 0), 0) / birthsWithWeight.length
        : 0;
      
      // Low birth weight rate (<2500g)
      const lowBirthWeightCount = deliveries.filter(d => d.birthWeight && d.birthWeight < 2500).length;
      const lowBirthWeightRate = totalDeliveries > 0 
        ? (lowBirthWeightCount / totalDeliveries) * 100 
        : 0;
      
      // Deliveries by attendant
      const attendantBreakdown = deliveries.reduce((acc, d) => {
        const attendant = d.attendant || 'Unknown';
        acc[attendant] = (acc[attendant] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Monthly trend (for charts)
      const monthlyTrend = deliveries.reduce((acc, d) => {
        const monthKey = `${d.deliveryDate.getFullYear()}-${String(d.deliveryDate.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[monthKey]) {
          acc[monthKey] = { month: monthKey, deliveries: 0, cs: 0, liveBirths: 0 };
        }
        acc[monthKey].deliveries++;
        if (d.deliveryType === 'caesarean_section') acc[monthKey].cs++;
        if (d.deliveryOutcome === 'live_birth') acc[monthKey].liveBirths++;
        return acc;
      }, {} as Record<string, any>);
      
      const monthlyTrendArray = Object.values(monthlyTrend).sort((a, b) => 
        a.month.localeCompare(b.month)
      );
      
      // Complications summary
      const complicationsSummary = deliveries.reduce((acc, d) => {
        if (d.complications && d.complications.length > 0) {
          d.complications.forEach(comp => {
            acc[comp] = (acc[comp] || 0) + 1;
          });
        }
        return acc;
      }, {} as Record<string, number>);
      
      this.ok(res, {
        data: {
          summary: {
            totalDeliveries,
            csRate: Math.round(csRate * 10) / 10,
            stillbirthRate: Math.round(stillbirthRate * 10) / 10,
            maternalMortalityRate: Math.round(maternalMortalityRate),
            avgBirthWeight: Math.round(avgBirthWeight),
            lowBirthWeightRate: Math.round(lowBirthWeightRate * 10) / 10
          },
          breakdowns: {
            deliveryType: deliveryTypeBreakdown,
            outcome: outcomeBreakdown,
            placeOfDelivery: placeBreakdown,
            maternalOutcome: maternalOutcomeBreakdown,
            paymentMode: paymentModeBreakdown,
            byAttendant: attendantBreakdown
          },
          trends: {
            monthly: monthlyTrendArray
          },
          complications: complicationsSummary,
          deliveries: deliveries.slice(0, 100),
          period: {
            startDate,
            endDate,
            totalDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          }
        }
      }, 'Delivery report generated successfully');
      
    } catch (error) {
      console.error('Error generating delivery report:', error);
      this.error(res, error);
    }
  };

  // ==============================================
  // FAMILY PLANNING REPORT (Preserved from your original)
  // ==============================================

  getFamilyPlanningReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate, year, month } = this.reportService.parseDateParams(req.query);
      
      // Find family planning related services
      const fpServices = await this.prisma.serviceCatalog.findMany({
        where: {
          OR: [
            { name: { contains: 'family planning', mode: 'insensitive' } },
            { name: { contains: 'contraceptive', mode: 'insensitive' } },
            { name: { contains: 'IUD', mode: 'insensitive' } },
            { name: { contains: 'implant', mode: 'insensitive' } },
            { name: { contains: 'injectable', mode: 'insensitive' } },
            { name: { contains: 'oral contraceptive', mode: 'insensitive' } },
            { name: { contains: 'condom', mode: 'insensitive' } }
          ],
          isActive: true
        },
        select: { id: true, name: true }
      });

      const fpServiceIds = fpServices.map(s => s.id);

      const fpAttendances = await this.prisma.serviceRendered.findMany({
        where: {
          serviceItemId: { in: fpServiceIds },
          date: { gte: startDate, lte: endDate }
        },
        include: {
          Attendance: {
            include: {
              Patient: {
                select: {
                  id: true,
                  surname: true,
                  otherNames: true,
                  dateOfBirth: true,
                  gender: true,
                  folderNumber: true,
                  contact: true
                }
              }
            }
          },
          ServiceCatalog: true
        }
      });

      // Helper to calculate age
      const calculateAge = (dateOfBirth: Date, asOfDate: Date): number => {
        const birthDate = new Date(dateOfBirth);
        const targetDate = new Date(asOfDate);
        let age = targetDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = targetDate.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) {
          age--;
        }
        return Math.max(0, age);
      };

      // Age groups for women of reproductive age (15-49)
      const ageGroups = {
        '15-19 years': 0,
        '20-34 years': 0,
        '35-49 years': 0,
        '50+ years': 0
      };

      const methodMix: Record<string, number> = {};

      for (const fp of fpAttendances) {
        const patient = fp.Attendance.Patient;
        const age = calculateAge(patient.dateOfBirth, fp.date);
        
        if (age >= 15 && age <= 19) ageGroups['15-19 years']++;
        else if (age >= 20 && age <= 34) ageGroups['20-34 years']++;
        else if (age >= 35 && age <= 49) ageGroups['35-49 years']++;
        else if (age >= 50) ageGroups['50+ years']++;

        const method = fp.ServiceCatalog.name;
        methodMix[method] = (methodMix[method] || 0) + 1;
      }

      const uniqueClients = new Set(fpAttendances.map(f => f.Attendance.patientId)).size;

      const hospital = await this.prisma.hospital.findFirst();

      const reportData = {
        reportType: 'FAMILY PLANNING REPORT',
        facility: {
          name: hospital?.name || 'General Hospital',
          district: hospital?.ghsDistrictCode || 'Unknown',
          ghfCode: hospital?.ghaHFCode || 'Unknown'
        },
        period: {
          startDate,
          endDate,
          generated: new Date().toISOString().split('T')[0]
        },
        summary: {
          totalFPClients: uniqueClients,
          totalFPVisits: fpAttendances.length,
          newAcceptors: 0,
          coupleYearProtection: 0
        },
        demographicBreakdown: ageGroups,
        methodMix,
        generatedAt: new Date()
      };

      this.ok(res, reportData, 'Family planning report generated successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // ==============================================
  // REPORT SUBMISSION METHODS (Preserved from your original)
  // ==============================================

  getReportSubmissions = async (req: AuthRequest, res: Response) => {
    try {
      const { reportType, year, month, page = 1, limit = 20 } = req.query;
      
      const where: any = {};
      if (reportType) where.reportType = reportType;
      if (year) where.reportingYear = parseInt(year as string);
      if (month) where.reportingMonth = parseInt(month as string);
      
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;
      
      const [submissions, total] = await Promise.all([
        this.prisma.gHSReportSubmission.findMany({
          where,
          include: {
            createdBy: {
              select: { id: true, fullName: true, role: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum
        }),
        this.prisma.gHSReportSubmission.count({ where })
      ]);
      
      this.ok(res, {
        data: submissions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }, 'Report submissions retrieved successfully');
    } catch (error) {
      console.error('Error getting report submissions:', error);
      this.error(res, error);
    }
  };

  getReportById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const submission = await this.prisma.gHSReportSubmission.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: { id: true, fullName: true, role: true }
          }
        }
      });
      
      if (!submission) {
        return this.notFound(res, 'Report submission not found');
      }
      
      this.ok(res, { data: submission }, 'Report retrieved successfully');
    } catch (error) {
      console.error('Error getting report:', error);
      this.error(res, error);
    }
  };

  exportReportToCSV = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const submission = await this.prisma.gHSReportSubmission.findUnique({
        where: { id }
      });
      
      if (!submission) {
        return this.notFound(res, 'Report submission not found');
      }
      
      // Convert data to CSV based on report type
      const data = submission.data as any;
      let csvContent = '';
      
      switch (submission.reportType) {
        case 'opd_attendance':
          csvContent = GHSReportService.exportOPDToCSV(data);
          break;
        case 'malaria_data':
          csvContent = GHSReportService.exportMalariaToCSV(data);
          break;
        case 'form_a_morbidity':
          csvContent = GHSReportService.exportMorbidityToCSV(data);
          break;
        case 'form_a_complete':
          csvContent = GHSReportService.exportFormAToCSV(data);
          break;
        case 'ipd_morbidity':
          csvContent = GHSReportService.exportIPDToCSV(data);
          break;
        default:
          csvContent = JSON.stringify(data, null, 2);
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report_${submission.id}.csv`);
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting report:', error);
      this.error(res, error);
    }
  };
}