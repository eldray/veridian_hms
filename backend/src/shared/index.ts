/**
 * Shared Module Index
 * Exports all shared utilities, base classes, and common components
 */

// Base classes
export { BaseController } from './base/BaseController';
export { BaseService } from './base/BaseService';
export { BaseRepository } from './base/BaseRepository';
export type { FindManyOptions, PaginationResult } from './base/BaseRepository';

// Types
export * from './types/ApiResponse';

// Middleware (existing)
// export * from './middleware';

// Validators (to be added)
// export * from './validators';

// Decorators (to be added)
// export * from './decorators';
