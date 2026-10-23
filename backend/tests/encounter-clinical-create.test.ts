import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/CounterService', () => ({
  getCounterService: () => ({ nextAttendanceNumber: () => 'TEST-ATT-1001' }),
}));

import { EncounterService } from '../src/modules/encounter/EncounterService';

describe('encounter clinical documentation persistence', () => {
  const clinicalFields = {
    complaints: 'Headache and dizziness',
    historyPresentingComplaint: 'Headache started two days ago and is intermittent.',
    reviewOfSystems: { neurological: 'No weakness or seizures' },
    physicalExamination: 'Alert, oriented, no acute distress.',
    physicalExamStructured: { neurological: 'No focal deficit' },
    assessment: 'Likely tension-type headache',
    treatmentPlan: 'Oral fluids, analgesia, and review if symptoms worsen.',
    clinicalOutcome: 'stable',
    allergyReviewStatus: 'no_known_allergies',
    allergyReviewNotes: undefined,
    providerId: 'doctor-1',
  };

  it('persists structured and narrative clinical fields when the API creation flow creates an encounter', async () => {
    const createdEncounter = { id: 'attendance-1', ...clinicalFields };
    const attendanceCreate = vi.fn().mockResolvedValue(createdEncounter);
    const tx = { attendance: { create: attendanceCreate } };
    const prisma = {
      $transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new EncounterService(prisma as any);

    await service.createEncounter({
      patientId: 'patient-1',
      attendanceType: 'general_consultation',
      paymentMode: 'cash',
      ...clinicalFields,
    } as any, 'doctor-1');

    const payload = attendanceCreate.mock.calls[0][0].data;
    expect(payload).toMatchObject({
      complaints: 'Headache and dizziness',
      historyPresentingComplaint: clinicalFields.historyPresentingComplaint,
      reviewOfSystems: clinicalFields.reviewOfSystems,
      physicalExamination: clinicalFields.physicalExamination,
      physicalExamStructured: clinicalFields.physicalExamStructured,
      assessment: clinicalFields.assessment,
      treatmentPlan: clinicalFields.treatmentPlan,
      clinicalOutcome: 'stable',
      allergyReviewStatus: 'no_known_allergies',
      providerId: 'doctor-1',
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid clinical outcome before starting encounter creation', async () => {
    const transaction = vi.fn();
    const service = new EncounterService({ $transaction: transaction } as any);

    await expect(service.createEncounter({
      patientId: 'patient-1',
      attendanceType: 'general_consultation',
      paymentMode: 'cash',
      clinicalOutcome: 'recovered' as any,
    }, 'doctor-1')).rejects.toThrow(/invalid clinical condition outcome/i);

    expect(transaction).not.toHaveBeenCalled();
  });
});
