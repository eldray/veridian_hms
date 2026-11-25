// Shared "load a whole collection" helper for the Zustand stores.
//
// The backend caps every list endpoint at 100 rows per request, so asking for
// limit: 500 returns 100 rows and callers that need everything must walk the
// pages. Doing that inline in each store produced serial 50-100 request walks
// with no cache and no de-duplication, which saturates the renderer's GET
// concurrency gate and is what makes pages appear to freeze.
//
// This helper keeps the same "await gives you the complete list" contract but:
//   - writes page 1 into the store immediately and appends each batch after it,
//   - streams the remaining pages a few requests at a time,
//   - shares one in-flight walk between every page that asks for the same thing,
//   - caches the result briefly (TTL) so tab switches don't re-fetch,
//   - stops stale walks from writing into the store.

import { API_PAGE_SIZE, fetchAllPages } from '../api';

const DEFAULT_TTL_MS = 30_000;
// A whole-collection walk runs in the gate's background lane, which is 2 requests wide;
// queueing more only adds waiters that sit idle while interactive reads go first.
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_MAX_ITEMS = 10_000;

interface CacheEntry {
  promise: Promise<any[]> | null;
  items: any[];
  loadedAt: number;
  /** Rows in the database, which can be more than the collected page walk returned. */
  total: number | null;
}

/** Fine-grained identity: collection + exact filters. Drives the cache and in-flight sharing. */
const cacheEntries = new Map<string, CacheEntry>();
/** Coarse identity: collection name. A newer walk supersedes older writes to the same store field. */
const walkGenerations = new Map<string, number>();

const cacheKeyOf = (key: string, filters: any): string => {
  const normalized = Object.entries(filters || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));
  return `${key}::${JSON.stringify(normalized)}`;
};

export interface StreamOptions<T> {
  /** Store field being filled, e.g. 'stockItems'. Also the invalidation handle. */
  key: string;
  /** A single-page API function that accepts { page, limit, ...filters }. */
  fetchPage: (params: any) => Promise<any>;
  filters?: any;
  /** Row ceiling. Defaults to the limit the caller asked for, else 10 000 rows. */
  maxItems?: number;
  /**
   * Rows asked for per request. The backend caps some endpoints at 100 and lets
   * reference tables return up to 1000, so this is set where the wider page is
   * documented: fetchAllPages falls back to whatever the server actually returned.
   */
  pageSize?: number;
  concurrency?: number;
  ttlMs?: number;
  /** Skip the cache and always hit the server. */
  force?: boolean;
  /** Applied to every cumulative snapshot before it reaches the store. */
  transform?: (rows: any[]) => T[];
  onProgress?: (items: T[], total: number) => void;
}

export async function streamCollection<T = any>({
  key,
  fetchPage,
  filters = {},
  maxItems,
  pageSize = API_PAGE_SIZE,
  concurrency = DEFAULT_CONCURRENCY,
  ttlMs = DEFAULT_TTL_MS,
  force = false,
  transform,
  onProgress,
}: StreamOptions<T>): Promise<T[]> {
  const requestedLimit = Number(filters?.limit);
  const rowCeiling = maxItems
    ?? (Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : DEFAULT_MAX_ITEMS);
  const cacheKey = cacheKeyOf(key, filters);
  const apply = (rows: any[], total: number) => {
    const mapped = transform ? transform(rows) : (rows as T[]);
    onProgress?.(mapped, total);
    return mapped;
  };

  const existing = cacheEntries.get(cacheKey);
  const entry: CacheEntry = existing ?? { promise: null, items: [], loadedAt: 0, total: null };
  if (!existing) cacheEntries.set(cacheKey, entry);

  if (!force && entry.promise) return entry.promise;

  // A completed walk for the same collection + filters is reused for a moment, so
  // switching tabs or opening another screen over the same data costs no requests.
  if (!force && entry.items.length > 0 && Date.now() - entry.loadedAt < ttlMs) {
    const cached = transform ? transform(entry.items) : (entry.items as T[]);
    onProgress?.(cached, entry.total ?? cached.length);
    return cached;
  }

  const generation = (walkGenerations.get(key) || 0) + 1;
  walkGenerations.set(key, generation);
  const isCurrentWalk = () => walkGenerations.get(key) === generation;

  let lastKnownTotal: number | null = null;
  const run = async (): Promise<T[]> => {
    const rows = await fetchAllPages<any>(fetchPage, filters, {
      pageSize: Math.min(pageSize, rowCeiling),
      maxItems: rowCeiling,
      concurrency,
      onPage: (itemsSoFar, total) => {
        if (total !== null) lastKnownTotal = total;
        // Paint progressively, but only while this walk still owns the store field.
        if (!isCurrentWalk()) return;
        apply(itemsSoFar, total ?? itemsSoFar.length);
      },
    });

    const finalRows = transform ? transform(rows) : (rows as T[]);
    if (isCurrentWalk()) {
      onProgress?.(finalRows, lastKnownTotal ?? finalRows.length);
      entry.items = rows;
      entry.total = lastKnownTotal;
      entry.loadedAt = Date.now();
    }
    return finalRows;
  };

  const promise = run().finally(() => {
    if (entry.promise === promise) entry.promise = null;
  });
  entry.promise = promise;
  return promise;
}

/**
 * Drop cached rows for a collection so the next read refetches (call after a write),
 * and stop any in-flight walk from overwriting the store with pre-write data.
 */
export const invalidateCollection = (key: string) => {
  walkGenerations.set(key, (walkGenerations.get(key) || 0) + 1);
  for (const [cacheKey, entry] of cacheEntries) {
    if (cacheKey.startsWith(`${key}::`)) {
      entry.items = [];
      entry.total = null;
      entry.loadedAt = 0;
      entry.promise = null;
    }
  }
};
