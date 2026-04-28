// src/store/gdrgTariffStore.ts - FIXED

import { create } from 'zustand';
import { getGDRGTariffs } from '../api';
import type { GDRGTariff } from '../types';

interface GDRGTariffState {
  tariffs: GDRGTariff[];
  tariffMap: Record<string, GDRGTariff>;
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
      const tariffsData = await getGDRGTariffs();
      // Ensure we have an array
      const tariffsArray = Array.isArray(tariffsData) ? tariffsData : [];
      
      const tariffMap = tariffsArray.reduce((map, t) => {
        if (t && t.gdrgCode) {
          map[t.gdrgCode] = t;
        }
        return map;
      }, {} as Record<string, GDRGTariff>);

      set({ 
        tariffs: tariffsArray, 
        tariffMap, 
        isLoading: false 
      });
      
      console.log(`✅ Loaded ${tariffsArray.length} G-DRG tariffs`);
    } catch (error) {
      console.error('Failed to fetch G-DRG tariffs:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tariffs',
        isLoading: false,
        tariffs: [],
        tariffMap: {}
      });
    }
  },

  getTariff: (gdrgCode: string) => {
    return get().tariffMap[gdrgCode];
  }
}));