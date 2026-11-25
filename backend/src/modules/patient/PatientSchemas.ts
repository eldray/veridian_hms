import { z } from 'zod';

// Boundary validation for the EMR endpoints that write directly to the
// structured history tables. The bulk patient create/update path has its own
// checks in PatientService.validateClinicalHistory.
export const createAllergySchema = z.object({
  allergen: z.string().trim().min(1, 'Allergen name is required').max(200),
  reaction: z.string().trim().max(300).nullish(),
  severity: z.enum(['mild', 'moderate', 'severe']).nullish(),
  notes: z.string().trim().max(1000).nullish(),
});

const optionalDate = z
  .string()
  .trim()
  .max(40)
  .nullish()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || !Number.isNaN(Date.parse(value)), 'Diagnosed date must be a valid date');

export const createMedicalHistorySchema = z.object({
  condition: z.string().trim().min(1, 'Medical condition is required').max(300),
  diagnosedAt: optionalDate,
  notes: z.string().trim().max(2000).nullish(),
});
