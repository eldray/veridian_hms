// src/store/gdrgTariffStore.ts
import { create } from 'zustand';
import { getGDRGTariffs } from '../api';
import type { GDRGTariff } from '../types';

interface GDRGTariffState {
  tariffs: GDRGTariff[];
  tariffMap: Record<string, GDRGTariff>;  // gdrgCode → tariff
  isLoading: boolean;
  error: string | null;
  fetchTariffs: () => Promise<void>;
  getTariff: (gdrgCode: string) => GDRGTariff | undefined;
}

export const useGDRGTariffStore = create<GDRGTariffState>((set, get) => ({
  tariffs: [],
  tariffMap: {},
  isLoading: false,
  error: null,

  fetchTariffs: async () => {
    set({ isLoading: true, error: null });
    try {
      const tariffs = await getGDRGTariffs();
      const tariffMap = tariffs.reduce((map, t) => {
        map[t.gdrgCode] = t;
        return map;
      }, {} as Record<string, GDRGTariff>);

      set({ tariffs, tariffMap, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch G-DRG tariffs:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tariffs',
        isLoading: false
      });
    }
  },

  getTariff: (gdrgCode: string) => {
    return get().tariffMap[gdrgCode];
  }
}));