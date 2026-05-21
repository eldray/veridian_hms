// modules/dashboard/DashboardTypes.ts
import { Request } from 'express';

export interface IDashboardStats {
  totalPatients: number;
  todayVisits: number;
  activeAdmissions: number;
  pendingBills: number;
  pendingClaims: number;
  lowStockItems: number;
  totalRevenue: number;
  scheduledAppointments: number;
  completedProcedures: number;
}

export interface IWeeklyStats {
  period: {
    start: Date;
    end: Date;
  };
  revenue: number;
  visits: number;
  admissions: number;
}

export interface IMonthlyStats {
  period: {
    start: Date;
    end: Date;
  };
  revenue: number;
  visits: number;
  admissions: number;
}

export interface IDashboardRequest extends Request {
  params: {};
  body: {};
}