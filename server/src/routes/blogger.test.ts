import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { google } from 'googleapis';

// Mock dependencies before importing routes
vi.mock('../db/connection', () => ({
  query: vi.fn(),
}));

vi.mock('googleapis');

// Import after mocking
import { query } from '../db/connection';
import bloggerRoutes from '../routes/blogger';

const mockQuery = vi.mocked(query);

// Create test app with proper auth mocking
function createTestApp() {
  const app = express();
  app.use(express.json());
  
  // Mock auth middleware - add user to request
  app.use((req, res, next) => {
    (req as any).user = { id: 1, email: 'test@example.com', role: 'user' };
    next();
  });
  
  app.use('/api/blogger', bloggerRoutes);
  return app;
}

describe('Blogger API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/blogger/auth-url', () => {
    it('should return OAuth URL', async () => {
      const app = createTestApp();
      
      const res = await request(app)
        .get('/api/blogger/auth-url')
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authUrl).toBeDefined();
      expect(res.body.data.authUrl).toContain('accounts.google.com');
    });
  });

  describe('POST /api/blogger/callback', () => {
    it('should exchange code for tokens', async () => {
      const app = createTestApp();
      
      // Mock Google OAuth
      const mockGetToken = vi.fn().mockResolvedValue({
        tokens: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expiry_date: Date.now() + 3600000,
        },
      });
      
      vi.mocked(google.auth.OAuth2).mockImplementation(() => ({
        getToken: mockGetToken,
      } as any));
      
      mockQuery.mockResolvedValue({ rows: [] } as any);
      
      const res = await request(app)
        .post('/api/blogger/callback')
        .send({ code: 'test-auth-code' })
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Blogger authentication successful');
    });

    it('should return 400 for missing code', async () => {
      const app = createTestApp();
      
      const res = await request(app)
        .post('/api/blogger/callback')
        .send({})
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid code', async () => {
      const app = createTestApp();
      
      const mockGetToken = vi.fn().mockRejectedValue(new Error('Invalid code'));
      
      vi.mocked(google.auth.OAuth2).mockImplementation(() => ({
        getToken: mockGetToken,
      } as any));
      
      const res = await request(app)
        .post('/api/blogger/callback')
        .send({ code: 'invalid-code' })
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('TOKEN_EXCHANGE_ERROR');
    });
  });

  describe('GET /api/blogger/blogs', () => {
    it('should return list of blogs', async () => {
      const app = createTestApp();
      
      // Mock token query
      mockQuery.mockResolvedValueOnce({
        rows: [{
          access_token: 'test-token',
          refresh_token: 'test-refresh',
        }],
      } as any);
      
      // Mock Blogger API
      const mockListByUser = vi.fn().mockResolvedValue({
        data: {
          items: [
            {
              id: '123',
              name: 'Test Blog',
              url: 'https://testblog.blogspot.com',
              description: 'A test blog',
              published: '2024-01-01T00:00:00Z',
              updated: '2024-01-02T00:00:00Z',
            },
          ],
        },
      });
      
      vi.mocked(google.blogger).mockReturnValue({
        blogs: { listByUser: mockListByUser },
      } as any);
      
      const res = await request(app)
        .get('/api/blogger/blogs')
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Test Blog');
    });

    it('should return 401 if not authenticated with Blogger', async () => {
      const app = createTestApp();
      
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      
      const res = await request(app)
        .get('/api/blogger/blogs')
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
    });

    it('should return 401 if token expired', async () => {
      const app = createTestApp();
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          access_token: 'expired-token',
          refresh_token: 'test-refresh',
        }],
      } as any);
      
      const mockListByUser = vi.fn().mockRejectedValue({
        code: 401,
        message: 'invalid_token',
      });
      
      vi.mocked(google.blogger).mockReturnValue({
        blogs: { listByUser: mockListByUser },
      } as any);
      
      const res = await request(app)
        .get('/api/blogger/blogs')
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('POST /api/blogger/publish', () => {
    it('should publish article to Blogger', async () => {
      const app = createTestApp();
      
      // Mock token query
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            access_token: 'test-token',
            refresh_token: 'test-refresh',
          }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any) // Update article
        .mockResolvedValueOnce({ rows: [] } as any); // Insert history
      
      // Mock Blogger API
      const mockInsert = vi.fn().mockResolvedValue({
        data: {
          id: 'post-123',
          url: 'https://testblog.blogspot.com/2024/01/test-post.html',
          title: 'Test Post',
          published: '2024-01-15T10:00:00Z',
        },
      });
      
      vi.mocked(google.blogger).mockReturnValue({
        posts: { insert: mockInsert },
      } as any);
      
      const res = await request(app)
        .post('/api/blogger/publish')
        .send({
          blogId: '123',
          articleId: 1,
          title: 'Test Post',
          content: '<p>Test content</p>',
          labels: ['test', 'blog'],
        })
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.postId).toBe('post-123');
      expect(res.body.data.url).toBe('https://testblog.blogspot.com/2024/01/test-post.html');
    });

    it('should return 400 for missing required fields', async () => {
      const app = createTestApp();
      
      const res = await request(app)
        .post('/api/blogger/publish')
        .send({
          blogId: '123',
          // Missing articleId, title, content
        })
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 if not authenticated with Blogger', async () => {
      const app = createTestApp();
      
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      
      const res = await request(app)
        .post('/api/blogger/publish')
        .send({
          blogId: '123',
          articleId: 1,
          title: 'Test Post',
          content: '<p>Test content</p>',
        })
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
    });

    it('should handle publish errors', async () => {
      const app = createTestApp();
      
      // Mock token query
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            access_token: 'test-token',
            refresh_token: 'test-refresh',
          }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // Insert history error
      
      // Mock Blogger API error
      const mockInsert = vi.fn().mockRejectedValue(new Error('API Error'));
      
      vi.mocked(google.blogger).mockReturnValue({
        posts: { insert: mockInsert },
      } as any);
      
      const res = await request(app)
        .post('/api/blogger/publish')
        .send({
          blogId: '123',
          articleId: 1,
          title: 'Test Post',
          content: '<p>Test content</p>',
        })
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('PUBLISH_ERROR');
    });
  });
});
