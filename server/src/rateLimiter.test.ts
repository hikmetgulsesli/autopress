import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { authLimiter, apiLimiter, createRateLimiter } from '../src/middleware/rateLimiter';

describe('Rate Limiter Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('authLimiter', () => {
    it('should allow requests within the limit', async () => {
      app.use('/api/auth', authLimiter);
      app.get('/api/auth/test', (_req, res) => {
        res.json({ success: true });
      });

      const res = await request(app).get('/api/auth/test');
      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
    });

    it('should include rate limit headers', async () => {
      app.use('/api/auth', authLimiter);
      app.get('/api/auth/test', (_req, res) => {
        res.json({ success: true });
      });

      const res = await request(app).get('/api/auth/test');
      // express-rate-limit uses X-RateLimit-Limit and X-RateLimit-Remaining in legacy mode
      // or RateLimit-Limit and RateLimit-Remaining in standard mode
      expect(
        res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit']
      ).toBeDefined();
      expect(
        res.headers['ratelimit-remaining'] || res.headers['x-ratelimit-remaining']
      ).toBeDefined();
    });

    it('should have correct limit of 5 requests per 15 minutes for auth', async () => {
      app.use('/api/auth', authLimiter);
      app.get('/api/auth/test', (_req, res) => {
        res.json({ success: true });
      });

      const res = await request(app).get('/api/auth/test');
      const limit = res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'];
      expect(limit).toBe('5');
    });
  });

  describe('apiLimiter', () => {
    it('should allow requests within the limit', async () => {
      app.use('/api', apiLimiter);
      app.get('/api/test', (_req, res) => {
        res.json({ success: true });
      });

      const res = await request(app).get('/api/test');
      expect(res.status).toBe(200);
    });

    it('should have correct limit of 100 requests per 15 minutes for API', async () => {
      app.use('/api', apiLimiter);
      app.get('/api/test', (_req, res) => {
        res.json({ success: true });
      });

      const res = await request(app).get('/api/test');
      const limit = res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'];
      expect(limit).toBe('100');
    });
  });

  describe('createRateLimiter', () => {
    it('should create a custom rate limiter with specified options', async () => {
      const customLimiter = createRateLimiter({
        windowMs: 60 * 1000, // 1 minute
        max: 10,
        message: 'Custom rate limit exceeded',
      });

      app.use('/api/custom', customLimiter);
      app.get('/api/custom/test', (_req, res) => {
        res.json({ success: true });
      });

      const res = await request(app).get('/api/custom/test');
      expect(res.status).toBe(200);
      const limit = res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'];
      expect(limit).toBe('10');
    });
  });

  describe('Rate limit response format', () => {
    it('should return 429 with Retry-After header when limit is exceeded', async () => {
      const strictLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 1,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req: express.Request, res: express.Response) => {
          res.set('Retry-After', String(Math.ceil(60)));
          res.status(429).json({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded',
            },
          });
        },
      });

      app.use('/api/strict', strictLimiter);
      app.get('/api/strict/test', (_req, res) => {
        res.json({ success: true });
      });

      // First request should succeed
      const firstRes = await request(app).get('/api/strict/test');
      expect(firstRes.status).toBe(200);

      // Second request should be rate limited
      const secondRes = await request(app).get('/api/strict/test');
      expect(secondRes.status).toBe(429);
      expect(secondRes.headers['retry-after']).toBeDefined();
    });

    it('should return proper error response format when rate limited', async () => {
      // Create a limiter that hits the limit immediately
      const testLimiter = rateLimit({
        windowMs: 60 * 1000,
        max: 0, // Immediately rate limit
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req: express.Request, res: express.Response) => {
          res.set('Retry-After', String(Math.ceil(60)));
          res.status(429).json({
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please try again later.',
            },
          });
        },
      });

      app.use('/api/zero', testLimiter);
      app.get('/api/zero/test', (_req, res) => {
        res.json({ success: true });
      });

      const res = await request(app).get('/api/zero/test');
      expect(res.status).toBe(429);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(res.body.error.message).toBeDefined();
      expect(res.headers['retry-after']).toBeDefined();
    });
  });
});
