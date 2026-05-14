import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRateLimiter } from '../../src/middleware/rateLimiter.js';

describe('Rate Limiter Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      path: '/api/test',
      method: 'GET'
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn()
    };

    mockNext = vi.fn();
  });

  it('should allow requests under the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10 });
    limiter(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should block requests exceeding the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });
    
    // First request should pass
    limiter(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalled();

    // Reset mocks for second request
    mockNext.mockClear();
    mockRes.status.mockClear();
    mockRes.json.mockClear();
    mockRes.setHeader.mockClear();
    
    // Second request should be blocked
    limiter(mockReq, mockRes, mockNext);
    expect(mockRes.status).toHaveBeenCalledWith(429);
    expect(mockRes.json).toHaveBeenCalled();
  });

  it('should skip rate limiting for health endpoint', () => {
    const originalPath = mockReq.path;
    mockReq.path = '/health';
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });
    
    // Make multiple requests to health endpoint - should all pass
    limiter(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
    
    mockNext.mockClear();
    mockRes.status.mockClear();
    mockRes.json.mockClear();
    
    limiter(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
    
    mockNext.mockClear();
    limiter(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);
    
    expect(mockRes.status).not.toHaveBeenCalled();
    
    // Restore original path
    mockReq.path = originalPath;
  });

  it('should set rate limit headers', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 100 });
    limiter(mockReq, mockRes, mockNext);

    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String));
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
  });
});
