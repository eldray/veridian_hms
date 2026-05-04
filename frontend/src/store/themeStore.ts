// src/store/themeStore.ts
// Manages the active color scheme and light/dark mode.
// Persists both choices to localStorage so they survive page refreshes.
// Applies CSS variables directly to :root — no context provider needed.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  COLOR_SCHEMES,
  DEFAULT_SCHEME_ID,
  type ThemeMode,
  type ColorScheme,
} from '../styles/themes';

interface ThemeState {
  schemeId: string;
  mode: ThemeMode;

  // Derived helpers
  activeScheme: ColorScheme;

  // Actions
  setScheme: (id: string) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

/** Writes all CSS variables for the given scheme+mode into document.documentElement */
function applyTheme(scheme: ColorScheme, mode: ThemeMode) {
  const vars = mode === 'light' ? scheme.light : scheme.dark;
  const root = document.documentElement;

  // Apply each variable
  (Object.entries(vars) as [string, string][]).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Keep the `.dark` class in sync for any Tailwind dark: utilities you may use
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function findScheme(id: string): ColorScheme {
  return COLOR_SCHEMES.find(s => s.id === id) ?? COLOR_SCHEMES[0];
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      schemeId: DEFAULT_SCHEME_ID,
      mode: 'light',
      activeScheme: findScheme(DEFAULT_SCHEME_ID),

      setScheme(id: string) {
        const scheme = findScheme(id);
        applyTheme(scheme, get().mode);
        set({ schemeId: id, activeScheme: scheme });
      },

      setMode(mode: ThemeMode) {
        applyTheme(get().activeScheme, mode);
        set({ mode });
      },

      toggleMode() {
        const next: ThemeMode = get().mode === 'light' ? 'dark' : 'light';
        applyTheme(get().activeScheme, next);
        set({ mode: next });
      },
    }),
    {
      name: 'hms-theme', // localStorage key
      // Only persist the user's choices, not the derived activeScheme object
      partialize: (state) => ({
        schemeId: state.schemeId,
        mode: state.mode,
      }),
      // Re-hydrate: re-apply CSS vars after the store is loaded from localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          const scheme = findScheme(state.schemeId);
          state.activeScheme = scheme;
          applyTheme(scheme, state.mode);
        }
      },
    }
  )
);

/**
 * Call this once near the top of your app (e.g. in main.tsx or App.tsx)
 * to apply the persisted theme before the first render, preventing flash.
 *
 * Usage:
 *   import { initTheme } from '../store/themeStore';
 *   initTheme();
 */
export function initTheme() {
  try {
    const raw = localStorage.getItem('hms-theme');
    if (raw) {
      const { schemeId, mode } = JSON.parse(raw) as {
        schemeId?: string;
        mode?: ThemeMode;
      };
      const scheme = findScheme(schemeId ?? DEFAULT_SCHEME_ID);
      applyTheme(scheme, mode ?? 'light');
    }
  } catch {
    // Ignore parse errors — store will self-heal on first render
  }
}