import crypto from 'crypto';
import path from 'path';

// Uploaded clinical files are served through an authenticated route. Browsers
// cannot attach a bearer header to <img>, so the login flow also sets a
// short-lived, HttpOnly cookie scoped to this token.
export const FILE_ACCESS_COOKIE = 'veridian_file_access';

export const FILE_ACCESS_TTL_SECONDS = (() => {
  const configured = Number(process.env.FILE_ACCESS_TTL_SECONDS || 24 * 60 * 60);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 24 * 60 * 60;
})();

const UPLOAD_CATEGORIES = new Set(['patients', 'users', 'scans', 'documents']);
const SAFE_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
// Files uploaded before extensions were derived from the MIME type may carry
// a client-chosen extension such as .html. Only browser-safe types are served.
const SERVABLE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx']);

export function isServableUploadFilename(filename: string): boolean {
  const extension = path.extname(filename).toLowerCase();
  return SERVABLE_EXTENSIONS.has(extension);
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(`file-access:${payload}`).digest('base64url');
}

export function createFileAccessToken(userId: string, nowMs: number = Date.now()): string {
  if (!userId) throw new Error('A user id is required to create a file access token');
  const expiresAt = Math.floor(nowMs / 1000) + FILE_ACCESS_TTL_SECONDS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyFileAccessToken(
  token: string,
  nowMs: number = Date.now(),
): { userId: string } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [userId, expiresAtRaw, signature] = parts;
  if (!userId || !/^\d+$/.test(expiresAtRaw)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 <= nowMs) return null;

  const expected = Buffer.from(sign(`${userId}.${expiresAtRaw}`));
  const provided = Buffer.from(signature);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  return { userId };
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};

  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    if (!name) continue;
    const rawValue = part.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = rawValue;
    }
  }
  return cookies;
}

export function getUploadRoot(): string {
  return path.resolve(process.cwd(), 'uploads');
}

/**
 * Resolves a stored upload reference to an absolute path inside the uploads
 * directory. Returns null for unknown categories, unsafe filenames, or paths
 * that escape the category directory.
 */
export function resolveUploadPath(category: string, filename: string): string | null {
  if (!UPLOAD_CATEGORIES.has(category)) return null;
  if (!SAFE_FILENAME.test(filename)) return null;

  const categoryRoot = path.resolve(getUploadRoot(), category);
  const absolute = path.resolve(categoryRoot, filename);
  if (!absolute.startsWith(categoryRoot + path.sep)) return null;

  return absolute;
}
