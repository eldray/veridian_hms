// modules/report/ReportController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

export class ReportController {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ✅ FINANCIAL REPORT - FIXED
  getFinancialReport = async (req: Request, res: Response) => {
    try {
      const { period, dateFrom, dateTo } = req.query;
      
      let startDate: Date;
      let endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      if (dateFrom && dateTo) {
        startDate = new Date(dateFrom as string);
        endDate = new Date(dateTo as string);
      } else if (period === 'today') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }
      
      // ✅ FIXED: Use 'Payment' (capital P) - this matches your schema
      const payments = await this.prisma.payment.findMany({
        where: {
          transactionDate: {
            gte: startDate,
            lte: endDate
          },
          isVoided: false
        },
        include: {
          Bill: {
            include: {
              Patient: true
            }
          },
          User: {
            select: { fullName: true }
          }
        }
      });
      
      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      const paidBills = new Set(payments.map(p => p.billId)).size;
      
      const pendingBills = await this.prisma.bill.count({
        where: {
          status: { in: ['pending', 'partial'] },
          billDate: { lte: endDate }
        }
      });
      
      res.json({
        success: true,
        data: {
          totalRevenue,
          paidBills,
          pendingBills,
          payments: payments.slice(0, 20),
          period: { startDate, endDate }
        }
      });
    } catch (error) {
      console.error('Financial report error:', error);
      res.status(500).json({ success: false, message: 'Error generating financial report' });
    }
  };

  // ✅ CLINICAL REPORT - FIXED
  getClinicalReport = async (req: Request, res: Response) => {
    try {
      const { period, dateFrom, dateTo } = req.query;
      
      let startDate: Date;
      let endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      if (dateFrom && dateTo) {
        startDate = new Date(dateFrom as string);
        endDate = new Date(dateTo as string);
      } else if (period === '30days') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      } else if (period === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }
      
      // ✅ FIXED: Use 'Attendance' (capital A) - matches your schema
      const attendances = await this.prisma.attendance.findMany({
        where: {
          dateTime: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          AttendanceDiagnosis: {
            include: {
              Diagnosis: true
            }
          },
          Patient: true,
          Bill: true
        }
      });
      
      // Count by status
      const statusCounts = {
        pending: attendances.filter(a => a.status === 'pending').length,
        completed: attendances.filter(a => a.status === 'completed').length,
        cancelled: attendances.filter(a => a.status === 'cancelled').length,
        admitted: attendances.filter(a => a.status === 'admitted').length,
        discharged: attendances.filter(a => a.status === 'discharged').length
      };
      
      // Count by payment mode
      const paymentModeCounts = {
        cash: attendances.filter(a => a.paymentMode === 'cash').length,
        nhis: attendances.filter(a => a.paymentMode === 'nhis').length,
        private_insurance: attendances.filter(a => a.paymentMode === 'private_insurance').length,
        corporate: attendances.filter(a => a.paymentMode === 'corporate').length
      };
      
      // Get diagnosis trends
      const diagnosisMap = new Map<string, number>();
      
      attendances.forEach(att => {
        if (att.AttendanceDiagnosis) {
          att.AttendanceDiagnosis.forEach(diag => {
            const name = diag.Diagnosis?.name || diag.icdCode || 'Unknown';
            diagnosisMap.set(name, (diagnosisMap.get(name) || 0) + 1);
          });
        }
      });
      
      const diagnosisTrends = Array.from(diagnosisMap.entries())
        .map(([disease, patients]) => ({ disease, patients }))
        .sort((a, b) => b.patients - a.patients)
        .slice(0, 10);
      
      // Calculate average bill amount
      const totalBillAmount = attendances.reduce((sum, att) => sum + (att.totalBill || 0), 0);
      const averageBillAmount = attendances.length > 0 ? totalBillAmount / attendances.length : 0;
      
      res.json({
        success: true,
        data: {
          totalAttendances: attendances.length,
          statusCounts,
          paymentModeCounts,
          diagnosisTrends,
          averageBillAmount,
          totalRevenue: totalBillAmount,
          period: { startDate, endDate }
        }
      });
    } catch (error) {
      console.error('Clinical report error:', error);
      res.status(500).json({ success: false, message: 'Error generating clinical report' });
    }
  };

  // ✅ REVENUE REPORT - FIXED
  getRevenueReport = async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      let startDate: Date;
      let endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      if (dateFrom && dateTo) {
        startDate = new Date(dateFrom as string);
        endDate = new Date(dateTo as string);
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }
      
      // Get daily revenue from payments
      const payments = await this.prisma.payment.findMany({
        where: {
          transactionDate: { gte: startDate, lte: endDate },
          isVoided: false
        },
        orderBy: { transactionDate: 'asc' }
      });
      
      // Group by date
      const dailyMap = new Map<string, number>();
      payments.forEach(p => {
        const dateStr = p.transactionDate.toISOString().split('T')[0];
        dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + p.amount);
      });
      
      const dailyRevenue = Array.from(dailyMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      
      // Get revenue by payment method
      const byPaymentMethod = {
        cash: payments.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amount, 0),
        mobile_money: payments.filter(p => p.paymentMethod === 'mobile_money').reduce((sum, p) => sum + p.amount, 0),
        card: payments.filter(p => p.paymentMethod === 'card').reduce((sum, p) => sum + p.amount, 0),
        bank_transfer: payments.filter(p => p.paymentMethod === 'bank_transfer').reduce((sum, p) => sum + p.amount, 0),
        cheque: payments.filter(p => p.paymentMethod === 'cheque').reduce((sum, p) => sum + p.amount, 0)
      };
      
      res.json({
        success: true,
        data: { 
          totalRevenue, 
          dailyRevenue, 
          byPaymentMethod,
          period: { startDate, endDate } 
        }
      });
    } catch (error) {
      console.error('Revenue report error:', error);
      res.status(500).json({ success: false, message: 'Error generating revenue report' });
    }
  };

  // ✅ INSURANCE CLAIMS REPORT - FIXED
  getInsuranceClaimsReport = async (req: Request, res: Response) => {
    try {
      const { status, dateFrom, dateTo } = req.query;
      
      const where: any = {};
      if (status) where.status = status;
      if (dateFrom && dateTo) {
        where.submissionDate = {
          gte: new Date(dateFrom as string),
          lte: new Date(dateTo as string)
        };
      }
      
      const claims = await this.prisma.insuranceClaim.findMany({
        where,
        include: {
          InsuranceProvider: true,
          Patient: true,
          Bill: true
        },
        orderBy: { submissionDate: 'desc' }
      });
      
      const totalAmount = claims.reduce((sum, c) => sum + c.totalClaimAmount, 0);
      const approvedAmount = claims
        .filter(c => c.status === 'approved')
        .reduce((sum, c) => sum + (c.approvedAmount || 0), 0);
      const paidAmount = claims
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + (c.paidAmount || 0), 0);
      
      // Count by status
      const byStatus: Record<string, number> = {};
      claims.forEach(c => {
        byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      });
      
      res.json({
        success: true,
        data: {
          claims: claims.slice(0, 100),
          totalClaims: claims.length,
          totalAmount,
          approvedAmount,
          paidAmount,
          byStatus
        }
      });
    } catch (error) {
      console.error('Claims report error:', error);
      res.status(500).json({ success: false, message: 'Error generating claims report' });
    }
  };

  // ✅ ATTENDANCE REPORT - FIXED
  getAttendanceReport = async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      let startDate: Date;
      let endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      if (dateFrom && dateTo) {
        startDate = new Date(dateFrom as string);
        endDate = new Date(dateTo as string);
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }
      
      const attendances = await this.prisma.attendance.findMany({
        where: {
          dateTime: { gte: startDate, lte: endDate }
        },
        include: {
          Patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true,
              gender: true
            }
          },
          InsuranceProvider: {
            select: { name: true }
          },
          Bill: true
        },
        orderBy: { dateTime: 'desc' }
      });
      
      res.json({
        success: true,
        data: {
          attendances: attendances.slice(0, 100),
          total: attendances.length,
          period: { startDate, endDate }
        }
      });
    } catch (error) {
      console.error('Attendance report error:', error);
      res.status(500).json({ success: false, message: 'Error generating attendance report' });
    }
  };

  // ✅ DEMOGRAPHIC REPORT - FIXED
  getDemographicReport = async (req: Request, res: Response) => {
    try {
      const patients = await this.prisma.patient.findMany();
      
      const genderCounts = {
        male: patients.filter(p => p.gender === 'male').length,
        female: patients.filter(p => p.gender === 'female').length,
        other: patients.filter(p => p.gender === 'other').length
      };
      
      const paymentModeCounts = {
        cash: patients.filter(p => p.paymentMode === 'cash').length,
        nhis: patients.filter(p => p.paymentMode === 'nhis').length,
        private_insurance: patients.filter(p => p.paymentMode === 'private_insurance').length,
        corporate: patients.filter(p => p.paymentMode === 'corporate').length
      };
      
      // Age distribution
      const ageGroups = {
        '0-12': 0,
        '13-18': 0,
        '19-35': 0,
        '36-50': 0,
        '51-65': 0,
        '65+': 0
      };
      
      const today = new Date();
      patients.forEach(p => {
        const age = today.getFullYear() - p.dateOfBirth.getFullYear();
        if (age <= 12) ageGroups['0-12']++;
        else if (age <= 18) ageGroups['13-18']++;
        else if (age <= 35) ageGroups['19-35']++;
        else if (age <= 50) ageGroups['36-50']++;
        else if (age <= 65) ageGroups['51-65']++;
        else ageGroups['65+']++;
      });
      
      res.json({
        success: true,
        data: {
          totalPatients: patients.length,
          genderCounts,
          paymentModeCounts,
          ageGroups
        }
      });
    } catch (error) {
      console.error('Demographic report error:', error);
      res.status(500).json({ success: false, message: 'Error generating demographic report' });
    }
  };

// modules/report/ReportController.ts

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

private convertFinancialToCSV(data: any): string {
  const headers = ['Period', 'Revenue', 'Expenses', 'Net Income', 'Bills Count'];
  const rows = (data.monthlyRevenueTrend || []).map((item: any) => [
    item.period,
    item.totalRevenue || 0,
    item.totalExpenses || 0,
    (item.totalRevenue || 0) - (item.totalExpenses || 0),
    item.billCount || 0
  ]);
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

private convertClinicalToCSV(data: any): string {
  const headers = ['Diagnosis', 'Total Cases', 'Male', 'Female', 'Under 5'];
  const rows = (data.topDiagnoses || []).map((item: any) => [
    `"${item.diagnosisName || item.name}"`,
    item.totalCases || 0,
    item.male || 0,
    item.female || 0,
    item.under5 || 0
  ]);
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

private convertRevenueToCSV(data: any): string {
  const headers = ['Date', 'Amount', 'Payment Method', 'Bill Number'];
  const rows = (data.dailyRevenue || []).map((item: any) => [
    item.date,
    item.amount || 0,
    item.paymentMethod || 'N/A',
    item.billNumber || 'N/A'
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
    item.status || 'N/A'
  ]);
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

private convertGenericToCSV(data: any): string {
  if (Array.isArray(data) && data.length > 0) {
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(h => `"${JSON.stringify(item[h] || '').replace(/"/g, '""')}"`));
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
  return JSON.stringify(data, null, 2);
}
}