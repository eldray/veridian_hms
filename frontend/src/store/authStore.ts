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
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: user.fullName,
  department: user.department,
  departmentId: user.departmentId,
  isActive: user.isActive,
  profileImage: user.profileImage,
});

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null; // ✅ stored so interceptor can use it
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

          // Write dedicated key BEFORE setting state so any
          // immediate API calls in components already have the token
          writeToken(accessToken);

          set({
            user: sanitizeUser(user) as User,
            token: accessToken,
            refreshToken: refreshToken || null,
            isLoading: false,
            isInitialized: true,
          });

          return true;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      checkAuth: async () => {
        const { user, token } = get();

        // ── Case 1: Zustand already hydrated from persist ──
        if (user && token) {
          writeToken(token); // ensure interceptor key is set
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

        // ── Case 2: No Zustand state — check orphaned auth_token ──
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
        // Pass refresh token so backend can invalidate it
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
        refreshToken: state.refreshToken, // ✅ persist so interceptor survives page refresh
        isInitialized: state.isInitialized,
      }),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) return persistedState;
        return persistedState;
      },
    }
  )
);