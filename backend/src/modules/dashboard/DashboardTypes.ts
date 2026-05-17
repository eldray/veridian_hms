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

export interface IDashboardRequest extends Request {
  params: {};
  body: {};
}
