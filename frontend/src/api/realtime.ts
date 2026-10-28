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
 *  - at most one refresh per screen in flight, and no second one inside the gap below, so a
 *    busy clinic (vitals, dispensing, billing writes every few seconds) cannot stack walks
 *  - hidden browser tabs do nothing until they become visible again, then catch up once
 *  - if the stream drops it reconnects (2 s, 4 s ... 30 s) and catches up on reconnect;
 *    while disconnected, visible screens fall back to a refresh every 45 s
 */
import { useEffect, useRef } from 'react';
import api from './api';

type Handler = () => unknown;

const FALLBACK_POLL_MS = 45_000;
const MAX_BACKOFF_MS = 30_000;
const STALL_MS = 70_000; // no bytes (not even the 25 s heartbeat) for this long = connection is dead
// Shortest distance between two refreshes of the same screen. A change burst arriving inside
// this window is not dropped: it re-arms a timer for the remainder, so the screen still
// catches up, just once instead of once per event.
const MIN_REFRESH_GAP_MS = 10_000;

const subscribers = new Map<string, Set<Handler>>(); // topic -> handlers
const pendingTimers = new Map<Handler, number>();     // handler -> scheduled re-fetch
const stale = new Set<Handler>();                     // changed while the tab was hidden
const lastRunAt = new Map<Handler, number>();          // handler -> when its refresh started
const inFlight = new Set<Handler>();                   // handler -> refresh still fetching

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
  const since = Date.now() - (lastRunAt.get(handler) ?? 0);
  const wait = MIN_REFRESH_GAP_MS - since;
  const delay = wait > 0 ? wait : 200 + Math.random() * 1800;
  pendingTimers.set(handler, window.setTimeout(() => run(handler), delay));
}

function run(handler: Handler) {
  pendingTimers.delete(handler);
  if (!visible()) { stale.add(handler); return; }
  if (inFlight.has(handler)) {
    // The previous refresh of this screen is still walking its lists. Starting a second
    // copy would double the requests for the same rows, so try again after one more gap.
    pendingTimers.set(handler, window.setTimeout(() => run(handler), MIN_REFRESH_GAP_MS));
    return;
  }
  inFlight.add(handler);
  lastRunAt.set(handler, Date.now());
  let result: unknown;
  try {
    result = handler();
  } catch {
    inFlight.delete(handler);
    return;
  }
  // A screen's refresh is a promise chain; keep the slot until it settles. A failing
  // screen must not break the others.
  Promise.resolve(result)
    .catch(() => undefined)
    .finally(() => inFlight.delete(handler));
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
    // Watchdog: the server pings every 25 s. A half-dead connection (sleep, Wi-Fi drop, busy server)
    // never errors, it just goes silent, and the app then looks frozen until a reload. Cut it and reconnect.
    const mine = abort;
    let lastActivity = Date.now();
    const watchdog = window.setInterval(() => {
      if (Date.now() - lastActivity > STALL_MS) mine.abort();
    }, 10_000);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) { window.clearInterval(watchdog); await sleep(5000); continue; } // not logged in yet

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
        lastActivity = Date.now(); // data or a heartbeat ping arrived
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
    window.clearInterval(watchdog);
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
  lastRunAt.clear();
  inFlight.clear();
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
    lastRunAt.delete(handler);
    inFlight.delete(handler);
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
    return subscribeToChanges(topics, () =>
      // Returned, not swallowed: the dispatcher keeps the screen's slot busy until this
      // settles, so one slow walk cannot overlap the next one.
      Promise.resolve()
        .then(() => latest.current())
        .catch(() => undefined)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
}
