import { describe, expect, it, vi } from 'vitest';
import { GHSReportService } from '../src/modules/ghsReport/GHSReportService';

describe('GHS EPI report', () => {
  it('aggregates recorded vaccine administrations by vaccine, age, dose and follow-up', async () => {
    const end = new Date('2026-11-30T23:59:59.999Z');
    const findMany = vi.fn().mockResolvedValue([
      {
        patientId: 'patient-1', vaccineId: 'bcg', doseNumber: 'Dose 1',
        administeredAt: new Date('2026-11-10T10:00:00.000Z'),
        nextDoseDue: new Date('2026-12-10T10:00:00.000Z'),
        batchNumber: 'B-001', adverseReaction: null, underlyingCondition: true, healthWorker: false, pregnancyStatus: 'pregnant',
        Vaccine: { id: 'bcg', code: 'BCG', name: 'BCG', diseaseTargets: ['Tuberculosis'], doseSchedule: null },
        Patient: { id: 'patient-1', dateOfBirth: new Date('2026-11-01T00:00:00.000Z'), gender: 'female' },
      },
      {
        patientId: 'patient-2', vaccineId: 'bcg', doseNumber: 'Dose 1',
        administeredAt: new Date('2026-11-12T10:00:00.000Z'),
        nextDoseDue: new Date('2026-11-20T10:00:00.000Z'),
        batchNumber: 'B-001', adverseReaction: 'Mild fever', underlyingCondition: false, healthWorker: true, pregnancyStatus: 'non_pregnant',
        Vaccine: { id: 'bcg', code: 'BCG', name: 'BCG', diseaseTargets: ['Tuberculosis'], doseSchedule: null },
        Patient: { id: 'patient-2', dateOfBirth: new Date('2025-01-01T00:00:00.000Z'), gender: 'male' },
      },
    ]);
    const service = new GHSReportService({ immunizationRecord: { findMany }, ePIMonthlyReturn: { findFirst: vi.fn().mockResolvedValue(null) } } as any);
    const result = await service.getEPIStats(new Date('2026-11-01T00:00:00.000Z'), end);
    expect(findMany).toHaveBeenCalledOnce();
    expect(result.available).toBe(true);
    expect(result.summary.totalDoses).toBe(2);
    expect(result.summary.uniquePatients).toBe(2);
    expect(result.summary.overdueFollowUps).toBe(1);
    expect(result.summary.upcomingFollowUps).toBe(1);
    expect(result.summary.adverseReactions).toBe(1);
    expect(result.byVaccine).toHaveLength(1);
    expect(result.byVaccine[0].doses).toBe(2);
    expect(result.byVaccine[0].uniquePatients).toBe(2);
    expect(result.byAgeGroup['<1 year']).toBe(1);
    expect(result.byAgeGroup['1–4 years']).toBe(1);
    expect(result.monthlyVaccinations.find(row => row.vaccine === 'BCG')).toMatchObject({ under12Months: 1, months12To23: 1, months24Plus: 0, totalAdministered: 2 });
    expect(result.covidVaccinations).toHaveLength(7);
    expect(result.tdVaccinations).toHaveLength(6);
    expect(result.covidVaccinations[0].underlyingConditions).toBe(1);
    expect(result.covidVaccinations[0].healthWorkers).toBe(1);
    expect(result.covidVaccinations[0].pregnantWomen).toBe(1);
    expect(result.tdVaccinations[0].pregnantWomen).toBe(1);
    expect(result.tdVaccinations[0].nonPregnant).toBe(1);
    expect(result.coverage).toBeNull();
  });
});
