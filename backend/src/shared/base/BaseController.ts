import { Request, Response, NextFunction, RequestHandler } from 'express';
import { 
  createSuccessResponse, 
  createPaginatedResponse, 
  createErrorResponse,
  ApiResponse 
} from '../types/ApiResponse';

export abstract class BaseController {
  protected ok(res: Response, data: any, message?: string, meta?: Record<string, any>): Response {
    return res.json(createSuccessResponse(data, message, meta));
  }

  protected created(res: Response, data: any, message?: string): Response {
    return res.status(201).json(createSuccessResponse(data, message));
  }

  protected noContent(res: Response): Response {
    return res.status(204).send();
  }

  protected paginated(
    res: Response,
    data: any[],
    pagination: { page: number; limit: number; total: number },
    message?: string
  ): Response {
    return res.json(createPaginatedResponse(data, pagination, message));
  }

  /**
   * ✅ PRODUCTION FIX: Intercepts Prisma errors to return correct HTTP status codes
   */
  protected error(res: Response, err: any): Response {
    // Handle Prisma Known Request Errors
    if (err.code === 'P2002') {
      const fields = err.meta?.target?.join(', ') || 'field';
      return this.badRequest(res, `Duplicate entry. The ${fields} must be unique.`);
    }
    if (err.code === 'P2025') {
      return this.notFound(res, 'Record');
    }
    if (err.code === 'P2003') {
      return this.badRequest(res, 'Invalid reference: The related record does not exist.');
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';
    const errors = err.errors || undefined;

    console.error(`[Controller Error] ${message}`, {
      name: err.name,
      code: err.code,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    return res.status(status).json(createErrorResponse(message, errors, status));
  }

  protected notFound(res: Response, resource: string = 'Resource'): Response {
    return res.status(404).json(createErrorResponse(`${resource} not found`, undefined, 404));
  }

  protected badRequest(res: Response, message: string, errors?: any[]): Response {
    return res.status(400).json(createErrorResponse(message, errors, 400));
  }

  protected unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return res.status(401).json(createErrorResponse(message, undefined, 401));
  }

  protected forbidden(res: Response, message: string = 'Forbidden'): Response {
    return res.status(403).json(createErrorResponse(message, undefined, 403));
  }

  protected conflict(res: Response, message: string): Response {
    return res.status(409).json(createErrorResponse(message, undefined, 409));
  }

  protected getPaginationParams(req: Request): { page: number; limit: number } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    return { page, limit };
  }

  protected getCurrentUser(req: Request): { userId: string; role: string } | null {
    const user = (req as any).user;
    if (!user) return null;
    return { userId: user.id || user.userId, role: user.role };
  }

  /**
   * ✅ PRODUCTION FIX: Strictly typed async handler wrapper
   */
  protected asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}