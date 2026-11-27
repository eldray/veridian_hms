import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/CounterService', () => ({
  getCounterService: () => ({ nextPatientNumber: () => 'PAT-TEST-001' }),
}));

import { PatientService } from '../src/modules/patient/PatientService';
import { ValidationError } from '../src/utils/errors';

function withTransaction(models: Record<string, any>) {
  const tx = {
    ...models,
    $queryRawUnsafe: vi.fn().mockResolvedValue([{ locked: 1 }]),
    auditLog: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  };
  return {
    ...models,
    $transaction: vi.fn(async (callback: (tx: any) => Promise<any>) => callback(tx)),
  };
}

const validPatient = {
  folderNumber: 'PAT-CLINICAL-001',
  surname: 'Test',
  otherNames: 'Patient',
  gender: 'female',
  dateOfBirth: '1990-01-01',
  contact: '0200000000',
  address: 'Tamale',
};

describe('patient clinical history registration', () => {
  it('ignores forged patient identity and registration metadata on create', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'server-patient-id' });
    const prisma = withTransaction({
      patient: { findUnique: vi.fn().mockResolvedValue(null), create },
    });
    const service = new PatientService(prisma as any);

    await service.createPatient({
      ...validPatient,
      id: 'forged-patient-id',
      registeredBy: 'forged-recorder',
      registeredAt: '2000-01-01T00:00:00.000Z',
      createdAt: '2000-01-01T00:00:00.000Z',
      updatedAt: '2000-01-01T00:00:00.000Z',
      allergies: [{
        id: 'forged-allergy-id',
        patientId: 'another-patient',
        allergen: 'Penicillin',
        reaction: 'Rash',
      }],
    } as any, 'staff-1');

    const data = create.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('id');
    expect(data).not.toHaveProperty('createdAt');
    expect(data).not.toHaveProperty('updatedAt');
    expect(data.registeredBy).toBe('system');
    expect(data.registeredAt).toBeInstanceOf(Date);
    expect(data.allergies.create).toEqual([{
      allergen: 'Penicillin',
      reaction: 'Rash',
    }]);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('ignores forged patient identity and registration metadata on update', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'patient-1' });
    const prisma = withTransaction({
      patient: {
        findUnique: vi.fn().mockResolvedValue({ id: 'patient-1', ...validPatient }),
        update,
      },
    });
    const service = new PatientService(prisma as any);

    await service.updatePatient('patient-1', {
      surname: 'Updated',
      id: 'another-patient',
      registeredBy: 'forged-recorder',
      registeredAt: '2000-01-01T00:00:00.000Z',
      createdAt: '2000-01-01T00:00:00.000Z',
      updatedAt: '2000-01-01T00:00:00.000Z',
    } as any, 'staff-1');

    const data = update.mock.calls[0][0].data;
    expect(data.surname).toBe('Updated');
    expect(data).not.toHaveProperty('id');
    expect(data).not.toHaveProperty('registeredBy');
    expect(data).not.toHaveProperty('registeredAt');
    expect(data).not.toHaveProperty('createdAt');
    expect(data).not.toHaveProperty('updatedAt');
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('rejects an allergy entry without an allergen name before writing to the database', async () => {
    const create = vi.fn();
    const service = new PatientService(withTransaction({ patient: { create } }) as any);

    await expect(service.createPatient({
      ...validPatient,
      allergies: [{ allergen: '   ', reaction: 'Rash' }],
    } as any, 'staff-1')).rejects.toBeInstanceOf(ValidationError);

    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an unsupported allergy severity before writing to the database', async () => {
    const create = vi.fn();
    const service = new PatientService(withTransaction({ patient: { create } }) as any);

    await expect(service.createPatient({
      ...validPatient,
      allergies: [{ allergen: 'Penicillin', severity: 'critical' }],
    } as any, 'staff-1')).rejects.toBeInstanceOf(ValidationError);

    expect(create).not.toHaveBeenCalled();
  });

  it('persists registration allergies and returns the saved clinical history', async () => {
    const registered = {
      id: 'patient-1',
      ...validPatient,
      allergies: [{ id: 'allergy-1', allergen: 'Penicillin', reaction: 'Rash', severity: 'moderate', notes: null }],
      medicalHistories: [{ id: 'history-1', condition: 'Asthma' }],
      surgicalHistories: [],
      familyHistories: [],
    };
    const create = vi.fn().mockResolvedValue(registered);
    const prisma = withTransaction({
      patient: { findUnique: vi.fn().mockResolvedValue(null), create },
    });
    const service = new PatientService(prisma as any);

    const result = await service.createPatient({
      ...validPatient,
      allergies: [{ allergen: 'Penicillin', reaction: 'Rash', severity: 'moderate' }],
      medicalHistories: [{ condition: 'Asthma' }],
    } as any, 'staff-1');

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        allergies: { create: [{ allergen: 'Penicillin', reaction: 'Rash', severity: 'moderate' }] },
        medicalHistories: { create: [expect.objectContaining({ condition: 'Asthma' })] },
      }),
      include: {
        allergies: true,
        medicalHistories: true,
        surgicalHistories: true,
        familyHistories: true,
      },
    }));
    expect(result.allergies).toEqual(registered.allergies);
    expect(result.medicalHistories).toEqual(registered.medicalHistories);
  });
});
