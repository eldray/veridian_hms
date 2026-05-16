/**
 * Standardized API Response Types
 * Enterprise-grade response format for all API endpoints
 */

export interface ValidationError {
  field: string;
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
): ApiResponse<null> & { status?: number } => ({
  success: false,
  errors,
  message,
  timestamp: new Date().toISOString(),
  status
});
