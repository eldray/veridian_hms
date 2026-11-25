// Re-export all middleware
export * from './authMiddleware';  
export * from './concurrency';
export * from './audit';           
export * from './transaction';     

// Grouped exports for clean imports (e.g., import { authMiddleware } from '../middleware')
import { withTransaction, secureOperation } from './transaction';
import { auditFinancialEvent, auditBillOperation, auditPaymentOperation } from './audit';
import { withOptimisticLock } from './concurrency';
import { protect, requireRole, requirePermission, requireMinSeniority } from './authMiddleware';

export const transactionMiddleware = { withTransaction, secureOperation };
export const auditMiddleware = { auditFinancialEvent, auditBillOperation, auditPaymentOperation };
export const concurrencyMiddleware = { withOptimisticLock };
export const authMiddleware = { protect, requireRole, requirePermission, requireMinSeniority };