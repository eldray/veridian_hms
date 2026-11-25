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
      // Screens show `message`, and this response never reaches the global handler, so a bare
      // "Validation failed" is all the desk would ever see. Lead with the actual reason - the
      // zod messages are already written for staff ("Quantity must be at least 1") - and keep
      // the full per-field list in `errors` for any screen that wants to mark up the form.
      const first = errors[0]?.message || 'Check the values you entered.';
      const more = errors.length > 1 ? ` (+${errors.length - 1} more)` : '';
      return res.status(400).json({
        success: false,
        status: 'fail',
        message: `${first}${more}`,
        errors,
      });
    }
    req.body = parsed.data;
    return next();
  };
