import { cacheReadMethods } from '../../utils/ttlCache';
import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { ClinicalReportsRepository } from './ClinicalReportsRepository';
import { 
  ClinicalReportFilters, 
  LabReportData, 
  ScanReportData, 
  ProcedureReportData, 
  MedicationReportData, 
  VitalsReportData 
} from './ClinicalReportsTypes';

export class ClinicalReportsService extends BaseService {
  private repository: ClinicalReportsRepository;

  constructor(prisma: PrismaClient) {
    super('ClinicalReportsService');
    this.repository = new ClinicalReportsRepository(prisma);
    // Reports over big date ranges take seconds; share one result per range for 60 s
    cacheReadMethods(this, ['generateLabReport','generateScanReport','generateProcedureReport','generateMedicationReport','generateVitalsReport'], 60000);
  }

  async generateLabReport(filters: ClinicalReportFilters): Promise<LabReportData> {
    this.logInfo('Generating lab report', { startDate: filters.startDate, endDate: filters.endDate });
    const labTests = await this.repository.getLabTests(filters);
    const scansForCases = await this.repository.getScans(filters);
    const completedTests = labTests.filter(t => t.status === 'completed');
    const totalTurnaround = completedTests.reduce((sum, t) => sum + (t.turnaroundMinutes || 0), 0);

    // Lab result payloads may be scalar, a {value} object, or the parameters
    // object saved by LabResultsEntry. Read only structured test fields for HIV.
    const resultValues = (test: any): any[] => {
      const result = test.result;
      if (result == null) return [];
      if (typeof result !== 'object') return [result];
      const values: any[] = [];
      const collect = (source: any) => {
        if (!source || typeof source !== 'object') return;
        Object.entries(source).forEach(([key, value]) => {
          if (['testName', 'parameters', 'metadata'].includes(key.toLowerCase())) return;
          if (value && typeof value === 'object') collect(value);
          else if (value != null && String(value).trim() !== '') values.push(value);
        });
      };
      collect(result.parameters);
      collect(result);
      return values;
    };
    const normalizeResult = (value: any): string => String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ');
    const positive = (value: any) => {
      const normalized = normalizeResult(value);
      return normalized.includes('positive') || (normalized.includes('reactive') && !normalized.includes('non reactive') && !normalized.includes('nonreactive'));
    };
    const negative = (value: any) => {
      const normalized = normalizeResult(value);
      return normalized.includes('negative') || normalized.includes('non reactive') || normalized.includes('nonreactive');
    };
    const indeterminate = (value: any) => /indeterminate|invalid|inconclusive/.test(normalizeResult(value));
    const imagingCaseMap = new Map<string, any>();
    for (const scan of scansForCases) {
      const code = scan.ScanTemplate?.scanCode || scan.ServiceCatalog?.code || 'UN-CODED';
      const description = scan.ScanTemplate?.name || scan.ServiceCatalog?.name || scan.description || 'Unknown scan';
      const row = imagingCaseMap.get(code) || { code, description, cases: 0, male: 0, female: 0, unknown: 0 };
      row.cases++;
      const gender = String(scan.Attendance?.Patient?.gender || '').toLowerCase();
      if (gender === 'male') row.male++;
      else if (gender === 'female') row.female++;
      else row.unknown++;
      imagingCaseMap.set(code, row);
    }
    const imagingCaseBreakdown = Array.from(imagingCaseMap.values()).sort((a, b) => a.description.localeCompare(b.description));

    const labCaseMap = new Map<string, any>();
    for (const test of labTests) {
      const code = test.LabTestTemplate?.investigationCode || test.ServiceCatalog?.code || 'UN-CODED';
      const description = test.LabTestTemplate?.name || test.ServiceCatalog?.name || 'Unknown investigation';
      const row = labCaseMap.get(code) || { code, description, cases: 0, malePositive: 0, femalePositive: 0, totalPositive: 0, maleNegative: 0, femaleNegative: 0, totalNegative: 0, unknown: 0 };
      row.cases++;
      const gender = String(test.Attendance?.Patient?.gender || '').toLowerCase();
      const values = resultValues(test);
      const hasPositive = values.some(positive);
      const hasNegative = values.some(negative) && !hasPositive;
      if (hasPositive) {
        row.totalPositive++;
        if (gender === 'male') row.malePositive++;
        else if (gender === 'female') row.femalePositive++;
        else row.unknown++;
      } else if (hasNegative) {
        row.totalNegative++;
        if (gender === 'male') row.maleNegative++;
        else if (gender === 'female') row.femaleNegative++;
        else row.unknown++;
      } else row.unknown++;
      labCaseMap.set(code, row);
    }
    const labCaseBreakdown = Array.from(labCaseMap.values()).sort((a, b) => a.description.localeCompare(b.description));

    const testCounts: Record<string, { count: number; completed: number; resulted: number; positive: number }> = {};
    for (const test of labTests) {
      const testName = test.LabTestTemplate?.name || test.ServiceCatalog?.name || 'Unknown';
      if (!testCounts[testName]) testCounts[testName] = { count: 0, completed: 0, resulted: 0, positive: 0 };
      testCounts[testName].count++;
      if (test.status === 'completed') {
        testCounts[testName].completed++;
        const vals = resultValues(test);
        if (vals.length) testCounts[testName].resulted++;
        if (vals.some(positive)) testCounts[testName].positive++;
      }
    }
    const allTests = Object.entries(testCounts).map(([testName, data]) => ({
      testName, count: data.count, completed: data.completed, resulted: data.resulted,
      positive: data.positive, positiveRate: data.resulted ? (data.positive / data.resulted) * 100 : 0,
    })).sort((a, b) => b.count - a.count || a.testName.localeCompare(b.testName));
    const topTests = allTests.slice(0, 10);

    const hivTests = labTests.filter(test => {
      const name = (test.LabTestTemplate?.name || test.ServiceCatalog?.name || '').toLowerCase();
      // HIV screening and confirmatory assays only; CD4 is monitoring, not HIV diagnosis.
      return /\bhiv\b/.test(name) && !/cd4/.test(name);
    });
    const hivCompleted = hivTests.filter(test => test.status === 'completed');
    const hivResultValues = (test: any): any[] => {
      const result = test.result;
      if (result == null) return [];
      if (typeof result !== 'object') return [result];
      const values: any[] = [];
      const scan = (source: any, root = false) => {
        if (!source || typeof source !== 'object') return;
        Object.entries(source).forEach(([key, value]) => {
          if (['testName', 'parameters', 'metadata'].includes(key.toLowerCase())) return;
          if (value && typeof value === 'object') scan(value);
          else if ((/hiv|screen|confirm/i.test(key) || (root && key.toLowerCase() === 'result')) && value != null && String(value).trim() !== '') values.push(value);
        });
      };
      scan(result.parameters);
      scan(result, true);
      return values;
    };
    const hivResults = hivCompleted.map(test => {
      const values = hivResultValues(test);
      const positiveResult = values.some(positive);
      const negativeResult = values.some(negative);
      const indeterminateResult = values.some(indeterminate);
      return { test, positive: positiveResult, negative: negativeResult && !positiveResult, indeterminate: indeterminateResult, hasResult: values.length > 0 };
    });
    const hivTestCounts: Record<string, { ordered: number; completed: number; positive: number; negative: number; indeterminate: number; resultsEntered: number }> = {};
    hivTests.forEach(test => {
      const name = test.LabTestTemplate?.name || test.ServiceCatalog?.name || 'HIV test';
      if (!hivTestCounts[name]) hivTestCounts[name] = { ordered: 0, completed: 0, positive: 0, negative: 0, indeterminate: 0, resultsEntered: 0 };
      hivTestCounts[name].ordered++;
    });
    hivResults.forEach(item => {
      const name = item.test.LabTestTemplate?.name || item.test.ServiceCatalog?.name || 'HIV test';
      const row = hivTestCounts[name];
      row.completed++;
      if (item.hasResult) row.resultsEntered++;
      if (item.positive) row.positive++;
      if (item.negative) row.negative++;
      if (item.indeterminate) row.indeterminate++;
    });
    const hivBreakdown = Object.entries(hivTestCounts).map(([testName, counts]) => ({ testName, ...counts })).sort((a,b) => b.ordered-a.ordered);
    const hivPositive = hivResults.filter(r => r.positive).length;
    const hivNegative = hivResults.filter(r => r.negative).length;
    const hivIndeterminate = hivResults.filter(r => r.indeterminate).length;
    const hivResultsEntered = hivResults.filter(r => r.hasResult).length;

    return {
      period: { startDate: filters.startDate, endDate: filters.endDate },
      summary: {
        totalTests: labTests.length,
        byStatus: {
          requested: labTests.filter(t => t.status === 'requested').length,
          inProgress: labTests.filter(t => t.status === 'in_progress').length,
          completed: completedTests.length,
          cancelled: labTests.filter(t => t.status === 'cancelled').length,
        },
        byPriority: {
          routine: labTests.filter(t => t.priority === 'routine').length,
          urgent: labTests.filter(t => t.priority === 'urgent').length,
          stat: labTests.filter(t => t.priority === 'stat').length,
        },
        averageTurnaroundTime: completedTests.length > 0 ? Math.round(totalTurnaround / completedTests.length) : 0,
        hiv: {
          testsOrdered: hivTests.length,
          completed: hivCompleted.length,
          resultsEntered: hivResultsEntered,
          positive: hivPositive,
          negative: hivNegative,
          indeterminate: hivIndeterminate,
          pending: hivTests.filter(t => t.status === 'requested' || t.status === 'in_progress').length,
          positivityRate: hivResultsEntered ? Math.round((hivPositive / hivResultsEntered) * 1000) / 10 : null,
        },
      },
      topTests,
      allTests,
      hivTestBreakdown: hivBreakdown,
      positivityRates: topTests.map(t => ({ testName: t.testName, rate: t.positiveRate.toFixed(1) })),
      labCaseBreakdown,
      imagingCaseBreakdown,
    };
  }

  async generateScanReport(filters: ClinicalReportFilters): Promise<ScanReportData> {
    this.logInfo('Generating scan report');
    const scans = await this.repository.getScans(filters);
    const completedScans = scans.filter(s => s.status === 'completed');
    const totalTurnaround = completedScans.reduce((sum, s) => sum + (s.turnaroundMinutes || 0), 0);

    const byType: Record<string, number> = {};
    const byBodyPart: Record<string, number> = {};

    for (const scan of scans) {
      const rawCategory = scan.ScanTemplate?.category ?? scan.scanType ?? 'Unknown';
      const type = rawCategory.toString().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      byType[type] = (byType[type] || 0) + 1;
      byBodyPart[scan.bodyPart || 'Unknown'] = (byBodyPart[scan.bodyPart || 'Unknown'] || 0) + 1;
    }

    return {
      period: { startDate: filters.startDate, endDate: filters.endDate },
      summary: {
        totalScans: scans.length,
        byStatus: {
          requested: scans.filter(s => s.status === 'requested').length,
          inProgress: scans.filter(s => s.status === 'in_progress').length,
          completed: completedScans.length,
          cancelled: scans.filter(s => s.status === 'cancelled').length,
        },
        byType, byBodyPart,
        averageTurnaroundTime: completedScans.length > 0 ? Math.round(totalTurnaround / completedScans.length) : 0,
      },
      topScans: Object.entries(byType).map(([name, count]) => ({ scanName: name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    };
  }

  async generateProcedureReport(filters: ClinicalReportFilters): Promise<ProcedureReportData> {
    this.logInfo('Generating procedure report');
    const procedures = await this.repository.getProcedures(filters);
    const completedProcedures = procedures.filter(p => p.status === 'completed');

    const byType: Record<string, number> = {};
    for (const proc of procedures) {
      const type = proc.ProcedureTemplate?.name || 'Unknown';
      byType[type] = (byType[type] || 0) + 1;
    }

    return {
      period: { startDate: filters.startDate, endDate: filters.endDate },
      summary: {
        totalProcedures: procedures.length,
        byStatus: {
          scheduled: procedures.filter(p => p.status === 'scheduled').length,
          completed: completedProcedures.length,
          cancelled: procedures.filter(p => p.status === 'cancelled').length,
        },
        byType,
      },
      topProcedures: Object.entries(byType).map(([name, count]) => ({ procedureName: name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    };
  }

  async generateMedicationReport(filters: ClinicalReportFilters): Promise<MedicationReportData> {
    this.logInfo('Generating medication report');
    const medications = await this.repository.getMedications(filters);

    const byDrug: Record<string, number> = {};
    for (const med of medications) {
      const drugName = med.StockItem?.name || med.name || 'Unknown';
      byDrug[drugName] = (byDrug[drugName] || 0) + 1;
    }

    return {
      period: { startDate: filters.startDate, endDate: filters.endDate },
      summary: {
        totalMedications: medications.length,
        byStatus: {
          prescribed: medications.filter(m => m.status === 'prescribed').length,
          dispensed: medications.filter(m => m.status === 'dispensed').length,
          administered: medications.filter(m => m.status === 'administered').length,
          cancelled: medications.filter(m => m.status === 'cancelled').length,
        },
        byDrug,
        totalQuantity: medications.reduce((sum, m) => sum + (m.quantity || 0), 0),
      },
      topMedications: Object.entries(byDrug).map(([name, count]) => ({ drugName: name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    };
  }

  async generateVitalsReport(filters: ClinicalReportFilters): Promise<VitalsReportData> {
    this.logInfo('Generating vitals report');
    const vitals = await this.repository.getVitals(filters);

    const validTemps = vitals.filter(v => v.temperature).map(v => v.temperature!);
    const validPulse = vitals.filter(v => v.pulse).map(v => v.pulse!);
    const validResp = vitals.filter(v => v.respiration).map(v => v.respiration!);
    const validSpo2 = vitals.filter(v => v.spo2).map(v => v.spo2!);

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const hypertension = vitals.filter(v => {
      const bp = v.bloodPressure?.split('/').map(Number);
      return bp && bp.length === 2 && (bp[0] > 140 || bp[1] > 90);
    }).length;

    return {
      period: { startDate: filters.startDate, endDate: filters.endDate },
      summary: {
        totalVitals: vitals.length,
        uniquePatients: new Set(vitals.map(v => v.patientId)).size,
        averages: {
          temperature: avg(validTemps).toFixed(1),
          pulse: Math.round(avg(validPulse)),
          respiratoryRate: Math.round(avg(validResp)),
          oxygenSaturation: Math.round(avg(validSpo2)),
        },
        abnormalFindings: {
          hypertension,
          fever: vitals.filter(v => v.temperature && v.temperature > 38).length,
          tachycardia: vitals.filter(v => v.pulse && v.pulse > 100).length,
          bradycardia: vitals.filter(v => v.pulse && v.pulse < 60).length,
          hypoxia: vitals.filter(v => v.spo2 && v.spo2 < 94).length,
        },
      },
      monthlyTrends: this.calculateMonthlyTrends(vitals),
    };
  }

  private calculateMonthlyTrends(vitals: any[]) {
    const trends: Record<string, { month: string; avgTemp: number; avgPulse: number; count: number }> = {};
    for (const vital of vitals) {
      const month = vital.recordedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!trends[month]) trends[month] = { month, avgTemp: 0, avgPulse: 0, count: 0 };
      if (vital.temperature) trends[month].avgTemp += vital.temperature;
      if (vital.pulse) trends[month].avgPulse += vital.pulse;
      trends[month].count++;
    }
    return Object.values(trends).map(t => ({
      month: t.month,
      avgTemp: t.count > 0 ? Math.round((t.avgTemp / t.count) * 10) / 10 : 0,
      avgPulse: t.count > 0 ? Math.round(t.avgPulse / t.count) : 0,
    }));
  }
}