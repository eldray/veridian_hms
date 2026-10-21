import { describe, expect, it, vi } from 'vitest';
import { PatientService } from '../src/modules/patient/PatientService';
import { ValidationError } from '../src/utils/errors';

describe('patient clinical history registration', () => {
  const validPatient = {
    folderNumber: 'PAT-CLINICAL-001',
    surname: 'Test',
    otherNames: 'Patient',
    gender: 'female',
    dateOfBirth: '1990-01-01',
    contact: '0200000000',
    address: 'Tamale',
  };

  it('rejects an allergy entry without an allergen name before writing to the database', async () => {
    const create = vi.fn();
    const service = new PatientService({ patient: { create } } as any);

    await expect(service.createPatient({
      ...validPatient,
      allergies: [{ allergen: '   ', reaction: 'Rash' }],
    } as any)).rejects.toBeInstanceOf(ValidationError);

    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an unsupported allergy severity before writing to the database', async () => {
    const create = vi.fn();
    const service = new PatientService({ patient: { create } } as any);

    await expect(service.createPatient({
      ...validPatient,
      allergies: [{ allergen: 'Penicillin', severity: 'critical' }],
    } as any)).rejects.toBeInstanceOf(ValidationError);

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
    const service = new PatientService({
      patient: {
        findUnique: vi.fn().mockResolvedValue(null),
        create,
      },
    } as any);

    const result = await service.createPatient({
      ...validPatient,
      allergies: [{ allergen: 'Penicillin', reaction: 'Rash', severity: 'moderate' }],
      medicalHistories: [{ condition: 'Asthma' }],
    } as any);

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
