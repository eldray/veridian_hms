import { describe, expect, it, vi } from 'vitest';
import { EncounterRepository } from '../src/modules/encounter/EncounterRepository';
import { AntenatalRepository } from '../src/modules/antenatal/AntenatalRepository';

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
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', patientId: 'patient-1' }) },
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
