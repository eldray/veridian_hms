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
  topDiagnoses: Array<{ // ✅ FIXED: was diagnosisTrends
    disease: string;
    icdCode: string;
    patients: number;
  }>;
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