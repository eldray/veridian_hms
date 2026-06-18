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
  topDiagnoses: Array<{
    disease: string;
    icdCode: string;
    patients: number;
  }>;
}