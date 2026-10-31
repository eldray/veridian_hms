/**
 * Which visit a department screen should open on.
 *
 * The picker's own ordering favours "open now" visits, which is right for a chart but
 * wrong for an entry screen: a patient's queued test can sit on an older visit while
 * today's visit carries nothing for this department. So work waiting for the department
 * wins, and only among visits without work does the usual open-now / newest order apply.
 */

const OPEN_STATUSES = new Set(['pending', 'admitted']);

const rank = (visit: any, now = new Date()): number => {
  const status = String(visit?.status || '');
  if (!OPEN_STATUSES.has(status)) return 3;
  const at = new Date(visit?.dateTime ?? '');
  if (visit?.dateTime && !Number.isNaN(at.getTime()) && at.toDateString() === now.toDateString()) return 0;
  return status === 'admitted' ? 1 : 2;
};

const timeKey = (visit: any): number => {
  const ms = new Date(visit?.dateTime || visit?.createdAt || '').getTime();
  return Number.isNaN(ms) ? -Infinity : ms;
};

export function pickVisit<T>(visits: T[] | null | undefined, hasWork: (visit: T) => boolean): T | undefined {
  if (!visits?.length) return undefined;
  const sorted = [...visits].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    return byRank !== 0 ? byRank : timeKey(b) - timeKey(a);
  });
  return sorted.find(hasWork) ?? sorted[0];
}
