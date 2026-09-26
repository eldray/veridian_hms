import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  login as apiLogin,
  verifyToken,
  logout as apiLogout,
  getProfile as apiGetProfile,
  updateProfile as apiUpdateProfile,
  changePassword as apiChangePassword,
} from '../api/auth';
import type { User } from '../types';

// ─────────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────────

const writeToken = (token: string) => {
  localStorage.setItem('auth_token', token);
};

const clearToken = () => {
  localStorage.removeItem('auth_token');
};

const readToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// ─────────────────────────────────────────────
// Sanitize user
// ─────────────────────────────────────────────

const sanitizeUser = (user: any): Partial<User> => ({
  id: user.id || user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  permissions: user.permissions,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: user.fullName,
  department: user.department,
  departmentId: user.departmentId,
  isActive: user.isActive,
  profileImage: user.profileImage,
  imageUrl: user.imageUrl,
  seniority: user.seniority,
  createdAt: user.createdAt,
  phone: user.phone,
});

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** Thrown by login() so callers can branch on status (401 vs 5xx vs network). */
export class LoginError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'LoginError';
    this.status = status;
    this.code = code;
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;

  login: (username: string, password: string) => Promise<boolean>;
  checkAuth: () => Promise<void>;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  getProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      isInitialized: false,

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const { user, accessToken, refreshToken } = await apiLogin(username, password);

          writeToken(accessToken);

          set({
            user: sanitizeUser(user) as User,
            token: accessToken,
            refreshToken: refreshToken || null,
            isLoading: false,
            isInitialized: true,
          });

          return true;
        } catch (error: any) {
          set({ isLoading: false });

          // ── Distinguish 401 (bad creds / inactive) from network / 5xx ──
          const status = error?.response?.status;
          const serverMsg =
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.message;

          if (status === 401) {
            throw new LoginError(
              serverMsg || 'Invalid username or password',
              401,
              'INVALID_CREDENTIALS',
            );
          }
          if (status === 403) {
            throw new LoginError(
              serverMsg || 'Account is not permitted to log in',
              403,
              'FORBIDDEN',
            );
          }
          if (status === 429) {
            throw new LoginError(
              serverMsg || 'Too many attempts. Try again later.',
              429,
              'RATE_LIMITED',
            );
          }
          if (!status) {
            // No HTTP response at all → network / DNS / CORS
            throw new LoginError(
              serverMsg || 'Cannot reach the server. Check your connection.',
              undefined,
              'NETWORK',
            );
          }
          throw new LoginError(serverMsg || 'Login failed', status, 'UNKNOWN');
        }
      },

      checkAuth: async () => {
        const { user, token } = get();

        if (user && token) {
          writeToken(token);
          try {
            const freshUser = await verifyToken();
            set({
              user: sanitizeUser(freshUser) as User,
              isLoading: false,
              isInitialized: true,
            });
          } catch {
            clearToken();
            set({
              user: null,
              token: null,
              refreshToken: null,
              isLoading: false,
              isInitialized: true,
            });
          }
          return;
        }

        const storedToken = readToken();
        if (!storedToken) {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isLoading: false,
            isInitialized: true,
          });
          return;
        }

        set({ isLoading: true });
        try {
          const freshUser = await verifyToken();
          set({
            user: sanitizeUser(freshUser) as User,
            token: storedToken,
            isLoading: false,
            isInitialized: true,
          });
        } catch {
          clearToken();
          set({
            user: null,
            token: null,
            refreshToken: null,
            isLoading: false,
            isInitialized: true,
          });
        }
      },

      logout: () => {
        const { refreshToken } = get();
        clearToken();
        set({
          user: null,
          token: null,
          refreshToken: null,
          isInitialized: true,
        });
        apiLogout(refreshToken || undefined).catch(() => {});
      },

      hasRole: (roles) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },

      hasAnyRole: (roles) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },

      getProfile: async () => {
        set({ isLoading: true });
        try {
          const user = await apiGetProfile();
          set({ user: sanitizeUser(user) as User, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true });
        try {
          const user = await apiUpdateProfile(data);
          set({ user: sanitizeUser(user) as User, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        set({ isLoading: true });
        try {
          await apiChangePassword(currentPassword, newPassword);
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isInitialized: state.isInitialized,
      }),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) return persistedState;
        return persistedState;
      },
    },
  ),
);