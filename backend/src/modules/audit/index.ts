export { AuditController } from './AuditController';
export { AuditService } from './AuditService';
export { AuditRepository } from './AuditRepository';
export * from './AuditTypes';

import { AuditRoutes } from './AuditRoutes';
export const createAuditRoutes = AuditRoutes;
export default { createAuditRoutes };