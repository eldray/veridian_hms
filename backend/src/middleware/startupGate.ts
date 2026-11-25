// src/middleware/startupGate.ts
// Development only. The demo seed takes many minutes and used to run BEFORE the server started listening,
// so for all that time the port refused connections: the Vite proxy printed ECONNREFUSED for every request
// and the Electron shell could not tell "still seeding" from "not running".
//
// Now the server listens first. While the seed runs, /api/health answers 503 {phase:'seeding', progress}
// (the shell shows that progress) and every other API call gets a clear 503 instead of a refused connection.
// Nothing here is ever active unless server.ts switches `seeding` on, which it only does for the dev seed.
import type { Request, Response, NextFunction } from 'express';

export const startupState = { seeding: false, progress: '' };

/** One printable line: emoji and other non-ASCII dropped, whitespace collapsed, a leading "..." removed. */
export function cleanProgressLine(line: string): string {
  return line.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim().replace(/^\.{2,}\s*/, '');
}

/** Lines worth showing as progress: "STEP ...: ..." headings and the "... 250/10508 (2.4%) ..." counters. */
export function isProgressLine(line: string): boolean {
  return /\bSTEP\b/.test(line) || /^\s*\.\.\.\s*\d+\/\d+/.test(line);
}

export function startupGate(req: Request, res: Response, next: NextFunction) {
  if (!startupState.seeding) return next();
  const p = req.path;
  if (p === '/api/health/live') return next(); // process liveness stays truthful
  if (p === '/api/health' || p === '/api/health/') {
    return res.status(503).json({
      success: false,
      ready: false,
      phase: 'seeding',
      progress: startupState.progress,
      message: 'The server is preparing demo data.',
      uptime: Math.round(process.uptime()),
    });
  }
  if (p.startsWith('/api')) {
    return res.status(503).json({
      success: false,
      phase: 'seeding',
      progress: startupState.progress,
      message: 'The server is still preparing demo data. Try again in a few minutes.',
    });
  }
  return next();
}

/**
 * Marks the server as seeding while `work` runs and copies the progress lines the seed prints into
 * startupState.progress. console.log is restored afterwards even if the work throws.
 */
export async function trackSeedProgress<T>(work: () => Promise<T>): Promise<T> {
  const original = console.log;
  startupState.seeding = true;
  startupState.progress = '';
  console.log = (...args: unknown[]) => {
    original(...args);
    const text = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
    for (const line of text.split('\n')) {
      if (isProgressLine(line)) startupState.progress = cleanProgressLine(line);
    }
  };
  try {
    return await work();
  } finally {
    console.log = original;
    startupState.seeding = false;
  }
}
