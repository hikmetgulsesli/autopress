import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Mock dependencies before importing routes
vi.mock('../db/connection', () => ({
  query: vi.fn(),
}));

// Mock googleapis with inline implementations
vi.mock('googleapis', () => {
  const mockGenerateAuthUrl = () => 'https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/blogger';
  const mockGetToken = () => Promise.resolve({
    tokens: {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expiry_date: Date.now() + 3600000,
    },
  });
  const mockSetCredentials = () => {};
  const mockListByUser = () => Promise.resolve({
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
  const mockInsert = () => Promise.resolve({
    data: {
      id: 'post-123',
      url: 'https://testblog.blogspot.com/2024/01/test-post.html',
      title: 'Test Post',
      published: '2024-01-15T10:00:00Z',
    },
  });

  return {
    google: {
      auth: {
        OAuth2: vi.fn().mockImplementation(function() {
          return {
            generateAuthUrl: mockGenerateAuthUrl,
            getToken: mockGetToken,
            setCredentials: mockSetCredentials,
          };
        }),
      },
      blogger: vi.fn().mockImplementation(function() {
        return {
          blogs: {
            listByUser: mockListByUser,
          },
          posts: {
            insert: mockInsert,
          },
        };
      }),
    },
  };
});

// Import after mocking
import { query } from '../db/connection';
import bloggerRoutes from './blogger';
import { config } from '../config';

const mockQuery = vi.mocked(query);

// Generate a valid test token
function generateTestToken() {
  return jwt.sign(
    { id: 1, email: 'test@example.com', role: 'user' },
    config.JWT_SECRET
  );
}

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
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
      const token = generateTestToken();
      
      const res = await request(app)
        .get('/api/blogger/auth-url')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.authUrl).toBeDefined();
      expect(res.body.data.authUrl).toContain('accounts.google.com');
    });

    it('should return 401 without auth token', async () => {
      const app = createTestApp();
      
      const res = await request(app)
        .get('/api/blogger/auth-url')
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token gerekli');
    });
  });

  describe('POST /api/blogger/callback', () => {
    it('should exchange code for tokens', async () => {
      const app = createTestApp();
      const token = generateTestToken();
      
      mockQuery.mockResolvedValue({ rows: [] } as any);
      
      const res = await request(app)
        .post('/api/blogger/callback')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'test-auth-code' })
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Blogger authentication successful');
    });

    it('should return 400 for missing code', async () => {
      const app = createTestApp();
      const token = generateTestToken();
      
      const res = await request(app)
        .post('/api/blogger/callback')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/blogger/blogs', () => {
    it('should return list of blogs', async () => {
      const app = createTestApp();
      const token = generateTestToken();
      
      // Mock token query
      mockQuery.mockResolvedValueOnce({
        rows: [{
          access_token: 'test-token',
          refresh_token: 'test-refresh',
        }],
      } as any);
      
      const res = await request(app)
        .get('/api/blogger/blogs')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Test Blog');
    });

    it('should return 401 if not authenticated with Blogger', async () => {
      const app = createTestApp();
      const token = generateTestToken();
      
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      
      const res = await request(app)
        .get('/api/blogger/blogs')
        .set('Authorization', `Bearer ${token}`)
        .expect('Content-Type', /json/);
      
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
    });
  });

  describe('POST /api/blogger/publish', () => {
    it('should publish article to Blogger', async () => {
      const app = createTestApp();
      const token = generateTestToken();
      
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
      
      const res = await request(app)
        .post('/api/blogger/publish')
        .set('Authorization', `Bearer ${token}`)
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
      const token = generateTestToken();
      
      const res = await request(app)
        .post('/api/blogger/publish')
        .set('Authorization', `Bearer ${token}`)
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
      const token = generateTestToken();
      
      mockQuery.mockResolvedValueOnce({ rows: [] } as any);
      
      const res = await request(app)
        .post('/api/blogger/publish')
        .set('Authorization', `Bearer ${token}`)
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
  });
});
