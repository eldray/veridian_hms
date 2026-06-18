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

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

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