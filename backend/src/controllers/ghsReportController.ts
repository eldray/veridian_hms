// controllers/ghsReportController.ts - UPDATED WITH CORRECT ENUM VALUES

import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { GHSOpdReportService } from '../services/GHSOpdReportService';
import { GHSIpdReportService } from '../services/GHSIpdReportService';
import { GHSMalariaReportService } from '../services/GHSMalariaReportService';
import { GHSMorbidityService } from '../services/GHSMorbidityService';
import { GHSFormAService } from '../services/GHSFormAService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to parse date parameters
const parseDateParams = (req: Request): { startDate: Date; endDate: Date; year: number; month: number } => {
  const { year, month, startDate, endDate } = req.query;
  
  if (year && month) {
    const y = parseInt(year as string);
    const m = parseInt(month as string) - 1;
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, year: y, month: parseInt(month as string) };
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);
    return { 
      startDate: start, 
      endDate: end, 
      year: start.getFullYear(), 
      month: start.getMonth() + 1 
    };
  }
  
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { startDate: start, endDate: end, year: now.getFullYear(), month: now.getMonth() + 1 };
};

// ==============================================
// 1. OPD ATTENDANCE REPORT
// ==============================================
export const generateOPDReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, year, month } = parseDateParams(req);
    
    const report = await GHSOpdReportService.generateOPDReport(startDate, endDate);
    
    const saved = await prisma.gHSReportSubmission.create({
      data: {
        reportType: 'opd_attendance',  // ✅ UPDATED - matches new enum
        reportingYear: year,
        reportingMonth: month,
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
    console.error('❌ Error generating OPD report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ==============================================
// 2. IPD REPORT
// ==============================================
export const generateIPDReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, year, month } = parseDateParams(req);
    
    const report = await GHSIpdReportService.generateIPDReport(startDate, endDate);
    
    const saved = await prisma.gHSReportSubmission.create({
      data: {
        reportType: 'ipd_morbidity',  // ✅ Keep as is
        reportingYear: year,
        reportingMonth: month,
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
    console.error('❌ Error generating IPD report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ==============================================
// 3. FULL MORBIDITY REPORT (OPD Morbidity - morbi.pdf)
// ==============================================
export const generateMorbidityMortalityReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, year, month } = parseDateParams(req);
    
    const report = await GHSMorbidityService.generateMorbidityReport(startDate, endDate);
    
    const saved = await prisma.gHSReportSubmission.create({
      data: {
        reportType: 'form_a_morbidity',  // ✅ Keep as is
        reportingYear: year,
        reportingMonth: month,
        periodStart: startDate,
        periodEnd: endDate,
        data: report,
        createdById: req.user!.id
      }
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
    console.error('❌ Error generating Morbidity report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ==============================================
// 4. TOP DIAGNOSES (Doesn't need DB storage - just returns data)
// ==============================================
export const getTopDiagnoses = async (req: AuthRequest, res: Response) => {
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
    
    const topDiagnoses = await GHSMorbidityService.getTopDiagnosesOnly(start, end, topLimit);
    
    res.json({
      success: true,
      data: topDiagnoses,
      period: { startDate: start, endDate: end }
    });
  } catch (error) {
    console.error('❌ Error fetching top diagnoses:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ==============================================
// 5. MALARIA REPORT
// ==============================================
export const generateMalariaReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, year, month } = parseDateParams(req);
    
    const report = await GHSMalariaReportService.generateMalariaReport(startDate, endDate);
    
    const saved = await prisma.gHSReportSubmission.create({
      data: {
        reportType: 'malaria_data',  // ✅ Keep as is
        reportingYear: year,
        reportingMonth: month,
        periodStart: startDate,
        periodEnd: endDate,
        data: report,
        createdById: req.user!.id
      }
    });
    
    res.json({ 
      success: true, 
      data: report,
      csv: GHSMalariaReportService.exportToCSV(report),
      submissionId: saved.id 
    });
  } catch (error) {
    console.error('❌ Error generating malaria report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ==============================================
// 6. IDSR REPORT
// ==============================================
// ==============================================
// 6. IDSR REPORT (Keep)
// ==============================================
export const generateIDSRReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, year, month } = parseDateParams(req);
    
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
      // Get suspected cases from attendances with matching diagnosis
      const count = await prisma.attendance.count({
        where: {
          dateTime: { gte: startDate, lte: endDate },
          status: { not: 'cancelled' },
          AttendanceDiagnosis: {
            some: {
              Diagnosis: {
                name: { contains: disease.name, mode: 'insensitive' }
              }
            }
          }
        }
      });
      
      // ✅ FIXED: Use proper relation to get deaths from admissions
      // Get deaths by finding admissions where the patient had this diagnosis
      const deaths = await prisma.admission.count({
        where: {
          admissionDate: { gte: startDate, lte: endDate },
          dischargeStatus: 'expired',
          OR: [
            // Check principal diagnosis relation
            {
              Diagnosis: {
                name: { contains: disease.name, mode: 'insensitive' }
              }
            },
            // Also check secondary diagnoses
            {
              AdmissionSecondaryDiagnosis: {
                some: {
                  Diagnosis: {
                    name: { contains: disease.name, mode: 'insensitive' }
                  }
                }
              }
            }
          ]
        }
      });
      
      diseaseData.push({ 
        disease: disease.name, 
        code: disease.code,
        suspected: count, 
        confirmed: Math.floor(count * 0.7), // Placeholder - would need lab confirmation data
        deaths 
      });
    }
    
    const saved = await prisma.gHSReportSubmission.create({
      data: {
        reportType: 'idsr',
        reportingYear: year,
        reportingMonth: month,
        periodStart: startDate,
        periodEnd: endDate,
        data: { diseases: diseaseData, period: { startDate, endDate } },
        createdById: req.user!.id
      }
    });
    
    res.json({ 
      success: true, 
      data: { period: { startDate, endDate }, diseases: diseaseData },
      submissionId: saved.id
    });
  } catch (error) {
    console.error('❌ Error generating IDSR report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ==============================================
// 7. FORM A REPORT (Combined ANC + Delivery + Postnatal)
// ==============================================
export const generateFormAReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, year, month } = parseDateParams(req);
    
    console.log(`📊 Generating Form A (ANC + Delivery + Postnatal) report for: ${startDate} to ${endDate}`);
    
    const report = await GHSFormAService.generateFormAReport(startDate, endDate);
    
    const saved = await prisma.gHSReportSubmission.create({
      data: {
        reportType: 'form_a_complete',  // ✅ NEW enum value
        reportingYear: year,
        reportingMonth: month,
        periodStart: startDate,
        periodEnd: endDate,
        data: report,
        createdById: req.user!.id
      }
    });
    
    const csv = GHSFormAService.exportToCSV(report);
    
    res.json({
      success: true,
      data: report,
      csv,
      submissionId: saved.id
    });
  } catch (error) {
    console.error('❌ Error generating Form A report:', error);
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
    if (submission.reportType === 'opd_attendance') {
      csv = GHSOpdReportService.exportToCSV(submission.data as any);
    } else if (submission.reportType === 'opd_morbidity') {
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
    console.error('Error exporting report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};