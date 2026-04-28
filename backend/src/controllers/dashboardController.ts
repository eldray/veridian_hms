// controllers/dashboardController.ts - FIXED VERSION
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching dashboard statistics...');
    
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    // Get all stats in parallel using Prisma with proper error handling
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
      
      // Today's Visits - FIXED: Use proper date filtering
      prisma.attendance.count({
        where: {
          dateTime: {
            gte: startOfToday,
            lte: endOfToday
          }
        }
      }).catch(() => 0),
      
      // Active Admissions - FIXED: Check if status field exists
      prisma.admission.count({
        where: {
          OR: [
            { status: 'admitted' },
            { dischargeDate: null }
          ]
        }
      }).catch(() => 0),
      
      // Pending Bills - FIXED: Use correct status values
      prisma.bill.count({
        where: {
          status: {
            in: ['pending', 'partial']
          }
        }
      }).catch(() => 0),
      
      // Pending Claims - FIXED: Use correct status values
      prisma.insuranceClaim.count({
        where: {
          status: {
            in: ['draft', 'submitted'] // Updated to match your ClaimStatus enum
          }
        }
      }).catch(() => 0),
      
      // Stock Items for low stock calculation - FIXED: Add error handling
      prisma.stockItem.findMany({
        where: {
          isActive: true
        },
        select: {
          currentStock: true,
          reorderLevel: true
        }
      }).catch(() => []),
      
      // Scheduled Appointments for today - FIXED: Use correct status values
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
      
      // Today's Revenue - FIXED: Use correct date field
      prisma.bill.aggregate({
        where: {
          billDate: { gte: startOfToday, lte: endOfToday }, 
          status: 'paid'
        },
        _sum: {
          paidAmount: true
        }
      }).catch(() => ({ _sum: { paidAmount: 0 } })),
      
      // Completed Procedures - FIXED: Count completed procedures
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
      ? stockItems.filter(item => item.currentStock <= item.reorderLevel).length
      : 0;

    const stats = {
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

    console.log('✅ Dashboard stats calculated:', stats);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to load dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error'
    });
  }
};