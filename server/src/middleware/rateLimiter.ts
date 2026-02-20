import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

// Memory store for rate limiting (in production, consider Redis)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
  handler: (_req: Request, res: Response) => {
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
  handler: (_req: Request, res: Response) => {
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
    handler: (_req: Request, res: Response) => {
<<<<<<< HEAD
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
