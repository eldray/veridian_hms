// src/store/toastStore.ts
import { create } from 'zustand';
import { Toast, ToastType } from '../components/Toast';

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// Generate unique ID without collisions
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Debounce map to prevent duplicate toasts
const recentToasts = new Map<string, number>();
const DEBOUNCE_TIME = 1000; // 1 second debounce

const getToastKey = (toast: Omit<Toast, 'id'>): string => {
  return `${toast.type}-${toast.title}-${toast.message || ''}`;
};

const shouldShowToast = (key: string): boolean => {
  const lastShown = recentToasts.get(key);
  const now = Date.now();
  
  if (lastShown && (now - lastShown) < DEBOUNCE_TIME) {
    return false; // Don't show duplicate
  }
  
  recentToasts.set(key, now);
  
  // Clean up after 5 seconds
  setTimeout(() => {
    recentToasts.delete(key);
  }, 5000);
  
  return true;
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    // Check for duplicate toasts
    const toastKey = getToastKey(toast);
    if (!shouldShowToast(toastKey)) {
      return;
    }
    
    const id = generateId();
    // Shorter durations for better UX
    const duration = toast.duration ?? (toast.type === 'error' ? 5000 : 3000);
    
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, duration }],
    }));
    
    // Auto-remove fallback (in case component unmounts)
    if (duration !== 0) {
      setTimeout(() => {
        const currentToasts = get().toasts;
        if (currentToasts.some(t => t.id === id)) {
          get().removeToast(id);
        }
      }, duration + 100);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => set({ toasts: [] }),
}));

// Helper hook with memoization to prevent re-renders
export const useToast = () => {
  const { addToast } = useToastStore();
  
  // Memoized functions to prevent recreation on every render
  return {
    success: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'success', title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'error', title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'warning', title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'info', title, message, duration }),
  };
};