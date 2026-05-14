// backend/src/utils/errors.ts

export class AppError extends Error {
    public statusCode: number;
    public status: string;
    public isOperational: boolean;
  
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  // Optional: Add more error types if needed
  export class ValidationError extends AppError {
    constructor(message: string) {
      super(message, 400);
    }
  }
  
  export class NotFoundError extends AppError {
    constructor(message: string) {
      super(message, 404);
    }
  }
  
  export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized access') {
      super(message, 401);
    }
  }
  
  export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden') {
      super(message, 403);
    }
  }
  
  // Error handler middleware
  export const errorHandler = (err: any, req: any, res: any, next: any) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    }
  
    // Handle unknown errors
    console.error('Error:', err);
    return res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong!',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  };