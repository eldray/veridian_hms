import { describe, expect, it, vi } from 'vitest';
import { EncounterRepository } from '../src/modules/encounter/EncounterRepository';
import { AntenatalRepository } from '../src/modules/antenatal/AntenatalRepository';

describe('clinical vitals validation', () => {
  it('rejects malformed blood pressure before opening a database transaction', async () => {
    const transaction = vi.fn();
    const repository = new EncounterRepository({ $transaction: transaction } as any);

    await expect(repository.addVitals('attendance-1', { bloodPressure: '120-80' }, 'staff-1'))
      .rejects.toThrow(/systolic\/diastolic format/i);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects impossible oxygen saturation before saving', async () => {
    const transaction = vi.fn();
    const repository = new EncounterRepository({ $transaction: transaction } as any);

    await expect(repository.addVitals('attendance-1', { spo2: 140 }, 'staff-1'))
      .rejects.toThrow(/spo₂ must be between 1 and 100/i);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('accepts valid metric vital values and common blood-pressure format at validation boundary', async () => {
    const repository = new EncounterRepository({} as any);
    // Exercise the shared validator directly through the repository prototype for a
    // deterministic unit test without needing a database connection.
    expect(() => (repository as any).validateClinicalVitalValues({
      bloodPressure: '120/80 mmHg',
      temperature: 36.8,
      pulse: 76,
      respiration: 18,
      spo2: 98,
      weight: 60,
      height: 168,
      muac: 27,
    })).not.toThrow();
  });
});

describe('clinical encounter ownership', () => {
  it('does not cancel a lab order that belongs to another encounter', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const repository = new EncounterRepository({ labTest: { updateMany } } as any);

    await expect(repository.removeLabTest('encounter-a', 'lab-from-encounter-b'))
      .rejects.toThrow(/not found/i);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'lab-from-encounter-b', attendanceId: 'encounter-a', status: { not: 'cancelled' } },
      data: { status: 'cancelled' },
    });
  });

  it('does not cancel a scan that belongs to another encounter', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const repository = new EncounterRepository({ scan: { updateMany } } as any);

    await expect(repository.removeScan('encounter-a', 'scan-from-encounter-b'))
      .rejects.toThrow(/not found/i);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'scan-from-encounter-b', attendanceId: 'encounter-a', status: { not: 'cancelled' } },
      data: { status: 'cancelled' },
    });
  });

  it('does not delete a rendered service through the wrong encounter URL', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const repository = new EncounterRepository({ serviceRendered: { deleteMany } } as any);

    await expect(repository.removeService('encounter-a', 'service-from-encounter-b'))
      .rejects.toThrow(/not found/i);

    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: 'service-from-encounter-b', attendanceId: 'encounter-a' },
    });
  });
});

describe('newborn record validation', () => {
  it('accepts a recorded birth weight in grams and an explicit outcome', () => {
    const repository = new AntenatalRepository({} as any);
    expect((repository as any).mapNewborns([{
      birthWeight: 3200,
      gender: 'female',
      outcome: 'alive',
      apgarScore1min: 8,
      apgarScore5min: 9,
    }])).toEqual([expect.objectContaining({ birthWeight: 3200, outcome: 'alive' })]);
  });

  it('does not silently mark a newborn as alive when outcome is missing', () => {
    const repository = new AntenatalRepository({} as any);
    expect(() => (repository as any).mapNewborns([{ birthWeight: 3200, gender: 'male' }]))
      .toThrow(/confirmed outcome is required/i);
  });

  it('rejects an out-of-range Apgar score', () => {
    const repository = new AntenatalRepository({} as any);
    expect(() => (repository as any).mapNewborns([{
      birthWeight: 3200,
      gender: 'male',
      outcome: 'alive',
      apgarScore1min: 11,
    }])).toThrow(/apgar score.*between 0 and 10/i);
  });
});

describe('maternal record integrity', () => {
  it('returns no active booking instead of falling back to a completed pregnancy', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = new AntenatalRepository({ antenatalBooking: { findFirst } } as any);

    await expect(repository.getActiveBookingByPatientId('patient-1')).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { patientId: 'patient-1', isActive: true, isCompleted: false },
    }));
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it('updates the ANC visit seeded by encounter creation rather than inserting a duplicate', async () => {
    const savedVisit = { id: 'visit-1', bookingId: 'booking-1', attendanceId: 'attendance-1' };
    const tx: any = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', patientId: 'patient-1', attendanceType: 'antenatal' }) },
      antenatalBooking: { findUnique: vi.fn().mockResolvedValue({ id: 'booking-1', patientId: 'patient-1', isActive: true, isCompleted: false }) },
      aNCVisit: {
        findUnique: vi.fn().mockResolvedValue({ id: 'visit-1', bookingId: 'booking-1', attendanceId: 'attendance-1' }),
        update: vi.fn().mockResolvedValue(savedVisit),
        create: vi.fn(),
        count: vi.fn(),
      },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new AntenatalRepository(prisma);

    await expect(repository.createVisit({
      bookingId: 'booking-1',
      attendanceId: 'attendance-1',
      visitNumber: 99,
      visitDate: new Date('2026-10-21T10:00:00.000Z'),
      recordedById: 'midwife-1',
      bloodPressure: '120/80',
    })).resolves.toEqual(savedVisit);

    expect(tx.aNCVisit.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'visit-1' },
      data: expect.objectContaining({ bloodPressure: '120/80' }),
    }));
    expect(tx.aNCVisit.create).not.toHaveBeenCalled();
    expect(tx.aNCVisit.count).not.toHaveBeenCalled();
  });

  it('does not create a delivery record when its attendance belongs to another patient', async () => {
    const deliveryCreate = vi.fn();
    const tx: any = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'delivery-attendance', patientId: 'patient-b' }) },
      antenatalBooking: { findUnique: vi.fn() },
      deliveryRecord: { create: deliveryCreate },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new AntenatalRepository(prisma);

    await expect(repository.createDeliveryRecord({
      patientId: 'patient-a',
      attendanceId: 'delivery-attendance',
      deliveryDate: new Date('2026-10-21T10:00:00.000Z'),
      deliveryType: 'spontaneous_vertex',
      deliveryOutcome: 'live_birth',
      createdById: 'midwife-1',
    })).rejects.toThrow(/must match the patient/i);

    expect(deliveryCreate).not.toHaveBeenCalled();
    expect(tx.antenatalBooking.update).toBeUndefined();
  });

  it('closes the matching pregnancy in the same transaction using the actual delivery date and outcome', async () => {
    const deliveryDate = new Date('2026-10-19T08:30:00.000Z');
    const record = { id: 'delivery-1', patientId: 'patient-1', attendanceId: 'attendance-1', deliveryDate, deliveryOutcome: 'stillbirth_fresh' };
    const booking = { id: 'booking-1', patientId: 'patient-1', isActive: true, isCompleted: false };
    const bookingUpdate = vi.fn().mockResolvedValue({});
    const deliveryCreate = vi.fn().mockResolvedValue(record);
    const tx: any = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', patientId: 'patient-1', attendanceType: 'delivery' }) },
      antenatalBooking: {
        findUnique: vi.fn().mockResolvedValue(booking),
        findFirst: vi.fn(),
        update: bookingUpdate,
      },
      deliveryRecord: { create: deliveryCreate },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new AntenatalRepository(prisma);

    await expect(repository.createDeliveryRecord({
      patientId: 'patient-1',
      attendanceId: 'attendance-1',
      antenatalBookingId: 'booking-1',
      deliveryDate,
      deliveryType: 'spontaneous_vertex',
      deliveryOutcome: 'stillbirth_fresh',
      maternalOutcome: 'alive',
      createdById: 'midwife-1',
    })).resolves.toEqual(record);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(bookingUpdate).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: expect.objectContaining({
        isActive: false,
        isCompleted: true,
        deliveryDate,
        deliveryOutcome: 'stillbirth_fresh',
        deliveryRecordId: 'delivery-1',
      }),
    });
  });

  it('does not invent today as the administration date for historical TT/IPTp doses', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'booking-1' });
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma: any = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', patientId: 'patient-1', attendanceType: 'antenatal' }) },
      antenatalBooking: { findFirst, create },
    };
    const repository = new AntenatalRepository(prisma);

    await repository.createBooking({
      patientId: 'patient-1',
      attendanceId: 'attendance-1',
      gravida: 2,
      para: 1,
      lmp: new Date('2026-01-01T00:00:00.000Z'),
      ttDosesGiven: 2,
      iptpDosesGiven: 1,
      createdById: 'midwife-1',
    });

    const payload = create.mock.calls[0][0].data;
    expect(payload.ttDoses.count).toBe(2);
    expect(payload.iptpDoses.count).toBe(1);
    expect(payload.tt1Date).toBeUndefined();
    expect(payload.tt2Date).toBeUndefined();
    expect(payload.iptp1Date).toBeUndefined();
  });
});


describe('maternal update validation', () => {
  it('rejects unsupported maternal outcomes before updating a delivery record', async () => {
    const transaction = vi.fn();
    const repository = new AntenatalRepository({ $transaction: transaction } as any);

    await expect(repository.updateDeliveryRecord('delivery-1', { maternalOutcome: 'unknown-value' }))
      .rejects.toThrow(/unsupported maternal outcome/i);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('accepts a common blood-pressure format and rejects impossible postnatal readings', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'postnatal-1' });
    const repository = new AntenatalRepository({ postnatalRecord: { update } } as any);

    await expect(repository.updatePostnatalRecord('postnatal-1', { bloodPressure: '120 / 80' }))
      .resolves.toEqual({ id: 'postnatal-1' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'postnatal-1' },
      data: { bloodPressure: '120 / 80' },
    }));

    await expect(repository.updatePostnatalRecord('postnatal-1', { bloodPressure: '80/120' }))
      .rejects.toThrow(/plausible systolic\/diastolic/i);
    expect(update).toHaveBeenCalledTimes(1);
  });
});


describe('investigation and procedure status integrity', () => {
  it('rejects unsupported procedure statuses before writing', async () => {
    const procedureUpdate = vi.fn();
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      procedure: { update: procedureUpdate },
    } as any);

    await expect(repository.updateProcedureStatus('procedure-1', 'verified', {}, 'staff-1'))
      .rejects.toThrow(/unsupported procedure status/i);
    expect(procedureUpdate).not.toHaveBeenCalled();
  });

  it('records a procedure entering the in-progress theatre stage', async () => {
    const procedureUpdate = vi.fn().mockResolvedValue({ id: 'procedure-1', status: 'in_progress' });
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      procedure: {
        findUnique: vi.fn().mockResolvedValue({ id: 'procedure-1', status: 'scheduled' }),
        update: procedureUpdate,
      },
    } as any);

    await expect(repository.updateProcedureStatus('procedure-1', 'in_progress', {}, 'staff-1'))
      .resolves.toEqual({ id: 'procedure-1', status: 'in_progress' });
    expect(procedureUpdate).toHaveBeenCalledWith({
      where: { id: 'procedure-1' },
      data: { status: 'in_progress', performedById: 'staff-1' },
    });
  });

  it('rejects unsupported laboratory statuses before writing', async () => {
    const labUpdate = vi.fn();
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      labTest: { update: labUpdate },
    } as any);

    await expect(repository.updateLabTestStatus('lab-1', 'verified', {}, 'staff-1'))
      .rejects.toThrow(/unsupported laboratory order status/i);
    expect(labUpdate).not.toHaveBeenCalled();
  });

  it('prevents a completed scan from being reopened', async () => {
    const scanUpdate = vi.fn();
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      scan: {
        findUnique: vi.fn().mockResolvedValue({ id: 'scan-1', status: 'completed' }),
        update: scanUpdate,
      },
    } as any);

    await expect(repository.updateScanStatus('scan-1', 'in_progress', {}, 'staff-1'))
      .rejects.toThrow(/cannot be reopened or changed/i);
    expect(scanUpdate).not.toHaveBeenCalled();
  });
});


describe('postnatal record creation validation', () => {
  it('rejects impossible maternal observations before starting a database transaction', async () => {
    const transaction = vi.fn();
    const repository = new AntenatalRepository({ $transaction: transaction } as any);

    await expect(repository.createPostnatalRecord({
      examinationDate: new Date(),
      bloodPressure: '80/120',
      attendanceId: 'attendance-1',
      patientId: 'patient-1',
      createdById: 'staff-1',
    } as any)).rejects.toThrow(/plausible systolic\/diastolic/i);

    expect(transaction).not.toHaveBeenCalled();
  });
});
