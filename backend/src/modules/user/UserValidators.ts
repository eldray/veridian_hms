import { z } from 'zod';
import { VALID_ROLES, VALID_SENIORITY } from './UserTypes';

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


// Account creation is admin-only. Strip unknown keys before they reach the service.
export const CreateUserSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters').max(80),
  password: z.string().min(6, 'Password must be at least 6 characters').max(512),
  fullName: z.string().trim().min(1, 'Full name is required').max(160),
  role: z.enum(VALID_ROLES),
  seniority: z.enum(VALID_SENIORITY).optional(),
  email: z.union([z.string().email('Enter a valid email address'), z.literal('')]).optional(),
  phone: z.string().trim().max(40).optional(),
  licenseNumber: z.string().trim().max(100).optional(),
  specialization: z.string().trim().max(160).optional(),
  departmentId: z.string().min(1).optional(),
});

// Explicit allowlist and type checks for account updates. Empty strings are accepted
// only where the UI uses them to clear optional contact/image fields.
export const UpdateUserSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name cannot be empty').max(160).optional(),
  email: z.union([z.string().email('Enter a valid email address'), z.literal('')]).optional(),
  phone: z.string().trim().max(40).optional(),
  licenseNumber: z.string().trim().max(100).optional(),
  specialization: z.string().trim().max(160).optional(),
  role: z.enum(VALID_ROLES).optional(),
  seniority: z.enum(VALID_SENIORITY).optional(),
  isActive: z.boolean().optional(),
  departmentId: z.union([z.string(), z.null()]).optional(),
  imageUrl: z.union([z.string().url('Enter a valid image URL'), z.literal('')]).optional(),
  headedDepartmentId: z.union([z.string(), z.null()]).optional(),
});
