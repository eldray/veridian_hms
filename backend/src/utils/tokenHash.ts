import crypto from 'crypto';

// Refresh tokens are bearer credentials with a long lifetime. Store only a
// one-way digest so a database read cannot be replayed directly.
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(`refresh-token:${token}`).digest('hex');
}
