import { Request, Response } from 'express';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import prisma from '../core/database/prisma.client';
import { canAccessUpload } from '../services/uploadAccess';
import { appendAuditLog } from '../services/auditChain';
import { logger } from '../utils/logger';
import {
  FILE_ACCESS_COOKIE,
  FILE_ACCESS_TTL_SECONDS,
  createFileAccessToken,
  isServableUploadFilename,
  isFileAccessVersionCurrent,
  parseCookies,
  resolveUploadPath,
  verifyFileAccessToken,
} from '../services/fileAccess';

function authenticatedUser(req: Request): { userId: string; version: number } | null {
  const cookieToken = parseCookies(req.headers.cookie)[FILE_ACCESS_COOKIE];
  if (cookieToken) {
    const payload = verifyFileAccessToken(cookieToken);
    if (payload) return payload;
  }

  // Allows API clients and explicit download links to use the normal bearer token.
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authorization.slice(7), process.env.JWT_SECRET || '', {
        algorithms: ['HS256'],
      }) as { userId?: string; type?: string; version?: number };
      if (decoded.type === 'refresh' || !decoded.userId || !Number.isSafeInteger(decoded.version)) return null;
      return { userId: decoded.userId, version: decoded.version! };
    } catch {
      return null;
    }
  }

  return null;
}

function recordUploadAccess(req: Request, userId: string, category: string, filename: string, statusCode: number, outcome: 'served' | 'denied' | 'failed') {
  // Hash the stored filename so the audit trail can correlate repeat access without
  // exposing a patient identifier or the original file name in audit metadata.
  const fileRef = createHash('sha256').update(`${category}/${filename}`).digest('hex');
  void appendAuditLog(prisma, {
    entityType: 'Upload',
    entityId: fileRef,
    action: outcome === 'denied' ? 'view' : 'export',
    performedById: userId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
    metadata: { category, method: 'GET', statusCode, outcome },
  }).catch((error) => {
    logger.error('Failed to record protected upload access', { userId, category, statusCode, outcome, error });
  });
}

export async function serveUploadFile(req: Request, res: Response): Promise<void> {
  const session = authenticatedUser(req);
  if (!session) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const userId = session.userId;
  const category = String(req.params.category || '');
  const filename = String(req.params.filename || '');
  const absolutePath = resolveUploadPath(category, filename);

  if (!absolutePath || !isServableUploadFilename(filename) || !fs.existsSync(absolutePath)) {
    res.status(404).json({ success: false, message: 'File not found' });
    return;
  }

  // The file access cookie lasts longer than a role change or a deactivation,
  // so authorization is always re-checked against the current account.
  let viewer: { id: string; role: string; isActive: boolean; version: number } | null;
  try {
    viewer = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true, version: true },
    });
  } catch {
    // Fail closed when the authorization lookup is unavailable.
    res.status(503).json({ success: false, message: 'File access is temporarily unavailable' });
    return;
  }

  if (!viewer || !viewer.isActive || !isFileAccessVersionCurrent(session.version, viewer.version)) {
    res.status(401).json({ success: false, message: 'Account is inactive or no longer exists' });
    return;
  }

  let allowed = false;
  try {
    allowed = await canAccessUpload(viewer, category, filename);
  } catch {
    res.status(503).json({ success: false, message: 'File access is temporarily unavailable' });
    return;
  }

  if (!allowed) {
    recordUploadAccess(req, userId, category, filename, 403, 'denied');
    res.status(403).json({ success: false, message: 'Not authorized to view this file' });
    return;
  }

  res.once('finish', () => {
    const statusCode = res.statusCode;
    recordUploadAccess(req, userId, category, filename, statusCode, statusCode < 400 ? 'served' : 'failed');
  });

  res.setHeader('Cache-Control', 'private, max-age=60');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  res.sendFile(absolutePath, (error) => {
    if (error && !res.headersSent) {
      res.status(404).json({ success: false, message: 'File not found' });
    }
  });
}

export function setFileAccessCookie(res: Response, userId: string, version: number): void {
  res.cookie(FILE_ACCESS_COOKIE, createFileAccessToken(userId, version), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: FILE_ACCESS_TTL_SECONDS * 1000,
  });
}

export function clearFileAccessCookie(res: Response): void {
  res.clearCookie(FILE_ACCESS_COOKIE, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
  });
}
