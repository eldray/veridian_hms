// services/ClinicalReportsService.ts - FIXED VERSION

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ClinicalReportFilters {
  startDate: Date;
  endDate: Date;
  department?: string;
  doctorId?: string;
}

export class ClinicalReportsService {

  // 1. LABORATORY REPORT
  static async generateLabReport(filters: ClinicalReportFilters) {
    const { startDate, endDate } = filters;
    
    // ✅ FIXED: Use correct relation names from schema
    const labTests = await prisma.labTest.findMany({
      where: {
        requestedAt: { gte: startDate, lte: endDate }
      },
      include: {
        LabTestTemplate: true,
        Attendance: true,
        ServiceCatalog: true,
        // ✅ Use the correct relation names (not 'performedBy' or 'verifiedBy')
        User_LabTest_performedByIdToUser: true,
        User_LabTest_verifiedByIdToUser: true,
        User_LabTest_createdByIdToUser: true
      }
    });
    
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
      period: { startDate, endDate },
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

  // 2. RADIOLOGY/SCANS REPORT

  static async generateScanReport(filters: ClinicalReportFilters) {
    const { startDate, endDate } = filters;
    
    // ✅ FIXED: Use correct relation names from schema
    const scans = await prisma.scan.findMany({
      where: {
        requestedAt: { gte: startDate, lte: endDate }
      },
      include: {
        ScanTemplate: true,
        Attendance: true,
        ServiceCatalog: true,
        // ✅ Use the correct relation names (not 'performedBy' or 'verifiedBy')
        User_Scan_performedByIdToUser: true,
        User_Scan_verifiedByIdToUser: true,
        User_Scan_createdByIdToUser: true
      }
    });
    
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
      period: { startDate, endDate },
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

  // 3. PROCEDURES REPORT - FIXED
  static async generateProcedureReport(filters: ClinicalReportFilters) {
    const { startDate, endDate } = filters;
    
    // ✅ FIXED: Use correct relation names from schema
    const procedures = await prisma.procedure.findMany({
      where: {
        scheduledDate: { gte: startDate, lte: endDate }
      },
      include: {
        ProcedureTemplate: true,
        // ✅ Use the correct relation names (not 'performedBy')
        User_Procedure_performedByIdToUser: true,
        User_Procedure_assistantIdToUser: true,
        User_Procedure_createdByIdToUser: true,
        Attendance: true,
        ServiceCatalog: true
      }
    });
    
    const completedProcs = procedures.filter(p => p.status === 'completed');
    const totalDuration = completedProcs.reduce((sum, p) => sum + (p.duration || 0), 0);
    
    // Group by category
    const byCategory: Record<string, number> = {};
    const complications: string[] = [];
    
    for (const proc of procedures) {
      const category = proc.ProcedureTemplate?.category || 'general';
      byCategory[category] = (byCategory[category] || 0) + 1;
      
      if (proc.complications) complications.push(proc.complications);
    }
    
    // Top procedures
    const procCounts: Record<string, number> = {};
    for (const proc of procedures) {
      const name = proc.ProcedureTemplate?.name || 'Unknown';
      procCounts[name] = (procCounts[name] || 0) + 1;
    }
    
    return {
      period: { startDate, endDate },
      summary: {
        totalProcedures: procedures.length,
        byStatus: {
          scheduled: procedures.filter(p => p.status === 'scheduled').length,
          completed: completedProcs.length,
          cancelled: procedures.filter(p => p.status === 'cancelled').length
        },
        byCategory,
        averageDuration: completedProcs.length > 0 ? Math.round(totalDuration / completedProcs.length) : 0
      },
      topProcedures: Object.entries(procCounts)
        .map(([name, count]) => ({ procedureName: name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }

  // 4. MEDICATION REPORT
  static async generateMedicationReport(filters: ClinicalReportFilters) {
    const { startDate, endDate } = filters;
    
    const medications = await prisma.medication.findMany({
      where: {
        prescribedAt: { gte: startDate, lte: endDate }
      },
      include: {
        StockItem: true,
        // ✅ FIXED: Use correct relation names
        User_Medication_prescribedByIdToUser: true,
        User_Medication_dispensedByIdToUser: true,
        User_Medication_administeredByIdToUser: true,
        Attendance: true,
        ServiceCatalog: true
      }
    });
    
    // Group by medication
    const medCounts: Record<string, { count: number; quantity: number }> = {};
    for (const med of medications) {
      const name = med.StockItem?.name || med.name;
      if (!medCounts[name]) medCounts[name] = { count: 0, quantity: 0 };
      medCounts[name].count++;
      medCounts[name].quantity += med.quantity;
    }
    
    // Group by route
    const byRoute: Record<string, number> = {};
    for (const med of medications) {
      const route = med.route || 'oral';
      byRoute[route] = (byRoute[route] || 0) + 1;
    }
    
    return {
      period: { startDate, endDate },
      summary: {
        totalPrescriptions: medications.length,
        byStatus: {
          prescribed: medications.filter(m => m.status === 'prescribed').length,
          dispensed: medications.filter(m => m.status === 'dispensed').length,
          administered: medications.filter(m => m.status === 'administered').length,
          cancelled: medications.filter(m => m.status === 'cancelled').length
        },
        byRoute,
        totalDispensedQuantity: medications.reduce((sum, m) => sum + (m.status === 'dispensed' ? m.quantity : 0), 0)
      },
      topMedications: Object.entries(medCounts)
        .map(([name, data]) => ({ medicationName: name, count: data.count, totalQuantity: data.quantity }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }

  // 5. VITALS REPORT
  static async generateVitalsReport(filters: ClinicalReportFilters) {
    const { startDate, endDate } = filters;
    
    const vitals = await prisma.vitals.findMany({
      where: {
        recordedAt: { gte: startDate, lte: endDate }
      },
      include: {
        Patient: true,
        User: true,
        Attendance: true
      }
    });
    
    const abnormal = {
      hypertension: 0,   // BP systolic > 140 or diastolic > 90
      hypotension: 0,    // BP systolic < 90 or diastolic < 60
      fever: 0,          // temperature > 38°C
      tachycardia: 0,    // pulse > 100
      bradycardia: 0,    // pulse < 60
      hypoxia: 0,        // SpO2 < 94%
      underweight: 0,    // BMI < 18.5
      overweight: 0,     // BMI 25-29.9
      obese: 0           // BMI >= 30
    };
    
    for (const v of vitals) {
      // Blood pressure analysis
      if (v.bloodPressure) {
        const parts = v.bloodPressure.split('/');
        if (parts.length === 2) {
          const systolic = parseInt(parts[0]);
          const diastolic = parseInt(parts[1]);
          if (systolic > 140 || diastolic > 90) abnormal.hypertension++;
          if (systolic < 90 || diastolic < 60) abnormal.hypotension++;
        }
      }
      
      if (v.temperature && v.temperature > 38) abnormal.fever++;
      if (v.pulse && v.pulse > 100) abnormal.tachycardia++;
      if (v.pulse && v.pulse < 60) abnormal.bradycardia++;
      if (v.spo2 && v.spo2 < 94) abnormal.hypoxia++;
      
      if (v.bmi) {
        if (v.bmi < 18.5) abnormal.underweight++;
        else if (v.bmi < 25) { /* normal */ }
        else if (v.bmi < 30) abnormal.overweight++;
        else abnormal.obese++;
      }
    }
    
    // Calculate monthly trends
    const monthlyData: Record<string, { temps: number[]; systolic: number[]; diastolic: number[] }> = {};
    
    for (const v of vitals) {
      const month = v.recordedAt.toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { temps: [], systolic: [], diastolic: [] };
      }
      
      if (v.temperature) monthlyData[month].temps.push(v.temperature);
      if (v.bloodPressure) {
        const parts = v.bloodPressure.split('/');
        if (parts.length === 2) {
          monthlyData[month].systolic.push(parseInt(parts[0]));
          monthlyData[month].diastolic.push(parseInt(parts[1]));
        }
      }
    }
    
    const trends = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      avgTemp: data.temps.length ? (data.temps.reduce((a, b) => a + b, 0) / data.temps.length).toFixed(1) : 'N/A',
      avgBPSystolic: data.systolic.length ? Math.round(data.systolic.reduce((a, b) => a + b, 0) / data.systolic.length) : 0,
      avgBPDiastolic: data.diastolic.length ? Math.round(data.diastolic.reduce((a, b) => a + b, 0) / data.diastolic.length) : 0
    }));
    
    return {
      period: { startDate, endDate },
      summary: {
        totalVitalsRecords: vitals.length,
        uniquePatients: new Set(vitals.map(v => v.patientId)).size,
        abnormalFindings: abnormal
      },
      trends
    };
  }
}