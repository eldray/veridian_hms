import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Define AuthRequest locally
export interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    role: string;
    username: string;
    fullName: string;
    email?: string;
    licenseNumber?: string;
    specialization?: string;
  };
}

// Define Prisma Transaction type
type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Middleware to wrap route handlers in database transactions
 * Ensures atomic operations for multi-step processes
 */
export const withTransaction = (
  handler: (req: AuthRequest, res: Response, tx: PrismaTransactionClient) => Promise<void>
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await prisma.$transaction(async (tx) => {
        await handler(req, res, tx);
      });
    } catch (error) {
      console.error('Transaction failed:', error);
      next(error);
    }
  };
};

/**
 * Middleware to check for concurrent modifications using optimistic locking
 * Compares version numbers to detect conflicts
 */
export const checkConcurrency = (entityModel: any, entityIdField: string = 'id') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const clientVersion = req.headers['if-match'];

      if (!clientVersion) {
        // No version header, proceed normally
        next();
        return;
      }

      const record = await entityModel.findUnique({
        where: { [entityIdField]: id },
        select: { version: true }
      });

      if (!record) {
        res.status(404).json({ 
          success: false, 
          message: 'Record not found' 
        });
        return;
      }

      if (record.version !== parseInt(clientVersion as string)) {
        res.status(409).json({
          success: false,
          message: 'Conflict detected: Record was modified by another user',
          conflict: {
            serverVersion: record.version,
            clientVersion: parseInt(clientVersion as string)
          }
        });
        return;
      }

      // Store current version for later increment
      (req as any).currentVersion = record.version;
      next();
    } catch (error) {
      console.error('Concurrency check failed:', error);
      next(error);
    }
  };
};

/**
 * Increment version number after successful update
 */
export const incrementVersion = async (entityModel: any, entityId: string): Promise<void> => {
  await entityModel.update({
    where: { id: entityId },
    data: { version: { increment: 1 } }
  });
};

/**
 * Audit logging middleware - records all data changes
 */
export const auditLog = (entityType: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const originalJson = res.json.bind(res);
      
      res.json = (body: any) => {
        // Log after successful response
        if (res.statusCode < 400) {
          const auditData = {
            entityType,
            entityId: req.params.id || body?.id || 'unknown',
            action,
            performedById: req.user?.id || 'system',
            ipAddress: req.ip,
            // userAgent stored in metadata (not direct field)
            previousState: (req as any).previousState || null,
            newState: action !== 'DELETE' ? body : null,
            metadata: {
              method: req.method,
              path: req.path,
              timestamp: new Date().toISOString(),
              userAgent: req.get('user-agent')
            }
          };

          // Fire and forget - don't block response
          prisma.auditLog.create({
            data: auditData
          }).catch(err => console.error('Audit log failed:', err));
        }
        
        return originalJson(body);
      };

      // Capture previous state for UPDATE/DELETE
      if ((action === 'UPDATE' || action === 'DELETE') && req.params.id) {
        const model = (prisma as any)[entityType.toLowerCase()];
        if (model) {
          const previous = await model.findUnique({
            where: { id: req.params.id }
          });
          (req as any).previousState = previous;
        }
      }

      next();
    } catch (error) {
      console.error('Audit logging failed:', error);
      next(error);
    }
  };
};

/**
 * Combined middleware for transaction + audit + concurrency
 */
export const secureOperation = (
  entityType: string,
  action: string,
  handler: (req: AuthRequest, res: Response, tx: PrismaTransactionClient) => Promise<void>
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await prisma.$transaction(async (tx) => {
        // Check concurrency if updating/deleting
        if ((action === 'UPDATE' || action === 'DELETE') && req.params.id) {
          const clientVersion = req.headers['if-match'];
          if (clientVersion) {
            const record = await (tx as any)[entityType.toLowerCase()].findUnique({
              where: { id: req.params.id },
              select: { version: true }
            });

            if (record && record.version !== parseInt(clientVersion as string)) {
              throw new Error('CONFLICT: Record modified by another user');
            }
          }
        }

        // Execute handler
        await handler(req, res, tx);

        // Increment version on success
        if ((action === 'CREATE' || action === 'UPDATE') && req.params.id) {
          await (tx as any)[entityType.toLowerCase()].update({
            where: { id: req.params.id },
            data: { version: { increment: 1 } }
          }).catch(() => {}); // Ignore if record doesn't exist yet
        }
      });

      // Create audit log (outside transaction to avoid blocking)
      const auditData = {
        entityType,
        entityId: req.params.id || 'unknown',
        action,
        performedById: req.user?.id || 'system',
        ipAddress: req.ip,
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: req.get('user-agent')
        }
      };

      prisma.auditLog.create({ data: auditData }).catch(err => 
        console.error('Audit log creation failed:', err)
      );

      next();
    } catch (error: any) {
      if (error.message && error.message.includes('CONFLICT')) {
        res.status(409).json({
          success: false,
          message: 'Conflict detected: Record was modified by another user. Please refresh and try again.'
        });
        return;
      }
      console.error('Secure operation failed:', error);
      next(error);
    }
  };
};

export default {
  withTransaction,
  checkConcurrency,
  incrementVersion,
  auditLog,
  secureOperation
};