// Re-export all middleware
export * from './authMiddleware';  // ✅ Changed from './auth' to './authMiddleware'
export * from './concurrency';     // ✅ Includes rate limiter and optimistic lock
export * from './audit';           // ✅ Audit logging middleware
export * from './transaction';     // ✅ Transaction middleware

// Default exports (if needed)
import { withTransaction, secureOperation } from './transaction';
import { auditFinancialEvent, logFinancialMutation } from './audit';
import { withOptimisticLock, createRateLimiter } from './concurrency';
import { protect, requireRole } from './authMiddleware';

export const transactionMiddleware = {
  withTransaction,
  secureOperation
};

export const auditMiddleware = {
  auditFinancialEvent,
  logFinancialMutation
};

export const concurrencyMiddleware = {
  withOptimisticLock,
  createRateLimiter
};

export const authMiddleware = {
  protect,
  requireRole
};