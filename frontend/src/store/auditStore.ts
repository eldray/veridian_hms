import { create } from 'zustand';
import {
  getAuditLogs,
  getAuditLogById,
  getAuditMeta,
  exportAuditLogsCsv,
  AuditLogEntry,
  AuditLogFilters,
  AuditLogMeta,
} from '../api/audit';

interface AuditPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AuditState {
  logs: AuditLogEntry[];
  meta: AuditLogMeta | null;
  selectedLog: AuditLogEntry | null;
  pagination: AuditPagination;
  filters: AuditLogFilters;
  isLoading: boolean;
  isMetaLoading: boolean;
  isExporting: boolean;
  error: string | null;

  fetchLogs: (filters?: AuditLogFilters) => Promise<void>;
  fetchMeta: () => Promise<void>;
  fetchLogById: (id: string) => Promise<AuditLogEntry | null>;
  setFilters: (filters: Partial<AuditLogFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  exportCsv: () => Promise<Blob>;
  clearSelectedLog: () => void;
  clearError: () => void;
}

const DEFAULT_LIMIT = 25;

const initialFilters: AuditLogFilters = {
  page: 1,
  limit: DEFAULT_LIMIT,
};

export const useAuditStore = create<AuditState>((set, get) => ({
  logs: [],
  meta: null,
  selectedLog: null,
  pagination: { page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 },
  filters: { ...initialFilters },
  isLoading: false,
  isMetaLoading: false,
  isExporting: false,
  error: null,

  fetchLogs: async (overrideFilters) => {
    const currentFilters = get().filters;
    const filters = { ...currentFilters, ...(overrideFilters ?? {}) };

    set({ isLoading: true, error: null, filters });

    try {
      const result = await getAuditLogs(filters);
      const total = result.pagination?.total ?? result.data.length;
      const limit = filters.limit ?? DEFAULT_LIMIT;
      const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

      set({
        logs: result.data,
        pagination: {
          page: filters.page ?? 1,
          limit,
          total,
          totalPages: Math.max(1, totalPages),
        },
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.response?.data?.message || err?.message || 'Failed to fetch audit logs',
      });
      throw err;
    }
  },

  fetchMeta: async () => {
    // Skip if already loaded
    if (get().meta) return;

    set({ isMetaLoading: true });
    try {
      const meta = await getAuditMeta();
      set({ meta, isMetaLoading: false });
    } catch (err: any) {
      set({
        isMetaLoading: false,
        error: err?.response?.data?.message || 'Failed to fetch audit metadata',
      });
    }
  },

  fetchLogById: async (id) => {
    try {
      const log = await getAuditLogById(id);
      set({ selectedLog: log });
      return log;
    } catch (err: any) {
      set({ error: err?.response?.data?.message || 'Failed to fetch audit log' });
      return null;
    }
  },

  setFilters: (partial) => {
    const next = { ...get().filters, ...partial, page: 1 };
    set({ filters: next });
    // Fire a fetch after mutating filters
    void get().fetchLogs(next);
  },

  resetFilters: () => {
    const next = { ...initialFilters };
    set({ filters: next });
    void get().fetchLogs(next);
  },

  setPage: (page) => {
    const next = { ...get().filters, page };
    set({ filters: next });
    void get().fetchLogs(next);
  },

  setLimit: (limit) => {
    const next = { ...get().filters, limit, page: 1 };
    set({ filters: next });
    void get().fetchLogs(next);
  },

  exportCsv: async () => {
    set({ isExporting: true });
    try {
      const { page, limit, ...rest } = get().filters;
      const blob = await exportAuditLogsCsv(rest);
      set({ isExporting: false });
      return blob;
    } catch (err: any) {
      set({
        isExporting: false,
        error: err?.response?.data?.message || 'Failed to export audit logs',
      });
      throw err;
    }
  },

  clearSelectedLog: () => set({ selectedLog: null }),

  clearError: () => set({ error: null }),
}));