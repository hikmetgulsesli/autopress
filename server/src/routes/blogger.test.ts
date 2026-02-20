import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bloggerRoutes from './blogger';
import * as bloggerService from '../services/blogger.service';

// Mock the blogger service
vi.mock('../services/blogger.service');

// Mock the auth middleware
vi.mock('../middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'test@example.com', role: 'admin' };
    next();
  },
  AuthRequest: class AuthRequest {},
}));

// Mock the database connection
vi.mock('../db/connection', () => ({
  query: vi.fn(),
  pool: {
    query: vi.fn(),
  },
}));

describe('Blogger Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/blogger', bloggerRoutes);
    vi.clearAllMocks();
  });

  describe('GET /api/blogger/auth-url', () => {
    it('should return OAuth URL when credentials are configured', async () => {
      const mockAuthUrl = 'https://accounts.google.com/o/oauth2/auth?client_id=test';
      vi.mocked(bloggerService.initializeOAuth2Client).mockReturnValue({} as any);
      vi.mocked(bloggerService.getAuthUrl).mockReturnValue(mockAuthUrl);

      // Set environment variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BLOGGER_CLIENT_ID: 'test-client-id',
        BLOGGER_CLIENT_SECRET: 'test-client-secret',
        BLOGGER_REDIRECT_URI: 'http://localhost:4519/api/blogger/callback',
      };

      const response = await request(app).get('/api/blogger/auth-url');

      expect(response.status).toBe(200);
      expect(response.body.data.authUrl).toBe(mockAuthUrl);

      process.env = originalEnv;
    });

    it('should return 500 when credentials are missing', async () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BLOGGER_CLIENT_ID: '',
        BLOGGER_CLIENT_SECRET: '',
      };

      const response = await request(app).get('/api/blogger/auth-url');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('MISSING_CREDENTIALS');

      process.env = originalEnv;
    });
  });

  describe('POST /api/blogger/callback', () => {
    it('should exchange code for tokens', async () => {
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiryDate: Date.now() + 3600 * 1000,
      };
      vi.mocked(bloggerService.initializeOAuth2Client).mockReturnValue({} as any);
      vi.mocked(bloggerService.exchangeCodeForTokens).mockResolvedValue(mockTokens);

      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BLOGGER_CLIENT_ID: 'test-client-id',
        BLOGGER_CLIENT_SECRET: 'test-client-secret',
      };

      const response = await request(app)
        .post('/api/blogger/callback')
        .send({ code: 'auth-code-123' });

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBe(mockTokens.accessToken);
      expect(response.body.data.refreshToken).toBe(mockTokens.refreshToken);
      expect(bloggerService.exchangeCodeForTokens).toHaveBeenCalledWith('auth-code-123');

      process.env = originalEnv;
    });

    it('should return 400 when code is missing', async () => {
      const response = await request(app).post('/api/blogger/callback').send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when code is not a string', async () => {
      const response = await request(app)
        .post('/api/blogger/callback')
        .send({ code: 123 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle service errors', async () => {
      vi.mocked(bloggerService.initializeOAuth2Client).mockReturnValue({} as any);
      vi.mocked(bloggerService.exchangeCodeForTokens).mockRejectedValue({
        code: 'AUTH_CODE_EXCHANGE_FAILED',
        message: 'Invalid authorization code',
        statusCode: 400,
      });

      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BLOGGER_CLIENT_ID: 'test-client-id',
        BLOGGER_CLIENT_SECRET: 'test-client-secret',
      };

      const response = await request(app)
        .post('/api/blogger/callback')
        .send({ code: 'invalid-code' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('AUTH_CODE_EXCHANGE_FAILED');

      process.env = originalEnv;
    });
  });

  describe('GET /api/blogger/blogs', () => {
    it('should list user blogs', async () => {
      const mockBlogs = [
        {
          id: 'blog-1',
          name: 'Test Blog 1',
          url: 'https://testblog1.blogspot.com',
          description: 'A test blog',
        },
        {
          id: 'blog-2',
          name: 'Test Blog 2',
          url: 'https://testblog2.blogspot.com',
        },
      ];
      vi.mocked(bloggerService.initializeOAuth2Client).mockReturnValue({} as any);
      vi.mocked(bloggerService.setCredentials).mockImplementation(() => {});
      vi.mocked(bloggerService.listBlogs).mockResolvedValue(mockBlogs);

      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BLOGGER_CLIENT_ID: 'test-client-id',
        BLOGGER_CLIENT_SECRET: 'test-client-secret',
      };

      const response = await request(app)
        .get('/api/blogger/blogs')
        .set('X-Blogger-Access-Token', 'access-token-123');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockBlogs);
      expect(bloggerService.setCredentials).toHaveBeenCalledWith({
        accessToken: 'access-token-123',
        refreshToken: '',
        expiryDate: expect.any(Number),
      });

      process.env = originalEnv;
    });

    it('should return 401 when access token is missing', async () => {
      const response = await request(app).get('/api/blogger/blogs');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_TOKENS');
    });

    it('should handle service errors', async () => {
      vi.mocked(bloggerService.initializeOAuth2Client).mockReturnValue({} as any);
      vi.mocked(bloggerService.setCredentials).mockImplementation(() => {});
      vi.mocked(bloggerService.listBlogs).mockRejectedValue({
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        statusCode: 401,
      });

      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BLOGGER_CLIENT_ID: 'test-client-id',
        BLOGGER_CLIENT_SECRET: 'test-client-secret',
      };

      const response = await request(app)
        .get('/api/blogger/blogs')
        .set('X-Blogger-Access-Token', 'invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_ERROR');

      process.env = originalEnv;
    });
  });

  describe('POST /api/blogger/publish', () => {
    it('should publish a post to Blogger', async () => {
      const mockPost = {
        id: 'post-123',
        blogId: 'blog-456',
        title: 'Test Post',
        url: 'https://testblog.blogspot.com/2024/01/test-post.html',
        published: new Date().toISOString(),
      };
      vi.mocked(bloggerService.initializeOAuth2Client).mockReturnValue({} as any);
      vi.mocked(bloggerService.setCredentials).mockImplementation(() => {});
      vi.mocked(bloggerService.publishPost).mockResolvedValue(mockPost);

      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BLOGGER_CLIENT_ID: 'test-client-id',
        BLOGGER_CLIENT_SECRET: 'test-client-secret',
      };

      const response = await request(app)
        .post('/api/blogger/publish')
        .send({
          blogId: 'blog-456',
          title: 'Test Post',
          content: '<p>This is a test post content</p>',
          labels: ['test', 'automation'],
          isDraft: false,
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual(mockPost);
      expect(bloggerService.publishPost).toHaveBeenCalledWith({
        blogId: 'blog-456',
        title: 'Test Post',
        content: '<p>This is a test post content</p>',
        labels: ['test', 'automation'],
        isDraft: false,
      });

      process.env = originalEnv;
    });

    it('should publish a draft post', async () => {
      const mockPost = {
        id: 'post-123',
        blogId: 'blog-456',
        title: 'Draft Post',
        url: 'https://testblog.blogspot.com/2024/01/draft-post.html',
      };
      vi.mocked(bloggerService.initializeOAuth2Client).mockReturnValue({} as any);
      vi.mocked(bloggerService.setCredentials).mockImplementation(() => {});
      vi.mocked(bloggerService.publishPost).mockResolvedValue(mockPost);

      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BLOGGER_CLIENT_ID: 'test-client-id',
        BLOGGER_CLIENT_SECRET: 'test-client-secret',
      };

      const response = await request(app)
        .post('/api/blogger/publish')
        .send({
          blogId: 'blog-456',
          title: 'Draft Post',
          content: '<p>Draft content</p>',
          isDraft: true,
          accessToken: 'access-token-123',
        });

      expect(response.status).toBe(201);
      expect(bloggerService.publishPost).toHaveBeenCalledWith({
        blogId: 'blog-456',
        title: 'Draft Post',
        content: '<p>Draft content</p>',
        labels: [],
        isDraft: true,
      });

      process.env = originalEnv;
    });

    it('should return 400 when blogId is missing', async () => {
      const response = await request(app)
        .post('/api/blogger/publish')
        .send({
          title: 'Test Post',
          content: '<p>Content</p>',
          accessToken: 'token-123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].field).toBe('blogId');
    });

    it('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/api/blogger/publish')
        .send({
          blogId: 'blog-456',
          content: '<p>Content</p>',
          accessToken: 'token-123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].field).toBe('title');
    });

    it('should return 400 when title is empty string', async () => {
      const response = await request(app)
        .post('/api/blogger/publish')
        .send({
          blogId: 'blog-456',
          title: '   ',
          content: '<p>Content</p>',
          accessToken: 'token-123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when content is missing', async () => {
      const response = await request(app)
        .post('/api/blogger/publish')
        .send({
          blogId: 'blog-456',
          title: 'Test Post',
          accessToken: 'token-123',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].field).toBe('content');
    });

    it('should return 401 when access token is missing', async () => {
      const response = await request(app)
        .post('/api/blogger/publish')
        .send({
          blogId: 'blog-456',
          title: 'Test Post',
          content: '<p>Content</p>',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_TOKENS');
    });

    it('should handle Blogger API errors', async () => {
      vi.mocked(bloggerService.initializeOAuth2Client).mockReturnValue({} as any);
      vi.mocked(bloggerService.setCredentials).mockImplementation(() => {});
      vi.mocked(bloggerService.publishPost).mockRejectedValue({
        code: 'FORBIDDEN',
        message: 'Not authorized to publish to this blog',
        statusCode: 403,
      });

      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BLOGGER_CLIENT_ID: 'test-client-id',
        BLOGGER_CLIENT_SECRET: 'test-client-secret',
      };

      const response = await request(app)
        .post('/api/blogger/publish')
        .send({
          blogId: 'blog-456',
          title: 'Test Post',
          content: '<p>Content</p>',
          accessToken: 'token-123',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');

      process.env = originalEnv;
    });

    it('should handle blog not found error', async () => {
      vi.mocked(bloggerService.initializeOAuth2Client).mockReturnValue({} as any);
      vi.mocked(bloggerService.setCredentials).mockImplementation(() => {});
      vi.mocked(bloggerService.publishPost).mockRejectedValue({
        code: 'BLOG_NOT_FOUND',
        message: 'Blog with ID invalid-blog not found',
        statusCode: 404,
      });

      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        BLOGGER_CLIENT_ID: 'test-client-id',
        BLOGGER_CLIENT_SECRET: 'test-client-secret',
      };

      const response = await request(app)
        .post('/api/blogger/publish')
        .send({
          blogId: 'invalid-blog',
          title: 'Test Post',
          content: '<p>Content</p>',
          accessToken: 'token-123',
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BLOG_NOT_FOUND');

      process.env = originalEnv;
    });
  });
});
