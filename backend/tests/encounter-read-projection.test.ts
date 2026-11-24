import { describe, expect, it } from 'vitest';
import { projectEncounterForRole } from '../src/modules/encounter/EncounterReadProjection';

const record = {
  id: 'visit-1',
  complaints: 'Sensitive presenting complaint',
  assessment: 'Sensitive assessment',
  clinicalNotes: { plan: 'Sensitive plan' },
  nhisCCC: 'NHIS-123',
  Patient: {
    id: 'patient-1',
    surname: 'Doe',
    dateOfBirth: new Date('1990-01-01'),
    contact: '0240000000',
    allergies: [{ allergen: 'Penicillin' }],
    medicalHistories: [{ condition: 'Sensitive history' }],
  },
  AttendanceDiagnosis: [{ Diagnosis: { name: 'Sensitive diagnosis' } }],
  Vitals: [{ bloodPressure: '160/100' }],
  Medication: [{ dosage: 'Sensitive medication' }],
  LabTest: [{ result: 'Lab result' }],
  Scan: [{ impression: 'Scan impression' }],
  Procedure: [{ notes: 'Procedure note' }],
};

describe('role-aware encounter read projection', () => {
  it('preserves the complete encounter for clinical staff', () => {
    expect(projectEncounterForRole(record, 'doctor')).toEqual(record);
    expect(projectEncounterForRole(record, 'admin')).toEqual(record);
  });

  it('gives laboratory staff only demographics and laboratory records', () => {
    const result = projectEncounterForRole(record, 'lab_tech');
    expect(result.Patient).toMatchObject({ id: 'patient-1', surname: 'Doe' });
    expect(result.Patient).not.toHaveProperty('contact');
    expect(result.Patient).not.toHaveProperty('allergies');
    expect(result).not.toHaveProperty('complaints');
    expect(result).not.toHaveProperty('clinicalNotes');
    expect(result).not.toHaveProperty('AttendanceDiagnosis');
    expect(result).not.toHaveProperty('Vitals');
    expect(result).not.toHaveProperty('Medication');
    expect(result).not.toHaveProperty('Scan');
    expect(result).not.toHaveProperty('Procedure');
    expect(result.LabTest).toEqual(record.LabTest);
  });

  it('gives sonography staff only demographics and scan records', () => {
    const result = projectEncounterForRole(record, 'sonographer');
    expect(result.Patient).not.toHaveProperty('contact');
    expect(result).not.toHaveProperty('assessment');
    expect(result).not.toHaveProperty('LabTest');
    expect(result).not.toHaveProperty('Medication');
    expect(result.Scan).toEqual(record.Scan);
  });

  it('removes clinical content from accounts and records views while retaining billing demographics', () => {
    for (const role of ['accounts', 'records']) {
      const result = projectEncounterForRole(record, role);
      expect(result.Patient).toMatchObject({ id: 'patient-1', surname: 'Doe', contact: '0240000000' });
      expect(result.Patient).not.toHaveProperty('allergies');
      expect(result.Patient).not.toHaveProperty('medicalHistories');
      expect(result).not.toHaveProperty('complaints');
      expect(result).not.toHaveProperty('nhisCCC');
      expect(result).not.toHaveProperty('AttendanceDiagnosis');
      expect(result).not.toHaveProperty('LabTest');
      expect(result).not.toHaveProperty('Scan');
    }
  });
});
