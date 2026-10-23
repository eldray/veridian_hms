import { describe, expect, it, vi } from 'vitest';
import { EncounterRepository, resolvePatientClassification } from '../src/modules/encounter/EncounterRepository';
import { EncounterService } from '../src/modules/encounter/EncounterService';
import { AntenatalRepository } from '../src/modules/antenatal/AntenatalRepository';
import { NursingService } from '../src/modules/nursing/NursingService';

describe('admission, bed and nursing record consistency', () => {
  it('does not create an encounter against an occupied bed', async () => {
    const tx: any = {
      bed: { findUnique: vi.fn().mockResolvedValue({ id: 'bed-1', wardId: 'ward-1', isOccupied: true, Ward: { id: 'ward-1', isActive: true } }), updateMany: vi.fn() },
      attendance: { findFirst: vi.fn().mockResolvedValue({ id: 'attendance-existing' }), create: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const service = new EncounterService(prisma);

    await expect(service.createEncounter({
      patientId: 'patient-new', attendanceType: 'general_consultation', paymentMode: 'cash',
      encounterCategory: 'ipd', bedId: 'bed-1', wardId: 'ward-1', admissionType: 'emergency',
    }, 'records-1')).rejects.toThrow(/already occupied/i);
    expect(tx.attendance.create).not.toHaveBeenCalled();
    expect(tx.bed.updateMany).not.toHaveBeenCalled();
  });

  it('returns an existing admission idempotently instead of creating a duplicate', async () => {
    const existingAdmission = { id: 'admission-1', attendanceId: 'attendance-1', admissionNumber: 'ADM-1001' };
    const tx: any = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'admitted', Admission: existingAdmission }) },
      admission: { findUnique: vi.fn().mockResolvedValue(existingAdmission), create: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const service = new EncounterService(prisma);

    await expect(service.createFormalAdmission({ attendanceId: 'attendance-1' }, 'admin-1')).resolves.toEqual(existingAdmission);
    expect(tx.admission.create).not.toHaveBeenCalled();
  });

  it('rejects assigning a bed that is already occupied before creating an admission', async () => {
    const tx: any = {
      attendance: {
        findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', patientId: 'patient-1', status: 'pending', bedId: 'bed-1', wardId: 'ward-1', Admission: null, Bed: null }),
        findFirst: vi.fn().mockResolvedValue({ id: 'attendance-other' }),
        update: vi.fn(),
      },
      bed: {
        findUnique: vi.fn().mockResolvedValue({ id: 'bed-1', wardId: 'ward-1', isOccupied: true, Ward: { id: 'ward-1', isActive: true } }),
        updateMany: vi.fn(),
      },
      ward: { update: vi.fn() },
      admission: { create: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const service = new EncounterService(prisma);

    await expect(service.createFormalAdmission({ attendanceId: 'attendance-1' }, 'admin-1'))
      .rejects.toThrow(/already assigned/i);
    expect(tx.admission.create).not.toHaveBeenCalled();
    expect(tx.attendance.update).not.toHaveBeenCalled();
  });

  it('closes the admission and releases its bed when discharging an inpatient encounter', async () => {
    const admission = { id: 'admission-1', dischargeDate: null, dailyNotes: [{ noteType: 'observation', notes: 'Stable' }] };
    const tx: any = {
      attendance: {
        findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'admitted', bedId: 'bed-1', wardId: 'ward-1', Admission: admission, Patient: { surname: 'Test', otherNames: 'Patient' } }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      admission: { update: vi.fn().mockResolvedValue({}) },
      bed: { findUnique: vi.fn().mockResolvedValue({ id: 'bed-1', wardId: 'ward-1', isOccupied: true }), update: vi.fn().mockResolvedValue({}) },
      ward: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      notification: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const service = new EncounterService(prisma);

    const result = await service.dischargeFromEncounter('attendance-1', {
      dischargeStatus: 'home', dischargeSummary: 'Stable for discharge',
    }, 'nurse-1');

    expect(result.message).toBe('Patient discharged successfully');
    expect(tx.attendance.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'attendance-1', status: 'admitted' }, data: expect.objectContaining({ status: 'discharged', bedId: null }) }));
    expect(tx.admission.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'admission-1' },
      data: expect.objectContaining({ dischargeStatus: 'home', dailyNotes: expect.arrayContaining([
        expect.objectContaining({ noteType: 'discharge', notes: expect.stringContaining('Stable for discharge'), createdBy: 'nurse-1' }),
      ]) }),
    }));
    expect(tx.bed.update).toHaveBeenCalledWith({ where: { id: 'bed-1' }, data: { isOccupied: false } });
    expect(tx.ward.updateMany).toHaveBeenCalledWith({ where: { id: 'ward-1', occupiedBeds: { gt: 0 } }, data: { occupiedBeds: { decrement: 1 } } });
  });

  it('prevents another nurse from deleting a care task they did not create', async () => {
    const prisma: any = {};
    const service = new NursingService(prisma);
    const repository = {
      findTaskById: vi.fn().mockResolvedValue({ id: 'task-1', createdById: 'nurse-a' }),
      deleteTask: vi.fn(),
    };
    (service as any).repository = repository;

    await expect(service.deleteTask('task-1', { userId: 'nurse-b', role: 'nurse' }))
      .rejects.toThrow(/task creator or an admin/i);
    expect(repository.deleteTask).not.toHaveBeenCalled();
  });

  it('blocks medication administration after the encounter is closed', async () => {
    const prisma: any = { attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'discharged' }) } };
    const service = new NursingService(prisma);
    const repository = {
      findDoseById: vi.fn().mockResolvedValue({ id: 'dose-1', status: 'due', medication: { status: 'dispensed', attendanceId: 'attendance-1' } }),
      administerDose: vi.fn(),
    };
    (service as any).repository = repository;

    await expect(service.administerDose('dose-1', 'nurse-1', {})).rejects.toThrow(/closed encounter/i);
    expect(repository.administerDose).not.toHaveBeenCalled();
  });

  it('also releases the bed when discharge is saved through the admission update endpoint', async () => {
    const tx: any = {
      admission: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'admission-1', attendanceId: 'attendance-1', dischargeDate: null, dailyNotes: [],
          attendance: { id: 'attendance-1', bedId: 'bed-1', wardId: 'ward-1', status: 'admitted' },
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'admission-1' }),
      },
      attendance: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findFirst: vi.fn().mockResolvedValue(null) },
      bed: { findUnique: vi.fn().mockResolvedValue({ id: 'bed-1', wardId: 'ward-1', isOccupied: true }), update: vi.fn() },
      ward: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new EncounterRepository(prisma);

    await repository.updateAdmission('admission-1', { dischargeDate: '2026-10-22T10:00:00.000Z', dischargeStatus: 'home' }, 'admin-1');

    expect(tx.attendance.updateMany).toHaveBeenCalledWith({
      where: { id: 'attendance-1', status: 'admitted' },
      data: { status: 'discharged', bedId: null, updatedById: 'admin-1' },
    });
    expect(tx.admission.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'admission-1', dischargeDate: null },
      data: expect.objectContaining({ dischargeStatus: 'home', dischargeDate: new Date('2026-10-22T10:00:00.000Z') }),
    }));
    expect(tx.bed.update).toHaveBeenCalledWith({ where: { id: 'bed-1' }, data: { isOccupied: false } });
    expect(tx.ward.updateMany).toHaveBeenCalledWith({ where: { id: 'ward-1', occupiedBeds: { gt: 0 } }, data: { occupiedBeds: { decrement: 1 } } });
  });

  it('rejects a nursing note when its attendance belongs to a different patient', async () => {
    const prisma: any = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', patientId: 'patient-other' }) },
      admission: { findUnique: vi.fn() },
      nursingNote: { create: vi.fn() },
    };
    const service = new NursingService(prisma);

    await expect(service.createNote({
      patientId: 'patient-1', attendanceId: 'attendance-1', content: 'Routine observation',
    }, 'nurse-1')).rejects.toThrow(/different patient/i);
    expect(prisma.nursingNote.create).not.toHaveBeenCalled();
  });
});

describe('facility-level patient classification', () => {
  it('classifies the first non-cancelled encounter as NEW', () => {
    expect(resolvePatientClassification(undefined, false)).toBe('NEW');
  });

  it('classifies a patient with a prior non-cancelled encounter as OLD', () => {
    expect(resolvePatientClassification(undefined, true)).toBe('OLD');
  });

  it('preserves an explicit valid classification and rejects invalid values', () => {
    expect(resolvePatientClassification('NEW', true)).toBe('NEW');
    expect(resolvePatientClassification('OLD', false)).toBe('OLD');
    expect(() => resolvePatientClassification('RETURNING' as any, false)).toThrow(/invalid patient classification/i);
  });
});

describe('OPD clinical record finalization', () => {
  it('does not treat one isolated measurement as a complete vital-sign section', async () => {
    const tx = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'doctor-1', role: 'doctor', isActive: true }) },
      attendance: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'attendance-1',
          finalizedAt: null,
          complaints: 'Headache',
          historyPresentingComplaint: 'Headache for two days',
          assessment: 'Likely tension headache',
          treatmentPlan: 'Hydration and review if worse',
          clinicalOutcome: 'stable',
          providerId: 'doctor-1',
          reviewOfSystems: { neurological: 'No weakness' },
          physicalExamination: 'Alert, no distress',
          physicalExamStructured: { neurological: 'No focal deficit' },
          allergyReviewStatus: 'no_known_allergies',
          allergyReviewNotes: null,
          Vitals: [{ bloodPressure: null, temperature: null, pulse: null, respiration: null, spo2: null, weight: 60, height: null, muac: null }],
          Patient: { allergies: [] },
        }),
        update: vi.fn(),
      },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'doctor-1', isActive: true }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new EncounterRepository(prisma as any);

    await expect(repository.finalizeClinicalRecord('attendance-1', 'doctor-1'))
      .rejects.toThrow(/core vital signs/i);
    expect(tx.attendance.update).not.toHaveBeenCalled();
  });

  it('refuses finalization by non-clinical staff before reading the encounter', async () => {
    const findEncounter = vi.fn();
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'admin-1', role: 'admin', isActive: true }) },
      $transaction: vi.fn(async (callback: any) => callback({
        user: { findUnique: vi.fn().mockResolvedValue({ id: 'admin-1', role: 'admin', isActive: true }) },
        attendance: { findUnique: findEncounter, update: vi.fn() },
      })),
    };
    const repository = new EncounterRepository(prisma as any);

    await expect(repository.finalizeClinicalRecord('attendance-1', 'admin-1'))
      .rejects.toThrow(/only an active doctor, nurse, or midwife/i);
    expect(findEncounter).not.toHaveBeenCalled();
  });

  it('refuses to finalize when mandatory clinical documentation is missing', async () => {
    const update = vi.fn();
    const tx = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'doctor-1', role: 'doctor', isActive: true }) },
      attendance: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'attendance-1',
          finalizedAt: null,
          complaints: '',
          historyPresentingComplaint: null,
          assessment: null,
          treatmentPlan: null,
          clinicalOutcome: null,
          providerId: null,
          reviewOfSystems: {},
          physicalExamination: null,
          physicalExamStructured: {},
          allergyReviewStatus: 'not_reviewed',
          allergyReviewNotes: null,
          Vitals: [],
        }),
        update,
      },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'doctor-1', isActive: true }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new EncounterRepository(prisma as any);

    await expect(repository.finalizeClinicalRecord('attendance-1', 'doctor-1'))
      .rejects.toThrow(/cannot finalize clinical record/i);
    expect(update).not.toHaveBeenCalled();
  });
});

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

  it('rejects implausible fetal heart rates outside the ANC clinical range', () => {
    const repository = new EncounterRepository({} as any);
    expect(() => (repository as any).validateClinicalVitalValues({ fetalHeartRate: 20 }))
      .toThrow(/fetal heart rate must be between 60 and 200/i);
    expect(() => (repository as any).validateClinicalVitalValues({ fetalHeartRate: 140 }))
      .not.toThrow();
  });
});

describe('HMIS diagnosis classification validation', () => {
  it('requires case classification for OPD diagnoses', async () => {
    const findDiagnosis = vi.fn();
    const tx = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', encounterCategory: 'opd' }) },
      diagnosis: { findUnique: findDiagnosis },
    };
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'doctor-1', isActive: true }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    } as any);

    await expect(repository.addDiagnosis('attendance-1', {
      diagnosisId: 'diagnosis-1',
      diagnosisType: 'primary',
    }, 'doctor-1')).rejects.toThrow(/classification is required for opd diagnoses/i);

    expect(findDiagnosis).not.toHaveBeenCalled();
  });

  it('rejects an invalid new/old case classification before database writes', async () => {
    const transaction = vi.fn();
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'doctor-1', isActive: true }) },
      $transaction: transaction,
    } as any);

    await expect(repository.addDiagnosis('attendance-1', {
      diagnosisId: 'diagnosis-1',
      diagnosisType: 'primary',
      classification: 'NOT_A_CLASSIFICATION' as any,
    }, 'doctor-1')).rejects.toThrow(/invalid hmis diagnosis classification/i);

    expect(transaction).not.toHaveBeenCalled();
  });
});

describe('clinical encounter ownership', () => {
  it('does not cancel a lab order that belongs to another encounter', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const updateMany = vi.fn();
    const repository = new EncounterRepository({ labTest: { findFirst, updateMany } } as any);

    await expect(repository.removeLabTest('encounter-a', 'lab-from-encounter-b'))
      .rejects.toThrow(/not found/i);

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'lab-from-encounter-b', attendanceId: 'encounter-a' },
      select: { id: true, status: true },
    });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not cancel a scan that belongs to another encounter', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const updateMany = vi.fn();
    const repository = new EncounterRepository({ scan: { findFirst, updateMany } } as any);

    await expect(repository.removeScan('encounter-a', 'scan-from-encounter-b'))
      .rejects.toThrow(/not found/i);

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'scan-from-encounter-b', attendanceId: 'encounter-a' },
      select: { id: true, status: true },
    });
    expect(updateMany).not.toHaveBeenCalled();
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

describe('postnatal create/update validation consistency', () => {
  it('accepts the same vital and newborn measurement ranges on update as on creation', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'postnatal-1' });
    const repository = new AntenatalRepository({ postnatalRecord: { update } } as any);

    await expect(repository.updatePostnatalRecord('postnatal-1', {
      temperature: 25,
      pulse: 0,
      fundalHeight: 60,
      babyWeight: 15,
      babyTemperature: 26,
    })).resolves.toEqual({ id: 'postnatal-1' });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'postnatal-1' },
      data: {
        temperature: 25,
        pulse: 0,
        fundalHeight: 60,
        babyWeight: 15,
        babyTemperature: 26,
      },
      include: {
        patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true,
          },
        },
        deliveryRecord: true,
      },
    });
  });

  it('rejects out-of-range fundal-height and newborn-weight values on update', async () => {
    const update = vi.fn();
    const repository = new AntenatalRepository({ postnatalRecord: { update } } as any);

    await expect(repository.updatePostnatalRecord('postnatal-1', { fundalHeight: 80 }))
      .rejects.toThrow(/fundal height must be between 0 and 60/i);
    await expect(repository.updatePostnatalRecord('postnatal-1', { babyWeight: 18 }))
      .rejects.toThrow(/baby weight must be between 0.1 and 15/i);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects newborn temperature outside the same range used at creation', async () => {
    const update = vi.fn();
    const repository = new AntenatalRepository({ postnatalRecord: { update } } as any);

    await expect(repository.updatePostnatalRecord('postnatal-1', {
      babyTemperature: 20,
    })).rejects.toThrow(/baby temperature must be between 25 and 45/i);
    expect(update).not.toHaveBeenCalled();
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

  it('accepts a clinically plausible newborn weight in grams through delivery creation', async () => {
    const deliveryDate = new Date('2026-10-20T08:30:00.000Z');
    const record = { id: 'delivery-weight-1', patientId: 'patient-1', attendanceId: 'attendance-1' };
    const create = vi.fn().mockResolvedValue(record);
    const tx: any = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', patientId: 'patient-1', attendanceType: 'delivery' }) },
      antenatalBooking: { findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn() },
      deliveryRecord: { create },
    };
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'midwife-1' }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new AntenatalRepository(prisma);

    await expect(repository.createDeliveryRecord({
      patientId: 'patient-1',
      attendanceId: 'attendance-1',
      attendant: 'midwife-1',
      deliveryDate,
      deliveryType: 'spontaneous_vertex',
      deliveryOutcome: 'live_birth',
      maternalOutcome: 'alive',
      createdById: 'midwife-1',
      Newborn: [{ birthWeight: 3200, gender: 'female', outcome: 'alive' }],
    } as any)).resolves.toEqual(record);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        Newborn: { create: [expect.objectContaining({ birthWeight: 3200 })] },
      }),
    }));
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

describe('ANC visit clinical field validation', () => {
  it('rejects para that reaches gravida when only para is updated', async () => {
    const update = vi.fn();
    const findUnique = vi.fn().mockResolvedValue({
      id: 'visit-1',
      gravida: 2,
      para: 0,
      booking: { gravida: 2, para: 0 },
    });
    const repository = new AntenatalRepository({
      aNCVisit: { findUnique, update },
    } as any);

    await expect(repository.updateVisit('visit-1', { para: 2 }))
      .rejects.toThrow(/para must be less than gravida/i);
    expect(update).not.toHaveBeenCalled();
  });

  it('allows IPTp dose numbers above five up to ten on ANC visits', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'visit-1', iptpDoseNumber: 6 });
    const repository = new AntenatalRepository({
      aNCVisit: { update },
    } as any);

    await expect(repository.updateVisit('visit-1', { iptpDoseNumber: 6 }))
      .resolves.toEqual({ id: 'visit-1', iptpDoseNumber: 6 });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'visit-1' },
      data: { iptpDoseNumber: 6 },
    }));
  });

  it('rejects IPTp dose numbers above the supported upper bound', async () => {
    const update = vi.fn();
    const repository = new AntenatalRepository({
      aNCVisit: { update },
    } as any);

    await expect(repository.updateVisit('visit-1', { iptpDoseNumber: 11 }))
      .rejects.toThrow(/iptp dose number must be between 1 and 10/i);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('maternal record integrity', () => {
  it('rejects parity equal to gravidity for an ongoing pregnancy before database access', async () => {
    const userFindUnique = vi.fn();
    const repository = new AntenatalRepository({ user: { findUnique: userFindUnique } } as any);

    await expect(repository.createBooking({
      patientId: 'patient-1',
      attendanceId: 'attendance-1',
      gravida: 2,
      para: 2,
      lmp: new Date('2026-01-01T00:00:00.000Z'),
      createdById: 'midwife-1',
    } as any)).rejects.toThrow(/para must be a whole number from 0 to less than gravida/i);

    expect(userFindUnique).not.toHaveBeenCalled();
  });

  it('returns no active booking instead of falling back to a completed pregnancy', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = new AntenatalRepository({ antenatalBooking: { findFirst } } as any);

    await expect(repository.getActiveBookingByPatientId('patient-1')).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { patientId: 'patient-1', isActive: true, isCompleted: false },
    }));
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid gravida/para values for an ANC visit before database access', async () => {
    const transaction = vi.fn();
    const repository = new AntenatalRepository({ $transaction: transaction } as any);

    await expect(repository.createVisit({
      bookingId: 'booking-1', attendanceId: 'attendance-1', visitNumber: 1,
      visitDate: new Date('2026-10-21T10:00:00.000Z'), recordedById: 'midwife-1',
      gravida: 2, para: 2,
    })).rejects.toThrow(/para must be less than gravida/i);

    expect(transaction).not.toHaveBeenCalled();
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
      gravida: 3,
      para: 1,
      bloodPressure: '120/80',
    })).resolves.toEqual(savedVisit);

    expect(tx.aNCVisit.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'visit-1' },
      data: expect.objectContaining({ gravida: 3, para: 1, bloodPressure: '120/80' }),
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
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'midwife-1' }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new AntenatalRepository(prisma);

    await expect(repository.createDeliveryRecord({
      patientId: 'patient-a',
      attendanceId: 'delivery-attendance',
      attendant: 'midwife-1',
      deliveryDate: new Date('2026-10-21T10:00:00.000Z'),
      deliveryType: 'spontaneous_vertex',
      deliveryOutcome: 'live_birth',
      createdById: 'midwife-1',
    })).rejects.toThrow(/must match the patient/i);

    expect(deliveryCreate).not.toHaveBeenCalled();
    expect(tx.antenatalBooking.update).toBeUndefined();
  });

  it('closes the automatically selected active ANC booking when no booking ID is submitted', async () => {
    const deliveryDate = new Date('2026-10-20T08:30:00.000Z');
    const booking = { id: 'active-booking-1', patientId: 'patient-1', isActive: true, isCompleted: false };
    const record = { id: 'delivery-auto-1', patientId: 'patient-1', attendanceId: 'attendance-1', antenatalBookingId: booking.id, deliveryDate, deliveryOutcome: 'live_birth' };
    const bookingUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const bookingFindFirst = vi.fn().mockResolvedValue(booking);
    const deliveryCreate = vi.fn().mockResolvedValue(record);
    const tx: any = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', patientId: 'patient-1', attendanceType: 'delivery' }) },
      antenatalBooking: {
        findUnique: vi.fn(),
        findFirst: bookingFindFirst,
        updateMany: bookingUpdateMany,
      },
      deliveryRecord: { create: deliveryCreate },
    };
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'midwife-1' }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new AntenatalRepository(prisma);

    await expect(repository.createDeliveryRecord({
      patientId: 'patient-1',
      attendanceId: 'attendance-1',
      attendant: 'midwife-1',
      deliveryDate,
      deliveryType: 'spontaneous_vertex',
      deliveryOutcome: 'live_birth',
      maternalOutcome: 'alive',
      createdById: 'midwife-1',
    })).resolves.toEqual(record);

    expect(bookingFindFirst).toHaveBeenCalledWith({
      where: { patientId: 'patient-1', isActive: true, isCompleted: false },
      orderBy: { bookingDate: 'desc' },
    });
    expect(bookingUpdateMany).toHaveBeenCalledWith({
      where: { id: booking.id, patientId: 'patient-1', isActive: true, isCompleted: false },
      data: expect.objectContaining({
        isActive: false,
        isCompleted: true,
        deliveryDate,
        deliveryOutcome: 'live_birth',
        deliveryRecordId: record.id,
      }),
    });
  });

  it('closes the matching pregnancy in the same transaction using the actual delivery date and outcome', async () => {
    const deliveryDate = new Date('2026-10-19T08:30:00.000Z');
    const record = { id: 'delivery-1', patientId: 'patient-1', attendanceId: 'attendance-1', deliveryDate, deliveryOutcome: 'stillbirth_fresh' };
    const booking = { id: 'booking-1', patientId: 'patient-1', isActive: true, isCompleted: false };
    const bookingUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const deliveryCreate = vi.fn().mockResolvedValue(record);
    const tx: any = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', patientId: 'patient-1', attendanceType: 'delivery' }) },
      antenatalBooking: {
        findUnique: vi.fn().mockResolvedValue(booking),
        findFirst: vi.fn(),
        updateMany: bookingUpdateMany,
      },
      deliveryRecord: { create: deliveryCreate },
    };
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'midwife-1' }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new AntenatalRepository(prisma);

    await expect(repository.createDeliveryRecord({
      patientId: 'patient-1',
      attendanceId: 'attendance-1',
      attendant: 'midwife-1',
      antenatalBookingId: 'booking-1',
      deliveryDate,
      deliveryType: 'spontaneous_vertex',
      deliveryOutcome: 'stillbirth_fresh',
      maternalOutcome: 'alive',
      createdById: 'midwife-1',
    })).resolves.toEqual(record);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(bookingUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'booking-1',
        patientId: 'patient-1',
        isActive: true,
        isCompleted: false,
      },
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
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'midwife-1' }) },
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
      itnGiven: true,
      createdById: 'midwife-1',
    });

    const payload = create.mock.calls[0][0].data;
    expect(payload.ttDoses.count).toBe(2);
    expect(payload.iptpDoses.count).toBe(1);
    expect(payload.tt1Date).toBeUndefined();
    expect(payload.tt2Date).toBeUndefined();
    expect(payload.iptp1Date).toBeUndefined();
    expect(payload.itnGivenDate).toBeUndefined();
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
    const procedureUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const procedureFindUnique = vi.fn()
      .mockResolvedValueOnce({ id: 'procedure-1', attendanceId: 'attendance-1', status: 'scheduled' })
      .mockResolvedValueOnce({ id: 'procedure-1', status: 'in_progress' });
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'pending' }) },
      procedure: {
        findUnique: procedureFindUnique,
        updateMany: procedureUpdateMany,
      },
    } as any);

    await expect(repository.updateProcedureStatus('procedure-1', 'in_progress', {}, 'staff-1'))
      .resolves.toEqual({ id: 'procedure-1', status: 'in_progress' });
    expect(procedureUpdateMany).toHaveBeenCalledWith({
      where: { id: 'procedure-1', status: 'scheduled' },
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
      .rejects.toThrow(/completed scan report is locked/i);
    expect(scanUpdate).not.toHaveBeenCalled();
  });
});


describe('postnatal record creation validation', () => {
  it('rejects impossible maternal observations before starting a database transaction', async () => {
    const transaction = vi.fn();
    const repository = new AntenatalRepository({
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', patientId: 'patient-1', attendanceType: 'postnatal' }) },
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1' }) },
      $transaction: transaction,
    } as any);

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


describe('ANC danger-sign and referral completeness', () => {
  it('requires danger-sign details before creating an ANC visit', async () => {
    const transaction = vi.fn();
    const repository = new AntenatalRepository({ $transaction: transaction } as any);
    await expect(repository.createVisit({
      visitDate: new Date(), attendanceId: 'attendance-1', bookingId: 'booking-1',
      recordedById: 'midwife-1', dangerSignsPresent: true, dangerSignsList: [],
    } as any)).rejects.toThrow(/at least one danger sign/i);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('requires a referral destination when an ANC visit is marked referred', async () => {
    const transaction = vi.fn();
    const repository = new AntenatalRepository({ $transaction: transaction } as any);
    await expect(repository.createVisit({
      visitDate: new Date(), attendanceId: 'attendance-1', bookingId: 'booking-1',
      recordedById: 'midwife-1', referralMade: true, referredTo: '  ',
    } as any)).rejects.toThrow(/referral destination/i);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects an ANC follow-up date earlier than a historical visit', async () => {
    const repository = new AntenatalRepository({
      aNCVisit: { findUnique: vi.fn().mockResolvedValue({ visitDate: new Date('2026-10-10T12:00:00.000Z'), nextVisitDate: null }) },
    } as any);
    const visitDate = new Date('2026-10-10T12:00:00.000Z');
    const nextVisitDate = new Date('2026-10-09T12:00:00.000Z');
    await expect(repository.updateVisit('visit-1', { visitDate, nextVisitDate } as any))
      .rejects.toThrow(/cannot be before the ANC visit date/i);
  });
});


describe('medication administration integrity', () => {
  it('rejects a dose belonging to a different medication', async () => {
    const tx: any = {
      medication: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'medication-1', attendanceId: 'attendance-1', status: 'dispensed',
          quantity: 1, stockItemId: null, StockItem: null,
        }),
        update: vi.fn().mockResolvedValue({ id: 'medication-1', status: 'administered' }),
      },
      medicationDose: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'dose-2', medicationId: 'medication-2', status: 'due',
        }),
      },
    };
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'nurse-1', isActive: true }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new EncounterRepository(prisma);

    await expect(repository.updateMedication('attendance-1', 'medication-1', {
      status: 'administered', doseId: 'dose-2',
    }, 'nurse-1')).rejects.toThrow(/does not belong to this medication/i);
  });

  it('rejects a non-positive or fractional medication quantity before writing', async () => {
    const tx: any = {
      medication: { findUnique: vi.fn().mockResolvedValue({
        id: 'medication-1', attendanceId: 'attendance-1', status: 'prescribed',
        quantity: 1, stockItemId: null, StockItem: null,
      }) },
    };
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'nurse-1', isActive: true }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new EncounterRepository(prisma);

    await expect(repository.updateMedication('attendance-1', 'medication-1', {
      quantity: 1.5,
    }, 'nurse-1')).rejects.toThrow(/positive whole number/i);
  });

  it('does not allow administration before dispensing', async () => {
    const update = vi.fn();
    const tx: any = {
      medication: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'medication-1', attendanceId: 'attendance-1', status: 'prescribed',
          quantity: 1, stockItemId: null, StockItem: null,
        }),
        update,
      },
    };
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'nurse-1', isActive: true }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new EncounterRepository(prisma);

    await expect(repository.updateMedication('attendance-1', 'medication-1', {
      status: 'administered',
    }, 'nurse-1')).rejects.toThrow(/must be dispensed before administration/i);
    expect(update).not.toHaveBeenCalled();
  });

  it('does not allow an administered medication to be reset to prescribed', async () => {
    const update = vi.fn();
    const tx: any = {
      medication: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'medication-1', attendanceId: 'attendance-1', status: 'administered',
          quantity: 1, stockItemId: null, StockItem: null,
        }),
        update,
      },
    };
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'nurse-1', isActive: true }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new EncounterRepository(prisma);

    await expect(repository.updateMedication('attendance-1', 'medication-1', {
      status: 'prescribed',
    }, 'nurse-1')).rejects.toThrow(/administered medication cannot be reset/i);
    expect(update).not.toHaveBeenCalled();
  });

});


describe('postnatal referral completeness', () => {
  it('rejects future examination dates before database writes', async () => {
    const transaction = vi.fn();
    const repository = new AntenatalRepository({ $transaction: transaction } as any);
    await expect(repository.createPostnatalRecord({
      examinationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      attendanceId: 'attendance-1', patientId: 'patient-1', createdById: 'midwife-1',
    } as any)).rejects.toThrow(/examination date cannot be in the future/i);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('requires a referral destination for a postnatal referral', async () => {
    const transaction = vi.fn();
    const repository = new AntenatalRepository({
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', patientId: 'patient-1', attendanceType: 'postnatal' }) },
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'midwife-1' }) },
      $transaction: transaction,
    } as any);
    await expect(repository.createPostnatalRecord({
      examinationDate: new Date(), attendanceId: 'attendance-1', patientId: 'patient-1',
      createdById: 'midwife-1', referralMade: true, referredTo: '  ',
    } as any)).rejects.toThrow(/referral destination/i);
    expect(transaction).not.toHaveBeenCalled();
  });
});


describe('historical postnatal follow-up dates', () => {
  it('allows a past follow-up date when it is after the historical examination date', async () => {
    const examDate = new Date('2026-10-10T09:00:00.000Z');
    const nextDate = new Date('2026-10-15T09:00:00.000Z');
    const update = vi.fn().mockResolvedValue({ id: 'postnatal-1' });
    const repository = new AntenatalRepository({
      postnatalRecord: {
        findUnique: vi.fn().mockResolvedValue({ examinationDate: examDate, nextVisitDate: null }),
        update,
      },
    } as any);

    await expect(repository.updatePostnatalRecord('postnatal-1', {
      nextVisitDate: nextDate,
    })).resolves.toEqual({ id: 'postnatal-1' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'postnatal-1' },
      data: { nextVisitDate: nextDate },
    }));
  });
});


describe('primary diagnosis update atomicity', () => {
  it('does not demote the existing primary diagnosis when a duplicate is submitted', async () => {
    const updateMany = vi.fn();
    const existingDiagnosis = { id: 'link-1', attendanceId: 'attendance-1', diagnosisId: 'diagnosis-1', diagnosisType: 'primary' };
    const tx: any = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1' }) },
      diagnosis: { findUnique: vi.fn().mockResolvedValue({ id: 'diagnosis-1', icdCode: 'A09' }) },
      attendanceDiagnosis: {
        findFirst: vi.fn().mockResolvedValue(existingDiagnosis),
        updateMany,
        create: vi.fn(),
      },
    };
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'doctor-1', isActive: true }) },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1' }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new EncounterRepository(prisma);

    await expect(repository.addDiagnosis('attendance-1', {
      diagnosisId: 'diagnosis-1', diagnosisType: 'primary',
    } as any, 'doctor-1')).rejects.toThrow(/diagnosis has already been added/i);

    expect(updateMany).not.toHaveBeenCalled();
    expect(tx.attendanceDiagnosis.create).not.toHaveBeenCalled();
  });
});


describe('completed investigation cancellation protection', () => {
  it('does not cancel a completed laboratory order', async () => {
    const updateMany = vi.fn();
    const repository = new EncounterRepository({
      labTest: { findFirst: vi.fn().mockResolvedValue({ id: 'lab-1', status: 'completed' }), updateMany },
    } as any);
    await expect(repository.removeLabTest('attendance-1', 'lab-1'))
      .rejects.toThrow(/completed or cancelled/i);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not cancel a completed scan', async () => {
    const updateMany = vi.fn();
    const repository = new EncounterRepository({
      scan: { findFirst: vi.fn().mockResolvedValue({ id: 'scan-1', status: 'completed' }), updateMany },
    } as any);
    await expect(repository.removeScan('attendance-1', 'scan-1'))
      .rejects.toThrow(/completed or cancelled/i);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not cancel a completed procedure', async () => {
    const updateMany = vi.fn();
    const repository = new EncounterRepository({
      procedure: { findFirst: vi.fn().mockResolvedValue({ id: 'procedure-1', status: 'completed' }), updateMany },
    } as any);
    await expect(repository.removeProcedure('attendance-1', 'procedure-1'))
      .rejects.toThrow(/completed or cancelled/i);
    expect(updateMany).not.toHaveBeenCalled();
  });
});


describe('completed clinical record edit protection', () => {
  it('locks completed laboratory results from ordinary edits', async () => {
    const update = vi.fn();
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      labTest: { findUnique: vi.fn().mockResolvedValue({ id: 'lab-1', status: 'completed' }), update },
    } as any);
    await expect(repository.updateLabTestStatus('lab-1', 'completed', { result: 'changed' }, 'staff-1'))
      .rejects.toThrow(/completed laboratory result is locked/i);
    expect(update).not.toHaveBeenCalled();
  });

  it('locks completed procedure records from ordinary edits', async () => {
    const update = vi.fn();
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      procedure: { findUnique: vi.fn().mockResolvedValue({ id: 'procedure-1', status: 'completed' }), update },
    } as any);
    await expect(repository.updateProcedureStatus('procedure-1', 'completed', { notes: 'changed' }, 'staff-1'))
      .rejects.toThrow(/completed procedure record is locked/i);
    expect(update).not.toHaveBeenCalled();
  });
});


describe('primary diagnosis removal protection', () => {
  it('requires a replacement primary diagnosis before removing one from a multi-diagnosis encounter', async () => {
    const deleteMany = vi.fn();
    const tx: any = {
      attendanceDiagnosis: {
        findFirst: vi.fn().mockResolvedValue({ id: 'link-1', diagnosisType: 'primary' }),
        count: vi.fn().mockResolvedValue(1),
        deleteMany,
      },
    };
    const repository = new EncounterRepository({
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    } as any);

    await expect(repository.removeDiagnosis('attendance-1', 'diagnosis-1'))
      .rejects.toThrow(/assign another diagnosis as primary/i);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});


describe('ANC partial-update clinical completeness', () => {
  it('does not allow clearing danger-sign details while danger signs remain marked present', async () => {
    const repository = new AntenatalRepository({
      aNCVisit: {
        findUnique: vi.fn().mockResolvedValue({
          dangerSignsPresent: true, dangerSignsList: ['vaginal_bleeding'],
          referralMade: false, referredTo: null,
        }),
      },
    } as any);
    await expect(repository.updateVisit('visit-1', { dangerSignsList: [] } as any))
      .rejects.toThrow(/at least one danger sign/i);
  });

  it('does not allow clearing the destination of an existing referral', async () => {
    const repository = new AntenatalRepository({
      aNCVisit: {
        findUnique: vi.fn().mockResolvedValue({
          dangerSignsPresent: false, dangerSignsList: [],
          referralMade: true, referredTo: 'Tamale Teaching Hospital',
        }),
      },
    } as any);
    await expect(repository.updateVisit('visit-1', { referredTo: '  ' } as any))
      .rejects.toThrow(/referral destination/i);
  });
});


describe('encounter status workflow guards', () => {
  it('rejects direct status changes that bypass the dedicated workflow', async () => {
    const findUnique = vi.fn();
    const repository = new EncounterRepository({ attendance: { findUnique } } as any);
    await expect(repository.updateStatus('attendance-1', 'discharged', 'doctor-1'))
      .rejects.toThrow(/dedicated admission, completion, discharge/i);
    expect(findUnique).not.toHaveBeenCalled();
  });
});


describe('medication administration requires a due dose', () => {
  it('does not mark a medication administered when no scheduled dose exists', async () => {
    const medicationUpdate = vi.fn();
    const tx: any = {
      medication: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'medication-1', attendanceId: 'attendance-1', status: 'dispensed',
          quantity: 1, stockItemId: null, StockItem: null,
        }),
        update: medicationUpdate,
      },
      medicationDose: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'nurse-1', isActive: true }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new EncounterRepository(prisma);

    await expect(repository.updateMedication('attendance-1', 'medication-1', {
      status: 'administered',
    }, 'nurse-1')).rejects.toThrow(/no scheduled medication dose/i);
    expect(medicationUpdate).not.toHaveBeenCalled();
  });
});


describe('maternal booking history retention', () => {
  it('deactivates an antenatal booking instead of deleting its clinical history', async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: 'booking-1' });
    const update = vi.fn().mockResolvedValue({ id: 'booking-1', isActive: false });
    const repository = new AntenatalRepository({
      antenatalBooking: { findUnique, update },
    } as any);

    await repository.deleteBooking('booking-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: { isActive: false },
    });
  });

  it('reports a missing booking rather than silently succeeding', async () => {
    const update = vi.fn();
    const repository = new AntenatalRepository({
      antenatalBooking: {
        findUnique: vi.fn().mockResolvedValue(null),
        update,
      },
    } as any);

    await expect(repository.deleteBooking('missing-booking')).rejects.toThrow(/not found/i);
    expect(update).not.toHaveBeenCalled();
  });
});


describe('medication administration schedule parsing', () => {
  it('supports common Ghanaian prescription abbreviations without changing the prescribed frequency', () => {
    const service = new NursingService({} as any);
    expect((service as any).parseFrequency('BD')).toEqual({ intervalHours: 12, dosesPerDay: 2 });
    expect((service as any).parseFrequency('TDS')).toEqual({ intervalHours: 8, dosesPerDay: 3 });
    expect((service as any).parseFrequency('every 8 hours')).toEqual({ intervalHours: 8, dosesPerDay: 3 });
    expect((service as any).parseFrequency('q6h')).toEqual({ intervalHours: 6, dosesPerDay: 4 });
  });

  it('rejects an unknown frequency instead of silently scheduling it once daily', () => {
    const service = new NursingService({} as any);
    expect(() => (service as any).parseFrequency('three-ish times')).toThrow(/unsupported medication frequency/i);
  });

  it('rejects zero-hour intervals and unreasonable durations', () => {
    const service = new NursingService({} as any);
    expect(() => (service as any).parseFrequency('every 0 hours')).toThrow(/interval must be between 1 and 24/i);
    expect(() => (service as any).parseDurationDays('400 days')).toThrow(/between 1 and 365 days/i);
  });

  it('uses the recorded prescription time for the first scheduled dose', () => {
    const service = new NursingService({} as any);
    const prescribedAt = new Date('2026-10-21T10:37:00.000Z');
    expect((service as any).parseSchedule('STAT', '1 day', prescribedAt).firstDoseAt)
      .toEqual(prescribedAt);
  });
});


describe('prescription and MAR atomicity', () => {
  it('rejects unsupported frequency before creating a prescription', async () => {
    const transaction = vi.fn();
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'doctor-1', isActive: true }) },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1' }) },
      stockItem: { findUnique: vi.fn().mockResolvedValue({ id: 'stock-1', name: 'Paracetamol' }) },
      serviceCatalog: { findUnique: vi.fn().mockResolvedValue({ id: 'service-1', serviceType: 'medication' }) },
      $transaction: transaction,
    } as any);

    await expect(repository.addPrescription('attendance-1', {
      stockItemId: 'stock-1', serviceCatalogId: 'service-1', dosage: '500 mg',
      frequency: 'three-ish times', duration: '5 days',
    } as any, 'doctor-1')).rejects.toThrow(/unsupported medication frequency/i);
    expect(transaction).not.toHaveBeenCalled();
  });
});


describe('ANC booking closure requires a confirmed outcome', () => {
  it('does not invent a delivery date or assume the pregnancy outcome', async () => {
    const update = vi.fn();
    const repository = new AntenatalRepository({
      antenatalBooking: {
        findUnique: vi.fn().mockResolvedValue({ id: 'booking-1' }),
        update,
      },
    } as any);

    await expect(repository.closeBooking('booking-1', {}))
      .rejects.toThrow(/confirmed pregnancy outcome date is required/i);
    await expect(repository.closeBooking('booking-1', {
      deliveryDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    })).rejects.toThrow(/confirmed pregnancy outcome is required/i);
    expect(update).not.toHaveBeenCalled();
  });

  it('closes a booking only with the explicitly recorded outcome and date', async () => {
    const deliveryDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const update = vi.fn().mockResolvedValue({ id: 'booking-1', isActive: false, isCompleted: true });
    const repository = new AntenatalRepository({
      antenatalBooking: {
        findUnique: vi.fn().mockResolvedValue({ id: 'booking-1' }),
        update,
      },
    } as any);

    await repository.closeBooking('booking-1', { deliveryDate, deliveryOutcome: 'live_birth' });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'booking-1' },
      data: expect.objectContaining({
        isActive: false, isCompleted: true, deliveryDate, deliveryOutcome: 'live_birth',
      }),
    }));
  });
});


describe('delivery record correction validation', () => {
  it('rejects future delivery dates before opening a transaction', async () => {
    const transaction = vi.fn();
    const repository = new AntenatalRepository({ $transaction: transaction } as any);

    await expect(repository.updateDeliveryRecord('delivery-1', {
      deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })).rejects.toThrow(/cannot be in the future/i);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects unsupported places of delivery before writing', async () => {
    const transaction = vi.fn();
    const repository = new AntenatalRepository({ $transaction: transaction } as any);

    await expect(repository.updateDeliveryRecord('delivery-1', {
      placeOfDelivery: 'somewhere-unknown',
    })).rejects.toThrow(/unsupported place of delivery/i);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects empty delivery updates instead of accepting a no-op', async () => {
    const transaction = vi.fn();
    const repository = new AntenatalRepository({ $transaction: transaction } as any);

    await expect(repository.updateDeliveryRecord('delivery-1', {}))
      .rejects.toThrow(/no supported delivery record fields/i);

    expect(transaction).not.toHaveBeenCalled();
  });
});


describe('prescription cancellation integrity', () => {
  it('does not cancel an already dispensed medication without a return or correction workflow', async () => {
    const medicationUpdate = vi.fn();
    const doseUpdateMany = vi.fn();
    const tx: any = {
      medication: {
        findFirst: vi.fn().mockResolvedValue({ id: 'med-1', status: 'dispensed' }),
        update: medicationUpdate,
      },
      medicationDose: { updateMany: doseUpdateMany },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new EncounterRepository(prisma);

    await expect(repository.removeMedication('attendance-1', 'med-1'))
      .rejects.toThrow(/dispensed or administered medication cannot be removed/i);

    expect(medicationUpdate).not.toHaveBeenCalled();
    expect(doseUpdateMany).not.toHaveBeenCalled();
  });

  it('does not cancel an administered medication through ordinary removal', async () => {
    const medicationUpdate = vi.fn();
    const tx: any = {
      medication: {
        findFirst: vi.fn().mockResolvedValue({ id: 'med-1', status: 'administered' }),
        update: medicationUpdate,
      },
      medicationDose: { updateMany: vi.fn() },
    };
    const repository = new EncounterRepository({ $transaction: vi.fn(async (callback: any) => callback(tx)) } as any);

    await expect(repository.removeMedication('attendance-1', 'med-1'))
      .rejects.toThrow(/dispensed or administered medication cannot be removed/i);
    expect(medicationUpdate).not.toHaveBeenCalled();
  });
});


describe('delivery-to-ANC booking link integrity', () => {
  it('refuses to reassign a delivery already linked to a completed pregnancy booking', async () => {
    const deliveryUpdate = vi.fn();
    const bookingLookup = vi.fn();
    const bookingUpdate = vi.fn();
    const tx = {
      deliveryRecord: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'delivery-1', patientId: 'patient-1', deliveryDate: new Date('2026-10-10T10:00:00.000Z'),
          deliveryOutcome: 'live_birth', antenatalBookingId: 'booking-1',
        }),
        update: deliveryUpdate,
      },
      antenatalBooking: { findUnique: bookingLookup, update: bookingUpdate },
    };
    const repository = new AntenatalRepository({
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    } as any);

    await expect(repository.updateDeliveryRecord('delivery-1', { antenatalBookingId: 'booking-2' }))
      .rejects.toThrow(/cannot be reassigned or unlinked/i);

    expect(bookingLookup).not.toHaveBeenCalled();
    expect(deliveryUpdate).not.toHaveBeenCalled();
    expect(bookingUpdate).not.toHaveBeenCalled();
  });

  it('refuses to clear an existing delivery-to-ANC booking link', async () => {
    const deliveryUpdate = vi.fn();
    const tx = {
      deliveryRecord: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'delivery-1', patientId: 'patient-1', deliveryDate: new Date('2026-10-10T10:00:00.000Z'),
          deliveryOutcome: 'live_birth', antenatalBookingId: 'booking-1',
        }),
        update: deliveryUpdate,
      },
      antenatalBooking: { findUnique: vi.fn(), update: vi.fn() },
    };
    const repository = new AntenatalRepository({
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    } as any);

    await expect(repository.updateDeliveryRecord('delivery-1', { antenatalBookingId: null }))
      .rejects.toThrow(/cannot be reassigned or unlinked/i);
    expect(deliveryUpdate).not.toHaveBeenCalled();
  });
});


describe('postnatal attendance type consistency', () => {
  it('allows a postnatal assessment to be recorded during a delivery attendance', async () => {
    const attendance = { id: 'delivery-attendance', patientId: 'patient-1', attendanceType: 'delivery' };
    const create = vi.fn().mockResolvedValue({ id: 'postnatal-1', attendanceId: attendance.id });
    const tx = {
      attendance: { findUnique: vi.fn().mockResolvedValue(attendance) },
      postnatalRecord: { create },
    };
    const prisma = {
      attendance: { findUnique: vi.fn().mockResolvedValue(attendance) },
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'midwife-1' }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new AntenatalRepository(prisma as any);

    await expect(repository.createPostnatalRecord({
      patientId: 'patient-1', attendanceId: attendance.id, createdById: 'midwife-1',
      examinationDate: new Date('2026-10-20T10:00:00.000Z'),
    } as any)).resolves.toEqual({ id: 'postnatal-1', attendanceId: attendance.id });

    expect(create).toHaveBeenCalledTimes(1);
  });
});


describe('postnatal referral partial-update integrity', () => {
  it('rejects explicitly clearing the destination of an existing referral', async () => {
    const update = vi.fn();
    const repository = new AntenatalRepository({
      postnatalRecord: {
        findUnique: vi.fn().mockResolvedValue({
          referralMade: true, referredTo: 'Tamale Teaching Hospital',
        }),
        update,
      },
    } as any);

    await expect(repository.updatePostnatalRecord('postnatal-1', {
      referredTo: null,
    })).rejects.toThrow(/referral destination/i);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('delivery record deletion integrity', () => {
  it('rejects deleting a delivery record linked to maternal or newborn clinical records', async () => {
    const deleteRecord = vi.fn();
    const findUnique = vi.fn().mockResolvedValue({
      id: 'delivery-1',
      antenatalBookingId: 'booking-1',
      antenatalBooking: { id: 'booking-1' },
      postnatalRecords: [],
      Newborn: [],
    });
    const repository = new AntenatalRepository({
      deliveryRecord: { findUnique, delete: deleteRecord },
    } as any);

    await expect(repository.deleteDeliveryRecord('delivery-1'))
      .rejects.toThrow(/approved clinical correction workflow/i);

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'delivery-1' },
      select: {
        id: true,
        antenatalBookingId: true,
        antenatalBooking: { select: { id: true } },
        postnatalRecords: { select: { id: true }, take: 1 },
        Newborn: { select: { id: true }, take: 1 },
      },
    });
    expect(deleteRecord).not.toHaveBeenCalled();
  });

  it('deletes an unlinked delivery record', async () => {
    const deleteRecord = vi.fn().mockResolvedValue({ id: 'delivery-2' });
    const repository = new AntenatalRepository({
      deliveryRecord: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'delivery-2',
          antenatalBookingId: null,
          antenatalBooking: null,
          postnatalRecords: [],
          Newborn: [],
        }),
        delete: deleteRecord,
      },
    } as any);

    await expect(repository.deleteDeliveryRecord('delivery-2')).resolves.toBeUndefined();
    expect(deleteRecord).toHaveBeenCalledWith({ where: { id: 'delivery-2' } });
  });
});



describe('newborn update validation consistency', () => {
  it('rejects unsupported newborn gender values before database access', () => {
    const repository = new AntenatalRepository({} as any);

    expect(() => (repository as any).mapNewborns([{
      birthWeight: 3200,
      gender: 'unknown-gender',
      outcome: 'alive',
    }])).toThrow(/invalid gender/i);
  });

  it('rejects duplicate newborn birth orders for both create and update mapping', () => {
    const repository = new AntenatalRepository({} as any);

    expect(() => (repository as any).mapNewborns([
      { birthWeight: 3200, gender: 'female', outcome: 'alive', order: 1 },
      { birthWeight: 2800, gender: 'male', outcome: 'alive', order: 1 },
    ])).toThrow(/unique birth order/i);
  });
});
