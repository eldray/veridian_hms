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
