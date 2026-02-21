import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams, sanitizeString, sanitizeObject } from '../middleware/validate';

describe('Input Validation Middleware', () => {
  describe('sanitizeString', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = sanitizeString(input);
      expect(result).toBe('Hello');
    });

    it('should remove nested script tags', () => {
      const input = '<script src="evil.js"><script>alert(1)</script></script>';
      const result = sanitizeString(input);
      expect(result).not.toContain('<script>');
    });

    it('should remove event handlers', () => {
      const input = '<div onclick="alert(1)" onerror="alert(2)">Test</div>';
      const result = sanitizeString(input);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onerror');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeString(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove data: URLs', () => {
      const input = '<img src="data:text/javascript,alert(1)">';
      const result = sanitizeString(input);
      expect(result).not.toContain('data:');
    });

    it('should return undefined for undefined input', () => {
      const result = sanitizeString(undefined);
      expect(result).toBeUndefined();
    });

    it('should return string unchanged if no dangerous content', () => {
      const input = 'This is a normal string without any script tags';
      const result = sanitizeString(input);
      expect(result).toBe(input);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize nested object values', () => {
      const input = {
        user: {
          name: '<script>alert(1)</script>John',
        },
      };
      const result = sanitizeObject(input) as Record<string, unknown>;
      expect((result.user as Record<string, unknown>).name).toBe('John');
    });

    it('should sanitize array values', () => {
      const input = {
        tags: ['<script>alert(1)</script>', 'normal'],
      };
      const result = sanitizeObject(input) as Record<string, unknown>;
      expect((result.tags as string[])[0]).toBe('');
      expect((result.tags as string[])[1]).toBe('normal');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeObject(null)).toBeNull();
      expect(sanitizeObject(undefined)).toBeUndefined();
    });

    it('should handle numbers and booleans unchanged', () => {
      const input = { count: 42, active: true };
      const result = sanitizeObject(input) as Record<string, unknown>;
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
    });
  });

  describe('validateBody', () => {
    const app = express();
    app.use(express.json());
    
    const testSchema = z.object({
      email: z.string().email('Invalid email'),
      name: z.string().min(1, 'Name is required'),
      age: z.number().optional(),
    });

    app.post('/test', validateBody(testSchema), (req, res) => {
      res.json({ success: true, data: req.body });
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/test')
        .send({ email: 'not-an-email', name: 'John' });
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'email' })
      );
    });

    it('should return 400 for missing required field', async () => {
      const res = await request(app)
        .post('/test')
        .send({ email: 'test@example.com' });
      
      expect(res.status).toBe(400);
      expect(res.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'name' })
      );
    });

    it('should accept valid input', async () => {
      const res = await request(app)
        .post('/test')
        .send({ email: 'test@example.com', name: 'John', age: 25 });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test@example.com');
    });

    it('should sanitize XSS in body before validation', async () => {
      const res = await request(app)
        .post('/test')
        .send({ email: 'test@example.com', name: '<script>alert(1)</script>John' });
      
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('John');
    });

    it('should return detailed validation errors', async () => {
      const res = await request(app)
        .post('/test')
        .send({ email: 'invalid', name: '' });
      
      expect(res.status).toBe(400);
      expect(res.body.error.details).toHaveLength(2);
    });
  });

  describe('validateQuery', () => {
    const app = express();
    
    const querySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
      search: z.string().optional(),
    });

    app.get('/test', validateQuery(querySchema), (req, res) => {
      const validated = req.query;
      res.json(validated);
    });

    it('should return 400 for invalid page number', async () => {
      const res = await request(app)
        .get('/test')
        .query({ page: '-1' });
      
      expect(res.status).toBe(400);
    });

    it('should return 400 for limit exceeding max', async () => {
      const res = await request(app)
        .get('/test')
        .query({ limit: '200' });
      
      expect(res.status).toBe(400);
    });

    it('should accept valid query params', async () => {
      const res = await request(app)
        .get('/test')
        .query({ page: '2', limit: '50', search: 'test' });
      
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(50);
      expect(res.body.search).toBe('test');
    });

    it('should use default values', async () => {
      const res = await request(app)
        .get('/test');
      
      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
    });
  });

  describe('validateParams', () => {
    const app = express();
    
    const idSchema = z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    });

    app.get('/test/:id', validateParams(idSchema), (req, res) => {
      res.json({ id: req.params.id });
    });

    it('should return 400 for non-numeric id', async () => {
      const res = await request(app)
        .get('/test/abc');
      
      expect(res.status).toBe(400);
    });

    it('should transform string id to number', async () => {
      const res = await request(app)
        .get('/test/123');
      
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(123);
      expect(typeof res.body.id).toBe('number');
    });
  });
});
