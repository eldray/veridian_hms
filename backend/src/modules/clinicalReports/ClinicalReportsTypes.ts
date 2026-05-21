/**
 * Clinical Reports Module Types
 */

export interface ClinicalReportFilters {
  startDate: Date;
  endDate: Date;
}

export interface LabReportData {
  totalTests: number;
  completedTests: number;
  pendingTests: number;
  cancelledTests: number;
  testsByCategory: Record<string, number>;
  testsByPriority: Record<string, number>;
  turnaroundTime: {
    average: number;
    median: number;
  };
}

export interface ScanReportData {
  totalScans: number;
  completedScans: number;
  pendingScans: number;
  cancelledScans: number;
  scansByType: Record<string, number>;
  scansByBodyPart: Record<string, number>;
}

export interface ProcedureReportData {
  totalProcedures: number;
  completedProcedures: number;
  pendingProcedures: number;
  cancelledProcedures: number;
  proceduresByCategory: Record<string, number>;
  proceduresByDepartment: Record<string, number>;
}

export interface MedicationReportData {
  totalPrescriptions: number;
  dispensedPrescriptions: number;
  pendingPrescriptions: number;
  medicationsByCategory: Record<string, number>;
  topMedications: Array<{ name: string; count: number }>;
}

export interface VitalsReportData {
  totalVitalsRecorded: number;
  vitalsByType: Record<string, number>;
  abnormalVitals: number;
  vitalsByDepartment: Record<string, number>;
}