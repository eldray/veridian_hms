import { describe, expect, it } from 'vitest';
import { CreateUserSchema, UpdateUserSchema } from '../src/modules/user/UserValidators';

describe('user account input schemas', () => {
  it('accepts valid account creation data and strips unknown fields', () => {
    const parsed = CreateUserSchema.parse({
      username: '  emmanuel  ',
      password: 'SecurePass123!',
      fullName: '  Staff Member  ',
      role: 'nurse',
      isSuperAdmin: true,
    });
    expect(parsed.username).toBe('emmanuel');
    expect(parsed.fullName).toBe('Staff Member');
    expect(parsed).not.toHaveProperty('isSuperAdmin');
  });

  it('rejects invalid roles, short usernames and malformed email addresses', () => {
    expect(CreateUserSchema.safeParse({
      username: 'ab', password: 'SecurePass123!', fullName: 'Staff', role: 'root',
    }).success).toBe(false);
    expect(CreateUserSchema.safeParse({
      username: 'staff1', password: 'SecurePass123!', fullName: 'Staff', role: 'nurse', email: 'not-an-email',
    }).success).toBe(false);
  });

  it('rejects invalid account update fields and strips unapproved keys', () => {
    expect(UpdateUserSchema.safeParse({ role: 'root' }).success).toBe(false);
    expect(UpdateUserSchema.safeParse({ isActive: 'false' }).success).toBe(false);
    const parsed = UpdateUserSchema.parse({ fullName: ' Staff ', isSuperAdmin: true });
    expect(parsed.fullName).toBe('Staff');
    expect(parsed).not.toHaveProperty('isSuperAdmin');
  });
});
