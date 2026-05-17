/**
 * Clinical Reports Service
 * Business logic for clinical report generation
 */

import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../utils/baseService';
import { ClinicalReportsRepository } from './ClinicalReportsRepository';
import { ClinicalReportFilters } from './ClinicalReportsTypes';

const prisma = new PrismaClient();

export class ClinicalReportsService extends BaseService {
  private repository: ClinicalReportsRepository;

  constructor() {
    super(prisma);
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
      const drugName = med.Drug?.name || 'Unknown';
      byDrug[drugName] = (byDrug[drugName] || 0) + 1;
    }

    return {
      period: { startDate: filters.startDate, endDate: filters.endDate },
      summary: {
        totalMedications: medications.length,
        byDrug,
        totalDosage: medications.reduce((sum, m) => sum + (m.dosage ? 1 : 0), 0)
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
    const validBP = vitals.filter(v => v.systolicBP && v.diastolicBP);
    const validPulse = vitals.filter(v => v.pulse).map(v => v.pulse!);
    const validResp = vitals.filter(v => v.respiratoryRate).map(v => v.respiratoryRate!);

    const avgTemp = validTemps.length > 0 ? validTemps.reduce((a, b) => a + b, 0) / validTemps.length : 0;
    const avgPulse = validPulse.length > 0 ? validPulse.reduce((a, b) => a + b, 0) / validPulse.length : 0;
    const avgResp = validResp.length > 0 ? validResp.reduce((a, b) => a + b, 0) / validResp.length : 0;

    return {
      period: { startDate: filters.startDate, endDate: filters.endDate },
      summary: {
        totalVitals: vitals.length,
        averages: {
          temperature: avgTemp.toFixed(1),
          pulse: Math.round(avgPulse),
          respiratoryRate: Math.round(avgResp)
        },
        bloodPressureReadings: validBP.length
      }
    };
  }
}
