import api from './api';

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedById: string;
  ipAddress: string | null;
  previousState: any;
  newState: any;
  metadata: any;
  timestamp: string;
  performedBy?: {
    id: string;
    fullName: string;
    username: string;
    email: string | null;
    role: string;
  } | null;
}

export interface AuditLogMeta {
  entityTypes: string[];
  actions: string[];
  users: Array<{ id: string; fullName: string; username: string; role: string }>;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedAuditLogs {
  data: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  };
}

const readAuditPagination = (body: any, fallbackLimit = 25) => {
  // BaseController.paginated returns metadata under `meta`, not `pagination`.
  // Accept both formats so the audit page never mistakes the first 25 rows for
  // the entire audit history.
  const value = body?.meta ?? body?.pagination ?? body?.data?.meta ?? body?.data?.pagination;
  if (!value || value.total === undefined) return null;
  const page = Number(value.page) || 1;
  const limit = Number(value.limit) || fallbackLimit;
  const total = Number(value.total);
  const totalPages = Number(value.totalPages ?? value.pages);
  return {
    page,
    limit,
    total: Number.isFinite(total) && total >= 0 ? total : 0,
    totalPages: Number.isFinite(totalPages) && totalPages >= 0
      ? totalPages
      : Math.ceil(Math.max(0, total) / Math.max(1, limit)),
  };
};

// ── List ────────────────────────────────────────────────────
export const getAuditLogs = (filters: AuditLogFilters = {}): Promise<PaginatedAuditLogs> =>
  api.get('/audit/logs', { params: filters }).then((r) => {
    const body = r.data;

    // Expected: { success: true, data: [...], pagination: {...}, message }
    // Fallbacks for other shapes are defensive but harmless.

    if (body?.success && Array.isArray(body.data)) {
      return {
        data: body.data,
        pagination: readAuditPagination(body, filters.limit ?? 25) ?? {
          page: filters.page ?? 1,
          limit: filters.limit ?? 25,
          total: body.data.length,
          totalPages: Math.ceil(body.data.length / Math.max(1, filters.limit ?? 25)),
        },
      };
    }

    if (body?.data?.data && Array.isArray(body.data.data)) {
      return {
        data: body.data.data,
        pagination: readAuditPagination(body, filters.limit ?? 25) ?? {
          page: filters.page ?? 1,
          limit: filters.limit ?? 25,
          total: body.data.data.length,
          totalPages: Math.ceil(body.data.data.length / Math.max(1, filters.limit ?? 25)),
        },
      };
    }

    if (Array.isArray(body)) {
      return {
        data: body,
        pagination: {
          page: filters.page ?? 1,
          limit: filters.limit ?? 25,
          total: body.length,
          totalPages: 1,
        },
      };
    }

    return {
      data: [],
      pagination: { page: 1, limit: filters.limit ?? 25, total: 0, totalPages: 0 },
    };
  });

// ── Single ──────────────────────────────────────────────────
export const getAuditLogById = (id: string): Promise<AuditLogEntry> =>
  api.get(`/audit/logs/${id}`).then((r) => r.data?.data ?? r.data);

// ── Entity history ──────────────────────────────────────────
export const getEntityAuditLogs = (
  entityType: string,
  entityId: string,
  filters: AuditLogFilters = {},
): Promise<PaginatedAuditLogs> =>
  api
    .get(`/audit/logs/entity/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`, {
      params: filters,
    })
    .then((r) => {
      const body = r.data;
      if (body?.success && Array.isArray(body.data)) {
        return { data: body.data, pagination: readAuditPagination(body) ?? { page: 1, limit: 25, total: body.data.length, totalPages: 1 } };
      }
      return { data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } };
    });

// ── User history ────────────────────────────────────────────
export const getUserAuditLogs = (
  userId: string,
  filters: AuditLogFilters = {},
): Promise<PaginatedAuditLogs> =>
  api
    .get(`/audit/logs/user/${encodeURIComponent(userId)}`, { params: filters })
    .then((r) => {
      const body = r.data;
      if (body?.success && Array.isArray(body.data)) {
        return { data: body.data, pagination: readAuditPagination(body) ?? { page: 1, limit: 25, total: body.data.length, totalPages: 1 } };
      }
      return { data: [], pagination: { page: 1, limit: 20, total: 0 } };
    });

// ── Meta ────────────────────────────────────────────────────
export const getAuditMeta = (): Promise<AuditLogMeta> =>
  api.get('/audit/logs/meta').then((r) => r.data?.data ?? r.data);

// ── Export ──────────────────────────────────────────────────
export const exportAuditLogsCsv = (
  filters: Omit<AuditLogFilters, 'page' | 'limit'> = {},
): Promise<Blob> =>
  api
    .get('/audit/logs/export', {
      params: { ...filters, format: 'csv' },
      responseType: 'blob',
    })
    .then((r) => r.data);

export const exportAuditLogsXlsx = (
  filters: Omit<AuditLogFilters, 'page' | 'limit'> = {},
): Promise<Blob> =>
  api
    .get('/audit/logs/export', {
      params: { ...filters, format: 'xlsx' },
      responseType: 'blob',
    })
    .then((r) => r.data);
