import axios from 'axios';
import { annotateApiError } from '../utils/apiError';

// Bookkeeping the GET concurrency gate hangs off each request config.
declare module 'axios' {
  interface AxiosRequestConfig {
    /** A slot of the gate is held by this request. */
    __slot?: boolean;
    __slotTimer?: ReturnType<typeof setTimeout>;
    /** Issued by a whole-collection walk, so it queues in the background lane. */
    __bulk?: boolean;
    /** Non-GET: occupies a browser connection without holding a gate slot. */
    __write?: boolean;
    __writeTimer?: ReturnType<typeof setTimeout>;
  }
}

let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  failedQueue = [];
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  // Login sets an HttpOnly cookie used to authenticate <img>/<a> requests for
  // uploaded clinical files. Cross-origin API deployments need this flag for
  // the browser to accept and resend that cookie.
  withCredentials: true,
  timeout: 30000,
});


// ── GET concurrency gate ─────────────────────────────────────────────────────
// Keep request bursts from starving the browser/Electron connection pool, but never
// leave a page's reads waiting indefinitely before Axios' own timeout can start.
const MAX_GETS = 4;
const MAX_QUEUED_GETS = 80;
// A queued read is only abandoned when nothing has moved for longer than Axios' own
// 30 s timeout, otherwise the queue cancels requests the browser would still have
// answered successfully.
const MAX_GET_QUEUE_WAIT_MS = 30_000;
// A "load every page" walk (fetchAllPages / streamCollection) issues dozens of reads
// at once. Left in the same lane as the single request the user is waiting for, the
// walk owns all four slots and that one request is cancelled behind its own backlog.
// Two slots stay reserved for it; a walk may borrow them only while nothing else waits.
const MAX_BULK_GETS = 2;
let activeGets = 0;
let activeBulkGets = 0;
/** How many paginated walks are currently issuing their page requests. */
let bulkDepth = 0;

/** Run a whole-collection walk so the requests it issues are queued as background work. */
export function runBulk<T>(fn: () => Promise<T>): Promise<T> {
  bulkDepth++;
  return Promise.resolve()
    .then(fn)
    .finally(() => { bulkDepth = Math.max(0, bulkDepth - 1); });
}

type GetWaiter = {
  config: any;
  grant: () => void;
  reject: (error: any) => void;
  timer: ReturnType<typeof setTimeout>;
  onAbort?: () => void;
};
const waitingNormal: GetWaiter[] = [];
const waitingBulk: GetWaiter[] = [];

const queueFor = (isBulk: boolean) => (isBulk ? waitingBulk : waitingNormal);
const queuedWaiters = () => waitingNormal.length + waitingBulk.length;

const canTake = (isBulk: boolean) =>
  activeGets < getCapacity() &&
  (!isBulk || activeBulkGets < MAX_BULK_GETS || waitingNormal.length === 0);

// Chromium opens 6 connections per host on HTTP/1.1 and the live-updates stream keeps one
// of them for the whole session. Writes are not gated, so a burst of saves otherwise
// pushes every queued read past its timeout: reads step aside while writes are in flight.
let activeWrites = 0;
const getCapacity = () => Math.max(1, MAX_GETS - activeWrites);

const releaseWrite = (config: any) => {
  if (!config?.__write) return;
  config.__write = false;
  clearTimeout(config.__writeTimer);
  activeWrites = Math.max(0, activeWrites - 1);
  drainQueues();
};

const detachWaiter = (waiter: GetWaiter) => {
  clearTimeout(waiter.timer);
  waiter.config.signal?.removeEventListener?.('abort', waiter.onAbort);
};

const acquireSlot = (config: any): Promise<void> => {
  if (config.__slot) return Promise.resolve();
  const isBulk = !!config.__bulk;
  if (config.signal?.aborted) {
    return Promise.reject(new axios.CanceledError('GET request was cancelled before it started.'));
  }

  const take = () => {
    activeGets++;
    if (isBulk) activeBulkGets++;
    config.__slot = true;
    // Safety net if the request adapter never settles. Normal Axios timeout is 30 seconds.
    config.__slotTimer = setTimeout(() => releaseSlot(config), 65_000);
  };

  if (canTake(isBulk)) {
    take();
    return Promise.resolve();
  }
  const waiting = queueFor(isBulk);
  if (queuedWaiters() >= MAX_QUEUED_GETS) {
    return Promise.reject(new axios.CanceledError(
      'The application is busy loading data. Please retry this request.',
    ));
  }

  return new Promise<void>((resolve, reject) => {
    const routeWhenQueued = typeof window !== 'undefined' ? window.location.pathname : '';
    let waiter: GetWaiter;
    waiter = {
      config,
      timer: setTimeout(() => {
        const index = waiting.indexOf(waiter);
        if (index >= 0) waiting.splice(index, 1);
        detachWaiter(waiter);
        reject(new axios.CanceledError(
          'This data request waited too long behind other requests. Retry the page load.',
        ));
      }, MAX_GET_QUEUE_WAIT_MS),
      onAbort: undefined,
      grant: () => {
        detachWaiter(waiter);
        // Avoid sending a backlog of reads belonging to a page the user has already left.
        if (config.signal?.aborted ||
            (routeWhenQueued && typeof window !== 'undefined' && window.location.pathname !== routeWhenQueued)) {
          reject(new axios.CanceledError('The page changed before this data request could start.'));
          return;
        }
        take();
        resolve();
      },
      reject,
    };
    waiter.onAbort = () => {
      const index = waiting.indexOf(waiter);
      if (index >= 0) waiting.splice(index, 1);
      detachWaiter(waiter);
      reject(new axios.CanceledError('GET request was cancelled while waiting for a connection.'));
    };
    config.signal?.addEventListener?.('abort', waiter.onAbort, { once: true });
    waiting.push(waiter);
  });
};

/** The next waiter that may be granted: whatever the user is waiting for first. */
const nextGrantable = (): { waiter: GetWaiter; isBulk: boolean } | null => {
  if (waitingNormal.length > 0 && canTake(false)) return { waiter: waitingNormal[0], isBulk: false };
  if (waitingBulk.length > 0 && canTake(true)) return { waiter: waitingBulk[0], isBulk: true };
  return null;
};

const releaseSlot = (config: any) => {
  if (!config?.__slot) return;
  config.__slot = false;
  clearTimeout(config.__slotTimer);
  activeGets = Math.max(0, activeGets - 1);
  if (config.__bulk) activeBulkGets = Math.max(0, activeBulkGets - 1);

  drainQueues();
};

const drainQueues = () => {
  for (;;) {
    const next = nextGrantable();
    if (!next) break;
    const waiting = queueFor(next.isBulk);
    waiting.shift();
    clearTimeout(next.waiter.timer);
    next.waiter.config.signal?.removeEventListener?.('abort', next.waiter.onAbort);
    if (next.waiter.config.signal?.aborted) {
      next.waiter.reject(new axios.CanceledError('GET request was cancelled while waiting for a connection.'));
      continue;
    }
    next.waiter.grant();
  }
};

api.interceptors.request.use(
  async (config) => {
    const method = (config.method || 'get').toLowerCase();
    if (method === 'get') {
      config.__bulk = bulkDepth > 0;
      await acquireSlot(config);
    } else if (!config.__write) {
      config.__write = true;
      activeWrites++;
      config.__writeTimer = setTimeout(() => releaseWrite(config), 65_000);
    }
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => { releaseSlot(response.config); releaseWrite(response.config); return response; },
  async (error) => {
    const originalRequest = error.config;
    releaseSlot(originalRequest);
    releaseWrite(originalRequest);

    // Name the reason for the rejection once, here. Screens toast `err.message`, which axios
    // otherwise leaves as "Request failed with status code 400", so a form that was refused for a
    // blank box said nothing about the box.
    annotateApiError(error);

    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/logout') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh-token'); // ✅ correct URL

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Get the stored refresh token
      const authStorage = localStorage.getItem('auth-storage');
      let refreshToken: string | null = null;
      try {
        if (authStorage) {
          refreshToken = JSON.parse(authStorage)?.state?.refreshToken || null;
        }
      } catch {
        // ignore parse errors
      }

      // If no refresh token stored, check if the access token itself is still valid
      // A 401 on a non-auth endpoint with a valid token = backend permission issue, not expiry
      if (!refreshToken) {
        isRefreshing = false;

        // Verify the access token is actually dead before logging out
        const token = localStorage.getItem('auth_token');
        if (!token) {
          // Genuinely no token at all
          localStorage.removeItem('auth-storage');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        // Token exists but got 401 — likely a backend permissions issue on this endpoint
        // Do NOT logout. Just reject so the component can handle the error gracefully.
        console.warn(
          `⚠️ 401 on ${originalRequest.url} — no refresh token available. ` +
          `Likely a backend role/permission issue. Not logging out.`
        );
        return Promise.reject(error);
      }

      try {
        // ✅ Correct refresh-token endpoint
        const { data } = await api.post('/auth/refresh-token', { refreshToken });
        const newToken =
          data.data?.accessToken ||
          data.accessToken ||
          data.data?.token ||
          data.token;

        if (!newToken) throw new Error('No token in refresh response');

        const newRefreshToken =
          data.data?.refreshToken ||
          data.refreshToken;

        // Update auth_token
        localStorage.setItem('auth_token', newToken);

        // Update Zustand persisted store
        try {
          const stored = localStorage.getItem('auth-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.state) {
              parsed.state.token = newToken;
              if (newRefreshToken) {
                parsed.state.refreshToken = newRefreshToken;
              }
              localStorage.setItem('auth-storage', JSON.stringify(parsed));
            }
          }
        } catch {
          // Non-critical
        }

        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);

        // Only clear and redirect if refresh actually returned 401
        // (not a network error or 404 — don't punish users for backend issues)
        if (refreshError?.response?.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth-storage');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        } else {
          console.warn(
            `⚠️ Refresh failed with status ${refreshError?.response?.status} — ` +
            `not logging out to avoid false session termination`
          );
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;