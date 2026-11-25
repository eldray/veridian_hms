// src/store/leaveStore.ts
import { create } from 'zustand';
import {
  getLeaves as getLeavesApi,
  getLeaveById as getLeaveByIdApi,
  createLeave as createLeaveApi,
  updateLeave as updateLeaveApi,
  deleteLeave as deleteLeaveApi,
  approveLeave as approveLeaveApi,
  rejectLeave as rejectLeaveApi,
} from '../api';

export interface AdminLeave {
  id: string;
  userId: string;
  user?: { id: string; fullName: string; role: string; department?: { id: string; name: string } | null } | null;
  leaveType: 'annual' | 'sick' | 'maternity' | 'paternity' | 'emergency' | 'unpaid';
  startDate: string;
  endDate: string;
  totalDays: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string | null;
  approver?: { id: string; fullName: string } | null;
  approvedBy?: { id: string; fullName: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface LeaveFilters {
  userId?: string;
  departmentId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

interface LeaveState {
  leaves: AdminLeave[];
  total: number;
  isLoading: boolean;
  error: string | null;
  filters: LeaveFilters;

  fetchLeaves: (filters?: LeaveFilters) => Promise<void>;
  approveLeave: (leaveId: string, reason?: string) => Promise<AdminLeave>;
  rejectLeave: (leaveId: string, reason: string) => Promise<AdminLeave>;
  deleteLeave: (leaveId: string) => Promise<void>;
  setFilters: (filters: Partial<LeaveFilters>) => void;
  resetFilters: () => void;
  clearError: () => void;
}

const DEFAULT_LIMIT = 200;

export const useLeaveStore = create<LeaveState>((set, get) => ({
  leaves: [],
  total: 0,
  isLoading: false,
  error: null,
  filters: { page: 1, limit: DEFAULT_LIMIT },

  fetchLeaves: async (override) => {
    const filters = { ...get().filters, ...(override ?? {}) };
    set({ isLoading: true, error: null, filters });

    try {
      const response: any = await getLeavesApi(filters);
      const list = Array.isArray(response) ? response : (response?.data ?? response?.leaves ?? []);
      const pagination = response?.pagination ?? null;

      set({
        leaves: list,
        total: pagination?.total ?? list.length,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.response?.data?.message || err?.message || 'Failed to fetch leave requests',
      });
      throw err;
    }
  },

  approveLeave: async (leaveId, reason) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await approveLeaveApi(leaveId, reason);
      const leaves = get().leaves.map((l) => (l.id === leaveId ? updated : l));
      set({ leaves, isLoading: false });
      return updated;
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message || 'Failed to approve leave' });
      throw err;
    }
  },

  rejectLeave: async (leaveId, reason) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await rejectLeaveApi(leaveId, reason);
      const leaves = get().leaves.map((l) => (l.id === leaveId ? updated : l));
      set({ leaves, isLoading: false });
      return updated;
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message || 'Failed to reject leave' });
      throw err;
    }
  },

  deleteLeave: async (leaveId) => {
    set({ isLoading: true, error: null });
    try {
      await deleteLeaveApi(leaveId);
      set({
        leaves: get().leaves.filter((l) => l.id !== leaveId),
        total: Math.max(0, get().total - 1),
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.response?.data?.message || 'Failed to delete leave request' });
      throw err;
    }
  },

  setFilters: (partial) => {
    const next = { ...get().filters, ...partial, page: 1 };
    set({ filters: next });
    void get().fetchLeaves(next);
  },

  resetFilters: () => {
    const next = { page: 1, limit: DEFAULT_LIMIT };
    set({ filters: next });
    void get().fetchLeaves(next);
  },

  clearError: () => set({ error: null }),
}));