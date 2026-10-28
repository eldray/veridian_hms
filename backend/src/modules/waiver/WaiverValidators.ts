import { z } from 'zod';

// Waivers move money off a bill, so a malformed request must fail as a 400 with a
// field message instead of reaching Prisma as a Decimal/enum error (HTTP 500).
const amount = z.coerce.number()
  .positive('Amount must be greater than zero')
  .max(999_999_999, 'Amount is too large');

export const CreateWaiverSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  billId: z.string().min(1).nullish(),
  waiverType: z
    .enum(['indigent', 'nhis_exempt', 'staff_discount', 'management_discretion', 'other'])
    .optional(),
  amountRequested: amount,
  reason: z.string().trim().min(1, 'A reason is required').max(2000),
  supportingDocs: z.array(z.string().min(1)).max(50).optional(),
});

export const ApproveWaiverSchema = z.object({
  amountApproved: amount.optional(),
});

export const RejectWaiverSchema = z.object({
  rejectionReason: z.string().trim().min(1, 'A rejection reason is required').max(2000),
});

// Only the fields the service forwards to the database; status, amounts approved and
// the requester/approver identities are set by the workflow, never by the caller.
export const UpdateWaiverSchema = z
  .object({
    amountRequested: amount.optional(),
    reason: z.string().trim().min(1).max(2000).optional(),
    supportingDocs: z.array(z.string().min(1)).max(50).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No editable waiver fields supplied',
  });
