import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './authMiddleware';

const prisma = new PrismaClient();

/**
 * Middleware to handle optimistic locking for concurrent updates
 * Prevents lost updates when multiple users modify the same record
 */
export const withOptimisticLock = (entityModel: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Only apply to UPDATE and DELETE operations
    if (!['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    try {
      const { id } = req.params;
      const clientVersion = req.headers['if-match'] as string | undefined;

      // If no version header provided, proceed without check
      if (!clientVersion) {
        return next();
      }

      const model = (prisma as any)[entityModel.toLowerCase()];
      if (!model) {
        console.warn(`Model ${entityModel} not found for concurrency check`);
        return next();
      }

      // Get current version from database
      const record = await model.findUnique({
        where: { id },
        select: { version: true }
      });

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Record not found'
        });
      }

      const serverVersion = record.version;
      const requestedVersion = parseInt(clientVersion, 10);

      // Check if versions match
      if (serverVersion !== requestedVersion) {
        return res.status(409).json({
          success: false,
          message: 'Conflict detected: Record was modified by another user',
          error: {
            code: 'VERSION_CONFLICT',
            serverVersion,
            clientVersion: requestedVersion,
            hint: 'Please refresh the page and try again'
          }
        });
      }

      // Store version info for later increment
      (req as any).currentVersion = serverVersion;
      next();
    } catch (error) {
      console.error('Concurrency check failed:', error);
      next(error);
    }
  };
};

/**
 * Helper function to increment version after successful update
 */
export const incrementEntityVersion = async (entityModel: string, entityId: string) => {
  try {
    const model = (prisma as any)[entityModel.toLowerCase()];
    if (!model) return;

    await model.update({
      where: { id: entityId },
      data: { version: { increment: 1 } }
    });
  } catch (error) {
    console.error('Failed to increment version:', error);
  }
};

export default { withOptimisticLock, incrementEntityVersion };
