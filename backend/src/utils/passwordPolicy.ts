// Password rules for newly chosen passwords. Existing accounts keep working;
// this only applies when an account is created or its password is changed.
const COMMON_PASSWORDS = new Set([
  'password1234',
  'password12345',
  '123456789012',
  'administrator',
  'qwertyuiop12',
  'changeme1234',
  'welcome12345',
  'password123456',
  'password@123',
  'password@1234',
  'admin123456',
  'admin@123456',
  'administrator123',
  'welcome123456',
  'welcome@123',
  'welcome@1234',
  'qwerty123456',
  'qwerty@123',
  'letmein123456',
  'iloveyou12345',
  'abc123456789',
  'abc1234567890',
  '1234567890123',
  '12345678901234',
  '111111111111',
  '000000000000',
  'passwordpassword',
  'passw0rd12345',
  'p@ssw0rd12345',
  'changeme123456',
  'changeme@123',
  'hospital123456',
  'hospital@123',
  'clinician123456',
  'wardnurse123456',
  'manager123456',
  'systemadmin123',
  'superadmin123',
  'veridian12345',
  'ghana12345678',
  'ghana@123456',
  'iloveyou123456',
  'sunshine12345',
  'football12345',
  'monkey123456',
  'dragon123456',
  'trustno123456',
  'welcomehome123',
  'my password123',
]);

export interface PasswordPolicyContext {
  username?: string | null;
  email?: string | null;
}

export function passwordPolicyError(
  password: unknown,
  context: PasswordPolicyContext = {},
): string | null {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required';
  }
  if (password.length < 12) {
    return 'Password must be at least 12 characters long';
  }
  // bcrypt silently ignores bytes after the 72nd, so reject longer inputs
  // instead of letting two different passwords authenticate the same account.
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return 'Password must be at most 72 bytes long';
  }
  if (!password.trim()) {
    return 'Password cannot be only whitespace';
  }

  const normalized = password.toLowerCase();
  if (context.username && normalized === context.username.toLowerCase()) {
    return 'Password cannot be the same as the username';
  }
  if (context.email && normalized === context.email.toLowerCase()) {
    return 'Password cannot be the same as the email address';
  }
  if (COMMON_PASSWORDS.has(normalized)) {
    return 'Password is too common';
  }

  return null;
}
