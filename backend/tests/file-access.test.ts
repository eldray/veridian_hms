import { beforeEach, describe, expect, it } from 'vitest';
import path from 'path';
import {
  createFileAccessToken,
  isServableUploadFilename,
  parseCookies,
  resolveUploadPath,
  verifyFileAccessToken,
} from '../src/services/fileAccess';

const SECRET = 'test-secret-with-at-least-thirty-two-characters';

describe('file access tokens', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
  });

  it('accepts a token it just created', () => {
    const token = createFileAccessToken('user-1');
    expect(verifyFileAccessToken(token)).toEqual({ userId: 'user-1' });
  });

  it('rejects a token after its expiry', () => {
    const issuedAt = 1_000_000;
    const token = createFileAccessToken('user-1', issuedAt);
    const afterExpiry = issuedAt + 25 * 60 * 60 * 1000;

    expect(verifyFileAccessToken(token, afterExpiry)).toBeNull();
  });

  it('rejects a token whose user id was changed', () => {
    const token = createFileAccessToken('user-1');
    const [userId, expiresAt, signature] = token.split('.');

    expect(verifyFileAccessToken(`${userId}x.${expiresAt}.${signature}`)).toBeNull();
  });

  it('rejects a token signed with another secret', () => {
    const token = createFileAccessToken('user-1');
    process.env.JWT_SECRET = 'a-different-secret-that-is-also-long-enough';

    expect(verifyFileAccessToken(token)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(verifyFileAccessToken('')).toBeNull();
    expect(verifyFileAccessToken('user-1')).toBeNull();
    expect(verifyFileAccessToken('user-1.not-a-number.signature')).toBeNull();
  });
});

describe('cookie parsing', () => {
  it('reads and decodes named cookies', () => {
    const cookies = parseCookies('theme=dark; veridian_file_access=abc%2Edef%2Eghi; other=1');

    expect(cookies.veridian_file_access).toBe('abc.def.ghi');
    expect(cookies.theme).toBe('dark');
  });

  it('ignores malformed segments', () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies('novalue; =empty; a=1')).toEqual({ a: '1' });
  });
});

describe('upload path resolution', () => {
  const uploadRoot = path.resolve(process.cwd(), 'uploads');

  it('resolves a file inside an allowed category', () => {
    expect(resolveUploadPath('patients', 'patient_1_photo.png')).toBe(
      path.join(uploadRoot, 'patients', 'patient_1_photo.png'),
    );
  });

  it('rejects path traversal and separators', () => {
    expect(resolveUploadPath('patients', '../../server.ts')).toBeNull();
    expect(resolveUploadPath('patients', '..%2F..%2Fserver.ts')).toBeNull();
    expect(resolveUploadPath('patients', 'sub/photo.png')).toBeNull();
  });

  it('rejects unknown categories and hidden files', () => {
    expect(resolveUploadPath('backups', 'dump.sql')).toBeNull();
    expect(resolveUploadPath('patients', '.env')).toBeNull();
  });

  it('accepts only the categories the app stores files in', () => {
    for (const category of ['patients', 'users', 'scans', 'documents']) {
      expect(resolveUploadPath(category, 'file_1.pdf')).toBe(
        path.join(uploadRoot, category, 'file_1.pdf'),
      );
    }
  });
});

describe('servable upload extensions', () => {
  it('serves images, PDFs and Word documents', () => {
    for (const name of ['photo.PNG', 'scan.jpeg', 'doc.pdf', 'cv.docx', 'letter.doc', 'anim.gif', 'x.webp']) {
      expect(isServableUploadFilename(name)).toBe(true);
    }
  });

  it('refuses executable and markup types', () => {
    for (const name of ['report.html', 'payload.svg', 'script.js', 'archive.zip', 'no-extension']) {
      expect(isServableUploadFilename(name)).toBe(false);
    }
  });
});
