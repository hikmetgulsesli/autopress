import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import sitesRouter from './sites';
import { query } from '../db/connection';

// Mock the database connection
vi.mock('../db/connection', () => ({
  query: vi.fn(),
}));

// Mock authentication middleware
vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  },
  AuthRequest: class {},
}));

describe('Sites Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/sites', sitesRouter);
    vi.clearAllMocks();
  });

  describe('POST /sites/:id/test-connection', () => {
    it('should return 404 when site does not exist', async () => {
      (query as any).mockResolvedValue({ rows: [] });

      const res = await request(app).post('/sites/999/test-connection');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Site bulunamadı');
    });

    it('should return 400 when platform_id is missing', async () => {
      (query as any).mockResolvedValue({
        rows: [{
          id: 1,
          name: 'Test Site',
          platform: 'wordpress',
          platform_id: '',
          api_credentials: { api_key: 'test123' },
        }],
      });

      const res = await request(app).post('/sites/1/test-connection');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_PLATFORM_ID');
      expect(res.body.error.message).toContain('Platform ID eksik');
    });

    it('should return 400 when credentials are missing', async () => {
      (query as any).mockResolvedValue({
        rows: [{
          id: 1,
          name: 'Test Site',
          platform: 'wordpress',
          platform_id: '12345',
          api_credentials: {},
        }],
      });

      const res = await request(app).post('/sites/1/test-connection');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_CREDENTIALS');
      expect(res.body.error.message).toContain('API kimlik bilgileri eksik');
    });

    it('should return 401 when credentials are invalid', async () => {
      (query as any).mockResolvedValue({
        rows: [{
          id: 1,
          name: 'Test Site',
          platform: 'wordpress',
          platform_id: '12345',
          api_credentials: { api_key: 'abc' }, // too short
        }],
      });

      const res = await request(app).post('/sites/1/test-connection');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toContain('Geçersiz kimlik bilgileri');
    });

    it('should return success when credentials are valid', async () => {
      (query as any).mockResolvedValue({
        rows: [{
          id: 1,
          name: 'Test Site',
          platform: 'wordpress',
          platform_id: '12345',
          api_credentials: { api_key: 'valid_api_key_123' },
        }],
      });

      const res = await request(app).post('/sites/1/test-connection');

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.message).toContain('Bağlantı başarılı');
      expect(res.body.data.platform).toBe('wordpress');
      expect(res.body.data.tested_at).toBeDefined();
    });

    it('should work with blogger platform', async () => {
      (query as any).mockResolvedValue({
        rows: [{
          id: 2,
          name: 'Test Blogger',
          platform: 'blogger',
          platform_id: 'blog123',
          api_credentials: { api_key: 'valid_blogger_key' },
        }],
      });

      const res = await request(app).post('/sites/2/test-connection');

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.platform).toBe('blogger');
    });

    it('should show loading state simulation (delay)', async () => {
      (query as any).mockResolvedValue({
        rows: [{
          id: 1,
          name: 'Test Site',
          platform: 'wordpress',
          platform_id: '12345',
          api_credentials: { api_key: 'valid_key' },
        }],
      });

      const startTime = Date.now();
      const res = await request(app).post('/sites/1/test-connection');
      const endTime = Date.now();

      expect(res.status).toBe(200);
      // Should take at least 1 second due to the simulated delay
      expect(endTime - startTime).toBeGreaterThanOrEqual(900);
    });
  });
});
