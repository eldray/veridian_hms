// Query strings are caller-controlled, so a list endpoint must never trust a
// `limit` straight from the URL: an enormous value turns one page request into
// a full-table scan and a huge JSON response.

export const DEFAULT_MAX_PAGE_SIZE = 200;

export function parsePage(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

export function parsePageSize(value: unknown, fallback: number, max = DEFAULT_MAX_PAGE_SIZE): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return Math.min(fallback, max);
  return Math.min(max, Math.floor(parsed));
}
