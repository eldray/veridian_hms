export interface ClinicalReportFilters {
  startDate: Date;
  endDate: Date;
}

export interface ClinicalReportPeriod {
  startDate: Date;
  endDate: Date;
}

// ── Lab Report ──────────────────────────────────────────────────────────────
export interface LabReportSummary {
  totalTests: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  averageTurnaroundTime: number;
}

export interface LabReportData {
  period: ClinicalReportPeriod;
  summary: LabReportSummary;
  topTests: Array<{ testName: string; count: number; positiveRate: number }>;
  positivityRates: Array<{ testName: string; rate: string }>;
}

// ── Scan Report ─────────────────────────────────────────────────────────────
export interface ScanReportSummary {
  totalScans: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byBodyPart: Record<string, number>;
  averageTurnaroundTime: number;
}

export interface ScanReportData {
  period: ClinicalReportPeriod;
  summary: ScanReportSummary;
  topScans: Array<{ scanName: string; count: number }>;
}

// ── Procedure Report ────────────────────────────────────────────────────────
export interface ProcedureReportSummary {
  totalProcedures: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

export interface ProcedureReportData {
  period: ClinicalReportPeriod;
  summary: ProcedureReportSummary;
  topProcedures: Array<{ procedureName: string; count: number }>;
}

// ── Medication Report ───────────────────────────────────────────────────────
export interface MedicationReportSummary {
  totalMedications: number;
  byStatus: Record<string, number>;
  byDrug: Record<string, number>;
  totalQuantity: number;
}

export interface MedicationReportData {
  period: ClinicalReportPeriod;
  summary: MedicationReportSummary;
  topMedications: Array<{ drugName: string; count: number }>;
}

// ── Vitals Report ───────────────────────────────────────────────────────────
export interface VitalsReportSummary {
  totalVitals: number;
  uniquePatients: number;
  averages: {
    temperature: string;
    pulse: number;
    respiratoryRate: number;
    oxygenSaturation: number;
  };
  abnormalFindings: {
    hypertension: number;
    fever: number;
    tachycardia: number;
    bradycardia: number;
    hypoxia: number;
  };
}

export interface VitalsReportData {
  period: ClinicalReportPeriod;
  summary: VitalsReportSummary;
  monthlyTrends: Array<{ month: string; avgTemp: number; avgPulse: number }>;
}