// controllers/reportController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import AttendanceModel from '../models/Attendance';
import BillModel from '../models/Bill';
import InsuranceClaimModel from '../models/InsuranceClaim';
import PatientModel from '../models/Patient';
import { body, validationResult } from 'express-validator';

// Comprehensive Financial Report
export const getFinancialReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, reportType = 'summary' } = req.query;

    const matchStage: any = {};
    if (startDate || endDate) {
      matchStage.dateTime = {};
      if (startDate) matchStage.dateTime.$gte = new Date(startDate as string);
      if (endDate) matchStage.dateTime.$lte = new Date(endDate as string);
    }

    const financialData = await AttendanceModel.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'bills',
          localField: 'billId',
          foreignField: '_id',
          as: 'bill'
        }
      },
      { $unwind: { path: '$bill', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            paymentMode: '$paymentMode',
            attendanceType: '$attendanceType',
            month: { $month: '$dateTime' },
            year: { $year: '$dateTime' }
          },
          totalAttendances: { $sum: 1 },
          totalRevenue: { $sum: { $ifNull: ['$bill.totalAmount', 0] } },
          totalPaid: { $sum: { $ifNull: ['$bill.paidAmount', 0] } },
          outstandingBalance: { 
            $sum: { 
              $subtract: [
                { $ifNull: ['$bill.totalAmount', 0] },
                { $ifNull: ['$bill.paidAmount', 0] }
              ]
            }
          },
          averageBillAmount: { $avg: { $ifNull: ['$bill.totalAmount', 0] } }
        }
      },
      {
        $project: {
          paymentMode: '$_id.paymentMode',
          attendanceType: '$_id.attendanceType',
          month: '$_id.month',
          year: '$_id.year',
          totalAttendances: 1,
          totalRevenue: 1,
          totalPaid: 1,
          outstandingBalance: 1,
          averageBillAmount: { $round: ['$averageBillAmount', 2] }
        }
      },
      { $sort: { year: -1, month: -1 } }
    ]);

    // Summary statistics
    const summary = financialData.reduce((acc, curr) => {
      acc.totalRevenue += curr.totalRevenue;
      acc.totalPaid += curr.totalPaid;
      acc.outstandingBalance += curr.outstandingBalance;
      acc.totalAttendances += curr.totalAttendances;
      return acc;
    }, { totalRevenue: 0, totalPaid: 0, outstandingBalance: 0, totalAttendances: 0 });

    res.json({
      reportPeriod: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now'
      },
      summary,
      breakdown: financialData,
      reportGenerated: new Date()
    });
  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ message: 'Error generating financial report', error });
  }
};

// Insurance Claims Report
export const getInsuranceClaimsReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, insuranceProviderId, status } = req.query;

    const matchStage: any = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate as string);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate as string);
    }
    if (insuranceProviderId) matchStage.insuranceProviderId = new mongoose.Types.ObjectId(insuranceProviderId as string);
    if (status) matchStage.status = status;

    const claimsReport = await InsuranceClaimModel.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'insuranceproviders',
          localField: 'insuranceProviderId',
          foreignField: '_id',
          as: 'insuranceProvider'
        }
      },
      { $unwind: '$insuranceProvider' },
      {
        $lookup: {
          from: 'patients',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patient'
        }
      },
      { $unwind: '$patient' },
      {
        $group: {
          _id: {
            provider: '$insuranceProvider.name',
            status: '$status',
            month: { $month: '$createdAt' },
            year: { $year: '$createdAt' }
          },
          totalClaims: { $sum: 1 },
          totalClaimAmount: { $sum: '$totalClaimAmount' },
          totalApprovedAmount: { $sum: { $ifNull: ['$approvedAmount', 0] } },
          totalPaidAmount: { $sum: { $ifNull: ['$paidAmount', 0] } },
          averageProcessingDays: {
            $avg: {
              $cond: {
                if: { $and: ['$submissionDate', '$approvalDate'] },
                then: {
                  $divide: [
                    { $subtract: ['$approvalDate', '$submissionDate'] },
                    1000 * 60 * 60 * 24 // Convert to days
                  ]
                },
                else: null
              }
            }
          }
        }
      },
      {
        $project: {
          insuranceProvider: '$_id.provider',
          status: '$_id.status',
          month: '$_id.month',
          year: '$_id.year',
          totalClaims: 1,
          totalClaimAmount: 1,
          totalApprovedAmount: 1,
          totalPaidAmount: 1,
          averageProcessingDays: { $round: [{ $ifNull: ['$averageProcessingDays', 0] }, 2] },
          approvalRate: {
            $cond: {
              if: { $gt: ['$totalClaimAmount', 0] },
              then: { $round: [{ $multiply: [{ $divide: ['$totalApprovedAmount', '$totalClaimAmount'] }, 100] }, 2] },
              else: 0
            }
          }
        }
      },
      { $sort: { year: -1, month: -1 } }
    ]);

    res.json({
      reportType: 'Insurance Claims Analysis',
      period: { startDate, endDate },
      claimsReport,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating insurance claims report:', error);
    res.status(500).json({ message: 'Error generating insurance claims report', error });
  }
};

// Clinical Statistics Report
export const getClinicalReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, diagnosisCode, attendingClinician } = req.query;

    const matchStage: any = {};
    if (startDate || endDate) {
      matchStage.dateTime = {};
      if (startDate) matchStage.dateTime.$gte = new Date(startDate as string);
      if (endDate) matchStage.dateTime.$lte = new Date(endDate as string);
    }
    if (attendingClinician) matchStage.attendingClinician = new mongoose.Types.ObjectId(attendingClinician as string);

    const clinicalReport = await AttendanceModel.aggregate([
      { $match: matchStage },
      { $unwind: { path: '$diagnoses', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'diagnoses',
          localField: 'diagnoses.diagnosisId',
          foreignField: '_id',
          as: 'diagnosisInfo'
        }
      },
      { $unwind: { path: '$diagnosisInfo', preserveNullAndEmptyArrays: true } },
      {
        $match: diagnosisCode ? { 'diagnosisInfo.icdCode': diagnosisCode } : {}
      },
      {
        $group: {
          _id: {
            diagnosis: '$diagnosisInfo.name',
            icdCode: '$diagnosisInfo.icdCode',
            clinician: '$attendingClinician',
            month: { $month: '$dateTime' }
          },
          totalCases: { $sum: 1 },
          averageAge: { $avg: { $divide: [{ $subtract: [new Date(), '$patientId.dateOfBirth'] }, 365 * 24 * 60 * 60 * 1000] } },
          genderDistribution: {
            $push: '$patientId.gender'
          },
          commonComorbidities: {
            $addToSet: '$diagnosisInfo.name'
          }
        }
      },
      {
        $project: {
          diagnosis: '$_id.diagnosis',
          icdCode: '$_id.icdCode',
          clinician: '$_id.clinician',
          month: '$_id.month',
          totalCases: 1,
          averageAge: { $round: ['$averageAge', 1] },
          genderDistribution: {
            male: { $size: { $filter: { input: '$genderDistribution', as: 'gender', cond: { $eq: ['$$gender', 'male'] } } } },
            female: { $size: { $filter: { input: '$genderDistribution', as: 'gender', cond: { $eq: ['$$gender', 'female'] } } } }
          },
          commonComorbidities: { $slice: ['$commonComorbidities', 5] }
        }
      },
      { $sort: { totalCases: -1 } }
    ]);

    res.json({
      reportType: 'Clinical Statistics',
      period: { startDate, endDate },
      clinicalReport,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating clinical report:', error);
    res.status(500).json({ message: 'Error generating clinical report', error });
  }
};

// Export Report to PDF/Excel
export const exportReport = [
  body('reportType').isIn(['financial', 'insurance', 'clinical', 'attendance']).withMessage('Valid report type is required'),
  body('format').isIn(['pdf', 'excel', 'json']).withMessage('Valid format is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { reportType, format, startDate, endDate, filters } = req.body;

      // Generate report data based on type
      let reportData;
      switch (reportType) {
        case 'financial':
          reportData = await generateFinancialData(startDate, endDate, filters);
          break;
        case 'insurance':
          reportData = await generateInsuranceData(startDate, endDate, filters);
          break;
        case 'clinical':
          reportData = await generateClinicalData(startDate, endDate, filters);
          break;
        case 'attendance':
          reportData = await generateAttendanceData(startDate, endDate, filters);
          break;
        default:
          return res.status(400).json({ message: 'Invalid report type' });
      }

      // In a real implementation, you would use libraries like:
      // - pdfkit for PDF generation
      // - exceljs for Excel generation
      // For now, we'll return JSON with export metadata

      res.json({
        message: `Report exported as ${format}`,
        reportType,
        format,
        period: { startDate, endDate },
        data: reportData,
        exportMetadata: {
          exportedBy: (req as any).user.fullName,
          exportedAt: new Date(),
          recordCount: reportData.length || 0
        }
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({ message: 'Error exporting report', error });
    }
  }
];

// Helper functions for export
async function generateFinancialData(startDate: any, endDate: any, filters: any) {
  // Implementation for financial data generation
  return { message: 'Financial data export - implement PDF/Excel generation' };
}

async function generateInsuranceData(startDate: any, endDate: any, filters: any) {
  // Implementation for insurance data generation
  return { message: 'Insurance data export - implement PDF/Excel generation' };
}

async function generateClinicalData(startDate: any, endDate: any, filters: any) {
  // Implementation for clinical data generation
  return { message: 'Clinical data export - implement PDF/Excel generation' };
}

async function generateAttendanceData(startDate: any, endDate: any, filters: any) {
  // Implementation for attendance data generation
  return { message: 'Attendance data export - implement PDF/Excel generation' };
}


export const getRevenueReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;

    const matchStage: any = {};
    if (startDate || endDate) {
      matchStage.dateTime = {};
      if (startDate) matchStage.dateTime.$gte = new Date(startDate as string);
      if (endDate) matchStage.dateTime.$lte = new Date(endDate as string);
    }

    const groupStage: any = {
      _id: {}
    };

    if (groupBy === 'day') {
      groupStage._id.day = { $dayOfMonth: '$dateTime' };
      groupStage._id.month = { $month: '$dateTime' };
      groupStage._id.year = { $year: '$dateTime' };
    } else if (groupBy === 'week') {
      groupStage._id.week = { $week: '$dateTime' };
      groupStage._id.year = { $year: '$dateTime' };
    } else {
      groupStage._id.month = { $month: '$dateTime' };
      groupStage._id.year = { $year: '$dateTime' };
    }

    const revenueData = await AttendanceModel.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'bills',
          localField: 'billId',
          foreignField: '_id',
          as: 'bill'
        }
      },
      { $unwind: { path: '$bill', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          ...groupStage,
          totalRevenue: { $sum: { $ifNull: ['$bill.totalAmount', 0] } },
          totalPaid: { $sum: { $ifNull: ['$bill.paidAmount', 0] } },
          visitCount: { $sum: 1 },
          averageRevenuePerVisit: { $avg: { $ifNull: ['$bill.totalAmount', 0] } }
        }
      },
      {
        $project: {
          period: '$_id',
          totalRevenue: 1,
          totalPaid: 1,
          visitCount: 1,
          averageRevenuePerVisit: { $round: ['$averageRevenuePerVisit', 2] }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);

    res.json({
      reportType: 'Revenue Analysis',
      period: { startDate, endDate },
      groupBy,
      revenueData,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating revenue report:', error);
    res.status(500).json({ message: 'Error generating revenue report', error });
  }
};

export const getAttendanceReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, department } = req.query;

    const matchStage: any = {};
    if (startDate || endDate) {
      matchStage.dateTime = {};
      if (startDate) matchStage.dateTime.$gte = new Date(startDate as string);
      if (endDate) matchStage.dateTime.$lte = new Date(endDate as string);
    }
    if (department) matchStage.department = department;

    const attendanceReport = await AttendanceModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            attendanceType: '$attendanceType',
            status: '$status',
            month: { $month: '$dateTime' },
            year: { $year: '$dateTime' }
          },
          count: { $sum: 1 },
          averageDuration: {
            $avg: {
              $cond: {
                if: { $and: ['$dateTime', '$updatedAt'] },
                then: {
                  $divide: [
                    { $subtract: ['$updatedAt', '$dateTime'] },
                    1000 * 60 * 60 // Convert to hours
                  ]
                },
                else: null
              }
            }
          }
        }
      },
      {
        $project: {
          attendanceType: '$_id.attendanceType',
          status: '$_id.status',
          month: '$_id.month',
          year: '$_id.year',
          count: 1,
          averageDuration: { $round: [{ $ifNull: ['$averageDuration', 0] }, 2] }
        }
      },
      { $sort: { year: -1, month: -1, count: -1 } }
    ]);

    res.json({
      reportType: 'Attendance Statistics',
      period: { startDate, endDate },
      attendanceReport,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({ message: 'Error generating attendance report', error });
  }
};
