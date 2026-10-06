/**
 * Real-time change notifications (Server-Sent Events).
 *
 * The server does not push data. It pushes a tiny "something changed in <topic>" signal,
 * and each open screen re-fetches what it shows. That keeps the stream cheap (100 users
 * = 100 idle connections) and keeps the data path (auth, filters, paging) unchanged.
 *
 *   GET /api/events   text/event-stream   event: change   data: {"topic":"encounters","at":...}
 *
 * Every successful write (POST/PUT/PATCH/DELETE) publishes the topic named by the first URL
 * segment (encounters, bills, appointments, nursing ...). Writes under /encounters/admissions
 * also publish "admissions". Bursts are coalesced into one event per topic per 500 ms.
 *
 * Limits: the client list lives in this process. One Node process (your Electron / single
 * server setup) is fully supported; with several processes put a Redis pub/sub behind publish().
 */
import { Request, Response, NextFunction } from 'express';
import { invalidate } from '../utils/ttlCache';

interface Client { id: number; res: Response }

const MAX_CLIENTS = Number(process.env.SSE_MAX_CLIENTS || 500);
const COALESCE_MS = 500;
const HEARTBEAT_MS = 25_000;
const IGNORED_TOPICS = new Set(['auth', 'events', 'uploads']);

const clients = new Set<Client>();
const timers = new Map<string, NodeJS.Timeout>();
let nextId = 0;

function send(client: Client, chunk: string) {
  try {
    client.res.write(chunk);
    (client.res as any).flush?.();
  } catch {
    clients.delete(client);
  }
}

/** Announce that `topic` changed. Safe to call from anywhere. */
export function publishChange(topic: string): void {
  if (!topic || IGNORED_TOPICS.has(topic) || timers.has(topic)) return; // already queued
  timers.set(topic, setTimeout(() => {
    timers.delete(topic);
    const payload = `event: change\ndata: ${JSON.stringify({ topic, at: Date.now() })}\n\n`;
    for (const client of clients) send(client, payload);
  }, COALESCE_MS));
}

/** Express middleware: after any successful write, publish the topic(s) it touched. */
export function realtimeBroadcast(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();

  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    // Shared dashboard/worklist results are now out of date: drop them before screens re-fetch
    invalidate('worklist');
    invalidate('encounter-stats');
    invalidate('dashboard');
    const segments = (req.originalUrl || req.url).split('?')[0].split('/').filter(Boolean);
    if (segments[0] === 'api') segments.shift();
    const topic = segments[0];
    if (!topic) return;
    publishChange(topic);
    if (topic === 'encounters' && segments[1] === 'admissions') publishChange('admissions');
  });
  next();
}

/** GET /events (authenticated by `protect` where it is mounted). */
export function eventsHandler(req: Request, res: Response): void {
  if (clients.size >= MAX_CLIENTS) {
    res.status(503).json({ success: false, message: 'Too many live connections' });
    return;
  }

  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform', // no-transform keeps compression middleware away
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'                  // nginx: do not buffer the stream
  });
  res.flushHeaders?.();

  const client: Client = { id: ++nextId, res };
  clients.add(client);
  send(client, 'retry: 5000\n: connected\n\n');

  const heartbeat = setInterval(() => send(client, ': ping\n\n'), HEARTBEAT_MS);
  const cleanup = () => { clearInterval(heartbeat); clients.delete(client); };
  req.on('close', cleanup);
  res.on('error', cleanup);
}

export const liveClientCount = () => clients.size;
