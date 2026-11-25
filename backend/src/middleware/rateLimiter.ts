import { Request, Response, NextFunction } from 'express';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitInfo>();

export interface RateLimitOptions {
  windowMs?: number;      // Time window in milliseconds (default: 15 minutes)
  maxRequests?: number;   // Max requests per window (default: 100)
  message?: string;       // Custom error message
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const createRateLimiter = (options: RateLimitOptions = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting for health checks
    if (req.path === '/health') {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}-${req.path}`;
    const now = Date.now();

    let info = rateLimitStore.get(key);

    if (!info || now > info.resetTime) {
      info = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, info);
    } else {
      info.count++;
      rateLimitStore.set(key, info);
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - info.count).toString());
    res.setHeader('X-RateLimit-Reset', info.resetTime.toString());

    if (info.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((info.resetTime - now) / 1000)
      });
    }

    next();
  };
};

// Alias for testing
export const validateRequest = createRateLimiter;

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, info] of rateLimitStore.entries()) {
    if (now > info.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

// Pre-configured limiters for common use cases
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
  message: 'Too many API requests, please slow down.'
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5, // Strict limit for auth endpoints
  message: 'Too many authentication attempts, please try again later.'
});

export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 50,
  message: 'Too many file uploads, please try again later.'
});
