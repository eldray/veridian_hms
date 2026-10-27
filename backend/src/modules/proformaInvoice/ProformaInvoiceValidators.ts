import { z } from 'zod';

// An estimate is a quote the client walks away with — it is never converted into
// a bill, because real bills are assembled from what was actually rendered (lab
// results, dispensed drugs, procedures). A line with a missing quantity or price
// used to reach Prisma as NaN (a 500 or a corrupt total), so these schemas keep
// the money arithmetic finite and reject malformed bodies as 400s before a row
// is written.
const SERVICE_TYPES = [
  'consultation', 'ward', 'lab_test', 'scan', 'medication', 'procedure', 'diagnosis', 'miscellaneous',
] as const;

const PRICING_BASIS = ['cash', 'nhis', 'private_insurance', 'corporate'] as const;

const money = z.coerce
  .number()
  .min(0, 'Amount cannot be negative')
  .max(999_999_999, 'Amount is too large');

const EstimateItemSchema = z.object({
  // Present when an existing draft is resaved; new lines omit it.
  id: z.string().min(1).nullish(),
  serviceCatalogId: z.string().min(1).nullish(),
  description: z.string().trim().min(1, 'Each estimate line needs a description').max(500),
  serviceType: z.enum(SERVICE_TYPES),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(100_000),
  unitPrice: money,
  pricingBasis: z.enum(PRICING_BASIS),
  vatRate: z.coerce.number().min(0).max(100).optional(),
  isInsuranceCovered: z.boolean().optional(),
  insuranceCoverage: money.optional(),
});

const items = z
  .array(EstimateItemSchema)
  .min(1, 'Add at least one item to the estimate')
  .max(200, 'An estimate cannot have more than 200 lines');

export const CreateEstimateSchema = z.object({
  // A walk-in client asking for a cost estimate is not registered yet, so the
  // quote stands on its own; the patient is attached when there is one.
  patientId: z.string().min(1).nullish(),
  attendanceId: z.string().min(1).nullish(),
  admissionId: z.string().min(1).nullish(),
  corporateAccountId: z.string().min(1).nullish(),
  items,
  discount: money.optional(),
  validityDays: z.coerce.number().int().min(1).max(180).optional(),
  notes: z.string().max(5000).nullish(),
  termsAndConditions: z.string().max(5000).nullish(),
});

export const UpdateEstimateSchema = z.object({
  items: items.optional(),
  discount: money.optional(),
  validityDays: z.coerce.number().int().min(1).max(180).optional(),
  notes: z.string().max(5000).nullish(),
  termsAndConditions: z.string().max(5000).nullish(),
});

export const RejectEstimateSchema = z.object({
  reason: z.string().trim().max(2000).optional(),
});
