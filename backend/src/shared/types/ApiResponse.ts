/**
 * Standardized API Response Types
 * Enterprise-grade response format for all API endpoints
 */

import { toFieldDetails, withReasons } from '../../utils/httpError';

export interface ValidationError {
  /** The form field the reason belongs to; absent when the error is not tied to one box. */
  field?: string;
  message: string;
  code?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ValidationError[];
  meta?: PaginationMeta | Record<string, any>;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

// Response helper functions
export const createSuccessResponse = <T>(
  data: T,
  message?: string,
  meta?: Record<string, any>
): ApiResponse<T> => ({
  success: true,
  data,
  message,
  meta,
  timestamp: new Date().toISOString()
});

export const createPaginatedResponse = <T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  message?: string
): PaginatedResponse<T> => {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);
  
  return {
    success: true,
    data,
    message,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    },
    timestamp: new Date().toISOString()
  };
};

export const createErrorResponse = (
  message: string,
  errors?: ValidationError[],
  status?: number
): ApiResponse<null> & { status?: number } => {
  // Controllers pass either hand-built { field, message } items or express-validator's raw
  // { msg, path, value } items. Screens read `message`, so normalise the items and let the first
  // reason carry the response - "Validation failed" on its own is not something staff can fix.
  const details = toFieldDetails(errors as any[] | null);
  return {
    success: false,
    ...(details.length > 0 ? { errors: details as ValidationError[] } : {}),
    message: withReasons(String(message || ''), details),
    timestamp: new Date().toISOString(),
    status
  };
};
