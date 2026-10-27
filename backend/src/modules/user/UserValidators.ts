import { z } from 'zod';

// Password length and quality are enforced by utils/passwordPolicy, which owns the
// single source of truth for the rules and returns the operator-facing wording.
// This schema only has to reject a missing or absurdly shaped body before any
// database work starts, so it deliberately does not repeat those rules.
const newPassword = z
  .string()
  .min(1, 'newPassword is required')
  .max(512, 'newPassword is too long');

export const ResetUserPasswordSchema = z.object({
  newPassword,
});

export type ResetUserPasswordInput = z.infer<typeof ResetUserPasswordSchema>;
