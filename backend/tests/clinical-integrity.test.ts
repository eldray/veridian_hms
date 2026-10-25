import { describe, expect, it, vi } from 'vitest';
import { EncounterRepository, resolvePatientClassification } from '../src/modules/encounter/EncounterRepository';
import { EncounterService } from '../src/modules/encounter/EncounterService';
import { AntenatalRepository } from '../src/modules/antenatal/AntenatalRepository';
import { NursingService } from '../src/modules/nursing/NursingService';
import { NursingRepository } from '../src/modules/nursing/NursingRepository';
import { buildWardChargeAdmissionWhere } from '../src/cron/wardChargeCron';
import { classifyNewbornOutcomes } from '../src/modules/ghsReport/formA';



describe('medication dispensing encounter guard', () => {
  it('does not dispense medication after the encounter has closed', async () => {
    const tx: any = {
      attendance: {
        findUnique: vi.fn().mockResolvedValue({ id: 'enc-1', status: 'discharged' }),
      },
      medication: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      stockItem: { updateMany: vi.fn() },
      stockTransaction: { create: vi.fn() },
    };
    const repository = new EncounterRepository({
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    } as any);
    (repository as any).requireActorId = async () => 'user-1';

    await expect(repository.updateMedication(
      'enc-1', 'med-1', { status: 'dispensed', quantity: 1 }, 'user-1',
    )).rejects.toThrow(/cannot be dispensed for a closed encounter/i);
    expect(tx.medication.findUnique).not.toHaveBeenCalled();
    expect(tx.stockItem.updateMany).not.toHaveBeenCalled();
    expect(tx.stockTransaction.create).not.toHaveBeenCalled();
  });
});

describe('overdue MAR dose transitions', () => {
  it('does not mark doses due for cancelled prescriptions or closed encounters', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const repository = new NursingRepository({ medicationDose: { updateMany } } as any);
    const now = new Date('2026-10-23T12:00:00.000Z');

    await repository.markOverdueAsDue(now);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
        medication: {
          is: {
            status: { not: 'cancelled' },
            Attendance: { is: { status: { notIn: ['discharged', 'referred', 'absconded', 'completed', 'cancelled'] } } },
          },
        },
      },
      data: { status: 'due' },
    });
  });
});

describe('atomic MAR dose writes', () => {
  it('claims only an eligible dose for administration and rejects a lost race', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findUnique = vi.fn().mockResolvedValue({ id: 'dose-1' });
    const prisma: any = { medicationDose: { updateMany, findUnique } };
    const repository = new NursingRepository(prisma);

    await expect(repository.administerDose('dose-1', 'nurse-1', {}))
      .rejects.toThrow(/no longer awaiting administration/i);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'dose-1',
        status: { in: ['scheduled', 'due', 'late'] },
        medication: expect.objectContaining({
          is: expect.objectContaining({
            status: { not: 'cancelled' },
            Attendance: expect.objectContaining({
              is: expect.objectContaining({
                status: { notIn: ['discharged', 'referred', 'absconded', 'completed', 'cancelled'] },
              }),
            }),
          }),
        }),
      }),
    }));
  });

  it('does not record a medication variance after the encounter has closed', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findUnique = vi.fn().mockResolvedValue({ id: 'dose-1' });
    const repository = new NursingRepository({ medicationDose: { updateMany, findUnique } } as any);

    await expect(repository.recordDoseVariance('dose-1', 'nurse-1', { status: 'refused', reason: 'Patient refused' }))
      .rejects.toThrow(/encounter\/prescription is closed/i);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        medication: expect.objectContaining({
          is: expect.objectContaining({
            Attendance: expect.objectContaining({
              is: expect.objectContaining({
                status: { notIn: ['discharged', 'referred', 'absconded', 'completed', 'cancelled'] },
              }),
            }),
          }),
        }),
      }),
    }));
  });
});

describe('auditable admission cancellation', () => {
  const makeTx = (overrides: any = {}) => {
    const attendance = {
      id: 'attendance-1', bedId: 'bed-1', wardId: 'ward-1', status: 'admitted',
      encounterCategory: 'ipd',
      _count: { nursingNotes: 0, nursingTasks: 0, WardChargeRecord: 0, deliveryRecords: 0, proformaInvoices: 0 },
    };
    const admission = {
      id: 'admission-1', attendanceId: 'attendance-1', status: 'active', dischargeDate: null,
      dailyNotes: [], attendance,
      _count: { bills: 0, nursingNotes: 0, nursingTasks: 0, deliveryRecords: 0, proformaInvoices: 0 },
      ...(overrides.admission || {}),
    };
    const tx: any = {
      admission: {
        findUnique: vi.fn().mockResolvedValue(admission),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      attendance: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      bed: {
        findUnique: vi.fn().mockResolvedValue({ id: 'bed-1', wardId: 'ward-1', isOccupied: true }),
        update: vi.fn().mockResolvedValue({ id: 'bed-1', isOccupied: false }),
      },
      ward: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    Object.assign(tx, overrides.tx || {});
    return { tx, admission };
  };

  it('cancels without deleting the admission, returns the active visit to OPD, and releases its bed atomically', async () => {
    const { tx } = makeTx();
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new EncounterRepository(prisma);

    await expect(repository.deleteAdmission('admission-1', 'admin-1', 'Admission entered in error'))
      .resolves.toEqual({
        id: 'admission-1', status: 'cancelled', attendanceStatus: 'pending', encounterCategory: 'opd',
      });

    expect(tx.admission.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'admission-1', status: 'active', dischargeDate: null },
      data: expect.objectContaining({
        status: 'cancelled', cancelledById: 'admin-1', cancellationReason: 'Admission entered in error',
        dailyNotes: [expect.objectContaining({ noteType: 'admission_cancelled', recordedBy: 'admin-1' })],
      }),
    }));
    expect(tx.attendance.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'attendance-1', status: 'admitted', bedId: 'bed-1' },
      data: expect.objectContaining({
        status: 'pending', encounterCategory: 'opd', bedId: null, wardId: null, updatedById: 'admin-1',
      }),
    }));
    expect(tx.admission.findUnique).not.toHaveBeenCalledWith(expect.objectContaining({ delete: expect.anything() }));
    expect(tx.bed.update).toHaveBeenCalledWith({ where: { id: 'bed-1' }, data: { isOccupied: false } });
    expect(tx.ward.updateMany).toHaveBeenCalled();
  });

  it('requires a meaningful cancellation reason before database access', async () => {
    const transaction = vi.fn();
    const repository = new EncounterRepository({ $transaction: transaction } as any);
    await expect(repository.deleteAdmission('admission-1', 'admin-1', '  '))
      .rejects.toThrow(/cancellation reason/i);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('blocks cancellation when inpatient nursing records already exist', async () => {
    const { tx } = makeTx({ admission: {
      _count: { bills: 0, nursingNotes: 1, nursingTasks: 0, deliveryRecords: 0, proformaInvoices: 0 },
    } });
    const repository = new EncounterRepository({ $transaction: vi.fn(async (callback: any) => callback(tx)) } as any);

    await expect(repository.deleteAdmission('admission-1', 'admin-1', 'Entered in error'))
      .rejects.toThrow(/related billing or inpatient-care records/i);
    expect(tx.attendance.updateMany).not.toHaveBeenCalled();
    expect(tx.admission.updateMany).not.toHaveBeenCalled();
  });

  it('does not overwrite a concurrent attendance transition', async () => {
    const { tx } = makeTx();
    tx.attendance.updateMany.mockResolvedValue({ count: 0 });
    const repository = new EncounterRepository({ $transaction: vi.fn(async (callback: any) => callback(tx)) } as any);

    await expect(repository.deleteAdmission('admission-1', 'admin-1', 'Entered in error'))
      .rejects.toThrow(/attendance changed while cancellation/i);
    expect(tx.admission.updateMany).not.toHaveBeenCalled();
  });
});

describe('admission, bed and nursing record consistency', () => {
  it('does not create an encounter against an occupied bed', async () => {
    const tx: any = {
      bed: { findUnique: vi.fn().mockResolvedValue({ id: 'bed-1', wardId: 'ward-1', isOccupied: true, Ward: { id: 'ward-1', isActive: true } }), updateMany: vi.fn() },
      attendance: { findFirst: vi.fn().mockResolvedValue({ id: 'attendance-existing' }), create: vi.fn() },
    };
    const prisma: any = {
      attendance: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
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
    const findFirst = vi.fn().mockResolvedValue(null);
    const deleteMany = vi.fn();
    const repository = new EncounterRepository({ serviceRendered: { findFirst, deleteMany } } as any);

    await expect(repository.removeService('encounter-a', 'service-from-encounter-b'))
      .rejects.toThrow(/not found/i);

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'service-from-encounter-b', attendanceId: 'encounter-a' },
      select: { id: true },
    });
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('does not remove a rendered service from a closed encounter', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'service-a' });
    const deleteMany = vi.fn();
    const attendanceFindUnique = vi.fn().mockResolvedValue({ id: 'encounter-a', status: 'completed' });
    const repository = new EncounterRepository({
      serviceRendered: { findFirst, deleteMany },
      attendance: { findUnique: attendanceFindUnique },
    } as any);

    await expect(repository.removeService('encounter-a', 'service-a'))
      .rejects.toThrow(/closed|open|completed/i);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('does not delete vitals recorded during a closed encounter', async () => {
    const vitalsFindUnique = vi.fn().mockResolvedValue({ id: 'vitals-a', attendanceId: 'encounter-a' });
    const vitalsDeleteMany = vi.fn();
    const attendanceFindUnique = vi.fn().mockResolvedValue({ id: 'encounter-a', status: 'discharged' });
    const repository = new EncounterRepository({
      vitals: { findUnique: vitalsFindUnique, deleteMany: vitalsDeleteMany },
      attendance: { findUnique: attendanceFindUnique },
    } as any);

    await expect(repository.deleteVitals('vitals-a')).rejects.toThrow(/closed encounter/i);
    expect(vitalsDeleteMany).not.toHaveBeenCalled();
  });

  it('does not add a prescription to a closed encounter', async () => {
    const attendanceFindUnique = vi.fn().mockResolvedValue({
      id: 'encounter-a',
      patientId: 'patient-a',
      paymentMode: 'cash',
      insuranceProviderId: null,
      status: 'completed',
    });
    const stockItemFindUnique = vi.fn();
    const repository = new EncounterRepository({
      attendance: { findUnique: attendanceFindUnique },
      stockItem: { findUnique: stockItemFindUnique },
    } as any);
    vi.spyOn(repository, 'requireActorId').mockResolvedValue('user-a');

    await expect(repository.addPrescription('encounter-a', {
      stockItemId: 'medicine-a',
      dosage: '1 tablet',
      frequency: 'twice daily',
      duration: '5 days',
      quantity: 10,
    } as any, 'user-a')).rejects.toThrow(/closed encounter/i);
    expect(stockItemFindUnique).not.toHaveBeenCalled();
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
      data: expect.objectContaining({
        gravida: 3,
        para: 1,
        bloodPressure: '120/80',
        recordedById: 'midwife-1',
      }),
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

  it('rejects negative estimated blood loss before writing a theatre update', async () => {
    const procedureFindUnique = vi.fn();
    const procedureUpdateMany = vi.fn();
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      procedure: { findUnique: procedureFindUnique, updateMany: procedureUpdateMany },
    } as any);

    await expect(repository.updateProcedureStatus('procedure-1', 'in_progress', { bloodLoss: -1 }, 'staff-1'))
      .rejects.toThrow(/estimated blood loss must be a valid non-negative number/i);

    await expect(repository.updateProcedureStatus('procedure-1', 'in_progress', { bloodLoss: '' }, 'staff-1'))
      .rejects.toThrow(/estimated blood loss must be a valid non-negative number/i);

    expect(procedureFindUnique).not.toHaveBeenCalled();
    expect(procedureUpdateMany).not.toHaveBeenCalled();
  });

  it('preserves a documented zero estimated blood loss', async () => {
    const procedureUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const procedureFindUnique = vi.fn()
      .mockResolvedValueOnce({ id: 'procedure-1', attendanceId: 'attendance-1', status: 'scheduled' })
      .mockResolvedValueOnce({ id: 'procedure-1', status: 'in_progress', bloodLoss: 0 });
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'staff-1', isActive: true }) },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'pending' }) },
      procedure: { findUnique: procedureFindUnique, updateMany: procedureUpdateMany },
    } as any);

    await repository.updateProcedureStatus('procedure-1', 'in_progress', { bloodLoss: 0 }, 'staff-1');

    expect(procedureUpdateMany).toHaveBeenCalledWith({
      where: { id: 'procedure-1', status: 'scheduled' },
      data: { bloodLoss: 0, status: 'in_progress', performedById: 'staff-1' },
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
  it('rejects legacy medication administration when the encounter has closed', async () => {
    const medicationLookup = vi.fn();
    const tx: any = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'discharged' }) },
      medication: { findUnique: medicationLookup },
    };
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'nurse-1', isActive: true }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new EncounterRepository(prisma);

    await expect(repository.updateMedication('attendance-1', 'medication-1', {
      status: 'administered',
    }, 'nurse-1')).rejects.toThrow(/closed encounter/i);
    expect(medicationLookup).not.toHaveBeenCalled();
  });

  it('rejects a dose belonging to a different medication', async () => {
    const tx: any = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'admitted' }) },
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
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'admitted' }) },
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
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'admitted' }) },
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
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'admitted' }) },
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
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'in_progress' }) },
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
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'admitted' }) },
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
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'admitted' }) },
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


describe('nursing task encounter lifecycle integrity', () => {
  it('rejects new nursing tasks for a closed encounter', async () => {
    const create = vi.fn();
    const prisma: any = {
      attendance: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ id: 'attendance-1', patientId: 'patient-1' })
          .mockResolvedValueOnce({ id: 'attendance-1', status: 'discharged' }),
      },
      nursingTask: { create },
    };
    const service = new NursingService(prisma);

    await expect(service.createTask({
      patientId: 'patient-1',
      attendanceId: 'attendance-1',
      title: 'Check vital signs',
    } as any, 'nurse-1')).rejects.toThrow(/closed encounter/i);

    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a nursing task linked to a closed admission even if encounter status is stale', async () => {
    const create = vi.fn();
    const prisma: any = {
      attendance: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ id: 'attendance-1', patientId: 'patient-1' })
          .mockResolvedValueOnce({ id: 'attendance-1', status: 'admitted' }),
      },
      admission: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'admission-1',
          attendanceId: 'attendance-1',
          status: 'active',
          dischargeDate: new Date('2026-10-22T10:00:00.000Z'),
          attendance: { patientId: 'patient-1' },
        }),
      },
      nursingTask: { create },
    };
    const service = new NursingService(prisma);

    await expect(service.createTask({
      patientId: 'patient-1',
      attendanceId: 'attendance-1',
      admissionId: 'admission-1',
      title: 'Check vital signs',
    } as any, 'nurse-1')).rejects.toThrow(/closed admission/i);

    expect(create).not.toHaveBeenCalled();
  });

  it('rejects rescheduling or reopening a task for a closed encounter', async () => {
    const update = vi.fn();
    const existingTask = {
      id: 'task-1', patientId: 'patient-1', attendanceId: 'attendance-1', admissionId: null,
      title: 'Check vital signs', status: 'pending', createdById: 'nurse-1',
    };
    const prisma: any = {
      nursingTask: { findUnique: vi.fn().mockResolvedValue(existingTask), update },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'discharged' }) },
    };
    const service = new NursingService(prisma);

    await expect(service.updateTask('task-1', { status: 'in_progress' } as any, 'nurse-1'))
      .rejects.toThrow(/closed encounter/i);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects actionable task changes when the admission is closed but attendance is stale', async () => {
    const update = vi.fn();
    const existingTask = {
      id: 'task-1', patientId: 'patient-1', attendanceId: 'attendance-1', admissionId: 'admission-1',
      title: 'Check vital signs', status: 'pending', createdById: 'nurse-1',
    };
    const prisma: any = {
      nursingTask: { findUnique: vi.fn().mockResolvedValue(existingTask), update },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'admitted' }) },
      admission: { findUnique: vi.fn().mockResolvedValue({
        id: 'admission-1', attendanceId: 'attendance-1', status: 'active', dischargeDate: new Date('2026-10-22T10:00:00.000Z'),
      }) },
    };
    const service = new NursingService(prisma);

    await expect(service.updateTask('task-1', { scheduledAt: '2026-10-23T10:00:00.000Z' } as any, 'nurse-1'))
      .rejects.toThrow(/closed admission/i);
    expect(update).not.toHaveBeenCalled();
  });

  it('creates a nursing task for an active encounter', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'task-1', title: 'Check vital signs' });
    const prisma: any = {
      attendance: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ id: 'attendance-1', patientId: 'patient-1' })
          .mockResolvedValueOnce({ id: 'attendance-1', status: 'admitted' }),
      },
      nursingTask: { create },
    };
    const service = new NursingService(prisma);

    await expect(service.createTask({
      patientId: 'patient-1',
      attendanceId: 'attendance-1',
      title: 'Check vital signs',
    } as any, 'nurse-1')).resolves.toEqual({ id: 'task-1', title: 'Check vital signs' });

    expect(create).toHaveBeenCalledTimes(1);
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


describe('theatre procedure scheduling input validation', () => {
  const makeSchedulingPrisma = () => ({
    user: { findUnique: vi.fn().mockResolvedValue({ id: 'nurse-1', isActive: true }) },
    attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'admitted' }) },
    procedureTemplate: { findUnique: vi.fn().mockResolvedValue({ id: 'template-1', name: 'Minor procedure' }) },
    procedure: { create: vi.fn().mockResolvedValue({ id: 'procedure-1' }) },
  });

  it('rejects an invalid scheduled date before creating a procedure', async () => {
    const prisma: any = makeSchedulingPrisma();
    const repository = new EncounterRepository(prisma);

    await expect(repository.addProcedure('attendance-1', {
      templateId: 'template-1',
      scheduledDate: 'not-a-date',
    }, 'nurse-1')).rejects.toThrow(/procedure scheduled date must be valid/i);

    expect(prisma.procedureTemplate.findUnique).not.toHaveBeenCalled();
    expect(prisma.procedure.create).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1441, 2.5, 'invalid'])('rejects invalid procedure duration %s before creating a procedure', async (duration) => {
    const prisma: any = makeSchedulingPrisma();
    const repository = new EncounterRepository(prisma);

    await expect(repository.addProcedure('attendance-1', {
      templateId: 'template-1',
      duration,
    }, 'nurse-1')).rejects.toThrow(/procedure duration must be between 1 and 1440 minutes/i);

    expect(prisma.procedure.create).not.toHaveBeenCalled();
  });

  it('accepts valid scheduling inputs and preserves an omitted duration', async () => {
    const prisma: any = makeSchedulingPrisma();
    const repository = new EncounterRepository(prisma);
    const scheduledDate = '2026-11-02T10:30:00.000Z';

    await repository.addProcedure('attendance-1', {
      templateId: 'template-1',
      scheduledDate,
      duration: 60,
    }, 'nurse-1');

    expect(prisma.procedure.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        scheduledDate: new Date(scheduledDate),
        duration: 60,
        status: 'scheduled',
      }),
      include: { ProcedureTemplate: true },
    }));
  });
});

describe('theatre procedure safety documentation', () => {
  const validTheatreRecord = {
    identityConfirmed: true,
    procedureAndSiteConfirmed: true,
    consentConfirmed: true,
    consentStatus: 'consented',
    allergyStatusReviewed: true,
    preOpAssessmentCompleted: true,
    instrumentCountsCorrect: true,
    instrumentCountsStatus: 'correct',
    postOpDestination: 'Recovery room',
    postOpPlan: 'Monitor observations and pain; escalate deterioration',
    handoverNotes: 'Handover given to recovery nurse: airway, observations, analgesia and escalation plan reviewed',
    indication: 'Clinical indication documented',
    preOpDiagnosis: 'Pre-operative diagnosis documented',
    operativeSite: 'Documented site',
  };

  const makeProcedurePrisma = () => {
    const prisma: any = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'nurse-1', isActive: true }) },
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'admitted' }) },
      procedure: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ id: 'procedure-1', status: 'in_progress', attendanceId: 'attendance-1' })
          .mockResolvedValue({ id: 'procedure-1', status: 'completed', clinicalRecord: validTheatreRecord }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    return prisma;
  };

  it('blocks completion when mandatory pre-operative safety checks are missing', async () => {
    const prisma = makeProcedurePrisma();
    const repository = new EncounterRepository(prisma);

    await expect(repository.updateProcedureStatus('procedure-1', 'completed', {
      clinicalRecord: { identityConfirmed: true },
    }, 'nurse-1')).rejects.toThrow(/confirm patient identity and the planned procedure\/site/i);

    expect(prisma.procedure.updateMany).not.toHaveBeenCalled();
  });

  it('blocks completion when the receiving-team clinical handover is missing', async () => {
    const prisma = makeProcedurePrisma();
    const repository = new EncounterRepository(prisma);
    const { handoverNotes: _handoverNotes, ...recordWithoutHandover } = validTheatreRecord;

    await expect(repository.updateProcedureStatus('procedure-1', 'completed', {
      clinicalRecord: recordWithoutHandover,
    }, 'nurse-1')).rejects.toThrow(/clinical handover to the receiving recovery or ward team/i);

    expect(prisma.procedure.updateMany).not.toHaveBeenCalled();
  });

  it('rejects non-numeric values in hospital-specific theatre number fields', async () => {
    const prisma = makeProcedurePrisma();
    const repository = new EncounterRepository(prisma);

    await expect(repository.updateProcedureStatus('procedure-1', 'in_progress', {
      clinicalRecord: {
        customProtocolFields: [{ id: 'temperature', label: 'Temperature', type: 'number', value: 'high', required: false }],
      },
    }, 'nurse-1')).rejects.toThrow(/temperature must contain a valid number/i);

    expect(prisma.procedure.updateMany).not.toHaveBeenCalled();
  });

  it('rejects invalid date values in hospital-specific theatre fields', async () => {
    const prisma = makeProcedurePrisma();
    const repository = new EncounterRepository(prisma);

    await expect(repository.updateProcedureStatus('procedure-1', 'in_progress', {
      clinicalRecord: {
        customProtocolFields: [{ id: 'date', label: 'Date', type: 'date', value: '2026-02-31', required: false }],
      },
    }, 'nurse-1')).rejects.toThrow(/date must contain a valid date/i);
    expect(prisma.procedure.updateMany).not.toHaveBeenCalled();
  });

  it('rejects invalid time values in hospital-specific theatre fields', async () => {
    const prisma = makeProcedurePrisma();
    const repository = new EncounterRepository(prisma);

    await expect(repository.updateProcedureStatus('procedure-1', 'in_progress', {
      clinicalRecord: {
        customProtocolFields: [{ id: 'time', label: 'Start time', type: 'time', value: '27:61', required: false }],
      },
    }, 'nurse-1')).rejects.toThrow(/start time must contain a valid time/i);

    expect(prisma.procedure.updateMany).not.toHaveBeenCalled();
  });

  it('persists the structured theatre record when all mandatory checks are documented', async () => {
    const prisma = makeProcedurePrisma();
    const repository = new EncounterRepository(prisma);

    await repository.updateProcedureStatus('procedure-1', 'completed', {
      clinicalRecord: validTheatreRecord,
      anesthesiaNotes: 'Spinal anaesthesia; monitoring documented',
      intraOperativeNotes: 'Procedure details documented',
      postOperativeNotes: 'Recovery plan documented',
      bloodLoss: 100,
      outcome: 'successful',
    }, 'nurse-1');

    expect(prisma.procedure.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'procedure-1', status: 'in_progress' },
      data: expect.objectContaining({
        status: 'completed',
        clinicalRecord: validTheatreRecord,
        anesthesiaNotes: 'Spinal anaesthesia; monitoring documented',
        bloodLoss: 100,
      }),
    }));
  });
});


describe('ward charge admission date eligibility', () => {
  it('charges only admissions active on the requested date and excludes cancelled stays', () => {
    const start = new Date('2026-10-23T00:00:00.000Z');
    const end = new Date('2026-10-23T23:59:59.999Z');

    expect(buildWardChargeAdmissionWhere(start, end)).toEqual({
      status: 'active',
      cancelledAt: null,
      admissionDate: { lte: end },
      OR: [
        { dischargeDate: null },
        { dischargeDate: { gte: start } },
      ],
      attendance: { is: { status: 'admitted' } },
    });
  });
});


describe('maternal clinical record deletion integrity', () => {
  it('preserves ANC visit history and reports missing visits clearly', async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: 'anc-visit-1' });
    const deleteRecord = vi.fn();
    const repository = new AntenatalRepository({
      aNCVisit: { findUnique, delete: deleteRecord },
    } as any);

    await expect(repository.deleteVisit('anc-visit-1'))
      .rejects.toThrow(/cannot be physically deleted.*clinical record/i);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'anc-visit-1' }, select: { id: true },
    });
    expect(deleteRecord).not.toHaveBeenCalled();

    findUnique.mockResolvedValueOnce(null);
    await expect(repository.deleteVisit('missing-visit'))
      .rejects.toThrow(/ANC visit.*not found/i);
  });

  it('preserves postnatal history and reports missing records clearly', async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: 'pnc-1' });
    const deleteRecord = vi.fn();
    const repository = new AntenatalRepository({
      postnatalRecord: { findUnique, delete: deleteRecord },
    } as any);

    await expect(repository.deletePostnatalRecord('pnc-1'))
      .rejects.toThrow(/cannot be physically deleted.*clinical record/i);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'pnc-1' }, select: { id: true },
    });
    expect(deleteRecord).not.toHaveBeenCalled();

    findUnique.mockResolvedValueOnce(null);
    await expect(repository.deletePostnatalRecord('missing-pnc'))
      .rejects.toThrow(/Postnatal record.*not found/i);
  });
});


describe('postnatal pregnancy and delivery linkage integrity', () => {
  it('rejects a booking and delivery record that belong to different pregnancy links', async () => {
    const booking = {
      id: 'booking-1', patientId: 'patient-1', deliveryRecordId: 'delivery-other',
    };
    const delivery = {
      id: 'delivery-2', patientId: 'patient-1', attendanceId: 'delivery-attendance-2',
      antenatalBookingId: 'booking-1',
    };
    const create = vi.fn();
    const tx = {
      attendance: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'postnatal-attendance', patientId: 'patient-1', attendanceType: 'postnatal',
        }),
      },
      antenatalBooking: { findUnique: vi.fn().mockResolvedValue(booking) },
      deliveryRecord: { findUnique: vi.fn().mockResolvedValue(delivery) },
      postnatalRecord: { create },
    };
    const prisma = {
      attendance: { findUnique: vi.fn().mockResolvedValue({
        id: 'postnatal-attendance', patientId: 'patient-1', attendanceType: 'postnatal',
      }) },
      antenatalBooking: { findUnique: vi.fn().mockResolvedValue(booking) },
      deliveryRecord: { findUnique: vi.fn().mockResolvedValue(delivery) },
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'midwife-1' }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const repository = new AntenatalRepository(prisma as any);

    await expect(repository.createPostnatalRecord({
      patientId: 'patient-1',
      attendanceId: 'postnatal-attendance',
      createdById: 'midwife-1',
      antenatalBookingId: 'booking-1',
      deliveryRecordId: 'delivery-2',
      examinationDate: new Date('2026-10-20T10:00:00.000Z'),
    } as any)).rejects.toThrow(/already linked to a different delivery record/i);

    expect(create).not.toHaveBeenCalled();
  });
});


describe('newborn follow-up preservation during delivery edits', () => {
  it('updates birth details in place without overwriting neonatal follow-up fields', async () => {
    const newbornUpdate = vi.fn();
    const newbornCreate = vi.fn();
    const deliveryUpdate = vi.fn().mockResolvedValue({
      id: 'delivery-1',
      Newborn: [{ id: 'baby-1', order: 1, birthWeight: 3300, babyWeightAt6to10Days: 2800 }],
    });
    const tx = {
      deliveryRecord: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'delivery-1', patientId: 'patient-1', deliveryDate: new Date('2026-10-20'),
          deliveryOutcome: 'live_birth', antenatalBookingId: null,
        }),
        update: deliveryUpdate,
      },
      newbornRecord: {
        findFirst: vi.fn().mockResolvedValue({ id: 'baby-1', order: 1 }),
        update: newbornUpdate,
        create: newbornCreate,
      },
    };
    const repository = new AntenatalRepository({
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    } as any);

    await repository.updateDeliveryRecord('delivery-1', {
      Newborn: [{ order: 1, birthWeight: 3300, gender: 'female', outcome: 'alive' }],
    });

    expect(newbornUpdate).toHaveBeenCalledWith({
      where: { id: 'baby-1' },
      data: expect.objectContaining({ birthWeight: 3300, outcome: 'alive' }),
    });
    const updateData = newbornUpdate.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty('babyWeightAt6to10Days');
    expect(updateData).not.toHaveProperty('weightAt6to10DaysDate');
    expect(newbornCreate).not.toHaveBeenCalled();
    expect(deliveryUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ Newborn: expect.anything() }),
    }));
  });

  it('does not delete existing newborns when an edit submits an empty newborn list', async () => {
    const newbornUpdate = vi.fn();
    const newbornCreate = vi.fn();
    const deliveryUpdate = vi.fn().mockResolvedValue({ id: 'delivery-1', Newborn: [{ id: 'baby-1' }] });
    const tx = {
      deliveryRecord: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'delivery-1', patientId: 'patient-1', deliveryDate: new Date('2026-10-20'),
          deliveryOutcome: 'live_birth', antenatalBookingId: null,
        }),
        update: deliveryUpdate,
      },
      newbornRecord: { findFirst: vi.fn(), update: newbornUpdate, create: newbornCreate },
    };
    const repository = new AntenatalRepository({
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    } as any);

    await repository.updateDeliveryRecord('delivery-1', { Newborn: [] });

    expect(tx.newbornRecord.findFirst).not.toHaveBeenCalled();
    expect(newbornUpdate).not.toHaveBeenCalled();
    expect(newbornCreate).not.toHaveBeenCalled();
    expect(deliveryUpdate).toHaveBeenCalled();
  });
});


describe('GHS Form A newborn outcome classification', () => {
  it('classifies mixed outcomes individually for a multiple birth', () => {
    const result = classifyNewbornOutcomes('live_birth', [
      { order: 1, outcome: 'alive' },
      { order: 2, outcome: 'stillbirth_fresh' },
      { order: 3, outcome: 'stillbirth_macerated' },
    ]);
    expect(result.map(x => [x.stillborn, x.fresh, x.died])).toEqual([
      [false, false, null],
      [true, true, null],
      [true, false, null],
    ]);
  });

  it('keeps legacy delivery-level stillbirth classification when newborns have no per-baby stillbirth type', () => {
    const result = classifyNewbornOutcomes('stillbirth_macerated', [
      { order: 1, outcome: 'alive' },
      { order: 2, outcome: 'alive' },
    ]);
    expect(result.map(x => [x.stillborn, x.fresh])).toEqual([
      [true, false],
      [true, false],
    ]);
  });

  it('classifies neonatal deaths by the recorded newborn outcome', () => {
    const result = classifyNewbornOutcomes('live_birth', [
      { order: 1, outcome: 'dead_within_24hrs' },
      { order: 2, outcome: 'dead_8_28days' },
    ]);
    expect(result.map(x => x.died)).toEqual(['early', 'late']);
  });
});



describe('consumable stock changes on closed encounters', () => {
  const closedEncounterTx = () => ({
    attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'enc-1', status: 'discharged' }) },
    user: { findUnique: vi.fn() },
    stockTransaction: { findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    stockItem: { findUnique: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    stockBatch: { count: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
  });

  it('rejects recording consumable use after encounter closure before stock changes', async () => {
    const tx = closedEncounterTx();
    const repository = new EncounterRepository({ $transaction: vi.fn(async (callback: any) => callback(tx)) } as any);
    (repository as any).requireActorId = vi.fn().mockResolvedValue('user-1');
    (repository as any).requireEncounterId = vi.fn().mockResolvedValue('enc-1');

    await expect(repository.recordConsumableUse('enc-1', 'item-1', 1, undefined, 'user-1'))
      .rejects.toThrow(/closed encounter/i);
    expect(tx.stockItem.updateMany).not.toHaveBeenCalled();
    expect(tx.stockTransaction.create).not.toHaveBeenCalled();
  });

  it('rejects editing consumable use after encounter closure before stock changes', async () => {
    const tx = closedEncounterTx();
    const repository = new EncounterRepository({ $transaction: vi.fn(async (callback: any) => callback(tx)) } as any);
    (repository as any).requireActorId = vi.fn().mockResolvedValue('user-1');
    (repository as any).requireEncounterId = vi.fn().mockResolvedValue('enc-1');

    await expect(repository.updateConsumableUse('enc-1', 'txn-1', 'item-1', 2, undefined, 'user-1'))
      .rejects.toThrow(/closed encounter/i);
    expect(tx.stockTransaction.findFirst).not.toHaveBeenCalled();
    expect(tx.stockItem.updateMany).not.toHaveBeenCalled();
  });

  it('rejects deleting consumable use after encounter closure before stock changes', async () => {
    const tx = closedEncounterTx();
    const repository = new EncounterRepository({ $transaction: vi.fn(async (callback: any) => callback(tx)) } as any);
    (repository as any).requireActorId = vi.fn().mockResolvedValue('user-1');
    (repository as any).requireEncounterId = vi.fn().mockResolvedValue('enc-1');

    await expect(repository.deleteConsumableUse('enc-1', 'txn-1', 'user-1'))
      .rejects.toThrow(/closed encounter/i);
    expect(tx.stockTransaction.findFirst).not.toHaveBeenCalled();
    expect(tx.stockItem.update).not.toHaveBeenCalled();
  });
});

describe('diagnosis changes on closed encounters', () => {
  it('rejects adding a diagnosis after the encounter is closed', async () => {
    const diagnosisLookup = vi.fn();
    const tx = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', encounterCategory: 'opd', status: 'discharged' }) },
      diagnosis: { findUnique: diagnosisLookup },
      attendanceDiagnosis: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    };
    const repository = new EncounterRepository({
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'clinician-1' }) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    } as any);
    (repository as any).requireActorId = vi.fn().mockResolvedValue('clinician-1');

    await expect(repository.addDiagnosis('attendance-1', {
      diagnosisId: 'diagnosis-1', diagnosisType: 'additional', classification: 'NEW_DIAGNOSIS',
    } as any, 'clinician-1')).rejects.toThrow(/diagnoses cannot be changed for a closed encounter/i);
    expect(diagnosisLookup).not.toHaveBeenCalled();
    expect(tx.attendanceDiagnosis.create).not.toHaveBeenCalled();
  });

  it('rejects removing a diagnosis after the encounter is closed', async () => {
    const diagnosisLookup = vi.fn();
    const tx = {
      attendance: { findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', status: 'discharged' }) },
      attendanceDiagnosis: { findFirst: diagnosisLookup, deleteMany: vi.fn() },
    };
    const repository = new EncounterRepository({ $transaction: vi.fn(async (callback: any) => callback(tx)) } as any);

    await expect(repository.removeDiagnosis('attendance-1', 'diagnosis-1'))
      .rejects.toThrow(/diagnoses cannot be changed for a closed encounter/i);
    expect(diagnosisLookup).not.toHaveBeenCalled();
    expect(tx.attendanceDiagnosis.deleteMany).not.toHaveBeenCalled();
  });
});


describe('encounter discharge workflow integrity', () => {
  it('routes discharge through the guarded admission workflow', async () => {
    const repository = new EncounterRepository({
      attendance: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'attendance-1', Admission: { id: 'admission-1' },
        }),
      },
    } as any);
    const updateAdmission = vi.fn().mockResolvedValue({
      id: 'admission-1', dischargeDate: new Date('2026-10-25T10:00:00.000Z'),
    });
    (repository as any).updateAdmission = updateAdmission;

    const result = await repository.dischargeFromEncounter('attendance-1', {
      dischargeDate: '2026-10-25T10:00:00.000Z',
      dischargeStatus: 'home',
      dischargeSummary: 'Stable on discharge',
    }, 'clinician-1');

    expect(updateAdmission).toHaveBeenCalledWith('admission-1', {
      dischargeDate: '2026-10-25T10:00:00.000Z',
      dischargeStatus: 'home',
      dischargeSummary: 'Stable on discharge',
    }, 'clinician-1');
    expect(result.dischargeDate).toEqual(new Date('2026-10-25T10:00:00.000Z'));
  });

  it('does not discharge an encounter that has no admission record', async () => {
    const repository = new EncounterRepository({
      attendance: {
        findUnique: vi.fn().mockResolvedValue({ id: 'attendance-1', Admission: null }),
      },
    } as any);
    const updateAdmission = vi.fn();
    (repository as any).updateAdmission = updateAdmission;

    await expect(repository.dischargeFromEncounter('attendance-1', {}, 'clinician-1'))
      .rejects.toThrow(/no admission record to discharge/i);
    expect(updateAdmission).not.toHaveBeenCalled();
  });
});


describe('daily notes on closed admissions', () => {
  it('rejects daily notes after discharge without updating the admission', async () => {
    const update = vi.fn();
    const tx = {
      admission: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'admission-1',
          dischargeDate: new Date('2026-10-24T10:00:00.000Z'),
          dailyNotes: [],
          attendance: { id: 'attendance-1', status: 'discharged' },
        }),
        update,
      },
    };
    const repository = new EncounterRepository({
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    } as any);

    await expect(repository.addDailyNotes('admission-1', { notes: 'late note' }, 'clinician-1'))
      .rejects.toThrow(/daily notes cannot be added to a closed admission/i);
    expect(update).not.toHaveBeenCalled();
  });

  it('appends a daily note for an open admission', async () => {
    const update = vi.fn().mockImplementation(({ data }: any) => ({ id: 'admission-1', ...data }));
    const tx = {
      admission: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'admission-1', dischargeDate: null, dailyNotes: [],
          attendance: { id: 'attendance-1', status: 'admitted' },
        }),
        update,
      },
    };
    const repository = new EncounterRepository({
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    } as any);

    const result = await repository.addDailyNotes('admission-1', { notes: 'Patient reviewed' }, 'clinician-1');
    expect(update).toHaveBeenCalledOnce();
    expect(result.note.notes).toBe('Patient reviewed');
    expect(result.admission.dailyNotes).toHaveLength(1);
  });
});
