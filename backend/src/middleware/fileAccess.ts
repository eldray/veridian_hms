import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import {
  FILE_ACCESS_COOKIE,
  FILE_ACCESS_TTL_SECONDS,
  createFileAccessToken,
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

export function serveUploadFile(req: Request, res: Response): void {
  if (!authenticatedUserId(req)) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const absolutePath = resolveUploadPath(
    String(req.params.category || ''),
    String(req.params.filename || ''),
  );

  if (!absolutePath || !fs.existsSync(absolutePath)) {
    res.status(404).json({ success: false, message: 'File not found' });
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
