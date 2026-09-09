// Re-export all middleware
export * from './authMiddleware';  
export * from './concurrency';     
export * from './rateLimiter';
export * from './audit';           
export * from './transaction';     

// Grouped exports for clean imports (e.g., import { authMiddleware } from '../middleware')
import { withTransaction, secureOperation } from './transaction';
import { auditFinancialEvent, auditBillOperation, auditPaymentOperation } from './audit';
import { withOptimisticLock } from './concurrency';
import { createRateLimiter } from './rateLimiter';
import { protect, requireRole, requirePermission, requireMinSeniority } from './authMiddleware';

export const transactionMiddleware = { withTransaction, secureOperation };
export const auditMiddleware = { auditFinancialEvent, auditBillOperation, auditPaymentOperation };
export const concurrencyMiddleware = { withOptimisticLock, createRateLimiter };
export const authMiddleware = { protect, requireRole, requirePermission, requireMinSeniority };