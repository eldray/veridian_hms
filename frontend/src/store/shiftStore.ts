// src/store/shiftStore.ts
import { create } from 'zustand';
import {
  getShifts as getShiftsApi,
  getShiftById as getShiftByIdApi,
  createShift as createShiftApi,
  updateShift as updateShiftApi,
  deleteShift as deleteShiftApi,
} from '../api';

export interface AdminShift {
  id: string;
  userId: string;
  user?: { id: string; fullName: string; role: string } | null;
  shiftDate: string;
  startTime: string;
  endTime: string;
  shiftType: 'morning' | 'afternoon' | 'night' | 'on_call';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ShiftFilters {
  userId?: string;
  departmentId?: string;
  shiftDate?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

interface ShiftState {
  shifts: AdminShift[];
  total: number;
  isLoading: boolean;
  error: string | null;
  filters: ShiftFilters;

  fetchShifts: (filters?: ShiftFilters) => Promise<void>;
  createShift: (data: {
    userId: string;
    shiftDate: string;
    startTime: string;
    endTime: string;
    shiftType?: 'morning' | 'afternoon' | 'night' | 'on_call';
    notes?: string;
  }) => Promise<AdminShift>;
  updateShift: (shiftId: string, data: Partial<AdminShift>) => Promise<AdminShift>;
  deleteShift: (shiftId: string) => Promise<void>;
  setFilters: (filters: Partial<ShiftFilters>) => void;
  resetFilters: () => void;
  clearError: () => void;
}

const DEFAULT_LIMIT = 200;

export const useShiftStore = create<ShiftState>((set, get) => ({
  shifts: [],
  total: 0,
  isLoading: false,
  error: null,
  filters: { page: 1, limit: DEFAULT_LIMIT },

  fetchShifts: async (override) => {
    const filters = { ...get().filters, ...(override ?? {}) };
    set({ isLoading: true, error: null, filters });

    try {
      const response: any = await getShiftsApi(filters);
      // api.getShifts returns r.data?.data || r.data
      // Backend returns { success, data: [...], pagination: {...} }
      const list = Array.isArray(response) ? response : (response?.data ?? response?.shifts ?? []);
      const pagination = response?.pagination ?? null;

      set({
        shifts: list,
        total: pagination?.total ?? list.length,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.response?.data?.message || err?.message || 'Failed to fetch shifts',
      });
      throw err;
    }
  },

  createShift: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const shift = await createShiftApi(data);
      const shifts = [shift, ...get().shifts];
      set({ shifts, total: get().total + 1, isLoading: false });
      return shift;
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message || 'Failed to create shift' });
      throw err;
    }
  },

  updateShift: async (shiftId, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateShiftApi(shiftId, data);
      const shifts = get().shifts.map((s) => (s.id === shiftId ? updated : s));
      set({ shifts, isLoading: false });
      return updated;
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message || 'Failed to update shift' });
      throw err;
    }
  },

  deleteShift: async (shiftId) => {
    set({ isLoading: true, error: null });
    try {
      await deleteShiftApi(shiftId);
      set({
        shifts: get().shifts.filter((s) => s.id !== shiftId),
        total: Math.max(0, get().total - 1),
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message || 'Failed to delete shift' });
      throw err;
    }
  },

  setFilters: (partial) => {
    const next = { ...get().filters, ...partial, page: 1 };
    set({ filters: next });
    void get().fetchShifts(next);
  },

  resetFilters: () => {
    const next = { page: 1, limit: DEFAULT_LIMIT };
    set({ filters: next });
    void get().fetchShifts(next);
  },

  clearError: () => set({ error: null }),
}));