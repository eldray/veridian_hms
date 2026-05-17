import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../types/auth.types';

const prisma = new PrismaClient();

/**
 * Audit logging middleware - records all data changes
 * Captures before and after states for complete audit trail
 */
export const auditLog = (entityType: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const originalJson = res.json.bind(res);
      
      // Capture previous state for UPDATE/DELETE operations
      let previousState = null;
      if ((action === 'UPDATE' || action === 'DELETE') && req.params.id) {
        const model = (prisma as any)[entityType.toLowerCase()];
        if (model) {
          previousState = await model.findUnique({
            where: { id: req.params.id }
          });
        }
      }

      res.json = (body: any) => {
        // Only log successful operations
        if (res.statusCode < 400) {
          const auditData = {
            entityType,
            entityId: req.params.id || body?.id || 'unknown',
            action,
            performedById: req.user?.id || 'system',
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            previousState: action !== 'CREATE' ? previousState : null,
            newState: action !== 'DELETE' ? body : null,
            metadata: {
              method: req.method,
              path: req.path,
              queryParams: req.query,
              timestamp: new Date().toISOString()
            }
          };

          // Fire and forget - don't block the response
          prisma.auditLog.create({
            data: auditData
          }).catch(err => {
            console.error('Audit log creation failed:', err);
          });
        }
        
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Audit logging middleware error:', error);
      next(error);
    }
  };
};

/**
 * Batch audit logging for multiple operations
 */
export const batchAuditLog = async (
  entityType: string,
  action: string,
  records: Array<{ id: string; data: any }>,
  userId: string,
  ipAddress?: string
) => {
  try {
    const auditEntries = records.map(record => ({
      entityType,
      entityId: record.id,
      action,
      performedById: userId,
      ipAddress,
      newState: record.data,
      timestamp: new Date().toISOString()
    }));

    await prisma.auditLog.createMany({
      data: auditEntries
    });
  } catch (error) {
    console.error('Batch audit logging failed:', error);
  }
};

export default { auditLog, batchAuditLog };
