import axios from 'axios';

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
  timeout: 30000,
});


// ── GET concurrency gate ─────────────────────────────────────────────────────
// Keep request bursts from starving the browser/Electron connection pool, but never
// leave a page's reads waiting indefinitely before Axios' own timeout can start.
const MAX_GETS = 4;
const MAX_QUEUED_GETS = 80;
const MAX_GET_QUEUE_WAIT_MS = 12_000;
let activeGets = 0;

type GetWaiter = {
  config: any;
  grant: () => void;
  reject: (error: any) => void;
  timer: ReturnType<typeof setTimeout>;
  onAbort?: () => void;
};
const waiting: GetWaiter[] = [];

const removeWaiter = (waiter: GetWaiter) => {
  const index = waiting.indexOf(waiter);
  if (index >= 0) waiting.splice(index, 1);
  clearTimeout(waiter.timer);
  waiter.config.signal?.removeEventListener?.('abort', waiter.onAbort);
};

const acquireSlot = (config: any): Promise<void> => {
  if (config.__slot) return Promise.resolve();
  if (config.signal?.aborted) {
    return Promise.reject(new axios.CanceledError('GET request was cancelled before it started.'));
  }

  const take = () => {
    activeGets++;
    config.__slot = true;
    // Safety net if the request adapter never settles. Normal Axios timeout is 30 seconds.
    config.__slotTimer = setTimeout(() => releaseSlot(config), 65_000);
  };

  if (activeGets < MAX_GETS) {
    take();
    return Promise.resolve();
  }
  if (waiting.length >= MAX_QUEUED_GETS) {
    return Promise.reject(new axios.CanceledError(
      'The application is busy loading data. Please retry this request.',
    ));
  }

  return new Promise<void>((resolve, reject) => {
    const routeWhenQueued = typeof window !== 'undefined' ? window.location.pathname : '';
    let waiter: GetWaiter;
    const cleanup = () => {
      clearTimeout(waiter.timer);
      config.signal?.removeEventListener?.('abort', waiter.onAbort);
    };
    waiter = {
      config,
      timer: setTimeout(() => {
        const index = waiting.indexOf(waiter);
        if (index >= 0) waiting.splice(index, 1);
        cleanup();
        reject(new axios.CanceledError(
          'This data request waited too long behind other requests. Retry the page load.',
        ));
      }, MAX_GET_QUEUE_WAIT_MS),
      onAbort: undefined,
      grant: () => {
        cleanup();
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
      removeWaiter(waiter);
      reject(new axios.CanceledError('GET request was cancelled while waiting for a connection.'));
    };
    config.signal?.addEventListener?.('abort', waiter.onAbort, { once: true });
    waiting.push(waiter);
  });
};

const releaseSlot = (config: any) => {
  if (!config?.__slot) return;
  config.__slot = false;
  clearTimeout(config.__slotTimer);
  activeGets = Math.max(0, activeGets - 1);

  while (waiting.length > 0 && activeGets < MAX_GETS) {
    const next = waiting.shift()!;
    clearTimeout(next.timer);
    next.config.signal?.removeEventListener?.('abort', next.onAbort);
    if (next.config.signal?.aborted) {
      next.reject(new axios.CanceledError('GET request was cancelled while waiting for a connection.'));
      continue;
    }
    next.grant();
    // grant may reject a stale route without taking a slot; continue looking.
    if (next.config.__slot) break;
  }
};

api.interceptors.request.use(
  async (config) => {
    if ((config.method || 'get').toLowerCase() === 'get') await acquireSlot(config);
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => { releaseSlot(response.config); return response; },
  async (error) => {
    const originalRequest = error.config;
    releaseSlot(originalRequest);

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