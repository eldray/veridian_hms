/**
 * Base Controller for Enterprise Architecture
 * Provides common HTTP response methods and error handling
 */

import { Request, Response, NextFunction } from 'express';
import { 
  createSuccessResponse, 
  createPaginatedResponse, 
  createErrorResponse,
  ApiResponse 
} from '../types/ApiResponse';

export abstract class BaseController {
  /**
   * Success response with 200 status
   */
  protected ok(res: Response, data: any, message?: string, meta?: Record<string, any>): Response {
    return res.json(createSuccessResponse(data, message, meta));
  }

  /**
   * Created response with 201 status
   */
  protected created(res: Response, data: any, message?: string): Response {
    return res.status(201).json(createSuccessResponse(data, message));
  }

  /**
   * No content response with 204 status
   */
  protected noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Paginated response
   */
  protected paginated(
    res: Response,
    data: any[],
    pagination: { page: number; limit: number; total: number },
    message?: string
  ): Response {
    return res.json(createPaginatedResponse(data, pagination, message));
  }

  /**
   * Error response handler
   */
  protected error(res: Response, err: Error | any): Response {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';
    const errors = err.errors || undefined;

    console.error(`[Controller Error] ${message}`, {
      name: err.name,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    return res.status(status).json(createErrorResponse(message, errors, status));
  }

  /**
   * Not found response
   */
  protected notFound(res: Response, resource: string = 'Resource'): Response {
    return res.status(404).json(
      createErrorResponse(`${resource} not found`, undefined, 404)
    );
  }

  /**
   * Bad request response
   */
  protected badRequest(res: Response, message: string, errors?: any[]): Response {
    return res.status(400).json(createErrorResponse(message, errors, 400));
  }

  /**
   * Unauthorized response
   */
  protected unauthorized(res: Response, message: string = 'Unauthorized'): Response {
    return res.status(401).json(createErrorResponse(message, undefined, 401));
  }

  /**
   * Forbidden response
   */
  protected forbidden(res: Response, message: string = 'Forbidden'): Response {
    return res.status(403).json(createErrorResponse(message, undefined, 403));
  }

  /**
   * Conflict response
   */
  protected conflict(res: Response, message: string): Response {
    return res.status(409).json(createErrorResponse(message, undefined, 409));
  }

  /**
   * Extract pagination params from request
   */
  protected getPaginationParams(req: Request): { page: number; limit: number } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    
    return { page, limit };
  }

  /**
   * Extract user info from authenticated request
   */
  protected getCurrentUser(req: Request): { userId: string; role: string } | null {
    if (!req.user) return null;
    
    const user = req.user as any;
    return {
      userId: user.id || user.userId,
      role: user.role
    };
  }

  /**
   * Async handler wrapper to catch errors
   */
  protected asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}
