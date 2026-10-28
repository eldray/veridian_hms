import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Parsed values replace req.body, so unknown keys are dropped instead of being
// forwarded to Prisma.
export const validateBody =
  (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || '(body)',
        message: issue.message,
      }));
      return res.status(400).json({
        success: false,
        status: 'fail',
        message: 'Validation failed',
        errors,
      });
    }
    req.body = parsed.data;
    return next();
  };
