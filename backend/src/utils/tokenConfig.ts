// Shared token and password-hashing settings. Both auth services must agree on
// these, otherwise a session issued by one flow expires before the other.

const UNITS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
const DEFAULT_REFRESH_LIFETIME = '7d';

export function refreshTokenLifetime(): string {
  const configured = (process.env.JWT_REFRESH_EXPIRY || '').trim();
  return /^\d+[smhd]$/.test(configured) ? configured : DEFAULT_REFRESH_LIFETIME;
}

export function refreshTokenExpiresAt(nowMs: number = Date.now()): Date {
  const lifetime = refreshTokenLifetime();
  const amount = parseInt(lifetime.slice(0, -1), 10) || 7;
  const unit = UNITS[lifetime.slice(-1)] ?? UNITS.d;
  return new Date(nowMs + amount * unit * 1000);
}

export function bcryptRounds(): number {
  const configured = Number(process.env.BCRYPT_ROUNDS);
  return Number.isInteger(configured) && configured >= 10 && configured <= 15 ? configured : 12;
}
