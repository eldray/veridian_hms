// src/store/authStore.ts - FIXED VERSION
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  login as apiLogin, 
  register as apiRegister, 
  verifyToken, 
  logout as apiLogout,
  getProfile as apiGetProfile,
  updateProfile as apiUpdateProfile,
  changePassword as apiChangePassword
} from '../api';
import type { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Auth
  login: (username: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<void>;
  checkAuth: () => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  
  // Profile
  getProfile: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isInitialized: false,

      login: async (username: string, password: string): Promise<boolean> => {
        set({ isLoading: true });
        try {
          console.log('🔐 Attempting login for user:', username);
          const response = await apiLogin(username, password);
          console.log('✅ Login response received:', response);
          
          const user = response.user || response;
          const token = response.token || response.accessToken;

          if (!token) {
            console.error('❌ No token received in login response');
            throw new Error('No authentication token received');
          }

          // CRITICAL: Store token in localStorage
          localStorage.setItem('auth_token', token);
          console.log('💾 Token saved to localStorage');

          console.log('🔐 Login successful - User:', user.username, 'Role:', user.role);
          set({ 
            user, 
            token,
            isLoading: false,
            isInitialized: true
          });
          return true;
        } catch (error: any) {
          console.error('❌ Login failed:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData) => {
        set({ isLoading: true });
        try {
          const response = await apiRegister(userData);
          const token = response.token || response.accessToken;
          
          // Sync token with localStorage
          localStorage.setItem('auth_token', token);
          
          set({
            user: response.user,
            token,
            isLoading: false,
            isInitialized: true
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      checkAuth: async () => {
        const state = get();
        
        // Get token from localStorage to ensure consistency
        const storedToken = localStorage.getItem('auth_token');
        
        // If no token in localStorage, clear everything
        if (!storedToken) {
          console.log('❌ No token in localStorage - clearing auth');
          set({ 
            user: null, 
            token: null, 
            isLoading: false,
            isInitialized: true 
          });
          return;
        }

        // ✅ FIX: ALWAYS verify token with backend, regardless of existing state
        set({ isLoading: true });

        try {
          console.log('🔄 Verifying token with backend...');
          const user = await verifyToken();
          console.log('✅ Token verified successfully - User:', user.username, 'Role:', user.role);
          
          // ✅ FIX: Update both token and user state
          set({ 
            user, 
            token: storedToken,
            isLoading: false,
            isInitialized: true
          });
        } catch (error: any) {
          console.error('❌ Token verification failed:', error);
          
          // Clear all auth data on verification failure
          localStorage.removeItem('auth_token');
          console.log('🗑️ Removed invalid token from localStorage');
          
          set({ 
            user: null, 
            token: null, 
            isLoading: false,
            isInitialized: true 
          });
          
          // Optional: Redirect to login if not already there
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      },

      logout: () => {
        console.log('🚪 Logging out...');
        // Clear both localStorage and Zustand state
        localStorage.removeItem('auth_token');
        set({ user: null, token: null, isInitialized: true });
        apiLogout().catch(console.error);
      },

      hasRole: (roles: UserRole[]) => {
        const { user } = get();
        return user ? roles.includes(user.role) : false;
      },

      getProfile: async () => {
        set({ isLoading: true });
        try {
          const user = await apiGetProfile();
          set({ user, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch profile:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true });
        try {
          const user = await apiUpdateProfile(data);
          set({ user, isLoading: false });
        } catch (error) {
          console.error('Failed to update profile:', error);
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
          console.error('Failed to change password:', error);
          set({ isLoading: false });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      // Only persist these fields
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        isInitialized: state.isInitialized
      }),
      version: 1,
    }
  )
);