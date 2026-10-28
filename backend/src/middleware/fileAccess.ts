import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import prisma from '../core/database/prisma.client';
import { canAccessUpload } from '../services/uploadAccess';
import {
  FILE_ACCESS_COOKIE,
  FILE_ACCESS_TTL_SECONDS,
  createFileAccessToken,
  isServableUploadFilename,
  parseCookies,
  resolveUploadPath,
  verifyFileAccessToken,
} from '../services/fileAccess';

function authenticatedUserId(req: Request): string | null {
  const cookieToken = parseCookies(req.headers.cookie)[FILE_ACCESS_COOKIE];
  if (cookieToken) {
    const payload = verifyFileAccessToken(cookieToken);
    if (payload) return payload.userId;
  }

  // Allows API clients and explicit download links to use the normal bearer token.
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authorization.slice(7), process.env.JWT_SECRET || '') as {
        userId?: string;
        id?: string;
        type?: string;
      };
      if (decoded.type === 'refresh') return null;
      return decoded.userId || decoded.id || null;
    } catch {
      return null;
    }
  }

  return null;
}

export async function serveUploadFile(req: Request, res: Response): Promise<void> {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const category = String(req.params.category || '');
  const filename = String(req.params.filename || '');
  const absolutePath = resolveUploadPath(category, filename);

  if (!absolutePath || !isServableUploadFilename(filename) || !fs.existsSync(absolutePath)) {
    res.status(404).json({ success: false, message: 'File not found' });
    return;
  }

  // The file access cookie lasts longer than a role change or a deactivation,
  // so authorization is always re-checked against the current account.
  let viewer: { id: string; role: string; isActive: boolean } | null;
  try {
    viewer = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });
  } catch {
    // Fail closed when the authorization lookup is unavailable.
    res.status(503).json({ success: false, message: 'File access is temporarily unavailable' });
    return;
  }

  if (!viewer || !viewer.isActive) {
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
    res.status(403).json({ success: false, message: 'Not authorized to view this file' });
    return;
  }

  res.setHeader('Cache-Control', 'private, max-age=60');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  res.sendFile(absolutePath, (error) => {
    if (error && !res.headersSent) {
      res.status(404).json({ success: false, message: 'File not found' });
    }
  });
}

export function setFileAccessCookie(res: Response, userId: string): void {
  res.cookie(FILE_ACCESS_COOKIE, createFileAccessToken(userId), {
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
