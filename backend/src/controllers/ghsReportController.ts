// controllers/ghsReportController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { GHSOpdReportService } from '../services/GHSOpdReportService';
import { GHSIpdReportService } from '../services/GHSIpdReportService';
import { GHSMalariaReportService } from '../services/GHSMalariaReportService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==============================================
// OPD REPORT (Based on opd.pdf)
// ==============================================
export const generateOPDReport = async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
    
    const report = await GHSOpdReportService.generateOPDReport(startDate, endDate);
    
    const saved = await prisma.gHSReportSubmission.create({
      data: {
        reportType: 'opd_morbidity',
        reportingYear: parseInt(year as string),
        reportingMonth: parseInt(month as string),
        periodStart: startDate,
        periodEnd: endDate,
        data: report,
        createdById: req.user!.id
      }
    });
    
    res.json({
      success: true,
      data: report,
      csv: GHSOpdReportService.exportToCSV(report),
      submissionId: saved.id
    });
  } catch (error) {
    console.error('Error generating OPD report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ==============================================
// IPD REPORT (Based on ipd report.pdf)
// ==============================================
export const generateIPDReport = async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
    
    const report = await GHSIpdReportService.generateIPDReport(startDate, endDate);
    
    const saved = await prisma.gHSReportSubmission.create({
      data: {
        reportType: 'ipd_morbidity',
        reportingYear: parseInt(year as string),
        reportingMonth: parseInt(month as string),
        periodStart: startDate,
        periodEnd: endDate,
        data: report,
        createdById: req.user!.id
      }
    });
    
    res.json({
      success: true,
      data: report,
      csv: GHSIpdReportService.exportToCSV(report),
      submissionId: saved.id
    });
  } catch (error) {
    console.error('Error generating IPD report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ==============================================
// MALARIA DATA RETURN (Based on malaria data.pdf)
// ==============================================
export const generateMalariaReport = async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
    
    const report = await GHSMalariaReportService.generateMalariaReport(startDate, endDate);
    
    const saved = await prisma.gHSReportSubmission.create({
      data: {
        reportType: 'malaria_data',
        reportingYear: parseInt(year as string),
        reportingMonth: parseInt(month as string),
        periodStart: startDate,
        periodEnd: endDate,
        data: report,
        createdById: req.user!.id
      }
    });
    
    res.json({ success: true, data: report, submissionId: saved.id });
  } catch (error) {
    console.error('Error generating malaria report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ==============================================
// IDSR REPORT (Notifiable diseases from idsr.pdf)
// ==============================================
export const generateIDSRReport = async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
    
    // Fetch notifiable disease counts
    const diseases = [
      'Acute Flaccid Paralysis', 'Meningitis', 'Neonatal Tetanus', 'Pertussis',
      'Measles', 'Yellow Fever', 'Tetanus', 'Tuberculosis', 'Cholera', 
      'Diarrhoea with blood', 'Acute watery diarrhoea', 'Malaria', 'Pneumonia'
    ];
    
    const diseaseData = [];
    for (const disease of diseases) {
      const count = await prisma.attendance.count({
        where: {
          dateTime: { gte: startDate, lte: endDate },
          AttendanceDiagnosis: {
            some: {
              Diagnosis: {
                name: { contains: disease, mode: 'insensitive' }
              }
            }
          }
        }
      });
      diseaseData.push({ disease, suspected: count, confirmed: 0, deaths: 0 });
    }
    
    res.json({ success: true, data: { period: { startDate, endDate }, diseases: diseaseData } });
  } catch (error) {
    console.error('Error generating IDSR report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ==============================================
// ANC REPORT (Based on form a.pdf page 2)
// ==============================================
export const generateANCReport = async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
    
    const bookings = await prisma.antenatalBooking.findMany({
      where: { bookingDate: { gte: startDate, lte: endDate } },
      include: { ANCVisit: true }
    });
    
    const visits = await prisma.aNCVisit.findMany({
      where: { visitDate: { gte: startDate, lte: endDate } }
    });
    
    const report = {
      period: { startDate, endDate },
      newRegistrants: bookings.length,
      totalVisits: visits.length,
      iptp1: visits.filter(v => v.supplementsGiven?.includes('IPTp')).length,
      tt2Plus: visits.filter(v => v.ttVaccineGiven).length,
      itnGiven: visits.filter(v => v.itnGiven).length,
      highRisk: bookings.filter(b => b.riskLevel === 'high').length,
      anaemiaInPregnancy: 0 // Would need lab data
    };
    
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating ANC report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ==============================================
// DELIVERY REGISTER REPORT (Based on form a.pdf)
// ==============================================
export const generateDeliveryReport = async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;
    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
    
    const deliveries = await prisma.deliveryRecord.findMany({
      where: { deliveryDate: { gte: startDate, lte: endDate } }
    });
    
    const report = {
      period: { startDate, endDate },
      totalDeliveries: deliveries.length,
      spontaneous: deliveries.filter(d => d.deliveryType === 'spontaneous_vertex').length,
      caesarean: deliveries.filter(d => d.deliveryType === 'caesarean_section').length,
      assisted: deliveries.filter(d => d.deliveryType === 'assisted_breech').length,
      liveBirths: deliveries.filter(d => d.deliveryOutcome === 'live_birth').length,
      stillbirths: deliveries.filter(d => d.deliveryOutcome === 'stillbirth_fresh' || d.deliveryOutcome === 'stillbirth_macerated').length,
      maternalDeaths: deliveries.filter(d => d.maternalOutcome !== 'alive').length,
      lowBirthWeight: deliveries.filter(d => d.birthWeight && d.birthWeight < 2500).length
    };
    
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating delivery report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ==============================================
// REPORT SUBMISSIONS
// ==============================================
export const getReportSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const { reportType, year, month } = req.query;
    const where: any = {};
    if (reportType) where.reportType = reportType;
    if (year) where.reportingYear = parseInt(year as string);
    if (month) where.reportingMonth = parseInt(month as string);
    
    const submissions = await prisma.gHSReportSubmission.findMany({
      where,
      include: { createdBy: { select: { fullName: true, username: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ success: true, data: submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const getReportById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const submission = await prisma.gHSReportSubmission.findUnique({
      where: { id },
      include: { createdBy: { select: { fullName: true, username: true } } }
    });
    if (!submission) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: submission });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

export const exportReportToCSV = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const submission = await prisma.gHSReportSubmission.findUnique({ where: { id } });
    if (!submission || !submission.data) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    
    let csv: string;
    if (submission.reportType === 'opd_morbidity') {
      csv = GHSOpdReportService.exportToCSV(submission.data as any);
    } else if (submission.reportType === 'ipd_morbidity') {
      csv = GHSIpdReportService.exportToCSV(submission.data as any);
    } else {
      csv = JSON.stringify(submission.data, null, 2);
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${submission.reportType}_${submission.reportingYear}_${submission.reportingMonth}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};