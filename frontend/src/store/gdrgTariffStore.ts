// src/store/gdrgTariffStore.ts
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
      console.log('📡 Fetching G-DRG tariffs from /api/gdrg...');
      const tariffsData = await getGDRGTariffs();
      console.log('📦 G-DRG tariffs response:', tariffsData);
      
      const tariffsArray = Array.isArray(tariffsData) ? tariffsData : [];
      
      // ✅ Normalize: ensure nhiaTariff is a number
      const normalizedTariffs = tariffsArray.map((t: any) => ({
        ...t,
        nhiaTariff: Number(t.nhiaTariff) || 0,
      }));
      
      const tariffMap = normalizedTariffs.reduce((map, t) => {
        if (t && t.gdrgCode) {
          map[t.gdrgCode] = t;
        }
        return map;
      }, {} as Record<string, GDRGTariff>);

      set({ 
        tariffs: normalizedTariffs, 
        tariffMap, 
        isLoading: false 
      });
      
      console.log(`✅ Loaded ${normalizedTariffs.length} G-DRG tariffs`);
    } catch (error) {
      console.error('❌ Failed to fetch G-DRG tariffs:', error);
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