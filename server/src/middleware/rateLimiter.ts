import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { logSecurityEvent } from '../services/audit.service';

// Helper to get client IP
function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
}

// Helper to get user agent
function getUserAgent(req: Request): string {
  return req.headers['user-agent'] || 'unknown';
}

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
  handler: (req: Request, res: Response) => {
    // Log rate limit hit
    logSecurityEvent({
      eventType: 'RATE_LIMIT_HIT',
      userId: null,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      details: { endpoint: req.path, limit: 5, window: '15m' },
    }).catch(() => {
      // Silently fail - don't block the response
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
  handler: (req: Request, res: Response) => {
    // Log rate limit hit
    logSecurityEvent({
      eventType: 'RATE_LIMIT_HIT',
      userId: null,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      details: { endpoint: req.path, limit: 100, window: '15m' },
    }).catch(() => {
      // Silently fail - don't block the response
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
    handler: (req: Request, res: Response) => {
      // Log rate limit hit
      logSecurityEvent({
        eventType: 'RATE_LIMIT_HIT',
        userId: null,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        details: { endpoint: req.path, limit: options.max || 100, window: `${(options.windowMs || 15 * 60 * 1000) / 60000}m` },
      }).catch(() => {
        // Silently fail - don't block the response
      });

      res.set('Retry-After', String(Math.ceil(15 * 60)));
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests. Please try again later.',
        },
      });
    },
  });
};
