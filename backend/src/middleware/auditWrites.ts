/**
 * Automatic audit trail.
 *
 * The audit screen was empty because only user-management actions ever wrote to it. This middleware
 * records EVERY successful write (POST/PUT/PATCH/DELETE) made by a logged-in user, plus logins and logouts,
 * so patients, billing, stock, pharmacy, lab, admissions and the rest all appear in the log.
 *
 * It runs after the response is sent and never blocks or fails a request.
 * Passwords, tokens and similar secrets are removed from what is stored.
 */
import { Request, Response, NextFunction } from 'express';
import { PrismaClient, AuditAction } from '@prisma/client';

// Already audited in detail elsewhere, or not business data
const SKIP_TOPICS = new Set(['events', 'uploads', 'audit', 'users', 'health', 'notifications']);
const SECRET_KEY = /pass(word)?|token|secret|authorization|pin$|otp/i;
const MAX_BODY_CHARS = 8000;

const ID_LIKE = /^(c[a-z0-9]{20,}|[0-9a-f]{8}-[0-9a-f-]{27,}|\d{1,12})$/i;

function redact(value: any, depth = 0): any {
  if (value == null || depth > 4) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = SECRET_KEY.test(k) ? '[hidden]' : redact(v, depth + 1);
    return out;
  }
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}

function safeBody(body: any): any {
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) return null;
  const cleaned = redact(body);
  const text = JSON.stringify(cleaned);
  return text.length > MAX_BODY_CHARS ? { note: 'Request body too large to store', size: text.length } : cleaned;
}

/** "stock-transactions" -> "StockTransaction" */
function entityLabel(topic: string): string {
  const pascal = topic.split(/[-_]/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
  if (pascal.endsWith('ies')) return `${pascal.slice(0, -3)}y`;
  if (pascal.endsWith('ses')) return pascal.slice(0, -2);
  return pascal.endsWith('s') && !pascal.endsWith('ss') ? pascal.slice(0, -1) : pascal;
}

function actionFor(method: string, segments: string[]): AuditAction {
  const last = segments.filter((s) => !ID_LIKE.test(s)).pop() ?? '';
  if (/^void/.test(last)) return AuditAction.void;
  if (/^approve/.test(last)) return AuditAction.approve;
  if (/^reject|^decline/.test(last)) return AuditAction.reject;
  if (/^submit/.test(last)) return AuditAction.submit;
  if (/^print/.test(last)) return AuditAction.print;
  if (method === 'DELETE') return AuditAction.delete;
  if (method === 'POST') return AuditAction.create;
  return AuditAction.update;
}

export function auditWrites(prisma: PrismaClient) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();

    let responseBody: any;
    const originalJson = res.json.bind(res);
    res.json = ((body: any) => { responseBody = body; return originalJson(body); }) as Response['json'];

    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      try {
        const path = (req.originalUrl || req.url).split('?')[0];
        const segments = path.split('/').filter(Boolean);
        if (segments[0] === 'api') segments.shift();
        const topic = segments[0];
        if (!topic) return;

        const user = (req as any).user;
        let userId: string | undefined = user?.id ?? user?.userId;
        let entityType: string; let entityId: string; let action: AuditAction;

        if (topic === 'auth') {
          const sub = segments[1];
          if (sub === 'login') {
            userId = responseBody?.data?.user?.id ?? userId;
            if (!userId || responseBody?.success === false) return;
            entityType = 'Session'; entityId = userId; action = AuditAction.login;
          } else if (sub === 'logout') {
            if (!userId) return;
            entityType = 'Session'; entityId = userId; action = AuditAction.logout;
          } else return; // refresh-token, change-password etc. are not business events here
        } else {
          if (SKIP_TOPICS.has(topic) || !userId) return;
          entityType = entityLabel(topic);
          entityId = segments.slice(1).find((s) => ID_LIKE.test(s))
            ?? responseBody?.data?.id ?? responseBody?.id ?? '-';
          action = actionFor(req.method, segments.slice(1));
        }

        const operation = segments.slice(1).filter((s) => !ID_LIKE.test(s)).join('/');
        void prisma.auditLog.create({
          data: {
            entityType, entityId: String(entityId), action, performedById: userId,
            ipAddress: req.ip ?? null,
            previousState: undefined,
            newState: action === AuditAction.login || action === AuditAction.logout || action === AuditAction.delete ? undefined : safeBody(req.body),
            metadata: { method: req.method, url: path, operation: operation || undefined, statusCode: res.statusCode, userAgent: req.headers['user-agent'] ?? undefined },
          },
        }).catch((err: any) => console.error('[audit] could not record', req.method, path, err?.message ?? err));
      } catch (err: any) {
        console.error('[audit] failed:', err?.message ?? err);
      }
    });
    next();
  };
}
