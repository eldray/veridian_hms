import { BaseService } from '../../shared/base/BaseService';
import { PrismaClient } from '@prisma/client';
import { IDashboardStats } from './DashboardTypes';

const prisma = new PrismaClient();

export class DashboardService extends BaseService<any> {
  constructor() {
    super();
  }

  async getDashboardStats(): Promise<IDashboardStats> {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

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

      // Active Admissions
      prisma.admission.count({
        where: {
          OR: [
            { status: 'admitted' },
            { dischargeDate: null }
          ]
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
            in: ['draft', 'submitted']
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

      // Completed Procedures
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
      ? stockItems.filter((item: any) => item.currentStock <= item.reorderLevel).length
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
}
