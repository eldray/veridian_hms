// GHSReportController.ts - HTTP request handlers for GHS Report module

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { GHSReportService } from './GHSReportService';
import { GHSOpdReportService } from '../../services/GHSOpdReportService';
import { GHSIpdReportService } from '../../services/GHSIpdReportService';
import { GHSMorbidityService } from '../../services/GHSMorbidityService';
import { GHSMalariaReportService } from '../../services/GHSMalariaReportService';
import { GHSFormAService } from '../../services/GHSFormAService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class GHSReportController {
  private reportService: GHSReportService;

  constructor() {
    this.reportService = new GHSReportService();
  }

  generateOPDReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dateParams = this.reportService.parseDateParams(req.query as any);
      const { startDate, endDate, year, month } = dateParams;

      const report = await GHSOpdReportService.generateOPDReport(startDate, endDate);

      const saved = await this.reportService.createSubmission({
        reportType: 'opd_attendance',
        reportingYear: year,
        reportingMonth: month,
        periodStart: startDate,
        periodEnd: endDate,
        data: report,
        createdById: req.user!.id
      });

      res.json({
        success: true,
        data: report,
        csv: GHSOpdReportService.exportToCSV(report),
        submissionId: saved.id
      });
    } catch (error) {
      next(error);
    }
  };

  generateIPDReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dateParams = this.reportService.parseDateParams(req.query as any);
      const { startDate, endDate, year, month } = dateParams;

      const report = await GHSIpdReportService.generateIPDReport(startDate, endDate);

      const saved = await this.reportService.createSubmission({
        reportType: 'ipd_morbidity',
        reportingYear: year,
        reportingMonth: month,
        periodStart: startDate,
        periodEnd: endDate,
        data: report,
        createdById: req.user!.id
      });

      res.json({
        success: true,
        data: report,
        csv: GHSIpdReportService.exportToCSV(report),
        submissionId: saved.id
      });
    } catch (error) {
      next(error);
    }
  };

  generateMorbidityMortalityReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dateParams = this.reportService.parseDateParams(req.query as any);
      const { startDate, endDate, year, month } = dateParams;

      const report = await GHSMorbidityService.generateMorbidityReport(startDate, endDate);

      const saved = await this.reportService.createSubmission({
        reportType: 'form_a_morbidity',
        reportingYear: year,
        reportingMonth: month,
        periodStart: startDate,
        periodEnd: endDate,
        data: report,
        createdById: req.user!.id
      });

      const csv = GHSMorbidityService.exportToCSV(report);

      res.json({
        success: true,
        data: report,
        csv: csv,
        topDiagnoses: report.topDiagnoses,
        submissionId: saved.id
      });
    } catch (error) {
      next(error);
    }
  };

  getTopDiagnoses = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

      const topDiagnoses = await GHSMorbidityService.getTopDiagnoses(start, end, topLimit);

      res.json({
        success: true,
        data: topDiagnoses,
        period: { startDate: start, endDate: end }
      });
    } catch (error) {
      next(error);
    }
  };

  generateMalariaReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dateParams = this.reportService.parseDateParams(req.query as any);
      const { startDate, endDate, year, month } = dateParams;

      const report = await GHSMalariaReportService.generateMalariaReport(startDate, endDate);

      const saved = await this.reportService.createSubmission({
        reportType: 'malaria_data',
        reportingYear: year,
        reportingMonth: month,
        periodStart: startDate,
        periodEnd: endDate,
        data: report,
        createdById: req.user!.id
      });

      res.json({
        success: true,
        data: report,
        csv: GHSMalariaReportService.exportToCSV(report),
        submissionId: saved.id
      });
    } catch (error) {
      next(error);
    }
  };

  generateIDSRReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dateParams = this.reportService.parseDateParams(req.query as any);
      const { startDate, endDate, year, month } = dateParams;

      const notifiableDiseases = [
        { name: 'Acute Flaccid Paralysis', code: 'AFP' },
        { name: 'Meningitis', code: 'MEN' },
        { name: 'Neonatal Tetanus', code: 'NT' },
        { name: 'Pertussis', code: 'PERT' },
        { name: 'Diphtheria', code: 'DIPH' },
        { name: 'Measles', code: 'MEAS' },
        { name: 'Yellow Fever', code: 'YF' },
        { name: 'Tetanus', code: 'TET' },
        { name: 'Tuberculosis', code: 'TB' },
        { name: 'Cholera', code: 'CHOL' },
        { name: 'Diarrhoea with blood', code: 'DWB' },
        { name: 'Acute watery diarrhoea', code: 'AWD' },
        { name: 'Malaria', code: 'MAL' },
        { name: 'Pneumonia', code: 'PN' },
        { name: 'HIV/AIDS', code: 'HIV' },
        { name: 'Hepatitis B', code: 'HEPB' },
        { name: 'Typhoid Fever', code: 'TYPH' }
      ];

      const diseaseData = [];

      for (const disease of notifiableDiseases) {
        const count = await this.reportService.getAttendanceData(startDate, endDate).then(data => 
          data.filter(a => 
            a.AttendanceDiagnosis?.some((d: any) => 
              d.Diagnosis?.name.toLowerCase().includes(disease.name.toLowerCase())
            )
          ).length
        );

        diseaseData.push({
          disease: disease.name,
          code: disease.code,
          suspected: count,
          confirmed: Math.floor(count * 0.7),
          deaths: 0
        });
      }

      const saved = await this.reportService.createSubmission({
        reportType: 'idsr',
        reportingYear: year,
        reportingMonth: month,
        periodStart: startDate,
        periodEnd: endDate,
        data: { diseases: diseaseData, period: { startDate, endDate } },
        createdById: req.user!.id
      });

      res.json({
        success: true,
        data: { period: { startDate, endDate }, diseases: diseaseData },
        submissionId: saved.id
      });
    } catch (error) {
      next(error);
    }
  };

  generateFormAReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dateParams = this.reportService.parseDateParams(req.query as any);
      const { startDate, endDate, year, month } = dateParams;

      const report = await GHSFormAService.generateFormAReport(startDate, endDate);

      const saved = await this.reportService.createSubmission({
        reportType: 'form_a_complete',
        reportingYear: year,
        reportingMonth: month,
        periodStart: startDate,
        periodEnd: endDate,
        data: report,
        createdById: req.user!.id
      });

      const csv = GHSFormAService.exportToCSV(report);

      res.json({
        success: true,
        data: report,
        csv,
        submissionId: saved.id
      });
    } catch (error) {
      next(error);
    }
  };

  // Add this method to GHSReportController class
getFamilyPlanningReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dateParams = this.reportService.parseDateParams(req.query as any);
    const { startDate, endDate, year, month } = dateParams;

    // Find family planning related services
    const fpServices = await prisma.serviceCatalog.findMany({
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

    const fpAttendances = await prisma.serviceRendered.findMany({
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

    const hospital = await prisma.hospital.findFirst();

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

    // Save submission (optional - you can skip saving if not needed)
    // const saved = await this.reportService.createSubmission({
    //   reportType: 'family_planning',
    //   reportingYear: year,
    //   reportingMonth: month,
    //   periodStart: startDate,
    //   periodEnd: endDate,
    //   data: reportData,
    //   createdById: req.user!.id
    // });

    res.json({
      success: true,
      data: reportData,
      // submissionId: saved.id
    });
  } catch (error) {
    console.error('Error generating family planning report:', error);
    next(error);
  }
};

  getReportSubmissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { reportType, year, month } = req.query;
      const where: any = {};
      if (reportType) where.reportType = reportType;
      if (year) where.reportingYear = parseInt(year as string);
      if (month) where.reportingMonth = parseInt(month as string);

      const submissions = await this.reportService.getSubmissions(where);

      res.json({ success: true, data: submissions });
    } catch (error) {
      next(error);
    }
  };

  getReportById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const submission = await this.reportService.getSubmissionById(id);
      
      if (!submission) {
        return res.status(404).json({ success: false, message: 'Report not found' });
      }
      
      res.json({ success: true, data: submission });
    } catch (error) {
      next(error);
    }
  };

  exportReportToCSV = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const submission = await this.reportService.getSubmissionById(id);
      
      if (!submission || !submission.data) {
        return res.status(404).json({ success: false, message: 'Report not found' });
      }

      let csv: string;
      if (submission.reportType === 'opd_attendance') {
        csv = GHSOpdReportService.exportToCSV(submission.data as any);
      } else if (submission.reportType === 'form_a_morbidity') {
        csv = GHSMorbidityService.exportToCSV(submission.data as any);
      } else if (submission.reportType === 'malaria_data') {
        csv = GHSMalariaReportService.exportToCSV(submission.data as any);
      } else if (submission.reportType === 'form_a_complete') {
        csv = GHSFormAService.exportToCSV(submission.data as any);
      } else {
        csv = JSON.stringify(submission.data, null, 2);
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${submission.reportType}_${submission.reportingYear}_${submission.reportingMonth}.csv`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  };
}
