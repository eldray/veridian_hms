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
  hiv: { testsOrdered: number; completed: number; resultsEntered: number; positive: number; negative: number; indeterminate: number; pending: number; positivityRate: number | null };
}

export interface LabReportData {
  period: ClinicalReportPeriod;
  summary: LabReportSummary;
  hts: { counsellingEpisodes: number; completedTests: number; confirmedPositive: number; newlyIdentifiedPositive: number; previouslyKnownPositive: number; linkedToCare: number };
  topTests: Array<{ testName: string; count: number; completed: number; resulted: number; positive: number; positiveRate: number }>;
  allTests: Array<{ testName: string; count: number; completed: number; resulted: number; positive: number; positiveRate: number }>;
  hivTestBreakdown: Array<{ testName: string; ordered: number; completed: number; positive: number; negative: number; indeterminate: number; resultsEntered: number }>;
  hivAgeSexBreakdown: Array<{
    ageGroup: string; maleTested: number; femaleTested: number; totalTested: number;
    malePositive: number; femalePositive: number; totalPositive: number;
  }>; 
  positivityRates: Array<{ testName: string; rate: string }>;
  labCaseBreakdown: Array<{
    code: string; description: string; cases: number;
    malePositive: number; femalePositive: number; totalPositive: number;
    maleNegative: number; femaleNegative: number; totalNegative: number; unknown: number;
  }>;
  imagingCaseBreakdown: Array<{
    code: string; description: string; cases: number;
    male: number; female: number; unknown: number;
  }>;
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