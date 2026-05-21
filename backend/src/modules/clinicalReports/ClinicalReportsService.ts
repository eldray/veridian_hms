/**
 * Clinical Reports Service
 * Business logic for clinical report generation
 */

import { PrismaClient } from '@prisma/client';
import { ClinicalReportsRepository } from './ClinicalReportsRepository';
import { ClinicalReportFilters } from './ClinicalReportsTypes';

const prisma = new PrismaClient();

export class ClinicalReportsService {
  private repository: ClinicalReportsRepository;

  constructor() {
    this.repository = new ClinicalReportsRepository(prisma);
  }

  async generateLabReport(filters: ClinicalReportFilters) {
    const labTests = await this.repository.getLabTests(filters);

    const completedTests = labTests.filter(t => t.status === 'completed');
    const totalTurnaround = completedTests.reduce((sum, t) => sum + (t.turnaroundMinutes || 0), 0);

    // Group by test template
    const testCounts: Record<string, { count: number; positive: number }> = {};
    for (const test of labTests) {
      const testName = test.LabTestTemplate?.name || 'Unknown';
      if (!testCounts[testName]) testCounts[testName] = { count: 0, positive: 0 };
      testCounts[testName].count++;

      // Check if result is positive
      const result = test.result as any;
      if (result && (result.result?.toLowerCase().includes('positive') || result.value === 'positive')) {
        testCounts[testName].positive++;
      }
    }

    const topTests = Object.entries(testCounts)
      .map(([name, data]) => ({ testName: name, count: data.count, positiveRate: (data.positive / data.count) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      period: { startDate: filters.startDate, endDate: filters.endDate },
      summary: {
        totalTests: labTests.length,
        byStatus: {
          requested: labTests.filter(t => t.status === 'requested').length,
          inProgress: labTests.filter(t => t.status === 'in_progress').length,
          completed: labTests.filter(t => t.status === 'completed').length,
          cancelled: labTests.filter(t => t.status === 'cancelled').length
        },
        byPriority: {
          routine: labTests.filter(t => t.priority === 'routine').length,
          urgent: labTests.filter(t => t.priority === 'urgent').length,
          stat: labTests.filter(t => t.priority === 'stat').length
        },
        averageTurnaroundTime: completedTests.length > 0 ? Math.round(totalTurnaround / completedTests.length) : 0
      },
      topTests,
      positivityRates: topTests.map(t => ({ testName: t.testName, rate: t.positiveRate.toFixed(1) }))
    };
  }

  async generateScanReport(filters: ClinicalReportFilters) {
    const scans = await this.repository.getScans(filters);

    const completedScans = scans.filter(s => s.status === 'completed');
    const totalTurnaround = completedScans.reduce((sum, s) => sum + (s.turnaroundMinutes || 0), 0);

    // Group by scan type
    const byType: Record<string, number> = {};
    const byBodyPart: Record<string, number> = {};

    for (const scan of scans) {
      const type = scan.ScanTemplate?.category || scan.scanType || 'Unknown';
      byType[type] = (byType[type] || 0) + 1;

      const bodyPart = scan.bodyPart || 'Unknown';
      byBodyPart[bodyPart] = (byBodyPart[bodyPart] || 0) + 1;
    }

    return {
      period: { startDate: filters.startDate, endDate: filters.endDate },
      summary: {
        totalScans: scans.length,
        byStatus: {
          requested: scans.filter(s => s.status === 'requested').length,
          inProgress: scans.filter(s => s.status === 'in_progress').length,
          completed: completedScans.length,
          cancelled: scans.filter(s => s.status === 'cancelled').length
        },
        byType,
        byBodyPart,
        averageTurnaroundTime: completedScans.length > 0 ? Math.round(totalTurnaround / completedScans.length) : 0
      },
      topScans: Object.entries(byType)
        .map(([name, count]) => ({ scanName: name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }

  async generateProcedureReport(filters: ClinicalReportFilters) {
    const procedures = await this.repository.getProcedures(filters);

    const completedProcedures = procedures.filter(p => p.status === 'completed');
    
    // Group by procedure type
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
          inProgress: procedures.filter(p => p.status === 'in_progress').length,
          completed: completedProcedures.length,
          cancelled: procedures.filter(p => p.status === 'cancelled').length
        },
        byType
      },
      topProcedures: Object.entries(byType)
        .map(([name, count]) => ({ procedureName: name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }

  async generateMedicationReport(filters: ClinicalReportFilters) {
    const medications = await this.repository.getMedications(filters);

    // Group by drug
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
          cancelled: medications.filter(m => m.status === 'cancelled').length
        },
        byDrug,
        totalQuantity: medications.reduce((sum, m) => sum + (m.quantity || 0), 0)
      },
      topMedications: Object.entries(byDrug)
        .map(([name, count]) => ({ drugName: name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }

  async generateVitalsReport(filters: ClinicalReportFilters) {
    const vitals = await this.repository.getVitals(filters);

    // Calculate averages
    const validTemps = vitals.filter(v => v.temperature).map(v => v.temperature!);
    const validPulse = vitals.filter(v => v.pulse).map(v => v.pulse!);
    const validResp = vitals.filter(v => v.respiration).map(v => v.respiration!);
    const validSpo2 = vitals.filter(v => v.spo2).map(v => v.spo2!);

    const avgTemp = validTemps.length > 0 ? validTemps.reduce((a, b) => a + b, 0) / validTemps.length : 0;
    const avgPulse = validPulse.length > 0 ? validPulse.reduce((a, b) => a + b, 0) / validPulse.length : 0;
    const avgResp = validResp.length > 0 ? validResp.reduce((a, b) => a + b, 0) / validResp.length : 0;
    const avgSpo2 = validSpo2.length > 0 ? validSpo2.reduce((a, b) => a + b, 0) / validSpo2.length : 0;

    // Count abnormal findings
    const hypertension = vitals.filter(v => {
      const bp = v.bloodPressure?.split('/').map(Number);
      return bp && (bp[0] > 140 || bp[1] > 90);
    }).length;

    const fever = vitals.filter(v => v.temperature && v.temperature > 38).length;
    const tachycardia = vitals.filter(v => v.pulse && v.pulse > 100).length;
    const bradycardia = vitals.filter(v => v.pulse && v.pulse < 60).length;
    const hypoxia = vitals.filter(v => v.spo2 && v.spo2 < 94).length;

    return {
      period: { startDate: filters.startDate, endDate: filters.endDate },
      summary: {
        totalVitals: vitals.length,
        uniquePatients: new Set(vitals.map(v => v.patientId)).size,
        averages: {
          temperature: avgTemp.toFixed(1),
          pulse: Math.round(avgPulse),
          respiratoryRate: Math.round(avgResp),
          oxygenSaturation: Math.round(avgSpo2)
        },
        abnormalFindings: {
          hypertension,
          fever,
          tachycardia,
          bradycardia,
          hypoxia
        }
      },
      monthlyTrends: this.calculateMonthlyTrends(vitals)
    };
  }

  private calculateMonthlyTrends(vitals: any[]) {
    const trends: Record<string, { month: string; avgTemp: number; avgPulse: number; count: number }> = {};
    
    for (const vital of vitals) {
      const month = vital.recordedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!trends[month]) {
        trends[month] = { month, avgTemp: 0, avgPulse: 0, count: 0 };
      }
      if (vital.temperature) trends[month].avgTemp += vital.temperature;
      if (vital.pulse) trends[month].avgPulse += vital.pulse;
      trends[month].count++;
    }

    return Object.values(trends).map(t => ({
      month: t.month,
      avgTemp: t.count > 0 ? Math.round((t.avgTemp / t.count) * 10) / 10 : 0,
      avgPulse: t.count > 0 ? Math.round(t.avgPulse / t.count) : 0
    }));
  }
}