// backend/src/utils/ttlCache.ts
//
// Tiny in-memory cache for dashboard-style reads that many users request at the same time.
//  - results are reused for `ttlMs`
//  - callers that arrive while the first one is still computing share its result
//    (100 screens asking at once = ONE database query, not 100)
//  - a failed computation is never cached
// Memory is bounded by `maxEntries`. One server process; with several processes each has its own cache.

interface Entry<T> { value?: T; expires: number; inflight?: Promise<T> }

const store = new Map<string, Entry<any>>();
const MAX_ENTRIES = 500;

export async function cached<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);

  if (hit) {
    if (hit.inflight) return hit.inflight;
    if (hit.expires > now) return hit.value as T;
  }

  const inflight = compute()
    .then((value) => {
      store.set(key, { value, expires: Date.now() + ttlMs });
      return value;
    })
    .catch((err) => {
      store.delete(key);
      throw err;
    });

  store.set(key, { expires: 0, inflight });

  if (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined && oldest !== key) store.delete(oldest);
  }
  return inflight;
}

/** Drop cached values whose key starts with `prefix` (call after a write that changes them). */
export function invalidate(prefix: string): void {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}

/**
 * Make read-only report methods of `instance` cache their results for `ttlMs`.
 * Key = class + method + arguments, so different date ranges are cached separately.
 * Callers that ask while the first is still computing share its result.
 * Only use for methods whose result does not depend on WHO is asking.
 */
// Heavy report computations run at most MAX_HEAVY at a time; the rest wait their turn.
// A year-long report loads hundreds of thousands of rows (about 1.5 GB at 1M visits), so
// letting 20 of them run together would exhaust the server's memory.
const MAX_HEAVY = Number(process.env.REPORT_MAX_CONCURRENT || 2);
let running = 0;
const waiting: Array<() => void> = [];

async function withHeavySlot<T>(work: () => Promise<T>): Promise<T> {
  if (running >= MAX_HEAVY) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await work();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

export function cacheReadMethods(instance: any, names: string[], ttlMs: number): void {
  const cls = instance.constructor?.name || 'Service';
  for (const name of names) {
    const original = instance[name];
    if (typeof original !== 'function') continue;
    const bound = original.bind(instance);
    instance[name] = (...args: any[]) => {
      let key: string;
      try { key = `${cls}.${name}:${JSON.stringify(args)}`; } catch { return bound(...args); }
      return cached(key, ttlMs, () => withHeavySlot(() => bound(...args)));
    };
  }
}
