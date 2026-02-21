import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import publishRoutes from '../routes/publish';
import { query } from '../db/connection';
import { authenticate } from '../middleware/auth';

// Mock auth middleware
vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  },
}));

// Mock database
vi.mock('../db/connection');

const mockQuery = query as any;

describe('POST /publish-now', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/publish', publishRoutes);
    vi.clearAllMocks();
  });

  describe('Validation', () => {
    it('should return 400 when articleId is missing', async () => {
      const res = await request(app).post('/api/publish/publish-now').send({
        siteId: 1,
        platform: 'wordpress',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/articleId.*gereklidir/);
    });

    it('should return 400 when siteId is missing', async () => {
      const res = await request(app).post('/api/publish/publish-now').send({
        articleId: 1,
        platform: 'wordpress',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/siteId.*gereklidir/);
    });

    it('should return 400 when platform is missing', async () => {
      const res = await request(app).post('/api/publish/publish-now').send({
        articleId: 1,
        siteId: 1,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/platform.*gereklidir/);
    });

    it('should return 404 when article not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] } as any);

      const res = await request(app).post('/api/publish/publish-now').send({
        articleId: 999,
        siteId: 1,
        platform: 'wordpress',
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('WordPress publishing', () => {
    const mockWordPressSite = {
      id: 1,
      platform: 'wordpress',
      name: 'My WordPress Site',
      domain: 'https://example.com',
      api_credentials: {
        siteUrl: 'https://example.com',
        username: 'testuser',
        applicationPassword: 'app-password-123',
      },
    };

    const mockArticle = {
      id: 1,
      title: 'Test Article',
      slug: 'test-article',
      content: '<p>Test content</p>',
      excerpt: 'Test excerpt',
      status: 'draft',
      site_id: 1,
    };

    it('should retrieve WordPress credentials from database', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockArticle] } as any)
        .mockResolvedValueOnce({ rows: [mockWordPressSite] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app).post('/api/publish/publish-now').send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      });

      // The query should have been called to get the site
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM sites WHERE id = $1'),
        [1]
      );
    });

    it('should return 400 when WordPress credentials are missing', async () => {
      const siteWithoutCreds = {
        ...mockWordPressSite,
        api_credentials: {},
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockArticle] } as any)
        .mockResolvedValueOnce({ rows: [siteWithoutCreds] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app).post('/api/publish/publish-now').send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_CREDENTIALS');
      expect(res.body.error.message).toMatch(/WordPress.*credentials.*required/i);
    });

    it('should return 401 for authentication failures', async () => {
      const siteWithBadCreds = {
        ...mockWordPressSite,
        api_credentials: {
          siteUrl: 'https://example.com',
          username: 'testuser',
          applicationPassword: 'wrong-password',
        },
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockArticle] } as any)
        .mockResolvedValueOnce({ rows: [siteWithBadCreds] } as any);

      const res = await request(app).post('/api/publish/publish-now').send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_ERROR');
    });

    it('should return actual WordPress URL on success', async () => {
      const siteWithCreds = {
        ...mockWordPressSite,
        api_credentials: {
          siteUrl: 'https://myblog.com',
          username: 'admin',
          applicationPassword: 'correct-pass',
        },
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockArticle] } as any)
        .mockResolvedValueOnce({ rows: [siteWithCreds] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app).post('/api/publish/publish-now').send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.publishedUrl).not.toContain('example.com');
      expect(res.body.data.publishedUrl).toContain('myblog.com');
    });
  });

  describe('Blogger publishing', () => {
    const mockBloggerSite = {
      id: 2,
      platform: 'blogger',
      name: 'My Blog',
      domain: 'https://myblog.blogspot.com',
      api_credentials: {
        blogId: '123456789',
        accessToken: 'ya29.access-token',
        refreshToken: 'refresh-token',
      },
    };

    const mockArticle = {
      id: 2,
      title: 'Blogger Test',
      slug: 'blogger-test',
      content: '<p>Blogger content</p>',
      excerpt: 'Blogger excerpt',
      status: 'draft',
      site_id: 2,
    };

    it('should retrieve Blogger credentials from database', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockArticle] } as any)
        .mockResolvedValueOnce({ rows: [mockBloggerSite] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app).post('/api/publish/publish-now').send({
        articleId: 2,
        siteId: 2,
        platform: 'blogger',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM sites WHERE id = $1'),
        [2]
      );
    });

    it('should return 400 when Blogger credentials are missing', async () => {
      const siteWithoutCreds = {
        ...mockBloggerSite,
        api_credentials: {},
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockArticle] } as any)
        .mockResolvedValueOnce({ rows: [siteWithoutCreds] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app).post('/api/publish/publish-now').send({
        articleId: 2,
        siteId: 2,
        platform: 'blogger',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_CREDENTIALS');
      expect(res.body.error.message).toMatch(/Blogger.*credentials.*required/i);
    });

    it('should return 401 for Blogger authentication failures', async () => {
      const siteWithBadCreds = {
        ...mockBloggerSite,
        api_credentials: {
          blogId: '123456789',
          accessToken: 'expired-token',
          refreshToken: 'invalid-refresh',
        },
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockArticle] } as any)
        .mockResolvedValueOnce({ rows: [siteWithBadCreds] } as any);

      const res = await request(app).post('/api/publish/publish-now').send({
        articleId: 2,
        siteId: 2,
        platform: 'blogger',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_ERROR');
    });

    it('should return actual Blogger URL on success', async () => {
      const siteWithCreds = {
        ...mockBloggerSite,
        api_credentials: {
          blogId: '987654321',
          accessToken: 'valid-access-token',
          refreshToken: 'valid-refresh-token',
        },
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockArticle] } as any)
        .mockResolvedValueOnce({ rows: [siteWithCreds] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const res = await request(app).post('/api/publish/publish-now').send({
        articleId: 2,
        siteId: 2,
        platform: 'blogger',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.publishedUrl).not.toContain('example.com');
      expect(res.body.data.publishedUrl).toMatch(/blogspot\.com|blogger\.com/);
    });
  });

  describe('Error handling', () => {
    const mockArticle = {
      id: 1,
      title: 'Error Test',
      slug: 'error-test',
      content: '<p>Error content</p>',
      status: 'draft',
    };

    it('should return 403 for forbidden API errors', async () => {
      const mockSite = {
        id: 1,
        platform: 'wordpress',
        api_credentials: {
          siteUrl: 'https://example.com',
          username: 'testuser',
          applicationPassword: 'app-password',
        },
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockArticle] } as any)
        .mockResolvedValueOnce({ rows: [mockSite] } as any);

      const res = await request(app).post('/api/publish/publish-now').send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 500 for generic API errors', async () => {
      const mockSite = {
        id: 1,
        platform: 'wordpress',
        api_credentials: {
          siteUrl: 'https://invalid-site-that-fails.com',
          username: 'testuser',
          applicationPassword: 'app-password',
        },
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockArticle] } as any)
        .mockResolvedValueOnce({ rows: [mockSite] } as any);

      const res = await request(app).post('/api/publish/publish-now').send({
        articleId: 1,
        siteId: 1,
        platform: 'wordpress',
      });

      expect([500, 502, 503]).toContain(res.status);
    });
  });
});
