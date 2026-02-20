import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
  handler: async (req: Request, res: Response) => {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Log the rate limit hit
    await logSecurityEvent({
      eventType: 'RATE_LIMIT_HIT',
      userId: null,
      ipAddress: clientIp,
      userAgent,
      details: { 
        endpoint: req.path,
        method: req.method,
        limit: 5,
        window_ms: 15 * 60 * 1000,
      },
    });
    
    res.set('Retry-After', String(Math.ceil(15 * 60)));
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again later.',
      },
    });
  },
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many API requests. Please try again later.',
    },
  },
  handler: async (req: Request, res: Response) => {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Log the rate limit hit
    await logSecurityEvent({
      eventType: 'RATE_LIMIT_HIT',
      userId: null,
      ipAddress: clientIp,
      userAgent,
      details: { 
        endpoint: req.path,
        method: req.method,
        limit: 100,
        window_ms: 15 * 60 * 1000,
      },
    });
    
    res.set('Retry-After', String(Math.ceil(15 * 60)));
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many API requests. Please try again later.',
      },
    });
  },
});

// Custom rate limiter for more flexible configuration
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message || 'Too many requests. Please try again later.',
      },
    },
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: async (req: Request, res: Response) => {
      const clientIp = getClientIp(req);
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      // Log the rate limit hit
      await logSecurityEvent({
        eventType: 'RATE_LIMIT_HIT',
        userId: null,
        ipAddress: clientIp,
        userAgent,
        details: { 
          endpoint: req.path,
          method: req.method,
          limit: options.max || 100,
          window_ms: options.windowMs || 15 * 60 * 1000,
        },
      });
      
      res.set('Retry-After', String(Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)));
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests. Please try again later.',
        },
      });
    },
  });
};
