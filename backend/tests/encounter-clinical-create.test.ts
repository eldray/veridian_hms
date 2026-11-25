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
      attendance: { findFirst: vi.fn().mockResolvedValue(null) },
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
      patientClassification: 'NEW',
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

  it('persists the selected corporate account on a corporate encounter', async () => {
    const attendanceCreate = vi.fn().mockResolvedValue({ id: 'attendance-corporate-1' });
    const tx = { attendance: { create: attendanceCreate } };
    const prisma = {
      attendance: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new EncounterService(prisma as any);

    await service.createEncounter({
      patientId: 'patient-1',
      attendanceType: 'general_consultation',
      paymentMode: 'corporate',
      corporateAccountId: 'corporate-account-1',
    } as any, 'doctor-1');

    expect(attendanceCreate.mock.calls[0][0].data).toMatchObject({
      paymentMode: 'corporate',
      corporateAccountId: 'corporate-account-1',
    });
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

  it('rejects an NHIS attendance when the patient has no NHIA verification record', async () => {
    const attendanceCreate = vi.fn();
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const tx = {
      patient: { findUnique: vi.fn().mockResolvedValue({
        id: 'patient-1', nhisNumber: '0012345678', nhisActive: true, nhisExpiryDate: expiry,
      }) },
      nHISEligibilityCheck: { findFirst: vi.fn().mockResolvedValue(null) },
      attendance: { create: attendanceCreate },
    };
    const prisma = {
      attendance: { findFirst: vi.fn().mockResolvedValue(null) },
      insuranceProvider: { findFirst: vi.fn().mockResolvedValue({ id: 'nhis-provider-1' }) },
      $transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new EncounterService(prisma as any);

    await expect(service.createEncounter({
      patientId: 'patient-1',
      attendanceType: 'general_consultation',
      paymentMode: 'nhis',
      nhisCCC: '12345',
    } as any, 'staff-1')).rejects.toThrow(/has not been verified as active with NHIA/i);

    expect(attendanceCreate).not.toHaveBeenCalled();
  });

  it('creates an NHIS attendance only when the latest NHIA check matches the current active membership', async () => {
    const attendanceCreate = vi.fn().mockResolvedValue({ id: 'attendance-nhis-1' });
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const tx = {
      patient: { findUnique: vi.fn().mockResolvedValue({
        id: 'patient-1', nhisNumber: '0012345678', nhisActive: true, nhisExpiryDate: expiry,
      }) },
      nHISEligibilityCheck: { findFirst: vi.fn().mockResolvedValue({
        membershipId: '0012345678',
        status: 'active',
        membershipExpiry: expiry,
        checkTimestamp: new Date(),
      }) },
      attendance: { create: attendanceCreate },
    };
    const prisma = {
      attendance: { findFirst: vi.fn().mockResolvedValue(null) },
      insuranceProvider: { findFirst: vi.fn().mockResolvedValue({ id: 'nhis-provider-1' }) },
      $transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new EncounterService(prisma as any);

    await service.createEncounter({
      patientId: 'patient-1',
      attendanceType: 'general_consultation',
      paymentMode: 'nhis',
      nhisCCC: '12345',
    } as any, 'staff-1');

    expect(attendanceCreate.mock.calls[0][0].data).toMatchObject({
      paymentMode: 'nhis',
      nhisCCC: '12345',
      insuranceProviderId: 'nhis-provider-1',
    });
  });

  it('rejects an NHIS attendance when the latest verification belongs to a different membership number', async () => {
    const attendanceCreate = vi.fn();
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const tx = {
      patient: { findUnique: vi.fn().mockResolvedValue({
        id: 'patient-1', nhisNumber: '0012345678', nhisActive: true, nhisExpiryDate: expiry,
      }) },
      nHISEligibilityCheck: { findFirst: vi.fn().mockResolvedValue({
        membershipId: '0099999999',
        status: 'active',
        membershipExpiry: expiry,
        checkTimestamp: new Date(),
      }) },
      attendance: { create: attendanceCreate },
    };
    const prisma = {
      attendance: { findFirst: vi.fn().mockResolvedValue(null) },
      insuranceProvider: { findFirst: vi.fn().mockResolvedValue({ id: 'nhis-provider-1' }) },
      $transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new EncounterService(prisma as any);

    await expect(service.createEncounter({
      patientId: 'patient-1',
      attendanceType: 'general_consultation',
      paymentMode: 'nhis',
      nhisCCC: '12345',
    } as any, 'staff-1')).rejects.toThrow(/has not been verified as active with NHIA/i);

    expect(attendanceCreate).not.toHaveBeenCalled();
  });
});
