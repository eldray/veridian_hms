import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

// Correlation ids are echoed in responses and logs so a user can report a
// failure without quoting patient data. Inbound values are reused only when
// they are safe to log.
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
