import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const prisma = new PrismaClient();
type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// ✅ Only these models have a 'version' field in the schema
const VERSIONED_MODELS = ['Patient', 'Bill', 'Attendance', 'InsuranceClaim', 'StockItem'];

export const withTransaction = (
  handler: (req: Request, res: Response, tx: PrismaTransactionClient) => Promise<void>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await prisma.$transaction(async (tx) => {
        await handler(req, res, tx);
      });
    } catch (error) {
      next(error);
    }
  };
};

// ✅ FIXED: secureOperation now checks if the model actually supports versioning
export const secureOperation = (
  entityType: string,
  action: string,
  handler: (req: Request, res: Response, tx: PrismaTransactionClient) => Promise<void>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await prisma.$transaction(async (tx) => {
        await handler(req, res, tx);

        // Increment version ONLY if the model supports it
        if (['CREATE', 'UPDATE'].includes(action) && req.params.id && VERSIONED_MODELS.includes(entityType)) {
          try {
            await (tx as any)[entityType.toLowerCase()].update({
              where: { id: req.params.id },
              data: { version: { increment: 1 } }
            });
          } catch (e) { /* Ignore if record was just created and ID is different */ }
        }
      });
      next();
    } catch (error: any) {
      next(error);
    }
  };
};