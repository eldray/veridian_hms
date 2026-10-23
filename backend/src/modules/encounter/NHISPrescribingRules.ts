import { ValidationError } from '../../utils/errors';

export type NHISFacilityType =
  | 'Tertiary'
  | 'Secondary'
  | 'Primary'
  | 'Clinic'
  | 'Health_Center'
  | 'Maternity_Home';

export type NHISPrescriber = {
  role: string;
  licenseNumber?: string | null;
  specialization?: string | null;
};

export type NHISPrescribingContext = {
  level: string | null | undefined;
  facilityType: NHISFacilityType;
  prescriber: NHISPrescriber;
  hasDoctorAtFacility?: boolean;
};

/**
 * Validates the source-list prescribing level only for NHIS encounters.
 * Cash/private prescriptions must not call this function.
 *
 * The facility classification is deliberately separate from the clinical
 * prescriber's credentials: specialist medicines need both a qualified
 * specialist prescriber and a configured hospital record.
 */
export function validateNHISPrescribingLevel(context: NHISPrescribingContext): void {
  const level = String(context.level ?? '').trim().toUpperCase();
  if (!level) {
    throw new ValidationError(
      'NHIS prescribing level is unknown for this medicine. Verify the NHIS medicine reference before prescribing it under NHIS.',
    );
  }

  const { facilityType, prescriber } = context;
  const isHigherHospital = ['Primary', 'Secondary', 'Tertiary'].includes(facilityType);
  const isSecondaryOrTertiary = ['Secondary', 'Tertiary'].includes(facilityType);

  if (level === 'M' && prescriber.role !== 'midwife') {
    throw new ValidationError(
      'This medicine is marked M (Midwifery) on the NHIS medicines list and must be prescribed by a midwife for NHIS.',
    );
  }

  if (level === 'B2' && facilityType === 'Health_Center' && context.hasDoctorAtFacility !== true) {
    throw new ValidationError(
      'This medicine requires a Health Centre with a doctor (NHIS level B2); the facility has no active doctor configured.',
    );
  }

  if (level === 'C' && !isHigherHospital) {
    throw new ValidationError(
      'This medicine is restricted to NHIS level C facilities (Primary, Secondary or Tertiary hospitals).',
    );
  }

  if (level === 'D' && !isSecondaryOrTertiary) {
    throw new ValidationError(
      'This medicine is restricted to NHIS level D facilities (Secondary or Tertiary hospitals).',
    );
  }

  if (level === 'SM') {
    const isQualifiedSpecialist =
      prescriber.role === 'doctor' &&
      Boolean(prescriber.licenseNumber?.trim()) &&
      Boolean(prescriber.specialization?.trim());
    if (!isQualifiedSpecialist) {
      throw new ValidationError(
        'This NHIS specialist medicine requires a doctor with a recorded professional licence and specialization.',
      );
    }
  }

  if (!['A', 'M', 'B1', 'B2', 'C', 'D', 'SM'].includes(level)) {
    throw new ValidationError(
      `Invalid NHIS prescribing level "${level}". Verify the NHIS medicine reference before prescribing.`,
    );
  }
}
