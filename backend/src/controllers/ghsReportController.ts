// controllers/ghsReportController.ts - UPDATED
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { GHSOpdReportService } from '../services/GHSOpdReportService';
import { GHSIpdReportService } from '../services/GHSIpdReportService';
import { GHSMalariaReportService } from '../services/GHSMalariaReportService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to parse date parameters
const parseDateParams = (req: Request): { startDate: Date; endDate: Date; year: number; month: number } => {
  const { year, month, startDate, endDate } = req.query;
  
  // If year and month are provided, use them
  if (year && month) {
    const y = parseInt(year as string);
    const m = parseInt(month as string) - 1;
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return { startDate: start, endDate: end, year: y, month: parseInt(month as string) };
  }
  
  // Otherwise, use startDate and endDate
  if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);
    return { 
      startDate: start, 
      endDate: end, 
      year: start.getFullYear(), 
      month: start.getMonth() + 1 
    };
  }
  
  // Default to current month
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: start, endDate: end, year: now.getFullYear(), month: now.getMonth() + 1 };
};

// ==============================================
// OPD REPORT (Based on opd.pdf)
// ==============================================
// controllers/ghsReportController.ts - FIXED VERSION

export const generateOPDReport = async (req: AuthRequest, res: Response) => {
  try {
    let startDate: Date;
    let endDate: Date;
    let year: number;
    let month: number;
    
    // ✅ Handle both parameter formats
    if (req.query.startDate && req.query.endDate) {
      // Frontend sends startDate/endDate
      startDate = new Date(req.query.startDate as string);
      endDate = new Date(req.query.endDate as string);
      endDate.setHours(23, 59, 59, 999);
      year = startDate.getFullYear();
      month = startDate.getMonth() + 1;
    } else if (req.query.year && req.query.month) {
      // Backend internal call with year/month
      year = parseInt(req.query.year as string);
      month = parseInt(req.query.month as string);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else {
      // Default to current month
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    }
    
    console.log(`📊 Generating OPD report for: ${startDate} to ${endDate}`);
    
    const report = await GHSOpdReportService.generateOPDReport(startDate, endDate);
    
    const saved = await prisma.gHSReportSubmission.create({
      data: {
        reportType: 'opd_morbidity',
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
    res.status(500).json({ 
      success: false, 
      message: (error as Error).message,
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });
  }
};

// ==============================================
// IPD REPORT (Based on ipd report.pdf)
// ==============================================
export const generateIPDReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, year, month } = parseDateParams(req);
    
    console.log(`📊 Generating IPD report for period: ${startDate} to ${endDate}`);
    
    const report = await GHSIpdReportService.generateIPDReport(startDate, endDate);
    
    const saved = await prisma.gHSReportSubmission.create({
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
    const { startDate, endDate, year, month } = parseDateParams(req);
    
    console.log(`📊 Generating Malaria report for period: ${startDate} to ${endDate}`);
    
    const report = await GHSMalariaReportService.generateMalariaReport(startDate, endDate);
    
    const saved = await prisma.gHSReportSubmission.create({
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
    const { startDate, endDate, year, month } = parseDateParams(req);
    
    console.log(`📊 Generating IDSR report for period: ${startDate} to ${endDate}`);
    
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
          status: { not: 'cancelled' },
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
    
    const saved = await prisma.gHSReportSubmission.create({
      data: {
        reportType: 'idsr',
        reportingYear: year,
        reportingMonth: month,
        periodStart: startDate,
        periodEnd: endDate,
        data: { diseases: diseaseData },
        createdById: req.user!.id
      }
    });
    
    res.json({ 
      success: true, 
      data: { period: { startDate, endDate }, diseases: diseaseData },
      submissionId: saved.id
    });
  } catch (error) {
    console.error('Error generating IDSR report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ==============================================
// ANC REPORT (Based on form a.pdf page 2)
// ==============================================

// controllers/ghsReportController.ts - Add/Update the ANC Report function
export const generateANCReport = async (req: AuthRequest, res: Response) => {
  try {
    let startDate: Date;
    let endDate: Date;
    let year: number;
    let month: number;
    
    if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate as string);
      endDate = new Date(req.query.endDate as string);
      endDate.setHours(23, 59, 59, 999);
      year = startDate.getFullYear();
      month = startDate.getMonth() + 1;
    } else if (req.query.year && req.query.month) {
      year = parseInt(req.query.year as string);
      month = parseInt(req.query.month as string);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    }
    
    console.log(`📊 Generating ANC Report for: ${startDate} to ${endDate}`);
    
    // Get all active bookings during period
    const bookings = await prisma.antenatalBooking.findMany({
      where: {
        bookingDate: { gte: startDate, lte: endDate },
        isActive: true
      },
      include: {
        ANCVisit: {
          orderBy: { visitNumber: 'asc' }
        }
      }
    });
    
    // Get all visits during period
    const visits = await prisma.aNCVisit.findMany({
      where: {
        visitDate: { gte: startDate, lte: endDate }
      },
      include: {
        booking: true
      }
    });
    
    // Calculate GHS Form A metrics
    // ==============================
    
    // 1. New Registrants (Booking during period)
    const newRegistrants = bookings.length;
    
    // 2. Total Attendances
    const totalAttendances = visits.length;
    
    // 3. IPTp Coverage (by dose number)
    const iptpByDose = {
      1: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 1).length,
      2: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 2).length,
      3: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 3).length,
      4: visits.filter(v => v.iptpGiven && v.iptpDoseNumber === 4).length,
      5: visits.filter(v => v.iptpGiven && v.iptpDoseNumber >= 5).length,
    };
    
    // 4. TT Vaccine Coverage (by dose number)
    const ttByDose = {
      1: visits.filter(v => v.ttGiven && v.ttDoseNumber === 1).length,
      2: visits.filter(v => v.ttGiven && v.ttDoseNumber === 2).length,
      3: visits.filter(v => v.ttGiven && v.ttDoseNumber === 3).length,
      4: visits.filter(v => v.ttGiven && v.ttDoseNumber === 4).length,
      5: visits.filter(v => v.ttGiven && v.ttDoseNumber === 5).length,
    };
    const tt2Plus = visits.filter(v => v.ttGiven && v.ttDoseNumber >= 2).length;
    
    // 5. ITN Distribution
    const itnGiven = visits.filter(v => v.itnGiven).length;
    
    // 6. High Risk Pregnancies
    const highRisk = bookings.filter(b => b.riskLevel === 'high').length;
    
    // 7. Mothers below 150cm/5ft (would need height tracking)
    const mothersBelow150cm = 0; // Placeholder - add height field
    
    // 8. Pregnant women seen at 36 weeks
    const seenAt36Weeks = visits.filter(v => v.gestationalAgeWeeks && v.gestationalAgeWeeks >= 36 && v.gestationalAgeWeeks <= 38).length;
    
    // 9. Malaria in Pregnancy
    const malariaTested = visits.filter(v => v.malariaTestDone).length;
    const malariaPositive = visits.filter(v => v.malariaTestResult === 'Positive').length;
    const malariaTreated = visits.filter(v => v.malariaTreatmentGiven).length;
    
    // 10. Danger Signs
    const dangerSignsDetected = visits.filter(v => v.dangerSignsPresent).length;
    const referralsMade = visits.filter(v => v.referralMade).length;
    
    // 11. Visit Distribution
    const firstVisits = visits.filter(v => v.visitNumber === 1).length;
    const fourthVisits = visits.filter(v => v.visitNumber === 4).length;
    
    // 12. Anaemia
    const anaemiaAtBooking = bookings.filter(b => b.hbBooking && b.hbBooking < 11).length;
    const ironFolateGiven = visits.filter(v => v.ironGiven || v.folateGiven).length;
    
    // 13. Supplements
    const ironGiven = visits.filter(v => v.ironGiven).length;
    const folateGiven = visits.filter(v => v.folateGiven).length;
    const calciumGiven = visits.filter(v => v.calciumGiven).length;
    
    // 14. Services Summary (from ServiceRendered)
    const services = await prisma.serviceRendered.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        attendance: {
          attendanceType: 'antenatal'
        }
      },
      include: {
        serviceCatalog: true
      }
    });
    
    const serviceSummary = services.reduce((acc: any, s) => {
      const name = s.serviceCatalog?.name || 'Other';
      acc[name] = (acc[name] || 0) + s.quantity;
      return acc;
    }, {});
    
    // Build complete report object
    const report = {
      facility: {
        name: await getFacilityName(),
        district: await getDistrict(),
        region: await getRegion(),
      },
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        year,
        month,
        monthName: new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })
      },
      summary: {
        newRegistrants,
        totalAttendances,
        totalBookings: bookings.length,
        totalVisits: visits.length
      },
      preventiveCare: {
        iptp: {
          dose1: iptpByDose[1],
          dose2: iptpByDose[2],
          dose3: iptpByDose[3],
          dose4: iptpByDose[4],
          dose5: iptpByDose[5],
          total: Object.values(iptpByDose).reduce((a, b) => a + b, 0)
        },
        tt: {
          dose1: ttByDose[1],
          dose2: ttByDose[2],
          dose3: ttByDose[3],
          dose4: ttByDose[4],
          dose5: ttByDose[5],
          tt2Plus,
          total: Object.values(ttByDose).reduce((a, b) => a + b, 0)
        },
        itnGiven,
        mothersBelow150cm,
        seenAt36Weeks
      },
      supplements: {
        ironGiven,
        folateGiven,
        calciumGiven,
        ironFolateGiven
      },
      malariaInPregnancy: {
        tested: malariaTested,
        positive: malariaPositive,
        treated: malariaTreated,
        treatmentRate: malariaPositive > 0 ? ((malariaTreated / malariaPositive) * 100).toFixed(1) : '0'
      },
      complications: {
        highRisk,
        dangerSignsDetected,
        referralsMade,
        anaemiaAtBooking
      },
      visitDistribution: {
        firstVisits,
        fourthVisits,
        otherVisits: totalAttendances - firstVisits - fourthVisits
      },
      servicesProvided: serviceSummary,
      generatedAt: new Date().toISOString()
    };
    
    // Save to database
    const saved = await prisma.gHSReportSubmission.create({
      data: {
        reportType: 'anc_return',
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
      submissionId: saved.id
    });
    
  } catch (error) {
    console.error('❌ Error generating ANC report:', error);
    res.status(500).json({ 
      success: false, 
      message: (error as Error).message 
    });
  }
};

// Helper functions
async function getFacilityName(): Promise<string> {
  const hospital = await prisma.hospital.findFirst();
  return hospital?.name || 'Health Facility';
}

async function getDistrict(): Promise<string> {
  const hospital = await prisma.hospital.findFirst();
  return hospital?.ghsDistrictCode || 'District';
}

async function getRegion(): Promise<string> {
  // You can add region field to Hospital model
  return 'Region';
}

// ==============================================
// DELIVERY REGISTER REPORT (Based on form a.pdf)
// ==============================================
export const generateDeliveryReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, year, month } = parseDateParams(req);
    
    console.log(`📊 Generating Delivery report for period: ${startDate} to ${endDate}`);
    
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
    
    const saved = await prisma.gHSReportSubmission.create({
      data: {
        reportType: 'delivery_register',
        reportingYear: year,
        reportingMonth: month,
        periodStart: startDate,
        periodEnd: endDate,
        data: report,
        createdById: req.user!.id
      }
    });
    
    res.json({ success: true, data: report, submissionId: saved.id });
  } catch (error) {
    console.error('Error generating delivery report:', error);
    res.status(500).json({ success: false, message: (error as Error).message });
  }
};

// ==============================================
// REPORT SUBMISSIONS (Keep as is)
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