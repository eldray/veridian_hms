import { describe, expect, it } from 'vitest';
import { validateNHISPrescribingLevel } from '../src/modules/encounter/NHISPrescribingRules';

const doctor = {
  role: 'doctor',
  licenseNumber: 'LIC-123',
  specialization: 'Internal Medicine',
};

describe('NHIS prescribing-level validation', () => {
  it('allows level C at a Primary hospital', () => {
    expect(() => validateNHISPrescribingLevel({
      level: 'C',
      facilityType: 'Primary',
      prescriber: doctor,
    })).not.toThrow();
  });

  it('rejects level D at a Primary hospital', () => {
    expect(() => validateNHISPrescribingLevel({
      level: 'D',
      facilityType: 'Primary',
      prescriber: doctor,
    })).toThrow(/level D facilities/i);
  });

  it('allows level D at a Secondary hospital', () => {
    expect(() => validateNHISPrescribingLevel({
      level: 'D',
      facilityType: 'Secondary',
      prescriber: doctor,
    })).not.toThrow();
  });

  it('rejects non-clinical or unlicensed accounts for NHIS prescribing', () => {
    expect(() => validateNHISPrescribingLevel({
      level: 'C',
      facilityType: 'Primary',
      prescriber: { role: 'admin' },
    })).toThrow(/allowed clinical role/i);
    expect(() => validateNHISPrescribingLevel({
      level: 'C',
      facilityType: 'Primary',
      prescriber: { role: 'doctor', specialization: 'Internal Medicine' },
    })).toThrow(/professional licence/i);
    expect(() => validateNHISPrescribingLevel({
      level: 'C',
      facilityType: 'Primary',
      prescriber: { role: 'nurse', licenseNumber: 'RN-123' },
    })).toThrow(/nursing specialization/i);
  });

  it('requires a midwife for level M', () => {
    expect(() => validateNHISPrescribingLevel({
      level: 'M',
      facilityType: 'Primary',
      prescriber: doctor,
    })).toThrow(/Midwifery/i);
    expect(() => validateNHISPrescribingLevel({
      level: 'M',
      facilityType: 'Primary',
      prescriber: { role: 'midwife', licenseNumber: 'MW-123' },
    })).not.toThrow();
  });

  it('requires a licensed specialist clinician with a recorded specialization for SM', () => {
    expect(() => validateNHISPrescribingLevel({
      level: 'SM',
      facilityType: 'Primary',
      prescriber: { role: 'doctor', licenseNumber: 'LIC-123' },
    })).toThrow(/specialist medicine/i);
    expect(() => validateNHISPrescribingLevel({
      level: 'SM',
      facilityType: 'Primary',
      prescriber: doctor,
    })).not.toThrow();
    expect(() => validateNHISPrescribingLevel({
      level: 'SM',
      facilityType: 'Primary',
      prescriber: { role: 'nurse', licenseNumber: 'RN-123', specialization: 'Anaesthesia' },
    })).not.toThrow();
  });

  it('restricts level A medicines to CHPS facilities', () => {
    expect(() => validateNHISPrescribingLevel({
      level: 'A',
      facilityType: 'Primary',
      prescriber: doctor,
    })).toThrow(/level A facilities/i);
    expect(() => validateNHISPrescribingLevel({
      level: 'A',
      facilityType: 'CHPS',
      prescriber: doctor,
    })).not.toThrow();
  });

  it('requires a Health Centre without a doctor for level B1', () => {
    expect(() => validateNHISPrescribingLevel({
      level: 'B1',
      facilityType: 'Health_Center',
      prescriber: doctor,
      hasDoctorAtFacility: true,
    })).toThrow(/without a doctor/i);
    expect(() => validateNHISPrescribingLevel({
      level: 'B1',
      facilityType: 'Health_Center',
      prescriber: doctor,
      hasDoctorAtFacility: false,
    })).not.toThrow();
    expect(() => validateNHISPrescribingLevel({
      level: 'B1',
      facilityType: 'Primary',
      prescriber: doctor,
      hasDoctorAtFacility: false,
    })).toThrow(/without a doctor/i);
  });

  it('restricts level B2 medicines to Health Centres with a doctor', () => {
    expect(() => validateNHISPrescribingLevel({
      level: 'B2',
      facilityType: 'Primary',
      prescriber: doctor,
      hasDoctorAtFacility: true,
    })).toThrow(/level B2 Health Centres/i);
  });

  it('requires a configured doctor for B2 medicines at a Health Centre', () => {
    expect(() => validateNHISPrescribingLevel({
      level: 'B2',
      facilityType: 'Health_Center',
      prescriber: doctor,
      hasDoctorAtFacility: false,
    })).toThrow(/Health Centre with a doctor/i);
    expect(() => validateNHISPrescribingLevel({
      level: 'B2',
      facilityType: 'Health_Center',
      prescriber: doctor,
      hasDoctorAtFacility: true,
    })).not.toThrow();
  });

  it('fails closed when the NHIS level is unknown or invalid', () => {
    expect(() => validateNHISPrescribingLevel({
      level: null,
      facilityType: 'Primary',
      prescriber: doctor,
    })).toThrow(/level is unknown/i);
    expect(() => validateNHISPrescribingLevel({
      level: 'X',
      facilityType: 'Primary',
      prescriber: doctor,
    })).toThrow(/Invalid NHIS prescribing level/i);
  });
});
