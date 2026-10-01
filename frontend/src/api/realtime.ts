/**
 * Live updates for screens.
 *
 * The server (GET /api/events, Server-Sent Events) announces "<topic> changed" after any
 * successful write. A screen subscribes to the topics it shows and re-fetches its own data:
 *
 *   useLiveRefresh(['encounters', 'admissions'], refreshList);
 *
 * Behaviour that matters in a busy hospital:
 *  - one shared connection for the whole app (not one per screen)
 *  - a random 0.2-2 s delay before re-fetching, so 100 open screens don't all hit the
 *    server in the same instant after one change
 *  - hidden browser tabs do nothing until they become visible again, then catch up once
 *  - if the stream drops it reconnects (2 s, 4 s ... 30 s) and catches up on reconnect;
 *    while disconnected, visible screens fall back to a refresh every 45 s
 */
import { useEffect, useRef } from 'react';
import api from './api';

type Handler = () => void;

const FALLBACK_POLL_MS = 45_000;
const MAX_BACKOFF_MS = 30_000;

const subscribers = new Map<string, Set<Handler>>(); // topic -> handlers
const pendingTimers = new Map<Handler, number>();     // handler -> scheduled re-fetch
const stale = new Set<Handler>();                     // changed while the tab was hidden

let running = false;
let connected = false;
let hasConnectedBefore = false;
let abort: AbortController | null = null;
let pollTimer: number | null = null;
let backoff = 2000;

const allHandlers = () => {
  const all = new Set<Handler>();
  subscribers.forEach((set) => set.forEach((h) => all.add(h)));
  return all;
};

const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

function schedule(handler: Handler) {
  if (pendingTimers.has(handler)) return; // a re-fetch is already queued
  if (!visible()) { stale.add(handler); return; }
  const delay = 200 + Math.random() * 1800;
  pendingTimers.set(handler, window.setTimeout(() => {
    pendingTimers.delete(handler);
    if (!visible()) { stale.add(handler); return; }
    try { handler(); } catch { /* a failing screen must not break the others */ }
  }, delay));
}

function onChange(topic: string) {
  subscribers.get(topic)?.forEach(schedule);
}

function handleBlock(block: string) {
  let event = 'message';
  let data = '';
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  if (event !== 'change' || !data) return;
  try { onChange(JSON.parse(data).topic); } catch { /* ignore malformed */ }
}

function startPolling() {
  if (pollTimer !== null) return;
  pollTimer = window.setInterval(() => {
    if (!connected && visible()) allHandlers().forEach(schedule);
  }, FALLBACK_POLL_MS);
}

function stopPolling() {
  if (pollTimer !== null) { window.clearInterval(pollTimer); pollTimer = null; }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function connectLoop() {
  while (running) {
    abort = new AbortController();
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) { await sleep(5000); continue; } // not logged in yet

      const base = String(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
      const res = await fetch(`${base}/events`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: abort.signal,
      });

      if (res.status === 401) {
        // Expired token: any normal request triggers the refresh-token flow in api.ts
        await api.get('/auth/profile').catch(() => undefined);
        throw new Error('unauthorized');
      }
      if (!res.ok || !res.body) throw new Error(`events ${res.status}`);

      connected = true;
      backoff = 2000;
      stopPolling();
      if (hasConnectedBefore) allHandlers().forEach(schedule); // catch up on anything missed
      hasConnectedBefore = true;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
        let end: number;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          handleBlock(buffer.slice(0, end));
          buffer = buffer.slice(end + 2);
        }
      }
    } catch {
      /* dropped or aborted: fall through to the reconnect wait */
    }
    connected = false;
    if (!running) return;
    startPolling();
    await sleep(backoff);
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
  }
}

function onVisibilityChange() {
  if (!visible()) return;
  const catchUp = Array.from(stale);
  stale.clear();
  catchUp.forEach(schedule);
}

function start() {
  if (running) return;
  running = true;
  document.addEventListener('visibilitychange', onVisibilityChange);
  void connectLoop();
}

function stop() {
  running = false;
  connected = false;
  abort?.abort();
  abort = null;
  stopPolling();
  document.removeEventListener('visibilitychange', onVisibilityChange);
  pendingTimers.forEach((t) => window.clearTimeout(t));
  pendingTimers.clear();
  stale.clear();
}

/** Subscribe to topics. Returns the unsubscribe function. */
export function subscribeToChanges(topics: string[], handler: Handler): () => void {
  topics.forEach((topic) => {
    if (!subscribers.has(topic)) subscribers.set(topic, new Set());
    subscribers.get(topic)!.add(handler);
  });
  start();

  return () => {
    topics.forEach((topic) => {
      const set = subscribers.get(topic);
      set?.delete(handler);
      if (set && set.size === 0) subscribers.delete(topic);
    });
    const timer = pendingTimers.get(handler);
    if (timer !== undefined) { window.clearTimeout(timer); pendingTimers.delete(handler); }
    stale.delete(handler);
    if (subscribers.size === 0) stop();
  };
}

/**
 * Re-run `refresh` whenever one of `topics` changes on the server.
 * `refresh` should be a quiet reload (no full-screen spinner) of just what the screen shows.
 */
export function useLiveRefresh(topics: string[], refresh: () => unknown, enabled = true) {
  const latest = useRef(refresh);
  latest.current = refresh;
  const key = topics.join(',');

  useEffect(() => {
    if (!enabled) return;
    return subscribeToChanges(topics, () => {
      Promise.resolve()
        .then(() => latest.current())
        .catch(() => undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
}
