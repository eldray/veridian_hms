// backend/src/modules/insuranceClaim/InsuranceClaimValidators.ts
import { z } from 'zod';

export const GenerateClaimSchema = z.object({
  attendanceId: z.string().min(1, 'attendanceId is required'),
});

export const UpdateClaimDraftSchema = z.object({
  notes: z.string().max(5000).optional(),
  preAuthNumber: z.string().max(100).optional(),
  principalGDRG: z.string().max(50).optional(),
  mdcCode: z.string().max(20).optional(),
  // The NHIS header fields the claim form edits. Without them here, validateBody strips them and
  // the desk's edits to type of service, attendance, outcome and dates never reach the database.
  typeOfService: z.enum(['OPD', 'IPD', 'DIA', 'PHC']).optional(),
  typeOfAttendance: z.enum(['EAE', 'CFU', 'ANC', 'PNC']).optional(),
  serviceOutcome: z.enum(['DISC', 'DIED', 'TFOT', 'ABSC']).optional(),
  datesOfService: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(366).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const ClaimItemSchema = z.object({
  itemCategory: z.enum(['diagnosis', 'investigation', 'medicine', 'procedure', 'service', 'gdrg']),
  itemType: z.string().max(4).nullable().optional(),
  code: z.string().min(1),
  description: z.string().min(1),
  quantity: z.number().int().positive().optional(),
  noOfDays: z.number().int().positive().nullable().optional(),
  unitPrice: z.number().nonnegative().optional(),
  lineTotal: z.number().nonnegative().optional(),
  serviceDate: z.string().nullable().optional(),
  prescriptionText: z.string().max(200).nullable().optional(),
  clinician: z.string().max(200).nullable().optional(),
  prescriberNo: z.string().max(100).nullable().optional(),
  billLineItemId: z.string().nullable().optional(),
  serviceCatalogId: z.string().nullable().optional(),
  diagnosisId: z.string().nullable().optional(),
  gdrgTariffId: z.string().nullable().optional(),
  labTestId: z.string().nullable().optional(),
  scanId: z.string().nullable().optional(),
  procedureId: z.string().nullable().optional(),
  medicationId: z.string().nullable().optional(),
});

export const ReplaceClaimItemsSchema = z.object({
  items: z.array(ClaimItemSchema).min(1, 'items cannot be empty'),
});

export const GenerateBatchSchema = z.object({
  insuranceType: z.enum(['nhis', 'private', 'corporate']),
  periodYear: z.number().int().min(2000).max(2100),
  periodMonth: z.number().int().min(1).max(12),
  insuranceProviderId: z.string().min(1).optional(),
  corporateAccountId: z.string().min(1).optional(),
  description: z.string().max(500).optional(),
});