// modules/dashboard/DashboardService.ts
import { PrismaClient } from '@prisma/client';
import { IDashboardStats } from './DashboardTypes';

const prisma = new PrismaClient();

export class DashboardService {
  
  async getDashboardStats(): Promise<IDashboardStats> {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const [
      totalPatients,
      todayVisits,
      activeAdmissions,
      pendingBills,
      pendingClaims,
      stockItems,
      scheduledAppointments,
      revenueData,
      completedProcedures
    ] = await Promise.all([
      // Total Patients
      prisma.patient.count().catch(() => 0),

      // Today's Visits
      prisma.attendance.count({
        where: {
          dateTime: {
            gte: startOfToday,
            lte: endOfToday
          }
        }
      }).catch(() => 0),

      // Active Admissions - patients currently admitted (not discharged)
      prisma.admission.count({
        where: {
          status: 'admitted'
        }
      }).catch(() => 0),

      // Pending Bills
      prisma.bill.count({
        where: {
          status: {
            in: ['pending', 'partial']
          }
        }
      }).catch(() => 0),

      // Pending Claims
      prisma.insuranceClaim.count({
        where: {
          status: {
            in: ['draft', 'submitted', 'pending']
          }
        }
      }).catch(() => 0),

      // Stock Items for low stock calculation
      prisma.stockItem.findMany({
        where: {
          isActive: true
        },
        select: {
          currentStock: true,
          reorderLevel: true
        }
      }).catch(() => []),

      // Scheduled Appointments for today
      prisma.appointment.count({
        where: {
          appointmentDate: {
            gte: startOfToday,
            lte: endOfToday
          },
          status: {
            in: ['scheduled', 'confirmed']
          }
        }
      }).catch(() => 0),

      // Today's Revenue
      prisma.bill.aggregate({
        where: {
          billDate: { gte: startOfToday, lte: endOfToday },
          status: 'paid'
        },
        _sum: {
          paidAmount: true
        }
      }).catch(() => ({ _sum: { paidAmount: 0 } })),

      // Completed Procedures today
      prisma.procedure.count({
        where: {
          status: 'completed',
          performedAt: {
            gte: startOfToday,
            lte: endOfToday
          }
        }
      }).catch(() => 0)
    ]);

    // Calculate low stock items with null check
    const lowStockItems = Array.isArray(stockItems)
      ? stockItems.filter((item: any) => (item.currentStock || 0) <= (item.reorderLevel || 0)).length
      : 0;

    return {
      totalPatients: totalPatients || 0,
      todayVisits: todayVisits || 0,
      activeAdmissions: activeAdmissions || 0,
      pendingBills: pendingBills || 0,
      pendingClaims: pendingClaims || 0,
      lowStockItems,
      totalRevenue: revenueData?._sum?.paidAmount || 0,
      scheduledAppointments: scheduledAppointments || 0,
      completedProcedures: completedProcedures || 0
    };
  }

  // Optional: Add method for weekly/monthly stats
  async getWeeklyStats(): Promise<any> {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const [revenue, visits, admissions] = await Promise.all([
      prisma.bill.aggregate({
        where: {
          billDate: { gte: startOfWeek, lte: endOfWeek },
          status: 'paid'
        },
        _sum: { paidAmount: true }
      }).catch(() => ({ _sum: { paidAmount: 0 } })),
      prisma.attendance.count({
        where: {
          dateTime: { gte: startOfWeek, lte: endOfWeek }
        }
      }).catch(() => 0),
      prisma.admission.count({
        where: {
          admissionDate: { gte: startOfWeek, lte: endOfWeek }
        }
      }).catch(() => 0)
    ]);

    return {
      period: { start: startOfWeek, end: endOfWeek },
      revenue: revenue._sum.paidAmount || 0,
      visits,
      admissions
    };
  }

  // Optional: Add method for monthly stats
  async getMonthlyStats(): Promise<any> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const [revenue, visits, admissions] = await Promise.all([
      prisma.bill.aggregate({
        where: {
          billDate: { gte: startOfMonth, lte: endOfMonth },
          status: 'paid'
        },
        _sum: { paidAmount: true }
      }).catch(() => ({ _sum: { paidAmount: 0 } })),
      prisma.attendance.count({
        where: {
          dateTime: { gte: startOfMonth, lte: endOfMonth }
        }
      }).catch(() => 0),
      prisma.admission.count({
        where: {
          admissionDate: { gte: startOfMonth, lte: endOfMonth }
        }
      }).catch(() => 0)
    ]);

    return {
      period: { start: startOfMonth, end: endOfMonth },
      revenue: revenue._sum.paidAmount || 0,
      visits,
      admissions
    };
  }
}